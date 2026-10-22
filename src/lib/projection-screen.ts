export type ScreenStatus = {
  configured: boolean;
  paused?: boolean;
  durationSeconds: number | null;
  calibrating: boolean;
  running: boolean;
  projectorConfigured?: boolean;
  projector?: { configured: boolean; accepted?: boolean; isOn?: boolean | null };
};
export type ScreenAction = "up" | "stop" | "down" | "preset";
/** The emergency Stop remains usable during an in-flight command. */
export function isScreenActionDisabled(action: ScreenAction, screen: ScreenStatus | null, busy: boolean) {
  if (!screen?.configured || screen.paused) return true;
  return action !== "stop" && (busy || screen.running || screen.calibrating || (action === "preset" && screen.durationSeconds == null));
}
