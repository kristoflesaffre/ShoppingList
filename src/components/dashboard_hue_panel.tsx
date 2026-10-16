"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { googleAuthHeaders, useGoogleAuthToken } from "@/lib/google-client";

/**
 * Philips Hue op het avonddashboard (eerste, eenvoudige versie): per kamer een knop aan/uit en «Alles uit».
 * Werkt via /api/hue/rooms en /api/hue/light (Hue-cloud, koppeling in Profiel → Philips Hue).
 */

type Room = { id: string; name: string; archetype: string; on: boolean; brightness: number | null };
type State =
  | { kind: "loading" }
  | { kind: "not-configured" }
  | { kind: "not-connected"; reconnect: boolean }
  | { kind: "error" }
  | { kind: "ready"; rooms: Room[] };

function Bulb({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5">
      {on ? <circle cx="12" cy="10" r="9" fill="#ffd466" opacity="0.35" /> : null}
      <path
        d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V17h5.2v-1.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"
        fill={on ? "#ffcf4a" : "none"}
        stroke={on ? "#ffcf4a" : "currentColor"}
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path d="M9.6 19.5h4.8M10.4 21.5h3.2" stroke={on ? "#ffcf4a" : "currentColor"} strokeWidth={1.8} strokeLinecap="round" />
    </svg>
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
    async (rooms: Room[], on: boolean) => {
      const ids = new Set(rooms.map((r) => r.id));
      // Meteen tonen; bij een fout terugzetten.
      setState((s) => (s.kind === "ready" ? { ...s, rooms: s.rooms.map((r) => (ids.has(r.id) ? { ...r, on } : r)) } : s));
      setBusy((b) => new Set(Array.from(b).concat(Array.from(ids))));
      const results = await Promise.all(
        rooms.map((r) =>
          fetch("/api/hue/light", {
            method: "POST",
            headers: { ...googleAuthHeaders(token), "content-type": "application/json" },
            body: JSON.stringify({ id: r.id, on }),
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
            onClick={() => void setRoom(state.rooms.filter((r) => r.on), false)}
            className="h-7 rounded-pill bg-white/10 px-3 text-xs font-bold text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white [@media(hover:hover)]:hover:bg-white/[0.16]"
          >
            Alles uit
          </button>
        ) : null}
      </div>

      <div className="mt-2.5 flex min-h-0 flex-1 items-center">
        {state.kind === "loading" ? (
          <div className="flex gap-2" aria-busy aria-label="Lampen laden">
            {[0, 1, 2].map((i) => (
              <span key={i} className="h-12 w-[120px] animate-pulse rounded-[16px] bg-white/10" />
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
          <div className="-mx-[18px] flex gap-2 overflow-x-auto px-[18px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {state.rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                aria-pressed={room.on}
                disabled={busy.has(room.id)}
                onClick={() => void setRoom([room], !room.on)}
                className={cn(
                  "flex h-12 shrink-0 items-center gap-2 rounded-[16px] pl-3 pr-4 text-left transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-70",
                  room.on ? "bg-[rgba(255,207,74,0.18)] shadow-[inset_0_0_0_1px_rgba(255,207,74,0.45)]" : "bg-white/[0.07] text-white/70 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12)]",
                )}
              >
                <Bulb on={room.on} />
                <span className="flex flex-col leading-tight">
                  <span className="text-sm font-bold">{room.name}</span>
                  <span className="text-[11.5px] font-semibold opacity-70">{room.on ? (room.brightness != null ? `Aan · ${room.brightness}%` : "Aan") : "Uit"}</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
