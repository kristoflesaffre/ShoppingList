"use client";

import * as React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

export interface HomeHeaderProps {
  /** InstantDB user-id van de ingelogde gebruiker; bepaalt welk profiel de voornaam levert. */
  ownerId: string;
  className?: string;
  /** Optionele actie rechts naast de paginatitel. */
  action?: React.ReactNode;
}

/** Dagdeel-begroeting (lokale tijd). */
function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return "Goedemorgen";
  if (hour >= 12 && hour < 18) return "Goedemiddag";
  return "Goedenavond";
}

/** «Dinsdag 29 september» – weekdag met hoofdletter, zonder jaar. */
function formatTodayLabel(date: Date): string {
  const raw = date.toLocaleDateString("nl-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/**
 * Anker bovenaan de startpagina: datum (secundair) + begroeting met voornaam als h1.
 * Geeft de home dezelfde typografische rang als «Mijn recepten» / «Klantenkaarten»
 * en laat de eerste sectiekop niet meer als paginatitel fungeren.
 */
export function HomeHeader({ ownerId, className, action }: HomeHeaderProps) {
  const { data } = db.useQuery({
    profiles: {
      $: { where: { instantUserId: ownerId } },
    },
  });
  const firstName = (data?.profiles?.[0]?.firstName ?? "").trim();
  const avatarUrl = (data?.profiles?.[0]?.avatarUrl ?? "").trim() || null;

  // Eén keer bij mount bepalen: geen re-render per seconde nodig, wel altijd client-tijd.
  const [now] = React.useState(() => new Date());
  const greeting = greetingForHour(now.getHours());
  const dateLabel = formatTodayLabel(now);

  return (
    <header
      className={cn(
        "grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3.5 gap-y-0.5",
        className,
      )}
    >
      {/* Profielknop (canvas «Avatar S4»): foto op een witte schijf met schaduw en een blauw badge.
          Met foto: «›» (naar profiel). Zonder foto: persoon-icoon + camera (foto toevoegen). */}
      <Link
        href="/profiel"
        aria-label={avatarUrl ? (firstName ? `Profiel, ${firstName}` : "Profiel") : "Profiel – profielfoto toevoegen"}
        className="relative col-start-1 row-span-2 row-start-1 flex shrink-0 rounded-full bg-[var(--white)] p-[5px] shadow-[0_6px_16px_-4px_rgba(16,17,48,0.28),0_2px_4px_rgba(16,17,48,0.10)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-4"
      >
        <span className="flex size-[52px] items-center justify-center overflow-hidden rounded-full bg-[var(--blue-50)] text-[var(--blue-400)]">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- data-URL of blob uit profiel
            <img src={avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-7">
              <circle cx="12" cy="9" r="4" />
              <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
            </svg>
          )}
        </span>
        <span
          aria-hidden
          className="absolute -bottom-0.5 -right-0.5 flex size-[22px] items-center justify-center rounded-full bg-[var(--blue-500)] text-[var(--white)] shadow-[0_0_0_2px_var(--white)]"
        >
          {avatarUrl ? (
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="size-3">
              <path d="M6 3.5 10.5 8 6 12.5" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="size-3">
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
          )}
        </span>
      </Link>
      <p className="col-start-2 row-start-1 self-end text-sm font-medium leading-20 tracking-normal text-[var(--text-tertiary)]">
        <time dateTime={now.toISOString().slice(0, 10)}>{dateLabel}</time>
      </p>
      <h1 className="col-start-2 row-start-2 self-start truncate text-[24px] font-bold leading-[30px] tracking-tight text-[var(--text-primary)] md:text-page-title md:leading-32">
        {greeting}
        {firstName ? `, ${firstName}` : ""}
      </h1>
      {action ? (
        <div className="col-start-3 row-span-2 row-start-1 self-center">{action}</div>
      ) : null}
    </header>
  );
}
