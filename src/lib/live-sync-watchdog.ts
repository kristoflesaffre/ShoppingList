/**
 * Waakhond voor de live verbinding met InstantDB op een scherm dat dagen open blijft (tablet-dashboard).
 *
 * De Instant-client heeft geen hartslag: valt de websocket stil zonder dat er een «close» komt
 * (wifi die op een iPad in slaap valt terwijl het scherm aan blijft, een router die de verbinding
 * vergeet), dan blijft de app de oude gegevens tonen tot je herlaadt. Vroeger viel dat niet op omdat
 * het scherm op slot ging of de pagina na een nieuwe versie herlaadde; nu het dashboard wakker blijft
 * en niet meer vanzelf herlaadt, moet de verbinding zichzelf controleren.
 *
 * Elke `intervalMs` (en bij terugkeren naar de pagina) een kleine vraag over dezelfde verbinding;
 * komt er binnen `timeoutMs` geen antwoord, dan start een nieuwe verbinding. De abonnementen
 * (lijstjes, recepten, …) worden daarbij opnieuw opgevraagd, zonder herladen.
 */
export type LiveSyncWatchdogOptions = {
  /** Kleine vraag over de live verbinding; mag falen of nooit antwoorden. */
  probe: () => Promise<unknown>;
  /** Start een nieuwe verbinding (sluit de vorige). */
  reconnect: () => void;
  document?: Pick<Document, "visibilityState" | "addEventListener" | "removeEventListener">;
  window?: Pick<Window, "setTimeout" | "clearTimeout" | "setInterval" | "clearInterval" | "addEventListener" | "removeEventListener">;
  intervalMs?: number;
  timeoutMs?: number;
  onReconnect?: () => void;
};

export function watchLiveSync({
  probe,
  reconnect,
  document: page = globalThis.document,
  window: view = globalThis.window,
  intervalMs = 5 * 60_000,
  timeoutMs = 20_000,
  onReconnect,
}: LiveSyncWatchdogOptions): () => void {
  let stopped = false;
  let checking = false;

  const check = () => {
    if (stopped || checking || page.visibilityState !== "visible") return;
    checking = true;
    let settled = false;
    const timer = view.setTimeout(() => {
      if (settled || stopped) return;
      settled = true;
      checking = false;
      reconnect();
      onReconnect?.();
    }, timeoutMs);
    probe().then(
      () => {
        if (settled) return;
        settled = true;
        checking = false;
        view.clearTimeout(timer);
      },
      () => {
        // Een fout (bv. offline) is geen stille verbinding: de client herstelt dat zelf.
        if (settled) return;
        settled = true;
        checking = false;
        view.clearTimeout(timer);
      },
    );
  };

  const onVisible = () => {
    if (page.visibilityState === "visible") check();
  };
  const interval = view.setInterval(check, intervalMs);
  page.addEventListener("visibilitychange", onVisible);
  view.addEventListener("pageshow", check);
  view.addEventListener("focus", check);

  return () => {
    stopped = true;
    view.clearInterval(interval);
    page.removeEventListener("visibilitychange", onVisible);
    view.removeEventListener("pageshow", check);
    view.removeEventListener("focus", check);
  };
}
