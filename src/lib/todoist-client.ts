"use client";

import * as React from "react";
import { googleAuthHeaders, useGoogleAuthToken } from "@/lib/google-client";

/**
 * Todoist in de app (alleen lezen, via /api/todoist/*): types, kleuren, vervaldatums en de hook die status,
 * taken en projecten ophaalt. Gedeeld door de sectie op de startpagina en de overzichtspagina /todo.
 */

export type TodoTask = {
  id: string;
  content: string;
  projectId: string | null;
  labels: string[];
  priority: number;
  due: { date: string | null; datetime: string | null; recurring: boolean } | null;
  url: string | null;
};
export type TodoProject = { id: string; name: string; color: string | null; inbox: boolean };
export type TodoState =
  | { kind: "loading" }
  | { kind: "not-configured" }
  | { kind: "not-connected"; reconnect: boolean }
  | { kind: "error" }
  | { kind: "ready"; tasks: TodoTask[]; projects: Map<string, TodoProject>; canWrite: boolean };

/** Todoist-kleurnamen → hex (palet van Todoist). */
export const TODOIST_COLORS: Record<string, string> = {
  berry_red: "#b8256f", red: "#db4035", orange: "#ff9933", yellow: "#fad000", olive_green: "#afb83b",
  lime_green: "#7ecc49", green: "#299438", mint_green: "#6accbc", teal: "#158fad", sky_blue: "#14aaf5",
  light_blue: "#96c3eb", blue: "#4073ff", grape: "#884dff", violet: "#af38eb", lavender: "#eb96eb",
  magenta: "#e05194", salmon: "#ff8d85", charcoal: "#808080", grey: "#b8b8b8", taupe: "#ccac93",
};
/** Todoist-prioriteit (4 = P1 hoogst) → vlagkleur; P4 (1) = geen vlag. */
export const PRIORITY: Record<number, { label: string; color: string } | undefined> = {
  4: { label: "P1", color: "#d1453b" },
  3: { label: "P2", color: "#eb8909" },
  2: { label: "P3", color: "#246fe0" },
};

export function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Sorteersleutel en label voor de vervaldatum. */
export function dueInfo(task: TodoTask, todayIso: string): { rank: number; key: string; label: string | null; overdue: boolean } {
  const date = task.due?.date?.slice(0, 10) ?? null;
  if (!date) return { rank: 3, key: String(5 - task.priority), label: null, overdue: false };
  const time = task.due?.datetime ? new Date(task.due.datetime).toLocaleTimeString("nl-BE", { hour: "2-digit", minute: "2-digit" }) : null;
  const withTime = (s: string) => (time ? `${s} · ${time}` : s);
  if (date < todayIso) {
    const d = new Date(`${date}T00:00:00`);
    return { rank: 0, key: date, label: d.toLocaleDateString("nl-BE", { day: "numeric", month: "short" }).replace(".", ""), overdue: true };
  }
  if (date === todayIso) return { rank: 1, key: task.due?.datetime ?? date, label: withTime("Vandaag"), overdue: false };
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const d = new Date(`${date}T00:00:00`);
  const label =
    date === localIso(tomorrow)
      ? "Morgen"
      : (d.getTime() - Date.now()) / 86_400_000 < 6
        ? d.toLocaleDateString("nl-BE", { weekday: "long" }).replace(/^./, (c) => c.toUpperCase())
        : d.toLocaleDateString("nl-BE", { day: "numeric", month: "short" }).replace(".", "");
  return { rank: 2, key: task.due?.datetime ?? date, label: withTime(label), overdue: false };
}

/**
 * POST naar /api/todoist/*. Antwoordt de server 425 «retry» (vernieuwingstoken net verbruikt door een parallelle
 * aanvraag), dan na een korte pauze één keer opnieuw — met het intussen vernieuwde cookie.
 */
