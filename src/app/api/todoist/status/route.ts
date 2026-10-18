import { NextRequest } from "next/server";
import { TODOIST_AUTH_COOKIE, TODOIST_RECONNECT_COOKIE, readTodoistConnection, todoistCanWrite, todoistGuard, todoistJson, todoistNeedsReconnect, withTodoistConnection } from "@/lib/server/todoist-auth";
export const runtime = "nodejs";
export async function POST(request: NextRequest) {
  const { config, error, ownerId } = await todoistGuard(request);
  if (error) return error;
  if (!config.configured) return todoistJson({ configured: false, connected: false });
  if (!readTodoistConnection(request.cookies.get(TODOIST_AUTH_COOKIE)?.value, config.secret, ownerId!, config.clientId)) {
    // Eerder door Todoist geweigerd (merkteken): «Opnieuw koppelen» i.p.v. de eerste koppelkaart.
    return todoistJson({ configured: true, connected: false, ...(todoistNeedsReconnect(request, ownerId!, config.secret) ? { reconnect: true } : {}) });
  }
  // canWrite: met lezen + schrijven gekoppeld (afvinken); oudere koppelingen zijn alleen-lezen → opnieuw koppelen.
  const response = await withTodoistConnection(request, async (connection) => todoistJson({ configured: true, connected: true, canWrite: todoistCanWrite(connection) }));
  if (response.status === 409) {
    const disconnected = todoistJson({ configured: true, connected: false, reconnect: true });
    const expired = response.cookies.get(TODOIST_AUTH_COOKIE);
    if (expired) disconnected.cookies.set(expired);
    const mark = response.cookies.get(TODOIST_RECONNECT_COOKIE);
    if (mark) disconnected.cookies.set(mark);
    return disconnected;
  }
  return response;
}
