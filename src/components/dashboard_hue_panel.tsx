"use client";

import * as React from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { googleAuthHeaders, useGoogleAuthToken } from "@/lib/google-client";
import { splitRoomName } from "@/lib/hue-room-name";
import { FLOORS, defaultFloor, readFloorOverrides, writeFloorOverrides, type FloorKey } from "@/lib/hue-room-floors";

/**
 * Philips Hue op het avonddashboard (canvas «Dashboard · licht» F · Lampkolommen): elke kamer is een staande
 * capsule die van onder opvult met haar helderheid, met een zachte gloed. Tik op een kolom = aan/uit, op en neer
 * slepen = dimmen (wordt bij loslaten verstuurd). Tik ergens anders op het paneel = het lichtvenster (canvas
 * «licht-venster» A): alle kamers per verdieping als hoge kolommen met een schakelaartje. Via /api/hue/rooms en
 * /api/hue/light.
 */

type Room = { id: string; name: string; archetype: string; on: boolean; brightness: number | null };
type State =
  | { kind: "loading" }
  | { kind: "not-configured" }
  | { kind: "not-connected"; reconnect: boolean }
  | { kind: "error" }
  | { kind: "ready"; rooms: Room[] };

/** Warme lichtkleuren per kolom (Hue geeft per kamer geen kleur terug): [onder, boven]. */
const GLOWS: [string, string][] = [
  ["#ffb547", "#ffe0a3"],
  ["#ffd27a", "#fff2cc"],
  ["#ff9e5e", "#ffd0a8"],
  ["#ffc46b", "#ffe9bf"],
];

type Patch = { on: boolean; brightness?: number };

