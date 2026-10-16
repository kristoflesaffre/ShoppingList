import { NextRequest, NextResponse } from "next/server";
import { verifiedUserId } from "@/lib/server/google-connection-store";
import { HUE_AUTH_COOKIE, HUE_STATE_COOKIE, hueConfig, hueCookieOptions } from "@/lib/server/hue-auth";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const config = hueConfig();
  if (!config.configured || request.headers.get("origin") !== config.origin) return NextResponse.json({ error: "invalid-origin" }, { status: 403 });
  if (!await verifiedUserId(request)) return NextResponse.json({ error: "not-signed-in" }, { status: 401 });
  const response = NextResponse.json({ connected: false });
  for (const name of [HUE_AUTH_COOKIE, HUE_STATE_COOKIE]) response.cookies.set(name, "", { ...hueCookieOptions, maxAge: 0 });
  return response;
}
