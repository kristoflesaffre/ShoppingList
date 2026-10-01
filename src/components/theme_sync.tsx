"use client";

import * as React from "react";
import { THEME_CHANGE_EVENT, applyTheme, readThemePreference } from "@/lib/theme";

/**
 * Houdt `<html data-theme>` en de statusbalkkleur in sync: bij mount (theme-color meta),
 * wanneer de gebruiker het thema wijzigt, en bij een systeemwissel als de voorkeur "system" is.
 */
export function ThemeSync() {
  React.useEffect(() => {
    applyTheme(readThemePreference());

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemChange = () => {
      if (readThemePreference() === "system") applyTheme("system");
    };
    const onPreferenceChange = () => applyTheme(readThemePreference());

    media.addEventListener("change", onSystemChange);
    window.addEventListener(THEME_CHANGE_EVENT, onPreferenceChange);
    window.addEventListener("storage", onPreferenceChange);
    return () => {
      media.removeEventListener("change", onSystemChange);
      window.removeEventListener(THEME_CHANGE_EVENT, onPreferenceChange);
      window.removeEventListener("storage", onPreferenceChange);
    };
  }, []);

  return null;
}
