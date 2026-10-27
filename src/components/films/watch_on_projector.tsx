"use client";

import * as React from "react";
import { useGoogleAuthToken } from "@/lib/google-client";
import { awaitProjectorReceipt } from "@/lib/projector-client";
import { stremioLink, type StremioTarget } from "@/lib/stremio";
import { ScreenIcon } from "@/components/dashboard_screen_panel";

let launching = false;

export function WatchOnProjector({ imdbId, type, tmdbId, season, episode }: {
  imdbId?: string | null; type: "movie" | "tv"; tmdbId?: string | number; season?: number; episode?: number;
}) {
  const token = useGoogleAuthToken();
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  async function watch() {
    if (!token || launching) return;
    launching = true;
    setBusy(true);
    setMessage("Verbinding met Woonkamer TV controleren…");
    const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
    try {
      const status = await fetch("/api/projector/stremio", { headers, cache: "no-store" });
      if (!status.ok || !(await status.json()).available) throw new Error("De Pi-koppeling is niet bereikbaar. Er is geen kijkopdracht verstuurd.");
      let resolved = imdbId;
      if (!resolved && tmdbId) {
        const response = await fetch(`/api/films/detail?type=${type}&id=${encodeURIComponent(tmdbId)}`);
        if (response.ok) resolved = (await response.json()).imdbId;
      }
      const target: StremioTarget = { imdbId: resolved ?? "", type, ...(season !== undefined ? { season } : {}), ...(episode !== undefined ? { episode } : {}) };
      try { stremioLink(target); } catch { throw new Error("Geen geldige Stremio-koppeling voor deze titel beschikbaar."); }
      setMessage("Pi controleert de Samsung-tv, activeert Cinema-verlichting en opent Stremio op de projector…");
      const response = await fetch("/api/projector/stremio", { method: "POST", headers, body: JSON.stringify(target) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error === "relay-busy" ? "Er loopt al een projectoropdracht. Wacht tot die klaar is." : "De Pi heeft de opdracht niet aangenomen.");
      const result = data.pending ? await awaitProjectorReceipt(data, token, undefined, 185_000) : data;
      if (!result.accepted) {
        if (result.detail === "screen-closed-confirmation-stale") throw new Error("Geen recente bevestiging dat het scherm gesloten is. Het scherm wordt niet geopend. Sluit het handmatig en probeer binnen twee minuten opnieuw.");
        if (typeof result.detail === "string" && result.detail.startsWith("screen-")) throw new Error("Het scherm kon niet veilig worden geopend: controleer de schermsensor, batterij en BroadLink. De cinemastart is gestopt; er wordt niets herhaald.");
        if (result.detail === "samsung-state-unknown") throw new Error("De aan/uit-status van de Samsung-tv is onbekend. De cinemastart is gestopt; controleer de tv-koppeling.");
        if (result.detail === "samsung-off-not-confirmed") throw new Error("Uitschakelen van de Samsung-tv is niet bevestigd. De cinemastart is gestopt; er wordt niets herhaald.");
        throw new Error("De Pi kon de kijkopdracht niet volledig bevestigen. Controleer projector en verlichting; er wordt niets herhaald.");
      }
      setMessage("Samsung-tv staat uit, Cinema-verlichting geactiveerd en titelopdracht naar Stremio op Woonkamer TV verstuurd. Kies daar zo nodig een bron.");
      try { localStorage.setItem("dashboard-film-mode", "on"); window.dispatchEvent(new Event("dashboard-film-mode")); } catch { /* Storage is optional. */ }
    } catch (error) {
      setMessage(error instanceof Error && error.name !== "TimeoutError" ? error.message : "Geen bevestiging ontvangen. Controleer de projector; er wordt niets herhaald.");
    } finally { launching = false; setBusy(false); }
  }
  return <div className="flex min-w-0 flex-col items-start gap-2">
    <button type="button" onClick={() => void watch()} disabled={!token || busy || (!imdbId && !tmdbId)} aria-busy={busy}
      className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-lg bg-[var(--blue-500)] px-4 py-2.5 text-sm font-bold text-fixed-white transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 disabled:opacity-40">
      <ScreenIcon kind="preset" /><span>{busy ? "Even wachten…" : "Kijk op projector"}</span>
    </button>
    {message ? <p role="status" aria-live="polite" className="max-w-md text-sm leading-5 text-[var(--text-secondary)]">{message}</p> : null}
  </div>;
}
