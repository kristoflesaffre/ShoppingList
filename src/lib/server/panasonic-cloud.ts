/** Comfort Cloud protocol based on aio-panasonic-comfort-cloud 2026.10.1 (MIT).
 * Login/MFA remains in the private local provisioner; production only refreshes tokens.
 */
import { createHash } from "node:crypto";
import { AC_FANS, AC_MODES, type AcDevice, type AcMode } from "@/lib/panasonic";
import { savePanasonic, type PanasonicSession } from "./panasonic-store";
export class PanasonicReconnect extends Error {}
export class PanasonicRejected extends Error {}
const CLOUD = "https://accsmart.panasonic.com";
export function panasonicHeaders(session: PanasonicSession, now = new Date()) {
  const timestamp = now.toISOString().slice(0, 19).replace("T", " ");
  const ms = Date.parse(`${timestamp.replace(" ", "T")}Z`);
  const hash = createHash("sha256").update(`Comfort Cloud521325fb2dd486bf4831b47644317fca${ms}Bearer ${session.accessToken}`).digest("hex");
  return { accept: "application/json; charset=utf-8", "content-type": "application/json", "user-agent": "G-RAC", "x-app-name": "Comfort Cloud", "x-app-timestamp": timestamp, "x-app-type": "1", "x-app-version": process.env.PANASONIC_APP_VERSION || session.version, "x-cfc-api-key": `${hash.slice(0, 9)}cfc${hash.slice(9)}`, "x-user-authorization-v2": `Bearer ${session.accessToken}`, "x-client-id": session.clientId };
}
export async function refreshPanasonic(session: PanasonicSession) {
  if (session.expiresAt > Date.now() + 120_000) return session;
  const response = await fetch("https://authglb.digital.panasonic.com/oauth/token", {
    method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15_000),
    headers: { "content-type": "application/json", "user-agent": "okhttp/4.10.0", "Auth0-Client": "eyJuYW1lIjoiQXV0aDAuQW5kcm9pZCIsImVudiI6eyJhbmRyb2lkIjoiMzAifSwidmVyc2lvbiI6IjIuOS4zIn0=" },
    body: JSON.stringify({ scope: session.scope, client_id: "Xmy6xIYIitMxngjB2rHvlm6HSDNnaMJx", refresh_token: session.refreshToken, grant_type: "refresh_token" }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) { if (data?.error === "invalid_grant" || response.status === 401) throw new PanasonicReconnect(); throw new Error("Token service unavailable"); }
  if (typeof data?.access_token !== "string" || !data.access_token || !Number.isFinite(data.expires_in) || data.expires_in <= 0 || (data.refresh_token !== undefined && typeof data.refresh_token !== "string")) throw new Error("Invalid token response");
  const refreshed = { ...session, accessToken: data.access_token, refreshToken: data.refresh_token || session.refreshToken, expiresAt: Date.now() + data.expires_in * 1000 };
  // Persist rotation before any device operation. Never return credentials to the browser.
  await savePanasonic(refreshed);
  return refreshed;
}
export async function panasonicCloud(session: PanasonicSession, path: string, parameters?: Record<string, unknown>): Promise<Record<string, unknown>> {
  const response = await fetch(`${CLOUD}${path}`, { method: parameters ? "POST" : "GET", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(15_000), headers: panasonicHeaders(session), ...(parameters ? { body: JSON.stringify(parameters) } : {}) });
  if (response.status === 401) throw new PanasonicReconnect();
  if (!response.ok) throw new PanasonicRejected();
  const data = await response.json();
  if (!data || typeof data !== "object" || data.errorCode || (typeof data.result === "number" && data.result !== 0)) throw new PanasonicRejected();
  return data;
}
export type CloudDevice = { deviceGuid: string; deviceName: string; parameters: Record<string, unknown> };
export async function discoverPanasonic(session: PanasonicSession): Promise<CloudDevice[]> {
  const data = await panasonicCloud(session, "/device/group");
  if (!Array.isArray(data.groupList)) throw new Error("Invalid device list");
  const devices = new Map<string, CloudDevice>();
  for (const group of data.groupList) {
    const list = group?.deviceList ?? group?.deviceIdList;
    if (Array.isArray(list)) for (const device of list) if (device && typeof device.deviceGuid === "string" && device.parameters && typeof device.deviceName === "string") devices.set(device.deviceGuid, device);
  }
  return Array.from(devices.values());
}
function temperature(value: unknown): number | null { return typeof value === "number" && Number.isFinite(value) && value >= -40 && value <= 60 ? value : null; }
export function mapPanasonicDevice(device: CloudDevice, status: Record<string, unknown> | null): AcDevice {
  const p = status?.parameters as Record<string, unknown> | undefined;
  const modes = Object.keys(AC_MODES) as AcMode[];
  return { id: device.deviceGuid, name: device.deviceName.trim(), available: Boolean(p), on: p?.operate === 1 ? true : p?.operate === 0 ? false : null, targetTemperature: temperature(p?.temperatureSet), insideTemperature: temperature(p?.insideTemperature), mode: typeof p?.operationMode === "number" ? modes[p.operationMode] ?? null : null, fan: typeof p?.fanSpeed === "number" ? (Object.keys(AC_FANS) as (keyof typeof AC_FANS)[])[p.fanSpeed] ?? null : null, modes: modes.filter(mode => status?.[`${mode}Mode`] !== false) };
}
export async function readPanasonicDevice(session: PanasonicSession, device: CloudDevice) {
  // Live status only: an unreachable device is shown as unavailable, never as freshly confirmed.
  try { return mapPanasonicDevice(device, await panasonicCloud(session, `/deviceStatus/${encodeURIComponent(device.deviceGuid)}`)); }
  catch (error) { if (error instanceof PanasonicReconnect) throw error; return mapPanasonicDevice(device, null); }
}
