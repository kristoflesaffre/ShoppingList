"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { googleAuthHeaders, useGoogleAuthToken } from "@/lib/google-client";
import { ListSectionHeader, OverviewPill } from "@/components/list_section_header";
import { HomeOnboardingEmptyCard } from "@/components/home_onboarding_empty_card";
import { MiniButton } from "@/components/ui/mini_button";

/**
 * Startpagina · «To-do»: je Todoist-taken in een swimlane (eerste voorstel). Leest via de alleen-lezen
 * Todoist-koppeling (/api/todoist/*): achterstallig → vandaag → later (op datum) → zonder datum (op prioriteit).
 * Tik op een taak = openen in Todoist. Niet gekoppeld: kaart met «Koppel Todoist».
 */

type TodoTask = {
  id: string;
  content: string;
  projectId: string | null;
  labels: string[];
  priority: number;
  due: { date: string | null; datetime: string | null; recurring: boolean } | null;
  url: string | null;
};
type TodoProject = { id: string; name: string; color: string | null; inbox: boolean };
type State =
  | { kind: "loading" }
  | { kind: "not-configured" }
  | { kind: "not-connected"; reconnect: boolean }
  | { kind: "error" }
  | { kind: "ready"; tasks: TodoTask[]; projects: Map<string, TodoProject> };

/** Todoist-kleurnamen → hex (palet van Todoist). */
const TODOIST_COLORS: Record<string, string> = {
  berry_red: "#b8256f", red: "#db4035", orange: "#ff9933", yellow: "#fad000", olive_green: "#afb83b",
  lime_green: "#7ecc49", green: "#299438", mint_green: "#6accbc", teal: "#158fad", sky_blue: "#14aaf5",
  light_blue: "#96c3eb", blue: "#4073ff", grape: "#884dff", violet: "#af38eb", lavender: "#eb96eb",
  magenta: "#e05194", salmon: "#ff8d85", charcoal: "#808080", grey: "#b8b8b8", taupe: "#ccac93",
};
/** Todoist-prioriteit (4 = P1 hoogst) → vlagkleur; P4 (1) = geen vlag. */
const PRIORITY: Record<number, { label: string; color: string } | undefined> = {
  4: { label: "P1", color: "#d1453b" },
  3: { label: "P2", color: "#eb8909" },
  2: { label: "P3", color: "#246fe0" },
};

