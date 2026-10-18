import { createHash, randomBytes } from "node:crypto";
import { NextRequest } from "next/server";
import { TODOIST_STATE_COOKIE, sealTodoist, todoistCookieOptions, todoistGuard, todoistJson } from "@/lib/server/todoist-auth";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const { config, error, ownerId } = await todoistGuard(request);
  if (error) return error;
  if (!config.configured) return todoistJson({ error: "not-configured" }, 503);
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const url = new URL("https://app.todoist.com/oauth/authorize");
  url.search = new URLSearchParams({ client_id: config.clientId, response_type: "code", redirect_uri: config.redirectUri, scope: "data:read", state, code_challenge_method: "S256", code_challenge: createHash("sha256").update(verifier).digest("base64url") }).toString();
  const response = todoistJson({ url: url.toString() });
  response.cookies.set(TODOIST_STATE_COOKIE, sealTodoist({ ownerId: ownerId!, state, verifier, expiresAt: Date.now() + 600_000 }, config.secret), { ...todoistCookieOptions, maxAge: 600 });
  return response;
}
