import * as React from "react";
import { cn } from "@/lib/utils";

const POSITIONS = ["left-1/2 top-[30%]", "left-[28%] top-[66%]", "left-[72%] top-[66%]"];

/**
 * Grijs bord met tot drie productfoto's (canvas «Kalender»): voor dagen met losse items
 * zonder recept. Eén foto staat bovenaan, twee en drie onderaan links en rechts.
 */
export function IngredientPlate({
  photos,
  size = 48,
  className,
}: {
  photos: (string | null)[];
  /** Diameter in px; de productfoto's schalen mee (helft van het bord). */
  size?: number;
  className?: string;
}) {
  const item = Math.round(size / 2);
  return (
    <span
      aria-hidden
      className={cn("relative block shrink-0 rounded-full bg-[var(--gray-25)]", className)}
      style={{ width: size, height: size }}
    >
      {photos
        .filter((src): src is string => Boolean(src))
        .slice(0, 3)
        .map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- lokale ingrediënt-webp
          <img
            key={i}
            src={src}
            alt=""
            decoding="async"
            className={cn(
              "absolute -translate-x-1/2 -translate-y-1/2 object-contain mix-blend-multiply [[data-theme=dark]_&]:mix-blend-normal",
              POSITIONS[i],
            )}
            style={{ width: item, height: item }}
          />
        ))}
    </span>
  );
}
