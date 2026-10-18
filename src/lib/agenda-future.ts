/** Calendar windows are contiguous in local time, including daylight-saving changes. */
export function nextAgendaWindow(from: Date, days = 30) {
  const timeMin = new Date(from);
  const timeMax = new Date(from);
  timeMax.setDate(timeMax.getDate() + days);
  return { timeMin, timeMax };
}

/** A multi-day event can occur in two adjacent API windows. Keep it once, with fresh base data first. */
export function mergeAgendaWindows<T extends { id: string }>(base: readonly T[], future: readonly T[]): T[] {
  const seen = new Set<string>();
  return [...base, ...future].filter(event => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
}
