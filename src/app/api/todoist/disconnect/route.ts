import { NextRequest } from "next/server";
import { TODOIST_AUTH_COOKIE, TODOIST_RECONNECT_COOKIE, TODOIST_STATE_COOKIE, deleteStoredTodoistConnection, todoistCookieOptions, todoistGuard, todoistJson } from "@/lib/server/todoist-auth";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const { config, error, ownerId } = await todoistGuard(request);
  if (error) return error;
  try {
    await deleteStoredTodoistConnection(ownerId!, config);
  } catch {
    return todoistJson({ error: "temporarily-unavailable" }, 503);
  }
  const response = todoistJson({ connected: false });
  for (const name of [TODOIST_AUTH_COOKIE, TODOIST_STATE_COOKIE, TODOIST_RECONNECT_COOKIE]) response.cookies.set(name, "", { ...todoistCookieOptions, maxAge: 0 });
  return response;
}
