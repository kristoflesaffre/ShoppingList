"use client";

import { db } from "@/lib/db";

/**
 * Client-kant van de Google-agendakoppeling: elke aanroep naar /api/google/* stuurt het Instant-token
 * mee, zodat de server weet van welke gebruiker de (server-side bewaarde) koppeling is.
 */
export function useGoogleAuthToken(): string | null {
  const { user } = db.useAuth();
  return (user as { refresh_token?: string } | null | undefined)?.refresh_token ?? null;
}

export function googleAuthHeaders(token: string | null): HeadersInit {
  return token ? { authorization: `Bearer ${token}` } : {};
}

/** Start de koppeling: vraagt de Google-link op en stuurt de browser erheen. */
export async function startGoogleConnect(token: string | null): Promise<void> {
  const response = await fetch("/api/google/connect", { method: "POST", headers: googleAuthHeaders(token) });
  const json = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
  if (json?.url) {
    window.location.assign(json.url);
    return;
  }
  window.location.assign(`/?google=${json?.error === "not-configured" ? "not-configured" : "connection-failed"}`);
}
