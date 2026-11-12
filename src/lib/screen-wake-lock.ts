/** Recover the dashboard's screen wake lock after Safari resumes or iPadOS releases it. */
export type ScreenWakeLockState = "requesting" | "active" | "waiting" | "blocked" | "unsupported";

type WakeLockSource = Pick<WakeLock, "request">;
type WakeDocument = Pick<Document, "visibilityState" | "addEventListener" | "removeEventListener">;
type WakeWindow = Pick<Window, "addEventListener" | "removeEventListener" | "setTimeout" | "clearTimeout">;

/** Events that give WebKit "transient activation" (HTML spec: activation-triggering input events). */
export const ACTIVATION_EVENTS = ["pointerup", "touchend", "click", "mousedown", "keydown"] as const;

/**
 * Keeps the screen on while the dashboard is visible. iPadOS rules (WebKit source):
 * - a request is granted without a tap only after this page got one granted during a tap; a fresh
 *   page load (Home Screen launch, app update reload) therefore needs one tap before it holds;
 * - the lock is dropped whenever the page is hidden and is restored on return without a tap.
 */
export function keepScreenAwake({
  wakeLock,
  document: page,
  window: view,
  onState = () => undefined,
}: {
  wakeLock?: WakeLockSource;
  document: WakeDocument;
  window: WakeWindow;
  onState?: (state: ScreenWakeLockState) => void;
}): () => void {
  if (!wakeLock) {
    onState("unsupported");
    return () => undefined;
  }

  let stopped = false;
  let pending = false;
  let lock: WakeLockSentinel | null = null;
  let retry: number | undefined;
  const clearRetry = () => {
    if (retry !== undefined) view.clearTimeout(retry);
    retry = undefined;
  };
  const release = (sentinel: WakeLockSentinel) => {
    // Some Safari versions can throw before returning a release promise.
    try { void sentinel.release().catch(() => undefined); } catch { /* Already released. */ }
  };
  const request = async () => {
    if (stopped || pending || page.visibilityState !== "visible" || (lock && !lock.released)) return;
    pending = true;
    onState("requesting");
    try {
      const granted = await wakeLock.request("screen");
      if (stopped || page.visibilityState !== "visible") {
        release(granted);
        return;
      }
      lock = granted;
      if (granted.released) {
        lock = null;
        onState("waiting");
        return;
      }
      granted.addEventListener("release", onRelease, { once: true });
      clearRetry();
      onState("active");
    } catch {
      // A mount-time request may fail on iPad; the next real interaction retries it.
      // No endless polling when Low Power Mode or a browser policy denies the request.
      if (!stopped) onState("blocked");
    } finally {
      pending = false;
    }
  };
  const scheduleRetry = () => {
    clearRetry();
    if (stopped || page.visibilityState !== "visible") return;
    retry = view.setTimeout(() => { retry = undefined; void request(); }, 1000);
  };
  function onRelease(event: Event) {
    // A delayed event from an older sentinel must not discard a newly acquired lock.
    if (event.target !== lock) return;
    lock = null;
    if (stopped) return;
    onState("waiting");
    scheduleRetry();
  }
  const resume = () => {
    if (page.visibilityState !== "visible") {
      clearRetry();
      if (lock) {
        lock.removeEventListener("release", onRelease);
        release(lock);
        lock = null;
      }
      onState("waiting");
      return;
    }
    void request();
    // Safari may announce visibility before the document is fully active.
    scheduleRetry();
  };
  const interact = () => { void request(); };
  page.addEventListener("visibilitychange", resume);
  view.addEventListener("pageshow", resume);
  view.addEventListener("focus", resume);
  // WebKit only grants a wake lock without an earlier grant during "transient activation", which
  // a touch gives at its END (touchend / pointerup / click), never at touchstart or pointerdown.
  // Requesting on touchstart would be denied and, while pending, would also swallow this attempt.
  // Capture runs before the dark dashboard swallows the wake-up tap.
  for (const type of ACTIVATION_EVENTS) view.addEventListener(type, interact, { capture: true, passive: true });
  void request();
  // Opening from the Home Screen can race Safari becoming fully active, even without a tap.
  scheduleRetry();

  return () => {
    stopped = true;
    clearRetry();
    page.removeEventListener("visibilitychange", resume);
    view.removeEventListener("pageshow", resume);
    view.removeEventListener("focus", resume);
    for (const type of ACTIVATION_EVENTS) view.removeEventListener(type, interact, true);
    if (lock) {
      lock.removeEventListener("release", onRelease);
      release(lock);
      lock = null;
    }
    // A still-pending request releases its sentinel when its promise resolves.
  };
}
