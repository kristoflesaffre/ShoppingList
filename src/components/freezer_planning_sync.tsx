"use client";

import * as React from "react";
import { db } from "@/lib/db";
import { toIsoDate } from "@/lib/calendar-utils";
import {
  planFreezerDeductions,
  planFreezerLinks,
  planThawTaskActions,
  THAW_TASK_CLOSED_EVENT,
  thawedItemIds,
  thawItemsForOwner,
  type FreezerPlanItem,
} from "@/lib/freezer-planning";
import { useGoogleAuthToken } from "@/lib/google-client";
import { isPantryItem } from "@/lib/pantry";
import { todoistPost } from "@/lib/todoist-client";

const RETRY_MS = 15 * 60_000;

/**
 * Altijd actief (geen scherm): boekt diepvriesgerechten af (ontdooitaak afgevinkt of dag voorbij) en houdt de Todoist-taken «Uit de diepvries
 * halen» gelijk met de planning (de server doet dat ook elk uur, zie `runThawRound`, ook als de app nergens open staat): bij elke wijziging, en opnieuw bij terugkeren naar de app, weer online komen en om het kwartier, zodat een mislukte
 * poging vanzelf hersteld wordt. De stand staat op de items, dus dit is veilig om vaak en op meerdere toestellen te draaien.
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

  const { data } = db.useQuery(user ? { items: { $: { where: { fromStock: true } }, list: {} }, freezerItems: {} } : null);

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

  const thawItems = React.useMemo(
    () => thawItemsForOwner((data?.items ?? []) as unknown as Array<FreezerPlanItem & { list?: { ownerId?: string } | { ownerId?: string }[] }>, new Set(stock.map((s) => s.id)), user?.id),
    [data?.items, stock, user?.id],
  );

  // Geplande gerechten zonder koppeling (ouder dan deze functie of gekopieerd): enkel op eigen lijstjes, want op een
  // gedeeld lijstje kan iemand anders ze gepland hebben. Daarna volgen de taak en de afboeking vanzelf.
  const linked = React.useRef(new Set<string>());
  React.useEffect(() => {
    if (!data || !user) return;
    const onOwnList = ((data.items ?? []) as unknown as Array<FreezerPlanItem & { list?: { ownerId?: string } | { ownerId?: string }[] }>).filter((it) => {
      const list = Array.isArray(it.list) ? it.list[0] : it.list;
      return list?.ownerId === user.id && !linked.current.has(it.id);
    });
    const freezer = ((data.freezerItems ?? []) as Array<{ id: string; name?: string; type?: string; ownerId?: string }>).filter(
      (it) => !isPantryItem(it) && (!it.ownerId || it.ownerId === user.id),
    );
    const links = planFreezerLinks(onOwnList, freezer, today);
    if (links.length === 0) return;
    links.forEach((link) => linked.current.add(link.itemId));
    void db.transact(links.map((link) => db.tx.items[link.itemId].update({ freezerItemId: link.freezerItemId })));
  }, [data, user, today]);

  // Gerechten waarvan de ontdooitaak afgevinkt is: in de app (meteen) of in Todoist zelf (bij het gelijkzetten).
  const [thawed, setThawed] = React.useState<ReadonlySet<string>>(() => new Set());
  const addThawed = React.useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setThawed((current) => (ids.every((id) => current.has(id)) ? current : new Set([...Array.from(current), ...ids])));
  }, []);
  React.useEffect(() => {
    const onClosed = (event: Event) => {
      const itemId = (event as CustomEvent<{ itemId?: string }>).detail?.itemId;
      if (itemId) addThawed([itemId]);
    };
    window.addEventListener(THAW_TASK_CLOSED_EVENT, onClosed);
    return () => window.removeEventListener(THAW_TASK_CLOSED_EVENT, onClosed);
  }, [addThawed]);

  const handled = React.useRef(new Set<string>());
  React.useEffect(() => {
    if (!data) return;
    const plan = planFreezerDeductions(items.filter((it) => !handled.current.has(it.id)), stock, today, thawed);
    if (plan.deductedItemIds.length === 0) return;
    plan.deductedItemIds.forEach((id) => handled.current.add(id));
    void db.transact([
      ...plan.deductedItemIds.map((id) => db.tx.items[id].update({ stockDeductedAt: Date.now() })),
      ...plan.updates.map((u) => db.tx.freezerItems[u.id].update({ packages: u.packages })),
      ...plan.deleteIds.map((id) => db.tx.freezerItems[id].delete()),
    ]);
  }, [data, items, stock, today, thawed]);

  // Elke wijziging in de planning: even wachten (meerdere gerechten na elkaar) en dan Todoist gelijkzetten.
  const signature = data ? thawItems.map((it) => `${it.id}:${it.itemDate}:${it.thawTaskId ?? ""}`).sort().join("|") : null;
  const hadPlanned = React.useRef(false);
  const created = React.useRef(new Set<string>());
  const running = React.useRef(false);
  const rerun = React.useRef(false);
  const [retry, setRetry] = React.useState(0);
  React.useEffect(() => {
    const again = () => {
      if (document.visibilityState === "visible") setRetry((n) => n + 1);
    };
    const id = window.setInterval(again, RETRY_MS);
    document.addEventListener("visibilitychange", again);
    window.addEventListener("online", again);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", again);
      window.removeEventListener("online", again);
    };
  }, []);
  React.useEffect(() => {
    if (signature === null || !token) return;
    if (!signature && !hadPlanned.current) return;
    hadPlanned.current = Boolean(signature);
    const timer = window.setTimeout(async () => {
      // Wijziging tijdens een lopende ronde: daarna nog eens, anders blijft een nieuw gerecht zonder taak.
      if (running.current) {
        rerun.current = true;
        return;
      }
      running.current = true;
      try {
        const status = (await (await todoistPost(token, "status")).json()) as { connected?: boolean; canWrite?: boolean };
        if (!status.connected || !status.canWrite) return;
        // Enkel met de volledige lijst: een taak op een volgende pagina is niet afgevinkt en moet niet opnieuw gemaakt worden.
        const tasks: { id: string; description?: string }[] = [];
        let cursor: string | null | undefined;
        do {
          const res = await todoistPost(token, "tasks", { limit: 200, ...(cursor ? { cursor } : {}) });
          if (!res.ok) return;
          const page = (await res.json()) as { tasks: { id: string; description?: string }[]; nextCursor?: string | null };
          tasks.push(...page.tasks);
          cursor = page.nextCursor;
        } while (cursor);
        addThawed(thawedItemIds(thawItems, tasks, today));
        for (const action of planThawTaskActions(thawItems, tasks, today)) {
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
        if (rerun.current) {
          rerun.current = false;
          setRetry((n) => n + 1);
        }
      }
    }, 1000);
    return () => window.clearTimeout(timer);
    // `thawItems` hoort bij `signature`; enkel opnieuw bij een echte wijziging of een nieuwe poging.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, token, today, retry]);

  return null;
}
