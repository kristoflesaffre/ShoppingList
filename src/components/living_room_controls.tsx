"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { RoundIconButton } from "@/components/ui/round_icon_button";
import { Switch } from "@/components/ui/switch";
import { MiniButton } from "@/components/ui/mini_button";
import { blindLabel, openPercent, type Blind } from "@/lib/brel-blinds";
import { useBlindsControls } from "@/components/dashboard_blinds_panel";
import { useScreenControls } from "@/components/dashboard_screen_panel";
import { isScreenActionDisabled } from "@/lib/projection-screen";

const Icon = {
  up: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 15 6-6 6 6" /></svg>,
  down: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m6 9 6 6 6-6" /></svg>,
  stop: <svg viewBox="0 0 24 24" aria-hidden className="!size-3.5"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor" /></svg>,
  /** Omhoog tot een streepje: naar de opgeslagen hoogte. */
  height: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 4.5h14" /><path d="m7 15 5-5 5 5" /></svg>,
};

/** Drie ronde knoppen onder elkaar (variant B): omhoog · stop · omlaag. */
function ControlStack({ name, up, stop, down }: {
  name: string;
  up: { label: string; icon?: React.ReactNode; disabled: boolean; onClick: () => void };
  stop: { disabled: boolean; onClick: () => void };
  down: { label: string; disabled: boolean; onClick: () => void };
}) {
  return <div className="flex shrink-0 flex-col gap-2" role="group" aria-label={`${name} bedienen`}>
    <RoundIconButton tone="surface" size={48} aria-label={`${name}: ${up.label}`} title={up.label} disabled={up.disabled} onClick={up.onClick}>{up.icon ?? Icon.up}</RoundIconButton>
    <RoundIconButton tone="danger" size={48} aria-label={`${name}: stop`} title="Stop" disabled={stop.disabled} onClick={stop.onClick}>{Icon.stop}</RoundIconButton>
    <RoundIconButton tone="surface" size={48} aria-label={`${name}: ${down.label}`} title={down.label} disabled={down.disabled} onClick={down.onClick}>{Icon.down}</RoundIconButton>
  </div>;
}

/** Zwart rolluik in een capsule: de lamellen zakken van boven tot de stand. Slepen kiest een stand, zoals de Hue-kolommen. */
function BlindCapsule({ blind, disabled, onMove }: { blind: Blind; disabled: boolean; onMove: (position: number) => void }) {
  const [preview, setPreview] = React.useState<number | null>(null);
  const drag = React.useRef<{ y: number; moved: boolean; rect: DOMRect } | null>(null);
  const closed = preview ?? blind.position ?? 0;
  const at = (clientY: number, rect: DOMRect) => Math.round(Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100)));
  const open = 100 - closed;
  return <button
    type="button"
    role="slider"
    aria-label={`${blind.name}: ${blindLabel(blind)}. Schuif omhoog of omlaag om de stand te kiezen.`}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={openPercent(blind) ?? undefined}
    aria-valuetext={blindLabel(blind)}
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
    className="relative h-[200px] w-[76px] shrink-0 touch-pan-x select-none overflow-hidden rounded-full bg-[linear-gradient(180deg,#a9cdfb,#fde7c4)] shadow-[inset_0_0_0_1px_rgba(16,17,48,0.06),0_10px_22px_-16px_rgba(16,17,48,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] disabled:opacity-60"
  >
    <span
      aria-hidden
      className={cn("absolute inset-x-0 top-0 bg-[repeating-linear-gradient(180deg,#30323e_0,#30323e_3px,#1d1e26_8px,#0b0c10_9px,#30323e_10px)] shadow-[0_3px_0_#08090c,0_8px_14px_-6px_rgba(0,0,0,0.5)]", preview == null && "transition-[height] duration-500 ease-out")}
      style={{ height: `${closed}%` }}
    />
    <span aria-hidden className={cn("absolute inset-x-0 bottom-4 text-center text-[15px] font-extrabold tabular-nums", closed > 82 ? "text-fixed-white" : "text-[#5a3300]")}>
      {blind.position == null ? "–" : open <= 2 ? null : `${open}%`}
    </span>
  </button>;
}