function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Sorteersleutel en label voor de vervaldatum. */
function dueInfo(task: TodoTask, todayIso: string): { rank: number; key: string; label: string | null; overdue: boolean } {
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

function useTodoist() {
  const token = useGoogleAuthToken();
  const [state, setState] = React.useState<State>({ kind: "loading" });

  const load = React.useCallback(async () => {
    if (!token) return;
    const post = (path: string, body?: unknown) =>
      fetch(`/api/todoist/${path}`, {
        method: "POST",
        headers: { ...googleAuthHeaders(token), "content-type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
      });
    try {
      const status = (await (await post("status")).json()) as { configured?: boolean; connected?: boolean; reconnect?: boolean };
      if (status.configured === false) return setState({ kind: "not-configured" });
      if (!status.connected) return setState({ kind: "not-connected", reconnect: status.reconnect === true });
      const [tasksRes, projectsRes] = await Promise.all([post("tasks", { limit: 200 }), post("projects", { limit: 200 })]);
      if (!tasksRes.ok) throw new Error(String(tasksRes.status));
      const { tasks } = (await tasksRes.json()) as { tasks: TodoTask[] };
      const { projects } = projectsRes.ok ? ((await projectsRes.json()) as { projects: TodoProject[] }) : { projects: [] };
      setState({ kind: "ready", tasks, projects: new Map(projects.map((p) => [p.id, p])) });
    } catch {
      setState({ kind: "error" });
    }
  }, [token]);

  React.useEffect(() => {
    void load();
    // Verversen bij terugkeren naar de app (taken afgevinkt in Todoist).
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  const connect = React.useCallback(async () => {
    const res = await fetch("/api/todoist/connect", { method: "POST", headers: googleAuthHeaders(token) });
    const data = (await res.json().catch(() => ({}))) as { url?: string };
    if (data.url) window.location.assign(data.url);
  }, [token]);

  return { state, load, connect };
}

function TaskCard({ task, project, due }: { task: TodoTask; project: TodoProject | undefined; due: ReturnType<typeof dueInfo> }) {
  const prio = PRIORITY[task.priority];
  const projectColor = project?.color ? TODOIST_COLORS[project.color] ?? "#b8b8b8" : "#b8b8b8";
  return (
    <a
      href={task.url ?? "https://app.todoist.com/app/today"}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-[220px] shrink-0 snap-start flex-col gap-2 rounded-[20px] bg-[var(--white)] p-4 no-underline shadow-card transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
    >
      <span className="flex min-h-5 items-center justify-between gap-2">
        {due.label ? (
          <span className={cn("text-[12px] font-bold leading-4", due.overdue ? "text-[#d1453b]" : due.rank === 1 ? "text-[#058527]" : "text-[var(--text-secondary)]")}>
            {due.label}
          </span>
        ) : (
          <span className="text-[12px] font-semibold leading-4 text-[var(--text-tertiary)]">Geen datum</span>
        )}
        {prio ? (
          <span aria-label={`Prioriteit ${prio.label}`} className="flex items-center gap-0.5 text-[11px] font-extrabold" style={{ color: prio.color }}>
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-3.5">
              <path d="M5 21V4h11.5l-1.6 3.8L16.5 12H7v9z" />
            </svg>
            {prio.label}
          </span>
        ) : null}
      </span>
      <span className="line-clamp-3 text-[15px] font-semibold leading-5 text-[var(--text-primary)]">{task.content}</span>
      <span className="mt-auto flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-4 text-[var(--text-secondary)]">
        {project ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: projectColor }} />
            <span className="truncate">{project.inbox ? "Inbox" : project.name}</span>
          </span>
        ) : null}
        {task.labels.slice(0, 2).map((l) => (
          <span key={l} className="rounded-pill bg-[var(--gray-50)] px-1.5 py-0.5 text-[11px] font-semibold">
            @{l}
          </span>
        ))}
      </span>
    </a>
  );
}

export function HomeTodoSection() {
  const { state, load, connect } = useTodoist();
  const todayIso = localIso(new Date());

  const sorted = React.useMemo(() => {
    if (state.kind !== "ready") return [];
    return state.tasks
      .map((t) => ({ task: t, due: dueInfo(t, todayIso) }))
      .sort((a, b) => a.due.rank - b.due.rank || a.due.key.localeCompare(b.due.key) || b.task.priority - a.task.priority);
  }, [state, todayIso]);

  const header = (
    <ListSectionHeader
      label="To-do"
      showNaarOverzicht={false}
      action={
        state.kind === "ready" ? (
          <OverviewPill href="https://app.todoist.com/app/today" external count={state.tasks.length} ariaLabel={`Todoist openen (${state.tasks.length} taken)`} />
        ) : undefined
      }
    />
  );

  let body: React.ReactNode;
  if (state.kind === "loading") {
    body = (
      <div className="-mx-[var(--space-4)] flex gap-3 overflow-hidden px-[var(--space-4)] pb-1" aria-busy aria-label="Taken laden">
        {[0, 1, 2].map((i) => (
          <span key={i} className="shimmer h-[132px] w-[220px] shrink-0 rounded-[20px]" />
        ))}
      </div>
    );
  } else if (state.kind === "error") {
    body = (
      <p className="text-sm text-[var(--text-secondary)]">
        Todoist is even niet bereikbaar.{" "}
        <button type="button" onClick={() => void load()} className="font-bold text-[var(--text-primary)] underline">
          Opnieuw
        </button>
      </p>
    );
  } else if (state.kind === "not-configured" || state.kind === "not-connected") {
    body = (
      <HomeOnboardingEmptyCard
        illustrationSrc="/images/ui/lijstje_240.webp"
        illustrationSide="end"
        contentAlign="start"
        text={
          state.kind === "not-configured"
            ? "Zie hier je Todoist-taken. Todoist is nog niet ingesteld voor deze versie van de app."
            : state.reconnect
              ? "Je Todoist-koppeling is verlopen. Koppel opnieuw om je taken hier te zien."
              : "Zie hier je Todoist-taken: wat vandaag moet, wat te laat is en wat eraan komt."
        }
        actions={
          state.kind === "not-configured" ? (
            <span className="text-[12px] font-medium leading-4 text-[var(--text-secondary)]">Vraag de beheerder om Todoist in te stellen.</span>
          ) : (
            <MiniButton variant="primary" onClick={() => void connect()}>
              {state.reconnect ? "Opnieuw koppelen" : "Koppel Todoist"}
            </MiniButton>
          )
        }
      />
    );
  } else if (sorted.length === 0) {
    body = <p className="text-sm text-[var(--text-secondary)]">Niets te doen in Todoist. 🎉</p>;
  } else {
    body = (
      <div className="-mx-[var(--space-4)] flex snap-x gap-3 overflow-x-auto scroll-px-[var(--space-4)] px-[var(--space-4)] pb-2 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sorted.slice(0, 30).map(({ task, due }) => (
          <TaskCard key={task.id} task={task} project={task.projectId ? state.projects.get(task.projectId) : undefined} due={due} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {header}
      {body}
    </div>
  );
}
