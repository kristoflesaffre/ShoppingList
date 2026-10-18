"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { plainTaskText, TODO_NEAR_DAYS, daysUntil, localIso, sortTasks, useTodoist, type TodoDue, type TodoTask } from "@/lib/todoist-client";
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

/** Kurken prikbord achter de rij (canvas «post-its op kurk» R2): korrels in drie tinten op een warm verloop. */
const CORK_STYLE: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(circle at 20% 30%,rgba(120,70,20,.35) 0 1.5px,transparent 2px),radial-gradient(circle at 70% 60%,rgba(90,50,15,.3) 0 1.2px,transparent 1.8px),radial-gradient(circle at 40% 80%,rgba(255,230,190,.35) 0 1.4px,transparent 2px),linear-gradient(135deg,#c8955b,#b98549)",
  backgroundSize: "26px 26px,31px 31px,23px 23px,100% 100%",
};
const TAPE_TILT = [-3, 2, -1.5, 3, -2];

/**
 * Taak als vierkante post-it op het prikbord (canvas «post-its op kurk» R2, zonder omgevouwen hoeken): mat
 * papier met scherpe hoeken, een stukje plakband bovenaan, geel — of rood als de taak te laat is. Herkende
 * taken krijgen hun foto in de rechteronderhoek: 45° gedraaid, of rechtop (telefoonscherm).
 */
function TaskCard({ task, due, index, onCheck }: { task: TodoTask; due: TodoDue; index: number; onCheck: (t: TodoTask) => void }) {
  const photo = taskPhotoFor(task.content);
  const late = due.overdue;
  return (
    <div className="relative mt-3 size-[168px] shrink-0 snap-start">
      <div
        className={cn(
          "absolute inset-0 flex flex-col gap-[9px] overflow-hidden px-3.5 pb-3.5 pt-4 shadow-[0_1px_1.5px_rgba(0,0,0,0.16),0_8px_14px_-6px_rgba(40,25,5,0.45)] [[data-theme=dark]_&]:brightness-[0.92]",
          late ? "bg-[linear-gradient(170deg,#f9d2cb,#f2c2b9)]" : "bg-[linear-gradient(170deg,#f3f1b4,#eceaa6)]",
        )}
      >
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- lokale, transparante webp
          <img
            src={`${photo.src}_240.webp`}
            srcSet={`${photo.src}_240.webp 1x, ${photo.src}_480.webp 2x`}
            alt=""
            aria-hidden
            className={cn(
              "pointer-events-none absolute object-contain drop-shadow-[0_8px_10px_rgba(16,17,48,0.25)]",
              // Klein genoeg en ver genoeg in de hoek: blijft onder drie regels titel.
              photo.upright ? "-bottom-3.5 right-1.5 size-[74px]" : "-bottom-[26px] -right-[17px] size-[71px] rotate-45",
            )}
          />
        ) : null}
        <span className="relative flex min-h-[21px] items-center justify-between gap-2">
          <TodoCheck task={task} onCheck={onCheck} />
          {due.label ? (
            <span className={cn("text-[12px] font-extrabold leading-4", late ? "text-[#b42318]" : due.rank === 1 ? "text-[#1f7a34]" : "text-[#6f6a12]")}>{due.label}</span>
          ) : null}
        </span>
        <span className={cn("relative line-clamp-3 text-[13.5px] font-bold leading-[18px] [overflow-wrap:anywhere]", late ? "text-[#4a1410]" : "text-[#2b2a10]")}>
          {plainTaskText(task.content)}
        </span>
      </div>
      {/* Plakband bovenaan, telkens een tikje anders gedraaid. */}
      <span
        aria-hidden
        className="absolute -top-2.5 left-1/2 z-[1] h-[21px] w-[62px] bg-[linear-gradient(180deg,rgba(255,255,255,0.66),rgba(255,255,255,0.48))] shadow-[0_1px_2px_rgba(0,0,0,0.12)]"
        style={{ transform: `translateX(-50%) rotate(${TAPE_TILT[index % TAPE_TILT.length]}deg)` }}
      />
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
          <span key={i} className="shimmer size-[168px] shrink-0" />
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
      // Prikbord: de notes hangen er met plakband op; de rij scrolt binnen het bord.
      <div className="overflow-hidden rounded-[24px] shadow-[inset_0_2px_6px_rgba(60,35,10,0.35)]" style={CORK_STYLE}>
        <div className="flex snap-x gap-4 overflow-x-auto scroll-px-4 px-4 pb-5 pt-3.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sorted.slice(0, 30).map(({ task, due }, i) => (
            <TaskCard key={task.id} task={task} due={due} index={i} onCheck={(t) => void closeTask(t)} />
          ))}
        </div>
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
