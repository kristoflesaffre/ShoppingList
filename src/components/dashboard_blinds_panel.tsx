"use client";

import * as React from "react";
import { googleAuthHeaders } from "@/lib/google-client";
import { cn } from "@/lib/utils";
import { blindLabel, type BlindCommand, type BlindsStatus } from "@/lib/brel-blinds";
import { ScreenIcon } from "@/components/dashboard_screen_panel";

const ACTIONS = [
  { action: "open", label: "Open", icon: "up" },
  { action: "stop", label: "Stop", icon: "stop" },
  { action: "close", label: "Dicht", icon: "down" },
] as const;

/**
 * Rolluiken via de BREL Home Hub, over de lokale app op de Mac (zelfde grens als het projectiescherm). Bij het openen
 * wordt alleen de stand gelezen; na een opdracht volgt de stand nog even mee terwijl het rolluik beweegt.
 */
export function useBlindsControls(token: string | null) {
  const [status, setStatus] = React.useState<BlindsStatus | null>(null);
  const [message, setMessage] = React.useState("Verbinding controleren…");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [version, setVersion] = React.useState(0);
  const [followUntil, setFollowUntil] = React.useState(0);
  const mounted = React.useRef(false);

  const call = React.useCallback(async (body: Record<string, unknown>, signal?: AbortSignal) => {
    const response = await fetch("/api/brel", {
      method: "POST", headers: { ...googleAuthHeaders(token), "content-type": "application/json" },
      body: JSON.stringify(body), cache: "no-store", signal,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "unavailable");
    return data;
  }, [token]);

  React.useEffect(() => {
    mounted.current = true;
    const controller = new AbortController();
    setStatus(null);
    setMessage(token ? "Verbinding controleren…" : "Meld je aan om de rolluiken te bedienen.");
    if (token) void call({ action: "status" }, controller.signal).then((data: BlindsStatus) => {
      if (controller.signal.aborted) return;
      setStatus(data);
      setMessage(!data.configured ? "Stel de BREL-sleutel eerst in op je Mac." : "Kies een rolluik.");
    }).catch(error => {
      if (controller.signal.aborted) return;
      setMessage(error instanceof Error && error.message === "mac-required"
        ? "Rolluiken werken alleen via de lokale app op je Mac."
        : "Rolluiken niet beschikbaar. Controleer de BREL-koppeling op je Mac.");
    });
    return () => { mounted.current = false; controller.abort(); };
  }, [token, call, version]);

  // Follow the position for a while after a command (and while the hub reports movement).
  const moving = status?.blinds.some(blind => blind.moving) ?? false;
  React.useEffect(() => {
    if (!token || (!moving && followUntil < Date.now())) return;
    const controller = new AbortController();
    let refreshing = false;
    const timer = window.setInterval(() => {
      if (refreshing) return;
      if (followUntil < Date.now() && !moving) { window.clearInterval(timer); return; }
      refreshing = true;
      void call({ action: "status" }, controller.signal)
        .then((data: BlindsStatus) => { if (!controller.signal.aborted) setStatus(data); })
        .catch(() => { /* keep the last known position */ })
        .finally(() => { refreshing = false; });
    }, 2500);
    return () => { window.clearInterval(timer); controller.abort(); };
  }, [token, moving, followUntil, call]);

  async function send(mac: string, action: BlindCommand) {
    // Stop is never blocked by another command in flight.
    if (busy && action !== "stop") return;
    const blind = status?.blinds.find(item => item.mac === mac);
    setBusy(mac + action);
    setMessage("Opdracht versturen…");
    try {
      await call({ action, blind: mac });
      if (!mounted.current) return;
      setMessage(`${blind?.name ?? "Rolluik"}: ${ACTIONS.find(item => item.action === action)?.label.toLowerCase()} verstuurd.`);
      setFollowUntil(Date.now() + 45_000);
    } catch {
      if (mounted.current) setMessage("Opdracht niet bevestigd. Controleer het rolluik; je kunt nog op Stop drukken.");
    } finally {
      if (mounted.current) setBusy(null);
    }
  }

  /** Drag on a capsule: one absolute position (hub: 0 = open, 100 = closed). */
  async function move(mac: string, position: number) {
    if (busy) return;
    const blind = status?.blinds.find(item => item.mac === mac);
    setBusy(mac + "position");
    setStatus(value => value && { ...value, blinds: value.blinds.map(item => item.mac === mac ? { ...item, position } : item) });
    setMessage("Opdracht versturen…");
    try {
      await call({ action: "position", blind: mac, position });
      if (!mounted.current) return;
      setMessage(`${blind?.name ?? "Rolluik"}: naar ${100 - position}% open.`);
      setFollowUntil(Date.now() + 45_000);
    } catch {
      if (mounted.current) setMessage("Opdracht niet bevestigd. Controleer het rolluik; je kunt nog op Stop drukken.");
    } finally {
      if (mounted.current) setBusy(null);
    }
  }

  const ready = status?.configured === true;
  return { status, message, busy, ready, send, move, recheck: () => setVersion(value => value + 1) };
}

/** Zelfde vorm als het schermpaneel: per rolluik een kop (naam · stand) en drie tegels, gescheiden door een lijntje. */
export function DashboardBlindsPanel({ token, variant = "dark" }: { token: string | null; variant?: "dark" | "light" }) {
  const { status, message, busy, ready, send, recheck } = useBlindsControls(token);
  const light = variant === "light";
  const secondary = light ? "text-[var(--text-secondary)]" : "text-fixed-white/75";
  const control = light ? "border border-[var(--border-subtle)] bg-[var(--white)] text-[var(--text-primary)] hover:bg-[var(--bg-app)]" : "bg-fixed-white/10 text-fixed-white hover:bg-fixed-white/20";
  const tile = "flex h-[62px] min-w-0 flex-col items-center justify-center gap-[3px] rounded-[14px] px-1 text-[11px] font-bold leading-[13px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white";
  const blinds = status?.blinds ?? [];
  return <div className="flex min-w-0 w-full flex-col gap-2" aria-label="Rolluiken bedienen">
    {blinds.length > 0 && <div className="flex min-w-0 gap-1.5">
      {blinds.map((blind, index) => <React.Fragment key={blind.mac}>
        {index > 0 && <span aria-hidden className={cn("my-2 w-px shrink-0", light ? "bg-[var(--border-subtle)]" : "bg-fixed-white/30")} />}
        <section aria-label={blind.name} className="flex min-w-0 flex-1 flex-col gap-2">
          <p className={cn("flex min-w-0 justify-between gap-2 text-[10px] font-extrabold leading-3", secondary)}>
            <span className="truncate uppercase">{blind.name}</span>
            <span className="shrink-0 font-bold normal-case" aria-live="polite">{blindLabel(blind)}</span>
          </p>
          <div className="grid grid-cols-3 gap-1.5">
            {ACTIONS.map(({ action, label, icon }) => <button key={action} type="button"
              aria-label={`${blind.name} ${label.toLowerCase()}`}
              aria-busy={busy === blind.mac + action}
              disabled={!ready || !blind.available || (busy !== null && action !== "stop")}
              onClick={() => void send(blind.mac, action)}
              className={cn(tile, light && "rounded-lg focus-visible:ring-[var(--text-primary)]", action === "stop" ? "bg-[#f4d8cb] text-[#572e38] hover:bg-[#ffe7dc]" : control)}>
              <ScreenIcon kind={icon} /><span>{label}</span>
            </button>)}
          </div>
        </section>
      </React.Fragment>)}
    </div>}
    <div className={cn("flex min-w-0 flex-wrap items-center justify-between gap-3 text-[11px] leading-[15px]", secondary)}>
      <p role="status" aria-live="polite" className={cn("min-w-0", !light && "truncate")} title={message}>{message}</p>
      {(!ready || blinds.some(blind => !blind.available)) && token && <button type="button" onClick={recheck} className="shrink-0 font-bold underline underline-offset-2">Opnieuw controleren</button>}
    </div>
  </div>;
}
