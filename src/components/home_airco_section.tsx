"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { googleAuthHeaders, useGoogleAuthToken } from "@/lib/google-client";
import { AC_FANS, AC_MODES, type AcCommand, type AcDevice, type AcFan, type AcMode } from "@/lib/panasonic";
import { HomeOnboardingEmptyCard } from "@/components/home_onboarding_empty_card";
import { MiniButton } from "@/components/ui/mini_button";

type State =
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "not-configured" }
  | { kind: "not-connected"; reconnect: boolean }
  | { kind: "ready"; devices: AcDevice[] };

/** Lokale stand na een tik: Comfort Cloud toont een wijziging pas na enkele seconden, dus zolang tonen. */
type Override = Partial<Pick<AcDevice, "on" | "targetTemperature" | "mode" | "fan">> & { until: number };

const HOLD_MS = 15_000;
const SEND_DELAY_MS = 800;
const FAN_ORDER = Object.keys(AC_FANS) as AcFan[];

function useAirco() {
  const token = useGoogleAuthToken();
  const [state, setState] = React.useState<State>({ kind: "loading" });
  const [overrides, setOverrides] = React.useState<Record<string, Override>>({});
  const [error, setError] = React.useState<string | null>(null);
  const timers = React.useRef(new Map<string, number>());
  const pending = React.useRef(new Map<string, Omit<AcCommand, "deviceId">>());

  const load = React.useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/panasonic/devices", { method: "POST", headers: googleAuthHeaders(token), cache: "no-store" });
      const data = (await res.json().catch(() => null)) as { configured?: boolean; connected?: boolean; reconnect?: boolean; devices?: AcDevice[] } | null;
      if (!res.ok || !data) throw new Error();
      if (data.configured === false) setState({ kind: "not-configured" });
      else if (!data.connected) setState({ kind: "not-connected", reconnect: data.reconnect === true });
      else setState({ kind: "ready", devices: data.devices ?? [] });
    } catch {
      setState((s) => (s.kind === "ready" ? s : { kind: "error" }));
    }
  }, [token]);

  React.useEffect(() => {
    void load();
    const onVisible = () => document.visibilityState === "visible" && void load();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [load]);

  React.useEffect(() => {
    if (!error) return;
    const id = window.setTimeout(() => setError(null), 4500);
    return () => window.clearTimeout(id);
  }, [error]);

  const send = React.useCallback(
    async (deviceId: string, command: Omit<AcCommand, "deviceId">) => {
      try {
        const res = await fetch("/api/panasonic/control", {
          method: "POST",
          headers: { ...googleAuthHeaders(token), "content-type": "application/json" },
          body: JSON.stringify({ deviceId, ...command }),
        });
        const data = (await res.json().catch(() => ({}))) as { accepted?: boolean; reconnect?: boolean; error?: string };
        if (!res.ok || !data.accepted) {
          if (data.reconnect) setState({ kind: "not-connected", reconnect: true });
          throw new Error(data.error);
        }
        // Bevestiging komt van een latere uitlezing.
        window.setTimeout(() => void load(), 6000);
      } catch (e) {
        setOverrides(({ [deviceId]: _, ...rest }) => rest);
        setError(
          (e as Error).message === "device-off"
            ? "Zet de airco eerst aan."
            : (e as Error).message === "device-unavailable"
              ? "Die airco is nu niet bereikbaar."
              : "De airco reageerde niet. Probeer zo opnieuw.",
        );
      }
    },
    [token, load],
  );

  /** Toont de wijziging meteen; stuurt ze na een korte pauze (meerdere tikken = één opdracht). */
  const change = React.useCallback(
    (deviceId: string, command: Omit<AcCommand, "deviceId">, immediate = false) => {
      setOverrides((o) => ({
        ...o,
        [deviceId]: {
          ...o[deviceId],
          ...("power" in command ? { on: command.power } : {}),
          ...("temperature" in command ? { targetTemperature: command.temperature } : {}),
          ...("mode" in command ? { mode: command.mode } : {}),
          ...("fan" in command ? { fan: command.fan } : {}),
          until: Date.now() + HOLD_MS,
        },
      }));
      const merged = { ...pending.current.get(deviceId), ...command };
      pending.current.set(deviceId, merged);
      window.clearTimeout(timers.current.get(deviceId));
      timers.current.set(
        deviceId,
        window.setTimeout(() => {
          const next = pending.current.get(deviceId);
          pending.current.delete(deviceId);
          if (next) void send(deviceId, next);
        }, immediate ? 0 : SEND_DELAY_MS),
      );
    },
    [send],
  );

  const now = Date.now();
  const devices =
    state.kind === "ready"
      ? state.devices.map((d) => {
          const o = overrides[d.id];
          if (!o || o.until < now) return d;
          const { until: _, ...rest } = o;
          return { ...d, ...rest };
        })
      : [];

  // Na de wachttijd opnieuw tekenen, zodat de stand van de server weer telt.
  const [, tick] = React.useReducer((n: number) => n + 1, 0);
  React.useEffect(() => {
    const ends = Object.values(overrides).map((o) => o.until - Date.now()).filter((ms) => ms > 0);
    if (!ends.length) return;
    const id = window.setTimeout(tick, Math.min(...ends) + 50);
    return () => window.clearTimeout(id);
  }, [overrides]);

  return { state, devices, change, error, load };
}

