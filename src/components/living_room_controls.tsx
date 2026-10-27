"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { RoundIconButton } from "@/components/ui/round_icon_button";
import { Switch } from "@/components/ui/switch";
import { MiniButton } from "@/components/ui/mini_button";
import { SegmentedControl } from "@/components/ui/segmented_control";
import { blindLabel, openPercent, slatsOpen, slatsState, type Blind, type Slats } from "@/lib/brel-blinds";
import { useBlindsControls } from "@/components/dashboard_blinds_panel";
import { useScreenControls } from "@/components/dashboard_screen_panel";
import { isScreenActionDisabled } from "@/lib/projection-screen";
import { ControlRail } from "@/components/ui/control_rail";
import { AmbienceLauncherOrNothing } from "@/components/dashboard_ambience";

const Icon = {
  up: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 15 6-6 6 6" /></svg>,
  down: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>,
  stop: <svg viewBox="0 0 24 24" aria-hidden className="!size-3.5"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" /></svg>,
  /** Omhoog tot een streepje: naar de opgeslagen hoogte. */
  height: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 4.5h14" /><path d="m7 15 5-5 5 5" /></svg>,
  /** Lamellen horizontaal: licht ertussen. */
  slatsOpen: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden className="size-[18px]"><path d="M4 6h16M4 12h16M4 18h16" /></svg>,
  /** Lamellen rechtop, naar boven gekanteld: het spiegelbeeld van slatsClosed. */
  slatsClosedUp: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden className="size-[18px]"><path d="M15 3.5l-6 5M15 9.5l-6 5M15 15.5l-6 5" /></svg>,
  /** Lamellen rechtop: ze overlappen en houden het licht tegen. */
  slatsClosed: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden className="size-[18px]"><path d="M9 3.5l6 5M9 9.5l6 5M9 15.5l6 5" /></svg>,
};

/**
 * Lamellen dicht naar boven · open · dicht naar onder (segmentknop met iconen), zo breed als capsule + rail erboven.
 * Bij «Beide» enkel een keuze als beide rolluiken in dezelfde stand staan. Alleen als de hub een hoek meldt.
 */
function SlatsControl({ name, blinds, disabled, onTilt }: { name: string; blinds: Blind[]; disabled: boolean; onTilt: (slats: Slats) => void }) {
  const states = blinds.map(slatsState);
  if (states.every(state => state == null)) return null;
  const slats = states.every(state => state === states[0]) ? states[0] ?? "" : "";
  return <SegmentedControl<Slats | ""> ariaLabel={`${name}: lamellen`} size="icon" disabled={disabled}
    value={slats} onChange={value => value && onTilt(value)}
    options={[
      { value: "up", label: Icon.slatsClosedUp, ariaLabel: "Lamellen dicht naar boven" },
      { value: "open", label: Icon.slatsOpen, ariaLabel: "Lamellen open" },
      { value: "down", label: Icon.slatsClosed, ariaLabel: "Lamellen dicht naar onder" },
    ]} />;
}

type Controls = {
  name: string;
  up: { label: string; disabled: boolean; onClick: () => void };
  stop: { disabled: boolean; onClick: () => void };
  down: { label: string; disabled: boolean; onClick: () => void };
};

type Heading = "up" | "down";

/**
 * Welke richting loopt er, per toestel: omhoog/omlaag blijven ingedrukt tot het einde bereikt is (`done`), tot stop,
 * of tot `maxMs` verstreken is (het scherm heeft geen sensor).
 */
function useHeadings(done: (key: string, heading: Heading) => boolean, /** Opnieuw nagaan als dit verandert (de stand). */ watch: unknown) {
  const [headings, setHeadings] = React.useState<Record<string, { heading: Heading; until: number }>>({});
  const set = React.useCallback((key: string, heading: Heading | null, maxMs = 90_000) => setHeadings(current => {
    const next = { ...current };
    if (heading) next[key] = { heading, until: Date.now() + maxMs }; else delete next[key];
    return next;
  }), []);
  // Opruimen zodra het einde bereikt is of de tijd om is.
  const doneRef = React.useRef(done);
  doneRef.current = done;
  React.useEffect(() => {
    const entries = Object.entries(headings);
    if (!entries.length) return;
    const finished = entries.filter(([key, value]) => value.until < Date.now() || doneRef.current(key, value.heading));
    if (finished.length) { setHeadings(current => { const next = { ...current }; for (const [key] of finished) delete next[key]; return next; }); return; }
    const timer = window.setTimeout(() => setHeadings(current => ({ ...current })), Math.max(250, Math.min(...entries.map(([, value]) => value.until - Date.now()))));
    return () => window.clearTimeout(timer);
  }, [headings, watch]);
  return { heading: (key: string) => headings[key]?.heading ?? null, set };
}

