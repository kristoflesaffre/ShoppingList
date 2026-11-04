import { timingSafeEqual } from "node:crypto";
import { planThawTaskActions, thawItemsForOwner, type FreezerPlanItem } from "@/lib/freezer-planning";
import { getInstantAdminDb } from "@/lib/server/instant-admin";
import { mapTodoistTask } from "@/lib/server/todoist-read";
import {
  readTodoistConnection,
  todoistCloseTask,
  todoistConfig,
  todoistCreateTask,
  todoistGet,
  todoistUpdateTask,
  withStoredTodoistConnection,
  type TodoistConnection,
} from "@/lib/server/todoist-auth";

/**
 * Geplande ronde: zet voor elke op de server bewaarde Todoist-koppeling de ontdooitaken gelijk met de planning,
 * ook als de app nergens open staat. Zelfde plan als `FreezerPlanningSync`; afboeken blijft bij de app.
 */

/** Vercel Cron stuurt `CRON_SECRET` mee als bearer-token. */
export function isThawRoundAuthorized(header: string | null, secret: string | undefined): boolean {
  if (!secret) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Vandaag in België; de server draait in UTC. */
export function brusselsToday(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Brussels", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

async function allOpenTasks(connection: TodoistConnection) {
  const tasks: { id: string; description: string }[] = [];
  let cursor: string | null = null;
  do {
    const params: URLSearchParams = new URLSearchParams({ limit: "200", ...(cursor ? { cursor } : {}) });
    const page = await todoistGet(connection, "tasks", params);
    for (const task of page.results) {
      const { id, description } = mapTodoistTask(task);
      if (id) tasks.push({ id, description });
    }
    cursor = page.next_cursor;
  } while (cursor);
  return tasks;
}

export type ThawRoundResult = { connections: number; created: number; failed: number };

export async function runThawRound(now = new Date()): Promise<ThawRoundResult> {
  const config = todoistConfig();
  const db = getInstantAdminDb();
  const result: ThawRoundResult = { connections: 0, created: 0, failed: 0 };
  if (!db || !config.configured) return result;
  const today = brusselsToday(now);
  const data = await db.query({
    todoistConnections: { $: { where: { origin: config.origin } } },
    items: { $: { where: { fromStock: true } }, list: {} },
    freezerItems: {},
  });
  const items = data.items as unknown as Array<FreezerPlanItem & { list?: { ownerId?: string } | { ownerId?: string }[] | null }>;
  const freezer = data.freezerItems as Array<{ id: string; ownerId?: string }>;
  for (const row of data.todoistConnections as Array<{ ownerId: string; sealedConnection: string }>) {
    const stored = readTodoistConnection(row.sealedConnection, config.secret, row.ownerId, config.clientId);
    if (!stored) continue;
    result.connections += 1;
    const own = new Set(freezer.filter((it) => it.ownerId === row.ownerId).map((it) => it.id));
    const thawItems = thawItemsForOwner(items, own, row.ownerId);
    try {
      await withStoredTodoistConnection(stored, config, async (connection) => {
        for (const action of planThawTaskActions(thawItems, await allOpenTasks(connection), today)) {
          if (action.kind === "close") await todoistCloseTask(connection, action.taskId);
          else if (action.kind === "update") await todoistUpdateTask(connection, action.taskId, action);
          else if (action.kind === "link") await db.transact(db.tx.items[action.itemId].update({ thawTaskId: action.taskId }));
          else {
            const id = await todoistCreateTask(connection, action);
            result.created += 1;
            await db.transact(db.tx.items[action.itemId].update({ thawTaskId: id }));
          }
        }
      });
    } catch (cause) {
      // Volgende ronde opnieuw; de stand op de items en in Todoist blijft kloppen. Nooit tokens of inhoud loggen.
      result.failed += 1;
      console.error("thaw-round", cause instanceof Error ? cause.constructor.name : "unknown");
    }
  }
  return result;
}
