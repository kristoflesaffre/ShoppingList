import { NextRequest } from "next/server";
import { todoistGet, todoistJson, TodoistUpstreamError, withTodoistConnection } from "./todoist-auth";

function text(value: unknown): string | null { return typeof value === "string" ? value : null; }
function record(value: unknown): Record<string, unknown> | null { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null; }
export function mapTodoistTask(task: Record<string, unknown>) {
  const due = record(task.due);
  const deadline = record(task.deadline);
  const duration = record(task.duration);
  return {
    id: text(task.id), content: text(task.content) ?? "", description: text(task.description) ?? "",
    projectId: text(task.project_id), sectionId: text(task.section_id), parentId: text(task.parent_id),
    labels: Array.isArray(task.labels) ? task.labels.filter((v): v is string => typeof v === "string") : [],
    priority: typeof task.priority === "number" ? task.priority : 1,
    order: typeof task.child_order === "number" ? task.child_order : null,
    completed: task.checked === true,
    due: due ? { date: text(due.date), datetime: text(due.datetime), timezone: text(due.timezone), recurring: due.is_recurring === true, description: text(due.string) } : null,
    deadline: deadline ? { date: text(deadline.date) } : null,
    duration: duration ? { amount: typeof duration.amount === "number" ? duration.amount : null, unit: text(duration.unit) } : null,
    addedAt: text(task.added_at), updatedAt: text(task.updated_at),
    url: typeof task.id === "string" ? `https://app.todoist.com/app/task/${encodeURIComponent(task.id)}` : null,
  };
}
export function mapTodoistProject(project: Record<string, unknown>) {
  return { id: text(project.id), name: text(project.name) ?? "", color: text(project.color), parentId: text(project.parent_id), favorite: project.is_favorite === true, inbox: project.inbox_project === true, order: typeof project.child_order === "number" ? project.child_order : null };
}
/** Only bounded, explicitly supported query options reach Todoist; clients cannot choose upstream URLs. */
export function todoistReadOptions(body: unknown, resource: "tasks" | "projects"): URLSearchParams | null {
  const data = record(body);
  if (!data) return null;
  const allowed = resource === "tasks" ? ["cursor", "limit", "projectId", "filter", "lang"] : ["cursor", "limit"];
  if (Object.keys(data).some(k => !allowed.includes(k))) return null;
  const limit = data.limit ?? 50;
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > 200) return null;
  const params = new URLSearchParams({ limit: String(limit) });
  for (const [key, max, target] of [["cursor", 2048, "cursor"], ["projectId", 128, "project_id"], ["filter", 1024, "query"], ["lang", 32, "lang"]] as const) {
    const value = data[key];
    if (value === undefined || value === null) continue;
    if (typeof value !== "string" || !value.trim() || value.length > max) return null;
    params.set(target, value);
  }
  if (params.has("query") && params.has("project_id")) return null;
  if (params.has("lang") && !params.has("query")) return null;
  return params;
}
export async function readTodoistResource(request: NextRequest, resource: "tasks" | "projects") {
  return withTodoistConnection(request, async (connection, body) => {
    let input: unknown;
    try { input = body.trim() ? JSON.parse(body) : {}; } catch { return todoistJson({ error: "invalid-request" }, 400); }
    const params = todoistReadOptions(input, resource);
    if (!params) return todoistJson({ error: "invalid-request" }, 400);
    try {
      const page = await todoistGet(connection, resource === "tasks" && params.has("query") ? "tasks/filter" : resource, params);
      if (!Array.isArray(page.results) || page.results.some(item => !record(item) || typeof item.id !== "string") || (page.next_cursor != null && typeof page.next_cursor !== "string")) throw new Error("Invalid Todoist page");
      return todoistJson({ [resource]: resource === "tasks" ? page.results.map(mapTodoistTask) : page.results.map(mapTodoistProject), nextCursor: page.next_cursor ?? null });
    } catch (error) {
      // Invalid Todoist filters and unknown project IDs are safe client errors, not outages.
      if (error instanceof TodoistUpstreamError && [400, 404].includes(error.status)) return todoistJson({ error: error.status === 404 ? "not-found" : "invalid-request" }, error.status);
      throw error;
    }
  });
}