/** Onder dit percentage moet de motor aan de lader (rood). */
const BATTERY_LOW = 20;

/** Batterij van de motor: omtrek met een vulling naar het niveau; rood als hij geladen moet worden. */
function BatteryBadge({ level }: { level: number }) {
  const pct = Math.round(Math.min(100, Math.max(0, level)));
  const low = pct <= BATTERY_LOW;
  return <span className={cn("flex items-center gap-1 text-[10.5px] font-extrabold tabular-nums leading-3", low ? "text-[#ff6b63]" : "text-fixed-white/85")}
    title={`Batterij ${pct}%${low ? " · opladen" : ""}`}>
    <svg viewBox="0 0 24 12" aria-hidden className="h-[11px] w-[22px]">
      <rect x="0.75" y="0.75" width="19.5" height="10.5" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <rect x="21.5" y="3.5" width="2" height="5" rx="1" fill="currentColor" />
      <rect x="2.5" y="2.5" width={Math.max(1.5, (16 * pct) / 100)} height="7" rx="1.5" fill="currentColor" />
    </svg>
    {pct}%
  </span>;
}

/** Lamellen van één rolluik: zakken van boven tot de stand; open lamellen laten de lucht tussen de latten door. */
function Slats({ closed, lit, animate, className }: { closed: number; lit: boolean; animate: boolean; className?: string }) {
  return <span
    aria-hidden
    className={cn("absolute top-0 shadow-[0_3px_0_#08090c,0_8px_14px_-6px_rgba(0,0,0,0.5)]", lit
      ? "bg-[repeating-linear-gradient(180deg,#30323e_0,#1d1e26_3px,transparent_3px,transparent_10px)]"
      : "bg-[repeating-linear-gradient(180deg,#30323e_0,#30323e_3px,#1d1e26_8px,#0b0c10_9px,#30323e_10px)]", animate && "transition-[height] duration-500 ease-out", className ?? "inset-x-0")}
    style={{ height: `${closed}%` }}
  />;
}

/**
 * Zwart rolluik in een capsule: de lamellen zakken van boven tot de stand. Slepen (of de greep) kiest een stand.
 * Met `second` is het «Beide»: twee ramen naast elkaar met een wit middenstijltje; slepen zet beide op dezelfde stand.
 */
