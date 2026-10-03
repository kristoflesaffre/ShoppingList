"use client";

import * as React from "react";
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

  // Eén keer bij mount bepalen: geen re-render per seconde nodig, wel altijd client-tijd.
  const [now] = React.useState(() => new Date());
  const greeting = greetingForHour(now.getHours());
  const dateLabel = formatTodayLabel(now);

  return (
    <header
      className={cn(
        "grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1",
        className,
      )}
    >
      <p className="col-start-1 row-start-1 text-sm font-medium leading-20 tracking-normal text-[var(--text-tertiary)]">
        <time dateTime={now.toISOString().slice(0, 10)}>{dateLabel}</time>
      </p>
      <h1 className="col-start-1 row-start-2 truncate text-page-title font-bold leading-32 tracking-tight text-[var(--text-primary)]">
        {greeting}
        {firstName ? `, ${firstName}` : ""}
      </h1>
      {action ? (
        <div className="col-start-2 row-start-2 self-center">{action}</div>
      ) : null}
    </header>
  );
}
