"use client";

import * as React from "react";
import Link from "next/link";
import { googleAuthHeaders } from "@/lib/google-client";
import { cn } from "@/lib/utils";
import { sendProjectorCommand } from "@/lib/projector-client";
import { projectorTestMessage } from "@/lib/projector-control";

import { isScreenActionDisabled, type ScreenStatus, type ScreenAction as Action } from "@/lib/projection-screen";

export const ACTIONS = [
  { action: "up", label: "Omhoog", icon: "up" },
  { action: "stop", label: "Stop", icon: "stop" },
  { action: "down", label: "Omlaag", icon: "down" },
  { action: "preset", label: "Mijn hoogte", icon: "preset" },
] as const;

export function PowerIcon({ on }: { on: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-5 w-5">
    {on ? <><path d="M12 3v8" /><path d="M6.4 6.6a8 8 0 1 0 11.2 0" /></> : <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />}
  </svg>;
}

export function ScreenIcon({ kind }: { kind: (typeof ACTIONS)[number]["icon"] }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-6 w-6">
    {kind === "stop" ? <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" /> : kind === "preset" ? <><path d="M4 4h16M6 4v11h12V4M12 15v5M9 20h6" /><path d="m9 10 3-3 3 3" /></> : <path d={kind === "up" ? "m6 14 6-6 6 6" : "m6 10 6 6 6-6"} />}
  </svg>;
}

/**
 * Screen and projector state, shared by the dashboard panel and the control window. Reuses the authenticated local
 * API; no RF command is sent on mount or retried. `projectorStatus` also reads the Pi's last reported power state
 * (a database read, never a command).
 */
export function useScreenControls(token: string | null, { projectorStatus = false }: { projectorStatus?: boolean } = {}) {
  const [screen, setScreen] = React.useState<ScreenStatus | null>(null);
  const [statusVersion, setStatusVersion] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("Verbinding controleren…");
  const mounted = React.useRef(false);
  const busyRef = React.useRef(false);
  const command = React.useRef(0);
  const call = React.useCallback(async (action: Action | "status", signal?: AbortSignal) => {
    const response = await fetch("/api/broadlink", {
      method: "POST", headers: { ...googleAuthHeaders(token), "content-type": "application/json" },
      body: JSON.stringify({ action }), cache: "no-store", signal,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "unavailable");
    return data as ScreenStatus;
  }, [token]);

  React.useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    setScreen(null);
    setBusy(false);
    setMessage(token ? "Verbinding controleren…" : "Meld je aan om het scherm te bedienen.");
    if (token) void call("status", controller.signal).then(data => {
      if (controller.signal.aborted) return;
      setScreen(data);
      setMessage(data.paused ? "Schermbediening is gepauzeerd." : !data.configured ? "Stel de BroadLink-schermbediening eerst in."
        : data.durationSeconds != null ? `Mijn hoogte ${data.durationSeconds.toLocaleString("nl-BE", { maximumFractionDigits: 2 })} s · begin volledig omlaag` : "Kies een schermopdracht.");
    }).catch(error => {
      if (controller.signal.aborted) return;
      setMessage(error instanceof Error && error.message === "mac-required"
        ? "Schermbediening werkt alleen via de lokale app op je Mac."
        : "Schermbediening niet beschikbaar. Controleer de koppeling op je Mac.");
    });
    return () => { mounted.current = false; command.current += 1; busyRef.current = false; controller.abort(); };
  }, [token, call, statusVersion]);

  async function send(action: Action) {
    if (isScreenActionDisabled(action, screen, busyRef.current)) return;
    const current = ++command.current;
    busyRef.current = true;
    setBusy(true);
    setProjectorMessage(null);
    if (action === "preset") setScreen(value => value ? { ...value, running: true } : value);
    setMessage(action === "preset" ? "Omhoog naar je opgeslagen hoogte… Stop blijft beschikbaar." : "Opdracht versturen…");
    try {
      const result = await call(action);
      if (!mounted.current || current !== command.current) return;
      setScreen(value => ({ ...value, ...result }));
      setMessage(["down", "up", "preset"].includes(action) && result.projector?.configured
        ? `Schermopdracht verstuurd. ${result.projector.isOn === (action !== "down") ? (action === "down" ? "Projector staat uit." : "Projector staat aan.") : result.projector.accepted ? (action === "down" ? "Uitschakelcommando verstuurd." : "Wekcommando verstuurd.") : "Projector niet bereikbaar; gebruik de afstandsbediening."}`
        : action === "preset" ? "Hoogtereeks beëindigd. Controleer het scherm." : `${ACTIONS.find(item => item.action === action)?.label} verstuurd. Controleer het scherm.`);
    } catch {
      if (!mounted.current || current !== command.current) return;
      setMessage("Opdracht niet bevestigd. Controleer het scherm; je kunt nog op Stop drukken.");
    } finally {
      if (mounted.current && current === command.current) { busyRef.current = false; setBusy(false); }
    }
  }

  // Projector only (never moves the screen): one command at a time, never retried.
  const [projectorBusy, setProjectorBusy] = React.useState(false);
  const [projectorMessage, setProjectorMessage] = React.useState<string | null>(null);
  const projectorLock = React.useRef(false);
  const [projectorOn, setProjectorOn] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    if (!projectorStatus || !token) return;
    let active = true;
    void sendProjectorCommand("status", token).then(result => { if (active && result.accepted) setProjectorOn(result.isOn ?? null); }).catch(() => { /* status unknown */ });
    return () => { active = false; };
  }, [projectorStatus, token]);
  async function sendProjector(action: "on" | "off") {
    if (projectorLock.current || !token) return;
    projectorLock.current = true;
    setProjectorBusy(true);
    setProjectorMessage(action === "on" ? "Projector aanzetten… dit kan tot 10 seconden duren." : "Projector uitzetten… dit kan tot 10 seconden duren.");
    try {
      const result = await sendProjectorCommand(action, token);
      if (mounted.current) setProjectorMessage(projectorTestMessage(action, result));
      if (mounted.current && result.accepted) setProjectorOn(action === "on");
    } catch {
      if (mounted.current) setProjectorMessage("De projectoropdracht is niet bevestigd. Controleer het beeld voordat je opnieuw probeert.");
    } finally {
      projectorLock.current = false;
      if (mounted.current) setProjectorBusy(false);
    }
  }

  const ready = screen?.configured === true && !screen.paused;
  const moving = screen?.running || screen?.calibrating;
  // A preset continues on the Mac if this tab is closed. Refresh saved status
  // while it is running so returning to the tab never leaves movement disabled.
  React.useEffect(() => {
    if (!moving || !ready) return;
    const controller = new AbortController();
    let refreshing = false;
    const timer = window.setInterval(() => {
      if (refreshing) return;
      refreshing = true;
      const current = command.current;
      void call("status", controller.signal).then(result => {
        if (!controller.signal.aborted && current === command.current) setScreen(result);
      }).catch(() => { /* Keep Stop available when a status refresh fails. */ }).finally(() => { refreshing = false; });
    }, 2000);
    return () => { window.clearInterval(timer); controller.abort(); };
  }, [moving, ready, call]);
  const recheck = () => setStatusVersion(value => value + 1);
  // De Hue-contactsensor op het scherm weet beter dan de laatste opdracht (ook de afstandsbediening telt dan mee).
  const sensorOpen = useScreenSensor(token, busy || !!moving);
  const shown = screen && sensorOpen != null ? { ...screen, open: sensorOpen } : screen;
  return { screen: shown, busy, message, ready, send, recheck, projectorBusy, projectorMessage, projectorOn, sendProjector, sensor: sensorOpen != null, sensorOpen };
}