function BlindCapsule({ blind, second, label, disabled, onMove, dark = false, showLabel = true, className }: {
  blind: Blind; second?: Blind;
  /** Wit in het midden van de capsule (bv. «Links», «Beide»). */
  label?: string;
  disabled: boolean; onMove: (position: number) => void;
  /** Donker dashboardpaneel: avondlucht achter de lamellen. */
  dark?: boolean;
  showLabel?: boolean;
  className?: string;
}) {
  const [preview, setPreview] = React.useState<number | null>(null);
  const drag = React.useRef<{ y: number; moved: boolean; rect: DOMRect } | null>(null);
  const blinds = second ? [blind, second] : [blind];
  const known = blinds.every(item => item.position != null);
  const same = blinds.every(item => item.position === blind.position);
  // De greep staat op de stand; bij twee verschillende standen op het gemiddelde.
  const closed = preview ?? (known ? Math.round(blinds.reduce((sum, item) => sum + (item.position ?? 0), 0) / blinds.length) : 0);
  const at = (clientY: number, rect: DOMRect) => Math.round(Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100)));
  const open = 100 - closed;
  const name = second ? "Beide rolluiken" : blind.name;
  const state = second ? (same ? blindLabel(blind) : "verschillende standen") : blindLabel(blind);
  return <button
    type="button"
    role="slider"
    aria-label={`${name}: ${state}${!second && blind.battery != null ? `, batterij ${Math.round(blind.battery)}%` : ""}. Schuif omhoog of omlaag om de stand te kiezen.`}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={known ? open : undefined}
    aria-valuetext={state}
    disabled={disabled}
    onPointerDown={e => {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* slepen werkt dan binnen de capsule */ }
      drag.current = { y: e.clientY, moved: false, rect: e.currentTarget.getBoundingClientRect() };
    }}
    onPointerMove={e => {
      const d = drag.current;
      if (!d || (!d.moved && Math.abs(e.clientY - d.y) < 6)) return;
      d.moved = true;
      setPreview(at(e.clientY, d.rect));
    }}
    onPointerUp={e => {
      const d = drag.current;
      drag.current = null;
      if (!d?.moved) return;
      setPreview(null);
      onMove(at(e.clientY, d.rect));
    }}
    onPointerCancel={() => { drag.current = null; setPreview(null); }}
    onKeyDown={e => {
      if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
      e.preventDefault();
      onMove(Math.min(100, Math.max(0, closed + (e.key === "ArrowUp" ? -10 : 10))));
    }}
    className={cn(
      "relative shrink-0 touch-pan-x select-none overflow-hidden rounded-full focus-visible:outline-none focus-visible:ring-2 disabled:opacity-60",
      dark
        ? "bg-[linear-gradient(180deg,#1d2350_0%,#3a3270_55%,#b8707a_88%,#f0a47a_100%)] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)] focus-visible:ring-fixed-white"
        : "bg-[linear-gradient(180deg,#a9cdfb,#fde7c4)] shadow-[inset_0_0_0_1px_rgba(16,17,48,0.06),0_10px_22px_-16px_rgba(16,17,48,0.45)] focus-visible:ring-[var(--border-focus)]",
      className ?? "h-[200px] w-[76px]",
    )}
  >
    {second ? <>
      <Slats closed={preview ?? blind.position ?? 0} lit={slatsOpen(blind) === true} animate={preview == null} className="left-0 right-1/2" />
      <Slats closed={preview ?? second.position ?? 0} lit={slatsOpen(second) === true} animate={preview == null} className="left-1/2 right-0" />
      {/* Middenstijl van het raam. */}
      <span aria-hidden className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-[var(--white)] shadow-[0_0_4px_rgba(16,17,48,0.35)]" />
    </> : <Slats closed={closed} lit={slatsOpen(blind) === true} animate={preview == null} />}
    {showLabel && !second && blind.battery != null ? <span className="absolute left-1/2 top-5 -translate-x-1/2 [text-shadow:0_1px_3px_rgba(8,9,12,0.55)]">
      <BatteryBadge level={blind.battery} />
    </span> : null}
    {showLabel ? <>
      {/* Naam en stand in wit, weg van de greep en onder de batterij. */}
      <span aria-hidden
        className="absolute inset-x-0 flex -translate-y-1/2 flex-col items-center text-fixed-white [text-shadow:0_1px_3px_rgba(8,9,12,0.55)]"
        style={{ top: `${closed < 50 ? (closed + 100) / 2 : closed < 72 ? Math.max(closed / 2, 28) : 50}%` }}>
        {label ? <span className={cn("text-[13px] font-extrabold leading-4", second && "relative rounded-pill bg-[#23242e] px-2.5 py-1 shadow-[0_0_0_2px_var(--white)]")}>{label}</span> : null}
        {!known ? <span className="text-[15px] font-extrabold tabular-nums">–</span>
          : (same || preview != null) && open > 2 ? <span className="text-[15px] font-extrabold leading-5 tabular-nums">{open}%</span> : null}
      </span>
      {/* Greep op de onderkant van de lamellen, zoals in de BREL-app: sleep hem naar de gewenste hoogte. */}
      <span aria-hidden
        className={cn("absolute left-1/2 flex size-10 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-[var(--white)] text-[var(--text-primary)] shadow-[0_6px_14px_-4px_rgba(16,17,48,0.55)] [&_svg]:-my-[3px] [&_svg]:size-4",
          preview == null ? "transition-[top] duration-500 ease-out" : "scale-110")}
        style={{ top: `clamp(22px, ${closed}%, calc(100% - 22px))` }}>
        {Icon.up}{Icon.down}
      </span>
    </> : null}
  </button>;
}

