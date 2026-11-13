/**
 * Een pagina die op een tablet in één scherm moet passen (kalender aan de muur): hoeveel moet ze verkleinen?
 *
 * De pagina is ontworpen voor een iPad liggend (± 1180 × 820). Een tablet met een lager scherm (1920 × 1080
 * fysiek = 1280 × 720 in CSS) toont dezelfde opbouw, maar dan valt de onderste rij tegels onder de tabbalk of
 * van het scherm. In plaats van elk onderdeel apart te verkleinen, schaalt de hele pagina mee met CSS `zoom`:
 * dezelfde opbouw, alleen kleiner. Groter dan ontworpen wordt ze nooit.
 */
export type FitInput = {
  /** Hoogte waarin de inhoud moet passen (schermhoogte min de tabbalk), in schermpixels. */
  available: number;
  /** Natuurlijke hoogte van de inhoud bij zoom 1. */
  content: number;
  /** Schermbreedte in schermpixels. */
  viewportWidth: number;
  /** Breedte van de kolom bij zoom 1: smaller mag het scherm (na zoom) niet worden, anders herschikt de inhoud. */
  designWidth: number;
  /** Ondergrens: kleiner wordt onleesbaar; dan liever scrollen. */
  min?: number;
};

export function fitZoom({ available, content, viewportWidth, designWidth, min = 0.5 }: FitInput): number {
  if (!(available > 0) || !(content > 0) || !(viewportWidth > 0) || !(designWidth > 0)) return 1;
  const byHeight = available / content;
  if (byHeight >= 1) return 1;
  // Verkleinen: de kolom houdt zijn ontwerpbreedte, zodat de hoogte niet verandert door de zoom zelf
  // (anders kan een titel bij elke meting anders afbreken en blijft de pagina heen en weer springen).
  const zoom = Math.min(byHeight, viewportWidth / designWidth);
  // Naar beneden afronden: liever een pixel te klein dan een rij die net niet past.
  return Math.max(min, Math.min(1, Math.floor(zoom * 1000) / 1000));
}
