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

export function applyTheme(pref: ThemePreference): ResolvedTheme {
  const resolved = resolveTheme(pref);
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
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}");var d=p==="dark"||(p==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.dataset.theme=d?"dark":"light";}catch(e){document.documentElement.dataset.theme="light";}})();`;
