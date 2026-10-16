import { NextRequest, NextResponse } from "next/server";
import { HUE_AUTH_COOKIE, HUE_STATE_COOKIE, hueConfig, hueCookieOptions, hueTokens, pairHueBridge, readHueState, sealHue } from "@/lib/server/hue-auth";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const config = hueConfig();
  if (!config.configured) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  const finish = (result: string) => {
    const response = NextResponse.redirect(new URL(`/profiel/hue?hue=${result}`, config.origin));
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.cookies.set(HUE_STATE_COOKIE, "", { ...hueCookieOptions, maxAge: 0 });
    return response;
  };
  const expected = readHueState(request.cookies.get(HUE_STATE_COOKIE)?.value, config.secret);
  if (!expected || request.nextUrl.searchParams.get("state") !== expected.state) return finish("connection-failed");
  if (request.nextUrl.searchParams.get("error")) return finish("cancelled");
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return finish("connection-failed");
  try {
    const tokens = await hueTokens(new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: config.redirectUri, code_verifier: expected.verifier }), config);
    const applicationKey = await pairHueBridge(tokens.accessToken);
    const response = finish("connected");
    response.cookies.set(HUE_AUTH_COOKIE, sealHue({ ...tokens, applicationKey, ownerId: expected.ownerId, clientId: config.clientId }, config.secret), { ...hueCookieOptions, maxAge: 60 * 60 * 24 * 90 });
    return response;
  } catch { return finish("connection-failed"); }
}
