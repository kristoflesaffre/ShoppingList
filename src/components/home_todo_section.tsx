"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { plainTaskText, TODO_NEAR_DAYS, daysUntil, localIso, sortTasks, useTodoist, type TodoDue, type TodoProject, type TodoTask } from "@/lib/todoist-client";
import { ListSectionHeader, OverviewPill } from "@/components/list_section_header";
import { HomeOnboardingEmptyCard } from "@/components/home_onboarding_empty_card";
import { MiniButton } from "@/components/ui/mini_button";
import { TodoCheck, TodoNotice } from "@/components/todo_check";
import { taskPhotoFor } from "@/lib/task_photos";

/**
 * Startpagina · «To-do»: je Todoist-taken in een swimlane. Enkel taken met een datum die te laat is of binnen
 * TODO_NEAR_DAYS valt (verre of datumloze taken staan op /todo, via de «Toon alle»-pil). Afvinken met het
 * rondje (blijft in de app, opent Todoist niet). Niet gekoppeld: kaart met «Koppel Todoist».
 */

/**
 * Taak als post-it (canvas «To-do-tegels» E + F): recht papiertje met vouwhoekje, geel — of rood als de taak te
 * laat is. Herkende taken (medicatie, …) krijgen een foto die uit de rechteronderhoek steekt.
 */
function TaskCard({ task, project, due, onCheck }: { task: TodoTask; project: TodoProject | undefined; due: TodoDue; onCheck: (t: TodoTask) => void }) {
  const photo = taskPhotoFor(task.content);
  const late = due.overdue;
  return (
    <div
      className={cn(
        "relative flex min-h-[164px] w-[210px] shrink-0 snap-start flex-col gap-2.5 overflow-hidden rounded-[6px_6px_22px_6px] p-4 shadow-[0_14px_22px_-16px_rgba(80,60,20,0.55),0_1px_0_rgba(0,0,0,0.04)] [[data-theme=dark]_&]:brightness-[0.92]",
        late ? "bg-[#ffd9d4]" : "bg-[#fff4b8]",
      )}
    >
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- lokale, transparante webp
        <img
          src={`${photo}_240.webp`}
          srcSet={`${photo}_240.webp 1x, ${photo}_480.webp 2x`}
          alt=""
          aria-hidden
          className="pointer-events-none absolute -bottom-3 -right-3 size-[108px] object-contain drop-shadow-[0_8px_10px_rgba(16,17,48,0.18)]"
        />
      ) : null}
      {/* Vouwhoekje rechtsonder. */}
      <span aria-hidden className="pointer-events-none absolute bottom-0 right-0 size-[26px] rounded-br-[22px] bg-[linear-gradient(135deg,transparent_50%,rgba(0,0,0,0.08)_50%)]" />
      <span className="relative flex min-h-[22px] items-center justify-between gap-2">
        <TodoCheck task={task} onCheck={onCheck} />
        {due.label ? (
          <span className={cn("text-[12px] font-extrabold leading-4", late ? "text-[#b42318]" : due.rank === 1 ? "text-[#1f7a34]" : "text-[#7a5d00]")}>{due.label}</span>
        ) : null}
      </span>
      <span
        className={cn(
          "relative line-clamp-4 text-[16px] font-bold leading-[21px] [overflow-wrap:anywhere]",
          late ? "text-[#4a1410]" : "text-[#2b2510]",
          photo && "max-w-[128px]",
        )}
      >
        {plainTaskText(task.content)}
      </span>
      {project ? (
        <span className={cn("relative mt-auto truncate text-[12px] leading-4", late ? "text-[#8a3a33]" : "text-[#6b5f3a]", photo && "max-w-[100px]")}>
          {project.inbox ? "Inbox" : project.name}
        </span>
      ) : null}
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
          <span key={i} className="shimmer h-[164px] w-[210px] shrink-0 rounded-[6px_6px_22px_6px]" />
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
