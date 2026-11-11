/** Recover the dashboard's screen wake lock after Safari resumes or iPadOS releases it. */
export type ScreenWakeLockState = "requesting" | "active" | "waiting" | "blocked" | "unsupported";

type WakeLockSource = Pick<WakeLock, "request">;
type WakeDocument = Pick<Document, "visibilityState" | "addEventListener" | "removeEventListener">;
type WakeWindow = Pick<Window, "addEventListener" | "removeEventListener" | "setTimeout" | "clearTimeout">;

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
  // Capture runs before the dark dashboard swallows the first wake-up tap.
  view.addEventListener("pointerdown", interact, { capture: true, passive: true });
  view.addEventListener("touchstart", interact, { capture: true, passive: true });
  view.addEventListener("keydown", interact, { capture: true });
  void request();
  // Opening from the Home Screen can race Safari becoming fully active, even without a tap.
  scheduleRetry();

  return () => {
    stopped = true;
    clearRetry();
    page.removeEventListener("visibilitychange", resume);
    view.removeEventListener("pageshow", resume);
    view.removeEventListener("focus", resume);
    view.removeEventListener("pointerdown", interact, true);
    view.removeEventListener("touchstart", interact, true);
    view.removeEventListener("keydown", interact, true);
    if (lock) {
      lock.removeEventListener("release", onRelease);
      release(lock);
      lock = null;
    }
    // A still-pending request releases its sentinel when its promise resolves.
  };
}