/** Naam van het Hue-toestel met de contactsensor op het scherm (in Home Assistant «Gang beneden voordeur»). */
const SCREEN_CONTACT = /^projectiescherm$/i;

// Gedeeld door alle bedieningen op de pagina: hoogstens één vraag aan de Hue-cloud per 2,5 s.
let sensorRead: { at: number; value: Promise<boolean | null> } | null = null;
function readScreenSensor(token: string): Promise<boolean | null> {
  if (sensorRead && Date.now() - sensorRead.at < 2_500) return sensorRead.value;
  const value = fetch("/api/hue/contact", { method: "POST", headers: googleAuthHeaders(token), cache: "no-store" })
    .then(response => response.json() as Promise<{ contacts?: { name: string; open: boolean | null }[] }>)
    .then(data => data.contacts?.find(contact => SCREEN_CONTACT.test(contact.name.trim()))?.open ?? null);
  sensorRead = { at: Date.now(), value };
  return value;
}

/**
 * Open/dicht van het scherm volgens de Hue-contactsensor (geen contact = open), rechtstreeks uit de Hue-cloud,
 * dus ook zonder de Pi. Leest om de 20 s zolang de pagina zichtbaar is, elke 3 s terwijl het scherm beweegt.
 * Null als Hue niet gekoppeld is of de sensor niets meldt; dan volgt de app de laatste opdracht.
 */
