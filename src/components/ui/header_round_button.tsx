/**
 * Kopbalk-patroon van de app (recept-detail, lijstje): geen witte balk, maar de knoppen als ronde
 * witte cirkels (40px) op de achtergrond van de pagina. De balk zelf is licht doorschijnend met
 * blur, zodat inhoud er bij het scrollen zacht onder verdwijnt.
 */
export const headerRoundButtonClass =
  "flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--white)] text-[var(--blue-500)] shadow-[0_1px_3px_rgba(16,17,48,0.10)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] [&_svg]:max-h-5 [&_svg]:max-w-5";

/** Achtergrond van een vaste kopbalk: pagina-achtergrond, licht doorschijnend met blur. */
export const headerBarSurfaceClass = "bg-[color-mix(in_srgb,var(--bg-app)_86%,transparent)] backdrop-blur-md";

/** Ronde witte potloodknop rechts in de kopbalk (bewerken / naam wijzigen). */
export function HeaderEditButton({
  onClick,
  label = "Bewerken",
  className,
}: {
  onClick?: () => void;
  label?: string;
  className?: string;
}) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className={className ? `${headerRoundButtonClass} ${className}` : headerRoundButtonClass}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-5">
        <path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4zM13.5 6.5l4 4" />
      </svg>
    </button>
  );
}
