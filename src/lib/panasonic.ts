export const AC_MODES = { auto: "Automatisch", dry: "Ontvochtigen", cool: "Koelen", heat: "Verwarmen", fan: "Ventileren" } as const;
export const AC_FANS = { auto: "Automatisch", low: "Laag", lowMid: "Laag–midden", mid: "Midden", highMid: "Midden–hoog", high: "Hoog" } as const;
export type AcMode = keyof typeof AC_MODES;
export type AcFan = keyof typeof AC_FANS;
export type AcDevice = { id: string; name: string; available: boolean; on: boolean | null; targetTemperature: number | null; insideTemperature: number | null; mode: AcMode | null; fan: AcFan | null; modes: AcMode[] };
export type AcCommand = { deviceId: string; power?: boolean; temperature?: number; mode?: AcMode; fan?: AcFan };
/** Strict allowlist: never pass arbitrary Comfort Cloud fields through. */
export function acParameters(value: unknown): { command: AcCommand; parameters: Record<string, number> } | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (Object.keys(raw).some(key => !["deviceId", "power", "temperature", "mode", "fan"].includes(key)) || typeof raw.deviceId !== "string" || !raw.deviceId || raw.deviceId.length > 180) return null;
  const parameters: Record<string, number> = {};
  if ("power" in raw) { if (typeof raw.power !== "boolean") return null; parameters.operate = raw.power ? 1 : 0; }
  if ("temperature" in raw) { if (typeof raw.temperature !== "number" || !Number.isFinite(raw.temperature) || raw.temperature < 16 || raw.temperature > 30 || raw.temperature * 2 % 1 !== 0) return null; parameters.temperatureSet = raw.temperature; }
  if ("mode" in raw) { if (typeof raw.mode !== "string" || !Object.hasOwn(AC_MODES, raw.mode)) return null; parameters.operationMode = Object.keys(AC_MODES).indexOf(raw.mode); }
  if ("fan" in raw) { if (typeof raw.fan !== "string" || !Object.hasOwn(AC_FANS, raw.fan)) return null; parameters.fanSpeed = Object.keys(AC_FANS).indexOf(raw.fan); }
  return Object.keys(parameters).length ? { command: raw as AcCommand, parameters } : null;
}
