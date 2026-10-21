"use client";

import * as React from "react";
import Link from "next/link";
import { googleAuthHeaders } from "@/lib/google-client";
import { cn } from "@/lib/utils";

import { isScreenActionDisabled, type ScreenStatus, type ScreenAction as Action } from "@/lib/projection-screen";

const ACTIONS = [
  { action: "up", label: "Omhoog", icon: "up" },
  { action: "stop", label: "Stop", icon: "stop" },
  { action: "down", label: "Omlaag", icon: "down" },
  { action: "preset", label: "Mijn hoogte", icon: "preset" },
] as const;

function ScreenIcon({ kind }: { kind: (typeof ACTIONS)[number]["icon"] }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="h-6 w-6">
    {kind === "stop" ? <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" /> : kind === "preset" ? <><path d="M4 4h16M6 4v11h12V4M12 15v5M9 20h6" /><path d="m9 10 3-3 3 3" /></> : <path d={kind === "up" ? "m6 14 6-6 6 6" : "m6 10 6 6 6-6"} />}
  </svg>;
}

/** Reuses the authenticated local API. No RF command is sent on mount or retried. */
export function DashboardScreenPanel({ token }: { token: string | null }) {
  const [screen, setScreen] = React.useState<ScreenStatus | null>(null);
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
      setMessage(data.paused ? "Schermbediening is gepauzeerd." : data.configured ? "Kies een schermopdracht." : "Stel de BroadLink-schermbediening eerst in.");
    }).catch(error => {
      if (controller.signal.aborted) return;
      setMessage(error instanceof Error && error.message === "mac-required"
        ? "Schermbediening werkt alleen via de lokale app op je Mac."
        : "Schermbediening niet beschikbaar. Controleer de koppeling op je Mac.");
    });
    return () => { mounted.current = false; command.current += 1; busyRef.current = false; controller.abort(); };
  }, [token, call]);

  async function send(action: Action) {
    if (isScreenActionDisabled(action, screen, busyRef.current)) return;
    const current = ++command.current;
    busyRef.current = true;
    setBusy(true);
    if (action === "preset") setScreen(value => value ? { ...value, running: true } : value);
    setMessage(action === "preset" ? "Omhoog naar je opgeslagen hoogte… Stop blijft beschikbaar." : "Opdracht versturen…");
    try {
      const result = await call(action);
      if (!mounted.current || current !== command.current) return;
      setScreen(result);
      setMessage(action === "preset" ? "Hoogtereeks beëindigd. Controleer het scherm." : `${ACTIONS.find(item => item.action === action)?.label} verstuurd. Controleer het scherm.`);
    } catch {
      if (!mounted.current || current !== command.current) return;
      setMessage("Opdracht niet bevestigd. Controleer het scherm; je kunt nog op Stop drukken.");
    } finally {
      if (mounted.current && current === command.current) { busyRef.current = false; setBusy(false); }
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
  return <div className="flex min-w-0 w-full flex-col gap-2" aria-label="Projectiescherm bedienen">
    <div className="grid grid-cols-4 gap-2">
      {ACTIONS.map(({ action, label, icon }) => <button key={action} type="button"
        aria-label={action === "preset" ? "Omhoog naar opgeslagen hoogte" : `Projectiescherm ${label.toLowerCase()}`}
        disabled={isScreenActionDisabled(action, screen, busy)}
        onClick={() => void send(action)}
        title={action === "preset" ? "Start met het scherm helemaal omlaag; gebruikt de opgeslagen looptijd." : undefined}
        className={cn("flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white", action === "stop" ? "bg-[#f4d8cb] text-[#572e38] hover:bg-[#ffe7dc]" : "bg-fixed-white/10 text-fixed-white hover:bg-fixed-white/20")}>
        <ScreenIcon kind={icon} /><span>{label}</span>
      </button>)}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] leading-4 text-fixed-white/70">
      <span>{screen?.durationSeconds != null ? `Mijn hoogte: ${screen.durationSeconds.toLocaleString("nl-BE", { maximumFractionDigits: 2 })} s · begin volledig omlaag` : "Mijn hoogte nog niet ingesteld"}</span>
      <Link href="/profiel/projectiescherm" className="font-bold text-fixed-white/90 underline underline-offset-2">Hoogte instellen</Link>
    </div>
    <p role="status" aria-live="polite" className="text-[11px] leading-4 text-fixed-white/75">{message}</p>
  </div>;
}