/** Wit projectiescherm dat van onder uit zijn kast omhoog komt, met een kleine projector ervoor. Geen sensor: open/dicht volgt de laatste opdracht. */
function ScreenScene({ open, projectorOn, dark = false, className, stageClassName }: {
  open: boolean; projectorOn: boolean; dark?: boolean; className?: string;
  /** Waar doek, kast en projector staan binnen het paneel (bv. naast de bedieningsrail). */
  stageClassName?: string;
}) {
  return <div aria-hidden className={cn("relative overflow-hidden rounded-[24px]", dark
    ? "bg-fixed-white/[0.06] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]"
    : "bg-[linear-gradient(180deg,var(--white),var(--gray-50))] shadow-[0_1px_2px_rgba(16,17,48,0.04),0_14px_30px_-22px_rgba(16,17,48,0.35)]", className ?? "h-[200px] w-full max-w-[320px]")}>
    <span className={cn("absolute", stageClassName ?? "inset-0")}>
      {/* Lichtbundel van de projector, achter het doek: het licht valt erop. */}
      {projectorOn ? <span className="absolute bottom-[14px] left-1/2 h-[85%] w-[80%] -translate-x-1/2 bg-[linear-gradient(0deg,rgba(255,200,120,0.8),rgba(255,200,120,0.08))] [clip-path:polygon(47%_100%,53%_100%,100%_0,0_0)]" /> : null}
      {/* Doek: komt van onder uit de kast. */}
      <span className={cn("absolute inset-x-[12%] bottom-[46px] rounded-t-[6px] bg-[linear-gradient(180deg,#ffffff,#f7f8fc)] shadow-[0_0_0_1px_rgba(16,17,48,0.08),0_12px_24px_-16px_rgba(16,17,48,0.4)] transition-[height] duration-700 ease-out motion-reduce:transition-none", open ? "h-[calc(100%-64px)]" : "h-0")}>
        <span className="absolute inset-x-0 top-0 h-[5px] rounded-t-[6px] bg-[#2a2c44]" />
        {projectorOn && open ? <span className="absolute inset-[6px] rounded-[3px] bg-[radial-gradient(90%_100%_at_50%_100%,rgba(255,196,120,0.55),rgba(255,236,200,0.18)_75%)]" /> : null}
      </span>
      {/* Kast op de vloer. */}
      <span className={cn("absolute inset-x-[9%] bottom-[34px] h-3 rounded-full", dark ? "bg-[#0d0e1c] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]" : "bg-[#2a2c44]")} />
      {/* Kleine projector. */}
      <span className="absolute bottom-2 left-1/2 flex h-[18px] w-[46px] -translate-x-1/2 items-center justify-center rounded-[6px] bg-[#3a3c52] shadow-[0_4px_8px_-4px_rgba(16,17,48,0.6)]">
        <span className={cn("size-2 rounded-full", projectorOn ? "bg-[#ffd28a] shadow-[0_0_8px_2px_rgba(255,200,120,0.9)]" : "bg-[#5d6078]")} />
      </span>
    </span>
  </div>;
}

/** Onder de naam: de stand, maar niets bij een dicht rolluik (dat zie je). */
const blindSubtitle = (blind: Blind) => (blindLabel(blind) === "Dicht" ? null : blindLabel(blind));

/** Het scherm heeft geen sensor: omhoog/omlaag blijft zo lang ingedrukt als een volledige rit ongeveer duurt. */
const SCREEN_TRAVEL_MS = 30_000;

/**
 * Startpagina «Woonkamer»: projectiescherm · blinden links · blinden rechts, zoals in de kamer (de rolluiken hangen
 * rechts van het scherm). Elk rolluik: capsule met sleepgreep + bedieningsrail ernaast; het scherm heeft alles in zijn paneel.
 */