export function useScreenSensor(token: string | null, active: boolean): boolean | null {
  const [open, setOpen] = React.useState<boolean | null>(null);
  React.useEffect(() => {
    if (!token) return;
    let stopped = false;
    const read = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const value = await readScreenSensor(token);
        if (!stopped) setOpen(value);
      } catch { /* laatste stand houden */ }
    };
    void read();
    const timer = window.setInterval(read, active ? 3_000 : 20_000);
    document.addEventListener("visibilitychange", read);
    return () => { stopped = true; window.clearInterval(timer); document.removeEventListener("visibilitychange", read); };
  }, [token, active]);
  return open;
}

/** Variant A (design/screen-controls-options.html): scherm en projector op één rij, één statusregel eronder. */
export function DashboardScreenPanel({ token, variant = "dark" }: { token: string | null; variant?: "dark" | "light" }) {
  const { screen, busy, message, ready, send, recheck, projectorBusy, projectorMessage, sendProjector } = useScreenControls(token);
  const light = variant === "light";
  const secondary = light ? "text-[var(--text-secondary)]" : "text-fixed-white/75";
  const control = light ? "border border-[var(--border-subtle)] bg-[var(--white)] text-[var(--text-primary)] hover:bg-[var(--bg-app)]" : "bg-fixed-white/10 text-fixed-white hover:bg-fixed-white/20";
  const tile = "flex h-[62px] min-w-0 flex-col items-center justify-center gap-[3px] rounded-[14px] px-1 text-[11px] font-bold leading-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white";
  return <div className="flex min-w-0 w-full flex-col gap-2" aria-label="Projectiescherm bedienen">
    <div className={cn("grid grid-cols-[4fr_2fr] gap-[13px] text-[10px] font-extrabold leading-3", secondary)} aria-hidden>
      <span>SCHERM</span><span>PROJECTOR</span>
    </div>
    <div className="grid grid-cols-[repeat(4,minmax(0,1fr))_1px_repeat(2,minmax(0,1fr))] gap-1.5">
      {ACTIONS.map(({ action, label, icon }) => <button key={action} type="button"
        aria-label={action === "preset" ? "Omhoog naar opgeslagen hoogte" : `Projectiescherm ${label.toLowerCase()}`}
        disabled={isScreenActionDisabled(action, screen, busy)}
        onClick={() => void send(action)}
        title={action === "preset" ? "Start met het scherm helemaal omlaag; gebruikt de opgeslagen looptijd." : undefined}
        className={cn(tile, light && "rounded-lg focus-visible:ring-[var(--text-primary)]", action === "stop" ? "bg-[#f4d8cb] text-[#572e38] hover:bg-[#ffe7dc]" : control)}>
        <ScreenIcon kind={icon} /><span className="text-center">{label}</span>
      </button>)}
      <span aria-hidden className={cn("my-2", light ? "bg-[var(--border-subtle)]" : "bg-fixed-white/30")} />
      {([["on", "Aan"], ["off", "Uit"]] as const).map(([action, label]) => <button key={action} type="button"
        aria-label={`Projector ${label.toLowerCase()}, zonder het scherm te bewegen`}
        aria-busy={projectorBusy}
        disabled={!token || projectorBusy}
        onClick={() => void sendProjector(action)}
        className={cn(tile, control, light && "rounded-lg focus-visible:ring-[var(--text-primary)]")}>
        <PowerIcon on={action === "on"} /><span>{label}</span>
      </button>)}
    </div>
    <div className={cn("flex min-w-0 flex-wrap items-center justify-between gap-3 text-[11px] leading-[15px]", secondary)}>
      <p role="status" aria-live="polite" className={cn("min-w-0", !light && "truncate")} title={projectorMessage ?? message}>{projectorMessage ?? message}</p>
      {!ready && token
        ? <button type="button" onClick={recheck} className="shrink-0 font-bold underline underline-offset-2">Opnieuw controleren</button>
        : <Link href="/profiel/projectiescherm" className="shrink-0 font-bold underline underline-offset-2">Hoogte instellen</Link>}
    </div>
  </div>;
}
