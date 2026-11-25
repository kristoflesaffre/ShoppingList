/** Keep episode progress responsive in cinema views, without polling an always-on calendar every 30 seconds. */
export function stremioPollInterval(pathname: string | null): number {
  return pathname === "/films-series" || pathname?.startsWith("/films-series/") ? 30_000 : 300_000;
}