export function LivingRoomControls({ token }: { token: string | null }) {
  const blinds = useBlindsControls(token);
  const screen = useScreenControls(token, { projectorStatus: true });
  // Tonen we de melding van het scherm of van de rolluiken? Wat je het laatst bediende.
  const [source, setSource] = React.useState<"screen" | "blinds" | null>(null);
  const list = blinds.status?.blinds ?? [];
  const left = list.find(blind => /links/i.test(blind.name)) ?? list[1];
  const right = list.find(blind => blind !== left);
  const s = screen.screen;
  const hasHeight = s?.durationSeconds != null;
  const screenOpen = s?.running ? true : s?.open === true;
  // Ingedrukt tot het rolluik helemaal open (0) of dicht (100) is.
  const headings = useHeadings((key, heading) => {
    const group = key === "both" ? [left, right].filter((item): item is Blind => !!item) : list.filter(item => item.mac === key);
    return group.length > 0 && group.every(blind => blind.position != null && !blind.moving && blind.position === (heading === "up" ? 0 : 100));
  }, blinds.status);

  /** Eén rolluik, of «Beide» (key "both"): capsule met de naam erin + rail, eronder de lamellen over de volle breedte. */
  const blindUnit = (group: Blind[], key: string, label: string) => {
    const [blind, second] = group;
    if (!blind) return null;
    const macs = group.map(item => item.mac);
    const name = second ? "Beide rolluiken" : blind.name;
    const reachable = blinds.ready && group.every(item => item.available);
    const locked = !reachable || blinds.busy !== null;
    const go = (heading: Heading | null) => {
      setSource("blinds");
      // «Beide» drukt ook de rails van de twee rolluiken in; stop laat ze allemaal los.
      for (const id of second ? [key, ...macs] : [key]) headings.set(id, heading);
      void blinds.send(macs, heading === "up" ? "open" : heading === "down" ? "close" : "stop");
    };
    return <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2.5">
        <BlindCapsule blind={blind} second={second} label={label} disabled={locked}
          onMove={position => { setSource("blinds"); for (const id of [key, ...macs]) headings.set(id, null); void blinds.move(macs, position); }} />
        <ControlRail name={name} pressed={headings.heading(key)}
          up={{ label: "open", disabled: locked, onClick: () => go("up") }}
          stop={{ disabled: !reachable, onClick: () => go(null) }}
          down={{ label: "dicht", disabled: locked, onClick: () => go("down") }} />
      </div>
      <SlatsControl name={name} blinds={group} disabled={locked} onTilt={slats => { setSource("blinds"); void blinds.tilt(macs, slats); }} />
    </div>;
  };

  const screenAction = (action: "up" | "stop" | "down" | "preset") => {
    setSource("screen");
    headings.set("screen", action === "stop" ? null : action === "down" ? "down" : "up",
      action === "preset" && s?.durationSeconds != null ? s.durationSeconds * 1000 + 1500 : SCREEN_TRAVEL_MS);
    void screen.send(action);
  };
  const screenBlock = <div className="relative h-[200px] w-full min-w-0">
    <ScreenScene open={screenOpen} projectorOn={screen.projectorOn === true} className="h-full w-full" stageClassName="inset-y-0 left-[60px] right-0" />
    <ControlRail name="Projectiescherm" className="absolute left-2 top-2 !h-[184px]" pressed={headings.heading("screen")}
      up={{ label: "helemaal omhoog", disabled: isScreenActionDisabled("up", s, screen.busy), onClick: () => screenAction("up") }}
      stop={{ disabled: isScreenActionDisabled("stop", s, screen.busy), onClick: () => screenAction("stop") }}
      down={{ label: "omlaag", disabled: isScreenActionDisabled("down", s, screen.busy), onClick: () => screenAction("down") }} />
    {hasHeight ? <MiniButton variant="secondary" disabled={isScreenActionDisabled("preset", s, screen.busy)} onClick={() => screenAction("preset")} aria-label="Projectiescherm omhoog tot mijn hoogte" className="absolute right-3 top-3 bg-[var(--white)] shadow-[0_4px_12px_-6px_rgba(16,17,48,0.35)] [&_svg]:size-4">{Icon.height}Mijn hoogte</MiniButton> : null}
    <label className="absolute left-[68px] top-3 flex items-center gap-2 rounded-pill bg-[var(--white)] py-1 pl-3 pr-1 text-[12.5px] font-bold text-[var(--text-primary)] shadow-[0_4px_12px_-6px_rgba(16,17,48,0.35)]">
      Projector
      <Switch checked={screen.projectorOn === true} disabled={!token || screen.projectorBusy} aria-busy={screen.projectorBusy}
        onCheckedChange={on => { setSource("screen"); void screen.sendProjector(on ? "on" : "off"); }} />
    </label>
  </div>;

  const message = source === "screen" ? screen.projectorMessage ?? screen.message
    : source === "blinds" ? blinds.message
    : !blinds.ready ? blinds.message : !screen.ready ? screen.message : null;
  const notReady = token && (!blinds.ready || !screen.ready);
  return <div className="flex min-w-0 flex-col gap-4">
    {/* Los op de pagina, zonder grote kaart. Gsm: scherm bovenaan, de rolluiken eronder. Vanaf md: alles op één rij zoals in de kamer. */}
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
      <div className="min-w-0 md:max-w-[460px] md:flex-1">{screenBlock}</div>
      <div className="flex flex-wrap justify-center gap-x-6 gap-y-5 md:flex-nowrap md:justify-start md:gap-8">
        {left ? blindUnit([left], left.mac, "Links") : null}
        {right ? blindUnit([right], right.mac, "Rechts") : null}
        {left && right ? blindUnit([left, right], "both", "Beide") : null}
      </div>
    </div>
    <AmbienceLauncherOrNothing />
    {message || notReady ? <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 text-[12px] leading-4 text-[var(--text-secondary)]">
      <p role="status" aria-live="polite" className="min-w-0">{message}</p>
      {notReady ? <button type="button" onClick={() => { blinds.recheck(); screen.recheck(); }} className="shrink-0 font-bold underline underline-offset-2">Opnieuw controleren</button> : null}
    </div> : null}
  </div>;
}

