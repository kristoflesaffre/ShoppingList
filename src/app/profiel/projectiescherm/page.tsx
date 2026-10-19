"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { googleAuthHeaders, useGoogleAuthToken } from "@/lib/google-client";
import { PageBackButton } from "@/components/ui/page_back_button";
export default function ScreenPage() {
  const { user, isLoading } = db.useAuth();
  const token = useGoogleAuthToken();
  const router = useRouter();
  const [ready, setReady] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("Verbinding controleren…");
  React.useEffect(() => { if (!isLoading && !user) router.replace("/auth"); }, [isLoading, user, router]);
  React.useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    void fetch("/api/broadlink", { method: "POST", headers: { ...googleAuthHeaders(token), "content-type": "application/json" }, body: JSON.stringify({ action: "status" }), signal: controller.signal }).then(async response => {
      const data = await response.json();
      if (!controller.signal.aborted) { setReady(response.ok && data.configured === true); setMessage(response.ok && data.configured ? "De drie knoppen staan klaar." : data.error === "mac-required" ? "Open de lokale app op je MacBook voor deze bediening." : "De schermbediening is nog niet beschikbaar voor dit account."); }
    }).catch(() => { if (!controller.signal.aborted) setMessage("Verbinding niet beschikbaar. Probeer de pagina opnieuw te openen."); });
    return () => controller.abort();
  }, [token]);
  const send = async (action: "up" | "stop" | "down") => {
    if (busy) return;
    setBusy(true); setMessage("Opdracht versturen…");
    try {
      const response = await fetch("/api/broadlink", { method: "POST", headers: { ...googleAuthHeaders(token), "content-type": "application/json" }, body: JSON.stringify({ action }) });
      const data = await response.json();
      if (!response.ok || !data.accepted) throw new Error();
      setMessage(`${action === "up" ? "Omhoog" : action === "down" ? "Omlaag" : "Stop"} verstuurd. Controleer het scherm.`);
    } catch { setMessage("Niet bevestigd of de opdracht is uitgevoerd. Controleer het scherm voordat je opnieuw drukt."); }
    finally { setBusy(false); }
  };
  if (!user) return null;
  return <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-28 pt-28"><PageBackButton href="/profiel" /><header><h1 className="text-3xl font-bold">Projectiescherm</h1><p className="mt-2 text-[var(--text-secondary)]">Bediening via je BroadLink RM4 Pro.</p></header><section className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--white)] p-6"><div className="grid grid-cols-3 gap-3">{([['up', '↑', 'Omhoog'], ['stop', '■', 'Stop'], ['down', '↓', 'Omlaag']] as const).map(([action, icon, label]) => <button key={action} disabled={!ready || busy} onClick={() => void send(action)} className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--border-subtle)] px-3 py-4 font-bold disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"><span aria-hidden className="text-3xl">{icon}</span>{label}</button>)}</div><p role="status" aria-live="polite" className="mt-5 text-sm">{message}</p></section><p className="text-sm text-[var(--text-secondary)]">Je MacBook moet wakker blijven en met hetzelfde thuisnetwerk verbonden zijn. Het scherm geeft geen positie terug aan de app.</p></main>;
}
