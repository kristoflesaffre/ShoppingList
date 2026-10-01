import { cn } from "@/lib/utils";

/**
 * Bottom offset voor vaste FAB’s: 24px boven de bottom navigation (Figma 854-7039).
 * Snackbar met zichtbare FAB (`APP_SNACKBAR_FIXTURE_CLASS`) gebruikt dezelfde `bottom` zodat
 * de onderkant van de snackbar gelijk loopt met de onderkant van de FAB.
 * Zwevende nav: 12px van de onderkant + 60px hoog = 72px; FAB staat 16px daarboven.
 * De nav zelf staat in `AppPersistentBottomNav` (root layout + Suspense), niet op elke pagina.
 */
export const APP_FAB_BOTTOM_CLASS =
  "bottom-[calc(88px+env(safe-area-inset-bottom,0px))]";

/**
 * Snackbar met hoofdnav: zelfde bodem als `APP_FAB_BOTTOM_CLASS` (FAB is verborgen zolang de snackbar zichtbaar is).
 * Lijstje-detail: `APP_SNACKBAR_NO_NAV_FIXTURE_CLASS` + `APP_FAB_BOTTOM_NO_NAV_CLASS`.
 */
const snackbarFixtureBase =
  "pointer-events-auto fixed inset-x-0 z-30 flex justify-center px-2";

export const APP_SNACKBAR_FIXTURE_CLASS = cn(snackbarFixtureBase, APP_FAB_BOTTOM_CLASS);

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

/**
 * Snackbar op schermen zonder hoofdnav (lijstje-detail): zelfde `bottom` als de FAB.
 */
export const APP_SNACKBAR_NO_NAV_FIXTURE_CLASS = cn(
  snackbarFixtureBase,
  APP_FAB_BOTTOM_NO_NAV_CLASS,
);
