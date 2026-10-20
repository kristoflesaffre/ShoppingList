"use client";

import * as React from "react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useAirco } from "@/components/home_airco_section";
import { sortAircos } from "@/lib/airco-order";
import type { AcCommand, AcDevice } from "@/lib/panasonic";

/**
 * Klimaat op het tabletdashboard (canvas «Klimaat · 1A»): per airco een kolom zoals de lampen. De vulling is de
 * ingestelde temperatuur (16–30°) in de kleur van de stand (blauw koelen, oranje verwarmen); schuif om bij te
 * stellen. Onderaan in de kolom de aan/uit-knop, eronder een schakelaar ❄ | ☀. Enkel koelen en verwarmen.
 */

const MIN = 16;
const MAX = 30;
const COOL: [string, string] = ["#5fa8ff", "#b8d8ff"];
const HEAT: [string, string] = ["#ff9450", "#ffd2b0"];
const NEUTRAL: [string, string] = ["#a99be0", "#d9d1f5"];

type Change = (deviceId: string, command: Omit<AcCommand, "deviceId">, immediate?: boolean) => void;

function colorsFor(device: AcDevice): [string, string] {
  return device.mode === "cool" ? COOL : device.mode === "heat" ? HEAT : NEUTRAL;
}

function PowerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden className={className}>
      <path d="M12 3v9" />
      <path d="M6.3 6.9a8 8 0 1 0 11.4 0" />
    </svg>
  );
}

