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
      {/* Profielfoto links van de begroeting (zoals in de KBC-app); vervangt de profieltab in de navigatie. */}
      <Link
        href="/profiel"
        aria-label={firstName ? `Profiel, ${firstName}` : "Profiel"}
        className="col-start-1 row-span-2 row-start-1 flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--blue-50)] shadow-[0_0_0_3px_var(--white),0_0_0_4px_var(--border-subtle)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-4"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- data-URL of blob uit profiel
          <img src={avatarUrl} alt="" className="size-full object-cover" />
        ) : (
          <span aria-hidden className="text-xl font-bold text-[var(--blue-500)]">
            {firstName ? firstName.charAt(0).toUpperCase() : "?"}
          </span>
        )}
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
