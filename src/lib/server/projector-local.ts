import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { privateIpv4 } from "./projector-temporary";

const execute = promisify(execFile);
export type ProjectorResult = { configured: boolean; accepted?: boolean; isOn?: boolean | null; error?: string };

/** Called only after the BroadLink route's local-origin and owner checks. */
export async function projectorConfigured(ownerId: string): Promise<boolean> {
  try {
    const config = JSON.parse(await readFile(path.join(process.cwd(), ".cache/projector/projector.json"), "utf8"));
    return config.ownerId === ownerId && config.paired === true && config.enabled === true;
  } catch { return false; }
}

async function setProjectorPower(ownerId: string, action: "on" | "off" | "check"): Promise<ProjectorResult> {
  if (!await projectorConfigured(ownerId)) return { configured: false, accepted: false, error: "not-configured" };
  try {
    const { stdout } = await execute(path.join(process.cwd(), ".cache/projector/venv/bin/python"),
      [path.join(process.cwd(), "scripts/projector-remote.py"), action],
      { timeout: 13_000, maxBuffer: 4096, windowsHide: true });
    const result = JSON.parse(stdout);
    return { configured: true, accepted: result.accepted === true, isOn: typeof result.isOn === "boolean" ? result.isOn : null, ...(typeof result.error === "string" ? { error: result.error } : {}) };
  } catch (failure) {
    // Python returns a small diagnostic code; never expose raw process output or secrets.
    const allowed = ["unreachable", "pairing-required", "identity-changed", "projector-not-confirmed"];
    try {
      const result = JSON.parse((failure as { stdout?: string }).stdout || "{}");
      if (allowed.includes(result.error)) return { configured: true, accepted: false, error: result.error };
    } catch { /* transport or timeout without JSON */ }
    return { configured: true, accepted: false, error: "unreachable" };
  }
}

export async function wakeProjector(ownerId: string): Promise<ProjectorResult> {
  const atomHost = process.env.PROJECTOR_ATOM_HOST;
  if (!atomHost) return setProjectorPower(ownerId, "on");
  if (!await projectorConfigured(ownerId)) return { configured: false, accepted: false, error: "not-configured" };
  if (process.env.NETLIFY || process.env.VERCEL || !privateIpv4(atomHost)) return { configured: true, accepted: false, error: "unreachable" };
  try {
    const response = await fetch(`http://${atomHost}/button/Wake%20projector/press`, {
      method: "POST", body: "", headers: { "content-type": "application/x-www-form-urlencoded" },
      redirect: "manual", cache: "no-store", signal: AbortSignal.timeout(8000),
    });
    return { configured: true, accepted: response.status === 200, isOn: null, ...(response.status !== 200 ? { error: "unreachable" } : {}) };
  } catch { return { configured: true, accepted: false, error: "unreachable" }; }
}
export const sleepProjector = (ownerId: string) => setProjectorPower(ownerId, "off");

export const inspectProjector = (ownerId: string) => setProjectorPower(ownerId, "check");
