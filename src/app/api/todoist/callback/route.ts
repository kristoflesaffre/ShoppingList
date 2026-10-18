import { NextRequest, NextResponse } from "next/server";
import { TODOIST_SCOPE, TODOIST_STATE_COOKIE, clearTodoistReconnect, readTodoistState, safeTodoistReturn, setTodoistConnection, todoistConfig, todoistCookieOptions, todoistJson, todoistTokens } from "@/lib/server/todoist-auth";
export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const config = todoistConfig();
  if (!config.configured) return todoistJson({ error: "not-configured" }, 503);
  if (request.nextUrl.origin !== config.origin) return todoistJson({ error: "invalid-origin" }, 403);
  const expected = readTodoistState(request.cookies.get(TODOIST_STATE_COOKIE)?.value, config.secret);
  // Terug naar waar je op «Koppel» tikte (bv. /todo), anders het profiel; het resultaat staat in ?todoist=.
  const back = safeTodoistReturn(expected?.returnTo) ?? "/profiel";
  const finish = (result: string) => {
    const response = NextResponse.redirect(new URL(`${back}?todoist=${result}`, config.origin));
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.cookies.set(TODOIST_STATE_COOKIE, "", { ...todoistCookieOptions, maxAge: 0 });
    return response;
  };
  if (!expected || request.nextUrl.searchParams.get("state") !== expected.state) return finish("connection-failed");
  if (request.nextUrl.searchParams.get("error")) return finish("cancelled");
  const code = request.nextUrl.searchParams.get("code");
  if (!code || code.length > 4096) return finish("connection-failed");
  try {
    const tokens = await todoistTokens(new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: config.redirectUri, code_verifier: expected.verifier }), config, { requireScope: true });
    const response = finish("connected");
    // Toegekende rechten bewaren (todoistTokens weigert een antwoord zonder lezen + schrijven).
    setTodoistConnection(response, { ...tokens, ownerId: expected.ownerId, clientId: config.clientId, scope: TODOIST_SCOPE }, config.secret);
    clearTodoistReconnect(response);
    return response;
  } catch { return finish("connection-failed"); }
}
