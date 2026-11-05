/**
 * Weergavethema: licht (stijl 1 · Helder), donker (stijl 4 · Avond) of systeem.
 * De keuze is een apparaatvoorkeur en staat in localStorage; `<html data-theme>` stuurt de tokens
 * (zie `styles/tokens.css`). `THEME_INIT_SCRIPT` zet het attribuut vóór de eerste paint.
 */

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "sl-theme";
export const THEME_CHANGE_EVENT = "sl-theme-change";

/** Kleur van statusbalk / PWA-chrome per thema (= `--bg-app`). */
export const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: "#f5f6fa",
  dark: "#10121f",
};

export function readThemePreference(): ThemePreference {
  try {
    const v = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* privé-modus of geblokkeerde opslag: val terug op licht */
  }
  return "light";
}

export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref !== "system") return pref;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Pagina's die altijd donker zijn, ongeacht de voorkeur (`CinemaHero`, «Jouw seriesmaak», «Series die je volgt»). */
const ALWAYS_DARK_PATHS = ["/films-series", "/films-series/smaak", "/films-series/gevolgde-series"];
let forcedDark = typeof window !== "undefined" && ALWAYS_DARK_PATHS.includes(window.location.pathname);

/** Zet de pagina donker op `--cinema-screen` tot `setForcedDark(false)`; de voorkeur blijft ongemoeid. */
export function setForcedDark(on: boolean) {
  forcedDark = on;
  const root = document.documentElement;
  if (on) root.style.setProperty("--bg-app", "var(--cinema-screen)");
  else root.style.removeProperty("--bg-app");
  applyTheme(readThemePreference());
}

export function applyTheme(pref: ThemePreference): ResolvedTheme {
  const resolved = forcedDark ? "dark" : resolveTheme(pref);
  const root = document.documentElement;
  root.dataset.theme = resolved;
  document
    .querySelectorAll('meta[name="theme-color"]')
    .forEach((m) => m.setAttribute("content", THEME_COLORS[resolved]));
  return resolved;
}

export function setThemePreference(pref: ThemePreference): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    /* niet opgeslagen; thema geldt dan alleen voor deze sessie */
  }
  applyTheme(pref);
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { detail: pref }));
}

/** Inline in `<head>`: voorkomt een lichte flits bij donker thema. Houd synchroon met `applyTheme`. */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var f=${JSON.stringify(ALWAYS_DARK_PATHS)}.indexOf(location.pathname)>=0;var d=f||p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";if(f)document.documentElement.style.setProperty("--bg-app","var(--cinema-screen)");}catch(e){document.documentElement.dataset.theme="light";}})();`;
