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

/**
 * Kurken prikbord achter de rij (canvas «post-its op kurk» R2): korrels in drie tinten op een warm verloop.
 * Donker thema (canvas «donker thema» A): dieper kurk via --cork-a/--cork-b; avondlucht: glas (zie CORK_DARK).
 */
const CORK_DARK =
  "[[data-theme=dark]_&]:[--cork-a:#6b4f32] [[data-theme=dark]_&]:[--cork-b:#58402a] " +
  // Avondlucht: geen kurk maar matglas, net als de andere tegels op het dashboard.
  "[[data-sunset]_&]:[--cork-bg:none] [[data-sunset]_&]:bg-fixed-white/20 [[data-sunset]_&]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.42)] [[data-sunset]_&]:backdrop-blur-[14px]";
const CORK_STYLE: React.CSSProperties = {
  // Via --cork-bg uit te zetten: op de avondlucht wordt het bord glas zoals de andere tegels (zie CORK_DARK).
  backgroundImage:
    "var(--cork-bg, radial-gradient(circle at 20% 30%,rgba(120,70,20,.35) 0 1.5px,transparent 2px),radial-gradient(circle at 70% 60%,rgba(90,50,15,.3) 0 1.2px,transparent 1.8px),radial-gradient(circle at 40% 80%,rgba(255,230,190,.35) 0 1.4px,transparent 2px),linear-gradient(135deg,var(--cork-a,#c8955b),var(--cork-b,#b98549)))",
  backgroundSize: "26px 26px,31px 31px,23px 23px,100% 100%",
};
const TAPE_TILT = [-3, 2, -1.5, 3, -2];

/**
 * Hoe schuin een note hangt, alsof iemand ze er met de hand op plakte: afwisselend met en tegen de klok in
 * (volgens de plaats in de rij), met een hoek tussen 1° en 5° die per taak vast is (zelfde taak = zelfde hoek).
 */
function postitTilt(taskId: string, index: number): number {
  let h = 0;
  for (let i = 0; i < taskId.length; i++) h = (h * 31 + taskId.charCodeAt(i)) >>> 0;
  const magnitude = [1, 2.5, 4, 1.5, 3.5, 5, 2][h % 7];
  return index % 2 === 0 ? -magnitude : magnitude;
}

/**
 * Taak als vierkante post-it op het prikbord (canvas «post-its op kurk» R2, zonder omgevouwen hoeken): mat
 * papier met scherpe hoeken, een stukje plakband bovenaan, geel — of rood als de taak te laat is. Herkende
 * taken krijgen hun foto in de rechteronderhoek: 45° gedraaid, of rechtop (telefoonscherm).
 */
