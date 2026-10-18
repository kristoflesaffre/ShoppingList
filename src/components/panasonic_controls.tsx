"use client";
import * as React from "react";
import { googleAuthHeaders, useGoogleAuthToken } from "@/lib/google-client";
import { AC_FANS, AC_MODES, type AcCommand, type AcDevice } from "@/lib/panasonic";
type State = { configured: boolean; connected: boolean; reconnect?: boolean; devices?: AcDevice[] };
const button = "min-h-11 rounded-xl border border-[var(--border-subtle)] px-4 py-2 font-semibold disabled:opacity-50";
export function PanasonicControls() {
  const token = useGoogleAuthToken();
  const [state, setState] = React.useState<State | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("");
  const load = React.useCallback(async (signal?: AbortSignal) => {
    if (!token) return;
    const response = await fetch("/api/panasonic/devices", { method: "POST", headers: googleAuthHeaders(token), cache: "no-store", signal });
    if (!response.ok) throw new Error();
    setState(await response.json());
  }, [token]);
  React.useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).catch(() => { if (!controller.signal.aborted) setMessage("Airco’s ophalen is niet gelukt. Probeer te vernieuwen."); });
    return () => controller.abort();
  }, [load]);
  const refresh = async () => { setBusy(true); setMessage(""); try { await load(); } catch { setMessage("Panasonic is tijdelijk niet bereikbaar. Probeer later opnieuw."); } finally { setBusy(false); } };
  const command = async (value: AcCommand) => {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/panasonic/control", { method: "POST", headers: { ...googleAuthHeaders(token), "content-type": "application/json" }, body: JSON.stringify(value) });
      const result = await response.json();
      if (!response.ok || !result.accepted) {
        if (result.reconnect) { setState(result); throw new Error("reconnect"); }
        throw new Error();
      }
      setMessage("Opdracht verstuurd. De airco kan even nodig hebben om de nieuwe stand te tonen.");
      await load();
    } catch {
      setMessage("De wijziging kon niet bevestigd worden. Vernieuw eerst de status voordat je opnieuw probeert.");
    } finally { setBusy(false); }
  };
  const disconnect = async () => {
    setBusy(true);
    try {
      const response = await fetch("/api/panasonic/disconnect", { method: "POST", headers: googleAuthHeaders(token) });
      if (!response.ok) throw new Error();
      setState({ configured: true, connected: false }); setMessage("De koppeling met je gezinsapp is verwijderd.");
    } catch { setMessage("Ontkoppelen is niet gelukt. Probeer opnieuw."); }
    finally { setBusy(false); }
  };
  return <section className="flex flex-col gap-5" aria-label="Panasonic airco’s" aria-busy={busy}>
    <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold">Comfort Cloud</h2><button className={button} disabled={busy || !token} onClick={() => void refresh()}>Vernieuwen</button></div>
    {message && <p role="status" className="text-sm">{message}</p>}
    {!state && !message && <p role="status">Airco’s ophalen…</p>}
    {state && !state.connected && <div className="rounded-2xl bg-[var(--white)] p-5"><h3 className="font-bold">{state.reconnect ? "Opnieuw koppelen" : "Je airco’s koppelen"}</h3><p className="mt-2">Open op je Mac het bestand <strong>panasonic-koppelen.command</strong> in de map <strong>ShoppingList → scripts</strong>. Meld je daar aan bij Comfort Cloud. Je wachtwoord wordt niet bewaard.</p><p className="mt-2">Klik daarna hier op Vernieuwen. De koppeling werkt vervolgens ook op je andere toestellen waarop je met hetzelfde gezinsapp-account bent aangemeld.</p>{!state.configured && <p className="mt-2">De serverinstellingen ontbreken nog. Rond eerst de installatie op je Mac af.</p>}</div>}
    {state?.connected && state.devices?.length === 0 && <p>Geen airco’s gevonden bij dit account.</p>}
    {state?.connected && state.devices?.map(device => <div key={device.id} className="flex flex-col gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--white)] p-5">
      <div className="flex items-center justify-between gap-3"><div><h3 className="text-lg font-bold">{device.name}</h3><p className="text-sm">{!device.available ? "Niet bereikbaar" : `${device.on === null ? "Stand onbekend" : device.on ? "Aan" : "Uit"}${device.insideTemperature !== null ? ` · Binnen ${device.insideTemperature} °C` : ""}`}</p></div><button className={button} aria-label={`${device.name} ${device.on ? "uitzetten" : "aanzetten"}`} disabled={busy || !device.available || device.on === null} onClick={() => void command({ deviceId: device.id, power: !device.on })}>{device.on ? "Uitzetten" : "Aanzetten"}</button></div>
      <fieldset disabled={busy || !device.available || !device.on} className="grid gap-4 disabled:opacity-50 sm:grid-cols-3">
        <div className="flex flex-col gap-2 text-sm font-semibold"><span>Temperatuur</span><div className="flex items-center gap-2"><button className={button} aria-label={`${device.name} kouder`} disabled={device.targetTemperature === null || device.targetTemperature <= 16} onClick={() => device.targetTemperature !== null && void command({ deviceId: device.id, temperature: device.targetTemperature - 0.5 })}>−</button><span className="min-w-16 text-center">{device.targetTemperature ?? "—"} °C</span><button className={button} aria-label={`${device.name} warmer`} disabled={device.targetTemperature === null || device.targetTemperature >= 30} onClick={() => device.targetTemperature !== null && void command({ deviceId: device.id, temperature: device.targetTemperature + 0.5 })}>+</button></div></div>
        <label className="flex flex-col gap-2 text-sm font-semibold">Modus<select className={button} value={device.mode ?? ""} onChange={event => void command({ deviceId: device.id, mode: event.target.value as AcCommand["mode"] })}><option value="" disabled>Onbekend</option>{device.modes.map(mode => <option key={mode} value={mode}>{AC_MODES[mode]}</option>)}</select></label>
        <label className="flex flex-col gap-2 text-sm font-semibold">Ventilator<select className={button} value={device.fan ?? ""} onChange={event => void command({ deviceId: device.id, fan: event.target.value as AcCommand["fan"] })}><option value="" disabled>Onbekend</option>{Object.entries(AC_FANS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </fieldset>
      {!device.on && device.available && <p className="text-sm">Zet de airco eerst aan om de instellingen te wijzigen.</p>}
    </div>)}
    {state?.connected && <button className={`${button} self-start`} disabled={busy} onClick={() => void disconnect()}>Comfort Cloud ontkoppelen</button>}
  </section>;
}
