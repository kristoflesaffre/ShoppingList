/** Winkels voor master-lijstje — Figma 794:3317; logo’s in public/logos */

export const MASTER_STORE_OPTIONS = [
  {
    slug: "lidl-delhaize",
    label: "Lidl / Delhaize",
    logoSrc: "/logos/logos-lidl-delhaize.svg",
  },
  { slug: "delhaize", label: "Delhaize", logoSrc: "/logos/logos-delhaize.svg" },
  { slug: "lidl", label: "Lidl", logoSrc: "/logos/logos-lidl.svg" },
  { slug: "aldi", label: "Aldi", logoSrc: "/logos/logos-aldi.svg" },
  {
    slug: "carrefour",
    label: "Carrefour",
    logoSrc: "/logos/logos-carrefour.svg",
  },
  { slug: "colruyt", label: "Colruyt", logoSrc: "/logos/logos-colruyt.svg" },
  {
    slug: "bio-planet",
    label: "Bio-planet",
    logoSrc: "/logos/logos-bio-planet.svg",
  },
  { slug: "spar", label: "Spar", logoSrc: "/logos/logos-spar.svg" },
  { slug: "match", label: "Match", logoSrc: "/logos/logos-match.svg" },
  {
    slug: "albert-heijn",
    label: "Albert Heijn",
    logoSrc: "/logos/logos-albert-heijn.svg",
  },
  { slug: "jumbo", label: "Jumbo", logoSrc: "/logos/logos-jumbo.svg" },
  { slug: "okay", label: "Okay", logoSrc: "/logos/logos-okay.svg" },
  { slug: "action", label: "Action", logoSrc: "/logos/logos-action.svg" },
  { slug: "zeeman", label: "Zeeman", logoSrc: "/logos/logos-zeeman.svg" },
  { slug: "wibra", label: "Wibra", logoSrc: "/logos/logos-wibra.svg" },
  {
    slug: "kruidvat",
    label: "Kruidvat",
    logoSrc: "/logos/logos-kruidvat.svg",
  },
] as const;

export type MasterStoreSlug = (typeof MASTER_STORE_OPTIONS)[number]["slug"];

export function findMasterStoreBySlug(
  slug: string,
): (typeof MASTER_STORE_OPTIONS)[number] | undefined {
  return MASTER_STORE_OPTIONS.find((s) => s.slug === slug);
}

function normalizeStoreName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s*\/\s*/g, " / ")
    .replace(/\s+/g, " ");
}

/** Exacte winkelnaam-herkenning voor handmatig aangemaakte lijstjes. */
export function findMasterStoreByListName(
  name: string | null | undefined,
): (typeof MASTER_STORE_OPTIONS)[number] | undefined {
  const key = normalizeStoreName(name ?? "");
  if (!key) return undefined;
  return MASTER_STORE_OPTIONS.find((store) => {
    const label = normalizeStoreName(store.label);
    const slug = normalizeStoreName(store.slug.replace(/-/g, " "));
    return key === label || key === slug;
  });
}

/** Zelfde logo-bestandsnaam als op het lijstje → winkelnaam voor o.a. klantenkaart-titel. */
export function masterStoreLabelFromListIcon(iconPath: string): string {
  const logoFile = iconPath.split("/").pop() ?? "";
  if (!logoFile) return "";
  const match = MASTER_STORE_OPTIONS.find(
    (s) => (s.logoSrc.split("/").pop() ?? "") === logoFile,
  );
  return match?.label ?? "";
}

/** Combi Lidl+Delhaize (Figma 913:5842): twee loyalty-slots op één lijst. */
export function listIconIsLidlDelhaizeCombo(iconPath: string): boolean {
  const logoFile = iconPath.split("/").pop() ?? "";
  return logoFile === "logos-lidl-delhaize.svg";
}

const delhaizeStore = MASTER_STORE_OPTIONS.find((s) => s.slug === "delhaize")!;
const lidlStore = MASTER_STORE_OPTIONS.find((s) => s.slug === "lidl")!;
const lidlDelhaizeComboStore = MASTER_STORE_OPTIONS.find(
  (s) => s.slug === "lidl-delhaize",
)!;

/** Logo’s per loyalty-slot bij `lidl-delhaize` combi (primary = Delhaize, secondary = Lidl). */
export const LOYALTY_COMBO_PRIMARY_LOGO_SRC = delhaizeStore.logoSrc;
export const LOYALTY_COMBO_SECONDARY_LOGO_SRC = lidlStore.logoSrc;

/**
 * Logo-URL(s) die getoond worden als badge op een weeklijstje dat van een masterlijst komt.
 * Bij de Lidl/Delhaize-combi: één gecombineerd logo (Figma lijsttegel).
 */
export function storeLogosFromListIcon(iconPath: string): string[] {
  if (listIconIsLidlDelhaizeCombo(iconPath)) {
    return [lidlDelhaizeComboStore.logoSrc];
  }
  return [iconPath];
}
