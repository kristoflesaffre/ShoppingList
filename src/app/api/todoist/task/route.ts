import { NextRequest } from "next/server";
import { todoistCanWrite, todoistCreateTask, todoistJson, todoistUpdateTask, TodoistUpstreamError, withTodoistConnection } from "@/lib/server/todoist-auth";
export const runtime = "nodejs";
/** Taak aanmaken, of met `id` bijwerken. Enkel met schrijfrechten; body: { id?, content, description, dueDate }. */
export async function POST(request: NextRequest) {
  return withTodoistConnection(request, async (connection, text) => {
    if (!todoistCanWrite(connection)) return todoistJson({ error: "read-only", reconnect: true }, 403);
    let input: { id?: unknown; content?: unknown; description?: unknown; dueDate?: unknown };
    try { input = JSON.parse(text); } catch { return todoistJson({ error: "invalid-request" }, 400); }
    const { id, content, description, dueDate } = input;
    if (typeof content !== "string" || !content.trim() || content.length > 500) return todoistJson({ error: "invalid-request" }, 400);
    if (typeof description !== "string" || description.length > 1000) return todoistJson({ error: "invalid-request" }, 400);
    if (typeof dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return todoistJson({ error: "invalid-request" }, 400);
    if (id === undefined) return todoistJson({ id: await todoistCreateTask(connection, { content, description, dueDate }) });
    if (typeof id !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) return todoistJson({ error: "invalid-request" }, 400);
    try {
      await todoistUpdateTask(connection, id, { content, description, dueDate });
      return todoistJson({ id });
    } catch (error) {
      if (error instanceof TodoistUpstreamError && [400, 404].includes(error.status)) return todoistJson({ error: "not-found" }, 404);
      throw error;
    }
  });
}
