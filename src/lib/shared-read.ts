/**
 * Eén leesvraag voor alle onderdelen die tegelijk hetzelfde willen weten (status van airco, Hue, rolluiken,
 * filmdetails…). Op de startpagina staan overzicht én dashboard klaar, dus vroeg elk exemplaar apart: tientallen
 * dubbele verzoeken die de zes verbindingen per server bezetten, zodat de foto's erachter moesten wachten.
 *
 * Zolang een vraag loopt, krijgt iedereen hetzelfde antwoord; daarna nog `maxAgeMs` lang. Een fout wordt niet
 * bewaard. Alleen voor lezen: opdrachten (open, aan, uit…) gaan nooit hierlangs.
 */
type Entry = { settledAt: number | null; value: Promise<unknown> };
const reads = new Map<string, Entry>();

export function sharedRead<T>(key: string, run: () => Promise<T>, maxAgeMs = 1_000): Promise<T> {
  const hit = reads.get(key);
  if (hit && (hit.settledAt == null || Date.now() - hit.settledAt < maxAgeMs)) return hit.value as Promise<T>;
  const entry: Entry = { settledAt: null, value: run() };
  reads.set(key, entry);
  entry.value.then(
    () => { entry.settledAt = Date.now(); },
    () => { if (reads.get(key) === entry) reads.delete(key); },
  );
  if (reads.size > 500) reads.delete(reads.keys().next().value!);
  return entry.value as Promise<T>;
}

/** Een antwoord kan maar één keer gelezen worden; gedeeld wordt dus de uitgelezen JSON. */
export type JsonRead<T = unknown> = { ok: boolean; status: number; data: T | null };
export async function readJson<T = unknown>(response: Response): Promise<JsonRead<T>> {
  return { ok: response.ok, status: response.status, data: (await response.json().catch(() => null)) as T | null };
}
