"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { FilterChip } from "@/components/ui/filter_chip";
import { RoundIconButton } from "@/components/ui/round_icon_button";
import { SegmentedControl } from "@/components/ui/segmented_control";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { Switch } from "@/components/ui/switch";
import { CORNER_KEYS, DEFAULT_MASK, maskPolygon, type CornerKey, type ProjectorMask } from "@/lib/ambience-projector";
import {
  ambienceErrorText,
  projectorState,
  sendProjectorMask,
  setProjectorCalibrating,
  setProjectorEnabled,
  type ProjectorState,
} from "@/lib/ambience-client";
import { cn } from "@/lib/utils";

/**
 * «Ook rond de tv» in «Kies je sfeer» (canvas «Ambience · Ook op de projector» A): schakelaar + «Tv afdekken».
 * De projector speelt dezelfde video op de muur rond de tv, gelijk met de tv (`src/app/projector/sfeer`).
 */

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white";

export function ProjectorAmbienceRow({ token, onOpenMask }: { token: string | null; onOpenMask: (state: ProjectorState) => void }) {
  const [state, setState] = React.useState<ProjectorState | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!token) return;
    let stop = false;
    const load = () =>
      projectorState(token)
        .then((s) => {
          if (stop || !s) return;
          setState(s);
          if (s.enabled && (s.report === "embed-blocked" || s.report === "video-error")) setMessage(ambienceErrorText(s.report, ""));
        })
        .catch(() => undefined);
    void load();
    // Zolang het blad open is: meldingen van de projector (video mag niet buiten YouTube, …).
    const timer = window.setInterval(load, 6000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, [token]);

  if (!state) return null;

  const toggle = async (enabled: boolean) => {
    setSaving(true);
    setMessage(null);
    setState({ ...state, enabled });
    try {
      const problem = await setProjectorEnabled(token, enabled);
      if (problem) setMessage(ambienceErrorText(problem, "Rond de tv lukt nu niet."));
    } catch {
      setState({ ...state, enabled: !enabled });
      setMessage("Opslaan lukte niet. Probeer opnieuw.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3.5 rounded-[20px] bg-fixed-white/[0.08] p-3 pr-3.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.14)]">
        <span aria-hidden className="relative h-[52px] w-[84px] shrink-0 overflow-hidden rounded-[12px] bg-[linear-gradient(120deg,#ff9a52,#c2413a_45%,#4a2a6a)] max-md:hidden">
          <span className="absolute left-[22px] top-[13px] h-6 w-10 rounded-[3px] bg-[#07080f] shadow-[0_0_0_1.5px_rgba(255,255,255,0.55)]" />
        </span>
        <span className="min-w-0 flex-1">
          <span id="ambience-projector-label" className="block text-base font-bold leading-[22px]">
            Ook rond de tv
          </span>
          <span className="mt-0.5 block text-[13.5px] leading-[19px] text-fixed-white/70">
            De projector speelt dezelfde video op de muur, gelijk met de tv. Op de tv zelf valt geen licht.
          </span>
        </span>
        <button
          type="button"
          onClick={() => onOpenMask(state)}
          className={cn("h-[34px] shrink-0 rounded-pill bg-fixed-white/[0.14] px-3.5 text-sm font-semibold transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.97]", focusRing)}
        >
          Tv afdekken
        </button>
        <Switch checked={state.enabled} disabled={saving} onCheckedChange={(v) => void toggle(v)} aria-labelledby="ambience-projector-label" className="shrink-0" />
      </div>
      {message ? (
        <p role="status" className="px-1 text-[13px] leading-[18px] text-fixed-white/75">
          {message}
        </p>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tv afdekken: één keer instellen waar de tv op het beeld van de projector zit
// ---------------------------------------------------------------------------

const CORNER_LABEL: Record<CornerKey, string> = { tl: "Linksboven", tr: "Rechtsboven", br: "Rechtsonder", bl: "Linksonder" };
const SOFT_LABEL = ["Geen", "Licht", "Middel", "Sterk"];

/** Kadertje met een bolletje op de gekozen hoek: compacter dan vier woorden naast elkaar. */
function CornerIcon({ corner }: { corner: CornerKey }) {
  const [cx, cy] = { tl: [6, 6], tr: [18, 6], br: [18, 18], bl: [6, 18] }[corner];
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg viewBox="0 0 24 24" fill="none" aria-hidden className="size-5">
        <rect x="6" y="6" width="12" height="12" rx="1.5" stroke="currentColor" strokeWidth={1.8} opacity={0.55} />
        <circle cx={cx} cy={cy} r={3.6} fill="currentColor" />
      </svg>
      <span className="sr-only">{CORNER_LABEL[corner]}</span>
    </span>
  );
}

function Arrow({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function TvMaskSheet({ open, token, initial, onClose, onSaved }: { open: boolean; token: string | null; initial: ProjectorMask; onClose: () => void; onSaved: (mask: ProjectorMask) => void }) {
  const [mask, setMask] = React.useState<ProjectorMask>(initial);
  const [pick, setPick] = React.useState<CornerKey>("tl");
  const [fine, setFine] = React.useState(false);
  const [problem, setProblem] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const boxRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<CornerKey | null>(null);

  // Openen: de projector toont een raster met een wit kader; sluiten zonder bewaren zet het terug.
  React.useEffect(() => {
    if (!open) return;
    setMask(initial);
    setProblem(null);
    void setProjectorCalibrating(token, true)
      .then((p) => setProblem(p ? ambienceErrorText(p, "De projector is niet bereikbaar.") : null))
      .catch(() => setProblem("De projector is niet bereikbaar."));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- enkel bij openen
  }, [open]);

  // Elke wijziging meteen live op de muur (kort uitgesteld, zodat slepen niet elke pixel verstuurt).
  React.useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => void sendProjectorMask(token, mask, false).catch(() => undefined), 120);
    return () => window.clearTimeout(timer);
  }, [open, token, mask]);

  const moveCorner = (key: CornerKey, x: number, y: number) =>
    setMask((m) => ({ ...m, corners: { ...m.corners, [key]: [Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))] } }));
  const nudge = (dx: number, dy: number, key: CornerKey = pick) => {
    const step = fine ? 0.001 : 0.005;
    const [x, y] = mask.corners[key];
    moveCorner(key, x + dx * step, y + dy * step);
  };

  const pointerTo = (e: React.PointerEvent) => {
    const box = boxRef.current?.getBoundingClientRect();
    if (!box || !dragRef.current) return;
    moveCorner(dragRef.current, (e.clientX - box.left) / box.width, (e.clientY - box.top) / box.height);
  };

  const cancel = () => {
    void setProjectorCalibrating(token, false).catch(() => undefined);
    onClose();
  };
  const save = async () => {
    setSaving(true);
    try {
      await sendProjectorMask(token, mask, true);
      onSaved(mask);
    } catch {
      setProblem("Bewaren lukte niet. Probeer opnieuw.");
    } finally {
      setSaving(false);
    }
  };

  const W = 560;
  const H = 315;
  const outline = CORNER_KEYS.map((k) => `${mask.corners[k][0] * W},${mask.corners[k][1] * H}`).join(" ");
  const covered = maskPolygon(mask, W, H).map((p) => p.join(",")).join(" ");

  return (
    <SlideInModal
      open={open}
      onClose={cancel}
      title="Tv afdekken"
      titleId="tv-mask-title"
      size="wide"
      containerClassName="z-[80]"
      footer={
        <Button size="md" onClick={() => void save()} disabled={saving}>
          Bewaren
        </Button>
      }
    >
      <p className="-mt-1 mb-4 text-sm leading-5 text-[var(--text-secondary)]">
        Op de muur zie je nu een raster met een wit kader. Zet elke hoek van het kader op de hoek van de tv.
      </p>
      {problem ? (
        <p role="alert" className="mb-4 rounded-[16px] bg-[var(--error-25)] px-4 py-3 text-sm text-[var(--error-600)]">
          {problem}
        </p>
      ) : null}
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="flex shrink-0 flex-col gap-2.5 md:w-[400px] lg:w-[440px]">
          <div
            ref={boxRef}
            onPointerMove={pointerTo}
            onPointerUp={() => (dragRef.current = null)}
            onPointerCancel={() => (dragRef.current = null)}
            className="relative aspect-video w-full touch-none select-none overflow-hidden rounded-[16px] bg-[#1d2033] bg-[linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:6.25%_11.1%]"
          >
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden className="absolute inset-0 size-full">
              <polygon points={covered} fill="#000" opacity={0.85} />
              <polygon points={outline} fill="none" stroke="#fff" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
            {CORNER_KEYS.map((k) => {
              const on = pick === k;
              return (
                <button
                  key={k}
                  type="button"
                  aria-label={`Hoek ${CORNER_LABEL[k].toLowerCase()}`}
                  aria-pressed={on}
                  onPointerDown={(e) => {
                    setPick(k);
                    dragRef.current = k;
                    boxRef.current?.setPointerCapture(e.pointerId);
                  }}
                  onFocus={() => setPick(k)}
                  onKeyDown={(e) => {
                    const dir = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
                    if (!dir) return;
                    e.preventDefault();
                    nudge(dir[0], dir[1], k);
                  }}
                  className={cn(
                    "absolute -translate-x-1/2 -translate-y-1/2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
                    on ? "size-[26px] border-[3px] border-fixed-white bg-[var(--blue-500)] shadow-[0_0_0_4px_rgba(79,85,241,0.45)]" : "size-5 border-2 border-[var(--blue-500)] bg-fixed-white",
                  )}
                  style={{ left: `${mask.corners[k][0] * 100}%`, top: `${mask.corners[k][1] * 100}%` }}
                />
              );
            })}
          </div>
          <p className="text-[13px] leading-[18px] text-[var(--text-secondary)]">Het kader staat tegelijk op de projector. Zwart = daar valt geen licht.</p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-5">
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-text-primary">
              Hoek <span className="font-normal text-[var(--text-secondary)]">· {CORNER_LABEL[pick].toLowerCase()}</span>
            </p>
            <SegmentedControl
              ariaLabel="Hoek"
              fill
              value={pick}
              onChange={setPick}
              options={CORNER_KEYS.map((k) => ({ value: k, label: <CornerIcon corner={k} /> }))}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="grid grid-cols-[repeat(3,36px)] grid-rows-[repeat(3,36px)] gap-1.5">
              <span />
              <RoundIconButton tone="primary" size={36} aria-label="Hoek omhoog" onClick={() => nudge(0, -1)}>
                <Arrow d="M6 15l6-6 6 6" />
              </RoundIconButton>
              <span />
              <RoundIconButton tone="primary" size={36} aria-label="Hoek naar links" onClick={() => nudge(-1, 0)}>
                <Arrow d="M15 6l-6 6 6 6" />
              </RoundIconButton>
              <span aria-hidden className="m-3 rounded-full bg-[var(--blue-500)]" />
              <RoundIconButton tone="primary" size={36} aria-label="Hoek naar rechts" onClick={() => nudge(1, 0)}>
                <Arrow d="M9 6l6 6-6 6" />
              </RoundIconButton>
              <span />
              <RoundIconButton tone="primary" size={36} aria-label="Hoek omlaag" onClick={() => nudge(0, 1)}>
                <Arrow d="M6 9l6 6 6-6" />
              </RoundIconButton>
              <span />
            </div>
            <div className="flex flex-col items-start gap-2">
              <p className="text-[13px] leading-[18px] text-[var(--text-secondary)]">Sleep de hoek op het beeld, of verschuif met de pijlen.</p>
              <FilterChip selected={fine} onClick={() => setFine((v) => !v)}>
                Fijn verschuiven
              </FilterChip>
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="flex justify-between text-sm font-semibold text-text-primary">
              Marge rond de tv <span className="font-normal text-[var(--text-secondary)]">{mask.margin === 0 ? "Geen" : mask.margin}</span>
            </span>
            <input type="range" min={0} max={10} step={0.5} value={mask.margin} onChange={(e) => setMask((m) => ({ ...m, margin: Number(e.target.value) }))} className="w-full accent-[var(--blue-500)]" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="flex justify-between text-sm font-semibold text-text-primary">
              Video rond de tv <span className="font-normal text-[var(--text-secondary)]">{mask.spread.toFixed(1).replace(".", ",")} × de tv</span>
            </span>
            <input type="range" min={1.2} max={3} step={0.1} value={mask.spread} onChange={(e) => setMask((m) => ({ ...m, spread: Number(e.target.value) }))} className="w-full accent-[var(--blue-500)]" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="flex justify-between text-sm font-semibold text-text-primary">
              Zachte rand <span className="font-normal text-[var(--text-secondary)]">{SOFT_LABEL[mask.soft]}</span>
            </span>
            <input type="range" min={0} max={3} step={1} value={mask.soft} onChange={(e) => setMask((m) => ({ ...m, soft: Number(e.target.value) }))} className="w-full accent-[var(--blue-500)]" />
          </label>
          <div className="flex items-center gap-3">
            <span className="min-w-0 flex-1">
              <span id="tv-mask-blur" className="block text-sm font-semibold text-text-primary">
                Licht vervagen
              </span>
              <span className="block text-[13px] leading-[18px] text-[var(--text-secondary)]">Wat zachter op de muur, meer zoals ambilight.</span>
            </span>
            <Switch checked={mask.blur} onCheckedChange={(blur) => setMask((m) => ({ ...m, blur }))} aria-labelledby="tv-mask-blur" />
          </div>
          <Button variant="tertiary" size="sm" className="self-start px-0" onClick={() => setMask({ ...DEFAULT_MASK })}>
            Opnieuw beginnen
          </Button>
        </div>
      </div>
    </SlideInModal>
  );
}