// ─── Iconen ─────────────────────────────────────────────────────────────────

const MODE_ICON: Record<AcMode, React.ReactNode> = {
  auto: <path d="M7.5 17 12 6l4.5 11M9.2 13h5.6" />,
  cool: <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 6l2.5-1.5M9.5 19.5 12 18l2.5 1.5" />,
  heat: (
    <>
      <circle cx="12" cy="12" r="3.6" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
    </>
  ),
  dry: <path d="M12 3.5c3.2 4 5.5 7.2 5.5 10.2a5.5 5.5 0 0 1-11 0c0-3 2.3-6.2 5.5-10.2z" />,
  fan: <path d="M12 12c0-3.5 1-7 3.4-7 1.9 0 2.6 2 1.6 3.6C15.8 10.4 13.7 11.4 12 12zm0 0c3.5 0 7 1 7 3.4 0 1.9-2 2.6-3.6 1.6-1.8-1.2-2.8-3.3-3.4-5zm0 0c0 3.5-1 7-3.4 7-1.9 0-2.6-2-1.6-3.6C8.2 13.6 10.3 12.6 12 12zm0 0c-3.5 0-7-1-7-3.4 0-1.9 2-2.6 3.6-1.6 1.8 1.2 2.8 3.3 3.4 5z" />,
};

function ModeIcon({ mode, className = "size-[18px]" }: { mode: AcMode; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      {MODE_ICON[mode]}
    </svg>
  );
}

/** Kleur van de schakelaar en de actieve modus: warm bij verwarmen, koel bij koelen. */
function accent(mode: AcMode | null) {
  return mode === "heat" ? "#ff8a3d" : mode === "cool" ? "#3d8bff" : "#22a89a";
}

// ─── Onderdelen ─────────────────────────────────────────────────────────────