/** Wit projectiescherm dat van onder uit zijn kast omhoog komt, met een kleine projector ervoor. Geen sensor: open/dicht volgt de laatste opdracht. */
function ScreenScene({ open, projectorOn }: { open: boolean; projectorOn: boolean }) {
  return <div aria-hidden className="relative h-[200px] w-full max-w-[320px] overflow-hidden rounded-[24px] bg-[linear-gradient(180deg,var(--white),var(--gray-50))] shadow-[0_1px_2px_rgba(16,17,48,0.04),0_14px_30px_-22px_rgba(16,17,48,0.35)]">
    {/* Lichtbundel van de projector, achter het doek: het licht valt erop. */}
    {projectorOn ? <span className="absolute bottom-[14px] left-1/2 h-[170px] w-[80%] -translate-x-1/2 bg-[linear-gradient(0deg,rgba(255,200,120,0.8),rgba(255,200,120,0.08))] [clip-path:polygon(47%_100%,53%_100%,100%_0,0_0)]" /> : null}
    {/* Doek: komt van onder uit de kast. */}
    <span className={cn("absolute inset-x-[12%] bottom-[46px] rounded-t-[6px] bg-[linear-gradient(180deg,#ffffff,#f7f8fc)] shadow-[0_0_0_1px_rgba(16,17,48,0.08),0_12px_24px_-16px_rgba(16,17,48,0.4)] transition-[height] duration-700 ease-out motion-reduce:transition-none", open ? "h-[124px]" : "h-0")}>
      <span className="absolute inset-x-0 top-0 h-[5px] rounded-t-[6px] bg-[#2a2c44]" />
      {projectorOn && open ? <span className="absolute inset-[6px] rounded-[3px] bg-[radial-gradient(90%_100%_at_50%_100%,rgba(255,196,120,0.55),rgba(255,236,200,0.18)_75%)]" /> : null}
    </span>
    {/* Kast op de vloer. */}
    <span className="absolute inset-x-[9%] bottom-[34px] h-3 rounded-full bg-[#2a2c44]" />
    {/* Kleine projector. */}
    <span className="absolute bottom-2 left-1/2 flex h-[18px] w-[46px] -translate-x-1/2 items-center justify-center rounded-[6px] bg-[#3a3c52] shadow-[0_4px_8px_-4px_rgba(16,17,48,0.6)]">
      <span className={cn("size-2 rounded-full", projectorOn ? "bg-[#ffd28a] shadow-[0_0_8px_2px_rgba(255,200,120,0.9)]" : "bg-[#5d6078]")} />
    </span>
  </div>;
}

