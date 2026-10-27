"use client";

import * as React from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useSlidingIndicator } from "@/lib/use_sliding_indicator";
import { DashboardWoonkamerPanel } from "@/components/living_room_controls";
import { ACTIONS, PowerIcon as ProjectorPowerIcon, ScreenIcon, useScreenControls } from "@/components/dashboard_screen_panel";
import { AcColumn, DashboardClimate, type Airco } from "@/components/dashboard_climate";
import { useAirco } from "@/components/home_airco_section";
import { useFilmMode } from "@/components/use_film_mode";
import { sortAircos } from "@/lib/airco-order";
import { isScreenActionDisabled } from "@/lib/projection-screen";
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
  fluid = false,
  light = false,
}: {
  room: Room;
  index: number;
  busy: boolean;
  onChange: (patch: Patch) => void;
  /** Tik zonder te slepen (standaard: aan/uit). Op het dashboard opent dit het lichtvenster. */
  onTap?: () => void;
  /** Hoge kolom in het lichtvenster: groter, met aan/uit-schakelaar eronder. */
  tall?: boolean;
  /** Met `tall`: kolom rekt mee met de breedte (bedieningsvenster over de volle breedte). */
  fluid?: boolean;
  /** Op een lichte ondergrond (startpagina op de gsm): lichte capsule, donkere tekst. */
  light?: boolean;
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
    <div className={cn("flex flex-col items-center", fluid ? "min-h-0 min-w-[64px] flex-1 basis-0 gap-2" : "shrink-0", !fluid && (tall ? "min-h-0 w-[96px] flex-1 gap-2.5" : "w-[72px] gap-1.5"))}>
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
          "relative flex flex-1 touch-pan-x select-none justify-center overflow-hidden rounded-full focus-visible:outline-none focus-visible:ring-2 disabled:opacity-70",
          light
            ? "bg-white shadow-[0_8px_18px_-12px_rgba(16,17,48,0.35),inset_0_0_0_1px_rgba(16,17,48,0.04)] focus-visible:ring-[#ffb547] [[data-theme=dark]_&]:bg-fixed-white/[0.06] [[data-theme=dark]_&]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
            : "bg-fixed-white/[0.06] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] focus-visible:ring-fixed-white",
          fluid ? "min-h-[140px] w-full max-w-[84px] pt-4" : tall ? "min-h-[160px] w-[76px] pt-4" : "min-h-[72px] w-[52px] pt-2.5",
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
        <span className={cn("relative font-extrabold tabular-nums", tall ? "text-base" : "text-[13px]", lit && level >= (tall ? 93 : 80) ? "text-[#5a3300]" : light ? (lit ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]") : lit ? "text-fixed-white" : "text-fixed-white/50")}>
          {lit ? (tall ? `${level}%` : level) : tall ? "Uit" : "–"}
        </span>
        {/* Verdieping als bolletje: «1»/«2» of een pijl omhoog (boven) / omlaag (beneden). */}
        {badge ? (
          <span
            aria-hidden
            className={cn(
              "absolute left-1/2 flex -translate-x-1/2 items-center justify-center rounded-full font-extrabold",
              tall ? "bottom-3 size-6 text-[12.5px]" : "bottom-2 size-5 text-[11px]",
              lit && level >= 20
                ? "bg-fixed-white/70 text-[#5a3300]"
                : light
                  ? "bg-[rgba(16,17,48,0.08)] text-[var(--text-secondary)] [[data-theme=dark]_&]:bg-fixed-white/15"
                  : "bg-fixed-white/15 text-fixed-white/80",
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
          light ? (lit ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]") : lit ? "text-fixed-white" : "text-fixed-white/65",
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
            room.on ? "bg-[#ffb547]" : light ? "bg-[rgba(16,17,48,0.12)] [[data-theme=dark]_&]:bg-fixed-white/[0.16]" : "bg-fixed-white/[0.16]",
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

/** Kopje van een kaart of groep in het bedieningsvenster. */
const capLabel = "text-[10.5px] font-extrabold uppercase tracking-[0.08em] text-[rgba(200,210,255,0.6)]";
const card = "flex min-w-0 flex-col gap-2 rounded-[22px] bg-fixed-white/[0.06] px-3.5 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.1)]";
const tileBtn = "flex h-[58px] min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-1 rounded-[15px] text-[11.5px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white disabled:cursor-not-allowed disabled:opacity-40";

/**
 * Bedieningsvenster (canvas «CM2 · B2»): licht, klimaat en scherm in één volledig venster. Bovenaan drie kaarten
 * (Filmavond, Scherm, Projector) die boven hun groep eronder staan (Gelijkvloers, Verdieping, Klimaat); de kolommen
 * rekken mee over de volle breedte. Enkel licht en klimaat scrollen zijwaarts als er meer kamers zijn dan plaats.
 */
function ControlModal({
  token,
  state,
  busy,
  setRoom,
  floors,
  airco,
  onClose,
}: {
  token: string | null;
  state: State;
  busy: Set<string>;
  setRoom: (rooms: Room[], patch: Patch) => Promise<void>;
  floors: RoomFloors;
  airco: Airco;
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

  const screen = useScreenControls(token, { projectorStatus: true });
  const film = useFilmMode();
  const rooms = state.kind === "ready" ? state.rooms : [];
  const groups = floors.groups(rooms);
  const indexOf = new Map(rooms.map((r, i) => [r.id, i]));
  const devices = React.useMemo(() => sortAircos(airco.devices, new Date()), [airco.devices]);
  // De kaarten staan boven hun groep: dezelfde verhouding (aantal kolommen) en dezelfde tussenruimte als de baan.
  const aligned = groups.length === 2 && devices.length > 0;
  const weights = aligned ? [groups[0].rooms.length, groups[1].rooms.length, devices.length] : [1, 1, 1];
  const action = "h-10 rounded-pill bg-fixed-white/10 px-4 text-sm font-bold text-fixed-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white disabled:opacity-40 [@media(hover:hover)]:hover:bg-fixed-white/[0.16]";
  const durationText = screen.screen?.durationSeconds != null ? `${screen.screen.durationSeconds.toLocaleString("nl-BE", { maximumFractionDigits: 2 })} s` : null;
  const projectorText = screen.projectorOn == null ? "status onbekend" : screen.projectorOn ? "staat aan" : "staat uit";

  const lightsNote =
    state.kind === "loading" ? "Lampen laden…"
      : state.kind === "not-configured" ? "Philips Hue is nog niet ingesteld op deze versie van de app."
        : state.kind === "not-connected" ? "Philips Hue is niet gekoppeld. Koppel via Profiel → Philips Hue."
          : state.kind === "error" ? "Hue is even niet bereikbaar op dit adres."
            : rooms.length === 0 ? "Geen kamers gevonden in je Hue-app." : null;
  const aircoNote =
    airco.state.kind === "loading" ? "Airco's laden…"
      : airco.state.kind === "not-configured" ? "Panasonic is nog niet ingesteld."
        : airco.state.kind === "not-connected" ? "Airco's niet gekoppeld."
          : airco.state.kind === "error" ? "De airco's zijn even niet bereikbaar."
            : devices.length === 0 ? "Geen airco's gevonden." : null;
  const note = (text: string) => <p className="flex flex-1 items-center justify-center rounded-[22px] bg-fixed-white/[0.04] px-4 text-center text-sm text-fixed-white/60">{text}</p>;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Licht, klimaat en scherm" onClick={onClose} className="fixed inset-0 z-[70] flex bg-[rgba(8,9,24,0.6)] p-7 backdrop-blur-sm motion-safe:animate-fade-up">
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex min-h-0 w-full flex-col gap-[18px] rounded-[28px] bg-[linear-gradient(160deg,#232b48_0%,#1a2036_55%,#141a2c_100%)] px-7 py-6 text-fixed-white shadow-[inset_0_0_0_1px_rgba(160,180,255,0.22),0_40px_80px_-30px_rgba(0,0,0,0.8)]"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11.5px] font-extrabold tracking-[0.08em] text-fixed-white/60">BEDIENING</p>
            <h2 className="mt-0.5 text-[30px] font-extrabold tracking-[-0.02em]">Licht, klimaat &amp; scherm</h2>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className={action} disabled={!rooms.some((r) => r.on)} onClick={() => void setRoom(rooms.filter((r) => r.on), { on: false })}>
              Alle lampen uit
            </button>
            <button type="button" onClick={onClose} aria-label="Sluiten" className="flex size-10 items-center justify-center rounded-full bg-fixed-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden className="size-4">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        </div>

        {/* Gap 45 px = 22 + 1 (scheiding) + 22 in de baan eronder: zo staat elke kaart boven haar groep. */}
        <div className="flex gap-[45px]">
          <section aria-label="Filmavond" className="flex min-w-0 items-center justify-between gap-4 rounded-[22px] bg-[linear-gradient(120deg,rgba(255,190,140,0.16),rgba(255,120,170,0.1))] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(255,200,170,0.25)]" style={{ flex: `${weights[0]} 1 0` }}>
            <div className="min-w-0">
              <p className={capLabel}>Filmavond</p>
              <p className="mt-1 text-[17px] font-extrabold leading-tight">{film.on ? "De film loopt" : "Klaar voor een film?"}</p>
              <p role="status" aria-live="polite" className="mt-0.5 line-clamp-2 text-[11px] leading-[14px] text-fixed-white/70">
                {film.message ?? (film.on ? "Stoppen: projector uit · scherm omlaag · woonkamer op 20 %" : "Projector aan · scherm naar je hoogte · woonkamer op Cinema")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void film.toggle()}
              disabled={film.disabled}
              aria-pressed={film.on}
              className={cn(
                "flex h-[52px] shrink-0 items-center gap-2 rounded-pill px-5 text-[15px] font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white disabled:cursor-not-allowed disabled:opacity-60",
                film.on ? "bg-fixed-white text-[#2a2148]" : "bg-[linear-gradient(135deg,rgba(255,214,150,0.62),rgba(255,140,170,0.46))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]",
              )}
            >
              {film.on ? (
                <svg viewBox="0 0 24 24" aria-hidden className="size-4"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" aria-hidden className="size-4"><path d="M8 5.5v13l11-6.5z" fill="currentColor" /></svg>
              )}
              {film.busy ? "Bezig…" : film.on ? "Film stoppen" : "Film starten"}
            </button>
          </section>

          <section aria-label="Projectiescherm" className={card} style={{ flex: `${weights[1]} 1 0` }}>
            <div className="flex items-center justify-between gap-2">
              <span className={capLabel}>Scherm</span>
              <span role="status" aria-live="polite" title={screen.message} className="min-w-0 truncate text-[11px] font-bold text-fixed-white/70">
                {screen.busy || !screen.ready ? screen.message : durationText ?? screen.message}
              </span>
            </div>
            <div className="flex gap-2">
              {ACTIONS.map(({ action: a, label, icon }) => (
                <button
                  key={a}
                  type="button"
                  aria-label={a === "preset" ? "Omhoog naar opgeslagen hoogte" : `Projectiescherm ${label.toLowerCase()}`}
                  disabled={isScreenActionDisabled(a, screen.screen, screen.busy)}
                  onClick={() => void screen.send(a)}
                  className={cn(tileBtn, a === "stop" ? "bg-[#f4d8cb] text-[#572e38] hover:bg-[#ffe7dc]" : "bg-fixed-white/10 text-fixed-white hover:bg-fixed-white/20")}
                >
                  <ScreenIcon kind={icon} />
                  <span>{a === "preset" ? "Hoogte" : label}</span>
                </button>
              ))}
            </div>
            {!screen.ready && token ? (
              <button type="button" onClick={screen.recheck} className="self-start text-[11px] font-bold underline underline-offset-2">Opnieuw controleren</button>
            ) : null}
          </section>

          <section aria-label="Projector" className={card} style={{ flex: `${weights[2]} 1 0` }}>
            <div className="flex items-center justify-between gap-2">
              <span className={capLabel}>Projector</span>
              <span role="status" aria-live="polite" title={screen.projectorMessage ?? projectorText} className="flex min-w-0 items-center gap-1.5 truncate text-[11px] font-bold text-fixed-white/75">
                {screen.projectorMessage ? null : <i aria-hidden className={cn("size-[7px] shrink-0 rounded-full", screen.projectorOn ? "bg-[#8ff0a8] shadow-[0_0_6px_#8ff0a8]" : "bg-fixed-white/40")} />}
                <span className="truncate">{screen.projectorMessage ?? projectorText}</span>
              </span>
            </div>
            <div className="flex gap-2">
              {([["on", "Projector aan"], ["off", "Projector uit"]] as const).map(([a, label]) => (
                <button
                  key={a}
                  type="button"
                  aria-label={`${label}, zonder het scherm te bewegen`}
                  disabled={!token || screen.projectorBusy}
                  onClick={() => void screen.sendProjector(a)}
                  className={cn(tileBtn, "flex-row gap-2 bg-fixed-white/10 text-[12.5px] text-fixed-white hover:bg-fixed-white/20")}
                >
                  <ProjectorPowerIcon on={a === "on"} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>

        <ScrollLane className="flex min-h-0 flex-1 gap-[22px]">
          {lightsNote ? (
            <div className="flex min-w-0 flex-col gap-2.5" style={{ flex: `${aligned ? weights[0] + weights[1] : 2} 1 0` }}>
              <h3 className={capLabel}>Licht</h3>
              {note(lightsNote)}
            </div>
          ) : (
            groups.map((g, i) => (
              <React.Fragment key={g.key}>
                {i > 0 ? <i aria-hidden className="w-px shrink-0 bg-fixed-white/[0.08]" /> : null}
                <section aria-label={g.label} className="flex flex-col gap-2.5" style={{ flex: `${g.rooms.length} 1 0` }}>
                  <div className="flex min-h-[30px] items-center justify-between gap-3">
                    <h3 className={capLabel}>{g.label}</h3>
                    <FloorSwitch label={g.label} on={g.rooms.some((r) => r.on)} disabled={g.rooms.every((r) => busy.has(r.id))} onToggle={(on) => void setRoom(g.rooms.filter((r) => r.on !== on), { on })} />
                  </div>
                  <div className="flex min-h-0 flex-1 gap-2.5">
                    {g.rooms.map((room) => (
                      <LampColumn key={room.id} room={room} index={indexOf.get(room.id) ?? 0} busy={busy.has(room.id)} onChange={(patch) => void setRoom([room], patch)} tall fluid />
                    ))}
                  </div>
                </section>
              </React.Fragment>
            ))
          )}
          <i aria-hidden className="w-px shrink-0 bg-fixed-white/[0.18]" />
          <section aria-label="Klimaat" className="flex flex-col gap-2.5" style={{ flex: `${aircoNote ? weights[2] : devices.length} 1 0` }}>
            <div className="flex min-h-[30px] items-center">
              <h3 className={capLabel}>Klimaat</h3>
            </div>
            {aircoNote ? (
              note(aircoNote)
            ) : (
              <div className="flex min-h-0 flex-1 gap-2.5">
                {devices.map((d) => (
                  <AcColumn key={d.id} device={d} change={airco.change} tall fluid />
                ))}
              </div>
            )}
          </section>
        </ScrollLane>
        {airco.error ? <p className="-mt-2 text-center text-xs font-bold text-fixed-white/70">{airco.error}</p> : null}
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

type PanelView = "licht" | "klimaat" | "woonkamer";
const PANEL_VIEWS = ["licht", "klimaat", "woonkamer"] as const;
const PANEL_VIEW_KEY = "dashboard-panel-view";

/**
 * Schakelaar «Licht | Klimaat | Woonkamer» met een schuivende witte pil. De pil beweegt meteen; de wissel zelf volgt twee
 * frames later, zodat de schuifanimatie al loopt voordat het paneel of venster opnieuw tekent.
 */
function ViewToggle({ value, onChange, large = false }: { value: PanelView; onChange: (v: PanelView) => void; large?: boolean }) {
  const [shown, setShown] = React.useState(value);
  React.useEffect(() => setShown(value), [value]);
  const { containerRef, indicatorStyle } = useSlidingIndicator<HTMLDivElement>(PANEL_VIEWS.indexOf(shown));
  const choose = (v: PanelView) => {
    if (v === shown) return;
    setShown(v);
    // In het venster wisselt de hele inhoud (en deze schakelaar): eerst de pil laten uitschuiven.
    if (large) window.setTimeout(() => onChange(v), 340);
    else requestAnimationFrame(() => requestAnimationFrame(() => onChange(v)));
  };
  return (
    <div ref={containerRef} role="radiogroup" aria-label="Licht, klimaat of woonkamer" className="relative isolate flex rounded-pill bg-fixed-white/[0.14] p-[3px]">
      <span aria-hidden className="pointer-events-none absolute left-0 -z-10 rounded-pill bg-fixed-white shadow-[0_1px_3px_rgba(16,17,48,0.18)] motion-reduce:!transition-none" style={indicatorStyle} />
      {PANEL_VIEWS.map((v) => (
        <button
          key={v}
          type="button"
          role="radio"
          data-segment
          aria-checked={shown === v}
          onClick={() => choose(v)}
          className={cn(
            "rounded-pill font-extrabold transition-colors duration-[380ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white",
            large ? "h-9 px-4 text-sm" : "h-7 px-3 text-xs",
            shown === v ? "text-[#3a2f5a]" : "text-fixed-white/85",
          )}
        >
          {v === "licht" ? "Licht" : v === "klimaat" ? "Klimaat" : "Woonkamer"}
        </button>
      ))}
    </div>
  );
}

export type HueEmptyKind = "not-configured" | "not-connected" | "no-rooms";

/**
 * `cinema`: met de twee cinemaknoppen links in het paneel. `variant="mobile"`: sectie voor de startpagina op
 * de gsm (licht, met eigen titel en hoofdschakelaar, zie MobileHueSection). `renderEmpty`: eigen lege staat (niet ingesteld, niet gekoppeld, geen
 * kamers) i.p.v. de korte melding in het paneel.
 */
export function DashboardHuePanel({
  cinema = false,
  variant = "dashboard",
  renderEmpty,
}: {
  cinema?: boolean;
  variant?: "dashboard" | "mobile";
  renderEmpty?: (kind: HueEmptyKind, reconnect: boolean) => React.ReactNode;
}) {
  const token = useGoogleAuthToken();
  const [state, setState] = React.useState<State>({ kind: "loading" });
  const [busy, setBusy] = React.useState<Set<string>>(() => new Set());
  const [open, setOpen] = React.useState(false);
  const floors = useRoomFloors();
  const closeModal = React.useCallback(() => setOpen(false), []);
  // Eén keer de airco's ophalen voor paneel én bedieningsvenster (Comfort Cloud niet dubbel bevragen).
  const airco = useAirco();
  // Dashboard: schakelaar «Licht | Klimaat | Scherm» rechtsboven (vervangt «Alles uit»); de keuze blijft op dit toestel.
  const [view, setView] = React.useState<PanelView>("licht");
  React.useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PANEL_VIEW_KEY);
      // «scherm» en «rolluiken» waren aparte tabs; ze zitten nu samen in «woonkamer».
      if (saved === "scherm" || saved === "rolluiken") setView("woonkamer");
      else if ((PANEL_VIEWS as readonly string[]).includes(saved ?? "")) setView(saved as PanelView);
    } catch { /* geen opslag */ }
  }, []);
  const changeView = (v: PanelView) => {
    setView(v);
    try {
      window.localStorage.setItem(PANEL_VIEW_KEY, v);
    } catch {
      /* geen opslag */
    }
  };
  const viewToggle = (current: PanelView) => <ViewToggle value={current} onChange={changeView} />;

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


  if (renderEmpty) {
    if (state.kind === "not-configured") return <>{renderEmpty("not-configured", false)}</>;
    if (state.kind === "not-connected") return <>{renderEmpty("not-connected", state.reconnect)}</>;
    if (state.kind === "ready" && state.rooms.length === 0) return <>{renderEmpty("no-rooms", false)}</>;
  }

  if (variant === "mobile") return <MobileHueSection state={state} busy={busy} setRoom={setRoom} floors={floors} load={load} renderEmpty={renderEmpty} token={token} />;

  // Venster buiten de <section>: anders zou een tik op de achtergrond van het venster (via React-bubbling)
  // het paneel-klik-event raken en het venster meteen weer openen.
  return (
    <>
    <section
      aria-label="Licht, klimaat en projectiescherm"
      // Tik op een lege plek in het paneel (niet op een kolom of knop) = bedieningsvenster (licht, klimaat en scherm).
      onClick={(e) => {
        if ((e.target as Element).closest("button, a, [role=slider]")) return;
        setOpen(true);
      }}
      className={cn("relative flex min-h-[96px] min-w-0 flex-1 cursor-pointer flex-col overflow-hidden rounded-[24px] bg-[radial-gradient(120%_140%_at_0%_0%,#3a2f1c_0%,#1c1a2c_45%,#11101e_100%)] px-[18px] py-3.5 text-fixed-white shadow-[0_18px_40px_-26px_rgba(255,190,80,0.45)] [[data-theme=dark]_&]:bg-[linear-gradient(160deg,#2a3352_0%,#1e2640_55%,#171d32_100%)] [[data-theme=dark]_&]:shadow-[inset_0_0_0_1px_rgba(160,180,255,0.25)] [[data-sunset]_&]:bg-none [[data-sunset]_&]:bg-fixed-white/20 [[data-sunset]_&]:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.42)] [[data-sunset]_&]:backdrop-blur-[14px]")}
    >
      <div className="flex min-h-7 items-center justify-between">
        <span className="text-[11.5px] font-extrabold tracking-[0.08em] text-fixed-white/75">{view === "klimaat" ? "KLIMAAT" : view === "woonkamer" ? "WOONKAMER" : "LICHT"}</span>
        {viewToggle(view)}
      </div>

      {/* Licht en klimaat blijven geladen; schermstatus wordt pas opgevraagd bij de derde tab. */}
      {/* Eén kolom met de breedte van het paneel: anders zou de verborgen licht-/klimaatweergave de kolom (en het scherm) breder maken. */}
      <div className="relative mt-2.5 grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)]">
      {view === "woonkamer" && <div className="col-start-1 row-start-1 flex min-h-0"><DashboardWoonkamerPanel token={token} /></div>}
      <div
        aria-hidden={view !== "klimaat"}
        className={cn(
          "col-start-1 row-start-1 flex min-h-0 items-center transition-opacity duration-300 ease-out motion-reduce:transition-none",
          view === "klimaat" ? "opacity-100" : "pointer-events-none invisible opacity-0",
        )}
      >
        <DashboardClimate airco={airco} />
      </div>
      <div
        aria-hidden={view !== "licht"}
        className={cn(
          "col-start-1 row-start-1 flex min-h-0 items-center transition-opacity duration-300 ease-out motion-reduce:transition-none",
          view === "licht" ? "opacity-100" : "pointer-events-none invisible opacity-0",
        )}
      >
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
      </div>
    </section>
    {open ? <ControlModal token={token} state={state} busy={busy} setRoom={setRoom} floors={floors} airco={airco} onClose={closeModal} /> : null}
    </>
  );
}

// ─── Startpagina op de gsm ──────────────────────────────────────────────────

/** Schakelaar op lichte ondergrond voor een groep kamers (alles of één verdieping): aan zodra er één lamp brandt. */
function LightSwitch({ label, rooms, busy, setRoom }: { label: string; rooms: Room[]; busy: Set<string>; setRoom: (rooms: Room[], patch: Patch) => Promise<void> }) {
  const on = rooms.some((r) => r.on);
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${label}: ${on ? "uitzetten" : "aanzetten"}`}
      disabled={rooms.every((r) => busy.has(r.id))}
      onClick={() => void setRoom(rooms.filter((r) => r.on === on), { on: !on })}
      className={cn(
        "relative h-[30px] w-[52px] shrink-0 rounded-full transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb547] focus-visible:ring-offset-2 disabled:opacity-60",
        on ? "bg-[#ffb547] shadow-[0_6px_16px_-8px_rgba(255,181,71,0.9)]" : "bg-[rgba(16,17,48,0.14)] [[data-theme=dark]_&]:bg-fixed-white/[0.16]",
      )}
    >
      <span className={cn("absolute top-[3px] size-6 rounded-full bg-fixed-white shadow-[0_1px_3px_rgba(16,17,48,0.25)] transition-[left] duration-fast ease-out-strong", on ? "left-[25px]" : "left-[3px]")} />
    </button>
  );
}

/**
 * «Licht» op de startpagina (gsm), op de lichte pagina-achtergrond: titel met één schakelaar voor alle lampen
 * (aan zodra er één brandt), daaronder rechtstreeks op de pagina de (witte) kolommen per verdieping, elk groepje met zijn
 * verdieping erboven (zoals in het lichtvenster). Geen cinemaknoppen en geen «Alles uit»: dat doet de schakelaar.
 */
function MobileHueSection({
  state,
  busy,
  setRoom,
  floors,
  load,
  renderEmpty,
  token,
}: {
  token: string | null;
  state: State;
  busy: Set<string>;
  setRoom: (rooms: Room[], patch: Patch) => Promise<void>;
  floors: RoomFloors;
  load: () => Promise<void>;
  renderEmpty?: (kind: HueEmptyKind, reconnect: boolean) => React.ReactNode;
}) {
  const rooms = state.kind === "ready" ? state.rooms : [];
  const note = "text-sm text-[var(--text-secondary)]";

  const body =
    state.kind === "loading" ? (
      <div className="flex h-[248px] gap-2" aria-busy aria-label="Lampen laden">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-[200px] w-[72px] animate-pulse rounded-full bg-white [[data-theme=dark]_&]:bg-fixed-white/10" />
        ))}
      </div>
    ) : state.kind === "error" ? (
      <p className={note}>
        Hue is even niet bereikbaar.{" "}
        <button type="button" onClick={() => void load()} className="font-bold text-[var(--text-primary)] underline">
          Opnieuw
        </button>
      </p>
    ) : state.kind === "not-configured" ? (
      renderEmpty?.("not-configured", false) ?? <p className={note}>Philips Hue is nog niet ingesteld op deze versie van de app.</p>
    ) : state.kind === "not-connected" ? (
      renderEmpty?.("not-connected", state.reconnect) ?? (
        <Link href="/profiel/hue" className="font-bold text-[var(--text-primary)] underline">
          Koppel Philips Hue
        </Link>
      )
    ) : rooms.length === 0 ? (
      renderEmpty?.("no-rooms", false) ?? <p className={note}>Geen kamers gevonden in je Hue-app.</p>
    ) : (
      <>
      {/* Desktop: één paneel per verdieping met een lichte rand en een eigen schakelaar; samen de volle breedte
          (breedte per paneel naar het aantal kamers, kolommen gelijk verdeeld). */}
      <div className="hidden flex-wrap gap-4 lg:flex">
        {floors.groups(rooms).map((g) => (
          <section
            key={g.key}
            aria-label={g.label}
            style={{ flexGrow: g.rooms.length, minWidth: g.rooms.length * 72 + 34 }}
            className="flex basis-0 flex-col gap-3 rounded-[24px] border border-[var(--border-subtle)] px-4 pb-4 pt-3.5"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="whitespace-nowrap text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--text-secondary)]">{g.label}</h3>
              <LightSwitch label={g.label} rooms={g.rooms} busy={busy} setRoom={setRoom} />
            </div>
            <div className="flex h-[224px] justify-around">
              {g.rooms.map((room) => (
                <LampColumn key={room.id} room={room} index={rooms.indexOf(room)} busy={busy.has(room.id)} onChange={(patch) => void setRoom([room], patch)} light />
              ))}
            </div>
          </section>
        ))}
        <CinemaPanels token={token} onDone={() => void load()} />
      </div>
      <ScrollLane className="-mx-4 -my-3 flex gap-4 px-4 py-3 lg:hidden">
        {floors.groups(rooms).map((g) => (
          <section key={g.key} aria-label={g.label} className="flex shrink-0 flex-col gap-2.5 border-r border-[rgba(16,17,48,0.08)] pr-4 last:border-r-0 last:pr-0 [[data-theme=dark]_&]:border-fixed-white/10">
            {/* Verdieping boven het groepje, zoals in het lichtvenster. */}
            <h3 className="whitespace-nowrap px-2.5 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--text-secondary)]">{g.label}</h3>
            <div className="flex h-[224px]">
              {g.rooms.map((room) => (
                <LampColumn key={room.id} room={room} index={rooms.indexOf(room)} busy={busy.has(room.id)} onChange={(patch) => void setRoom([room], patch)} light />
              ))}
            </div>
          </section>
        ))}
        {/* Helemaal achteraan: de twee cinemastanden als fototegels. */}
        <section aria-label="Cinema" className="flex shrink-0 flex-col gap-2.5 pl-2.5">
          <h3 className="whitespace-nowrap px-1 text-[11px] font-extrabold uppercase tracking-[0.08em] text-[var(--text-secondary)]">Cinema</h3>
          <CinemaPhotoTiles token={token} onDone={() => void load()} />
          <CinemaModeControls />
        </section>
      </ScrollLane>
      </>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h2 className="min-w-0 text-[22px] font-bold leading-7 tracking-[-0.01em] text-[var(--text-primary)]">Philips Hue lampen bedienen</h2>
        {state.kind === "ready" && rooms.length > 0 ? (
          <LightSwitch label="Alle lampen" rooms={rooms} busy={busy} setRoom={setRoom} />
        ) : null}
      </div>
      {body}
    </div>
  );
}

// ─── Cinema-knoppen (in het lichtpaneel) ────────────────────────────────────

/** Filmklapper. */
const ClapperIcon = ({ className = "size-[22px]" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
    <path d="M4 10h16v8.5A1.5 1.5 0 0 1 18.5 20h-13A1.5 1.5 0 0 1 4 18.5z" />
    <path d="m4 10-.6-2.4a1.5 1.5 0 0 1 1.1-1.8l12.7-3.1a1.5 1.5 0 0 1 1.8 1.1l.6 2.4z" />
    <path d="m8.4 5.2 2.3 3.2M13.3 4l2.3 3.2" />
  </svg>
);

/** Aan/uit-symbool (lijntjes): «de rest van het huis gaat uit». */
const PowerIcon = ({ className = "size-3" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden className={className}>
    <path d="M12 3.5v8M6.6 6.9a7.5 7.5 0 1 0 10.8 0" />
  </svg>
);

type CinemaMode = "living" | "living-only";
/** Onderste knop: klapper met een aan/uit-symbool in een bolletje op de hoek (= woonkamer cinema, de rest uit). */
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
/** Zet een cinemastand via /api/hue/scene; een fout verdwijnt na 4 s. */
function useCinemaScene(token: string | null, onDone: () => void) {
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

  return { busy, error, run };
}

function CinemaButtons({ token, onDone }: { token: string | null; onDone: () => void }) {
  const { busy, error, run } = useCinemaScene(token, onDone);

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
                  // Aan/uit-symbool in een omlijnd bolletje op de hoek.
                  <span className="absolute -bottom-1 -right-1 flex size-[22px] items-center justify-center rounded-full bg-[rgba(16,17,48,0.72)] text-fixed-white shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.9),0_2px_6px_-2px_rgba(16,17,48,0.45)]">
                    <PowerIcon />
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

/** Foto's per cinemastand (gegenereerd met scripts/generate-cinema-photos.mjs); zonder foto een verloop. */
const CINEMA_TILES: Record<CinemaMode, { title: string; sub: string; photo: string; fallback: string }> = {
  living: {
    title: "Cinema",
    sub: "Woonkamer gedimd",
    photo: "/images/hue/cinema_480.webp",
    fallback: "linear-gradient(160deg,#5b3a1f 0%,#2a1d2e 55%,#120f1c 100%)",
  },
  "living-only": {
    title: "Cinema",
    sub: "Alle andere lampen uit",
    photo: "/images/hue/cinema_dark_480.webp",
    fallback: "linear-gradient(160deg,#1f2440 0%,#121428 55%,#07080f 100%)",
  },
};

/**
 * Startpagina (gsm), achteraan de lichtrij: twee fototegels voor de cinemastanden, even hoog als de
 * lampkolommen. Tik = de stand zetten (zelfde als de cinemaknoppen op het dashboard).
 */
function CinemaPhotoTiles({ token, onDone }: { token: string | null; onDone: () => void }) {
  const { busy, error, run } = useCinemaScene(token, onDone);
  const [missing, setMissing] = React.useState<Set<CinemaMode>>(() => new Set());
  return (
    <div className="relative flex h-[224px] gap-2.5">
      {CINEMA.map((c) => {
        const t = CINEMA_TILES[c.mode];
        return (
          <button
            key={c.mode}
            type="button"
            aria-label={c.hint}
            disabled={busy !== null}
            onClick={() => void run(c)}
            className="relative flex w-[148px] shrink-0 flex-col justify-end overflow-hidden rounded-[24px] p-3.5 text-left text-fixed-white shadow-[0_14px_28px_-16px_rgba(16,17,48,0.6)] transition-transform duration-fast ease-out-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb547] focus-visible:ring-offset-2 motion-safe:active:scale-[0.97] disabled:opacity-80"
            style={{ backgroundImage: t.fallback }}
          >
            {missing.has(c.mode) ? null : (
              // eslint-disable-next-line @next/next/no-img-element -- lokale webp
              <img
                src={t.photo}
                alt=""
                className="absolute inset-0 size-full object-cover"
                onError={() => setMissing((m) => new Set(m).add(c.mode))}
              />
            )}
            <span aria-hidden className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,9,24,0)_35%,rgba(8,9,24,0.78)_100%)]" />
            <span className="absolute left-3 top-3 flex size-9 items-center justify-center rounded-full bg-fixed-white/20 backdrop-blur-[10px] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]">
              {busy === c.mode ? <span className="block size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : <ClapperIcon />}
              {c.othersOff ? (
                <span className="absolute -bottom-1 -right-1 flex size-[18px] items-center justify-center rounded-full bg-[rgba(16,17,48,0.72)] text-fixed-white shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.9)]">
                  <PowerIcon className="size-[10px]" />
                </span>
              ) : null}
            </span>
            <span className="relative text-[17px] font-extrabold leading-5">{t.title}</span>
            <span className="relative mt-0.5 text-[12.5px] font-semibold leading-4 text-fixed-white/80">{t.sub}</span>
          </button>
        );
      })}
      {error ? (
        <p role="status" className="absolute inset-x-2 top-2 z-[2] rounded-[12px] bg-[rgba(16,17,48,0.88)] px-3 py-2 text-xs font-semibold text-fixed-white">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/**
 * Desktop, rechts van de verdiepingen: de twee cinemastanden als twee gestapelde panelen met een lichte rand,
 * een ingetogen icoon boven een duidelijk label. Samen even hoog als de verdiepingspanelen.
 */
function CinemaPanels({ token, onDone }: { token: string | null; onDone: () => void }) {
  const { busy, error, run } = useCinemaScene(token, onDone);
  return (
    <div className="relative flex w-[152px] shrink-0 flex-col gap-4">
      {CINEMA.map((c) => {
        const t = CINEMA_TILES[c.mode];
        return (
          <button
            key={c.mode}
            type="button"
            aria-label={c.hint}
            disabled={busy !== null}
            onClick={() => void run(c)}
            className="group flex flex-1 flex-col items-center justify-center gap-2 rounded-[24px] border border-[var(--border-subtle)] px-2 text-center transition-[background-color,transform] duration-fast ease-out-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffb547] motion-safe:active:scale-[0.98] disabled:opacity-70 [@media(hover:hover)]:hover:bg-[var(--white)]"
          >
            <span className="relative flex size-9 shrink-0 items-center justify-center text-[var(--gray-400)]">
              {busy === c.mode ? (
                <span className="block size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
              ) : (
                <ClapperIcon className="size-8 [stroke-width:1.25]" />
              )}
              {c.othersOff ? (
                <span className="absolute -bottom-0.5 -right-1 flex size-[18px] items-center justify-center rounded-full bg-[var(--bg-app)] text-[var(--gray-400)] shadow-[inset_0_0_0_1.25px_var(--gray-400),0_0_0_2px_var(--bg-app)] transition-colors duration-fast [@media(hover:hover)]:group-hover:bg-[var(--white)] [@media(hover:hover)]:group-hover:shadow-[inset_0_0_0_1.25px_var(--gray-400),0_0_0_2px_var(--white)]">
                  <PowerIcon className="size-[10px] [stroke-width:2.2]" />
                </span>
              ) : null}
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] font-bold leading-[18px] text-[var(--text-primary)]">{t.title}</span>
              <span className="mt-0.5 block text-[11.5px] leading-[14px] text-[var(--text-secondary)]">{t.sub}</span>
            </span>
          </button>
        );
      })}
      <CinemaModeControls />
      {error ? (
        <p role="status" className="absolute inset-x-2 top-2 z-[2] rounded-[12px] bg-[rgba(16,17,48,0.88)] px-3 py-2 text-xs font-semibold text-fixed-white">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function CinemaModeControls() {
  const film = useFilmMode();
  return <div className="flex min-w-0 flex-col gap-2" aria-label="Cinemamodus">
    <div className="grid grid-cols-2 gap-2">
      {([true, false] as const).map(start => <button
        key={String(start)} type="button" disabled={film.disabled}
        aria-label={start ? "Cinemamodus activeren" : "Cinemamodus stoppen"}
        aria-busy={film.busy}
        title={start ? "Projector aan, scherm naar mijn hoogte en Cinema-verlichting" : "Projector uit, scherm omlaag en woonkamer op 20 procent"}
        onClick={() => void film.setMode(start)}
        className="flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--white)] px-2 py-2 text-xs font-bold text-[var(--text-primary)] hover:bg-[var(--bg-app)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple-500)] disabled:opacity-40"
      >
        {start ? <ClapperIcon className="size-5" /> : <ScreenIcon kind="stop" />}
        <span>{start ? "Start film" : "Stop film"}</span>
      </button>)}
    </div>
    {film.message ? <p role="status" aria-live="polite" className="text-xs leading-4 text-[var(--text-secondary)]">{film.message}</p> : null}
  </div>;
}
