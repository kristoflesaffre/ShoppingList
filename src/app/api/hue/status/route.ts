import { NextRequest, NextResponse } from "next/server";
import { verifiedUserId } from "@/lib/server/google-connection-store";
import { HUE_AUTH_COOKIE, hueConfig, hueCookieOptions, hueTokens, HueReconnectRequired, readHueConnection, sealHue } from "@/lib/server/hue-auth";
export const runtime = "nodejs";
/** POST because checking an expired connection rotates and saves its refresh token. */
export async function POST(request: NextRequest) {
  const config = hueConfig();
  if (request.headers.get("origin") !== config.origin && config.configured) return NextResponse.json({ error: "invalid-origin" }, { status: 403 });
  const ownerId = await verifiedUserId(request);
  if (!ownerId) return NextResponse.json({ error: "not-signed-in" }, { status: 401 });
  if (!config.configured) return NextResponse.json({ configured: false, connected: false });
  let connection = readHueConnection(request.cookies.get(HUE_AUTH_COOKIE)?.value, config.secret, ownerId, config.clientId);
  if (!connection) return NextResponse.json({ configured: true, connected: false }, { headers: { "Cache-Control": "no-store" } });
  try {
    if (connection.expiresAt <= Date.now() + 60_000) {
      const tokens = await hueTokens(new URLSearchParams({ grant_type: "refresh_token", refresh_token: connection.refreshToken }), config);
      connection = { ...connection, ...tokens };
    }
    const response = NextResponse.json({ configured: true, connected: true }, { headers: { "Cache-Control": "no-store" } });
    response.cookies.set(HUE_AUTH_COOKIE, sealHue(connection, config.secret), { ...hueCookieOptions, maxAge: 60 * 60 * 24 * 90 });
    return response;
  } catch (error) {
    if (error instanceof HueReconnectRequired) {
      const response = NextResponse.json({ configured: true, connected: false, reconnect: true });
      response.cookies.set(HUE_AUTH_COOKIE, "", { ...hueCookieOptions, maxAge: 0 });
      return response;
    }
    return NextResponse.json({ error: "temporarily-unavailable" }, { status: 503 });
  }
}
