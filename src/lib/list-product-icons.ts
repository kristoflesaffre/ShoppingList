import { ALL_LIST_PRODUCT_ICON_URLS } from "@/lib/list-product-icon-urls";

export { ALL_LIST_PRODUCT_ICON_URLS } from "@/lib/list-product-icon-urls";
export type { ListProductIconUrl } from "@/lib/list-product-icon-urls";

/** @deprecated Gebruik `ALL_LIST_PRODUCT_ICON_URLS`; alias voor compat. */
export const DEFAULT_LIST_PRODUCT_ICON_URLS = ALL_LIST_PRODUCT_ICON_URLS;

const POOL = [...ALL_LIST_PRODUCT_ICON_URLS] as readonly string[];

export const LIST_PRODUCT_ICON_URL_SET = new Set<string>(POOL);

/** Lijstnaam → vast product-icoon (pool-URL, _240). */
export const FRIETEN_LIST_PRODUCT_ICON_URL =
  "/images/ui/product_icons/frieten_240.webp" as const;

/** Café-lijstjes (Figma 1321:23139): decor uit `/images/ui/cafe_240.webp`. */
export const CAFE_LIST_PRODUCT_ICON_URL =
  "/images/ui/cafe_240.webp" as const;

const FRIETEN_LIST_NAME_KEYS = new Set<string>([
  "frieten",
  "frietjes",
  "frituur",
]);

/** bv. "Frituur 2" — zelfde frituur-decor als de basistrefwoorden. */
const FRITUUR_LIST_NAME_WITH_SUFFIX_RE =
  /^(frituur|frieten|frietjes)(\s+\d+)?$/i;

const CAFE_LIST_NAME_KEYS = new Set<string>(["café", "cafe"]);

/** bv. "Café 2" — zelfde café-decor. */
const CAFE_LIST_NAME_WITH_SUFFIX_RE = /^(café|cafe)(\s+\d+)?$/i;

/**
 * Bepaalt of een lijstnaam een vast decor-icoon verdient (los van willekeurige pool-keuze).
 * Exacte match op trim + lowercase, of basistrefwoord + optioneel volgnummer.
 */
export function listProductIconUrlFromListName(
  name: string | null | undefined,
): string | null {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) return null;
  const key = trimmed.toLowerCase();
  if (FRIETEN_LIST_NAME_KEYS.has(key)) {
    return FRIETEN_LIST_PRODUCT_ICON_URL;
  }
  if (FRITUUR_LIST_NAME_WITH_SUFFIX_RE.test(trimmed)) {
    return FRIETEN_LIST_PRODUCT_ICON_URL;
  }
  if (CAFE_LIST_NAME_KEYS.has(key)) {
    return CAFE_LIST_PRODUCT_ICON_URL;
  }
  if (CAFE_LIST_NAME_WITH_SUFFIX_RE.test(trimmed)) {
    return CAFE_LIST_PRODUCT_ICON_URL;
  }
  return null;
}

/** Frituur-/frietenlijst (wizard + secties Frieten/Sauzen/Snacks). */
export function listIsFrituurVenueList(
  name: string | null | undefined,
): boolean {
  return listProductIconUrlFromListName(name) === FRIETEN_LIST_PRODUCT_ICON_URL;
}

/** Café-lijst (Figma: tabs Koude dranken, …, wizard `?cafeWizard=1`). */
export function listIsCafeVenueList(name: string | null | undefined): boolean {
  return listProductIconUrlFromListName(name) === CAFE_LIST_PRODUCT_ICON_URL;
}

export function isLegacyFoodListDecorIcon(src: string | null | undefined): boolean {
  if (!src) return false;
  return src.includes("/images/ui/food/");
}

/** Map `_160`/`_320` product-icon naar `_240` indien die in de pool zit. */
export function canonicalListProductIcon240(
  src: string | null | undefined,
): string | null {
  const raw = src?.trim() ?? "";
  if (!raw) return null;
  if (LIST_PRODUCT_ICON_URL_SET.has(raw)) return raw;
  const alt = raw.replace(/_(160|320)\.webp$/i, "_240.webp");
  if (LIST_PRODUCT_ICON_URL_SET.has(alt)) return alt;
  return null;
}

/** Deterministisch product-icoon op basis van lijst-ID (fallback / legacy). */
export function listProductIconUrlFromListId(listId: string): string {
  let h = 0;
  for (let i = 0; i < listId.length; i++) {
    h = (Math.imul(31, h) + listId.charCodeAt(i)) | 0;
  }
  return POOL[Math.abs(h) % POOL.length] as string;
}

/**
 * Voor weergave: oude `/images/ui/food/*.png` in DB → product-webp.
 * Anders ongewijzigd (o.a. winkel-SVG’s in `/logos/`).
 */
export function resolveListDecorIconUrl(
  storedIcon: string,
  listId: string,
): string {
  if (isLegacyFoodListDecorIcon(storedIcon)) {
    return listProductIconUrlFromListId(listId);
  }
  return storedIcon;
}

