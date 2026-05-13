import * as React from "react";
import { cn } from "@/lib/utils";

export type HomeOnboardingEmptyCardProps = {
  illustrationSrc: string;
  illustrationAlt?: string;
  /** Illustratie links of rechts van de tekst (Figma home empty states). */
  illustrationSide: "start" | "end";
  text: string;
  /** Uitlijning van tekst + acties in de contentkolom. */
  contentAlign?: "start" | "end";
  actions: React.ReactNode;
  className?: string;
};

/**
 * Home empty-state kaart (Figma 1477:11199): witte rand, 72px illustratie, tekst + acties.
 */
export function HomeOnboardingEmptyCard({
  illustrationSrc,
  illustrationAlt = "",
  illustrationSide,
  text,
  contentAlign = "end",
  actions,
  className,
}: HomeOnboardingEmptyCardProps) {
  const illustration = (
    // eslint-disable-next-line @next/next/no-img-element -- lokale UI-illustratie
    <img
      src={illustrationSrc}
      alt={illustrationAlt}
      width={72}
      height={72}
      className="size-[72px] shrink-0 object-cover opacity-70"
    />
  );

  const content = (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-4",
        contentAlign === "end" ? "items-end" : "items-start",
      )}
    >
      <p className="w-full text-[12px] font-normal leading-4 text-[var(--text-tertiary)]">
        {text}
      </p>
      {actions}
    </div>
  );

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-lg border border-[var(--gray-100)] bg-white p-3",
        className,
      )}
    >
      {illustrationSide === "start" ? (
        <>
          {illustration}
          {content}
        </>
      ) : (
        <>
          {content}
          {illustration}
        </>
      )}
    </div>
  );
}
