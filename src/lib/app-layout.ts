import { cn } from "@/lib/utils";

/**
 * Bottom offset voor vaste FAB’s: 24px boven de bottom navigation (Figma 854-7039).
 * Nav-hoogte ≈ pt-2 + nav-rij + pb (8+48+8) plus safe-area in de nav-pb.
 * De nav zelf staat in `AppPersistentBottomNav` (root layout + Suspense), niet op elke pagina.
 */
export const APP_FAB_BOTTOM_CLASS =
  "bottom-[calc(88px+env(safe-area-inset-bottom,0px))]";

const fabInnerBase = "mx-auto flex w-full max-w-[956px] justify-end";

/** Inner rij uitgelijnd met content zonder extra horizontale inset (zoals home `px-[16px]` + max-w-956). */
export const APP_FAB_INNER_FLUSH_CLASS = fabInnerBase;

/** Inner rij met `px-4`, gelijk aan lijstje-detail contentkolom. */
export const APP_FAB_INNER_PX4_CLASS = cn(fabInnerBase, "px-4");

/**
 * FAB op schermen **zonder** `AppBottomNav` (receptdetail, lijstje-detail).
 * Alleen `24px` vanaf de onderkant van de layout-viewport — géén `+ env(safe-area-inset-bottom)`:
 * op iPhone zou die extra inset de knop ~30px te hoog plaatsen t.o.v. mobiele browser-emulatie.
 */
export const APP_FAB_BOTTOM_NO_NAV_CLASS = "bottom-[24px]";
