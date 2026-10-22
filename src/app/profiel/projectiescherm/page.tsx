"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { googleAuthHeaders, useGoogleAuthToken } from "@/lib/google-client";
import { PageBackButton } from "@/components/ui/page_back_button";
import type { ScreenStatus as ScreenState } from "@/lib/projection-screen";
type Action = "up" | "stop" | "down" | "calibrate" | "preset";
const buttonClass = "flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl border border-[var(--border-subtle)] px-3 py-4 font-bold disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]";
export default function ScreenPage() {
  const { user, isLoading } = db.useAuth();
  const token = useGoogleAuthToken();
  const router = useRouter();
  const [screen, setScreen] = React.useState<ScreenState | null>(null);
  const [armed, setArmed] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("Verbinding controleren…");
  React.useEffect(() => { if (!isLoading && !user) router.replace("/auth"); }, [isLoading, user, router]);
  const call = React.useCallback(async (action: Action | "status", signal?: AbortSignal) => {
    const response = await fetch("/api/broadlink", { method: "POST", headers: { ...googleAuthHeaders(token), "content-type": "application/json" }, body: JSON.stringify({ action }), signal });
    const data = await response.json();
    if (!response.ok || (action !== "status" && !data.accepted)) throw new Error();
    return data as ScreenState;
  }, [token]);
  React.useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    void call("status", controller.signal).then(data => { if (!controller.signal.aborted) { setScreen(data); setMessage(data.paused ? "Bediening gepauzeerd wegens onverwacht gedrag van het scherm. Gebruik de appknoppen voorlopig niet." : data.configured ? "De schermbediening staat klaar." : "Open de lokale app op je MacBook voor deze bediening."); } }).catch(() => { if (!controller.signal.aborted) setMessage("Bediening niet beschikbaar. Open de lokale app op je MacBook met het gekoppelde account."); });
    return () => controller.abort();
  }, [call, token]);
  React.useEffect(() => {
    if (!screen?.calibrating && !screen?.running) return;
    const controller = new AbortController();
    const timer = window.setInterval(() => { void call("status", controller.signal).then(data => { if (!controller.signal.aborted) setScreen(data); }).catch(() => {}); }, 1500);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [call, screen?.calibrating, screen?.running]);
  const send = async (action: Action) => {
    if (busy && action !== "stop") return;
    setBusy(true);
    if (action === "preset") setScreen(current => current ? { ...current, running: true } : current);
    setMessage(action === "preset" ? "Omhoog gestart; je Mac verstuurt Stop na de opgeslagen tijd." : "Opdracht versturen…");
    try {
      const data = await call(action);
      setScreen(value => ({ ...value, ...data }));
      if (action === "calibrate") { setArmed(false); setMessage("Meting loopt. Druk op Stop zodra het scherm op de juiste hoogte staat."); }
      else if (action === "stop" && data.durationSeconds && screen?.calibrating) setMessage(`Hoogte opgeslagen: ${data.durationSeconds.toFixed(3)} seconden tussen Omhoog en Stop.`);
      else if (["down", "up", "preset"].includes(action) && data.projector?.configured) setMessage(`Schermopdracht verstuurd. ${data.projector.isOn === (action !== "down") ? (action === "down" ? "Projector staat uit." : "Projector staat aan.") : data.projector.accepted ? (action === "down" ? "Uitschakelcommando verstuurd." : "Wekcommando verstuurd.") : "Projector niet bereikbaar; gebruik de afstandsbediening."}`);
      else setMessage(`${action === "up" ? "Omhoog" : action === "down" ? "Omlaag" : "Stop"} verstuurd. Controleer het scherm.`);
    } catch { setMessage("De opdracht kon niet bevestigd worden. Controleer het scherm. Je kunt altijd op Stop drukken."); }
    finally { setBusy(false); }
  };
  if (!user) return null;
  const ready = screen?.configured === true;
  const moving = screen?.calibrating || screen?.running;
  return <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 pb-28 pt-28"><PageBackButton href="/profiel" /><header><h1 className="text-3xl font-bold">Projectiescherm</h1><p className="mt-2 text-[var(--text-secondary)]">Bediening via je BroadLink RM4 Pro.</p></header>
    <section className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--white)] p-6">
      <div className="grid grid-cols-3 gap-3">{([['up', '↑', 'Omhoog'], ['stop', '■', 'Stop'], ['down', '↓', 'Omlaag']] as const).map(([action, icon, label]) => <button key={action} disabled={!ready || (action !== "stop" && (busy || moving))} onClick={() => void send(action === "up" && armed ? "calibrate" : action)} className={buttonClass}><span aria-hidden className="text-3xl">{icon}</span>{label}</button>)}</div>
      <p role="status" aria-live="polite" className="mt-5 text-sm">{message}</p>
      {screen?.projectorConfigured && <p className="mt-2 text-sm text-[var(--text-secondary)]">Omhoog / Mijn hoogte: projector aan. Omlaag: projector uit. Stop en kalibratie veranderen de projector niet.</p>}
    </section>
    <section className="flex flex-col gap-4 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--white)] p-6"><h2 className="text-xl font-bold">Mijn hoogte</h2>
      <p className="text-sm">Begin steeds met het scherm helemaal omlaag. De app herhaalt de tijd tussen Omhoog en Stop; het scherm geeft geen positie terug.</p>
      {screen?.durationSeconds != null && <><p className="font-semibold">Opgeslagen tijd: {screen.durationSeconds.toFixed(3)} s</p><button className={buttonClass} disabled={!ready || busy || moving} onClick={() => void send("preset")}>Naar mijn hoogte ↑ ■</button></>}
      {armed ? <div className="flex flex-col gap-3"><p role="status">Zet het scherm eerst helemaal omlaag. Druk daarna bovenaan op Omhoog en vervolgens op Stop bij de gewenste hoogte. De Mac meet en bewaart de tijd. Na maximaal 60 seconden wordt automatisch Stop verstuurd.</p><button className="min-h-11 self-start font-semibold underline" onClick={() => setArmed(false)}>Instellen annuleren</button></div> : <button className="min-h-12 rounded-xl border border-[var(--border-subtle)] px-4 py-3 font-semibold disabled:opacity-50" disabled={!ready || busy || moving} onClick={() => { setArmed(true); setMessage("Hoogte instellen staat klaar. Zet het scherm helemaal omlaag en druk dan op Omhoog."); }}>{screen?.durationSeconds ? "Hoogte opnieuw instellen" : "Hoogte instellen"}</button>}
    </section>
    <p className="text-sm text-[var(--text-secondary)]">Je MacBook moet wakker blijven en op hetzelfde thuisnetwerk zitten. De tijd wordt op je Mac gemeten en uitgevoerd; wifi en de motor kunnen een kleine afwijking veroorzaken. Stop onderbreekt een automatische reeks.</p>
  </main>;
}
