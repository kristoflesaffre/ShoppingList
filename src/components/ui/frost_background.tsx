import * as React from "react";

/** Ijsblauw verloop van de diepvries, zonder vorm: combineer met een kaart of een volledig scherm. */
export const FROST_GRADIENT_CLASS =
  "bg-[linear-gradient(145deg,#cfe2ff_0%,#e3edff_42%,#efe9ff_100%)] [[data-theme=dark]_&]:bg-[linear-gradient(145deg,#1b2a4a_0%,#1a2240_55%,#231f40_100%)]";

/** Frost: zachte glans, fijne ijskristallen in de hoek en een grote vage sneeuwvlok. De ouder moet `relative isolate overflow-hidden` zijn. */
export function FrostDecor() {
  return (
    <>
      <span aria-hidden className="pointer-events-none absolute -left-16 -top-20 -z-10 size-64 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.85)_0%,rgba(255,255,255,0)_70%)] [[data-theme=dark]_&]:opacity-10" />
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1.6px)] bg-[length:13px_13px] opacity-70 [mask-image:radial-gradient(120%_80%_at_100%_0%,black_0%,transparent_55%)] [[data-theme=dark]_&]:opacity-20"
      />
      <svg
        aria-hidden
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.1}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute -right-7 -top-7 -z-10 size-40 rotate-12 text-[rgba(255,255,255,0.75)] [[data-theme=dark]_&]:text-[rgba(255,255,255,0.06)]"
      >
        <path d="M12 2v20M3.3 7l17.4 10M3.3 17l17.4-10M9 3.5 12 6l3-2.5M9 20.5 12 18l3 2.5M2.8 10.2 6.3 9l-.8-3.6M21.2 13.8 17.7 15l.8 3.6M2.8 13.8 6.3 15l-.8 3.6M21.2 10.2 17.7 9l.8-3.6" />
      </svg>
    </>
  );
}