function AcColumn({ device, change, tall = false }: { device: AcDevice; change: Change; tall?: boolean }) {
  const [preview, setPreview] = React.useState<number | null>(null);
  const drag = React.useRef<{ y: number; moved: boolean; rect: DOMRect } | null>(null);
  const reachable = device.available && device.on !== null;
  const on = device.on === true;
  const target = preview ?? device.targetTemperature ?? 21;
  const frac = Math.min(1, Math.max(0, (target - MIN) / (MAX - MIN)));
  const [from, to] = colorsFor(device);
  const tempAt = (clientY: number, rect: DOMRect) => {
    const raw = MIN + ((rect.bottom - clientY) / rect.height) * (MAX - MIN);
    return Math.min(MAX, Math.max(MIN, Math.round(raw * 2) / 2));
  };
  const inside = device.insideTemperature != null ? `binnen ${String(device.insideTemperature).replace(".", ",")}°` : device.available ? "" : "niet bereikbaar";
  const temp = (t: number) => `${String(t).replace(".", ",")}°`;

  return (
    <div className={cn("flex shrink-0 flex-col items-center", tall ? "min-h-0 w-[120px] flex-1 gap-2.5" : "h-full min-h-0 w-[84px] gap-1")}>
      <div className={cn("relative flex min-h-0 flex-1", tall ? "min-h-[200px] w-[96px]" : "min-h-[56px] w-[60px]")}>
        <button
          type="button"
          role="slider"
          aria-label={`${device.name}: ${on ? `aan, ${temp(target)}` : "uit"}. Schuif omhoog of omlaag voor de temperatuur.`}
          aria-valuemin={MIN}
          aria-valuemax={MAX}
          aria-valuenow={target}
          disabled={!reachable || !on}
          onPointerDown={(e) => {
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              /* zonder capture werkt slepen binnen de kolom */
            }
            drag.current = { y: e.clientY, moved: false, rect: e.currentTarget.getBoundingClientRect() };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            if (!d.moved && Math.abs(e.clientY - d.y) < 6) return;
            d.moved = true;
            setPreview(tempAt(e.clientY, d.rect));
          }}
          onPointerUp={(e) => {
            const d = drag.current;
            drag.current = null;
            if (!d?.moved) return;
            const t = tempAt(e.clientY, d.rect);
            setPreview(null);
            if (t !== device.targetTemperature) change(device.id, { temperature: t });
          }}
          onPointerCancel={() => {
            drag.current = null;
            setPreview(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              change(device.id, { temperature: Math.min(MAX, Math.max(MIN, target + (e.key === "ArrowUp" ? 0.5 : -0.5))) });
            }
          }}
          className={cn(
            "relative flex w-full touch-pan-x select-none justify-center overflow-hidden rounded-full bg-fixed-white/[0.08] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white",
            tall ? "pt-4" : "pt-2.5",
          )}
        >
          {on ? (
            <span
              aria-hidden
              className={cn("absolute inset-x-0 bottom-0 rounded-full", preview == null && "transition-[height] duration-base ease-out-strong")}
              style={{ height: `${Math.max(frac * 100, 14)}%`, backgroundImage: `linear-gradient(0deg, ${from}, ${to})`, boxShadow: `0 0 22px 2px ${from}66` }}
            />
          ) : null}
          <span className={cn("relative font-extrabold tabular-nums", tall ? "text-xl" : "text-[15px]", on ? "text-fixed-white" : "text-fixed-white/50")}>
            {on ? temp(target) : reachable ? "Uit" : "–"}
          </span>
        </button>
        {/* Aan/uit onderaan in de kolom (wit = aan); los van de schuifbalk zodat een tik niet als slepen telt. */}
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={`${device.name} ${on ? "uitzetten" : "aanzetten"}`}
          disabled={!reachable}
          onClick={() => change(device.id, { power: !on }, true)}
          className={cn(
            "absolute left-1/2 flex -translate-x-1/2 items-center justify-center rounded-full transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white disabled:opacity-50",
            tall ? "bottom-3 size-9" : "bottom-1.5 size-7",
            on ? "bg-fixed-white text-[#3a2f5a] shadow-[0_4px_10px_-4px_rgba(0,0,0,0.35)]" : "bg-fixed-white/[0.16] text-fixed-white shadow-[inset_0_0_0_1.5px_rgba(255,255,255,0.5)]",
          )}
        >
          <PowerIcon className={tall ? "size-4" : "size-[13px]"} />
        </button>
      </div>
      <span className="flex w-full shrink-0 flex-col items-center text-center leading-tight">
        <span className={cn("w-full truncate font-bold", tall ? "text-[14px]" : "text-[12px]", on ? "text-fixed-white" : "text-fixed-white/65")}>{device.name}</span>
        {inside ? <span className={cn("text-fixed-white/70", tall ? "text-[12px]" : "text-[10.5px]")}>{inside}</span> : null}
      </span>
      {/* Enkel koelen of verwarmen. Uit = gedimd (Comfort Cloud wijzigt niets aan een toestel dat uit staat). */}
      <div role="radiogroup" aria-label={`${device.name}: koelen of verwarmen`} className={cn("flex shrink-0 rounded-full bg-fixed-white/[0.14] p-[3px]", !on && "opacity-55")}>
        {(["cool", "heat"] as const).map((mode) => {
          const active = device.mode === mode;
          const [c] = mode === "cool" ? COOL : HEAT;
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={mode === "cool" ? "Koelen" : "Verwarmen"}
              disabled={!on || !reachable || !device.modes.includes(mode)}
              onClick={() => !active && change(device.id, { mode }, true)}
              className={cn(
                "flex items-center justify-center rounded-full font-bold transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white",
                tall ? "h-8 w-11 text-[15px]" : "h-6 w-8 text-[12px]",
                active ? "text-fixed-white" : "text-fixed-white/80",
              )}
              style={active ? { backgroundColor: c, boxShadow: `0 3px 8px -3px ${c}cc` } : undefined}
            >
              {mode === "cool" ? "❄" : "☀"}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ClimateModal({
  devices,
  change,
  onClose,
  headerToggle,
  switched = false,
}: {
  devices: AcDevice[];
  change: Change;
  onClose: () => void;
  headerToggle?: React.ReactNode;
  /** Geopend via de schakelaar in het venster: achtergrond zonder in-animatie, enkel de inhoud vloeit in. */
  switched?: boolean;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  const reachable = devices.filter((d) => d.available && d.on !== null);
  const action = "h-10 rounded-pill bg-fixed-white/10 px-4 text-sm font-bold text-fixed-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white disabled:opacity-40 [@media(hover:hover)]:hover:bg-fixed-white/[0.16]";
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Alle airco's" onClick={onClose} className={cn("fixed inset-0 z-[70] flex bg-[rgba(8,9,24,0.6)] p-7 backdrop-blur-sm", !switched && "motion-safe:animate-fade-up")}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex min-h-0 w-full flex-col rounded-[28px] bg-[linear-gradient(160deg,#232b48_0%,#1a2036_55%,#141a2c_100%)] px-7 py-6 text-fixed-white shadow-[inset_0_0_0_1px_rgba(160,180,255,0.22),0_40px_80px_-30px_rgba(0,0,0,0.8)]"
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11.5px] font-extrabold tracking-[0.08em] text-fixed-white/60">KLIMAAT</p>
            <h2 className="mt-0.5 text-[30px] font-extrabold tracking-[-0.02em]">Alle airco&apos;s</h2>
          </div>
          <div className="flex items-center gap-2">
            {headerToggle ?? (
              <>
                <button type="button" className={action} disabled={reachable.every((d) => d.on)} onClick={() => reachable.filter((d) => !d.on).forEach((d) => change(d.id, { power: true }, true))}>
                  Alles aan
                </button>
                <button type="button" className={action} disabled={!reachable.some((d) => d.on)} onClick={() => reachable.filter((d) => d.on).forEach((d) => change(d.id, { power: false }, true))}>
                  Alles uit
                </button>
              </>
            )}
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
        <div className={cn("mt-6 flex min-h-0 flex-1 justify-center gap-10 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden", switched && "motion-safe:animate-fade-slide-in")}>
          {devices.map((d) => (
            <AcColumn key={d.id} device={d} change={change} tall />
          ))}
        </div>
        <p className="mt-4 text-center text-[13px] text-fixed-white/45">
          Schuif een kolom omhoog of omlaag voor de temperatuur · ⏻ onderaan de kolom zet aan of uit · ❄ / ☀ kiest koelen of verwarmen
        </p>
      </div>
    </div>,
    document.body,
  );
}

/** Inhoud van het paneel in de stand «Klimaat»: de kolommen, plus het volledige scherm als `open`. */
export function DashboardClimate({
  open,
  onClose,
  headerToggle,
  switched = false,
}: {
  open: boolean;
  onClose: () => void;
  headerToggle?: React.ReactNode;
  switched?: boolean;
}) {
  const { state, devices, change, error, load } = useAirco();
  const sorted = React.useMemo(() => sortAircos(devices, new Date()), [devices]);

  let body: React.ReactNode;
  if (state.kind === "loading") {
    body = (
      <div className="flex h-full gap-5" aria-busy aria-label="Airco's laden">
        {[0, 1, 2].map((i) => (
          <span key={i} className="h-full min-h-[96px] w-[64px] animate-pulse rounded-full bg-fixed-white/10" />
        ))}
      </div>
    );
  } else if (state.kind === "not-configured") {
    body = <p className="text-sm text-fixed-white/70">Panasonic is nog niet ingesteld op deze versie van de app.</p>;
  } else if (state.kind === "not-connected") {
    body = (
      <Link href="/profiel/panasonic" className="inline-flex h-11 items-center rounded-pill bg-fixed-white px-4 text-sm font-bold text-[#1c1a2c] no-underline">
        {state.reconnect ? "Koppel je airco's opnieuw" : "Koppel je airco's"}
      </Link>
    );
  } else if (state.kind === "error") {
    body = (
      <p className="text-sm text-fixed-white/70">
        De airco&apos;s zijn even niet bereikbaar.{" "}
        <button type="button" onClick={() => void load()} className="font-bold underline">
          Opnieuw
        </button>
      </p>
    );
  } else if (sorted.length === 0) {
    body = <p className="text-sm text-fixed-white/70">Geen airco&apos;s gevonden bij je Comfort Cloud-account.</p>;
  } else {
    body = (
      <div className="flex h-full min-h-0 w-full gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sorted.map((d) => (
          <AcColumn key={d.id} device={d} change={change} />
        ))}
      </div>
    );
  }

  return (
    <>
      {body}
      {error ? <p className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-pill bg-[rgba(8,9,24,0.6)] px-3 py-1 text-xs font-bold text-fixed-white">{error}</p> : null}
      {open && state.kind === "ready" && sorted.length > 0 ? <ClimateModal devices={sorted} change={change} onClose={onClose} headerToggle={headerToggle} switched={switched} /> : null}
    </>
  );
}