/** Op een capsule of het scherm: omhoog bovenaan, stop in het midden, omlaag onderaan (dashboard, variant 2). */
function SplitControls({ name, up, stop, down, size = 28 }: Controls & { size?: 28 | 36 }) {
  return <>
    <RoundIconButton tone="onColor" size={size} aria-label={`${name}: ${up.label}`} title={up.label} disabled={up.disabled} onClick={up.onClick} className={cn("absolute left-1/2 -translate-x-1/2", size === 36 ? "top-3" : "top-1.5", "!bg-fixed-white/90 !text-[#1b1c2b]")}>{Icon.up}</RoundIconButton>
    <RoundIconButton tone="danger" size={size} aria-label={`${name}: stop`} title="Stop" disabled={stop.disabled} onClick={stop.onClick} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 shadow-[0_4px_10px_-4px_rgba(0,0,0,0.6)]">{Icon.stop}</RoundIconButton>
    <RoundIconButton tone="onColor" size={size} aria-label={`${name}: ${down.label}`} title={down.label} disabled={down.disabled} onClick={down.onClick} className={cn("absolute left-1/2 -translate-x-1/2", size === 36 ? "bottom-3" : "bottom-1.5", "!bg-fixed-white/90 !text-[#1b1c2b]")}>{Icon.down}</RoundIconButton>
  </>;
}

