"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { backOr } from "@/lib/in_app_history";
import { PRIORITY, plainTaskText, daysUntil, localIso, projectColor, sortTasks, useTodoist, type TodoDue, type TodoProject, type TodoTask } from "@/lib/todoist-client";
import { headerRoundButtonClass } from "@/components/ui/header_round_button";
import { PageBackButton } from "@/components/ui/page_back_button";
import { RoundIcons } from "@/components/ui/round_icon_button";
import { HomeOnboardingEmptyCard } from "@/components/home_onboarding_empty_card";
import { MiniButton } from "@/components/ui/mini_button";

/**
 * «To-do» (via «Toon alle» op de startpagina): al je Todoist-taken in één overzicht, per periode gegroepeerd
 * (te laat, vandaag, morgen, deze week, later, zonder datum) en te filteren per project. Alleen lezen: een
 * taak openen gaat naar Todoist.
 */

type GroupKey = "late" | "today" | "tomorrow" | "week" | "later" | "none";
const GROUPS: { key: GroupKey; label: string }[] = [
  { key: "late", label: "Te laat" },
  { key: "today", label: "Vandaag" },
  { key: "tomorrow", label: "Morgen" },
  { key: "week", label: "Deze week" },
  { key: "later", label: "Later" },
  { key: "none", label: "Zonder datum" },
];

function groupOf(task: TodoTask, todayIso: string): GroupKey {
  const d = daysUntil(task, todayIso);
  if (d === null) return "none";
  if (d < 0) return "late";
  if (d === 0) return "today";
  if (d === 1) return "tomorrow";
  if (d <= 7) return "week";
  return "later";
}

function TaskRow({ task, project, due, showDate }: { task: TodoTask; project: TodoProject | undefined; due: TodoDue; showDate: boolean }) {
  const prio = PRIORITY[task.priority];
  return (
    <li>
      <a
        href={task.url ?? "https://app.todoist.com/app/today"}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-start gap-3 px-4 py-3 no-underline transition-colors [@media(hover:hover)]:hover:bg-[var(--gray-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]"
      >
        {/* Cirkel zoals in Todoist: rand in de prioriteitskleur (P4 grijs). */}
        <span
          aria-hidden
          className="mt-0.5 size-[18px] shrink-0 rounded-full border-2"
          style={{ borderColor: prio?.color ?? "var(--gray-200)", backgroundColor: prio ? `${prio.color}14` : undefined }}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-medium leading-5 text-[var(--text-primary)] [overflow-wrap:anywhere]">{plainTaskText(task.content)}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12.5px] leading-4 text-[var(--text-secondary)] empty:hidden">
            {showDate && due.label ? (
              <span className={cn("font-semibold", due.overdue ? "text-[#d1453b]" : due.rank === 1 ? "text-[#058527]" : "")}>{due.label}</span>
            ) : null}
            {task.due?.recurring ? (
              <span aria-label="Herhaalt" className="flex items-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-3.5">
                  <path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3" />
                </svg>
              </span>
            ) : null}
            {task.labels.map((l) => (
              <span key={l} className="rounded-pill bg-[var(--gray-50)] px-1.5 py-0.5 text-[11.5px] font-semibold">
                @{l}
              </span>
            ))}
            {project ? (
              <span className="ml-auto flex min-w-0 items-center gap-1.5">
                <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: projectColor(project) }} />
                <span className="truncate">{project.inbox ? "Inbox" : project.name}</span>
              </span>
            ) : null}
          </span>
        </span>
      </a>
    </li>
  );
}

