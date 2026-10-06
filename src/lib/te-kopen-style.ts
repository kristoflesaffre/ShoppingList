import type * as React from "react";
import type { Rgb } from "@/components/ui/category_card";

const TE_KOPEN_MONOGRAM_RGB: Rgb[] = [
  [214, 112, 31],
  [47, 127, 191],
  [61, 143, 85],
  [139, 108, 240],
  [204, 74, 128],
  [43, 160, 150],
];

/** Gekleurd monogram (eerste letter) voor een product zonder foto. */
export function teKopenMonogramStyle(name: string): React.CSSProperties {
  const code = name.trim().toUpperCase().charCodeAt(0) || 0;
  const rgb = TE_KOPEN_MONOGRAM_RGB[code % TE_KOPEN_MONOGRAM_RGB.length].join(",");
  return { backgroundColor: `rgba(${rgb},0.14)`, color: `rgb(${rgb})` };
}

/** Huiskleur per winkel voor de kop van een winkelkaart. */
const STORE_RGB: Record<string, Rgb> = {
  Lidl: [0, 80, 170],
  Delhaize: [229, 72, 77],
  Aldi: [0, 90, 160],
  Carrefour: [0, 85, 164],
  Colruyt: [227, 6, 19],
  "Bio-planet": [110, 160, 50],
  Spar: [0, 140, 70],
  Match: [230, 0, 40],
  "Albert Heijn": [0, 160, 226],
  Jumbo: [240, 190, 40],
  Okay: [230, 90, 20],
  Action: [0, 90, 170],
  Zeeman: [0, 100, 180],
  Wibra: [220, 0, 50],
  Kruidvat: [227, 0, 15],
  Landal: [255, 120, 0],
};

/** Algemeen (geen winkel) = lavendel/blauw. */
export const TE_KOPEN_ALGEMEEN_RGB: Rgb = [79, 85, 241];

export function teKopenStoreRgb(store: string | null): Rgb {
  if (!store) return TE_KOPEN_ALGEMEEN_RGB;
  return STORE_RGB[store] ?? TE_KOPEN_ALGEMEEN_RGB;
}

/** Kopverloop voor een winkelkaart; Lidl / Delhaize krijgt geel → rood. */
export function teKopenStoreGradient(store: string | null): string | undefined {
  if (store === "Lidl / Delhaize") {
    return "linear-gradient(90deg, rgba(240,190,40,0.22), rgba(229,72,77,0.07))";
  }
  return undefined;
}
