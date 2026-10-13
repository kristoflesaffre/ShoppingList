"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import { PageBackButton } from "@/components/ui/page_back_button";
import { headerRoundButtonClass } from "@/components/ui/header_round_button";
import { RouteLoadingSpinner } from "@/components/ui/route_loading_spinner";
import { googleAuthHeaders, startGoogleConnect, useGoogleAuthToken } from "@/lib/google-client";
import { clearAgendaCache } from "@/lib/agenda_cache";

/**
 * Profiel › Agenda's: gekoppelde Google-accounts beheren (account toevoegen, ontkoppelen).
 * Op de startpagina staat enkel de agenda zelf; beheer gebeurt hier.
 */

type AccountsState = {
  configured: boolean;
  connected: boolean;
  accounts?: { id: string; email: string | null }[];
};

/** Zelfde volgorde als de kleuren op de startpagina (eerste account = blauw, …). */
const ACCOUNT_COLORS = ["rgb(79,85,241)", "rgb(229,97,138)", "rgb(47,163,107)", "rgb(224,140,47)", "rgb(139,108,240)"];
const CARD = "overflow-hidden rounded-[20px] bg-[var(--white)] shadow-card";

export default function AgendaInstellingenPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = db.useAuth();
  const token = useGoogleAuthToken();
  const [state, setState] = React.useState<AccountsState | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  const load = React.useCallback(() => {
    if (!token) return;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    const params = new URLSearchParams({ timeMin: start.toISOString(), timeMax: end.toISOString() });
    fetch(`/api/google/dashboard?${params.toString()}`, { cache: "no-store", headers: googleAuthHeaders(token) })
      .then((r) => r.json() as Promise<AccountsState>)
      .then(setState)
      .catch(() => setState({ configured: true, connected: false, accounts: [] }));
  }, [token]);
  React.useEffect(() => load(), [load]);

  const disconnect = async (email: string | null) => {
    setBusy(email ?? "__alle__");
    try {
      const query = email ? `?email=${encodeURIComponent(email)}` : "";
      const response = await fetch(`/api/google/disconnect${query}`, { method: "POST", headers: googleAuthHeaders(token) });
      if (!response.ok) throw new Error("ontkoppelen mislukt");
      clearAgendaCache();
      setMessage(email ? `${email} is ontkoppeld.` : "Je agenda's zijn ontkoppeld.");
      load();
    } catch {
      setMessage("Ontkoppelen is niet gelukt. Probeer het opnieuw.");
    } finally {
      setBusy(null);
    }
  };

  if (authLoading || !user) return <RouteLoadingSpinner />;
  const accounts = state?.accounts ?? [];

  return (
    <div className="relative flex min-h-dvh w-full flex-col">
      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-5 px-4 pb-[calc(96px+env(safe-area-inset-bottom,0px))] pt-[calc(24px+env(safe-area-inset-top,0px))] motion-safe:animate-fade-up lg:pt-10">
        <button type="button" aria-label="Terug naar je profiel" onClick={() => router.push("/profiel")} className={cn(headerRoundButtonClass, "lg:hidden")}>
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-5">
            <path d="M10 3.5 5.5 8 10 12.5" />
          </svg>
        </button>
        <div className="flex items-center gap-3">
          <PageBackButton href="/profiel" label="Terug naar je profiel" />
          <h1 className="text-[30px] font-bold leading-9 tracking-tight text-[var(--text-primary)] lg:text-[34px] lg:leading-10">Agenda&apos;s</h1>
        </div>
        <p className="text-sm leading-5 text-[var(--text-secondary)]">
          Google-accounts waarvan je de afspraken van vandaag op de startpagina ziet. De app kan je agenda enkel lezen, nooit wijzigen.
        </p>

        {message ? (
          <p role="status" className="text-sm font-semibold text-action-primary">
            {message}
          </p>
        ) : null}

        <section aria-label="Gekoppelde accounts" className={CARD}>
          {!state ? (
            <div className="h-16 animate-pulse bg-[var(--gray-25)]" aria-label="Laden" />
          ) : accounts.length === 0 ? (
            <p className="px-4 py-5 text-sm text-[var(--text-secondary)]">Nog geen agenda gekoppeld.</p>
          ) : (
            <ul className="m-0 list-none divide-y divide-[var(--border-subtle)] p-0">
              {accounts.map((a, i) => (
                <li key={a.id} className="flex items-center gap-3 px-4 py-3.5">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white"
                    style={{ backgroundColor: ACCOUNT_COLORS[i % ACCOUNT_COLORS.length] }}
                    aria-hidden
                  >
                    {(a.email ?? "?").charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold text-text-primary">{a.email ?? "Google-account"}</span>
                    <span className="text-xs text-[var(--text-tertiary)]">Alleen lezen</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => void disconnect(a.email)}
                    disabled={busy != null}
                    className="h-9 shrink-0 rounded-pill px-3.5 text-sm font-semibold text-[var(--error-600)] transition-colors [@media(hover:hover)]:hover:bg-[var(--error-25)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                  >
                    {busy === a.email ? "Ontkoppelen…" : "Ontkoppelen"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <button
          type="button"
          onClick={() => void startGoogleConnect(token)}
          disabled={!state?.configured}
          className={cn(
            "inline-flex h-12 items-center justify-center gap-2 self-start rounded-pill bg-action-primary px-5 text-[15px] font-bold text-white shadow-[0_10px_22px_-10px_rgba(79,85,241,0.8)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
            !state?.configured && "opacity-50",
          )}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden className="size-4">
            <path d="M12 5v14M5 12h14" />
          </svg>
          {accounts.length > 0 ? "Nog een account toevoegen" : "Google-agenda koppelen"}
        </button>
        {state && !state.configured ? (
          <p className="text-xs text-[var(--text-tertiary)]">Google-agenda koppelen is op deze server nog niet ingesteld.</p>
        ) : null}
      </main>
    </div>
  );
}
