"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { PRIORITY, plainTaskText, TODO_NEAR_DAYS, daysUntil, localIso, projectColor, sortTasks, useTodoist, type TodoDue, type TodoProject, type TodoTask } from "@/lib/todoist-client";
import { ListSectionHeader, OverviewPill } from "@/components/list_section_header";
import { HomeOnboardingEmptyCard } from "@/components/home_onboarding_empty_card";
import { MiniButton } from "@/components/ui/mini_button";
import { TodoCheck, TodoNotice } from "@/components/todo_check";

/**
 * Startpagina · «To-do»: je Todoist-taken in een swimlane. Enkel taken met een datum die te laat is of binnen
 * TODO_NEAR_DAYS valt (verre of datumloze taken staan op /todo, via de «Toon alle»-pil). Afvinken met het
 * rondje (blijft in de app, opent Todoist niet). Niet gekoppeld: kaart met «Koppel Todoist».
 */

function TaskCard({ task, project, due, onCheck }: { task: TodoTask; project: TodoProject | undefined; due: TodoDue; onCheck: (t: TodoTask) => void }) {
  const prio = PRIORITY[task.priority];
  return (
    <div className="flex w-[220px] shrink-0 snap-start flex-col gap-2 rounded-[20px] bg-[var(--white)] p-4 shadow-card">
      <span className="flex min-h-[22px] items-center gap-2">
        <TodoCheck task={task} onCheck={onCheck} />
        {due.label ? (
          <span className={cn("mr-auto text-[12px] font-bold leading-4", due.overdue ? "text-[#d1453b]" : due.rank === 1 ? "text-[#058527]" : "text-[var(--text-secondary)]")}>
            {due.label}
          </span>
        ) : (
          <span className="mr-auto text-[12px] font-semibold leading-4 text-[var(--text-tertiary)]">Geen datum</span>
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
      <span className="line-clamp-3 text-[15px] font-semibold leading-5 text-[var(--text-primary)] [overflow-wrap:anywhere]">{plainTaskText(task.content)}</span>
      <span className="mt-auto flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-4 text-[var(--text-secondary)]">
        {project ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <span aria-hidden className="size-2 shrink-0 rounded-full" style={{ backgroundColor: projectColor(project) }} />
            <span className="truncate">{project.inbox ? "Inbox" : project.name}</span>
          </span>
        ) : null}
        {task.labels.slice(0, 2).map((l) => (
          <span key={l} className="rounded-pill bg-[var(--gray-50)] px-1.5 py-0.5 text-[11px] font-semibold">
            @{l}
          </span>
        ))}
      </span>
    </div>
  );
}

export function HomeTodoSection() {
  const { state, load, connect, closeTask, notice, clearNotice } = useTodoist();
  const todayIso = localIso(new Date());

  // Enkel wat dichtbij is: te laat, vandaag en de komende dagen; de rest staat op /todo.
  const sorted = React.useMemo(() => {
    if (state.kind !== "ready") return [];
    return sortTasks(
      state.tasks.filter((t) => {
        const d = daysUntil(t, todayIso);
        return d !== null && d <= TODO_NEAR_DAYS;
      }),
      todayIso,
    );
  }, [state, todayIso]);

  const header = (
    <ListSectionHeader
      label="To-do"
      showNaarOverzicht={false}
      action={
        state.kind === "ready" ? (
          <OverviewPill href="/todo" count={state.tasks.length} ariaLabel={`Alle ${state.tasks.length} taken bekijken`} />
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
    body = (
      <p className="text-sm text-[var(--text-secondary)]">
        {state.tasks.length > 0 ? "Niets dringends deze week. 🎉" : "Niets te doen in Todoist. 🎉"}
      </p>
    );
  } else {
    body = (
      <div className="-mx-[var(--space-4)] flex snap-x gap-3 overflow-x-auto scroll-px-[var(--space-4)] px-[var(--space-4)] pb-2 pt-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sorted.slice(0, 30).map(({ task, due }) => (
          <TaskCard key={task.id} task={task} project={task.projectId ? state.projects.get(task.projectId) : undefined} due={due} onCheck={(t) => void closeTask(t)} />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {header}
      {body}
      <TodoNotice notice={notice} onReconnect={() => void connect()} onClose={clearNotice} />
    </div>
  );
}