/** Telt mee voor “minst gebruikt”-keuze: alleen bekende pool-iconen; geen winkel-logo’s. */
function iconUrlForListUsageCount(list: {
  id: string;
  icon?: string | null;
}): string | null {
  const raw = list.icon?.trim() ?? "";
  if (!raw || raw.startsWith("/logos/")) return null;
  if (isLegacyFoodListDecorIcon(raw)) {
    return listProductIconUrlFromListId(list.id);
  }
  return canonicalListProductIcon240(raw);
}

/**
 * Kiest het pool-icoon dat nu het **minst** voorkomt onder de gegeven lijsten
 * (bij gelijke stand: lexicografisch kleinste URL voor stabiliteit).
 */
export function pickLeastUsedListProductIconFromPeers(
  peers: readonly { id: string; icon?: string | null }[],
): string {
  const counts = new Map<string, number>();
  for (const u of POOL) counts.set(u, 0);
  for (const l of peers) {
    const c = iconUrlForListUsageCount(l);
    if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  let best = POOL[0] as string;
  let bestCount = counts.get(best) ?? 0;
  for (const u of POOL) {
    const n = counts.get(u) ?? 0;
    if (n < bestCount || (n === bestCount && u.localeCompare(best) < 0)) {
      best = u;
      bestCount = n;
    }
  }
  return best;
}

/** Nieuw lijstje: minst gebruikte icoon t.o.v. bestaande lijsten (incl. gedeelde pool). */
export function pickListProductIconForNewList<T extends { id: string; icon?: string | null }>(
  existingLists: readonly T[],
  listName?: string | null,
): string {
  const fromName = listProductIconUrlFromListName(listName);
  if (fromName) return fromName;
  return pickLeastUsedListProductIconFromPeers(existingLists);
}

export const EMPTY_HOME_LIST_ILLUSTRATION_SRC = POOL[0] as string;

function isRebalanceableListIcon(
  icon: string | null | undefined,
  isMasterTemplate: boolean,
): boolean {
  if (isMasterTemplate) return false;
  const raw = icon?.trim() ?? "";
  if (!raw) return true;
  if (raw.startsWith("/logos/")) return true;
  if (isLegacyFoodListDecorIcon(raw)) return true;
  return canonicalListProductIcon240(raw) != null;
}

/**
 * Herverdeelt decor-iconen over **eigen** niet-master lijsten: greedy “minst gebruikt”
 * in stabiele lijst-ID-volgorde → zo min mogelijk duplicaten binnen de pool.
 * Winkel-/master-logo’s (`/logos/` op master-template) blijven ongemoeid.
 */
export function planOwnerListDecorIconUpdates(
  ownedLists: readonly {
    id: string;
    icon?: string | null;
    isMasterTemplate: boolean;
    name?: string | null;
  }[],
): Array<{ listId: string; nextIcon: string }> {
  const eligible = ownedLists.filter((l) =>
    isRebalanceableListIcon(l.icon, l.isMasterTemplate),
  );
  if (eligible.length === 0) return [];

  const sorted = [...eligible].sort((a, b) => a.id.localeCompare(b.id));
  const counts = new Map<string, number>();
  for (const u of POOL) counts.set(u, 0);

  const assigned = new Map<string, string>();
  for (const l of sorted) {
    const named = listProductIconUrlFromListName(l.name);
    if (named) {
      assigned.set(l.id, named);
      counts.set(named, (counts.get(named) ?? 0) + 1);
      continue;
    }
    let best = POOL[0] as string;
    let bestC = counts.get(best) ?? 0;
    for (const u of POOL) {
      const c = counts.get(u) ?? 0;
      if (c < bestC || (c === bestC && u.localeCompare(best) < 0)) {
        best = u;
        bestC = c;
      }
    }
    assigned.set(l.id, best);
    counts.set(best, bestC + 1);
  }

  const out: Array<{ listId: string; nextIcon: string }> = [];
  for (const l of sorted) {
    const next = assigned.get(l.id) as string;
    const cur = iconUrlForListUsageCount(l);
    if (cur !== next) {
      out.push({ listId: l.id, nextIcon: next });
    }
  }
  return out;
}

/** Home-lijstkaart: product-webp uit DB; legacy food; from-master met alleen winkel-logo in `icon`. */
export function homeListCardIconSrc(list: {
  id: string;
  icon: string;
  displayVariant: string;
  name?: string | null;
}): string {
  const named = listProductIconUrlFromListName(list.name);
  if (named) return named;
  const raw = list.icon?.trim() ?? "";
  const poolHit = canonicalListProductIcon240(raw);
  if (poolHit) return poolHit;
  if (list.displayVariant === "from-master" && raw.startsWith("/logos/")) {
    return listProductIconUrlFromListId(list.id);
  }
  if (!raw) return listProductIconUrlFromListId(list.id);
  return resolveListDecorIconUrl(raw, list.id);
}