function LampColumn({
  room,
  index,
  busy,
  onChange,
  onTap,
  tall = false,
}: {
  room: Room;
  index: number;
  busy: boolean;
  onChange: (patch: Patch) => void;
  /** Tik zonder te slepen (standaard: aan/uit). Op het dashboard opent dit het lichtvenster. */
  onTap?: () => void;
  /** Hoge kolom in het lichtvenster: groter, met aan/uit-schakelaar eronder. */
  tall?: boolean;
}) {
  const [preview, setPreview] = React.useState<number | null>(null);
  const drag = React.useRef<{ y: number; moved: boolean; rect: DOMRect } | null>(null);
  // Aan met (afgeronde) helderheid 0 telt als 1%: anders toont de kolom «Uit» terwijl het licht brandt.
  const level = preview ?? (room.on ? Math.max(1, room.brightness ?? 100) : 0);
  const lit = level > 0;
  const [from, to] = GLOWS[index % GLOWS.length];
  const levelAt = (clientY: number, rect: DOMRect) => Math.round(Math.min(100, Math.max(0, ((rect.bottom - clientY) / rect.height) * 100)));
  const commit = (b: number) => onChange(b <= 2 ? { on: false } : { on: true, brightness: b });
  const { base, badge } = splitRoomName(room.name);
  const tap = onTap ?? (() => onChange(room.on ? { on: false } : { on: true }));

  return (
    <div className={cn("flex shrink-0 flex-col items-center", tall ? "min-h-0 w-[96px] flex-1 gap-2.5" : "w-[72px] gap-1.5")}>
      <button
        type="button"
        role="slider"
        aria-label={`${room.name}: ${lit ? `aan, ${level}%` : "uit"}. ${onTap ? "Tik voor alle lampen" : "Tik om te schakelen"}, schuif om te dimmen.`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={level}
        disabled={busy}
        onPointerDown={(e) => {
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            /* sommige browsers weigeren capture; slepen werkt dan binnen de capsule */
          }
          drag.current = { y: e.clientY, moved: false, rect: e.currentTarget.getBoundingClientRect() };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          if (!d.moved && Math.abs(e.clientY - d.y) < 6) return;
          d.moved = true;
          setPreview(levelAt(e.clientY, d.rect));
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (!d) return;
          if (d.moved) {
            const b = levelAt(e.clientY, d.rect);
            setPreview(null);
            commit(b);
          } else tap();
        }}
        onClick={(e) => {
          // Toetsenbord (Enter/spatie): geen pointer-events, wel een klik met detail 0.
          if (e.detail === 0) tap();
        }}
        onPointerCancel={() => {
          drag.current = null;
          setPreview(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowUp" || e.key === "ArrowDown") {
            e.preventDefault();
            commit(Math.min(100, Math.max(0, level + (e.key === "ArrowUp" ? 10 : -10))));
          }
        }}
        className={cn(
          "relative flex flex-1 touch-pan-x select-none justify-center overflow-hidden rounded-full bg-fixed-white/[0.06] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white disabled:opacity-70",
          tall ? "min-h-[160px] w-[76px] pt-4" : "min-h-[72px] w-[52px] pt-2.5",
        )}
      >
        {lit ? (
          <span
            aria-hidden
            className={cn("absolute inset-x-0 bottom-0 rounded-full", preview == null && "transition-[height] duration-base ease-out-strong")}
            style={{ height: `${Math.max(level, 12)}%`, backgroundImage: `linear-gradient(0deg, ${from}, ${to})`, boxShadow: `0 0 22px 2px ${from}88` }}
          />
        ) : null}
        {/* Donkere tekst enkel als de vulling tot onder het getal komt (hoge kolom: pas bijna vol). */}
        <span className={cn("relative font-extrabold tabular-nums", tall ? "text-base" : "text-[13px]", !lit ? "text-fixed-white/50" : level >= (tall ? 93 : 80) ? "text-[#5a3300]" : "text-fixed-white")}>
          {lit ? (tall ? `${level}%` : level) : tall ? "Uit" : "–"}
        </span>
        {/* Verdieping als bolletje: «1»/«2» of een pijl omhoog (boven) / omlaag (beneden). */}
        {badge ? (
          <span
            aria-hidden
            className={cn(
              "absolute left-1/2 flex -translate-x-1/2 items-center justify-center rounded-full font-extrabold",
              tall ? "bottom-3 size-6 text-[12.5px]" : "bottom-2 size-5 text-[11px]",
              lit && level >= 20 ? "bg-fixed-white/70 text-[#5a3300]" : "bg-fixed-white/15 text-fixed-white/80",
            )}
          >
            {badge.kind === "number" ? (
              badge.value
            ) : (
              <svg viewBox="0 0 16 16" className={cn("size-3", badge.kind === "down" && "rotate-180")} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 13V3M3.5 7.5 8 3l4.5 4.5" />
              </svg>
            )}
          </span>
        ) : null}
      </button>
      <span
        lang="nl"
        className={cn(
          "w-full text-center font-bold",
          // Hoge kolom: mag op twee regels met afbreekstreepje («Gasten-kamer») i.p.v. «…».
          tall ? "line-clamp-2 min-h-[2.4em] text-[13px] leading-[1.2] [hyphens:auto]" : "truncate text-[11px]",
          lit ? "text-fixed-white" : "text-fixed-white/65",
        )}
      >
        {base}
      </span>
      {tall ? (
        <button
          type="button"
          role="switch"
          aria-checked={room.on}
          aria-label={`${room.name} ${room.on ? "uitzetten" : "aanzetten"}`}
          disabled={busy}
          onClick={() => onChange(room.on ? { on: false } : { on: true })}
          className={cn(
            "relative h-[26px] w-11 shrink-0 rounded-full transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white disabled:opacity-70",
            room.on ? "bg-[#ffb547]" : "bg-fixed-white/[0.16]",
          )}
        >
          <span className={cn("absolute top-[3px] size-5 rounded-full transition-[left] duration-fast ease-out-strong", room.on ? "left-[21px] bg-fixed-white" : "left-[3px] bg-[#cfd5ee]")} />
        </button>
      ) : null}
    </div>
  );
}

