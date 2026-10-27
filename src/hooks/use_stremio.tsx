"use client";

import * as React from "react";
import { useGoogleAuthToken } from "@/lib/google-client";
import type { StremioProgress } from "@/lib/stremio-progress";

type Snapshot = { connected: boolean; items: StremioProgress[]; syncedAt: number | null };
const empty: Snapshot = { connected: false, items: [], syncedAt: null };
const messages: Record<string, string> = {
  "login-failed": "Aanmelden bij Stremio mislukt. Controleer je e-mailadres en wachtwoord.",
  "session-expired": "Meld opnieuw aan bij Stremio.", "session-invalid": "Koppel Stremio opnieuw.",
  "rate-limited": "Te veel aanmeldpogingen. Probeer over 15 minuten opnieuw.",
  "not-configured": "De Stremio-koppeling is nog niet geconfigureerd.",
};
type Context = Snapshot & { loading: boolean; busy: boolean; error: string | null; refresh: () => Promise<void>; connect: (email: string, password: string) => Promise<boolean>; disconnect: () => Promise<void> };
const StremioContext = React.createContext<Context | null>(null);

export function StremioProvider({ children }: { children: React.ReactNode }) {
  const token = useGoogleAuthToken();
  const [snapshot, setSnapshot] = React.useState(empty);
  const [snapshotToken, setSnapshotToken] = React.useState(token);
  const [loading, setLoading] = React.useState(true), [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const generation = React.useRef(0), inflight = React.useRef<AbortController | null>(null);
  const mutating = React.useRef(false);
  const invalidate = React.useCallback(() => {
    generation.current++;
    inflight.current?.abort(); inflight.current = null;
  }, []);
  const refresh = React.useCallback(async () => {
    if (!token || inflight.current || mutating.current) return;
    const epoch = generation.current, controller = new AbortController();
    inflight.current = controller;
    try {
      const response = await fetch("/api/stremio", { headers: { authorization: `Bearer ${token}` }, cache: "no-store", signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (epoch === generation.current) { setSnapshot(data); setSnapshotToken(token); setError(null); }
    } catch (failure) {
      if (!controller.signal.aborted && epoch === generation.current) setError(messages[failure instanceof Error ? failure.message : ""] ?? "Stremio kon niet worden gesynchroniseerd. De getoonde stand kan verouderd zijn.");
    } finally {
      if (inflight.current === controller) inflight.current = null;
      if (epoch === generation.current) setLoading(false);
    }
  }, [token]);
  React.useEffect(() => {
    invalidate();
    setSnapshot(empty); setSnapshotToken(token); setError(null); setLoading(Boolean(token)); setBusy(false); mutating.current = false;
    void refresh();
    const visible = () => { if (document.visibilityState === "visible") void refresh(); };
    const timer = setInterval(visible, 30_000);
    document.addEventListener("visibilitychange", visible);
    return () => { invalidate(); clearInterval(timer); document.removeEventListener("visibilitychange", visible); };
  }, [refresh, token, invalidate]);
  const mutate = async (method: "POST" | "DELETE", body?: unknown): Promise<boolean> => {
    if (!token || mutating.current) return false;
    mutating.current = true;
    setBusy(true); setError(null); generation.current++;
    inflight.current?.abort(); inflight.current = null;
    const epoch = generation.current;
    try {
      const response = await fetch("/api/stremio", { method, headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      if (epoch === generation.current) { setSnapshot(data); setSnapshotToken(token); setError(null); }
      return true;
    } catch (failure) {
      if (epoch === generation.current) setError(messages[failure instanceof Error ? failure.message : ""] ?? "Stremio-koppeling mislukt. Probeer opnieuw.");
      return false;
    } finally { if (epoch === generation.current) { setBusy(false); setLoading(false); mutating.current = false; } }
  };
  return <StremioContext.Provider value={{ ...(snapshotToken === token ? snapshot : empty), loading: snapshotToken === token ? loading : Boolean(token), busy, error: snapshotToken === token ? error : null, refresh, connect: (email, password) => mutate("POST", { email, password }), disconnect: async () => { await mutate("DELETE"); } }}>{children}</StremioContext.Provider>;
}

export function useStremio() {
  const value = React.useContext(StremioContext);
  if (!value) throw new Error("Missing Stremio provider");
  return value;
}