function PowerSwitch({ label, on, color, disabled, onToggle }: { label: string; on: boolean; color: string; disabled?: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${label}: ${on ? "uitzetten" : "aanzetten"}`}
      disabled={disabled}
      onClick={onToggle}
      style={on ? { background: color, boxShadow: `0 6px 16px -8px ${color}` } : undefined}
      className={cn(
        "relative h-[30px] w-[52px] shrink-0 rounded-full transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3d8bff] focus-visible:ring-offset-2 disabled:opacity-50",
        !on && "bg-[rgba(16,17,48,0.14)] [[data-theme=dark]_&]:bg-fixed-white/[0.16]",
      )}
    >
      <span className={cn("absolute top-[3px] size-6 rounded-full bg-fixed-white shadow-[0_1px_3px_rgba(16,17,48,0.25)] transition-[left] duration-fast ease-out-strong", on ? "left-[25px]" : "left-[3px]")} />
    </button>
  );
}

const fmt = (t: number) => `${String(t).replace(".", ",")}°`;

function StepButton({ label, children, disabled, onClick }: { label: string; children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[rgba(16,17,48,0.06)] text-[22px] font-semibold leading-none text-[var(--text-primary)] transition-transform active:scale-95 disabled:opacity-35 [[data-theme=dark]_&]:bg-fixed-white/10"
    >
      {children}
    </button>
  );
}

function AircoCard({ device, onChange }: { device: AcDevice; onChange: (command: Omit<AcCommand, "deviceId">, immediate?: boolean) => void }) {
  const color = accent(device.mode);
  const live = device.available && device.on === true;
  const t = device.targetTemperature;
  const fanIndex = device.fan ? FAN_ORDER.indexOf(device.fan) : -1;
  return (
    <section
      aria-label={device.name}
      className="flex w-[232px] shrink-0 snap-start flex-col gap-4 rounded-[24px] bg-white p-4 shadow-[0_1px_2px_rgba(16,17,48,0.06)] lg:w-auto [[data-theme=dark]_&]:bg-fixed-white/[0.07]"
    >
      <div className="flex items-center justify-between gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- lokale UI-illustratie */}
        <img
          src="/images/ui/airco_96.webp"
          srcSet="/images/ui/airco_96.webp 1x, /images/ui/airco_160.webp 2x"
          alt=""
          aria-hidden
          className={cn("-my-1 size-10 shrink-0 object-contain transition-[filter,opacity]", device.on !== true && "opacity-60 grayscale")}
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-bold leading-5 text-[var(--text-primary)]">{device.name}</h3>
          <p className="mt-0.5 text-[12px] font-medium leading-4 text-[var(--text-secondary)]">
            {!device.available ? "Niet bereikbaar" : device.insideTemperature !== null ? `Binnen ${fmt(device.insideTemperature)}` : device.on ? "Aan" : "Uit"}
          </p>
        </div>
        <PowerSwitch
          label={device.name}
          on={device.on === true}
          color={color}
          disabled={!device.available || device.on === null}
          onToggle={() => onChange({ power: !device.on }, true)}
        />
      </div>

      <div className={cn("flex items-center justify-between gap-2 transition-opacity", !live && "opacity-40")}>
        <StepButton label={`${device.name} kouder`} disabled={!live || t === null || t <= 16} onClick={() => t !== null && onChange({ temperature: t - 0.5 })}>
          −
        </StepButton>
        <span className="text-center text-[40px] font-bold leading-none tracking-[-0.03em] tabular-nums text-[var(--text-primary)]" aria-live="polite">
          {t === null ? "—" : fmt(t)}
        </span>
        <StepButton label={`${device.name} warmer`} disabled={!live || t === null || t >= 30} onClick={() => t !== null && onChange({ temperature: t + 0.5 })}>
          +
        </StepButton>
      </div>

      <div className={cn("flex flex-col gap-2 transition-opacity", !live && "opacity-40")}>
        <div role="radiogroup" aria-label={`${device.name} modus`} className="flex justify-between gap-1">
          {device.modes.map((mode) => {
            const active = device.mode === mode;
            return (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={AC_MODES[mode]}
                title={AC_MODES[mode]}
                disabled={!live}
                onClick={() => !active && onChange({ mode }, true)}
                style={active ? { background: accent(mode), color: "#fff" } : undefined}
                className={cn(
                  "flex h-9 flex-1 items-center justify-center rounded-full transition-colors",
                  !active && "bg-[rgba(16,17,48,0.05)] text-[var(--text-secondary)] [[data-theme=dark]_&]:bg-fixed-white/[0.08]",
                )}
              >
                <ModeIcon mode={mode} />
              </button>
            );
          })}
        </div>
        {/* Ventilator: één tik = volgende stand (Automatisch → Laag → … → Hoog → Automatisch). */}
        <button
          type="button"
          disabled={!live}
          aria-label={`${device.name} ventilator: ${device.fan ? AC_FANS[device.fan] : "onbekend"}. Tik voor de volgende stand.`}
          onClick={() => onChange({ fan: FAN_ORDER[(fanIndex + 1) % FAN_ORDER.length] })}
          className="flex h-9 items-center justify-between gap-2 rounded-full bg-[rgba(16,17,48,0.05)] pl-3 pr-3.5 text-[12px] font-bold text-[var(--text-secondary)] [[data-theme=dark]_&]:bg-fixed-white/[0.08]"
        >
          <span className="flex items-center gap-1.5">
            <ModeIcon mode="fan" className="size-4" />
            {device.fan ? AC_FANS[device.fan] : "Ventilator"}
          </span>
          {/* Vijf streepjes: de snelheid (Automatisch = geen). */}
          <span className="flex items-end gap-[3px]" aria-hidden>
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                className={cn("w-[3px] rounded-full", n <= fanIndex ? "bg-current" : "bg-current opacity-25")}
                style={{ height: 4 + n * 2 }}
              />
            ))}
          </span>
        </button>
      </div>
    </section>
  );
}

/**
 * «Airco» op de startpagina, onder het licht: de Panasonic-airco’s (Comfort Cloud) als witte kaarten op de
 * pagina, met per toestel aan/uit, temperatuur, modus en ventilator. De schakelaar naast de titel zet alles
 * uit zodra er één aan staat (anders alles aan). Niet gekoppeld: lege staat met een knop naar Profiel → Klimaat.
 */
export function HomeAircoSection() {
  const router = useRouter();
  const { state, devices, change, error, load } = useAirco();
  const anyOn = devices.some((d) => d.on);
  const reachable = devices.filter((d) => d.available && d.on !== null);
  const note = "text-sm text-[var(--text-secondary)]";

  const body =
    state.kind === "loading" ? (
      <div className="-mx-4 flex gap-3 overflow-hidden px-4" aria-busy aria-label="Airco’s laden">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-[252px] w-[232px] shrink-0 animate-pulse rounded-[24px] bg-white lg:flex-1 [[data-theme=dark]_&]:bg-fixed-white/10" />
        ))}
      </div>
    ) : state.kind === "error" ? (
      <p className={note}>
        Comfort Cloud is even niet bereikbaar.{" "}
        <button type="button" onClick={() => void load()} className="font-bold text-[var(--text-primary)] underline">
          Opnieuw
        </button>
      </p>
    ) : state.kind === "not-configured" || state.kind === "not-connected" ? (
      <HomeOnboardingEmptyCard
        illustrationSrc="/images/ui/airco_240.webp"
        illustrationSide="end"
        contentAlign="start"
        text={
          state.kind === "not-configured"
            ? "Bedien je Panasonic-airco’s vanaf hier. Comfort Cloud is nog niet ingesteld voor deze versie van de app."
            : state.reconnect
              ? "Je koppeling met Comfort Cloud is verlopen. Koppel opnieuw om je airco’s hier te bedienen."
              : "Bedien je Panasonic-airco’s vanaf hier: per kamer aan, uit, temperatuur en modus."
        }
        actions={
          state.kind === "not-configured" ? (
            <span className="text-[12px] font-medium leading-4 text-[var(--text-secondary)]">Vraag de beheerder om Comfort Cloud in te stellen.</span>
          ) : (
            <MiniButton variant="primary" onClick={() => router.push("/profiel/panasonic")}>
              {state.reconnect ? "Opnieuw koppelen" : "Koppel je airco’s"}
            </MiniButton>
          )
        }
      />
    ) : devices.length === 0 ? (
      <p className={note}>Geen airco’s gevonden bij je Comfort Cloud-account.</p>
    ) : (
      <div className="-mx-4 -my-2 flex snap-x scroll-px-4 gap-3 overflow-x-auto px-4 py-2 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden">
        {devices.map((device) => (
          <AircoCard key={device.id} device={device} onChange={(command, immediate) => change(device.id, command, immediate)} />
        ))}
      </div>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h2 className="min-w-0 text-[22px] font-bold leading-7 tracking-[-0.01em] text-[var(--text-primary)]">Panasonic airco’s bedienen</h2>
        {state.kind === "ready" && reachable.length > 0 ? (
          <PowerSwitch
            label="Alle airco’s"
            on={anyOn}
            color="#22a89a"
            onToggle={() => reachable.filter((d) => d.on === anyOn).forEach((d) => change(d.id, { power: !anyOn }, true))}
          />
        ) : null}
      </div>
      {error ? (
        <p role="status" className="-mt-1 text-sm font-semibold text-[var(--error-600)]">
          {error}
        </p>
      ) : null}
      {body}
    </div>
  );
}
