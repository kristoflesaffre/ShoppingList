"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { googleAuthHeaders, useGoogleAuthToken } from "@/lib/google-client";

/**
 * Philips Hue op het avonddashboard (canvas «Dashboard · licht» F · Lampkolommen): elke kamer is een staande
 * capsule die van onder opvult met haar helderheid, met een zachte gloed. Tik = aan/uit, op en neer slepen =
 * dimmen (wordt bij loslaten verstuurd); «Alles uit» bovenaan. Via /api/hue/rooms en /api/hue/light.
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

function LampColumn({ room, index, busy, onChange }: { room: Room; index: number; busy: boolean; onChange: (patch: Patch) => void }) {
  const [preview, setPreview] = React.useState<number | null>(null);
  const drag = React.useRef<{ y: number; moved: boolean; rect: DOMRect } | null>(null);
  const level = preview ?? (room.on ? room.brightness ?? 100 : 0);
  const lit = level > 0;
  const [from, to] = GLOWS[index % GLOWS.length];
  const levelAt = (clientY: number, rect: DOMRect) => Math.round(Math.min(100, Math.max(0, ((rect.bottom - clientY) / rect.height) * 100)));
  const commit = (b: number) => onChange(b <= 2 ? { on: false } : { on: true, brightness: b });

  return (
    <div className="flex w-[74px] shrink-0 flex-col items-center gap-1.5">
      <button
        type="button"
        role="slider"
        aria-label={`${room.name}: ${lit ? `aan, ${level}%` : "uit"}. Tik om te schakelen, schuif om te dimmen.`}
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
          } else onChange(room.on ? { on: false } : { on: true });
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
        className="relative flex min-h-[72px] w-[52px] flex-1 touch-pan-x select-none justify-center overflow-hidden rounded-full bg-white/[0.06] pt-2.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-70"
      >
        {lit ? (
          <span
            aria-hidden
            className={cn("absolute inset-x-0 bottom-0 rounded-full", preview == null && "transition-[height] duration-base ease-out-strong")}
            style={{ height: `${Math.max(level, 12)}%`, backgroundImage: `linear-gradient(0deg, ${from}, ${to})`, boxShadow: `0 0 22px 2px ${from}88` }}
          />
        ) : null}
        <span className={cn("relative text-[13px] font-extrabold tabular-nums", !lit ? "text-white/50" : level >= 80 ? "text-[#5a3300]" : "text-white")}>{lit ? level : "–"}</span>
      </button>
      <span className={cn("w-full truncate text-center text-[11.5px] font-bold", lit ? "text-white" : "text-white/65")}>{room.name}</span>
    </div>
  );
}

export function DashboardHuePanel() {
  const token = useGoogleAuthToken();
  const [state, setState] = React.useState<State>({ kind: "loading" });
  const [busy, setBusy] = React.useState<Set<string>>(() => new Set());

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
          ? { ...s, rooms: s.rooms.map((r) => (ids.has(r.id) ? { ...r, on: patch.on, brightness: patch.brightness ?? r.brightness } : r)) }
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
      if (results.some((ok) => !ok)) void load();
    },
    [token, load],
  );

  const anyOn = state.kind === "ready" && state.rooms.some((r) => r.on);

  return (
    <section
      aria-label="Verlichting"
      className="relative flex min-h-[96px] min-w-0 flex-1 flex-col overflow-hidden rounded-[24px] bg-[radial-gradient(120%_140%_at_0%_0%,#3a2f1c_0%,#1c1a2c_45%,#11101e_100%)] px-[18px] py-3.5 text-white shadow-[0_18px_40px_-26px_rgba(255,190,80,0.45)]"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] font-extrabold tracking-[0.08em] text-white/75">LICHT</span>
        {state.kind === "ready" && anyOn ? (
          <button
            type="button"
            onClick={() => void setRoom(state.rooms.filter((r) => r.on), { on: false })}
            className="h-7 rounded-pill bg-white/10 px-3 text-xs font-bold text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white [@media(hover:hover)]:hover:bg-white/[0.16]"
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
              <span key={i} className="h-full min-h-[72px] w-[52px] animate-pulse rounded-full bg-white/10" />
            ))}
          </div>
        ) : state.kind === "not-configured" ? (
          <p className="text-sm text-white/70">Philips Hue is nog niet ingesteld op deze versie van de app.</p>
        ) : state.kind === "not-connected" ? (
          <Link href="/profiel/hue" className="inline-flex h-11 items-center rounded-pill bg-white px-4 text-sm font-bold text-[#1c1a2c] no-underline">
            {state.reconnect ? "Koppel Philips Hue opnieuw" : "Koppel Philips Hue"}
          </Link>
        ) : state.kind === "error" ? (
          <p className="text-sm text-white/70">
            Hue is even niet bereikbaar.{" "}
            <button type="button" onClick={() => void load()} className="font-bold underline">
              Opnieuw
            </button>
          </p>
        ) : state.rooms.length === 0 ? (
          <p className="text-sm text-white/70">Geen kamers gevonden in je Hue-app.</p>
        ) : (
          <div className="-mx-[18px] flex h-full min-h-0 w-[calc(100%+36px)] gap-0 overflow-x-auto px-[18px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {state.rooms.map((room, i) => (
              <LampColumn key={room.id} room={room} index={i} busy={busy.has(room.id)} onChange={(patch) => void setRoom([room], patch)} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
