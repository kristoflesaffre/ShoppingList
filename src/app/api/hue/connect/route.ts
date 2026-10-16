import { createHash, randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifiedUserId } from "@/lib/server/google-connection-store";
import { HUE_STATE_COOKIE, hueConfig, hueCookieOptions, sealHue } from "@/lib/server/hue-auth";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const config = hueConfig();
  if (!config.configured) return NextResponse.json({ error: "not-configured" }, { status: 503 });
  if (request.headers.get("origin") !== config.origin) return NextResponse.json({ error: "invalid-origin" }, { status: 403 });
  const ownerId = await verifiedUserId(request);
  if (!ownerId) return NextResponse.json({ error: "not-signed-in" }, { status: 401 });
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const url = new URL("https://api.meethue.com/v2/oauth2/authorize");
  url.search = new URLSearchParams({ client_id: config.clientId, response_type: "code", redirect_uri: config.redirectUri, state, code_challenge_method: "S256", code_challenge: createHash("sha256").update(verifier).digest("base64url") }).toString();
  const response = NextResponse.json({ url: url.toString() }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(HUE_STATE_COOKIE, sealHue({ ownerId, state, verifier, expiresAt: Date.now() + 600_000 }, config.secret), { ...hueCookieOptions, maxAge: 600 });
  return response;
}
