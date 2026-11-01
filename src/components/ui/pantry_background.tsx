import * as React from "react";

/** Warm verloop van de voorraadkast: de tweeling van Frost, van honing via abrikoos naar zacht roze. */
export const PANTRY_GRADIENT_CLASS =
  "bg-[linear-gradient(150deg,#ffdca8_0%,#fde6c6_38%,#fbe0d0_72%,#f6d3d6_100%)] [[data-theme=dark]_&]:bg-[linear-gradient(150deg,#3f2b15_0%,#2f2418_45%,#2e2220_75%,#34202a_100%)]";

/** Tekst op het warme verloop (labels, aantallen, plusknop). */
export const PANTRY_TEXT_CLASS = "text-[var(--secondary-800)] [[data-theme=dark]_&]:text-[#ecca9d]";

/** Vichyruit van 22 px in één kleur, zoals het doekje op een confituurpot. */
const gingham = (color: string) => `linear-gradient(90deg,${color} 50%,transparent 50%),linear-gradient(${color} 50%,transparent 50%)`;

/** Geruit tweekleurig: rode ruit vanuit rechtsboven, honingruit vanuit linksonder, witte draadjes erover. */
const PLAID_RED: React.CSSProperties = {
  backgroundImage: gingham("rgba(214,110,80,0.13)"),
  backgroundSize: "22px 22px",
  maskImage: "linear-gradient(225deg,black,transparent 65%)",
  WebkitMaskImage: "linear-gradient(225deg,black,transparent 65%)",
};
const PLAID_HONEY: React.CSSProperties = {
  backgroundImage: gingham("rgba(240,170,60,0.14)"),
  backgroundSize: "22px 22px",
  backgroundPosition: "11px 11px",
  maskImage: "linear-gradient(45deg,black,transparent 60%)",
  WebkitMaskImage: "linear-gradient(45deg,black,transparent 60%)",
};
const PLAID_THREADS: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(90deg,transparent 0 21px,rgba(255,255,255,0.45) 21px 22px),repeating-linear-gradient(0deg,transparent 0 21px,rgba(255,255,255,0.45) 21px 22px)",
};

/**
 * Voorraadkast: geruit tafelkleed in rood en honing met zonlicht door het raam.
 * De ouder moet `relative isolate overflow-hidden` zijn.
 */
export function PantryDecor() {
  const layer = "pointer-events-none absolute inset-0 -z-10";
  return (
    <>
      <span aria-hidden className={`${layer} [[data-theme=dark]_&]:opacity-40`} style={PLAID_RED} />
      <span aria-hidden className={`${layer} [[data-theme=dark]_&]:opacity-40`} style={PLAID_HONEY} />
      <span aria-hidden className={`${layer} [[data-theme=dark]_&]:opacity-10`} style={PLAID_THREADS} />
      <span aria-hidden className="pointer-events-none absolute -left-20 -top-24 -z-10 size-72 rounded-full bg-[radial-gradient(circle,rgba(255,248,232,0.95)_0%,rgba(255,236,200,0.45)_40%,rgba(255,236,200,0)_70%)] [[data-theme=dark]_&]:opacity-10" />
    </>
  );
}
