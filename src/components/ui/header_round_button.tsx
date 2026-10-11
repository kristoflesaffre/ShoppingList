/**
 * Kopbalk-patroon van de app (recept-detail, lijstje): geen witte balk, maar de knoppen als ronde
 * witte cirkels (40px) op de achtergrond van de pagina. De balk zelf is licht doorschijnend met
 * blur, zodat inhoud er bij het scrollen zacht onder verdwijnt.
 */
export const headerRoundButtonClass =
  "flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--white)] text-[var(--blue-500)] shadow-[0_1px_3px_rgba(16,17,48,0.10)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] [&_svg]:max-h-5 [&_svg]:max-w-5";

/** Achtergrond van een vaste kopbalk: pagina-achtergrond, licht doorschijnend met blur. */
export const headerBarSurfaceClass = "bg-[color-mix(in_srgb,var(--bg-app)_86%,transparent)] backdrop-blur-md";
