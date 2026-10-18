import { NextRequest } from "next/server";
import { TODOIST_AUTH_COOKIE, readTodoistConnection, todoistGuard, todoistJson, withTodoistConnection } from "@/lib/server/todoist-auth";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const { config, error, ownerId } = await todoistGuard(request);
  if (error) return error;
  if (!config.configured) return todoistJson({ configured: false, connected: false });
  if (!readTodoistConnection(request.cookies.get(TODOIST_AUTH_COOKIE)?.value, config.secret, ownerId!, config.clientId)) return todoistJson({ configured: true, connected: false });
  const response = await withTodoistConnection(request, async () => todoistJson({ configured: true, connected: true }));
  if (response.status === 409) {
    const disconnected = todoistJson({ configured: true, connected: false, reconnect: true });
    const expired = response.cookies.get(TODOIST_AUTH_COOKIE);
    if (expired) disconnected.cookies.set(expired);
    return disconnected;
  }
  return response;
}