export default function TodoPage() {
  const router = useRouter();
  const goBack = React.useCallback(() => backOr(router, "/"), [router]);
  const { state, load, connect } = useTodoist();
  const [projectFilter, setProjectFilter] = React.useState<string | null>(null);
  const todayIso = localIso(new Date());

  const tasks = state.kind === "ready" ? state.tasks : [];
  const projects = state.kind === "ready" ? state.projects : new Map<string, TodoProject>();
  // Enkel projecten waar taken in zitten, in volgorde van het aantal taken.
  const projectChips = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tasks) if (t.projectId) counts.set(t.projectId, (counts.get(t.projectId) ?? 0) + 1);
    return Array.from(counts.entries())
      .map(([id, n]) => ({ id, n, project: projects.get(id) }))
      .filter((c) => c.project)
      .sort((a, b) => Number(b.project!.inbox) - Number(a.project!.inbox) || b.n - a.n);
  }, [tasks, projects]);
  const groups = React.useMemo(() => {
    const shown = projectFilter ? tasks.filter((t) => t.projectId === projectFilter) : tasks;
    const byGroup = new Map<GroupKey, { task: TodoTask; due: TodoDue }[]>();
    for (const item of sortTasks(shown, todayIso)) {
      const g = groupOf(item.task, todayIso);
      byGroup.set(g, [...(byGroup.get(g) ?? []), item]);
    }
    return GROUPS.map((g) => ({ ...g, items: byGroup.get(g.key) ?? [] })).filter((g) => g.items.length > 0);
  }, [tasks, projectFilter, todayIso]);

  const chip = (active: boolean) =>
    cn(
      "inline-flex h-9 shrink-0 items-center gap-2 rounded-pill px-3.5 text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
      active ? "bg-[var(--text-primary)] text-[var(--bg-app)]" : "bg-[var(--white)] text-[var(--text-primary)] shadow-card",
    );

  return (
    <div className="relative flex min-h-dvh w-full flex-col">
      {/* Mobiel: vaste topbalk met terugknop. Desktop: terugknop naast de titel. */}
      <div className="fixed left-0 right-0 top-0 z-20 bg-[var(--bg-app)] pt-[env(safe-area-inset-top,0px)] lg:hidden">
        <header className="mx-auto flex h-16 w-full max-w-[1000px] items-center gap-4 px-4">
          <button type="button" aria-label="Terug" onClick={goBack} className={headerRoundButtonClass}>
            {RoundIcons.back}
          </button>
        </header>
      </div>

      <main className="mx-auto flex w-full min-w-0 max-w-[1000px] flex-1 flex-col px-4 pb-[calc(120px+env(safe-area-inset-bottom,0px))] pt-[calc(64px+8px+env(safe-area-inset-top,0px))] motion-safe:animate-fade-up lg:pt-12">
        <div className="flex items-center gap-3">
          <PageBackButton label="Terug" onClick={goBack} />
          <h1 className="text-[30px] font-bold leading-9 tracking-tight text-[var(--text-primary)] lg:text-[34px] lg:leading-10">To-do</h1>
          {state.kind === "ready" ? (
            <a
              href="https://app.todoist.com/app/today"
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex h-9 items-center rounded-pill bg-[var(--white)] px-3.5 text-[14px] font-semibold text-action-primary no-underline shadow-card"
            >
              Open Todoist
            </a>
          ) : null}
        </div>
        <p className="mt-0.5 text-sm leading-5 text-[var(--text-secondary)] lg:pl-12">
          {state.kind === "ready" ? `${tasks.length} open ${tasks.length === 1 ? "taak" : "taken"} uit Todoist` : "Je taken uit Todoist"}
        </p>

        {/* Gekoppeld met enkel leesrechten (oudere koppeling): opnieuw koppelen geeft ook schrijfrechten (afvinken). */}
        {state.kind === "ready" && !state.canWrite ? (
          <div className="mt-5 flex flex-wrap items-center gap-3 rounded-[20px] bg-[var(--white)] px-4 py-3.5 shadow-card lg:ml-12">
            <p className="min-w-0 flex-1 text-sm leading-5 text-[var(--text-primary)]">
              <span className="font-semibold">Taken afvinken vanuit de app?</span>{" "}
              <span className="text-[var(--text-secondary)]">Koppel Todoist opnieuw en geef lees- en schrijfrechten.</span>
            </p>
            <MiniButton variant="primary" onClick={() => void connect()}>
              Opnieuw koppelen
            </MiniButton>
          </div>
        ) : null}

        {state.kind === "loading" ? (
          <div className="mt-6 flex flex-col gap-3" aria-busy aria-label="Taken laden">
            {[0, 1, 2].map((i) => (
              <span key={i} className="shimmer h-[140px] rounded-[20px]" />
            ))}
          </div>
        ) : state.kind === "error" ? (
          <p className="mt-6 text-sm text-[var(--text-secondary)]">
            Todoist is even niet bereikbaar.{" "}
            <button type="button" onClick={() => void load()} className="font-bold text-[var(--text-primary)] underline">
              Opnieuw
            </button>
          </p>
        ) : state.kind === "not-configured" || state.kind === "not-connected" ? (
          <div className="mt-6">
            <HomeOnboardingEmptyCard
              illustrationSrc="/images/ui/lijstje_240.webp"
              illustrationSide="end"
              contentAlign="start"
              text={state.kind === "not-configured" ? "Todoist is nog niet ingesteld voor deze versie van de app." : "Koppel Todoist om hier al je taken te zien."}
              actions={
                state.kind === "not-configured" ? null : (
                  <MiniButton variant="primary" onClick={() => void connect()}>
                    {state.reconnect ? "Opnieuw koppelen" : "Koppel Todoist"}
                  </MiniButton>
                )
              }
            />
          </div>
        ) : (
          <>
            {/* Filter per project. */}
            <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:flex-wrap lg:px-0 lg:pl-12">
              <button type="button" aria-pressed={projectFilter === null} onClick={() => setProjectFilter(null)} className={chip(projectFilter === null)}>
                Alles <span className="opacity-60">{tasks.length}</span>
              </button>
              {projectChips.map(({ id, n, project }) => (
                <button key={id} type="button" aria-pressed={projectFilter === id} onClick={() => setProjectFilter((f) => (f === id ? null : id))} className={chip(projectFilter === id)}>
                  <span aria-hidden className="size-2 rounded-full" style={{ backgroundColor: projectColor(project) }} />
                  {project!.inbox ? "Inbox" : project!.name}
                  <span className="opacity-60">{n}</span>
                </button>
              ))}
            </div>

            {groups.length === 0 ? (
              <p className="mt-8 text-center text-sm text-[var(--text-secondary)]">Geen taken. 🎉</p>
            ) : (
              <div className="mt-6 grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-2 lg:pl-12">
                {groups.map((g) => (
                  <section key={g.key} aria-label={g.label} className="flex min-w-0 flex-col gap-2.5">
                    <h2 className={cn("flex items-baseline gap-2 px-1 text-[13px] font-extrabold uppercase tracking-[0.06em]", g.key === "late" ? "text-[#d1453b]" : "text-[var(--text-secondary)]")}>
                      {g.label}
                      <span className="font-semibold opacity-70">{g.items.length}</span>
                    </h2>
                    <ul className="divide-y divide-[var(--border-subtle)] overflow-hidden rounded-[20px] bg-[var(--white)] shadow-card">
                      {g.items.map(({ task, due }) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          project={task.projectId ? projects.get(task.projectId) : undefined}
                          due={due}
                          // In «Vandaag» en «Morgen» zegt de groep de datum al; toon dan enkel het uur.
                          showDate={g.key !== "today" && g.key !== "tomorrow" ? true : Boolean(task.due?.datetime)}
                        />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