export async function todoistPost(token: string | null, path: string, body?: unknown): Promise<Response> {
  const send = (retry: boolean) =>
    fetch(`/api/todoist/${path}`, {
      method: "POST",
      headers: { ...googleAuthHeaders(token), "content-type": "application/json", ...(retry ? { "x-todoist-retry": "1" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
    });
  const first = await send(false);
  if (first.status !== 425) return first;
  await new Promise((r) => setTimeout(r, 1500));
  return send(true);
}

/**
 * Laatste geladen taken: in het geheugen (tussen pagina's) en op dit toestel (na herladen). Bij terugkeren toont de
 * sectie meteen wat er was en ververst ze stil op de achtergrond, in plaats van telkens de laadanimatie.
 */
const TODOIST_CACHE_KEY = "todoist-cache:v1";
type TodoCache = { tasks: TodoTask[]; projects: TodoProject[]; canWrite: boolean };
let todoMemory: TodoCache | null = null;

function readTodoCache(): TodoCache | null {
  if (todoMemory) return todoMemory;
  try {
    const raw = window.localStorage.getItem(TODOIST_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TodoCache;
    if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.projects)) return null;
    todoMemory = parsed;
    return parsed;
  } catch {
    return null;
  }
}

function writeTodoCache(cache: TodoCache | null) {
  todoMemory = cache;
  try {
    if (cache) window.localStorage.setItem(TODOIST_CACHE_KEY, JSON.stringify(cache));
    else window.localStorage.removeItem(TODOIST_CACHE_KEY);
  } catch {
    // Opslag vol of geblokkeerd: enkel in het geheugen.
  }
}

/** Na afmelden of ontkoppelen: geen oude taken meer tonen. */
export function clearTodoistCache() {
  writeTodoCache(null);
}

function readyFromCache(cache: TodoCache): TodoState {
  return { kind: "ready", tasks: cache.tasks, projects: new Map(cache.projects.map((p) => [p.id, p])), canWrite: cache.canWrite };
}

export function useTodoist() {
  const token = useGoogleAuthToken();
  const [state, setState] = React.useState<TodoState>(() => (todoMemory ? readyFromCache(todoMemory) : { kind: "loading" }));
  // Bewaarde taken vóór de eerste weergave lezen (geen flits van de laadanimatie na herladen).
  React.useLayoutEffect(() => {
    const cached = readTodoCache();
    if (cached) setState((s) => (s.kind === "loading" ? readyFromCache(cached) : s));
  }, []);

  const load = React.useCallback(async () => {
    if (!token) return;
    const post = (path: string, body?: unknown) => todoistPost(token, path, body);
    try {
      const status = (await (await post("status")).json()) as { configured?: boolean; connected?: boolean; reconnect?: boolean; canWrite?: boolean };
      if (status.configured === false) {
        writeTodoCache(null);
        return setState({ kind: "not-configured" });
      }
      if (!status.connected) {
        writeTodoCache(null);
        return setState({ kind: "not-connected", reconnect: status.reconnect === true });
      }
      const [tasksRes, projectsRes] = await Promise.all([post("tasks", { limit: 200 }), post("projects", { limit: 200 })]);
      if (!tasksRes.ok) throw new Error(String(tasksRes.status));
      const { tasks } = (await tasksRes.json()) as { tasks: TodoTask[] };
      const { projects } = projectsRes.ok ? ((await projectsRes.json()) as { projects: TodoProject[] }) : { projects: [] };
      const fresh = { tasks, projects, canWrite: status.canWrite === true };
      writeTodoCache(fresh);
      setState(readyFromCache(fresh));
    } catch {
      // Even geen verbinding: de bewaarde taken blijven staan; enkel zonder bewaarde taken de foutmelding.
      setState((s) => (s.kind === "ready" ? s : { kind: "error" }));
    }
  }, [token]);

  React.useEffect(() => {
    void load();
    // Verversen bij terugkeren naar de app (taken afgevinkt in Todoist).
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  // Na het koppelen terug naar deze pagina (bv. /todo of de startpagina).
  const connect = React.useCallback(async () => {
    const res = await fetch("/api/todoist/connect", {
      method: "POST",
      headers: { ...googleAuthHeaders(token), "content-type": "application/json" },
      body: JSON.stringify({ returnTo: window.location.pathname }),
    });
    const data = (await res.json().catch(() => ({}))) as { url?: string };
    if (data.url) window.location.assign(data.url);
  }, [token]);

  // Afvinken: meteen uit de lijst (optimistisch); lukt het niet, dan komt de taak terug met een melding.
  // Herhalende taken krijgen in Todoist een nieuwe datum: even later opnieuw ophalen toont ze daar.
  const [notice, setNotice] = React.useState<{ text: string; reconnect: boolean } | null>(null);
  const closeTask = React.useCallback(
    async (task: TodoTask) => {
      if (state.kind === "ready" && !state.canWrite) {
        setNotice({ text: "Koppel Todoist opnieuw met schrijfrechten om taken af te vinken.", reconnect: true });
        return;
      }
      setState((s) => (s.kind === "ready" ? { ...s, tasks: s.tasks.filter((t) => t.id !== task.id) } : s));
      if (todoMemory) writeTodoCache({ ...todoMemory, tasks: todoMemory.tasks.filter((t) => t.id !== task.id) });
      try {
        const res = await todoistPost(token, "close", { id: task.id });
        if (res.status === 403) {
          setNotice({ text: "Koppel Todoist opnieuw met schrijfrechten om taken af te vinken.", reconnect: true });
          void load();
          return;
        }
        if (!res.ok && res.status !== 404) throw new Error(String(res.status));
        if (task.due?.recurring) window.setTimeout(() => void load(), 800);
      } catch {
        setNotice({ text: "Afvinken lukte niet. Probeer het opnieuw.", reconnect: false });
        void load();
      }
    },
    [state, token, load],
  );
  React.useEffect(() => {
    if (!notice || notice.reconnect) return;
    const id = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(id);
  }, [notice]);

  return { state, load, connect, closeTask, notice, clearNotice: () => setNotice(null) };
}


export type TodoDue = ReturnType<typeof dueInfo>;

/** Dagen vooruit die de post-its tonen (plus alles wat te laat is): 0 = enkel vandaag, morgen en later niet. */
export const TODO_NEAR_DAYS = 0;

/** Dagen tussen vandaag en de vervaldatum (negatief = te laat); null zonder datum. */
export function daysUntil(task: TodoTask, todayIso: string): number | null {
  const date = task.due?.date?.slice(0, 10);
  if (!date) return null;
  return Math.round((new Date(`${date}T00:00:00`).getTime() - new Date(`${todayIso}T00:00:00`).getTime()) / 86_400_000);
}

/** Taken met hun vervaldatum, gesorteerd: te laat → vandaag → later (op datum/uur) → zonder datum (op prioriteit). */
export function sortTasks(tasks: TodoTask[], todayIso: string): { task: TodoTask; due: TodoDue }[] {
  return tasks
    .map((t) => ({ task: t, due: dueInfo(t, todayIso) }))
    .sort((a, b) => a.due.rank - b.due.rank || a.due.key.localeCompare(b.due.key) || b.task.priority - a.task.priority);
}

export function projectColor(project: TodoProject | undefined): string {
  return project?.color ? TODOIST_COLORS[project.color] ?? "#b8b8b8" : "#b8b8b8";
}

/** Todoist-titels mogen Markdown bevatten («[tekst](url)», **vet**): toon enkel de leesbare tekst. */
export function plainTaskText(content: string): string {
  return content
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/(\*\*|__)(.+?)\1/g, "$2")
    .replace(/(^|\s)[*_](\S.*?\S|\S)[*_](?=\s|$)/g, "$1$2")
    .trim();
}