/** Dashboard, tab «Woonkamer»: de capsule is de knop. Links · scherm · rechts, met Mijn hoogte en de projector eronder. */
export function DashboardWoonkamerPanel({ token, large = false }: { token: string | null; /** Bedieningsvenster: hoge kolommen, grotere knoppen. */ large?: boolean }) {
  const blinds = useBlindsControls(token);
  const screen = useScreenControls(token, { projectorStatus: true });
  const list = blinds.status?.blinds ?? [];
  const left = list.find(blind => /links/i.test(blind.name)) ?? list[1];
  const right = list.find(blind => blind !== left);
  const s = screen.screen;
  const busyBlinds = blinds.busy !== null;
  const screenAction = (action: "up" | "stop" | "down" | "preset") => void screen.send(action);

  const blindColumn = (blind: Blind | undefined, short: string) => blind ? <div className="flex h-full min-h-0 flex-col items-center gap-1.5">
    <div className={cn("relative min-h-[100px] flex-1", large ? "w-[104px]" : "w-[72px]")}>
      <BlindCapsule dark showLabel={false} blind={blind} className="h-full w-full" disabled={!blinds.ready || !blind.available || busyBlinds} onMove={position => void blinds.move(blind.mac, position)} />
      <SplitControls
        size={large ? 36 : 28}
        name={blind.name}
        up={{ label: "open", disabled: !blinds.ready || !blind.available || busyBlinds, onClick: () => void blinds.send(blind.mac, "open") }}
        stop={{ disabled: !blinds.ready || !blind.available, onClick: () => void blinds.send(blind.mac, "stop") }}
        down={{ label: "dicht", disabled: !blinds.ready || !blind.available || busyBlinds, onClick: () => void blinds.send(blind.mac, "close") }}
      />
    </div>
    {slatsOpen(blind) != null ? <RoundIconButton tone="onColor" size={28} disabled={!blinds.ready || !blind.available || busyBlinds}
      aria-label={`${blind.name}: lamellen ${slatsOpen(blind) ? "dicht" : "open"}`} title={slatsOpen(blind) ? "Lamellen dicht" : "Lamellen open"}
      onClick={() => void blinds.tilt(blind.mac, slatsOpen(blind) ? "down" : "open")} className="shrink-0 !bg-fixed-white/[0.14] !text-fixed-white">
      {slatsOpen(blind) ? Icon.slatsOpen : Icon.slatsClosed}
    </RoundIconButton> : null}
    <span className={cn("whitespace-nowrap text-center font-bold text-fixed-white/90", large ? "text-[13px] leading-4" : "text-[11.5px] leading-[14px]")}>{short}{blindSubtitle(blind) ? <span className="font-semibold text-fixed-white/60"> · {openPercent(blind)}%</span> : null}</span>
  </div> : <div className={large ? "w-[104px]" : "w-[72px]"} />;

  const ready = blinds.ready && screen.ready;
  const pill = cn(large ? "h-10 px-4 text-[13px]" : "h-7 px-3 text-[11.5px]", "inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill bg-fixed-white/[0.12] font-extrabold text-fixed-white transition-colors hover:bg-fixed-white/20 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white [&_svg]:size-[15px]");
  return <div className={cn("flex h-full min-h-0 w-full items-stretch justify-between", large ? "gap-6" : "gap-4")} aria-label="Woonkamer bedienen">
    {blindColumn(left, "Links")}
    <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col items-center", large ? "max-w-[420px] gap-2.5" : "max-w-[300px] gap-1.5")}>
      <div className="relative min-h-[100px] w-full flex-1">
        <ScreenScene dark open={s?.running ? true : s?.open === true} projectorOn={screen.projectorOn === true} className="h-full w-full" />
        <SplitControls
          size={large ? 36 : 28}
          name="Projectiescherm"
          up={{ label: "helemaal omhoog", disabled: isScreenActionDisabled("up", s, screen.busy), onClick: () => screenAction("up") }}
          stop={{ disabled: isScreenActionDisabled("stop", s, screen.busy), onClick: () => screenAction("stop") }}
          down={{ label: "omlaag", disabled: isScreenActionDisabled("down", s, screen.busy), onClick: () => screenAction("down") }}
        />
      </div>
      {ready || !token ? <div className="flex items-center gap-2">
        {s?.durationSeconds != null ? <button type="button" className={pill} aria-label="Projectiescherm omhoog tot mijn hoogte" disabled={isScreenActionDisabled("preset", s, screen.busy)} onClick={() => screenAction("preset")}>{Icon.height}Mijn hoogte</button> : null}
        <span className={cn(pill, "gap-2 pr-1")}>
          Projector
          <Switch checked={screen.projectorOn === true} disabled={!token || screen.projectorBusy} aria-label="Projector" aria-busy={screen.projectorBusy}
            onCheckedChange={on => void screen.sendProjector(on ? "on" : "off")}
            className={cn("!h-[22px] !w-[38px] focus-visible:!ring-offset-0 [&>span]:!size-4", screen.projectorOn ? "!bg-[#ffb547] [&>span]:!left-[19px]" : "!bg-fixed-white/[0.16]")} />
        </span>
      </div> : <p className="flex min-w-0 items-center gap-2 text-[11px] leading-[14px] text-fixed-white/70">
        <span className="truncate" title={!blinds.ready ? blinds.message : screen.message}>{!blinds.ready ? blinds.message : screen.message}</span>
        <button type="button" onClick={() => { blinds.recheck(); screen.recheck(); }} className="shrink-0 font-bold underline underline-offset-2">Opnieuw</button>
      </p>}
    </div>
    {blindColumn(right, "Rechts")}
  </div>;
}
