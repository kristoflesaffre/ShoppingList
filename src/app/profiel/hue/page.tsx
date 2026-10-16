"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { googleAuthHeaders, useGoogleAuthToken } from "@/lib/google-client";
import { PageBackButton } from "@/components/ui/page_back_button";
import { RouteLoadingSpinner } from "@/components/ui/route_loading_spinner";

type Status = { configured: boolean; connected: boolean; reconnect?: boolean };
const BUTTON = "inline-flex min-h-12 items-center justify-center self-start rounded-pill bg-action-primary px-5 text-base font-bold text-white disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2";

export default function HueSettingsPage() {
  const router = useRouter();
  const { user, isLoading } = db.useAuth();
  const token = useGoogleAuthToken();
  const [status, setStatus] = React.useState<Status | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => { if (!isLoading && !user) router.replace("/auth"); }, [isLoading, user, router]);
  React.useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("hue");
    if (result) {
      setMessage(result === "connected" ? "Philips Hue is gekoppeld." : result === "cancelled" ? "Koppelen geannuleerd." : "Koppelen is niet gelukt. Controleer of je Hue Bridge online is en aan je Hue-account is gekoppeld.");
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  const load = React.useCallback(async () => {
    if (!token) return;
    setFailed(false);
    try {
      const response = await fetch("/api/hue/status", { method: "POST", headers: googleAuthHeaders(token), cache: "no-store" });
      if (!response.ok) throw new Error();
      setStatus(await response.json() as Status);
    } catch { setFailed(true); }
  }, [token]);
  React.useEffect(() => { void load(); }, [load]);

  const act = async (action: "connect" | "disconnect") => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/hue/${action}`, { method: "POST", headers: googleAuthHeaders(token) });
      if (!response.ok) throw new Error();
      const data = await response.json() as { url?: string };
      if (action === "connect") {
        if (!data.url || new URL(data.url).origin !== "https://api.meethue.com") throw new Error();
        window.location.assign(data.url);
      } else {
        setStatus({ configured: true, connected: false });
        setMessage("Hue is ontkoppeld in deze browser. Je kunt de toegang ook intrekken in je Hue-account.");
      }
    } catch { setMessage("Dit is niet gelukt. Probeer het opnieuw."); }
    finally { setBusy(false); }
  };

  if (isLoading || !user) return <RouteLoadingSpinner />;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[560px] flex-col gap-5 px-4 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-[calc(24px+env(safe-area-inset-top,0px))] lg:pt-10">
      <div className="flex items-center gap-3">
        <PageBackButton href="/profiel" label="Terug naar je profiel" />
        <h1 className="text-[30px] font-bold leading-9 tracking-tight text-text-primary">Philips Hue</h1>
      </div>
      <p className="text-sm leading-5 text-[var(--text-secondary)]">Koppel je Hue-account en Bridge om je verlichting vanuit de app te bedienen. &apos;s Avonds staat er op het dashboard een paneel om per kamer het licht aan of uit te zetten.</p>
      {message && <p role="status" className="text-sm text-text-primary">{message}</p>}
      <section aria-label="Hue-koppeling" className="rounded-[20px] bg-[var(--white)] p-5 shadow-card">
        {failed ? <div role="alert"><p>De verbindingsstatus is tijdelijk niet beschikbaar.</p><button className="mt-3 underline" onClick={() => void load()}>Opnieuw proberen</button></div>
          : !status ? <p role="status">Verbinding controleren…</p>
          : !status.configured ? <p>Philips Hue is nog niet ingesteld voor deze versie van de app.</p>
          : <div className="flex flex-col gap-4">
            <p className="font-semibold">{status.connected ? "Hue-account gekoppeld" : status.reconnect ? "Koppel je Hue-account opnieuw" : "Nog geen Hue-account gekoppeld"}</p>
            <button type="button" className={BUTTON} disabled={busy || !token} onClick={() => void act(status.connected ? "disconnect" : "connect")}>
              {busy ? "Even wachten…" : status.connected ? "Ontkoppelen" : "Koppel Philips Hue"}
            </button>
          </div>}
      </section>
      <p className="text-sm leading-5 text-[var(--text-secondary)]">Deze koppeling geldt voor deze browser of geïnstalleerde app. Koppel Hue apart op je andere toestellen en op de andere website.</p>
      <a href="https://account.meethue.com/" target="_blank" rel="noreferrer" className="self-start text-sm font-semibold text-action-primary underline">Beheer toegang in je Hue-account</a>
    </main>
  );
}
