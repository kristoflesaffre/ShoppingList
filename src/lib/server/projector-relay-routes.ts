import { NextRequest, NextResponse } from "next/server";
import { googleRequestOrigin } from "@/lib/google-dashboard-auth";
import { verifiedUserId } from "./google-connection-store";
import { bridgeOnline, claimProjector, completeProjector, enqueueProjector, ownerBridge, pollProjector, relayCommand, relayResult, tokenBridge } from "./projector-relay";

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

/** Null preserves the previous local-only path for accounts without a Pi bridge. */
export async function projectorRemote(request: NextRequest): Promise<NextResponse | null> {
  if (request.headers.get("origin") !== googleRequestOrigin(request)) return reply({ error: "invalid-origin" }, 403);
  const owner = await verifiedUserId(request);
  if (!owner) return reply({ error: "not-signed-in" }, 401);
  try {
    const bridge = await ownerBridge(owner);
    if (!bridge) return null;
    const body = await request.clone().json().catch(() => null);
    if (!body || Array.isArray(body) || Object.keys(body).length !== 1 || !["on", "off", "cinema", "status"].includes(body.action)) return reply({ error: "invalid-command" }, 400);
    if (!bridgeOnline(bridge)) return reply({ configured: true, accepted: false, error: "bridge-offline" }, 503);
    if (body.action === "status") return reply({ configured: true, accepted: true, isOn: bridge.reportedState === "on" ? true : bridge.reportedState === "off" ? false : null });
    const command = await enqueueProjector(bridge, body.action);
    return command ? reply(relayResult(command), 202) : reply({ configured: true, accepted: false, error: "relay-busy" }, 409);
  } catch { return reply({ accepted: false, error: "relay-unavailable" }, 503); }
}

export async function projectorCommandStatus(request: NextRequest, id: string) {
  const owner = await verifiedUserId(request);
  if (!owner) return reply({ error: "not-signed-in" }, 401);
  if (!uuid(id)) return reply({ error: "not-found" }, 404);
  try {
    const bridge = await ownerBridge(owner);
    const command = await relayCommand(id);
    if (!bridge?.enabled || !command || command.bridgeId !== bridge.id) return reply({ error: "not-found" }, 404);
    return reply(relayResult(command));
  } catch { return reply({ error: "relay-unavailable" }, 503); }
}

/** The Pi's credential can only consume/acknowledge its own fixed on/off queue. */
export async function projectorBridgeRoute(request: NextRequest) {
  try {
    const bridge = await tokenBridge(request.headers.get("authorization"));
    if (!bridge) return reply({ error: "unauthorized" }, 401);
    if (request.method === "GET") {
      const state = request.nextUrl.searchParams.get("state") ?? "unknown";
      return reply(await pollProjector(bridge, ["on", "off"].includes(state) ? state : "unknown"));
    }
    const body = await request.json().catch(() => null);
    if (!body || !uuid(body.commandId) || !["claim", "complete"].includes(body.stage) || Object.keys(body).some(key => !["commandId", "stage", "ok"].includes(key)) || (body.stage === "complete" && typeof body.ok !== "boolean")) return reply({ error: "invalid-command" }, 400);
    const ok = body.stage === "claim" ? await claimProjector(bridge, body.commandId) : await completeProjector(bridge, body.commandId, body.ok);
    return ok ? reply({ accepted: true }) : reply({ error: "not-dispatchable" }, 409);
  } catch { return reply({ error: "relay-unavailable" }, 503); }
}