export function TodoPostit({ task, due, index, onCheck, size = 168 }: { task: TodoTask; due: TodoDue; index: number; onCheck: (t: TodoTask) => void; size?: number }) {
  const photo = taskPhotoFor(task.content);
  const late = due.overdue;
  const small = size < 152;
  const tiny = size < 140;
  // Foto in verhouding tot de note: blijft zo ook op een kleinere note onder drie regels titel.
  const img = Math.round(size * (photo?.upright ? 0.4 : small ? 0.38 : 0.42));
  return (
    <div className="relative mt-3 shrink-0 snap-start" style={{ width: size, height: size, transform: `rotate(${postitTilt(task.id, index)}deg)` }}>
      <div
        className={cn(
          "absolute inset-0 flex flex-col gap-[9px] overflow-hidden px-3.5 pb-3.5 pt-4 shadow-[0_1px_1.5px_rgba(0,0,0,0.16),0_8px_14px_-6px_rgba(40,25,5,0.45)] [[data-theme=dark]_&]:brightness-[0.88]",
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
            className={cn("pointer-events-none absolute object-contain drop-shadow-[0_8px_10px_rgba(16,17,48,0.25)]", !photo.upright && "rotate-45")}
            style={
              photo.upright
                ? { width: img, height: img, right: Math.round(size * 0.04), bottom: -Math.round(img * 0.3) }
                : { width: img, height: img, right: -Math.round(img * 0.24), bottom: -Math.round(img * (small ? 0.48 : 0.36)) }
            }
          />
        ) : null}
        <span className="relative flex min-h-[21px] items-center justify-between gap-2">
          <TodoCheck task={task} onCheck={onCheck} />
          {due.label ? (
            <span className={cn("text-[12px] font-extrabold leading-4", late ? "text-[#b42318]" : due.rank === 1 ? "text-[#1f7a34]" : "text-[#6f6a12]")}>{due.label}</span>
          ) : null}
        </span>
        <span lang="nl" className={cn("relative line-clamp-3 font-bold [hyphens:auto] [overflow-wrap:anywhere]", tiny ? "text-[11.5px] leading-[15px]" : small ? "text-[12.5px] leading-[16.5px]" : "text-[13.5px] leading-[18px]", late ? "text-[#4a1410]" : "text-[#2b2a10]")}>
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

/** Todoist + enkel wat dichtbij is (te laat, vandaag en de komende dagen); de rest staat op /todo. */
export function useNearTodos() {
  const todo = useTodoist();
  const { state } = todo;
  const todayIso = localIso(new Date());
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
  return { ...todo, sorted };
}

export function HomeTodoSection() {
  const { state, load, connect, closeTask, notice, clearNotice, sorted } = useNearTodos();

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
      <div className={cn("overflow-hidden rounded-[24px] shadow-[inset_0_2px_6px_rgba(60,35,10,0.35)]", CORK_DARK)} style={CORK_STYLE}>
        <div className="flex snap-x gap-5 overflow-x-auto scroll-px-4 px-5 pb-6 pt-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {sorted.slice(0, 30).map(({ task, due }, i) => (
            <TodoPostit key={task.id} task={task} due={due} index={i} onCheck={(t) => void closeTask(t)} />
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

/**
 * Tabletdashboard: de post-its op een kurken prikbord bovenaan de rechterkolom (boven de agenda), even hoog als
 * de bovenste rij links (`height`); de notes schalen mee zodat ze er precies in passen. De agenda vult de rest. Enkel wat vandaag moet of te laat is (morgen en later niet); is dat er niet
 * meer, dan verdwijnt het paneel en vult de agenda de kolom.
 */
export function DashboardTodoPanel({ height }: { height: number | null }) {
  const { sorted: near, closeTask, connect, notice, clearNotice } = useNearTodos();
  const todayIso = localIso(new Date());
  const sorted = near.filter(({ task }) => (daysUntil(task, todayIso) ?? 1) <= 0);
  if (sorted.length === 0) return null;
  // Note-grootte uit de paneelhoogte: label en marges (±62 px) eraf, tussen 104 en 168 px.
  const size = Math.round(Math.min(168, Math.max(104, (height ?? 228) - 62)));
  return (
    <section
      aria-label="Te doen"
      // Always-on: ontkleurd en gedimd (zoals de rest van het nachtscherm), geen fel kurk en papier op een tablet die
      // de hele tijd aanstaat.
      className={cn("flex shrink-0 flex-col overflow-hidden rounded-[24px] pt-4 shadow-[inset_0_2px_6px_rgba(60,35,10,0.35),0_18px_40px_-26px_rgba(60,35,10,0.6)] transition-[filter] duration-500 [[data-aod]_&]:shadow-none [[data-aod]_&]:[filter:saturate(0.65)_brightness(0.58)_contrast(1.08)] [[data-theme=dark]_&]:shadow-[inset_0_2px_6px_rgba(0,0,0,0.45)]", CORK_DARK)}
      style={height ? { ...CORK_STYLE, height } : CORK_STYLE}
    >
      <div className="flex items-center justify-between px-5">
        <span className="text-[11.5px] font-extrabold tracking-[0.08em] text-fixed-white/90 [text-shadow:0_1px_2px_rgba(60,35,10,0.45)]">TE DOEN</span>
        <span className="text-[12px] font-bold text-fixed-white/80 [text-shadow:0_1px_2px_rgba(60,35,10,0.45)]">{sorted.length}</span>
      </div>
      <div className="-mt-1 flex min-h-0 flex-1 snap-x items-center gap-5 overflow-x-auto scroll-px-5 px-5 pb-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sorted.slice(0, 20).map(({ task, due }, i) => (
          <TodoPostit key={task.id} task={task} due={due} index={i} size={size} onCheck={(t) => void closeTask(t)} />
        ))}
      </div>
      <TodoNotice notice={notice} onReconnect={() => void connect()} onClose={clearNotice} />
    </section>
  );
}