/** Schakelaar voor een hele verdieping in het lichtvenster. */
function FloorSwitch({ label, on, disabled, onToggle }: { label: string; on: boolean; disabled: boolean; onToggle: (on: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${label}: alle lampen ${on ? "uitzetten" : "aanzetten"}`}
      disabled={disabled}
      onClick={() => onToggle(!on)}
      className={cn(
        "relative h-[30px] w-[52px] shrink-0 rounded-full transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white disabled:opacity-60",
        on ? "bg-[#ffb547] shadow-[0_6px_16px_-8px_rgba(255,181,71,0.9)]" : "bg-fixed-white/[0.16]",
      )}
    >
      <span className={cn("absolute top-[3px] size-6 rounded-full transition-[left] duration-fast ease-out-strong", on ? "left-[25px] bg-fixed-white" : "left-[3px] bg-[#cfd5ee]")} />
    </button>
  );
}

/** Lichtvenster (canvas «licht-venster» A): alle kamers per verdieping als hoge kolommen. */
function HueLightsModal({
  rooms,
  busy,
  setRoom,
  floors,
  onClose,
}: {
  rooms: Room[];
  busy: Set<string>;
  setRoom: (rooms: Room[], patch: Patch) => Promise<void>;
  floors: RoomFloors;
  onClose: () => void;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const indexOf = new Map(rooms.map((r, i) => [r.id, i]));
  const [editing, setEditing] = React.useState(false);
  const { moveRoom } = floors;
  const ordered = floors.groups(rooms);
  const action = "h-10 rounded-pill bg-fixed-white/10 px-4 text-sm font-bold text-fixed-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white disabled:opacity-40 [@media(hover:hover)]:hover:bg-fixed-white/[0.16]";

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Alle lampen" onClick={onClose} className="fixed inset-0 z-[70] flex bg-[rgba(8,9,24,0.6)] p-7 backdrop-blur-sm motion-safe:animate-fade-up">
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex min-h-0 w-full flex-col rounded-[28px] bg-[linear-gradient(160deg,#232b48_0%,#1a2036_55%,#141a2c_100%)] px-7 py-6 text-fixed-white shadow-[inset_0_0_0_1px_rgba(160,180,255,0.22),0_40px_80px_-30px_rgba(0,0,0,0.8)]"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11.5px] font-extrabold tracking-[0.08em] text-fixed-white/60">LICHT</p>
            <h2 className="mt-0.5 text-[30px] font-extrabold tracking-[-0.02em]">Alle lampen</h2>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" aria-pressed={editing} className={cn(action, editing && "bg-fixed-white text-[#1a2036] [@media(hover:hover)]:hover:bg-fixed-white")} onClick={() => setEditing((e) => !e)}>
              {editing ? "Klaar" : "Indeling"}
            </button>
            <button type="button" className={action} disabled={rooms.every((r) => r.on)} onClick={() => void setRoom(rooms.filter((r) => !r.on), { on: true })}>
              Alles aan
            </button>
            <button type="button" className={action} disabled={!rooms.some((r) => r.on)} onClick={() => void setRoom(rooms.filter((r) => r.on), { on: false })}>
              Alles uit
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Sluiten"
              className="flex size-10 items-center justify-center rounded-full bg-fixed-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden className="size-4">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Vaste kolombreedte en vaste tussenruimtes; passen niet alle kamers, dan wordt het een baan die
            zijwaarts scrolt (veeg, trackpad of muiswiel) en die tot aan de rand van het venster doorloopt,
            met dezelfde marge aan begin en eind. */}
        <ScrollLane className="-mx-7 mt-6 flex min-h-0 flex-1 gap-6 px-7">
          {ordered.map((g) => (
            <section key={g.key} aria-label={g.label} className="flex min-h-0 shrink-0 flex-col gap-3.5 border-r border-fixed-white/[0.08] pr-6 last:border-r-0 last:pr-0">
              <div className="flex items-center justify-between gap-4">
                <h3 className="whitespace-nowrap text-[11px] font-extrabold uppercase tracking-[0.08em] text-[rgba(200,210,255,0.55)]">{g.label}</h3>
                {/* Overkoepelende schakelaar: hele verdieping aan/uit (aan zodra er één lamp brandt). */}
                <FloorSwitch label={g.label} on={g.rooms.some((r) => r.on)} disabled={g.rooms.every((r) => busy.has(r.id))} onToggle={(on) => void setRoom(g.rooms.filter((r) => r.on !== on), { on })} />
              </div>
              <div className="flex min-h-0 flex-1 gap-2">
                {g.rooms.map((room) => (
                  <div key={room.id} className="flex h-full min-h-0 flex-col items-center gap-2">
                    <LampColumn room={room} index={indexOf.get(room.id) ?? 0} busy={busy.has(room.id)} onChange={(patch) => void setRoom([room], patch)} tall />
                    {editing ? (
                      <select
                        aria-label={`Verdieping van ${room.name}`}
                        value={g.key}
                        onChange={(e) => moveRoom(room, e.target.value as FloorKey)}
                        className="h-8 w-[96px] rounded-lg bg-fixed-white/[0.12] px-1.5 text-xs font-bold text-fixed-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white [&>option]:text-[#1a2036]"
                      >
                        {FLOORS.map((f) => (
                          <option key={f.key} value={f.key} label={f.short}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </ScrollLane>
        <p className="mt-4 text-center text-[13px] text-fixed-white/45">
          {editing
            ? "Kies per kamer de verdieping · wordt bewaard op dit toestel"
            : "Schuif een kolom omhoog of omlaag om te dimmen · tik op een kolom of het schakelaartje om aan of uit te zetten"}
        </p>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Verdieping per kamer, gedeeld door het paneel en het lichtvenster zodat beide dezelfde volgorde tonen:
 * eigen keuze («Indeling», bewaard op dit toestel) of de standaard (zie hue-room-floors). Volgorde =
 * verdiepingen zoals in FLOORS, binnen een verdieping zoals Hue ze geeft.
 */
type RoomFloors = {
  moveRoom: (r: Room, floor: FloorKey) => void;
  groups: (rooms: Room[]) => { key: FloorKey; label: string; rooms: Room[] }[];
  sorted: (rooms: Room[]) => Room[];
};

function useRoomFloors(): RoomFloors {
  const [overrides, setOverrides] = React.useState<Record<string, FloorKey>>({});
  React.useEffect(() => setOverrides(readFloorOverrides()), []);
  return React.useMemo(() => {
    const floorOf = (r: Room): FloorKey => overrides[r.id] ?? defaultFloor(r.name);
    const groups = (rooms: Room[]) =>
      FLOORS.map((f) => ({ key: f.key, label: f.label, rooms: rooms.filter((r) => floorOf(r) === f.key) })).filter((g) => g.rooms.length > 0);
    return {
      moveRoom: (r, floor) => {
        const next = { ...overrides, [r.id]: floor };
        setOverrides(next);
        writeFloorOverrides(next);
      },
      groups,
      sorted: (rooms) => groups(rooms).flatMap((g) => g.rooms),
    };
  }, [overrides]);
}

/**
 * Horizontale baan die zijwaarts scrolt (vegen, trackpad of muiswiel). Is er meer dan zichtbaar, dan vervaagt
 * de rechterrand als hint. Gebruikt in het dashboardpaneel en in het lichtvenster.
 */
function ScrollLane({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [more, setMore] = React.useState(false);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setMore(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    const onWheel = (e: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    el.addEventListener("scroll", update, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      ro.disconnect();
      el.removeEventListener("scroll", update);
      el.removeEventListener("wheel", onWheel);
    };
  }, []);
  return (
    <div
      ref={ref}
      className={cn(
        "overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        more && "[mask-image:linear-gradient(90deg,#000_85%,transparent)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** `cinema`: met de twee cinemaknoppen links in het paneel (avond). */
export function DashboardHuePanel({ cinema = false }: { cinema?: boolean }) {
  const token = useGoogleAuthToken();
  const [state, setState] = React.useState<State>({ kind: "loading" });
  const [busy, setBusy] = React.useState<Set<string>>(() => new Set());
  const [open, setOpen] = React.useState(false);
  const floors = useRoomFloors();
  const closeModal = React.useCallback(() => setOpen(false), []);

  const load = React.useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/hue/rooms", { method: "POST", headers: googleAuthHeaders(token), cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { configured?: boolean; connected?: boolean; reconnect?: boolean; rooms?: Room[] };
      if (data.configured === false) setState({ kind: "not-configured" });
      else if (!data.connected) setState({ kind: "not-connected", reconnect: data.reconnect === true });
      else setState({ kind: "ready", rooms: data.rooms ?? [] });
    } catch {
      setState({ kind: "error" });
    }
  }, [token]);

  React.useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  const setRoom = React.useCallback(
    async (rooms: Room[], patch: Patch) => {
      const ids = new Set(rooms.map((r) => r.id));
      // Meteen tonen; bij een fout opnieuw ophalen.
      setState((s) =>
        s.kind === "ready"
          ? {
              ...s,
              rooms: s.rooms.map((r) =>
                // Aanzetten zonder helderheid: Hue zet de vorige stand terug; tot we die kennen tonen we «aan»
                // (geen 0 → «1%»).
                ids.has(r.id) ? { ...r, on: patch.on, brightness: patch.brightness ?? (patch.on && !r.brightness ? null : r.brightness) } : r,
              ),
            }
          : s,
      );
      setBusy((b) => new Set(Array.from(b).concat(Array.from(ids))));
      const results = await Promise.all(
        rooms.map((r) =>
          fetch("/api/hue/light", {
            method: "POST",
            headers: { ...googleAuthHeaders(token), "content-type": "application/json" },
            body: JSON.stringify({ id: r.id, ...patch }),
          })
            .then((res) => res.ok)
            .catch(() => false),
        ),
      );
      setBusy((b) => new Set(Array.from(b).filter((id) => !ids.has(id))));
      // Bij een fout meteen, anders even later: de echte helderheid zoals Hue ze nu kent.
      if (results.some((ok) => !ok)) void load();
      else window.setTimeout(() => void load(), 1500);
    },
    [token, load],
  );

  const anyOn = state.kind === "ready" && state.rooms.some((r) => r.on);

  // Venster buiten de <section>: anders zou een tik op de achtergrond van het venster (via React-bubbling)
  // het paneel-klik-event raken en het venster meteen weer openen.
  return (
    <>
    <section
      aria-label="Verlichting"
      // Tik op een lege plek in het paneel (niet op een kolom of knop) = lichtvenster openen.
      onClick={(e) => {
        if (state.kind !== "ready" || state.rooms.length === 0) return;
        if ((e.target as Element).closest("button, a, [role=slider]")) return;
        setOpen(true);
      }}
      className="relative flex cursor-pointer min-h-[96px] min-w-0 flex-1 flex-col overflow-hidden rounded-[24px] bg-[radial-gradient(120%_140%_at_0%_0%,#3a2f1c_0%,#1c1a2c_45%,#11101e_100%)] px-[18px] py-3.5 text-fixed-white shadow-[0_18px_40px_-26px_rgba(255,190,80,0.45)] [[data-theme=dark]_&]:bg-[linear-gradient(160deg,#2a3352_0%,#1e2640_55%,#171d32_100%)] [[data-theme=dark]_&]:shadow-[inset_0_0_0_1px_rgba(160,180,255,0.25)] [[data-sunset]_&]:bg-none [[data-sunset]_&]:bg-fixed-white/20 [[data-sunset]_&]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.42)] [[data-sunset]_&]:backdrop-blur-[14px]"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] font-extrabold tracking-[0.08em] text-fixed-white/75">LICHT</span>
        {state.kind === "ready" && anyOn ? (
          <button
            type="button"
            onClick={() => void setRoom(state.rooms.filter((r) => r.on), { on: false })}
            className="h-7 rounded-pill bg-fixed-white/10 px-3 text-xs font-bold text-fixed-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white [@media(hover:hover)]:hover:bg-fixed-white/[0.16]"
          >
            Alles uit
          </button>
        ) : null}
      </div>

      <div className="mt-2.5 flex min-h-0 flex-1 items-center">
        {/* Kolommen vullen de hoogte van het paneel; laden/meldingen staan verticaal gecentreerd. */}
        {state.kind === "loading" ? (
          <div className="flex h-full gap-3" aria-busy aria-label="Lampen laden">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="h-full min-h-[72px] w-[52px] animate-pulse rounded-full bg-fixed-white/10" />
            ))}
          </div>
        ) : state.kind === "not-configured" ? (
          <p className="text-sm text-fixed-white/70">Philips Hue is nog niet ingesteld op deze versie van de app.</p>
        ) : state.kind === "not-connected" ? (
          <Link href="/profiel/hue" className="inline-flex h-11 items-center rounded-pill bg-fixed-white px-4 text-sm font-bold text-[#1c1a2c] no-underline">
            {state.reconnect ? "Koppel Philips Hue opnieuw" : "Koppel Philips Hue"}
          </Link>
        ) : state.kind === "error" ? (
          <p className="text-sm text-fixed-white/70">
            Hue is even niet bereikbaar.{" "}
            <button type="button" onClick={() => void load()} className="font-bold underline">
              Opnieuw
            </button>
          </p>
        ) : state.rooms.length === 0 ? (
          <p className="text-sm text-fixed-white/70">Geen kamers gevonden in je Hue-app.</p>
        ) : (
          <div className="flex h-full min-h-0 w-full gap-2">
            {cinema ? <CinemaButtons token={token} onDone={() => void load()} /> : null}
            <ScrollLane className={cn("-mr-[18px] flex h-full min-h-0 min-w-0 flex-1 gap-0 pr-[18px]", !cinema && "-ml-[18px] pl-[18px]")}>
              {floors.sorted(state.rooms).map((room) => (
                <LampColumn key={room.id} room={room} index={state.rooms.indexOf(room)} busy={busy.has(room.id)} onChange={(patch) => void setRoom([room], patch)} />
              ))}
            </ScrollLane>
          </div>
        )}
      </div>
    </section>
    {open && state.kind === "ready" ? <HueLightsModal rooms={state.rooms} busy={busy} setRoom={setRoom} floors={floors} onClose={closeModal} /> : null}
    </>
  );
}

// ─── Cinema-knoppen (in het lichtpaneel) ────────────────────────────────────

/** Filmklapper. */
const ClapperIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[22px]">
    <path d="M4 10h16v8.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5z" />
    <path d="m4 10-.6-2.4a1.5 1.5 0 0 1 1.1-1.8l12.7-3.1a1.5 1.5 0 0 1 1.8 1.1l.6 2.4z" />
    <path d="m8.4 5.2 2.3 3.2M13.3 4l2.3 3.2" />
  </svg>
);

/** Maansikkel: «de rest van het huis gaat donker». */
const MoonIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-3">
    <path d="M20.2 14.6A8.5 8.5 0 0 1 9.4 3.8a.6.6 0 0 0-.8-.7 9.5 9.5 0 1 0 12.3 12.3.6.6 0 0 0-.7-.8z" />
  </svg>
);

type CinemaMode = "living" | "living-only";
/** Onderste knop: klapper met een maantje in een bolletje op de hoek (= woonkamer cinema, de rest donker). */
const CINEMA: { mode: CinemaMode; hint: string; othersOff: boolean }[] = [
  { mode: "living", hint: "Woonkamer op scène «Cinema»", othersOff: false },
  { mode: "living-only", hint: "Woonkamer op «Cinema», alle andere lampen uit", othersOff: true },
];

/**
 * Twee kleine ronde knoppen links in het lichtpaneel (avond): de bovenste zet de woonkamer op de Hue-scène
 * «Cinema», de onderste doet hetzelfde en zet alle andere kamers uit. Ze staan in de hoogte van de
 * kolommen: de bovenste lijnt uit met de bovenkant van een capsule, de onderste met de onderkant.
 * Een fout verschijnt kort bovenaan het paneel.
 */
function CinemaButtons({ token, onDone }: { token: string | null; onDone: () => void }) {
  const [busy, setBusy] = React.useState<CinemaMode | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const run = async (c: (typeof CINEMA)[number]) => {
    setBusy(c.mode);
    setError(null);
    try {
      const res = await fetch("/api/hue/scene", {
        method: "POST",
        headers: { ...googleAuthHeaders(token), "content-type": "application/json" },
        body: JSON.stringify({ room: "Woonkamer", scene: "Cinema", othersOff: c.othersOff }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; connected?: boolean };
      if (!res.ok || !data.ok) {
        setError(
          data.error === "scene-not-found"
            ? "Geen scène «Cinema» in de woonkamer"
            : data.error === "room-not-found"
              ? "Geen kamer «Woonkamer» in Hue"
              : data.connected === false
                ? "Hue is niet gekoppeld"
                : "Hue is even niet bereikbaar",
        );
        return;
      }
      onDone();
    } catch {
      setError("Hue is even niet bereikbaar");
    } finally {
      setBusy(null);
    }
  };

  React.useEffect(() => {
    if (!error) return;
    const id = window.setTimeout(() => setError(null), 4000);
    return () => window.clearTimeout(id);
  }, [error]);

  return (
    // pb: hoogte van de kamernaam + tussenruimte onder de capsules, zodat de onderste knop met de
    // onderkant van een capsule uitlijnt.
    // Even breed als de capsules (52px); hoogte tot 52px (rond), bij een lage capsule worden het pillen.
    <div className="flex shrink-0 flex-col items-center justify-between gap-1.5 pb-[22px]">
      {CINEMA.map((c) => {
        return (
          <button
            key={c.mode}
            type="button"
            aria-label={c.hint}
            title={c.hint}
            disabled={busy !== null}
            onClick={() => void run(c)}
            // Beide in hetzelfde glas als de capsules. Geen blijvende «gekozen»-stand: het is een actie, geen
            // schakelaar.
            className={cn(
              "relative flex max-h-[52px] min-h-0 w-[52px] flex-1 items-center justify-center gap-1 rounded-full text-fixed-white backdrop-blur-[10px] transition-[transform,box-shadow,background-color] duration-fast ease-out-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white motion-safe:active:scale-95 disabled:opacity-70",
              "shadow-[inset_0_0_0_1px_rgba(255,255,255,0.34)]",
              "bg-fixed-white/[0.18]",
            )}
          >
            {busy === c.mode ? (
              <span className="block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
            ) : (
              <>
                <ClapperIcon />
                {c.othersOff ? (
                  // Maantje in een eigen rond bolletje op de hoek (zoals de verdiepingsbolletjes op de capsules).
                  <span className="absolute -bottom-1 -right-1 flex size-[22px] items-center justify-center rounded-full bg-fixed-white text-[#2a2350] shadow-[0_2px_6px_-2px_rgba(16,17,48,0.45)]">
                    <MoonIcon />
                  </span>
                ) : null}
              </>
            )}
          </button>
        );
      })}
      {error ? (
        <p role="status" className="absolute left-[18px] right-[18px] top-3 z-[2] rounded-[12px] bg-[rgba(16,17,48,0.88)] px-3 py-2 text-xs font-semibold text-fixed-white">
          {error}
        </p>
      ) : null}
    </div>
  );
}
