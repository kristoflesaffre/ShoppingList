const STORE_GRADIENT_BY_LOGO: Record<string, string> = {
  "logos-lidl-delhaize.svg": "var(--gradient-store-lidl-delhaize)",
  "logos-lidl.svg": "var(--gradient-store-lidl)",
  "logos-delhaize.svg": "var(--gradient-store-delhaize)",
  "logos-aldi.svg": "var(--gradient-store-aldi)",
};

/** Zacht verloop in de tint van de winkel; andere winkels en eigen foto's krijgen lavendel. */
export function storeGradientFromLogo(logoSrc: string | null | undefined): string {
  const file = logoSrc?.split("?")[0].split("/").pop() ?? "";
  return STORE_GRADIENT_BY_LOGO[file] ?? "var(--gradient-store-default)";
}
