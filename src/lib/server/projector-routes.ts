import { NextRequest, NextResponse } from "next/server";
import { googleRequestOrigin } from "@/lib/google-dashboard-auth";
import { verifiedUserId } from "./google-connection-store";
import { projectorConfigured, wakeProjector, sleepProjector, inspectProjector } from "./projector-local";
import { temporaryProjectorHost } from "./projector-temporary";

/** Projector-only controls. Never call BroadLink or start a screen movement. */
export async function projectorLocal(request: NextRequest) {
  const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  const local = (host: string) => ["localhost", "127.0.0.1", "[::1]"].includes(host);
  const temporary = temporaryProjectorHost(request);
  if (process.env.NETLIFY || process.env.VERCEL || (!local(request.nextUrl.hostname) && !temporary)) return reply({ error: "mac-required" }, 503);
  const origin = googleRequestOrigin(request);
  if (!local(new URL(origin).hostname) && !temporary) return reply({ error: "mac-required" }, 503);
  if (request.headers.get("origin") !== origin) return reply({ error: "invalid-origin" }, 403);
  const owner = await verifiedUserId(request);
  if (!owner) return reply({ error: "not-signed-in" }, 401);
  const body = await request.json().catch(() => null);
  if (!body || Array.isArray(body) || Object.keys(body).length !== 1 || !["on", "off", "status"].includes(body.action)) return reply({ error: "invalid-command" }, 400);
  if (!await projectorConfigured(owner)) return reply({ configured: false, accepted: false, error: "not-configured" }, 403);
  const result = await (body.action === "on" ? wakeProjector(owner) : body.action === "off" ? sleepProjector(owner) : inspectProjector(owner));
  return reply(result, result.accepted ? 200 : 503);
}
