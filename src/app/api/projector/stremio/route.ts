import { NextRequest, NextResponse } from "next/server";
import { googleRequestOrigin } from "@/lib/google-dashboard-auth";
import { verifiedUserId } from "@/lib/server/google-connection-store";
import { bridgeOnline, enqueueProjector, ownerBridge, relayResult } from "@/lib/server/projector-relay";
import { cinemaCommand } from "@/lib/stremio";

export const runtime = "nodejs";
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function GET(request: NextRequest) {
  const owner = await verifiedUserId(request);
  if (!owner) return reply({ available: false }, 401);
  try {
    const bridge = await ownerBridge(owner);
    return reply({ available: Boolean(bridge && bridgeOnline(bridge)), mode: "pi" });
  } catch { return reply({ available: false }, 503); }
}

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== googleRequestOrigin(request)) return reply({ error: "invalid-origin" }, 403);
  const owner = await verifiedUserId(request);
  if (!owner) return reply({ error: "not-signed-in" }, 401);
  let action: string;
  try {
    const body = await request.json();
    if (!body || Object.keys(body).some(key => !["imdbId", "type", "season", "episode"].includes(key))) throw new Error();
    action = cinemaCommand(body);
  } catch { return reply({ error: "invalid-title" }, 400); }
  try {
    const bridge = await ownerBridge(owner);
    if (!bridge || !bridgeOnline(bridge)) return reply({ error: "bridge-offline" }, 503);
    const command = await enqueueProjector(bridge, action);
    return command ? reply(relayResult(command), 202) : reply({ error: "relay-busy" }, 409);
  } catch { return reply({ error: "relay-unavailable" }, 503); }
}
