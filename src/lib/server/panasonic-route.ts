import { NextRequest, NextResponse } from "next/server";
import { verifiedUserId } from "./google-connection-store";
import { loadPanasonic, panasonicConfigured, type PanasonicSession } from "./panasonic-store";
import { PanasonicReconnect, refreshPanasonic } from "./panasonic-cloud";
// Serialise refreshes and writes per owner within a warm server instance; always reload persisted tokens.
const pending = new Map<string, Promise<unknown>>();
export async function withPanasonic(request: NextRequest, run: (session: PanasonicSession) => Promise<NextResponse>, refresh = true) {
  const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
  // Bearer authentication plus same-origin writes, including on local HTTPS.
  const allowed = new Set(["https://shoppinglist-lesaffre.netlify.app", "https://shoppinglist-azure.vercel.app", "https://localhost:3011", "http://localhost:3000", ...(process.env.PANASONIC_ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean)]);
  const origin = request.headers.get("origin");
  if (!origin || !allowed.has(origin) || origin !== request.nextUrl.origin) return reply({ error: "invalid-origin" }, 403);
  const ownerId = await verifiedUserId(request);
  if (!ownerId) return reply({ error: "not-signed-in" }, 401);
  if (!panasonicConfigured()) return reply({ configured: false, connected: false });
  const before = pending.get(ownerId) ?? Promise.resolve();
  const task = before.catch(() => undefined).then(async () => {
    try {
      const stored = await loadPanasonic(ownerId);
      if (!stored) return reply({ configured: true, connected: false });
      const session = refresh ? await refreshPanasonic(stored) : stored;
      const response = await run(session);
      response.headers.set("Cache-Control", "no-store");
      return response;
    } catch (error) {
      if (error instanceof PanasonicReconnect) return reply({ configured: true, connected: false, reconnect: true });
      return reply({ error: "temporarily-unavailable" }, 503);
    }
  });
  pending.set(ownerId, task);
  try { return await task; } finally { if (pending.get(ownerId) === task) pending.delete(ownerId); }
}
