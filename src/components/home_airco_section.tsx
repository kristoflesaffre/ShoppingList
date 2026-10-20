"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { googleAuthHeaders, useGoogleAuthToken } from "@/lib/google-client";
import { AC_FANS, type AcCommand, type AcDevice, type AcFan } from "@/lib/panasonic";
import { HomeOnboardingEmptyCard } from "@/components/home_onboarding_empty_card";
import { MiniButton } from "@/components/ui/mini_button";
import { sortAircos } from "@/lib/airco-order";

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

export function useAirco() {
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

/** Sneeuwvlok: zes armen, elk met een V-tak. */
const SNOW_PATH = Array.from({ length: 6 }, (_, i) => {
  const a = (i * Math.PI) / 3;
  const p = (r: number, da = 0) => `${(12 + r * Math.sin(a + da)).toFixed(2)} ${(12 - r * Math.cos(a + da)).toFixed(2)}`;
  return `M12 12L${p(9.5)}M${p(6.2)}L${p(9.2, 0.42)}M${p(6.2)}L${p(9.2, -0.42)}`;
}).join("");

const Svg = ({ children, className = "size-4", width = 1.9 }: { children: React.ReactNode; className?: string; width?: number }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
    {children}
  </svg>
);
const SnowIcon = () => <Svg><path d={SNOW_PATH} /></Svg>;
const SunIcon = () => (
  <Svg>
    <circle cx="12" cy="12" r="4.2" />
    <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
  </Svg>
);
const PowerIcon = ({ className = "size-7" }: { className?: string }) => (
  <Svg className={className} width={2.4}>
    <path d="M12 3.5v8M6.6 6.9a7.5 7.5 0 1 0 10.8 0" />
  </Svg>
);
const MinusIcon = () => <Svg className="size-6" width={2.6}><path d="M6 12h12" /></Svg>;
const PlusIcon = () => <Svg className="size-6" width={2.6}><path d="M6 12h12M12 6v12" /></Svg>;

/** Enkel koelen en verwarmen; automatisch en ontvochtigen bieden we niet aan. */
const MODES = [
  { mode: "cool" as const, label: "Koelen", Icon: SnowIcon },
  { mode: "heat" as const, label: "Verwarmen", Icon: SunIcon },
];
/** De vijf standen (Laag … Hoog); «Automatisch» staat er niet bij. */
const FAN_STEPS: AcFan[] = FAN_ORDER.filter((f) => f !== "auto");

/** Canvas «A3 · V1 Verloop met gloed»: ijsblauw bij koelen, oranje bij verwarmen, met een gloed in die kleur. */
const LOOK = {
  cool: "bg-[linear-gradient(160deg,#62a8ff,#2f6cf0)] shadow-[0_18px_34px_-14px_rgba(47,108,240,0.7),0_0_0_1px_rgba(47,108,240,0.15)]",
  heat: "bg-[linear-gradient(160deg,#ffae5c,#f2542d)] shadow-[0_18px_34px_-14px_rgba(242,84,45,0.75),0_0_0_1px_rgba(242,84,45,0.15)]",
} as const;
const MODE_TEXT = { cool: "text-[#2f6cf0]", heat: "text-[#f0522c]" } as const;

// ─── Onderdelen ─────────────────────────────────────────────────────────────

function PowerSwitch({ label, on, disabled, onToggle, glass }: { label: string; on: boolean; disabled?: boolean; onToggle: () => void; glass?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${label}: ${on ? "uitzetten" : "aanzetten"}`}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "relative h-[30px] w-[52px] shrink-0 rounded-full transition-colors duration-fast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fixed-white focus-visible:ring-offset-2 disabled:opacity-50",
        glass ? "bg-fixed-white/40" : on ? "bg-[#2f80ff] shadow-[0_6px_16px_-8px_#2f80ff]" : "bg-[rgba(16,17,48,0.14)] [[data-theme=dark]_&]:bg-fixed-white/[0.16]",
      )}
    >
      <span className={cn("absolute top-[3px] size-6 rounded-full bg-fixed-white shadow-[0_1px_3px_rgba(16,17,48,0.25)] transition-[left] duration-fast ease-out-strong", on ? "left-[25px]" : "left-[3px]")} />
    </button>
  );
}

const fmt = (t: number) => `${String(t).replace(".", ",")}°`;

function GlassButton({ label, children, disabled, onClick }: { label: string; children: React.ReactNode; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-[50px] shrink-0 items-center justify-center rounded-[16px] bg-fixed-white/[0.22] text-fixed-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.4),0_8px_16px_-10px_rgba(0,0,0,0.45)] transition-transform active:scale-95 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

const CARD = "flex w-[250px] shrink-0 snap-start flex-col gap-3.5 rounded-[24px] p-4 lg:w-auto";

function CardHead({ device, sub, light, onToggle }: { device: AcDevice; sub: string; light?: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h3 className={cn("truncate text-[15px] font-extrabold leading-5", light ? "text-fixed-white" : "text-[var(--text-primary)]")}>{device.name}</h3>
        <p className={cn("mt-0.5 text-[12px] font-semibold leading-4", light ? "text-fixed-white/80" : "text-[var(--text-secondary)]")}>{sub}</p>
      </div>
      <PowerSwitch label={device.name} on={device.on === true} glass={light} disabled={!device.available || device.on === null} onToggle={onToggle} />
    </div>
  );
}

function AircoCard({ device, onChange }: { device: AcDevice; onChange: (command: Omit<AcCommand, "deviceId">, immediate?: boolean) => void }) {
  const inside = device.insideTemperature !== null ? `Binnen ${fmt(device.insideTemperature)}` : null;
  const togglePower = () => onChange({ power: !device.on }, true);

  // Uit (of onbereikbaar): witte kaart met een grote aan-knop en de vorige stand; even hoog als de rest.
  if (!device.available || device.on !== true) {
    const lastMode = device.mode === "heat" ? "verwarmen" : device.mode === "cool" ? "koelen" : null;
    const lastFan = device.fan && device.fan !== "auto" ? FAN_STEPS.indexOf(device.fan) + 1 : null;
    const last = [device.targetTemperature !== null ? `${fmt(device.targetTemperature)}${lastMode ? ` ${lastMode}` : ""}` : null, lastFan ? `stand ${lastFan}` : null].filter(Boolean).join(" · ");
    const canStart = device.available && device.on === false;
    return (
      <section aria-label={device.name} className={cn(CARD, "bg-white shadow-[0_1px_2px_rgba(16,17,48,0.06)] [[data-theme=dark]_&]:bg-fixed-white/[0.07]")}>
        <CardHead device={device} sub={[inside, device.available ? "Uit" : "Niet bereikbaar"].filter(Boolean).join(" · ")} onToggle={togglePower} />
        <div className="flex flex-1 flex-col items-center justify-center gap-2.5 py-2">
          <button
            type="button"
            disabled={!canStart}
            onClick={togglePower}
            aria-label={`${device.name} aanzetten`}
            className="flex size-[76px] items-center justify-center rounded-full bg-white text-[var(--text-primary)] shadow-[0_0_0_1px_rgba(16,17,48,0.1),0_10px_20px_-10px_rgba(16,17,48,0.35)] transition-transform active:scale-95 disabled:opacity-40 [[data-theme=dark]_&]:bg-fixed-white/10"
          >
            <PowerIcon />
          </button>
          <span className="text-[13px] font-extrabold text-[var(--text-primary)]">{canStart ? "Aanzetten" : "Niet bereikbaar"}</span>
          {last ? <span className="text-[11.5px] font-semibold text-[var(--text-secondary)]">Laatst: {last}</span> : null}
        </div>
      </section>
    );
  }

  const mode = device.mode === "heat" ? "heat" : "cool";
  const t = device.targetTemperature;
  const fanStep = device.fan ? FAN_STEPS.indexOf(device.fan) : -1;
  return (
    <section aria-label={device.name} className={cn(CARD, LOOK[mode])}>
      <CardHead device={device} light sub={[inside, mode === "heat" ? "verwarmt" : "koelt"].filter(Boolean).join(" · ")} onToggle={togglePower} />

      <div className="flex items-center justify-between gap-2">
        <GlassButton label={`${device.name} kouder`} disabled={t === null || t <= 16} onClick={() => t !== null && onChange({ temperature: t - 0.5 })}>
          <MinusIcon />
        </GlassButton>
        <span className="text-[40px] font-extrabold leading-none tracking-[-0.04em] tabular-nums text-fixed-white" aria-live="polite">
          {t === null ? "—" : fmt(t)}
        </span>
        <GlassButton label={`${device.name} warmer`} disabled={t === null || t >= 30} onClick={() => t !== null && onChange({ temperature: t + 0.5 })}>
          <PlusIcon />
        </GlassButton>
      </div>

      <div role="radiogroup" aria-label={`${device.name} modus`} className="flex gap-1.5">
        {MODES.filter((m) => device.modes.includes(m.mode)).map(({ mode: m, label, Icon }) => {
          const active = device.mode === m;
          return (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => !active && onChange({ mode: m }, true)}
              className={cn(
                "flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-[12.5px] font-extrabold transition-colors",
                active ? cn("bg-fixed-white", MODE_TEXT[m]) : "text-fixed-white/90 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.38)]",
              )}
            >
              <Icon />
              {label}
            </button>
          );
        })}
      </div>

      {/* Ventilator: de vijf standen meteen kiesbaar, als oplopende staafjes. */}
      <div role="radiogroup" aria-label={`${device.name} ventilator`} className="flex gap-0.5">
        {FAN_STEPS.map((fan, i) => (
          <button
            key={fan}
            type="button"
            role="radio"
            aria-checked={i === fanStep}
            aria-label={`Ventilator ${AC_FANS[fan].toLowerCase()} (stand ${i + 1})`}
            onClick={() => i !== fanStep && onChange({ fan }, true)}
            className={cn("flex h-[34px] flex-1 items-end justify-center rounded-[10px] pb-2 transition-colors", i === fanStep && "bg-fixed-white/25")}
          >
            <span className={cn("w-1.5 rounded-full", i <= fanStep ? "bg-fixed-white" : "bg-fixed-white/35")} style={{ height: 8 + i * 3.4 }} />
          </button>
        ))}
      </div>
    </section>
  );
}

/**
 * «Airco» op de startpagina, onder het licht: de Panasonic-airco’s (Comfort Cloud) als witte kaarten op de
 * pagina (canvas «A3 · V1»), met per toestel aan/uit, temperatuur, koelen/verwarmen en vijf ventilatorstanden. De schakelaar naast de titel zet alles
 * uit zodra er één aan staat (anders alles aan). Niet gekoppeld: lege staat met een knop naar Profiel → Klimaat.
 */
export function HomeAircoSection() {
  const router = useRouter();
  const { state, devices: unsorted, change, error, load } = useAirco();
  // Volgorde naar het moment van de dag (slaapkamers ’s ochtends en ’s avonds eerst); elke minuut herbekeken.
  const [now, setNow] = React.useState(() => new Date());
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const devices = sortAircos(unsorted, now);
  const anyOn = devices.some((d) => d.on);
  const reachable = devices.filter((d) => d.available && d.on !== null);
  const note = "text-sm text-[var(--text-secondary)]";

  const body =
    state.kind === "loading" ? (
      <div className="-mx-4 flex gap-3 overflow-hidden px-4" aria-busy aria-label="Airco’s laden">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="h-[252px] w-[250px] shrink-0 animate-pulse rounded-[24px] bg-white lg:flex-1 [[data-theme=dark]_&]:bg-fixed-white/10" />
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
