"use client";

import * as React from "react";
import { db } from "@/lib/db";
import { toIsoDate } from "@/lib/calendar-utils";
import { planFreezerDeductions, planThawTaskActions, type FreezerPlanItem } from "@/lib/freezer-planning";
import { useGoogleAuthToken } from "@/lib/google-client";
import { todoistPost } from "@/lib/todoist-client";

/**
 * Altijd actief (geen scherm): boekt voorbije diepvriesgerechten af en houdt de Todoist-taken «Uit de diepvries
 * halen» gelijk met de planning. De stand staat op de items, dus dit is veilig om vaak en op meerdere toestellen te draaien.
 */
export function FreezerPlanningSync() {
  const { user } = db.useAuth();
  const token = useGoogleAuthToken();
  const [today, setToday] = React.useState(() => toIsoDate(new Date()));

  React.useEffect(() => {
    const check = () => setToday(toIsoDate(new Date()));
    const id = window.setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  const { data } = db.useQuery(user ? { items: { $: { where: { fromStock: true } } }, freezerItems: {} } : null);

  const stock = React.useMemo(
    () =>
      ((data?.freezerItems ?? []) as Array<{ id: string; packages?: number; ownerId?: string }>)
        .filter((it) => !it.ownerId || it.ownerId === user?.id)
        .map((it) => ({ id: it.id, packages: it.packages ?? 0 })),
    [data?.freezerItems, user?.id],
  );
  // Enkel gerechten uit de eigen diepvries (op een gedeeld lijstje kan iemand anders ze gepland hebben).
  const items = React.useMemo(() => {
    const own = new Set(stock.map((s) => s.id));
    return ((data?.items ?? []) as unknown as FreezerPlanItem[]).filter((it) => it.freezerItemId && own.has(it.freezerItemId));
  }, [data?.items, stock]);

  const handled = React.useRef(new Set<string>());
  React.useEffect(() => {
    if (!data) return;
    const plan = planFreezerDeductions(items.filter((it) => !handled.current.has(it.id)), stock, today);
    if (plan.deductedItemIds.length === 0) return;
    plan.deductedItemIds.forEach((id) => handled.current.add(id));
    void db.transact([
      ...plan.deductedItemIds.map((id) => db.tx.items[id].update({ stockDeductedAt: Date.now() })),
      ...plan.updates.map((u) => db.tx.freezerItems[u.id].update({ packages: u.packages })),
      ...plan.deleteIds.map((id) => db.tx.freezerItems[id].delete()),
    ]);
  }, [data, items, stock, today]);

  // Elke wijziging in de planning: even wachten (meerdere gerechten na elkaar) en dan Todoist gelijkzetten.
  const signature = data ? items.map((it) => `${it.id}:${it.itemDate}:${it.thawTaskId ?? ""}`).sort().join("|") : null;
  const hadPlanned = React.useRef(false);
  const created = React.useRef(new Set<string>());
  const running = React.useRef(false);
  React.useEffect(() => {
    if (signature === null || !token) return;
    if (!signature && !hadPlanned.current) return;
    hadPlanned.current = Boolean(signature);
    const timer = window.setTimeout(async () => {
      if (running.current) return;
      running.current = true;
      try {
        const status = (await (await todoistPost(token, "status")).json()) as { connected?: boolean; canWrite?: boolean };
        if (!status.connected || !status.canWrite) return;
        const res = await todoistPost(token, "tasks", { limit: 200 });
        if (!res.ok) return;
        const { tasks } = (await res.json()) as { tasks: { id: string; description?: string }[] };
        for (const action of planThawTaskActions(items, tasks, today)) {
          if (action.kind === "close") {
            await todoistPost(token, "close", { id: action.taskId });
          } else if (action.kind === "update") {
            await todoistPost(token, "task", { id: action.taskId, content: action.content, description: action.description, dueDate: action.dueDate });
          } else if (action.kind === "link") {
            await db.transact(db.tx.items[action.itemId].update({ thawTaskId: action.taskId }));
          } else if (!created.current.has(action.itemId)) {
            created.current.add(action.itemId);
            const made = await todoistPost(token, "task", { content: action.content, description: action.description, dueDate: action.dueDate });
            const { id } = (await made.json().catch(() => ({}))) as { id?: string };
            if (made.ok && id) await db.transact(db.tx.items[action.itemId].update({ thawTaskId: id }));
            else created.current.delete(action.itemId);
          }
        }
      } catch {
        // Geen verbinding: volgende keer opnieuw, de stand op de items blijft kloppen.
      } finally {
        running.current = false;
      }
    }, 1000);
    return () => window.clearTimeout(timer);
    // `items` hoort bij `signature`; enkel opnieuw bij een echte wijziging.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, token, today]);

  return null;
}