/** Startpagina: blinden links · projectiescherm · blinden rechts, zoals in de woonkamer. Variant B met zwarte rolluiken. */
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
  const screenState = s?.running ? "Gaat omhoog…" : s?.open == null ? "Stand onbekend" : s.open ? "Open" : "Dicht";

  const blindSide = (blind: Blind | undefined, side: "left" | "right") => blind ? <div className={cn("flex items-center gap-3.5", side === "right" && "flex-row-reverse")}>
    <ControlStack
      name={blind.name}
      up={{ label: "open", disabled: !blinds.ready || !blind.available || blinds.busy !== null, onClick: () => { setSource("blinds"); void blinds.send(blind.mac, "open"); } }}
      stop={{ disabled: !blinds.ready || !blind.available, onClick: () => { setSource("blinds"); void blinds.send(blind.mac, "stop"); } }}
      down={{ label: "dicht", disabled: !blinds.ready || !blind.available || blinds.busy !== null, onClick: () => { setSource("blinds"); void blinds.send(blind.mac, "close"); } }}
    />
    <div className="flex flex-col items-center gap-2">
      <BlindCapsule blind={blind} disabled={!blinds.ready || !blind.available || blinds.busy !== null} onMove={position => { setSource("blinds"); void blinds.move(blind.mac, position); }} />
      <span className="whitespace-nowrap text-center text-[13px] font-bold leading-4 text-[var(--text-primary)]">{blind.name}<br /><span className="font-semibold text-[var(--text-secondary)]">{blindLabel(blind)}</span></span>
    </div>
  </div> : null;

  const screenAction = (action: "up" | "stop" | "down" | "preset") => { setSource("screen"); void screen.send(action); };
  const screenBlock = <div className="flex min-w-0 items-center gap-3.5">
    <ControlStack
      name="Projectiescherm"
      up={{ label: "helemaal omhoog", disabled: isScreenActionDisabled("up", s, screen.busy), onClick: () => screenAction("up") }}
      stop={{ disabled: isScreenActionDisabled("stop", s, screen.busy), onClick: () => screenAction("stop") }}
      down={{ label: "omlaag", disabled: isScreenActionDisabled("down", s, screen.busy), onClick: () => screenAction("down") }}
    />
    <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
      <div className="relative w-full max-w-[320px]">
        <ScreenScene open={screenOpen} projectorOn={screen.projectorOn === true} />
        {hasHeight ? <MiniButton variant="secondary" disabled={isScreenActionDisabled("preset", s, screen.busy)} onClick={() => screenAction("preset")} aria-label="Projectiescherm omhoog tot mijn hoogte" className="absolute right-3 top-3 bg-[var(--white)] shadow-[0_4px_12px_-6px_rgba(16,17,48,0.35)] [&_svg]:size-4">{Icon.height}Mijn hoogte</MiniButton> : null}
      </div>
      <div className="flex w-full max-w-[320px] items-center justify-between gap-2">
        <span className="whitespace-nowrap text-[13px] font-bold leading-4 text-[var(--text-primary)]">Scherm<br /><span className="font-semibold text-[var(--text-secondary)]">{screenState}</span></span>
        <label className="flex items-center gap-2.5 text-[13px] font-bold text-[var(--text-primary)]">
          Projector
          <Switch checked={screen.projectorOn === true} disabled={!token || screen.projectorBusy} aria-busy={screen.projectorBusy}
            onCheckedChange={on => { setSource("screen"); void screen.sendProjector(on ? "on" : "off"); }} />
        </label>
      </div>
    </div>
  </div>;

  const message = source === "screen" ? screen.projectorMessage ?? screen.message
    : source === "blinds" ? blinds.message
    : !blinds.ready ? blinds.message : !screen.ready ? screen.message : null;
  const notReady = token && (!blinds.ready || !screen.ready);
  return <div className="flex min-w-0 flex-col gap-3">
    {/* Los op de pagina, zonder grote kaart. Gsm: scherm bovenaan, de rolluiken eronder (links blijft links). Vanaf md: alles op één rij zoals in de kamer. */}
    <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
      <div className="hidden md:block">{blindSide(left, "left")}</div>
      <div className="min-w-0 md:max-w-[440px] md:flex-1">{screenBlock}</div>
      <div className="hidden md:block">{blindSide(right, "right")}</div>
      <div className="flex justify-between gap-3 md:hidden">{blindSide(left, "left")}{blindSide(right, "right")}</div>
    </div>
    {message || notReady ? <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 text-[12px] leading-4 text-[var(--text-secondary)]">
      <p role="status" aria-live="polite" className="min-w-0">{message}</p>
      {notReady ? <button type="button" onClick={() => { blinds.recheck(); screen.recheck(); }} className="shrink-0 font-bold underline underline-offset-2">Opnieuw controleren</button> : null}
    </div> : null}
  </div>;
}
