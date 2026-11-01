import * as React from "react";

/** Warm verloop van de voorraadkast: de tweeling van Frost, van honing via abrikoos naar zacht roze. */
export const PANTRY_GRADIENT_CLASS =
  "bg-[linear-gradient(150deg,#ffdca8_0%,#fde6c6_38%,#fbe0d0_72%,#f6d3d6_100%)] [[data-theme=dark]_&]:bg-[linear-gradient(150deg,#3f2b15_0%,#2f2418_45%,#2e2220_75%,#34202a_100%)]";

/** Tekst op het warme verloop (labels, aantallen, plusknop). */
export const PANTRY_TEXT_CLASS = "text-[var(--secondary-800)] [[data-theme=dark]_&]:text-[#ecca9d]";

/** Vichyruit, zoals het doekje op een confituurpot. */
const GINGHAM_CLASS =
  "bg-[linear-gradient(90deg,rgba(214,110,80,0.16)_50%,transparent_50%),linear-gradient(rgba(214,110,80,0.16)_50%,transparent_50%)] bg-[length:14px_14px]";

/**
 * Voorraadkast: zonlicht door het raam, een vichyruitje in de hoek en een grote vage weckpot met doekje.
 * De ouder moet `relative isolate overflow-hidden` zijn.
 */
export function PantryDecor() {
  return (
    <>
      <span aria-hidden className="pointer-events-none absolute -left-20 -top-24 -z-10 size-72 rounded-full bg-[radial-gradient(circle,rgba(255,248,232,0.95)_0%,rgba(255,236,200,0.45)_40%,rgba(255,236,200,0)_70%)] [[data-theme=dark]_&]:opacity-10" />
      <span aria-hidden className="pointer-events-none absolute -bottom-24 -right-16 -z-10 size-72 rounded-full bg-[radial-gradient(circle,rgba(244,170,150,0.35)_0%,rgba(244,170,150,0)_70%)] [[data-theme=dark]_&]:opacity-30" />
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-0 -z-10 ${GINGHAM_CLASS} [mask-image:radial-gradient(110%_75%_at_100%_0%,black_0%,transparent_50%)] [[data-theme=dark]_&]:opacity-40`}
      />
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.1}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute -right-5 -top-4 -z-10 size-40 rotate-[10deg] text-[rgba(255,255,255,0.8)] [[data-theme=dark]_&]:text-[rgba(255,255,255,0.06)]"
      >
        {/* Doekje met strikje, deksel en een bolle pot met etiket. */}
        <path d="M5.5 5.5 7 2.8h10l1.5 2.7c-2 .9-4.2 1.3-6.5 1.3s-4.5-.4-6.5-1.3Z" />
        <path d="M7.5 6.3h9M12 6.8l-.9 1.6M12 6.8l.9 1.6" />
        <path d="M8 8.5h8v1.3c2 .9 3 2.6 3 4.7v4.2A2.3 2.3 0 0 1 16.7 21H7.3A2.3 2.3 0 0 1 5 18.7v-4.2c0-2.1 1-3.8 3-4.7Z" />
        <path d="M8.2 13.6h7.6v3.6H8.2z" />
      </svg>
    </>
  );
}
