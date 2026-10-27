import type { ProjectorTestAction, ProjectorTestResult } from "./projector-control";

type PendingResult = ProjectorTestResult & { pending?: boolean; commandId?: string };
/** Enqueue once; poll only the receipt. Never retry a physical command. */
export async function sendProjectorCommand(action: ProjectorTestAction, token: string, signal?: AbortSignal): Promise<ProjectorTestResult> {
  const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  const response = await fetch("/api/projector", { method: "POST", headers, body: JSON.stringify({ action }), cache: "no-store", signal });
  let result = await response.json() as PendingResult;
  if (!response.ok || !result.pending) return response.ok ? result : { ...result, accepted: false };
  return awaitProjectorReceipt(result, token, signal);
}

export async function awaitProjectorReceipt(initial: PendingResult, token: string, signal?: AbortSignal, timeout = 35_000): Promise<ProjectorTestResult> {
  let result = initial;
  const headers = { authorization: `Bearer ${token}` };
  const id = result.commandId;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return { accepted: false, error: "relay-uncertain" };
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline && result.pending) {
    await new Promise<void>((resolve, reject) => {
      if (signal?.aborted) { reject(new DOMException("Aborted", "AbortError")); return; }
      const abort = () => { clearTimeout(timer); reject(new DOMException("Aborted", "AbortError")); };
      const timer = setTimeout(() => { signal?.removeEventListener("abort", abort); resolve(); }, 1500);
      signal?.addEventListener("abort", abort, { once: true });
    });
    const status = await fetch(`/api/projector/commands/${id}`, { headers, cache: "no-store", signal });
    result = await status.json() as PendingResult;
    if (!status.ok) return { accepted: false, error: "relay-uncertain" };
  }
  return result.pending ? { accepted: false, error: "relay-uncertain" } : result;
}
