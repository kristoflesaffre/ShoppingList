import { NextRequest } from "next/server";
import { TodoistUpstreamError, todoistCanWrite, todoistCloseTask, todoistJson, withTodoistConnection } from "@/lib/server/todoist-auth";
export const runtime = "nodejs";
/** Eén taak afvinken. Enkel met een koppeling met lees- en schrijfrechten; body: { id }. */
export async function POST(request: NextRequest) {
  return withTodoistConnection(request, async connection => {
    if (!todoistCanWrite(connection)) return todoistJson({ error: "read-only", reconnect: true }, 403);
    const text = await request.text();
    if (text.length > 512) return todoistJson({ error: "invalid-request" }, 400);
    let id: unknown;
    try { id = (JSON.parse(text) as { id?: unknown }).id; } catch { return todoistJson({ error: "invalid-request" }, 400); }
    if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) return todoistJson({ error: "invalid-request" }, 400);
    try {
      await todoistCloseTask(connection, id);
      return todoistJson({ ok: true });
    } catch (error) {
      // Onbekende of al afgewerkte taak: geen storing, gewoon «niet gevonden».
      if (error instanceof TodoistUpstreamError && [400, 404].includes(error.status)) return todoistJson({ error: "not-found" }, 404);
      throw error;
    }
  });
}
