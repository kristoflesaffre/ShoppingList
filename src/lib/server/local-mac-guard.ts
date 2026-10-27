import { NextRequest, NextResponse } from "next/server";
import { googleRequestOrigin } from "@/lib/google-dashboard-auth";
import { verifiedUserId } from "./google-connection-store";
import { screenLanHost } from "./projector-temporary";

export const localReply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/**
 * Shared boundary for routes that reach devices on the home network from the Mac. Returns the signed-in user's ID,
 * or the response that rejects the request. Never lets a cloud deployment through: besides loopback, one exact
 * home-network origin may be opted in (SCREEN_LOCAL_ORIGIN).
 */
export async function localMacOwner(request: NextRequest): Promise<{ ownerId: string } | { rejected: NextResponse }> {
  const loopback = ["localhost", "127.0.0.1", "[::1]"];
  const lan = screenLanHost(request);
  if (process.env.NETLIFY || process.env.VERCEL || (!lan && !loopback.includes(request.nextUrl.hostname))) return { rejected: localReply({ error: "mac-required", configured: false }, 503) };
  // NextURL normalizes 127.0.0.1 to localhost. Check the browser's exact
  // Host/origin pair, while still permitting loopback hosts only.
  const origin = googleRequestOrigin(request);
  if (!lan && !loopback.includes(new URL(origin).hostname)) return { rejected: localReply({ error: "mac-required", configured: false }, 503) };
  if (request.headers.get("origin") !== origin) return { rejected: localReply({ error: "invalid-origin" }, 403) };
  const ownerId = await verifiedUserId(request);
  if (!ownerId) return { rejected: localReply({ error: "not-signed-in" }, 401) };
  return { ownerId };
}
