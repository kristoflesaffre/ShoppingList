"use client";

import * as React from "react";
import { teKopenMonogramStyle } from "@/lib/te-kopen-style";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { ListCard } from "@/components/ui/list_card";
import { SwipeToDelete } from "@/components/ui/swipe_to_delete";
import { MiniButton } from "@/components/ui/mini_button";
import { PlusCircleMaskIcon } from "@/components/ui/plus_circle_mask_icon";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { LoyaltyCardDisplay } from "@/components/loyalty_card_display";
import { InputField } from "@/components/ui/input_field";
import { Button } from "@/components/ui/button";
import { SelectTile } from "@/components/ui/select_tile";
import { StoreSelectionTile } from "@/components/ui/store_selection_tile";
import { cn } from "@/lib/utils";
import {
  defaultCafeListName,
  defaultFrituurListName,
  defaultLandalListName,
  defaultNewListName,
  formatDefaultListNameForDisplay,
  selectListNameInputOnFocus,
} from "@/lib/list-default-name";
import {
  homeListCardItemCountLine,
  inferLandalTripLabel,
  isLandalListCard,
} from "@/lib/landal-list-card";
import {
  isLandalGezinList,
  landalGezinHouseholdMembershipTransactions,
  LANDAL_GEZIN_HOUSEHOLD_INSTANT_USER_IDS,
} from "@/lib/landal-gezin-household";
import {
  autoShareMembershipTransactions,
  listAutoShareKind,
  useAutoShare,
} from "@/lib/auto-share";
import { listIsMasterTemplate } from "@/lib/list-master";
import {
  MASTER_STORE_OPTIONS,
  TE_KOPEN_STORE_OPTIONS,
  findMasterStoreByListName,
  findMasterStoreBySlug,
  masterStoreLabelFromListIcon,
  storeLogosFromListIcon,
  listIconIsLidlDelhaizeCombo,
  LOYALTY_COMBO_PRIMARY_LOGO_SRC,
  LOYALTY_COMBO_SECONDARY_LOGO_SRC,
} from "@/lib/master-stores";
import { db } from "@/lib/db";
import { FloatingActionButton } from "@/components/ui/floating_action_button";
import { APP_FAB_BOTTOM_CLASS } from "@/lib/app-layout";
import {
  homeListCardIconSrc,
  listIsFrituurVenueList,
  listIsCafeVenueList,
  listProductIconUrlFromListName,
  pickListProductIconForNewList,
  planOwnerListDecorIconUpdates,
} from "@/lib/list-product-icons";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import {
  ListSectionHeader,
} from "@/components/list_section_header";
import { HomeHeader } from "@/components/home_header";
import { HomeOnboardingEmptyCard } from "@/components/home_onboarding_empty_card";
import type { LoyaltyCardCodeType } from "@/lib/loyalty_card";
import type { MasterStoreSlug } from "@/lib/master-stores";
import {
  buildCalendarEntries,
  toIsoDate,
  dayEntryHasContent,
  addDays,
  selectCalendarPreviewItems,
  type DayEntry,
} from "@/lib/calendar-utils";
import { useItemPhotoUrl } from "@/lib/item-photos";
import { CountBadge } from "@/components/ui/count_badge";
import { isEmptyDraftMasterList, useCleanupDraftMasterLists } from "@/lib/draft-master-lists";
import { FavoritesPromoBanner, useFavoritesPromo } from "@/components/favorites_promo_banner";
import { FreezeMaskIcon } from "@/components/ui/freeze_mask_icon";
import { recipeTintColors, useIsDarkTheme, useRecipeTint } from "@/lib/recipe-tint";
import { IngredientPlate } from "@/components/ingredient_plate";
import { frituurItemIconSrc } from "@/lib/frituur-item-icons";
import { uploadUserImageFile } from "@/lib/image-storage";
import { AddShoppingItemSlideIn } from "@/components/add_shopping_item_slide_in";
import { primeKeyboard } from "@/lib/keyboard_focus";
import { ListDateStepper } from "@/components/list_date_stepper";
import { isListDatePassed, isoToListDate, listDateToIso, todayIsoDate } from "@/lib/list-date";
import { ItemNameSearchSlideIn } from "@/components/ui/item_name_search_slide_in";
import { resolveItemCategoryFromName } from "@/lib/item-ingredient-category";
import { loadStoreOrder, applySavedStoreOrder } from "@/app/te-kopen/store_order_panel";
import { getVisibleShoppingOwnerIds } from "@/lib/shopping-share";
import {
  type HomeSectionConfig,
  type HomeSectionId,
  loadHomeSectionConfig,
  saveHomeSectionConfig,
  DEFAULT_SECTION_ORDER,
} from "@/lib/home-section-config";
import { normalizeTripPerson } from "@/lib/trip-person";
import { useFilmsLibrary } from "@/hooks/use_films_library";
import { useWatchingTvItems } from "@/hooks/use_watching_tv_items";

type ListMembershipRow = { id?: string; instantUserId?: string };

/** Figma 1320:22790 — volgorde swimlane supermarktlogos. */
const SUPERMARKT_SWIMLANE_SLUG_ORDER: readonly MasterStoreSlug[] = [
  "colruyt",
  "delhaize",
  "lidl",
  "aldi",
  "carrefour",
  "bio-planet",
  "spar",
  "match",
  "albert-heijn",
  "jumbo",
  "okay",
  "lidl-delhaize",
  "action",
  "zeeman",
  "wibra",
  "kruidvat",
] as const;

function masterStoresForSupermarktSwimlane(): (typeof MASTER_STORE_OPTIONS)[number][] {
  const bySlug = new Map(MASTER_STORE_OPTIONS.map((s) => [s.slug, s]));
  const out: (typeof MASTER_STORE_OPTIONS)[number][] = [];
  for (const slug of SUPERMARKT_SWIMLANE_SLUG_ORDER) {
    const s = bySlug.get(slug);
    if (s) out.push(s);
  }
  return out;
}

/** Meest gekozen winkels eerst; bij gelijke telling recentst gekozen eerst; anders vaste Figma-volgorde. */
function sortSupermarktStoresByPickerUsage(
  stores: (typeof MASTER_STORE_OPTIONS)[number][],
  statsRows: ReadonlyArray<{
    storeSlug?: string | null;
    pickCount?: number | null;
    lastPickedAtIso?: string | null;
  }>,
): (typeof MASTER_STORE_OPTIONS)[number][] {
  const bySlug = new Map<string, { count: number; last: string }>();
  for (const r of statsRows) {
    const slug = String(r.storeSlug ?? "").trim();
    if (!slug) continue;
    const n =
      typeof r.pickCount === "number" && !Number.isNaN(r.pickCount)
        ? r.pickCount
        : 0;
    const last = String(r.lastPickedAtIso ?? "");
    const prev = bySlug.get(slug);
    if (!prev) {
      bySlug.set(slug, { count: n, last });
    } else {
      bySlug.set(slug, {
        count: Math.max(prev.count, n),
        last: last > prev.last ? last : prev.last,
      });
    }
  }
  const defaultIdx = new Map(
    SUPERMARKT_SWIMLANE_SLUG_ORDER.map((slug, i) => [slug, i]),
  );
  return [...stores].sort((a, b) => {
    const sa = bySlug.get(a.slug) ?? { count: 0, last: "" };
    const sb = bySlug.get(b.slug) ?? { count: 0, last: "" };
    if (sb.count !== sa.count) return sb.count - sa.count;
    if (sb.last !== sa.last) return sb.last.localeCompare(sa.last);
    return (
      (defaultIdx.get(a.slug as MasterStoreSlug) ?? 999) -
      (defaultIdx.get(b.slug as MasterStoreSlug) ?? 999)
    );
  });
}

/** Koppel klantenkaart aan nieuw lijstje wanneer winkel past (Figma 1320:22753). */
function findLoyaltyCardIdForStore(
  store: (typeof MASTER_STORE_OPTIONS)[number],
  loyaltyCards: ReadonlyArray<{
    id: string;
    cardName?: string | null;
    list?: { id?: string } | null;
  }>,
): string | null {
  const want = store.label.trim().toLowerCase();
  const matches = loyaltyCards.filter(
    (c) => String(c.cardName ?? "").trim().toLowerCase() === want,
  );
  const unlinked = matches.find((c) => !c.list?.id);
  return (unlinked ?? matches[0])?.id ?? null;
}

/** Venue-slide na FAB: supermarkt/café-illustraties; frituur nog placeholder. */
const VENUE_TILE_ICON_SUPERMARKT = "/images/ui/supermarkt_160.webp";
const VENUE_TILE_ICON_FRITUUR = "/images/ui/product_icons/frieten_160.webp";
const VENUE_TILE_ICON_CAFE = "/images/ui/cafe_160.webp";
const VENUE_TILE_ICON_LANDAL = "/images/ui/landal_160.webp";
const VENUE_TILE_ICON_VAKANTIE = "/images/ui/vakantie_160.webp";
const VENUE_TILE_ICON_GEZIN = "/images/ui/gezin_160.webp";
const VENUE_TILE_ICON_VRIENDEN = "/images/ui/vrienden_160.webp";

type PendingLandalChoice = { listName: string };

type PendingFrituurChoice = {
  listName: string;
  customIconUrl: string | null;
};

function defaultListNameForIsoDate(isoDate: string): string {
  return defaultNewListName(new Date(`${isoDate}T12:00:00`));
}

type HomeList = {
  id: string;
  name: string;
  date: string;
  icon: string;
  order: number;
  items?: { id: string }[];
  /** Alleen eigenaar mag lijst verwijderen; gedeelde lijsten zijn read-open + bewerken op detail. */
  isOwner: boolean;
  /** Lidmaatschappen om mee te verwijderen bij delete (alleen bij eigenaar). */
  membershipIds?: string[];
  /** Figma 762:3452: toon "gedeeld met …" op de kaart. */
  displayVariant: "default" | "shared" | "master" | "from-master";
  /** Voornaam van de andere partij (deelnemer of eigenaar); null = ListCard toont "deelnemer". */
  sharedWithFirstName: string | null;
  /** Profielfoto van die andere partij (rechtsonder op de home-tegel). */
  sharedWithAvatarUrl?: string | null;
  /** Winkellogo-URL's (1-2) voor kaartbadge bij displayVariant "from-master". */
  storeLogos: string[];
  /** Master-template (niet: weeklijst met winkel-logo). */
  isMasterTemplate: boolean;
  /** Eigen geüploade foto als lijstjedicoon. */
  customIconUrl?: string | null;
  /** Landal-trip (Gezin/Vrienden) voor kaartondertitel. */
  landalTripLabel?: string | null;
  /** Winkellogo van de master waaruit dit lijstje gemaakt is (voor «+ Lijstje»). */
  masterIcon?: string | null;
  /** Master-lijstje waaruit dit lijstje gemaakt is (voor «+ Lijstje»). */
  sourceMasterListId?: string | null;
};

type SavedListIconImage = {
  id: string | null;
  imageDataUrl: string;
  createdAtIso: string;
  lastUsedAtIso: string;
};

type FrituurPreviousList = {
  id: string;
  name: string;
  items: CopyableListItem[];
};

type CopyableListItem = {
  name?: unknown;
  quantity?: unknown;
  section?: unknown;
  order?: unknown;
  itemCategory?: unknown;
  recipeGroupId?: unknown;
  recipeName?: unknown;
  recipeLink?: unknown;
  fromStock?: unknown;
  stockPhotoUrl?: unknown;
  itemDate?: unknown;
  tripPerson?: unknown;
  trip_person?: unknown;
};

type CopyableListTemplate = {
  items?: CopyableListItem[] | null;
};

function nonEmptyString(value: unknown): string | null {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function copiedItemUpdate(item: CopyableListItem, order: number) {
  const itemName = nonEmptyString(item.name);
  if (!itemName) return null;

  const update: Record<string, string | number | boolean> = {
    name: itemName,
    quantity: String(item.quantity ?? "1"),
    checked: false,
    section: String(item.section ?? "Algemeen"),
    order,
  };

  const optionalStringFields = [
    "itemCategory",
    "recipeGroupId",
    "recipeName",
    "recipeLink",
    "stockPhotoUrl",
    "itemDate",
  ] as const;

  for (const field of optionalStringFields) {
    const value = nonEmptyString(item[field]);
    if (value) update[field] = value;
  }

  if (item.fromStock === true) update.fromStock = true;

  const tripPerson = nonEmptyString(item.tripPerson ?? item.trip_person);
  if (tripPerson) update.tripPerson = normalizeTripPerson(tripPerson);

  return update;
}

type HomeLoyaltyCard = {
  id: string;
  cardName: string;
  logoSrc: string;
  codeType: LoyaltyCardCodeType;
  codeFormat: string | null;
  rawValue: string | null;
};

type HomeFreezerRow = {
  id: string;
  ownerId?: string;
  order?: number;
  name: string;
  type?: string;
  recipePhotoUrl?: string;
  packages: number;
  quantityPerPackage?: number;
  unit?: string;
  recipePersons?: number;
};

function normalizeLoyaltyCodeType(codeType: unknown): LoyaltyCardCodeType | null {
  return codeType === "qr" || codeType === "barcode" ? codeType : null;
}

function QrLargeIcon({ className }: { className?: string }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M15.9712 41.5725V32.4293H6.828V41.5725H15.9712ZM30.5997 43.4002H28.772V41.5725H30.5997V43.4002ZM41.5725 41.5725V43.4002H37.9148V39.7426H36.0848V43.4002H34.2571V41.5725H32.4294V39.7425H34.2571V37.9148H39.7425V41.5725L41.5725 41.5725ZM14.1434 39.7425H8.65806V34.2572H14.1434V39.7425ZM30.5991 39.7425H28.7714V37.9148H30.5991V39.7425ZM28.7714 30.5993V32.4293H30.5991V30.5993H28.7714ZM34.2571 37.9148L32.429 37.9147V34.2571H34.2567L34.2571 37.9148ZM41.5721 36.0847H39.7421V34.257H41.5721V36.0847ZM37.9145 26.9439V28.7716H39.7422V26.9439H37.9145ZM23.286 28.7716V30.5993H19.6284V28.7716H15.9707V26.9439H21.4561V28.7716H23.286ZM6.828 28.7716H5.0003V25.1139H6.828V28.7716ZM14.1434 28.7716H12.3157V26.9439H14.1434V28.7716ZM15.9707 26.9439H14.1434V25.1139H12.3157V23.2862H10.4857V26.9438H8.658V23.2862H6.828V21.4562H8.658V19.6285H17.8012V21.4562H15.9712V23.2862H17.8012V21.4562H21.4566V25.1138H15.9712L15.9707 26.9439ZM23.2865 26.9439H21.4561L21.4566 25.1138L23.2865 25.1139V26.9439ZM26.9442 23.2862V25.1139L23.2865 25.1139V21.4563H25.1142V23.2863L26.9442 23.2862ZM30.5995 25.1139H28.7718V23.2862H30.5995V25.1139ZM21.4563 10.4855V12.3155H23.2863V10.4855H21.4563ZM34.2569 23.2861H32.4292V21.4561H30.5992V19.6284H39.7424V21.4561H34.2571L34.2569 23.2861ZM6.828 21.4562L5.00012 21.4561V19.6284H6.82782L6.828 21.4562ZM15.971 15.9707V6.82752H6.82782V15.9707H15.971ZM41.5723 15.9707V6.82752H32.4291V15.9707H41.5723ZM14.1432 14.143H8.65788V8.6577H14.1432V14.143ZM39.7421 14.143H34.2568V8.6577H39.7421V14.143ZM28.7717 10.4854H26.944V8.6577H28.7717V10.4854ZM28.7717 6.82776H26.944V5.00006H28.7717V6.82776ZM17.8012 43.3995H5.00059V30.5988H17.8012V43.3995ZM34.2569 30.5988V32.4288H32.4292L32.429 34.2571L28.7716 34.2565V37.9142H26.9439V34.2565H25.1139V37.9142H26.9439V39.7419H25.1139V41.5719H26.9439V43.3996H19.6284V41.5719H23.2861V39.7419H19.6284V32.4288H23.2861L23.286 30.5993L25.1138 30.5988V32.4288H26.9438V30.5988H25.1138V26.9435H26.9438V28.7712H28.7715V26.9435H30.5992V28.7712H32.4292V30.5989L34.2569 30.5988ZM41.5723 28.7711H43.4V30.5988H41.5723V32.4288H39.7423L39.7421 34.257L36.0847 34.2565V28.7712H34.257V26.9435H32.4293V25.1135H34.257L34.2569 23.2861L36.0847 23.2858V25.1135H37.9147V23.2858H39.7424L39.7424 21.4561L43.4 21.4558V23.2858H41.5723V28.7711ZM26.944 10.4854L26.9439 12.3153H28.7716L28.7718 23.2862H26.9442L26.9439 19.6281H25.1139V17.8004H26.9439V14.1428H25.1139V17.8004H23.2862V14.1428H21.4561V17.8004H23.2862V19.6281H19.6285V8.65764H21.4562V5H25.1139V10.4853L26.944 10.4854ZM17.8006 17.8007H5V5.00006H17.8006V17.8007ZM43.3995 17.8007H30.5989V5.00006H43.3995V17.8007Z"
        fill="currentColor"
      />
    </svg>
  );
}

function BarcodeLargeIcon({ className }: { className?: string }) {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      className={className}
      aria-hidden
    >
      <path d="M5 5H7.17418V43.4H5V5Z" fill="currentColor" />
      <path d="M36.7664 5H38.9405V43.4H36.7664V5Z" fill="currentColor" />
      <path d="M11.069 5H14.1214V43.4H11.069V5Z" fill="currentColor" />
      <path d="M40.3477 5H43.4V43.4H40.3477V5Z" fill="currentColor" />
      <path d="M15.5238 5H19.6142V43.4H15.5238V5Z" fill="currentColor" />
      <path d="M26.0002 5H35.3662V43.4H26.0002V5Z" fill="currentColor" />
      <path d="M8.5769 5H9.66399V43.4H8.5769V5Z" fill="currentColor" />
      <path d="M23.506 5H24.5931V43.4H23.506V5Z" fill="currentColor" />
      <path d="M21.0166 5H22.1037V43.4H21.0166V5Z" fill="currentColor" />
    </svg>
  );
}

/** Home klantenkaart-indicator: toont store-specifiek groot QR- of barcode-icoon. */
function HomeLoyaltyCodeIcon({
  codeType,
  className,
}: {
  codeType: LoyaltyCardCodeType;
  className?: string;
}) {
  if (codeType === "qr") {
    return <QrLargeIcon className={cn("size-12 shrink-0 text-[var(--gray-200)]", className)} />;
  }
  return <BarcodeLargeIcon className={cn("size-12 shrink-0 text-[var(--gray-200)]", className)} />;
}

/** Figma 1156:10464 — klantenkaart-tegel in horizontale swimlane. */
function HomeLoyaltyCardTile({ card, onClick }: { card: HomeLoyaltyCard; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="block rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
    >
      <div className="flex w-[120px] shrink-0 items-center rounded-lg bg-[var(--white)] p-3 shadow-card transition-[box-shadow,background-color,transform] duration-fast ease-out-strong motion-safe:active:scale-[0.97] [@media(hover:hover)]:hover:bg-[var(--gray-25)] [@media(hover:hover)]:hover:shadow-raised">
        <div className="flex w-full flex-col gap-2">
          <div className="flex items-start">
            {/* winkellogo */}
            <div className="relative size-12 shrink-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element -- winkel-SVG uit /public/logos */}
              <img
                src={card.logoSrc}
                alt=""
                width={48}
                height={48}
                className="size-full object-contain object-center"
              />
            </div>
            {/* QR/barcode-indicator afhankelijk van kaarttype */}
            <HomeLoyaltyCodeIcon codeType={card.codeType} className="size-12 shrink-0" />
          </div>
          <p className="w-full overflow-hidden text-ellipsis whitespace-nowrap text-center text-sm font-medium leading-5 tracking-normal text-[var(--text-primary)]">
            {card.cardName}
          </p>
        </div>
      </div>
    </button>
  );
}

/** Figma 1156:10457 — sectie klantenkaarten op startpagina (swimlane). */
function HomeLoyaltyCardsSwimlane({ cards }: { cards: HomeLoyaltyCard[] }) {
  const [viewCard, setViewCard] = React.useState<HomeLoyaltyCard | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <ListSectionHeader
        icon="card"
        label="Klantenkaarten"
        showNaarOverzicht
        naarOverzichtHref="/klantenkaarten"
        overzichtLabel="Toon alle"
      />
      {/* -mx + px: tegel-scroll loopt tot aan de schermrand, padding houdt eerste tegel op grid. */}
      <div
        className="-mx-[var(--space-4)] flex gap-3 overflow-x-auto px-[var(--space-4)] pb-1"
        // verberg scrollbar (visueel ongewenst op desktop)
        style={{ scrollbarWidth: "none" } as React.CSSProperties}
      >
        {cards.map((card) => (
          <HomeLoyaltyCardTile key={card.id} card={card} onClick={() => setViewCard(card)} />
        ))}
      </div>

      <SlideInModal
        open={viewCard !== null}
        onClose={() => setViewCard(null)}
        title={viewCard?.cardName ?? "Klantenkaart"}
        titleId="home-view-card-slide-title"
      >
        {viewCard ? (
          <div className="flex flex-col items-center gap-6 px-4">
            <div className="flex items-center justify-center rounded-xl bg-white p-4 shadow-sm">
              <LoyaltyCardDisplay
                codeType={viewCard.codeType as "qr" | "barcode"}
                codeFormat={viewCard.codeFormat ?? ""}
                rawValue={viewCard.rawValue ?? ""}
              />
            </div>
            <img
              src={viewCard.logoSrc}
              alt=""
              width={64}
              height={64}
              className="pointer-events-none size-16 shrink-0 object-contain"
            />
          </div>
        ) : null}
      </SlideInModal>
    </div>
  );
}

/** Figma 1135:7448 — ingrediëntenfoto's variant (geen recept, enkel losse ingrediënten).
 *  Vult de beschikbare breedte op via ResizeObserver: meer slots op grotere schermen. */
function HomeCalendarIngredientPhotos({
  ingredients,
}: {
  ingredients: { name: string; quantity: string; photoUrl?: string | null }[];
}) {
  const getPhotoUrl = useItemPhotoUrl(320);
  const containerRef = React.useRef<HTMLDivElement>(null);
  // Beginwaarde 4 (mobile); ResizeObserver corrigeert na mount.
  const [maxPhotos, setMaxPhotos] = React.useState(4);

  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([entry]) => {
      // Elke fotocel is 40px breed; minimale spatie tussen cellen = 6px → slotbreedte ≈ 46px.
      const slots = Math.max(1, Math.floor((entry.contentRect.width + 6) / 46));
      setMaxPhotos(slots);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const photosWithUrl = ingredients
    .map((ing) => ({ name: ing.name, url: ing.photoUrl ?? getPhotoUrl(ing.name) }))
    .filter((p) => p.url != null);
  const visiblePhotos = photosWithUrl.slice(0, maxPhotos);
  const overflowCount = Math.max(0, photosWithUrl.length - maxPhotos);

  if (ingredients.length === 0) return null;

  if (visiblePhotos.length === 0) {
    return (
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-base font-medium leading-6 text-[var(--gray-900)]">
          {ingredients[0].name}
        </p>
        {ingredients.length > 1 && (
          <p className="truncate text-xs leading-5 text-[var(--gray-400)]">
            +{ingredients.length - 1} item{ingredients.length - 1 > 1 ? "s" : ""}
          </p>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex min-w-0 flex-1 items-center gap-[6px]">
      {visiblePhotos.map((photo, i) => (
        <div key={i} className="relative size-10 shrink-0 overflow-hidden rounded-sm">
          {photo.url ? (
            // eslint-disable-next-line @next/next/no-img-element -- lokale item-webp
            <img
              src={photo.url}
              alt=""
              width={40}
              height={40}
              decoding="async"
              loading="lazy"
              className="absolute inset-0 size-full object-cover"
              aria-hidden
            />
          ) : null}
        </div>
      ))}
      {overflowCount > 0 ? (
        <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-[4px]">
          <span className="text-[14px] font-light leading-none text-[var(--gray-300)]">
            +{overflowCount}
          </span>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Losse items van een dag in de weekstrip: tot drie overlappende foto's, de namen als titel
 * en het aantal als ondertitel (zelfde typografie als de receptregel in de dagkaart).
 */
function HomeCalendarLooseSummary({
  ingredients,
}: {
  ingredients: { name: string; quantity: string; photoUrl?: string | null; fromStock?: boolean }[];
}) {
  const photos = useLoosePhotos(ingredients).filter(
    (url): url is string => url != null,
  );
  const previewItems = selectCalendarPreviewItems(ingredients);
  const shownNames = previewItems.slice(0, 2).map((ing) => ing.name);
  const names =
    ingredients.length > shownNames.length
      ? `${shownNames.join(", ")} +${ingredients.length - shownNames.length}`
      : shownNames.join(", ");
  const count = ingredients.length;
  const fromStock = ingredients.some((ing) => ing.fromStock);

  return (
    <>
      {photos.length > 0 ? (
        <div className="flex shrink-0 items-center">
          {photos.map((url, i) => (
            <div
              key={url + i}
              className={cn(
                "size-10 overflow-hidden rounded-full bg-[var(--white)] ring-2 ring-[var(--white)]",
                i > 0 && "-ml-3",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- lokale item-webp */}
              <img src={url} alt="" width={40} height={40} decoding="async" loading="lazy" className="size-full object-cover" aria-hidden />
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="truncate text-base font-medium leading-6 text-[var(--gray-900)] first-letter:uppercase">
          {names}
        </p>
        <p className="truncate text-xs leading-5 text-[var(--gray-400)]">
          {count === 1 ? "1 item" : `${count} items`}
          {fromStock ? " · uit de diepvries" : ""}
        </p>
      </div>
    </>
  );
}

/** Figma 1142:7467 / 1134:12682 — kalender-dagkaart op startpagina. */
function HomeCalendarCard({
  isoDate,
  entry,
  showDate = true,
}: {
  isoDate: string;
  entry: DayEntry;
  /** Uit in de weekstrip: de dag staat dan al in de geselecteerde dagknop. */
  showDate?: boolean;
}) {
  const date = entry.date;
  const monthAbbr = date
    .toLocaleDateString("nl-NL", { month: "short" })
    .replace(".", "")
    .slice(0, 3)
    .toUpperCase();
  const dayNum = date.getDate();
  const isToday = date.toDateString() === new Date().toDateString();

  const firstMeal = entry.meals[0] ?? null;
  const hasOnlyLooseIngredients = firstMeal === null && entry.looseIngredients.length > 0;
  /* In de weekstrip tonen we alle losse items samen (HomeCalendarLooseSummary), niet enkel het diepvriesitem. */
  const firstStockItem = hasOnlyLooseIngredients && showDate
    ? (entry.looseIngredients.find((i) => i.fromStock && i.photoUrl) ?? null)
    : null;

  const href =
    firstMeal?.recipeId != null
      ? `/recepten/${firstMeal.recipeId}`
      : `/kalender?date=${isoDate}`;

  return (
    <Link
      href={href}
      className="block h-full rounded-lg no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
    >
      <div className="flex h-full w-full items-center gap-3 rounded-lg bg-[var(--white)] px-3 py-3 shadow-card motion-safe:transition-transform motion-safe:duration-fast motion-safe:ease-out-strong motion-safe:active:scale-[0.97]">
        {/* Datumwidget — stijl 1: vandaag = gevuld accentblok, andere dagen = zachte tint */}
        {showDate ? (
        <div
          className={cn(
            "flex h-12 w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md",
            isToday ? "bg-[var(--blue-500)]" : "bg-[var(--blue-50)]",
          )}
          aria-label={isToday ? "Vandaag" : undefined}
        >
          <p
            className={cn(
              "text-[10px] font-bold leading-none tracking-[0.04em]",
              isToday ? "text-[var(--white)]" : "text-[var(--blue-500)]",
            )}
          >
            {monthAbbr}
          </p>
          <p
            className={cn(
              "text-[20px] font-bold leading-none",
              isToday ? "text-[var(--white)]" : "text-[var(--gray-900)]",
            )}
          >
            {dayNum}
          </p>
        </div>
        ) : null}

        {firstStockItem ? (
          /* Figma 1216:11859: diepvries-item — foto met sneeuwvlok-badge + naam + hoeveelheid */
          <>
            <div className="relative shrink-0 size-10">
              {/* eslint-disable-next-line @next/next/no-img-element -- stockPhotoUrl */}
              <img
                src={firstStockItem.photoUrl!}
                alt=""
                width={40}
                height={40}
                decoding="async"
                loading="lazy"
                className="size-full rounded-full object-cover"
                aria-hidden
              />
              {/* Sneeuwvlok-badge rechtsboven (Figma 1216:12097) */}
              <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[var(--white)] shadow-[0_1px_3px_rgba(0,0,0,0.12)]">
                <span
                  className="inline-block size-[11px] bg-[var(--blue-500)]"
                  style={{
                    WebkitMaskImage: "url(/icons/freeze.svg)",
                    maskImage: "url(/icons/freeze.svg)",
                    WebkitMaskSize: "contain",
                    maskSize: "contain",
                    WebkitMaskRepeat: "no-repeat",
                    maskRepeat: "no-repeat",
                    WebkitMaskPosition: "center",
                    maskPosition: "center",
                  }}
                  aria-hidden
                />
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="truncate text-base font-medium leading-6 text-[var(--gray-900)]">
                {firstStockItem.name}
              </p>
              {firstStockItem.quantity ? (
                <p className="truncate text-xs leading-5 text-[var(--gray-400)]">
                  {firstStockItem.quantity}
                </p>
              ) : null}
            </div>
          </>
        ) : hasOnlyLooseIngredients ? (
          showDate ? (
            /* Figma 1135:7448: rij van ingrediëntenfoto's met overflow */
            <HomeCalendarIngredientPhotos ingredients={entry.looseIngredients} />
          ) : (
            /* Weekstrip: foto's + namen + aantal, zodat de tegel zegt wat er op het menu staat */
            <HomeCalendarLooseSummary ingredients={entry.looseIngredients} />
          )
        ) : (
          /* Recept: foto + naam + aantal */
          <>
            {firstMeal?.photoUrl ? (
              <div className="relative size-10 shrink-0">
                <div className="size-10 overflow-hidden rounded-full">
                  {/* eslint-disable-next-line @next/next/no-img-element -- data-URL of externe receptfoto */}
                  <img
                    src={firstMeal.photoUrl}
                    alt=""
                    width={40}
                    height={40}
                    decoding="async"
                    loading="lazy"
                    className="size-full object-cover"
                    aria-hidden
                  />
                </div>
                {firstMeal.fromStock ? (
                  <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-[var(--white)] shadow-[0_1px_3px_rgba(0,0,0,0.12)]">
                    <span
                      className="inline-block size-[11px] bg-[var(--blue-500)]"
                      style={{
                        WebkitMaskImage: "url(/icons/freeze.svg)",
                        maskImage: "url(/icons/freeze.svg)",
                        WebkitMaskSize: "contain",
                        maskSize: "contain",
                        WebkitMaskRepeat: "no-repeat",
                        maskRepeat: "no-repeat",
                        WebkitMaskPosition: "center",
                        maskPosition: "center",
                      }}
                      aria-hidden
                    />
                  </span>
                ) : null}
              </div>
            ) : null}
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="truncate text-base font-medium leading-6 text-[var(--gray-900)]">
                {firstMeal?.recipeName ?? ""}
              </p>
              <p className="text-xs leading-5 text-[var(--gray-400)]">
                {firstMeal?.fromStock
                  ? "Diepvries"
                  : firstMeal?.ingredientCount === 1
                    ? "1 ingrediënt"
                    : `${firstMeal?.ingredientCount ?? 0} ingrediënten`}
              </p>
            </div>
          </>
        )}
      </div>
    </Link>
  );
}

type FreezerPreviewItem = Pick<
  HomeFreezerRow,
  "id" | "name" | "type" | "recipePhotoUrl" | "packages" | "quantityPerPackage" | "unit" | "recipePersons"
>;

/** Aantal tegels op de startpagina (daarna de «Alle N»-tegel). */
const FREEZER_HOME_TILE_COUNT = 8;

function freezerTileSubtitle(it: FreezerPreviewItem): string {
  if (it.type === "gerecht") {
    const persons = it.recipePersons ?? it.quantityPerPackage ?? 1;
    return persons === 1 ? "1 persoon" : `${persons} personen`;
  }
  return `${it.quantityPerPackage ?? 1} ${it.unit ?? "stuk"}`;
}

/** Canvas «Home · Diepvries C2»: gelijke fototegels, aantal als lavendel pil rechtsboven. */
function FreezerHomeTile({ item, photo }: { item: FreezerPreviewItem; photo: string | null }) {
  return (
    <li className="w-28 shrink-0 snap-start lg:w-[124px]">
      <Link
        href="/diepvriesvoorraad"
        className="block rounded-[20px] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
      >
        <span className="relative block aspect-square overflow-hidden rounded-[20px] bg-[var(--white)] shadow-[0_1px_2px_rgba(16,17,48,0.04)]">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element -- receptfoto of lokale item-webp
            <img src={photo} alt="" className="size-full object-cover" decoding="async" loading="lazy" />
          ) : (
            <span className="flex size-full items-center justify-center text-[40px] font-bold" style={teKopenMonogramStyle(item.name)} aria-hidden>
              {item.name.trim().charAt(0).toUpperCase()}
            </span>
          )}
          <CountBadge
            value={item.packages}
            label={`${item.packages} ${item.packages === 1 ? "portie" : "porties"}`}
            className="absolute right-2 top-2 !h-[26px] !min-w-[26px] !px-2 !text-[13px]"
          />
        </span>
        <span className="mt-[7px] block truncate text-sm font-semibold text-[var(--text-primary)] first-letter:uppercase">{item.name}</span>
        <span className="block truncate text-[12.5px] text-[var(--text-tertiary)]">{freezerTileSubtitle(item)}</span>
      </Link>
    </li>
  );
}

/** Recepten eerst, dan producten; binnen elke groep eerst items met een foto. */
function FreezerTilesRow({ items, total }: { items: FreezerPreviewItem[]; total: number }) {
  const getItemPhoto = useItemPhotoUrl(240);
  const withPhotos = items.map((it) => ({
    item: it,
    photo: it.recipePhotoUrl ?? (it.type === "gerecht" ? null : getItemPhoto(it.name)) ?? null,
  }));
  withPhotos.sort(
    (a, b) =>
      (a.item.type === "gerecht" ? 0 : 1) - (b.item.type === "gerecht" ? 0 : 1) ||
      (a.photo ? 0 : 1) - (b.photo ? 0 : 1),
  );
  const shown = withPhotos.slice(0, FREEZER_HOME_TILE_COUNT);

  return (
    <ul className="-mx-4 -my-1 flex list-none snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-4 px-4 py-1 [scrollbar-width:none] lg:mx-0 lg:gap-3.5 lg:px-0 [&::-webkit-scrollbar]:hidden">
      {shown.map(({ item, photo }) => (
        <FreezerHomeTile key={item.id} item={item} photo={photo} />
      ))}
      {total > shown.length ? (
      <li className="w-28 shrink-0 snap-start lg:w-[124px]">
        <Link
          href="/diepvriesvoorraad"
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-[20px] bg-[var(--blue-50)] text-sm font-bold text-[var(--blue-500)] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        >
          <FreezeMaskIcon className="!size-4" colorClassName="bg-[var(--blue-500)]" />
          Alle {total}
        </Link>
      </li>
      ) : null}
    </ul>
  );
}

/** Startpagina: diepvriesvoorraad — altijd zichtbaar (ook bij bestaande lijsten). */
function HomeDiepvriesSection({
  itemCount,
  previewItems,
  onHide,
}: {
  itemCount: number;
  previewItems: FreezerPreviewItem[];
  onHide?: () => void;
}) {
  const router = useRouter();

  if (itemCount > 0) {
    /* ── Content state (Figma 1195:10075) ────────────────────────────── */
    return (
      <div className="flex flex-col gap-4">
        <ListSectionHeader
          icon="freeze"
          label="Diepvries"
          count={itemCount}
          showNaarOverzicht
          naarOverzichtHref="/diepvriesvoorraad"
          overzichtLabel="Toon alle"
        />

        <FreezerTilesRow items={previewItems} total={itemCount} />
      </div>
    );
  }

  /* ── Empty state ──────────────────────────────────────────────────── */
  return (
    <div className="flex flex-col gap-4">
      <ListSectionHeader
        icon="freeze"
        label="Diepvries"
        showNaarOverzicht={false}
        onHide={onHide}
      />
      <HomeOnboardingEmptyCard
        illustrationSrc="/images/ui/empty_state_diepvries.png"
        illustrationSide="end"
        contentAlign="start"
        text="Weet altijd welke gerechten en ingrediënten je in voorraad hebt."
        actions={
          <div className="flex items-center gap-3">
            <MiniButton
              variant="primary"
              onClick={() => router.push("/diepvriesvoorraad")}
            >
              Beheer voorraad
            </MiniButton>
            <button
              type="button"
              className="text-[12px] font-medium leading-4 text-[var(--blue-500)] focus-visible:outline-none"
            >
              Meer info
            </button>
          </div>
        }
      />
    </div>
  );
}

const HOME_ONBOARDING_ILLUSTRATIONS = {
  lijstjes: "/images/ui/lijstje_160.webp",
  teKopen: "/images/ui/kopen_320.webp",
  favorieten: "/images/ui/hart_160.webp",
  kalender: "/images/ui/kalender_160.webp",
  klantenkaarten: "/images/ui/klantenkaart_160.webp",
} as const;

type HomeShoppingItem = {
  id: string;
  name: string;
  quantity: string;
  store?: string | null;
  order: number;
  ownerId?: string | null;
};

/** «4 stuk» → «4 stuks»; «1 stuk» blijft enkelvoud. Andere eenheden blijven zoals ingegeven. */
function pluralizeShoppingQuantity(quantity: string): string {
  const match = /^(\d+(?:[.,]\d+)?)\s*stuks?$/i.exec(quantity.trim());
  if (!match) return quantity;
  return match[1] === "1" ? "1 stuk" : `${match[1]} stuks`;
}

type ShoppingAddedBy = { firstName: string; avatarUrl: string | null };

/** Monogramkleuren voor producten zonder foto (canvas «Te kopen 6c»): zacht vlak, letter in dezelfde tint. */
function teKopenStoreLogo(store?: string | null): string | null {
  if (!store) return null;
  return MASTER_STORE_OPTIONS.find((s) => s.label === store)?.logoSrc ?? null;
}

/** Aantal producten in de Te kopen-swimlane (mobiel): kolommen van twee tegels. */
const TE_KOPEN_SWIM_COUNT = 8;

/** Te kopen 6c · brede tegel (227px) in een kolom van twee: foto of monogram, naam, winkel + aantal, wie. */
function HomeTeKopenSwimTile({
  item,
  addedBy,
}: {
  item: HomeShoppingItem;
  addedBy: ShoppingAddedBy | null;
}) {
  const getPhotoUrl = useItemPhotoUrl(160);
  const photoSrc = getPhotoUrl(item.name);
  const quantity = pluralizeShoppingQuantity(item.quantity);
  const storeLogo = teKopenStoreLogo(item.store);
  const initial = item.name.trim().charAt(0).toUpperCase();

  return (
    <Link
      href="/te-kopen"
      className="flex h-20 w-[227px] items-center gap-3 rounded-[18px] bg-[var(--white)] px-3 no-underline shadow-card transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
    >
      {photoSrc ? (
        <span className="flex size-[52px] shrink-0 items-center justify-center rounded-[14px] bg-[var(--gray-25)]" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element -- lokale item-webp */}
          <img src={photoSrc} alt="" width={40} height={40} className="size-10 object-contain mix-blend-multiply [[data-theme=dark]_&]:mix-blend-normal" />
        </span>
      ) : (
        <span
          className="flex size-[52px] shrink-0 items-center justify-center rounded-[14px] text-xl font-bold leading-none"
          style={teKopenMonogramStyle(item.name)}
          aria-hidden
        >
          {initial}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col leading-[18px]">
        <span className="truncate text-[15px] font-semibold text-[var(--text-primary)] first-letter:uppercase">
          {item.name}
        </span>
        <span className="flex min-w-0 items-center gap-[5px] text-[12.5px] text-[var(--gray-400)] tabular-nums">
          {storeLogo ? (
            // eslint-disable-next-line @next/next/no-img-element -- winkellogo
            <img src={storeLogo} alt="" width={13} height={13} className="size-[13px] shrink-0 object-contain" />
          ) : null}
          <span className="truncate">{quantity}</span>
        </span>
        {addedBy ? (
          <span className="mt-0.5 flex min-w-0 items-center gap-[5px] text-xs text-[var(--gray-400)]">
            <span className="flex size-3.5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--secondary-100)] text-[7px] font-bold text-[var(--secondary-800)]" aria-hidden>
              {addedBy.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- profielfoto (data-URL of blob)
                <img src={addedBy.avatarUrl} alt="" className="size-full object-cover" />
              ) : (
                addedBy.firstName.charAt(0).toUpperCase()
              )}
            </span>
            <span className="truncate">door {addedBy.firstName}</span>
          </span>
        ) : null}
      </span>
    </Link>
  );
}

/** Te kopen 6c · swimlane met kolommen van twee brede tegels, «+N · Alle M» als laatste kaart, bolletjes eronder. */
function HomeTeKopenSwimlane({
  items,
  total,
  addedByFor,
}: {
  items: HomeShoppingItem[];
  total: number;
  addedByFor: (item: HomeShoppingItem) => ShoppingAddedBy | null;
}) {
  const laneRef = React.useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const columns = chunkArray(items, 2);
  const rest = total - items.length;
  const pageCount = columns.length + (rest > 0 ? 1 : 0);

  const handleScroll = React.useCallback(() => {
    const el = laneRef.current;
    if (!el) return;
    const cols = Array.from(el.children) as HTMLElement[];
    let best = 0;
    let bestDist = Infinity;
    cols.forEach((c, i) => {
      const d = Math.abs(c.offsetLeft - el.offsetLeft - el.scrollLeft);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    if (el.scrollLeft + el.clientWidth >= el.scrollWidth - 4) best = cols.length - 1;
    setActiveIndex(best);
  }, []);

  const scrollToPage = (index: number) => {
    const el = laneRef.current;
    const col = el?.children[index] as HTMLElement | undefined;
    if (!el || !col) return;
    el.scrollTo({ left: col.offsetLeft - el.offsetLeft, behavior: "smooth" });
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div
        ref={laneRef}
        onScroll={handleScroll}
        className="-mx-4 -my-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-px-4 px-4 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {columns.map((col) => (
          <ul key={col[0].id} className="m-0 flex shrink-0 snap-start list-none flex-col gap-2.5 pl-0">
            {col.map((item) => (
              <li key={item.id}>
                <HomeTeKopenSwimTile item={item} addedBy={addedByFor(item)} />
              </li>
            ))}
          </ul>
        ))}
        {rest > 0 ? (
          <Link
            href="/te-kopen"
            className="flex w-24 shrink-0 snap-start flex-col items-center justify-center gap-1 rounded-[18px] bg-[var(--blue-25)] text-[13px] font-semibold text-[var(--blue-500)] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            <span className="text-xl font-bold tabular-nums">+{rest}</span>
            <span className="inline-flex items-center gap-0.5">
              Alle {total}
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-3">
                <path d="M6 3.5 10.5 8 6 12.5" />
              </svg>
            </span>
          </Link>
        ) : null}
      </div>
      {pageCount > 1 ? (
        <div className="flex justify-center gap-1.5" role="tablist" aria-label="Te kopen">
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={i < columns.length ? `Producten ${i * 2 + 1}–${Math.min(i * 2 + 2, items.length)}` : `Alle ${total} producten`}
              onClick={() => scrollToPage(i)}
              className={cn(
                "h-1.5 rounded-full transition-[width,background-color] duration-base ease-out-strong",
                i === activeIndex ? "w-[18px] bg-[var(--blue-500)]" : "w-1.5 bg-[var(--gray-200)]",
              )}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Aantal producten dat de Te kopen-sectie op desktop dichtgeklapt toont (twee rijen van drie). */
const TE_KOPEN_DESKTOP_PREVIEW_COUNT = 6;

/** Desktop 1 · één product als eigen tegel: foto of monogram, naam, en «4 stuks · door Chloé». */
function HomeTeKopenTile({
  item,
  addedBy,
}: {
  item: HomeShoppingItem;
  addedBy: ShoppingAddedBy | null;
}) {
  const getPhotoUrl = useItemPhotoUrl(160);
  const photoSrc = getPhotoUrl(item.name);
  const quantity = pluralizeShoppingQuantity(item.quantity);

  return (
    <Link
      href="/te-kopen"
      className="flex h-16 min-w-0 items-center gap-3 rounded-lg bg-[var(--white)] pl-3 pr-3.5 no-underline shadow-card transition-[transform,background-color] duration-fast ease-out-strong motion-safe:active:scale-[0.98] [@media(hover:hover)]:hover:bg-[var(--gray-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
    >
      {photoSrc ? (
        // eslint-disable-next-line @next/next/no-img-element -- lokale item-webp
        <img
          src={photoSrc}
          alt=""
          width={40}
          height={40}
          className="size-10 shrink-0 rounded-xl bg-[var(--blue-25)] object-contain p-1 mix-blend-multiply [[data-theme=dark]_&]:mix-blend-normal"
          aria-hidden
        />
      ) : (
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-xl text-base font-bold leading-none"
          style={teKopenMonogramStyle(item.name)}
          aria-hidden
        >
          {item.name.trim().charAt(0).toUpperCase()}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-medium leading-5 text-[var(--text-primary)] first-letter:uppercase">
          {item.name}
        </span>
        <span className="truncate text-xs leading-4 text-[var(--gray-400)] tabular-nums">
          {quantity}
          {addedBy ? ` · door ${addedBy.firstName}` : ""}
        </span>
      </span>
    </Link>
  );
}

/** Figma 1473:10662 / 1477:11210 / 1480:12999 — sectie «Te kopen» op de startpagina. */
function HomeTeKopenSection({
  shoppingItems,
  hasUsedBefore,
  addedByFor,
  onAddProduct,
  onHide,
}: {
  shoppingItems: HomeShoppingItem[];
  hasUsedBefore: boolean;
  /** Wie een item toevoegde (alleen voor items van een gedeelde lijst, niet van jezelf). */
  addedByFor: (item: HomeShoppingItem) => ShoppingAddedBy | null;
  onAddProduct?: () => void;
  onHide?: () => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const listId = React.useId();

  if (shoppingItems.length === 0) {
    if (hasUsedBefore) {
      // Figma 1480:12999 — eerder gebruikt, maar momenteel leeg
      return (
        <div className="flex flex-col gap-4">
          <ListSectionHeader
            icon="shopping-bag"
            label="Te kopen"
            showNaarOverzicht={false}
            onHide={onHide}
          />
          <button
            type="button"
            onClick={onAddProduct}
            className="flex h-12 w-full items-center gap-3 rounded-lg border border-dashed border-[var(--blue-200)] bg-[var(--blue-25)] p-3 text-left transition-[background-color,transform] duration-fast ease-out-strong motion-safe:active:scale-[0.98] [@media(hover:hover)]:hover:bg-[var(--blue-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={HOME_ONBOARDING_ILLUSTRATIONS.teKopen}
              alt=""
              width={32}
              height={32}
              className="size-8 shrink-0 object-contain opacity-70"
              aria-hidden
            />
            <span className="min-w-0 flex-1 text-sm font-normal leading-5 text-[var(--blue-300)]">
              Product toevoegen
            </span>
            <PlusCircleMaskIcon
              className="size-6 shrink-0"
              colorClassName="bg-[var(--blue-300)]"
            />
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-4">
        <ListSectionHeader
          icon="shopping-bag"
          label="Te kopen"
          showNaarOverzicht={false}
          onHide={onHide}
        />
        <HomeOnboardingEmptyCard
          illustrationSrc={HOME_ONBOARDING_ILLUSTRATIONS.teKopen}
          illustrationSide="end"
          contentAlign="start"
          text="Mag je niet vergeten bepaalde producten te kopen? Voeg ze hier toe!"
          actions={
            <MiniButton variant="primary" onClick={onAddProduct}>
              Voeg product toe
            </MiniButton>
          }
        />
      </div>
    );
  }

  /* Laatst toegevoegd eerst (hoogste `order`), los van de winkelgroepering van de volledige lijst. */
  const recentItems = [...shoppingItems].sort((a, b) => b.order - a.order);
  const desktopItems = expanded ? recentItems : recentItems.slice(0, TE_KOPEN_DESKTOP_PREVIEW_COUNT);
  const canExpandDesktop = recentItems.length > TE_KOPEN_DESKTOP_PREVIEW_COUNT;
  const toggleLabel = expanded ? "Toon minder" : `Toon alle ${recentItems.length}`;

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ListSectionHeader
        icon="shopping-bag"
        label="Te kopen"
        showNaarOverzicht={false}
        action={
          <button type="button" onClick={onAddProduct} className={HOME_SOFT_PILL_CLASS}>
            <HomeSoftPillPlusIcon />
            Toevoegen
          </button>
        }
      />
      {/* Desktop 1 · raster van tegels (3 kolommen), twee rijen dichtgeklapt. */}
      <div className="hidden flex-col gap-3 lg:flex">
        <ul id={`${listId}-desktop`} className="m-0 grid list-none grid-cols-3 gap-3 pl-0">
          {desktopItems.map((item) => (
            <li key={item.id} className="min-w-0">
              <HomeTeKopenTile item={item} addedBy={addedByFor(item)} />
            </li>
          ))}
        </ul>
        {canExpandDesktop ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              aria-controls={`${listId}-desktop`}
              className="inline-flex h-8 items-center gap-0.5 rounded-pill px-2.5 text-[13px] font-medium leading-[18px] text-action-primary transition-colors [@media(hover:hover)]:hover:bg-action-ghost-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
            >
              {toggleLabel}
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={cn("size-3.5 shrink-0 motion-safe:transition-transform motion-safe:duration-base motion-safe:ease-out-strong", expanded && "rotate-180")}>
                <path d="M3.5 6 8 10.5 12.5 6" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>
      <div className="-mt-3 flex flex-col gap-3 lg:hidden">
        <p className="text-[13px] leading-[18px] text-[var(--text-secondary)]">Laatst toegevoegd</p>
        <HomeTeKopenSwimlane
          items={recentItems.slice(0, TE_KOPEN_SWIM_COUNT)}
          total={recentItems.length}
          addedByFor={addedByFor}
        />
      </div>
    </div>
  );
}

/** Groepeert een array in blokken van `size`. */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) result.push(arr.slice(i, i + size));
  return result;
}

const SWIMLANE_CLASSES =
  "-mx-[var(--space-4)] flex gap-3 overflow-x-auto px-[var(--space-4)] pb-1";

const HOME_SWIMLANE_ARROW_CLASS =
  "flex size-8 items-center justify-center rounded-full bg-[var(--white)] text-[var(--blue-500)] shadow-card transition-[color,transform] duration-fast ease-out-strong motion-safe:active:scale-95 disabled:text-[var(--gray-200)] disabled:shadow-[0_0_0_1px_var(--border-subtle)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]";

/** Alleen voor Te kopen: op lg geen negatieve marge zodat de swimlane binnen max-w-[956px] blijft. */
/** Figma 1142:7467 — kalender-sectie op startpagina (alleen bij content vandaag of toekomst).
 *  Mobile: swimlane (1 kaart per kolom, 300 px breed) als > 3 items; anders verticaal.
 *  Desktop: 3-kolommen grid. */
type HomeWeekDay = { isoDate: string; date: Date; entry: DayEntry | null };

const WEEKDAY_ABBR = ["ZO", "MA", "DI", "WO", "DO", "VR", "ZA"] as const;

/** Hoeveel dagen terug de kalenderstrip op de startpagina gaat (swipen naar rechts). */
const HOME_CALENDAR_PAST_DAYS = 56;




/** Samenvatting van een kalenderdag voor de desktopweek (gerecht of losse items). */
function homeDaySummary(isoDate: string, entry: DayEntry | null) {
  if (!entry || !dayEntryHasContent(entry)) return null;
  const meal = entry.meals[0] ?? null;
  if (meal) {
    const extra = entry.meals.length - 1;
    return {
      title: meal.recipeName,
      sub: meal.fromStock
        ? "Uit de diepvries"
        : extra > 0
          ? `+ ${extra} ${extra === 1 ? "gerecht" : "gerechten"}`
          : meal.ingredientCount === 1
            ? "1 ingrediënt"
            : `${meal.ingredientCount} ingrediënten`,
      photo: meal.photoUrl,
      loose: null as DayEntry["looseIngredients"] | null,
      fromStock: meal.fromStock === true,
      href: meal.recipeId ? `/recepten/${meal.recipeId}` : `/kalender?date=${isoDate}`,
    };
  }
  const items = entry.looseIngredients;
  const previewItems = selectCalendarPreviewItems(items);
  const first = items.find((i) => i.photoUrl) ?? items[0];
  const names = previewItems.map((i) => i.name);
  return {
    title: items.length > 2 ? `${names.slice(0, 2).join(", ")} +${items.length - 2}` : names.join(", "),
    sub: items.length === 1 ? "1 item" : `${items.length} items`,
    photo: null as string | null,
    /** Losse items: bord met tot drie productfoto's (zoals op de kalenderpagina). */
    loose: previewItems,
    fromStock: first?.fromStock === true,
    href: `/kalender?date=${isoDate}`,
  };
}

function HomeFreezeBadge({ size = 20 }: { size?: number }) {
  return (
    <span
      className="absolute -right-0.5 -top-0.5 flex items-center justify-center rounded-full bg-[var(--white)] shadow-[0_1px_3px_rgba(16,17,48,0.15)]"
      style={{ width: size, height: size }}
    >
      <span
        aria-hidden
        className="inline-block bg-[var(--blue-500)]"
        style={{
          width: Math.round(size * 0.6),
          height: Math.round(size * 0.6),
          WebkitMaskImage: "url(/icons/freeze.svg)",
          maskImage: "url(/icons/freeze.svg)",
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
        }}
      />
    </span>
  );
}

function HomeDayPlate({
  src,
  size,
  freeze,
  shadow = false,
}: {
  src: string | null;
  size: number;
  freeze: boolean;
  shadow?: boolean;
}) {
  return (
    <span className="relative shrink-0" style={{ width: size, height: size }}>
      <span
        className={cn(
          "block size-full overflow-hidden rounded-full bg-[var(--gray-25)]",
          shadow && "shadow-[0_10px_24px_-12px_rgba(16,17,48,0.35)]",
        )}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element -- data-URL of externe receptfoto
          <img
            src={src}
            alt=""
            decoding="async"
            loading="lazy"
            className="size-full scale-[1.08] object-cover"
          />
        ) : null}
      </span>
      {freeze ? <HomeFreezeBadge size={Math.max(18, Math.round(size / 4))} /> : null}
    </span>
  );
}

/** Foto's voor losse items: eigen (diepvries)foto of de productfoto bij de naam. */
function useLoosePhotos(loose: DayEntry["looseIngredients"] | null | undefined): (string | null)[] {
  const getItemPhoto = useItemPhotoUrl(160);
  const withPhotos = (loose ?? []).map((item) => ({
    ...item,
    photo: item.photoUrl ?? getItemPhoto(item.name) ?? null,
  }));
  return selectCalendarPreviewItems(withPhotos.filter((item) => item.photo)).map(
    (item) => item.photo,
  );
}

/**
 * Canvas «Kalender · D3»: lege dag = rauwe ingrediënten voor een maaltijd (zetmeel · groente ·
 * vlees/vis), per weekdag een andere set zodat geen ingrediënt twee keer in een week voorkomt.
 * Index = Date.getDay() (0 = zondag).
 */
const HOME_EMPTY_DAY_IDEAS: ReadonlyArray<readonly [string, string, string]> = [
  ["krieltjes", "groene_asperges", "kabeljauwfilet"],
  ["aardappelen", "wortelen", "kipfilet"],
  ["spaghetti", "tomaten", "gehakt"],
  ["rijst", "broccoli", "zalm"],
  ["noedels", "paprika", "scampis"],
  ["zoete_aardappelen", "spinazie", "kalkoenlapjes"],
  ["kroketjes", "bloemkool", "worst"],
];

/* Achteraan links, achteraan rechts, vooraan in het midden (licht gekanteld). */
const HOME_TRIO_SLOTS = [
  { x: -20, y: -12, r: -10, s: 0.4, z: 1 },
  { x: 21, y: -9, r: 9, s: 0.4, z: 2 },
  { x: 0, y: 17, r: -3, s: 0.44, z: 3 },
] as const;

/** Drie ingrediëntfoto's gestapeld op een bord of in de lege-dagcirkel. */
function HomeDayTrio({ photos, size, faded = false }: { photos: (string | null)[]; size: number; faded?: boolean }) {
  return (
    <>
      {photos
        .filter((src): src is string => Boolean(src))
        .slice(0, 3)
        .map((src, i) => {
          const slot = HOME_TRIO_SLOTS[i];
          const px = Math.round(size * slot.s);
          const k = size / 100;
          return (
            // eslint-disable-next-line @next/next/no-img-element -- lokale ingrediënt-webp
            <img
              key={src + i}
              src={src}
              alt=""
              decoding="async"
              loading="lazy"
              className={cn(
                "absolute left-1/2 top-1/2 object-contain drop-shadow-[0_3px_4px_rgba(16,17,48,0.16)]",
                faded && "opacity-50",
              )}
              style={{
                width: px,
                height: px,
                zIndex: slot.z,
                transform: `translate(-50%, -50%) translate(${slot.x * k}px, ${slot.y * k}px) rotate(${slot.r}deg)`,
              }}
            />
          );
        })}
    </>
  );
}

/** Gekozen losse items: echt wit bord met de producten erop. */
function HomeLoosePlate({ photos, size }: { photos: (string | null)[]; size: number }) {
  return (
    <span aria-hidden className="relative block shrink-0" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- lokale bordafbeelding */}
      <img
        src="/images/ui/bord_wit_240.webp"
        alt=""
        decoding="async"
        className="absolute inset-0 size-full drop-shadow-[0_6px_10px_rgba(16,17,48,0.16)]"
      />
      <HomeDayTrio photos={photos} size={size} />
    </span>
  );
}

/** Lege dag: vervaagde rauwe ingrediënten in een lichtblauwe stippelcirkel. */
function HomeEmptyDayIdea({ date, size }: { date: Date; size: number }) {
  const idea = HOME_EMPTY_DAY_IDEAS[date.getDay()];
  return (
    <span
      aria-hidden
      className="relative block shrink-0 rounded-full border-[1.6px] border-dashed border-[var(--blue-200)] bg-[var(--blue-25)]"
      style={{ width: size, height: size }}
    >
      <HomeDayTrio photos={idea.map((slug) => `/images/ingredients/${slug}_160.webp`)} size={size} faded />
    </span>
  );
}

/** Dagkolom in de desktopweek (canvas «Kalender home · D1»): gerecht meteen zichtbaar, in zijn kleur. */
function HomeWeekColumn({
  day,
  isToday,
  lane = false,
}: {
  day: HomeWeekDay;
  isToday: boolean;
  /** Mobiele rij: vaste breedte en snappen i.p.v. de breedte te delen. */
  lane?: boolean;
}) {
  const summary = homeDaySummary(day.isoDate, day.entry);
  const loosePhotos = useLoosePhotos(summary?.loose);
  const tintSrc = summary?.photo ?? loosePhotos.find(Boolean) ?? null;
  const tint = recipeTintColors(useRecipeTint(tintSrc), useIsDarkTheme());
  const fullLabel = day.date.toLocaleDateString("nl-NL", { weekday: "long", day: "numeric", month: "long" });
  return (
    <Link
      href={summary?.href ?? `/kalender?date=${day.isoDate}`}
      aria-label={`${fullLabel}${isToday ? ", vandaag" : ""}: ${summary?.title ?? "niets gepland"}`}
      style={summary ? { backgroundImage: `linear-gradient(180deg, ${tint.mid} 0%, transparent 70%)` } : undefined}
      className={cn(
        lane ? "w-[124px] flex-none snap-start" : "min-w-0 flex-1",
        "flex flex-col items-center rounded-[20px] bg-[var(--white)] px-2.5 pb-4 pt-3.5 no-underline transition-[transform,box-shadow] duration-fast ease-out-strong motion-safe:active:scale-[0.98] [@media(hover:hover)]:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2",
        isToday
          ? "shadow-[0_0_0_2px_var(--blue-500),0_10px_24px_-14px_rgba(79,85,241,0.5)]"
          : "shadow-[inset_0_0_0_1px_var(--border-subtle)]",
      )}
    >
      <span className="flex h-[46px] flex-col items-center justify-center gap-0.5">
        {isToday ? (
          <span className="inline-flex h-5 items-center rounded-pill bg-[var(--blue-500)] px-2 text-[11px] font-bold text-white">Vandaag</span>
        ) : (
          <span className="text-xs font-semibold tracking-[0.06em] text-[var(--text-tertiary)]">{WEEKDAY_ABBR[day.date.getDay()]}</span>
        )}
        <span className={cn("text-[22px] font-bold leading-6 tabular-nums", isToday ? "text-[var(--blue-500)]" : "text-[var(--text-primary)]")}>
          {day.date.getDate()}
        </span>
      </span>
      <span className="mt-3.5 flex h-24 w-full shrink-0 items-start justify-center">
        {summary ? (
          summary.loose ? (
            <HomeLoosePlate photos={loosePhotos} size={96} />
          ) : (
            <HomeDayPlate src={summary.photo} size={96} freeze={summary.fromStock} />
          )
        ) : (
          <HomeEmptyDayIdea date={day.date} size={96} />
        )}
      </span>
      <span className="mt-3 flex h-9 w-full items-start justify-center">
        <span
          className={cn(
            "line-clamp-2 w-full min-w-0 break-words px-0.5 text-center text-xs leading-[15px] [overflow-wrap:anywhere]",
            summary ? "font-semibold text-[var(--text-primary)]" : "text-[var(--text-tertiary)]",
          )}
        >
          {summary?.title ?? ""}
        </span>
      </span>
      {/* Lege dag: «Wat eten we?» onderaan, in dezelfde stijl als «5 ingrediënten». */}
      <span className="mt-auto pt-2 text-xs leading-4 text-[var(--text-tertiary)]">
        {summary?.sub ?? "Wat eten we?"}
      </span>
    </Link>
  );
}

/** 30% van gisteren (124px) + de tussenruimte: zoveel staat er links van vandaag. */
const HOME_LANE_LEAD_PX = Math.round(124 * 0.3) + 10;

/**
 * Mobiele kalender op de startpagina (canvas «Kalender · D3 mobiel»): dezelfde dagkolommen als op
 * desktop in een swipebare rij. Bij het laden piept gisteren nog 30% binnen aan de rand en krijgen
 * vandaag en de komende dagen de ruimte.
 */
function HomeCalendarLaneMobile({ days, todayIso }: { days: HomeWeekDay[]; todayIso: string }) {
  const laneRef = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const el = laneRef.current;
    const today = el?.querySelector<HTMLElement>("[data-today]");
    if (!el || !today) return;
    el.scrollLeft = today.offsetLeft - HOME_LANE_LEAD_PX;
  }, [days.length]);
  return (
    <div className="flex flex-col gap-4">
      <ListSectionHeader icon="calendar" label="Kalender" showNaarOverzicht naarOverzichtHref="/kalender" overzichtLabel="Toon alle" />
      <div
        ref={laneRef}
        role="group"
        aria-label="Kalender, per dag"
        className="relative -mx-4 -my-2 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ scrollPaddingLeft: HOME_LANE_LEAD_PX }}
      >
        {days.map((d) => (
          <div key={d.isoDate} className="flex flex-none" data-today={d.isoDate === todayIso ? "" : undefined}>
            <HomeWeekColumn day={d} isToday={d.isoDate === todayIso} lane />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Desktop-kalender op de startpagina (canvas «Kalender home · D1»): zeven dagkolommen met het
 * gerecht er meteen in, elk in de kleur van het gerecht; vandaag met een blauwe rand.
 * Met de pijlen blader je per week terug.
 */
function HomeCalendarWeekDesktop({ days, todayIso }: { days: HomeWeekDay[]; todayIso: string }) {
  const todayIdx = Math.max(0, days.findIndex((d) => d.isoDate === todayIso));
  const [weekOffset, setWeekOffset] = React.useState(0);
  const start = Math.max(0, todayIdx - 3 + weekOffset * 7);
  const windowDays = days.slice(start, start + 7);
  const canPrev = start > 0;
  const isCurrent = weekOffset === 0;
  const first = windowDays[0]?.date;
  const last = windowDays[windowDays.length - 1]?.date;
  const fmt = (d: Date, withMonth: boolean) =>
    withMonth ? d.toLocaleDateString("nl-NL", { day: "numeric", month: "short" }).replace(".", "") : String(d.getDate());
  const range = first && last ? `${fmt(first, first.getMonth() !== last.getMonth())} – ${fmt(last, true)}` : "";

  return (
    <div className="flex flex-col gap-4">
      <ListSectionHeader
        icon="calendar"
        label="Kalender"
        showNaarOverzicht
        naarOverzichtHref="/kalender"
        overzichtLabel="Toon alle"
        extra={
          <span className="flex items-center gap-1.5">
            <span className="mr-2 text-sm text-[var(--text-tertiary)]">{range}</span>
            <button type="button" aria-label="Vorige week" disabled={!canPrev} onClick={() => setWeekOffset((w) => w - 1)} className={HOME_SWIMLANE_ARROW_CLASS}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
                <path d="M10 3.5 5.5 8 10 12.5" />
              </svg>
            </button>
            <button type="button" aria-label="Volgende week" disabled={isCurrent} onClick={() => setWeekOffset((w) => Math.min(0, w + 1))} className={HOME_SWIMLANE_ARROW_CLASS}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
                <path d="M6 3.5 10.5 8 6 12.5" />
              </svg>
            </button>
          </span>
        }
      />
      <div className="flex gap-3">
        {windowDays.map((d) => (
          <HomeWeekColumn key={d.isoDate} day={d} isToday={d.isoDate === todayIso} />
        ))}
      </div>
    </div>
  );
}

type HomeListItemRow = {
  id: string;
  name?: string;
  checked?: boolean;
  order?: number;
  stockPhotoUrl?: string;
  recipeGroupId?: string;
  fromStock?: boolean;
};

/** Foto voor frituur- en caféjeslijstjes: één beeld dat het type lijstje toont. */
function homeVenueListImage(list: HomeList): string | null {
  if (listIsFrituurVenueList(list.name)) return "/images/frituur/frieten_groot_240.webp";
  if (listIsCafeVenueList(list.name)) return "/images/ui/cafe_240.webp";
  return null;
}

/**
 * Producten om te kopen (geen gerechten: geen recept-items en geen diepvriesgerechten),
 * eerst nog te halen, dan afgevinkt; elk nieuwste eerst.
 */
function homeListProductItems(list: HomeList): HomeListItemRow[] {
  return ((list.items ?? []) as HomeListItemRow[])
    .filter(
      (it) =>
        typeof it.name === "string" &&
        it.name.trim().length > 0 &&
        !it.name.trim().toLowerCase().endsWith(" (diepvries)") &&
        !it.recipeGroupId &&
        it.fromStock !== true,
    )
    .sort((a, b) => {
      const doneDiff = Number(a.checked === true) - Number(b.checked === true);
      return doneDiff !== 0 ? doneDiff : (b.order ?? 0) - (a.order ?? 0);
    });
}

/** Zes productfoto's plus, bij overflow, één `+n`-tegel. */
const HOME_LIST_PHOTO_SLOTS = 7;

/** Zachte pil (8.4): zelfde knopstijl voor «+ Item», «+ Lijstje» en Te kopen «Toevoegen». */
const HOME_SOFT_PILL_CLASS =
  /* Design system «Knop sm · secundair» (34px, zacht lavendel). */
  "relative z-[1] inline-flex h-[34px] shrink-0 items-center gap-1.5 rounded-pill bg-[var(--blue-25)] pl-3 pr-3.5 text-sm font-semibold text-[var(--blue-500)] transition-[background-color,transform] duration-fast ease-out-strong motion-safe:active:scale-95 [@media(hover:hover)]:hover:bg-[var(--blue-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2";

function HomeSoftPillPlusIcon() {
  return (
    <span
      aria-hidden
      className="inline-block size-[13px] shrink-0 bg-current"
      style={{
        WebkitMaskImage: "url(/icons/plus.svg)",
        maskImage: "url(/icons/plus.svg)",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}

/**
 * Lijstje-tegel in de swimlane (8.4): wit, haarlijn, volledig klikbaar.
 * Rechtsboven een zachte pil: «+ Item» (winkeldag nog niet voorbij) of «+ Lijstje» (afgerond,
 * met klein groen vinkje naast de naam). Lijsticoon vooraan (10.3) en een overlappende
 * stapel ronde productfoto's (geen gerechten).
 * Frituur gebruikt dezelfde productstapel als gewone lijstjes; café toont alleen het lijsticoon.
 */
function HomeListSwimCard({
  list,
  onAddItem,
  onNewList,
}: {
  list: HomeList;
  onAddItem: (list: HomeList) => void;
  onNewList: (list: HomeList) => void;
}) {
  const getPhotoUrl = useItemPhotoUrl(160);
  const completed = isListDatePassed(list.date);
  const displayName = formatDefaultListNameForDisplay(list.name);
  const isFrituurList = listIsFrituurVenueList(list.name);
  const venueImage = homeVenueListImage(list);
  const products = homeListProductItems(list);
  const storeLogo = list.storeLogos[0] ?? null;
  const storeName = masterStoreLabelFromListIcon(
    storeLogo ?? list.masterIcon ?? list.icon,
  );
  /* Lijstkaart 2b A: «Lidl / Delhaize · Chloé». */
  const meta = [storeName, list.sharedWithFirstName ?? ""].filter(Boolean).join(" · ");

  const action = completed ? (
    <button type="button" onClick={() => onNewList(list)} className={HOME_SOFT_PILL_CLASS} aria-label={`Nieuw lijstje maken zoals ${list.name}`}>
      <HomeSoftPillPlusIcon />
      Lijstje
    </button>
  ) : (
    <button type="button" onClick={() => onAddItem(list)} className={HOME_SOFT_PILL_CLASS} aria-label={`Item toevoegen aan ${list.name}`}>
      <HomeSoftPillPlusIcon />
      Item
    </button>
  );

  /* 10.3: lijsticoon als herkenningsteken in een zacht verlopend vierkant; eigen foto vult het vlak. */
  const customIcon = list.customIconUrl ?? null;
  const iconSrc = customIcon ?? venueImage ?? homeListCardIconSrc(list);

  const header = (
    <span className="flex items-start gap-3">
      <span className="pointer-events-none relative shrink-0">
        <span
          aria-hidden
          className="flex size-12 items-center justify-center overflow-hidden rounded-[14px] bg-gradient-to-br from-[var(--blue-25)] to-[var(--blue-50)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- lokale webp of eigen foto */}
          <img
            src={iconSrc}
            alt=""
            width={customIcon ? 48 : 34}
            height={customIcon ? 48 : 34}
            className={customIcon ? "size-full object-cover" : "size-[34px] object-contain"}
          />
        </span>
        {/* 11.1 F: afgerond-vinkje rechtsboven op het icoon, licht buiten de hoek, met witte rand. */}
        {completed ? (
          <span
            role="img"
            aria-label="Afgerond"
            className="absolute -right-[3px] -top-[3px] flex size-[18px] items-center justify-center rounded-full bg-[var(--success-soft-bg)] text-[var(--success-soft-fg)] shadow-[0_0_0_2px_var(--white)]"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-2.5">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
        ) : null}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[17px] font-semibold leading-[22px] tracking-tight text-[var(--text-primary)]">
          {displayName}
        </span>
        {storeLogo || meta ? (
          <span className="flex min-w-0 items-center gap-1.5 text-[13px] leading-[18px] text-[var(--gray-400)]">
            {storeLogo ? (
              // eslint-disable-next-line @next/next/no-img-element -- winkellogo
              <img src={storeLogo} alt="" width={16} height={16} className="size-4 shrink-0 object-contain" />
            ) : null}
            {meta ? <span className="truncate">{meta}</span> : null}
          </span>
        ) : null}
      </span>
      {action}
    </span>
  );

  /* Hele tegel klikbaar via een link die de kaart bedekt; de knop ligt erboven (geen knop in een link). */
  const cardShell = (children: React.ReactNode) => (
    <div className="relative flex h-full w-full flex-col gap-3.5 rounded-lg bg-[var(--white)] p-4 shadow-card transition-transform duration-fast ease-out-strong has-[a:active]:motion-safe:scale-[0.98]">
      <Link
        href={`/lijstje/${list.id}`}
        aria-label={`${displayName} openen`}
        className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
      />
      {children}
    </div>
  );

  /* Gedeeld lijstje: profielfoto van de andere persoon rechtsonder op de tegel. */
  const sharedAvatar = list.sharedWithFirstName ? (
    <span
      role="img"
      aria-label={`Gedeeld met ${list.sharedWithFirstName}`}
      className="pointer-events-none ml-auto flex size-[30px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--secondary-100)] text-[11px] font-bold leading-none text-[var(--secondary-800)] shadow-[0_0_0_2px_var(--white)]"
    >
      {list.sharedWithAvatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- profielfoto (data-URL of blob)
        <img src={list.sharedWithAvatarUrl} alt="" className="size-full object-cover" />
      ) : (
        list.sharedWithFirstName.charAt(0).toUpperCase()
      )}
    </span>
  ) : null;

  /* Café: het icoon zegt genoeg, geen productfoto's. */
  if (listIsCafeVenueList(list.name)) {
    return cardShell(
      <>
        {header}
        {sharedAvatar ? <span className="flex">{sharedAvatar}</span> : null}
      </>,
    );
  }

  const withPhotos = products.map((it) => {
    const name = it.name ?? "";
    const url = isFrituurList
      ? frituurItemIconSrc(name)
      : it.stockPhotoUrl || getPhotoUrl(name);
    return { id: it.id, name, url };
  });
  const overflow = withPhotos.length > HOME_LIST_PHOTO_SLOTS;
  const shown = withPhotos.slice(0, overflow ? HOME_LIST_PHOTO_SLOTS - 1 : HOME_LIST_PHOTO_SLOTS);
  const rest = withPhotos.length - shown.length;

  return cardShell(
    <>
      {header}
      {shown.length > 0 || sharedAvatar ? (
        <span className="flex items-center gap-3">
      {shown.length > 0 ? (
        /* Overlappende fotostapel (Lijstkaart 2b): grijze bolletjes zonder rand, witte scheiding, lavendel «+N». */
        <span className="pointer-events-none isolate flex pl-[3px]" aria-hidden>
          {shown.map((p, index) => (
            <span
              key={p.id}
              className={cn(
                "relative flex size-[34px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--gray-50)] shadow-[0_0_0_2px_var(--white)]",
                index > 0 && "-ml-2",
              )}
              style={{ zIndex: index + 1 }}
            >
              {p.url ? (
                // eslint-disable-next-line @next/next/no-img-element -- lokale item-webp
                <img
                  src={p.url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="size-[74%] object-contain"
                />
              ) : (
                <span className="text-xs font-semibold text-[var(--blue-400)]">
                  {p.name.trim().charAt(0).toUpperCase()}
                </span>
              )}
            </span>
          ))}
          {rest > 0 ? (
            <span
              className="relative -ml-2 flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[var(--blue-25)] text-xs font-medium text-[var(--blue-400)] shadow-[0_0_0_2px_var(--white)] tabular-nums"
              style={{ zIndex: shown.length + 1 }}
            >
              +{rest}
            </span>
          ) : null}
        </span>
      ) : null}
          {sharedAvatar}
        </span>
      ) : null}
    </>,
  );
}

/**
 * Startpagina-lijstjes (8.4): eerst maximaal twee aankomende winkeldagen, daarna
 * maximaal zes eerdere lijstjes en tot slot de kaart «Alle N lijstjes». «+ Item»
 * opent de zoek-slide-in voor dat lijstje.
 */
function HomeLijstjesSection({
  normalLists,
  onOpenCreateModal,
  onQuickAdd,
  onNewListLike,
}: {
  normalLists: HomeList[];
  onOpenCreateModal: () => void;
  /** Voegt een product toe aan het gegeven lijstje. */
  onQuickAdd: (list: HomeList, name: string) => void;
  /** Nieuw lijstje voor dezelfde winkel (vanaf de masterlijst). */
  onNewListLike: (list: HomeList) => void;
}) {
  const laneRef = React.useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [edges, setEdges] = React.useState({ atStart: true, atEnd: false });
  const [searchTarget, setSearchTarget] = React.useState<HomeList | null>(null);

  const activeLists = React.useMemo(() => {
    const upcoming = normalLists
      .filter((l) => !isListDatePassed(l.date))
      .sort((a, b) => (listDateToIso(a.date) ?? "").localeCompare(listDateToIso(b.date) ?? "") || a.order - b.order)
      .slice(0, 2);
    const previous = normalLists
      .filter((l) => isListDatePassed(l.date))
      .sort(
        (a, b) =>
          (listDateToIso(b.date) ?? "").localeCompare(listDateToIso(a.date) ?? "") ||
          b.order - a.order,
      )
      .slice(0, 6);
    return [...upcoming, ...previous];
  }, [normalLists]);
  const pageCount = activeLists.length + 1;

  const handleScroll = React.useCallback(() => {
    const el = laneRef.current;
    if (!el) return;
    const cards = Array.from(el.children) as HTMLElement[];
    const left = el.scrollLeft;
    let best = 0;
    let bestDist = Infinity;
    cards.forEach((c, i) => {
      const d = Math.abs(c.offsetLeft - el.offsetLeft - left);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    if (atEnd) best = cards.length - 1;
    setActiveIndex(best);
    setEdges((prev) =>
      prev.atStart === el.scrollLeft <= 4 && prev.atEnd === atEnd
        ? prev
        : { atStart: el.scrollLeft <= 4, atEnd },
    );
  }, []);

  React.useEffect(() => {
    handleScroll();
  }, [handleScroll, activeLists.length]);

  /* Desktop 3 · pijlknoppen schuiven één kaart (breedte + gap) per klik. */
  const scrollByCard = (dir: -1 | 1) => {
    const el = laneRef.current;
    const first = el?.children[0] as HTMLElement | undefined;
    if (!el || !first) return;
    const gap = parseFloat(getComputedStyle(el).columnGap || "0") || 0;
    el.scrollBy({ left: dir * (first.offsetWidth + gap), behavior: "smooth" });
  };

  const scrollToPage = (index: number) => {
    const el = laneRef.current;
    const card = el?.children[index] as HTMLElement | undefined;
    if (!el || !card) return;
    el.scrollTo({ left: card.offsetLeft - el.offsetLeft, behavior: "smooth" });
  };

  if (normalLists.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <ListSectionHeader
          icon="list"
          label="Lijstjes"
          showNaarOverzicht
          naarOverzichtHref="/lijstjes-beheren/lijstjes"
          overzichtLabel="Toon alle"
        />
        <HomeOnboardingEmptyCard
          illustrationSrc={HOME_ONBOARDING_ILLUSTRATIONS.lijstjes}
          illustrationSide="start"
          contentAlign="end"
          text="Maak hier je wekelijkse lijstjes voor de supermarkt of andere winkels."
          actions={
            <MiniButton variant="primary" onClick={onOpenCreateModal}>
              Voeg lijstje toe
            </MiniButton>
          }
        />
      </div>
    );
  }

  const otherLists = normalLists.filter((l) => !activeLists.some((a) => a.id === l.id)).slice(0, 3);
  return (
    <div className="flex flex-col gap-4">
      <ListSectionHeader
        icon="list"
        label="Lijstjes"
        showNaarOverzicht
        naarOverzichtHref="/lijstjes-beheren/lijstjes"
        overzichtLabel="Toon alle"
        extra={
          <span className="hidden gap-1.5 lg:flex">
            <button type="button" aria-label="Vorige lijstjes" disabled={edges.atStart} onClick={() => scrollByCard(-1)} className={HOME_SWIMLANE_ARROW_CLASS}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
                <path d="M10 3.5 5.5 8 10 12.5" />
              </svg>
            </button>
            <button type="button" aria-label="Volgende lijstjes" disabled={edges.atEnd} onClick={() => scrollByCard(1)} className={HOME_SWIMLANE_ARROW_CLASS}>
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4">
                <path d="M6 3.5 10.5 8 6 12.5" />
              </svg>
            </button>
          </span>
        }
      />

      <div
        ref={laneRef}
        onScroll={handleScroll}
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:mx-0 lg:gap-4 lg:scroll-px-0 lg:px-0"
      >
        {activeLists.map((list) => (
          <div key={list.id} className="w-[calc(100%-32px)] max-w-[420px] shrink-0 snap-start lg:w-[calc((100%-32px)/3)] lg:max-w-none">
            <HomeListSwimCard
              list={list}
              onAddItem={(l) => {
                primeKeyboard();
                setSearchTarget(l);
              }}
              onNewList={onNewListLike}
            />
          </div>
        ))}
        <Link
          href="/lijstjes-beheren/lijstjes"
          className="flex w-40 shrink-0 snap-start flex-col items-center justify-center gap-2.5 rounded-lg bg-[var(--white)] p-4 no-underline shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
        >
          <span className="flex" aria-hidden>
            {otherLists.map((l, i) => (
              // eslint-disable-next-line @next/next/no-img-element -- lokale webp
              <img
                key={l.id}
                src={l.customIconUrl ?? homeListCardIconSrc(l)}
                alt=""
                width={36}
                height={36}
                className={cn(
                  "size-9 rounded-full bg-[var(--gray-25)] object-contain shadow-[0_0_0_2px_var(--white)]",
                  i > 0 && "-ml-2.5",
                )}
              />
            ))}
          </span>
          <span className="text-[15px] font-semibold leading-5 text-action-primary">Alle {normalLists.length} lijstjes</span>
        </Link>
      </div>

      {pageCount > 1 ? (
        <div className="flex justify-center gap-1.5 lg:hidden" role="tablist" aria-label="Lijstjes">
          {Array.from({ length: pageCount }, (_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={i < activeLists.length ? activeLists[i].name : `Alle ${normalLists.length} lijstjes`}
              onClick={() => scrollToPage(i)}
              className={cn(
                "h-1.5 rounded-full transition-[width,background-color] duration-base ease-out-strong",
                i === activeIndex ? "w-[18px] bg-[var(--blue-500)]" : "w-1.5 bg-[var(--gray-200)]",
              )}
            />
          ))}
        </div>
      ) : null}

      <ItemNameSearchSlideIn
        open={searchTarget != null}
        onClose={() => setSearchTarget(null)}
        initialValue=""
        title={searchTarget ? `Toevoegen aan ${searchTarget.name}` : "Item toevoegen"}
        photoCatalog="items"
        suggestionScope="items"
        onSelect={(name) => {
          if (searchTarget) onQuickAdd(searchTarget, name);
        }}
      />
    </div>
  );
}


function HomeKalenderSection({
  entries,
  weekDays,
  todayIso,
  hasEverUsedCalendar,
  onHide,
}: {
  entries: Array<{ isoDate: string; entry: DayEntry }>;
  weekDays: HomeWeekDay[];
  todayIso: string;
  hasEverUsedCalendar: boolean;
  onHide?: () => void;
}) {
  /* Weekstrip zodra de kalender ooit gebruikt is; ook zonder plannen deze week (dan "Nog niets gepland"). */
  if ((entries.length > 0 || hasEverUsedCalendar) && weekDays.length >= 7) {
    return (
      <>
        <div className="lg:hidden">
          <HomeCalendarLaneMobile days={weekDays} todayIso={todayIso} />
        </div>
        <div className="hidden lg:block">
          <HomeCalendarWeekDesktop days={weekDays} todayIso={todayIso} />
        </div>
      </>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      <ListSectionHeader icon="calendar" label="Kalender" showNaarOverzicht={false} onHide={onHide} />
      <HomeOnboardingEmptyCard
        illustrationSrc={HOME_ONBOARDING_ILLUSTRATIONS.kalender}
        illustrationSide="end"
        contentAlign="start"
        text="Wat eten we vandaag is nooit nog een probleem met deze handige agenda!"
        actions={
          <MiniButton asChild variant="primary">
            <Link href="/kalender">Naar kalender</Link>
          </MiniButton>
        }
      />
    </div>
  );
}

function HomeKlantenkaartSection({
  cards,
  onHide,
}: {
  cards: HomeLoyaltyCard[];
  onHide?: () => void;
}) {
  if (cards.length > 0) return <HomeLoyaltyCardsSwimlane cards={cards} />;
  return (
    <div className="flex flex-col gap-4">
      <ListSectionHeader icon="card" label="Klantenkaarten" showNaarOverzicht={false} onHide={onHide} />
      <HomeOnboardingEmptyCard
        illustrationSrc={HOME_ONBOARDING_ILLUSTRATIONS.klantenkaarten}
        illustrationSide="start"
        contentAlign="end"
        text="Voeg al je klantenkaarten hier toe, zodat je ze altijd bij de hand hebt."
        actions={
          <MiniButton asChild variant="primary">
            <Link href="/klantenkaarten">Voeg klantenkaart toe</Link>
          </MiniButton>
        }
      />
    </div>
  );
}

/** Startpagina: films en series — poster strip wanneer items aanwezig, anders empty state. */
function HomeFilmsSeriesSection({ onHide }: { onHide?: () => void }) {
  const router = useRouter();
  const { ownWatchlist } = useFilmsLibrary();
  const { watchingItems } = useWatchingTvItems();

  const posterItems = React.useMemo(() => {
    const watchingIds = new Set(watchingItems.map((i) => i.id));
    const remaining = ownWatchlist.filter((i) => !watchingIds.has(i.id));
    return [
      ...watchingItems.map((i) => ({
        id: i.id,
        title: i.title,
        posterUrl: i.posterUrl,
        href: `/films-series/${i.id}/episodes/s${i.nextSeason}e${i.nextEpisode}`,
      })),
      ...remaining.map((i) => ({
        id: i.id,
        title: i.title,
        posterUrl: i.posterUrl,
        href: `/films-series/${i.id}`,
      })),
    ];
  }, [watchingItems, ownWatchlist]);

  if (posterItems.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <ListSectionHeader
          icon="films"
          label="Films en series"
          showNaarOverzicht={false}
          onHide={onHide}
        />
        <HomeOnboardingEmptyCard
          illustrationSrc="/images/ui/films_160.webp"
          illustrationSide="end"
          contentAlign="start"
          text="Wat zijn we nu weer aan het kijken of wat willen we nog kijken?"
          actions={
            <MiniButton variant="primary" onClick={() => router.push("/films-series")}>
              Voeg te kijken item toe
            </MiniButton>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ListSectionHeader
        icon="films"
        label="Films en series"
        showNaarOverzicht
        naarOverzichtHref="/films-series"
        overzichtLabel="Toon alle"
      />
      <div
        className={SWIMLANE_CLASSES}
        style={{ scrollbarWidth: "none" } as React.CSSProperties}
      >
        {posterItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => router.push(item.href)}
            aria-label={item.title}
            className="relative h-[108px] w-[72px] shrink-0 overflow-hidden rounded-[4px] bg-[var(--gray-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            {item.posterUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.posterUrl}
                alt=""
                className="absolute inset-0 size-full object-cover"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="flex size-full items-center justify-center">
                <IconPrimaryMask src="/icons/films.svg" className="size-6 bg-[var(--gray-200)]" />
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/** SVG als externe img kan geen currentColor; mask + action-primary (= primary 500) voor monochrome iconen. */
function IconPrimaryMask({ src, className }: { src: string; className?: string }) {
  return (
    <span
      className={cn("inline-block size-10 shrink-0 bg-action-primary", className)}
      style={{
        WebkitMaskImage: `url("${src}")`,
        maskImage: `url("${src}")`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
      aria-hidden
    />
  );
}

export default function Home() {
  const router = useRouter();
  const { isLoading: authLoading, user } = db.useAuth();
  const autoShare = useAutoShare(user?.id);

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  const ownerId = user?.id ?? "__no_user__";

  const { isLoading, error, data } = db.useQuery({
    lists: {
      items: {},
      memberships: {},
      loyaltyCard: {},
      loyaltyCardSecondary: {},
      $: { where: { ownerId } },
    },
    listMembers: {
      list: { items: {} },
      $: { where: { instantUserId: ownerId } },
    },
    loyaltyCards: {
      list: {},
      $: { where: { ownerId } },
    },
    listIconImages: {
      $: { where: { ownerId } },
    },
    supermarktPickerStats: {
      $: { where: { ownerId } },
    },
    recipes: {},
    freezerItems: {},
    shoppingItems: {},
    shoppingShares: {
      memberships: {},
      $: { where: { ownerId } },
    },
    shoppingShareMembers: {
      shoppingShare: { memberships: {} },
      $: { where: { instantUserId: ownerId } },
    },
  });

  const shareRelatedUserIds = React.useMemo(() => {
    const ids = new Set<string>();
    if (!data || !user?.id) return [] as string[];
    for (const l of data.lists ?? []) {
      for (const m of (l.memberships ?? []) as ListMembershipRow[]) {
        const uid = m.instantUserId;
        if (uid && uid !== user.id) ids.add(uid);
      }
    }
    for (const row of data.listMembers ?? []) {
      const list = row.list as { ownerId?: string } | null | undefined;
      if (list?.ownerId) ids.add(list.ownerId);
    }
    for (const share of (data as { shoppingShares?: unknown[] }).shoppingShares ?? []) {
      const memberships = (share as { memberships?: { instantUserId?: string | null }[] })
        .memberships ?? [];
      for (const member of memberships) {
        if (member.instantUserId && member.instantUserId !== user.id) {
          ids.add(member.instantUserId);
        }
      }
    }
    for (const row of (data as { shoppingShareMembers?: unknown[] }).shoppingShareMembers ?? []) {
      const share = (row as {
        shoppingShare?: {
          ownerId?: string | null;
          memberships?: { instantUserId?: string | null }[];
        } | null;
      }).shoppingShare;
      if (share?.ownerId && share.ownerId !== user.id) ids.add(share.ownerId);
      for (const member of share?.memberships ?? []) {
        if (member.instantUserId && member.instantUserId !== user.id) {
          ids.add(member.instantUserId);
        }
      }
    }
    return Array.from(ids);
  }, [data, user?.id]);

  const shareProfilesQuery = React.useMemo(
    () => ({
      profiles: {
        $: {
          where:
            shareRelatedUserIds.length > 0
              ? {
                  or: shareRelatedUserIds.map((id) => ({
                    instantUserId: id,
                  })),
                }
              : { instantUserId: "__share_profiles_none__" },
        },
      },
    }),
    [shareRelatedUserIds],
  );

  const { data: shareProfilesData } = db.useQuery(
    shareProfilesQuery as unknown as Parameters<typeof db.useQuery>[0],
  );

  /** Bestaande masterlijsten: naam gelijkzetten aan winkel uit het logo (Lidl, Delhaize, …). */
  React.useEffect(() => {
    if (!user || authLoading || isLoading || !data?.lists) return;
    const txs = data.lists
      .filter((l) => listIsMasterTemplate(l))
      .map((l) => {
        const icon = typeof l.icon === "string" ? l.icon : "";
        const label = masterStoreLabelFromListIcon(icon);
        const current = String((l as { name?: string }).name ?? "").trim();
        if (!label || current === label) return null;
        return db.tx.lists[String(l.id)].update({ name: label });
      })
      .filter((tx): tx is NonNullable<typeof tx> => tx != null);
    if (txs.length > 0) {
      void db.transact(txs);
    }
  }, [user, authLoading, isLoading, data?.lists]);

  const shareFirstNameByUserId = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const p of shareProfilesData?.profiles ?? []) {
      const uid = p.instantUserId;
      const fn = (p.firstName ?? "").trim();
      if (uid && fn) m.set(uid, fn);
    }
    return m;
  }, [shareProfilesData?.profiles]);

  const shareAvatarByUserId = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const p of shareProfilesData?.profiles ?? []) {
      const uid = p.instantUserId;
      const url = (p.avatarUrl ?? "").trim();
      if (uid && url) m.set(uid, url);
    }
    return m;
  }, [shareProfilesData?.profiles]);

  /** Te kopen-tegel: wie een item toevoegde (naam + profielfoto), enkel voor items van anderen. */
  const teKopenAddedByFor = React.useCallback(
    (item: HomeShoppingItem): ShoppingAddedBy | null => {
      if (!item.ownerId || item.ownerId === user?.id) return null;
      const profile = (shareProfilesData?.profiles ?? []).find((p) => p.instantUserId === item.ownerId);
      const firstName = (profile?.firstName ?? "").trim() || "Deelnemer";
      const avatarUrl = (profile?.avatarUrl ?? "").trim() || null;
      return { firstName, avatarUrl };
    },
    [shareProfilesData?.profiles, user?.id],
  );

  const lists: HomeList[] = React.useMemo(() => {
    const owned: HomeList[] = (data?.lists ?? []).filter((l) => !isEmptyDraftMasterList(l)).map((l) => {
      const isMaster = listIsMasterTemplate(l);
      const memberIds = ((l.memberships ?? []) as ListMembershipRow[])
        .map((m) => m.instantUserId)
        .filter((id): id is string => !!id && id !== user?.id);
      const hasOtherMembers = memberIds.length > 0;
      const primaryOtherId = memberIds[0];
      const sharedName =
        primaryOtherId != null
          ? shareFirstNameByUserId.get(primaryOtherId) ?? null
          : null;
      // masterIcon = winkellogo opgeslagen bij aanmaken; voor oude lijstjes valt het terug op icon (= was al een winkellogo).
      const masterIconSrc: string = (l as Record<string, unknown>).masterIcon as string || "";
      const effectiveStoreIcon = masterIconSrc.startsWith("/logos/")
        ? masterIconSrc
        : typeof l.icon === "string" && l.icon.startsWith("/logos/")
          ? l.icon
          : "";
      const nameStoreIcon =
        !isMaster && !effectiveStoreIcon
          ? findMasterStoreByListName(l.name)?.logoSrc ?? ""
          : "";
      const effectiveBadgeIcon = effectiveStoreIcon || nameStoreIcon;
      const isFromMaster = !isMaster && effectiveBadgeIcon.length > 0;
      return {
        id: l.id,
        name: l.name,
        date: l.date,
        icon: l.icon,
        order: l.order,
        items: l.items ?? [],
        masterIcon: masterIconSrc || null,
        sourceMasterListId:
          typeof (l as Record<string, unknown>).sourceMasterListId === "string"
            ? ((l as Record<string, unknown>).sourceMasterListId as string)
            : null,
        isOwner: true,
        membershipIds: (l.memberships ?? []).map((m) => m.id),
        displayVariant: isMaster
          ? "master"
          : hasOtherMembers
            ? "shared"
            : isFromMaster
              ? "from-master"
              : "default",
        storeLogos: isFromMaster ? storeLogosFromListIcon(effectiveBadgeIcon) : [],
        sharedWithFirstName: isMaster ? null : hasOtherMembers ? sharedName : null,
        sharedWithAvatarUrl:
          !isMaster && primaryOtherId != null ? shareAvatarByUserId.get(primaryOtherId) ?? null : null,
        isMasterTemplate: isMaster,
        customIconUrl: typeof (l as Record<string, unknown>).customIconUrl === "string"
          ? (l as Record<string, unknown>).customIconUrl as string
          : null,
        landalTripLabel: (() => {
          const v = (l as Record<string, unknown>).landalTripLabel;
          return typeof v === "string" && v.trim() ? v : null;
        })(),
      };
    });

    const shared: HomeList[] = (data?.listMembers ?? [])
      .map((row) => row.list)
      .filter(
        (l): l is NonNullable<typeof l> =>
          l != null && typeof l === "object" && "id" in l,
      )
      .map((l) => {
        const isMaster = listIsMasterTemplate(l);
        const ownerId =
          "ownerId" in l && typeof l.ownerId === "string"
            ? l.ownerId
            : undefined;
        const ownerFirst =
          ownerId != null
            ? shareFirstNameByUserId.get(ownerId) ?? null
            : null;
        const masterIconSrc2: string = (l as Record<string, unknown>).masterIcon as string || "";
        const effectiveStoreIcon2 = masterIconSrc2.startsWith("/logos/")
          ? masterIconSrc2
          : typeof l.icon === "string" && l.icon.startsWith("/logos/")
            ? l.icon
            : "";
        const nameStoreIcon2 =
          !isMaster && !effectiveStoreIcon2
            ? findMasterStoreByListName(l.name)?.logoSrc ?? ""
            : "";
        const effectiveBadgeIcon2 = effectiveStoreIcon2 || nameStoreIcon2;
        const isFromMaster = !isMaster && effectiveBadgeIcon2.length > 0;
        return {
          id: l.id,
          name: l.name,
          date: l.date,
          icon: l.icon,
          order: l.order,
          items: l.items ?? [],
          masterIcon: masterIconSrc2 || null,
          sourceMasterListId:
            typeof (l as Record<string, unknown>).sourceMasterListId === "string"
              ? ((l as Record<string, unknown>).sourceMasterListId as string)
              : null,
          isOwner: false,
          displayVariant: isMaster
            ? ("master" as const)
            : isFromMaster
              ? ("from-master" as const)
              : ("shared" as const),
          sharedWithFirstName: isMaster ? null : ownerFirst,
          sharedWithAvatarUrl: !isMaster && ownerId != null ? shareAvatarByUserId.get(ownerId) ?? null : null,
          storeLogos: isFromMaster ? storeLogosFromListIcon(effectiveBadgeIcon2) : [],
          isMasterTemplate: isMaster,
          customIconUrl: typeof (l as Record<string, unknown>).customIconUrl === "string"
            ? (l as Record<string, unknown>).customIconUrl as string
            : null,
          landalTripLabel: (() => {
            const v = (l as Record<string, unknown>).landalTripLabel;
            return typeof v === "string" && v.trim() ? v : null;
          })(),
        };
      });

    const byId = new Map<string, HomeList>();
    for (const l of owned) {
      byId.set(l.id, l);
    }
    for (const l of shared) {
      if (!byId.has(l.id)) {
        byId.set(l.id, l);
      }
    }
    return Array.from(byId.values()).sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );
  }, [data, user?.id, shareFirstNameByUserId, shareAvatarByUserId]);

  const normalLists = React.useMemo(
    () => lists.filter((l) => !l.isMasterTemplate),
    [lists],
  );
  const masterLists = React.useMemo(
    () => lists.filter((l) => l.isMasterTemplate),
    [lists],
  );
  /** Favorieten-banner voor nieuwe gebruikers (geen favorietenlijst, nog niet gesloten). */
  const favoritesPromo = useFavoritesPromo(masterLists.length > 0);
  useCleanupDraftMasterLists(data?.lists);
  /** Favorietenlijsten voor de snelle start, gesorteerd op hoe vaak je er een lijstje van maakte. */
  const quickStartMasters = React.useMemo(() => {
    const usage = (m: HomeList) =>
      lists.filter(
        (l) =>
          !l.isMasterTemplate &&
          (l.sourceMasterListId === m.id ||
            (!l.sourceMasterListId && !!l.masterIcon && (l.masterIcon === m.icon || l.masterIcon === m.masterIcon))),
      ).length;
    return masterLists
      .filter((m) => (m.items?.length ?? 0) > 0)
      .map((m) => ({ m, n: usage(m) }))
      .sort((a, b) => b.n - a.n)
      .map(({ m }) => m);
  }, [lists, masterLists]);
  /** Snel toevoegen vanop home: zelfde itemvorm als «Items toevoegen» in het lijstje (sectie Algemeen). */
  const handleQuickAddToList = React.useCallback((list: HomeList, name: string) => {
    const items = (list.items ?? []) as Array<{ order?: number }>;
    const maxOrder = items.reduce((m, it) => Math.max(m, typeof it.order === "number" ? it.order : 0), -1);
    void db.transact(
      db.tx.items[iid()]
        .update({
          name,
          quantity: "1 stuk",
          checked: false,
          section: "Algemeen",
          itemCategory: resolveItemCategoryFromName(name),
          order: maxOrder + 1,
        })
        .link({ list: list.id }),
    );
  }, []);

  const [homeSectionConfig, setHomeSectionConfig] = React.useState<HomeSectionConfig>(
    () => loadHomeSectionConfig(),
  );

  React.useEffect(() => {
    const handler = () => setHomeSectionConfig(loadHomeSectionConfig());
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, []);

  const hideSection = React.useCallback((id: HomeSectionId) => {
    setHomeSectionConfig((prev) => {
      const next = { ...prev, hidden: [...prev.hidden, id] };
      saveHomeSectionConfig(next);
      return next;
    });
  }, []);

  /** `landalTripLabel` vullen op Landal-lijsten zonder veld (standaard Vrienden; Gezin alleen als naam/icoon dat zegt). */
  React.useEffect(() => {
    if (!user?.id || authLoading || isLoading) return;
    const rows = (data?.lists ?? []) as Record<string, unknown>[];
    const txs: Parameters<typeof db.transact>[0] = [];
    for (const row of rows) {
      if (String((row as { ownerId?: string }).ownerId ?? "") !== user.id) continue;
      const id = row.id;
      if (typeof id !== "string") continue;
      const customIconUrl =
        typeof row.customIconUrl === "string" ? row.customIconUrl : null;
      if (!isLandalListCard(customIconUrl)) continue;
      const existing =
        typeof row.landalTripLabel === "string" ? row.landalTripLabel.trim() : "";
      if (existing) continue;
      const inferred = inferLandalTripLabel({
        name: String(row.name ?? ""),
        customIconUrl,
        landalTripLabel: null,
      });
      txs.push(db.tx.lists[id].update({ landalTripLabel: inferred }));
    }
    if (txs.length > 0) void db.transact(txs);
  }, [user?.id, authLoading, isLoading, data?.lists]);

  /** Landal-gezin: beide vaste gezinsleden zien het lijstje zonder expliciete deellink. */
  React.useEffect(() => {
    if (!user?.id || authLoading || isLoading) return;
    const txs: Parameters<typeof db.transact>[0] = [];
    for (const row of data?.lists ?? []) {
      if (String((row as { ownerId?: string }).ownerId ?? "") !== user.id) continue;
      if (
        !isLandalGezinList({
          name: String((row as { name?: string }).name ?? ""),
          customIconUrl:
            typeof (row as { customIconUrl?: string }).customIconUrl === "string"
              ? (row as { customIconUrl?: string }).customIconUrl
              : null,
          landalTripLabel:
            typeof (row as { landalTripLabel?: string }).landalTripLabel ===
            "string"
              ? (row as { landalTripLabel?: string }).landalTripLabel
              : null,
        })
      ) {
        continue;
      }
      txs.push(
        ...landalGezinHouseholdMembershipTransactions(
          String(row.id),
          user.id,
          (row as { memberships?: { instantUserId?: string | null }[] })
            .memberships,
        ),
      );
    }
    if (txs.length > 0) void db.transact(txs);
  }, [user?.id, authLoading, isLoading, data?.lists]);

  const savedListIconImages = React.useMemo((): SavedListIconImage[] => {
    const byDataUrl = new Map<string, SavedListIconImage>();
    const rawLibrary = (data as { listIconImages?: unknown[] } | undefined)
      ?.listIconImages;

    if (Array.isArray(rawLibrary)) {
      for (const row of rawLibrary) {
        if (!row || typeof row !== "object") continue;
        const r = row as {
          id?: unknown;
          imageDataUrl?: unknown;
          createdAtIso?: unknown;
          lastUsedAtIso?: unknown;
        };
        if (typeof r.imageDataUrl !== "string" || r.imageDataUrl.length === 0) {
          continue;
        }
        byDataUrl.set(r.imageDataUrl, {
          id: typeof r.id === "string" ? r.id : null,
          imageDataUrl: r.imageDataUrl,
          createdAtIso:
            typeof r.createdAtIso === "string" ? r.createdAtIso : "",
          lastUsedAtIso:
            typeof r.lastUsedAtIso === "string" ? r.lastUsedAtIso : "",
        });
      }
    }

    // Backfill-achtig: ook oude lijstjes zonder bibliotheekrecord blijven herbruikbaar.
    for (const list of lists) {
      const imageDataUrl = list.customIconUrl;
      if (!imageDataUrl || byDataUrl.has(imageDataUrl)) continue;
      byDataUrl.set(imageDataUrl, {
        id: null,
        imageDataUrl,
        createdAtIso: "",
        lastUsedAtIso: "",
      });
    }

    return Array.from(byDataUrl.values()).sort((a, b) =>
      (b.lastUsedAtIso || b.createdAtIso).localeCompare(
        a.lastUsedAtIso || a.createdAtIso,
      ),
    );
  }, [data, lists]);

  const latestFrituurList = React.useMemo((): FrituurPreviousList | null => {
    const candidates = (data?.lists ?? [])
      .filter((list) => {
        if (listIsMasterTemplate(list)) return false;
        return listIsFrituurVenueList(String(list.name ?? ""));
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const latest = candidates[0];
    if (!latest?.id) return null;
    return {
      id: String(latest.id),
      name: String(latest.name ?? "Frituur"),
      items: ((latest.items ?? []) as FrituurPreviousList["items"])
        .slice()
        .sort((a, b) => {
          const orderA = typeof a.order === "number" ? a.order : 0;
          const orderB = typeof b.order === "number" ? b.order : 0;
          return orderA - orderB;
        }),
    };
  }, [data?.lists]);

  /** Klantenkaarten voor de swimlane op de startpagina: afgeleid van winkelicons (zelfde logica als /klantenkaarten). */
  const homeLoyaltyCards: HomeLoyaltyCard[] = React.useMemo(() => {
    const seenId = new Set<string>();
    const raw: HomeLoyaltyCard[] = [];

    const push = (
      c: { id: string; codeType?: unknown; codeFormat?: unknown; rawValue?: unknown },
      resolvedName: string,
      resolvedLogoSrc: string,
    ) => {
      const resolvedCodeType = normalizeLoyaltyCodeType(c.codeType);
      if (!resolvedName || !resolvedLogoSrc || !resolvedCodeType) return;
      if (seenId.has(String(c.id))) return;
      seenId.add(String(c.id));
      raw.push({
        id: String(c.id),
        cardName: resolvedName,
        logoSrc: resolvedLogoSrc,
        codeType: resolvedCodeType,
        codeFormat: typeof c.codeFormat === "string" ? c.codeFormat : null,
        rawValue: typeof c.rawValue === "string" ? c.rawValue : null,
      });
    };

    // 1. lijstkoppelingen (levert correcte winkelnaam + logo ook voor oude kaarten)
    for (const list of data?.lists ?? []) {
      const listRow = list as Record<string, unknown>;
      const listIcon = String(listRow.icon ?? "");
      const masterIcon = String(listRow.masterIcon ?? "") || listIcon;
      const effectiveIcon = masterIcon || listIcon;

      if (list.loyaltyCard) {
        if (listIconIsLidlDelhaizeCombo(effectiveIcon)) {
          push(list.loyaltyCard, "Delhaize", LOYALTY_COMBO_PRIMARY_LOGO_SRC);
        } else {
          const label = masterStoreLabelFromListIcon(effectiveIcon);
          if (label) push(list.loyaltyCard, label, effectiveIcon);
        }
      }
      if (list.loyaltyCardSecondary && listIconIsLidlDelhaizeCombo(effectiveIcon)) {
        push(list.loyaltyCardSecondary, "Lidl", LOYALTY_COMBO_SECONDARY_LOGO_SRC);
      }
    }

    // 2. standalone kaarten (ownerId zonder lijstkoppeling)
    for (const c of (data as Record<string, unknown>)?.loyaltyCards as { id: string; cardName?: string; codeType?: unknown }[] ?? []) {
      if (seenId.has(String(c.id))) continue;
      const store = MASTER_STORE_OPTIONS.find((s) => s.label === String(c.cardName ?? ""));
      if (store) push(c, store.label, store.logoSrc);
    }

    // dedupliceer per winkel (meest recent = volgorde push)
    const seenName = new Set<string>();
    return raw.filter((c) => {
      const key = c.cardName.toLowerCase();
      if (seenName.has(key)) return false;
      seenName.add(key);
      return true;
    });
  }, [data]);

  /** Kalenderdagen op de startpagina: vandaag én toekomst, alleen met inhoud. */
  /** Diepvriesitems voor startpagina-sectie (zelfde filter als /diepvriesvoorraad). */
  const homeFreezerItems = React.useMemo((): HomeFreezerRow[] => {
    if (!user?.id) return [];
    const raw = (data as { freezerItems?: unknown[] } | undefined)?.freezerItems;
    if (!Array.isArray(raw)) return [];
    const out: HomeFreezerRow[] = [];
    for (const x of raw) {
      if (!x || typeof x !== "object") continue;
      const r = x as HomeFreezerRow;
      if (!r.id || typeof r.name !== "string") continue;
      if (r.ownerId != null && r.ownerId !== user.id) continue;
      out.push(r);
    }
    out.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return out;
  }, [data, user?.id]);

  const [homeStoreOrder, setHomeStoreOrder] = React.useState<string[] | null>(() =>
    loadStoreOrder(),
  );

  // Re-read store order when the window gains focus (user may have reordered on te-kopen page)
  React.useEffect(() => {
    const handler = () => setHomeStoreOrder(loadStoreOrder());
    window.addEventListener("focus", handler);
    return () => window.removeEventListener("focus", handler);
  }, []);

  const homeShoppingItems = React.useMemo((): HomeShoppingItem[] => {
    if (!user?.id) return [];
    const visibleShoppingOwnerIds = getVisibleShoppingOwnerIds({
      userId: user.id,
      ownedShares: (data as { shoppingShares?: unknown[] } | undefined)
        ?.shoppingShares as Parameters<typeof getVisibleShoppingOwnerIds>[0]["ownedShares"],
      joinedMemberships: (data as { shoppingShareMembers?: unknown[] } | undefined)
        ?.shoppingShareMembers as Parameters<typeof getVisibleShoppingOwnerIds>[0]["joinedMemberships"],
    });
    const raw = (data?.shoppingItems ?? []) as Array<{
      id: string;
      name?: unknown;
      quantity?: unknown;
      store?: unknown;
      order?: unknown;
      ownerId?: unknown;
    }>;
    const items = raw
      .filter(
        (i) =>
          typeof i.ownerId === "string" &&
          visibleShoppingOwnerIds.has(i.ownerId) &&
          typeof i.name === "string",
      )
      .map((i) => ({
        id: String(i.id),
        name: String(i.name),
        quantity: typeof i.quantity === "string" ? i.quantity : "",
        store: typeof i.store === "string" ? i.store : null,
        order: typeof i.order === "number" ? i.order : 0,
        ownerId: typeof i.ownerId === "string" ? i.ownerId : null,
      }));

    // Group by store, apply saved order, then flatten (items within group keep original order)
    const groups = new Map<string, typeof items>();
    for (const item of items) {
      const key = item.store ?? "";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    for (const group of Array.from(groups.values())) group.sort((a, b) => b.order - a.order);

    const defaultOrder = Array.from(groups.keys()).sort((a, b) => {
      if (a === "") return 1;
      if (b === "") return -1;
      const ia = TE_KOPEN_STORE_OPTIONS.findIndex((s) => s.label === a);
      const ib = TE_KOPEN_STORE_OPTIONS.findIndex((s) => s.label === b);
      if (ia === -1 && ib === -1) return a.localeCompare(b, "nl");
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    const orderedKeys = applySavedStoreOrder(defaultOrder, homeStoreOrder);
    return orderedKeys.flatMap((key) => groups.get(key) ?? []);
  }, [data, user?.id, homeStoreOrder]);

  const [hasUsedTeKopen, setHasUsedTeKopen] = React.useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("te-kopen-used") === "1";
  });

  React.useEffect(() => {
    if (homeShoppingItems.length > 0) {
      localStorage.setItem("te-kopen-used", "1");
      setHasUsedTeKopen(true);
    }
  }, [homeShoppingItems.length]);

  const { homeCalendarEntries, hasEverUsedCalendar, homeWeekDays, todayIso } = React.useMemo(() => {
    if (!data) {
      return {
        homeCalendarEntries: [] as Array<{ isoDate: string; entry: DayEntry }>,
        hasEverUsedCalendar: false,
        homeWeekDays: [] as HomeWeekDay[],
        todayIso: "",
      };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = toIsoDate(today);

    const calMap = buildCalendarEntries(
      (data.lists ?? []) as Parameters<typeof buildCalendarEntries>[0],
      ((data as Record<string, unknown>).recipes ?? []) as Parameters<typeof buildCalendarEntries>[1],
    );

    // Check if the calendar has ever been used (any date, past or future)
    const hasEverUsedCalendar = Array.from(calMap.values()).some((entry) => dayEntryHasContent(entry));

    const result: Array<{ isoDate: string; entry: DayEntry }> = [];
    for (const [iso, entry] of Array.from(calMap.entries())) {
      if (iso >= todayIso && dayEntryHasContent(entry)) {
        result.push({ isoDate: iso, entry });
      }
    }
    result.sort((a, b) => a.isoDate.localeCompare(b.isoDate));

    const weekDays: HomeWeekDay[] = [];
    for (let offset = -HOME_CALENDAR_PAST_DAYS; offset <= 3; offset++) {
      const date = addDays(today, offset);
      const iso = toIsoDate(date);
      weekDays.push({ isoDate: iso, date, entry: calMap.get(iso) ?? null });
    }
    return { homeCalendarEntries: result, hasEverUsedCalendar, homeWeekDays: weekDays, todayIso };
  }, [data]);

  /** Eénmalige herberekening van lijst-decor-iconen: min duplicaten binnen de product-icon-pool. */
  React.useEffect(() => {
    if (!user?.id || authLoading || isLoading) return;
    const rows = (data?.lists ?? []) as Record<string, unknown>[];
    const mine = rows.filter(
      (l) =>
        l &&
        typeof l === "object" &&
        String((l as { ownerId?: string }).ownerId ?? "") === user.id,
    ) as { id: string; icon?: string }[];
    if (mine.length === 0) return;
    const plans = planOwnerListDecorIconUpdates(
      mine.map((l) => ({
        id: String(l.id),
        icon: typeof l.icon === "string" ? l.icon : "",
        name: String((l as Record<string, unknown>).name ?? ""),
        isMasterTemplate: listIsMasterTemplate(l),
      })),
    );
    if (plans.length === 0) return;
    void db.transact(
      plans.map((p) => db.tx.lists[p.listId].update({ icon: p.nextIcon })),
    );
  }, [user?.id, authLoading, isLoading, data?.lists]);

  const [teKopenSlideOpen, setTeKopenSlideOpen] = React.useState(false);

  const handleAddShoppingItem = React.useCallback(
    async (name: string, quantity: string, store: string | null) => {
      if (!user) return;
      const visibleShoppingOwnerIds = getVisibleShoppingOwnerIds({
        userId: user.id,
        ownedShares: (data as { shoppingShares?: unknown[] } | undefined)
          ?.shoppingShares as Parameters<typeof getVisibleShoppingOwnerIds>[0]["ownedShares"],
        joinedMemberships: (data as { shoppingShareMembers?: unknown[] } | undefined)
          ?.shoppingShareMembers as Parameters<typeof getVisibleShoppingOwnerIds>[0]["joinedMemberships"],
      });
      const allShoppingItems = (data?.shoppingItems ?? []) as Array<{
        order?: number;
        ownerId?: string;
      }>;
      const maxOrder = allShoppingItems
        .filter((i) => i.ownerId != null && visibleShoppingOwnerIds.has(i.ownerId))
        .reduce((max, i) => Math.max(max, i.order ?? 0), 0);
      await db.transact(
        db.tx.shoppingItems[iid()].update({
          name,
          quantity,
          ...(store ? { store } : {}),
          checked: false,
          order: maxOrder + 1,
          ownerId: user.id,
        }),
      );
      router.push("/te-kopen");
    },
    [user, data, router],
  );

  const [newListName, setNewListName] = React.useState("");
  /** Geplande winkeldag (ISO); bepaalt wanneer het lijstje als afgerond telt. */
  const [newListDate, setNewListDate] = React.useState(() => todayIsoDate());
  const [newListCustomIcon, setNewListCustomIcon] = React.useState<string | null>(null);
  const [newListIconPickerOpen, setNewListIconPickerOpen] = React.useState(false);
  const [pendingFrituurChoice, setPendingFrituurChoice] =
    React.useState<PendingFrituurChoice | null>(null);
  const [pendingLandalChoice, setPendingLandalChoice] =
    React.useState<PendingLandalChoice | null>(null);
  const [blankVenueSlideOpen, setBlankVenueSlideOpen] = React.useState(false);
  const [supermarktNewListSlideOpen, setSupermarktNewListSlideOpen] =
    React.useState(false);
  const [selectedSupermarktStoreSlug, setSelectedSupermarktStoreSlug] =
    React.useState<MasterStoreSlug | null>(null);
  const newListPhotoInputRef = React.useRef<HTMLInputElement>(null);
  const [quickMasterListName, setQuickMasterListName] = React.useState("");
  /** Geplande winkeldag (ISO) voor «+ Lijstje» vanaf een master. */
  const [quickMasterDate, setQuickMasterDate] = React.useState(() => todayIsoDate());
  const [quickMasterId, setQuickMasterId] = React.useState<string | null>(null);
  const [isQuickMasterModalOpen, setIsQuickMasterModalOpen] = React.useState(false);
  /** Nieuwe key bij elke modal-open: remount van het formulier zodat radio’s terug naar default staan. */
  const [newListFormKey, setNewListFormKey] = React.useState(0);
  const [addingId, setAddingId] = React.useState<string | null>(null);
  const [addingIdExpanded, setAddingIdExpanded] = React.useState(false);
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const removeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleNewListDateChange = React.useCallback(
    (nextDate: string) => {
      setNewListName((current) =>
        current === defaultListNameForIsoDate(newListDate)
          ? defaultListNameForIsoDate(nextDate)
          : current,
      );
      setNewListDate(nextDate);
    },
    [newListDate],
  );

  const handleQuickMasterDateChange = React.useCallback(
    (nextDate: string) => {
      setQuickMasterListName((current) =>
        current === defaultListNameForIsoDate(quickMasterDate)
          ? defaultListNameForIsoDate(nextDate)
          : current,
      );
      setQuickMasterDate(nextDate);
    },
    [quickMasterDate],
  );

  const hasLists = lists.length > 0;

  const DELETE_ANIMATION_MS = 300;

  const handleDeleteList = React.useCallback(
    (listId: string) => {
      if (removeTimeoutRef.current) {
        clearTimeout(removeTimeoutRef.current);
        removeTimeoutRef.current = null;
      }
      setRemovingId(listId);
      removeTimeoutRef.current = setTimeout(() => {
        removeTimeoutRef.current = null;
        const list = lists.find((l) => l.id === listId);
        if (!list || !list.isOwner) return;
        const itemIds = (list.items ?? []).map((i) => i.id);
        const membershipIds = list.membershipIds ?? [];
        db.transact([
          ...itemIds.map((itemId) => db.tx.items[itemId].delete()),
          ...membershipIds.map((mid) => db.tx.listMembers[mid].delete()),
          db.tx.lists[listId].delete(),
        ] as Parameters<typeof db.transact>[0]);
        setRemovingId(null);
      }, DELETE_ANIMATION_MS);
    },
    [lists],
  );

  const ADD_ANIMATION_MS = 300;

  React.useEffect(() => {
    if (!addingId) return;
    setAddingIdExpanded(false);
    const rafId = requestAnimationFrame(() => {
      setAddingIdExpanded(true);
    });
    const timeoutId = window.setTimeout(() => {
      setAddingId(null);
      setAddingIdExpanded(false);
    }, ADD_ANIMATION_MS);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [addingId]);

  const handleCloseNewListFormState = React.useCallback(() => {
    setSupermarktNewListSlideOpen(false);
    setSelectedSupermarktStoreSlug(null);
    setNewListName("");
    setNewListCustomIcon(null);
    setNewListIconPickerOpen(false);
    setPendingFrituurChoice(null);
  }, []);

  /** Figma: eerst venue-slide; daarna pas naam/soort-modal. */
  const handleOpenCreateModal = React.useCallback(() => {
    setPendingFrituurChoice(null);
    setBlankVenueSlideOpen(true);
  }, []);

  /** Figma 1320:22753 — supermarkt: naam + swimlane + Volgende. */
  const openSupermarktNewListSlide = React.useCallback(() => {
    setBlankVenueSlideOpen(false);
    setSupermarktNewListSlideOpen(true);
    setSelectedSupermarktStoreSlug(null);
    setNewListName(defaultNewListName(new Date(), lists.map((l) => l.name)));
    setNewListDate(todayIsoDate());
    setNewListFormKey((k) => k + 1);
    setNewListCustomIcon(null);
    setNewListIconPickerOpen(false);
    setPendingFrituurChoice(null);
  }, [lists]);

  const handleNewListPhotoChange = React.useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file?.type.startsWith("image/")) return;
      if (!user?.id) return;
      try {
        const image = await uploadUserImageFile({
          file,
          ownerId: user.id,
          kind: "list-icon",
        });
        setNewListCustomIcon(image.url);
        setNewListIconPickerOpen(false);
      } catch {
        // negeer compressiefouten stilzwijgend
      }
    },
    [user?.id],
  );

  const handleCloseQuickMasterModal = React.useCallback(() => {
    setIsQuickMasterModalOpen(false);
    setQuickMasterId(null);
    setQuickMasterListName("");
  }, []);

  const handleStartFromMaster = React.useCallback((masterId: string) => {
    setQuickMasterId(masterId);
    setQuickMasterListName(defaultNewListName(new Date(), lists.map((l) => l.name)));
    setQuickMasterDate(todayIsoDate());
    setIsQuickMasterModalOpen(true);
  }, [lists]);

  /** «+ Lijstje» op een afgeronde tegel: nieuw lijstje voor dezelfde winkel vanaf de masterlijst. */
  const handleNewListLike = React.useCallback(
    (list: HomeList) => {
      const master =
        (list.sourceMasterListId
          ? masterLists.find((m) => m.id === list.sourceMasterListId)
          : undefined) ??
        (list.masterIcon
          ? masterLists.find((m) => m.icon === list.masterIcon || m.masterIcon === list.masterIcon)
          : undefined);
      if (master) {
        handleStartFromMaster(master.id);
        return;
      }
      // Geen bijhorende favorietenlijst: gewoon een nieuw lijstje starten.
      handleOpenCreateModal();
    },
    [handleStartFromMaster, handleOpenCreateModal, masterLists],
  );

  const handleQuickMasterSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!quickMasterId) return;
      const name = quickMasterListName.trim();
      if (!name) return;
      router.push(
        `/nieuw-lijstje/selecteer-master-lijstje/${encodeURIComponent(
          quickMasterId,
        )}/items?naam=${encodeURIComponent(name)}&datum=${encodeURIComponent(quickMasterDate)}`,
      );
      handleCloseQuickMasterModal();
    },
    [handleCloseQuickMasterModal, quickMasterDate, quickMasterId, quickMasterListName, router],
  );

  const loyaltyCardsForLinking = React.useMemo(() => {
    const raw = (data?.loyaltyCards ?? []) as Array<{
      id: string;
      cardName?: string | null;
      list?: { id?: string } | null;
    }>;
    return raw.filter((c) => typeof c.id === "string");
  }, [data?.loyaltyCards]);

  const supermarktSwimlaneStoresOrdered = React.useMemo(() => {
    const base = masterStoresForSupermarktSwimlane();
    const stats = (data?.supermarktPickerStats ?? []) as Array<{
      storeSlug?: string | null;
      pickCount?: number | null;
      lastPickedAtIso?: string | null;
    }>;
    return sortSupermarktStoresByPickerUsage(base, stats);
  }, [data?.supermarktPickerStats]);

  const createBlankList = React.useCallback(
    ({
      listName,
      duplicateFrom,
      startFrituurWizard,
      startCafeWizard = false,
      customIconForCreate,
      pickerMasterStore,
      loyaltyCardIdToLink,
      landalTripLabel,
      copyItemsFrom,
      listDateIso,
    }: {
      listName: string;
      /** Geplande winkeldag (ISO); standaard vandaag. */
      listDateIso?: string | null;
      duplicateFrom?: FrituurPreviousList | null;
      copyItemsFrom?: CopyableListTemplate | null;
      startFrituurWizard: boolean;
      startCafeWizard?: boolean;
      /** Override i.p.v. `newListCustomIcon` (modal kan al gesloten zijn). */
      customIconForCreate?: string | null;
      /** Gekozen winkeltegel (Figma swimlane); `masterIcon` ook als lijstnaam geen winkel is. */
      pickerMasterStore?: (typeof MASTER_STORE_OPTIONS)[number] | null;
      /** Optioneel: bestaande klantenkaart koppelen indien match met winkel. */
      loyaltyCardIdToLink?: string | null;
      /** Alleen Landal-flow: «Gezin» / «Vrienden» voor kaartondertitel. */
      landalTripLabel?: string | null;
    }) => {
      if (!user) return;
      setBlankVenueSlideOpen(false);
      const customIcon =
        customIconForCreate !== undefined ? customIconForCreate : newListCustomIcon;
      const icon = pickListProductIconForNewList(lists, listName);
      const storeFromName = findMasterStoreByListName(listName);
      const storeForMasterIcon = pickerMasterStore ?? storeFromName;
      const now = new Date();
      const nowIso = now.toISOString();
      const newId = iid();
      const txs: Parameters<typeof db.transact>[0] = [
        db.tx.lists[newId].update({
          name: listName,
          date: isoToListDate(listDateIso ?? todayIsoDate(now)),
          icon,
          order:
            lists.length > 0 ? Math.min(...lists.map((l) => l.order)) - 1 : 0,
          ownerId: user.id,
          isMasterTemplate: false,
          ...(storeForMasterIcon ? { masterIcon: storeForMasterIcon.logoSrc } : {}),
          ...(customIcon ? { customIconUrl: customIcon } : {}),
          ...(landalTripLabel != null && landalTripLabel !== ""
            ? { landalTripLabel }
            : {}),
        }),
      ];

      const duplicateItems = copyItemsFrom?.items ?? duplicateFrom?.items ?? [];
      for (let index = 0; index < duplicateItems.length; index += 1) {
        const item = duplicateItems[index];
        if (!item) continue;
        const copiedItem = copiedItemUpdate(item, index);
        if (!copiedItem) continue;
        txs.push(
          db.tx.items[iid()]
            .update(copiedItem)
            .link({ list: newId }),
        );
      }

      if (customIcon) {
        const existingIcon = savedListIconImages.find(
          (img) => img.imageDataUrl === customIcon && img.id,
        );
        if (existingIcon?.id) {
          txs.push(
            db.tx.listIconImages[existingIcon.id].update({
              lastUsedAtIso: nowIso,
            }),
          );
        } else {
          txs.push(
            db.tx.listIconImages[iid()].update({
              ownerId: user.id,
              imageDataUrl: customIcon,
              createdAtIso: nowIso,
              lastUsedAtIso: nowIso,
            }),
          );
        }
      }

      if (loyaltyCardIdToLink) {
        txs.push(db.tx.lists[newId].link({ loyaltyCard: loyaltyCardIdToLink }));
      }

      if (
        isLandalGezinList({
          name: listName,
          customIconUrl: customIcon,
          landalTripLabel: landalTripLabel ?? null,
        })
      ) {
        txs.push(
          ...landalGezinHouseholdMembershipTransactions(newId, user.id, []),
        );
      }

      txs.push(
        ...autoShareMembershipTransactions(
          newId,
          listAutoShareKind({ name: listName, customIconUrl: customIcon }),
          autoShare.enabledKinds,
          autoShare.partnerIds,
          isLandalGezinList({
            name: listName,
            customIconUrl: customIcon,
            landalTripLabel: landalTripLabel ?? null,
          })
            ? LANDAL_GEZIN_HOUSEHOLD_INSTANT_USER_IDS
            : [],
        ),
      );

      if (pickerMasterStore) {
        const slug = pickerMasterStore.slug;
        const statRows = (data?.supermarktPickerStats ?? []) as Array<{
          id: string;
          storeSlug?: string | null;
          pickCount?: number | null;
        }>;
        const statRow = statRows.find(
          (r) => r.storeSlug === slug && typeof r.id === "string",
        );
        if (statRow?.id) {
          txs.push(
            db.tx.supermarktPickerStats[statRow.id].update({
              pickCount:
                (typeof statRow.pickCount === "number" ? statRow.pickCount : 0) +
                1,
              lastPickedAtIso: nowIso,
            }),
          );
        } else {
          txs.push(
            db.tx.supermarktPickerStats[iid()].update({
              ownerId: user.id,
              storeSlug: slug,
              pickCount: 1,
              lastPickedAtIso: nowIso,
            }),
          );
        }
      }

      db.transact(txs as Parameters<typeof db.transact>[0]);
      handleCloseNewListFormState();
      if (startFrituurWizard) {
        router.push(`/lijstje/${newId}?frituurWizard=1`);
        return;
      }
      if (startCafeWizard) {
        router.push(`/lijstje/${newId}?cafeWizard=1`);
        return;
      }
      if (duplicateFrom) {
        router.push(`/lijstje/${newId}`);
        return;
      }
      setAddingId(newId);
    },
    [
      autoShare.enabledKinds,
      autoShare.partnerIds,
      data?.supermarktPickerStats,
      handleCloseNewListFormState,
      lists,
      newListCustomIcon,
      router,
      savedListIconImages,
      user,
    ],
  );

  const handleCloseBlankVenueStep = React.useCallback(() => {
    setBlankVenueSlideOpen(false);
  }, []);

  const handleBlankVenuePickSupermarkt = React.useCallback(() => {
    openSupermarktNewListSlide();
  }, [openSupermarktNewListSlide]);

  const handleSupermarktSlideVolgende = React.useCallback(() => {
    if (!user) return;
    const name = newListName.trim();
    if (!name) return;
    const store = selectedSupermarktStoreSlug
      ? findMasterStoreBySlug(selectedSupermarktStoreSlug)
      : undefined;
    const loyaltyCardIdToLink =
      store != null
        ? findLoyaltyCardIdForStore(store, loyaltyCardsForLinking)
        : null;
    createBlankList({
      listName: name,
      duplicateFrom: null,
      startFrituurWizard: false,
      startCafeWizard: false,
      customIconForCreate: newListCustomIcon,
      pickerMasterStore: store ?? null,
      loyaltyCardIdToLink,
      listDateIso: newListDate,
    });
  }, [
    createBlankList,
    newListDate,
    loyaltyCardsForLinking,
    newListCustomIcon,
    newListName,
    selectedSupermarktStoreSlug,
    user,
  ]);

  const handleBlankVenuePickFrituur = React.useCallback(() => {
    setBlankVenueSlideOpen(false);
    const listName = defaultFrituurListName(lists.map((l) => l.name));
    if (listIsFrituurVenueList(listName) && latestFrituurList) {
      setPendingFrituurChoice({ listName, customIconUrl: null });
      return;
    }
    createBlankList({
      listName,
      duplicateFrom: null,
      startFrituurWizard: true,
      startCafeWizard: false,
      customIconForCreate: null,
    });
  }, [createBlankList, latestFrituurList, lists]);

  const handleBlankVenuePickCafe = React.useCallback(() => {
    setBlankVenueSlideOpen(false);
    const listName = defaultCafeListName(lists.map((l) => l.name));
    createBlankList({
      listName,
      duplicateFrom: null,
      startFrituurWizard: false,
      startCafeWizard: true,
      customIconForCreate: null,
    });
  }, [createBlankList, lists]);

  const handleBlankVenuePickLandal = React.useCallback(() => {
    setBlankVenueSlideOpen(false);
    const listName = defaultLandalListName(lists.map((l) => l.name));
    setPendingLandalChoice({ listName });
  }, [lists]);

  const latestLandalTemplateForTrip = React.useCallback(
    (tripLabel: "Gezin" | "Vrienden"): CopyableListTemplate | null => {
      const candidates: Array<Record<string, unknown> & CopyableListTemplate> = [];

      for (const list of data?.lists ?? []) {
        candidates.push(list as Record<string, unknown> & CopyableListTemplate);
      }
      for (const row of data?.listMembers ?? []) {
        const list = (row as { list?: unknown }).list;
        if (list && typeof list === "object") {
          candidates.push(list as Record<string, unknown> & CopyableListTemplate);
        }
      }

      const byId = new Map<string, Record<string, unknown> & CopyableListTemplate>();
      for (const list of candidates) {
        const id = typeof list.id === "string" ? list.id : "";
        if (
          !id ||
          byId.has(id) ||
          listIsMasterTemplate({
            isMasterTemplate:
              typeof list.isMasterTemplate === "boolean"
                ? list.isMasterTemplate
                : null,
            icon: typeof list.icon === "string" ? list.icon : null,
            name: typeof list.name === "string" ? list.name : null,
          })
        ) {
          continue;
        }
        const customIconUrl =
          typeof list.customIconUrl === "string" ? list.customIconUrl : null;
        if (!isLandalListCard(customIconUrl)) continue;
        const inferredTripLabel = inferLandalTripLabel({
          name: typeof list.name === "string" ? list.name : "",
          customIconUrl,
          landalTripLabel:
            typeof list.landalTripLabel === "string" ? list.landalTripLabel : null,
        });
        if (inferredTripLabel !== tripLabel) continue;
        byId.set(id, list);
      }

      return (
        Array.from(byId.values()).sort((a, b) => {
          const orderA =
            typeof a.order === "number" ? a.order : Number.MAX_SAFE_INTEGER;
          const orderB =
            typeof b.order === "number" ? b.order : Number.MAX_SAFE_INTEGER;
          return orderA - orderB;
        })[0] ?? null
      );
    },
    [data?.listMembers, data?.lists],
  );

  const handleLandalSubPick = React.useCallback((subSuffix: "Gezin" | "Vrienden") => {
    setPendingLandalChoice(null);
    const baseName =
      pendingLandalChoice?.listName ??
      defaultLandalListName(lists.map((l) => l.name));
    const listName = `${baseName} ${subSuffix}`;
    const previousLandalList = latestLandalTemplateForTrip(subSuffix);
    createBlankList({
      listName,
      duplicateFrom: null,
      copyItemsFrom: previousLandalList,
      startFrituurWizard: false,
      startCafeWizard: false,
      customIconForCreate: VENUE_TILE_ICON_LANDAL,
      landalTripLabel: subSuffix,
    });
  }, [createBlankList, latestLandalTemplateForTrip, lists, pendingLandalChoice]);

  const handleBlankVenuePickVakantie = React.useCallback(() => {
    setBlankVenueSlideOpen(false);
    router.push("/nieuw-lijstje/vakantie");
  }, [router]);

  const renderHomeSection = (sectionId: HomeSectionId): React.ReactNode => {
    const onHide = sectionId !== "lijstjes" ? () => hideSection(sectionId) : undefined;
    switch (sectionId) {
      case "lijstjes":
        return (
          <>
            {favoritesPromo.show ? (
              <FavoritesPromoBanner
                className="mb-6"
                onSetUp={() => router.push("/nieuw-lijstje/selecteer-winkel")}
                onDismiss={favoritesPromo.dismiss}
              />
            ) : null}
            <HomeLijstjesSection
              normalLists={normalLists}
              onOpenCreateModal={handleOpenCreateModal}
              onQuickAdd={handleQuickAddToList}
              onNewListLike={handleNewListLike}
            />
          </>
        );
      case "te-kopen":
        return (
          <HomeTeKopenSection
            shoppingItems={homeShoppingItems}
            hasUsedBefore={hasUsedTeKopen}
            addedByFor={teKopenAddedByFor}
            onAddProduct={() => {
              primeKeyboard();
              setTeKopenSlideOpen(true);
            }}
            onHide={onHide}
          />
        );
      case "kalender":
        return (
          <HomeKalenderSection
            entries={homeCalendarEntries}
            weekDays={homeWeekDays}
            todayIso={todayIso}
            hasEverUsedCalendar={hasEverUsedCalendar}
            onHide={onHide}
          />
        );
      case "klantenkaarten":
        return <HomeKlantenkaartSection cards={homeLoyaltyCards} onHide={onHide} />;
      case "diepvries":
        return (
          <HomeDiepvriesSection
            itemCount={homeFreezerItems.length}
            previewItems={homeFreezerItems}
            onHide={onHide}
          />
        );
      case "films-series":
        return <HomeFilmsSeriesSection onHide={onHide} />;
      default:
        return null;
    }
  };

  if (authLoading || !user || isLoading) {
    return <PageSpinner />;
  }

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-base text-[var(--error-600)]">
          Er ging iets mis: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("relative flex min-h-dvh w-full flex-col px-[var(--space-4)]", !hasLists && "bg-[var(--bg-app)]")}>
      <div className="flex flex-1 flex-col pb-[calc(195px+env(safe-area-inset-bottom,0px))] pt-[calc(var(--space-4)+env(safe-area-inset-top,0px))]">
        <div className="mx-auto flex w-full max-w-[956px] flex-1 flex-col">
          <HomeHeader
            ownerId={ownerId}
            className="pt-[var(--space-6)] motion-safe:animate-fade-up"
            action={
              <FloatingActionButton
                aria-label="Nieuw lijstje"
                desktopLabel="Nieuw lijstje"
                elevated={false}
                className="hidden h-12 gap-2 px-5 py-0 lg:inline-flex"
                onClick={handleOpenCreateModal}
              />
            }
          />
          {/* Secties komen gestaggerd binnen (60ms per sectie, max 4 stappen) — geeft ritme zonder te vertragen */}
          <div
            className={cn(
              "flex flex-col",
              !hasLists ? "gap-8 pt-8 pb-2" : "gap-10 pt-8",
            )}
          >
            {homeSectionConfig.order
              .filter((sectionId) => !homeSectionConfig.hidden.includes(sectionId))
              .map((sectionId, index) => {
              const section = renderHomeSection(sectionId);
              if (section == null) return null;
              return (
                <div
                  key={sectionId}
                  className="motion-safe:animate-fade-up"
                  style={{ animationDelay: `${Math.min(index + 1, 4) * 60}ms` }}
                >
                  {section}
                </div>
              );
            })}
          </div>
          <div className="mt-10 flex justify-center pb-4">
            <Link
              href="/beheer-homepagina"
              className="rounded-pill bg-[var(--white)] px-4 py-2 text-sm font-medium leading-5 text-action-primary shadow-card transition-colors [@media(hover:hover)]:hover:bg-action-ghost-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
            >
              Homepagina aanpassen
            </Link>
          </div>
        </div>
      </div>

      {/* Figma 1320:22753 — Nieuw lijstje supermarkt (swimlane + optionele klantenkaart-koppeling) */}
      <SlideInModal
        open={supermarktNewListSlideOpen}
        onClose={handleCloseNewListFormState}
        title="Nieuw lijstje supermarkt"
        titleId="supermarkt-new-list-slide-title"
        className="pb-0"
        bodyClassName="pb-[var(--space-2)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0"
        disableEscapeClose={
          newListIconPickerOpen || pendingFrituurChoice != null || pendingLandalChoice != null
        }
        footer={
          <Button
            type="button"
            variant="primary"
            disabled={!newListName.trim()}
            onClick={handleSupermarktSlideVolgende}
          >
            Volgende
          </Button>
        }
      >
        <div
          key={newListFormKey}
          className="flex w-full flex-col items-center gap-[var(--space-8)]"
        >
          <ListDateStepper value={newListDate} onChange={handleNewListDateChange} />

          <div className="flex w-full flex-col gap-[var(--space-2)]">
            <label
              htmlFor="supermarkt-new-list-name"
              className="text-sm font-normal leading-20 tracking-normal text-[var(--text-primary)]"
            >
              Naam lijstje
            </label>
            <div className="flex w-full items-center gap-2">
              <div className="relative flex-1">
                <input
                  id="supermarkt-new-list-name"
                  value={newListName}
                  autoComplete="off"
                  onChange={(e) => setNewListName(e.target.value)}
                  onFocus={selectListNameInputOnFocus}
                  placeholder="Naam lijstje"
                  className={cn(
                    "flex h-12 w-full rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--white)] px-4 text-base leading-24 tracking-normal text-[var(--text-primary)] transition-colors placeholder:text-[var(--text-placeholder)] focus-visible:outline-none focus-visible:border-[var(--border-focus)]",
                    !newListCustomIcon && "pr-12",
                  )}
                />
                {!newListCustomIcon ? (
                  <button
                    type="button"
                    aria-label="Afbeeldingopties openen"
                    aria-expanded={newListIconPickerOpen}
                    onClick={() => setNewListIconPickerOpen((open) => !open)}
                    className="absolute right-3 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center"
                  >
                    <span
                      aria-hidden
                      className="inline-block size-6 bg-[var(--blue-500)]"
                      style={{
                        WebkitMaskImage: "url(/icons/camera.svg)",
                        maskImage: "url(/icons/camera.svg)",
                        WebkitMaskSize: "contain",
                        maskSize: "contain",
                        WebkitMaskRepeat: "no-repeat",
                        maskRepeat: "no-repeat",
                        WebkitMaskPosition: "center",
                        maskPosition: "center",
                      }}
                    />
                  </button>
                ) : null}
              </div>
              {newListCustomIcon ? (
                <button
                  type="button"
                  aria-label="Afbeeldingopties openen"
                  aria-expanded={newListIconPickerOpen}
                  onClick={() => setNewListIconPickerOpen((open) => !open)}
                  className="relative shrink-0 size-12 overflow-hidden rounded-[var(--radius-md)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={newListCustomIcon} alt="" className="size-full object-cover" />
                </button>
              ) : null}
            </div>
            <input
              ref={newListPhotoInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              tabIndex={-1}
              onChange={handleNewListPhotoChange}
            />
          </div>

          <div className="w-full min-w-0">
            <p className="sr-only">Supermarkt (optioneel)</p>
            <div
              role="radiogroup"
              aria-label="Supermarkt, optioneel"
              className="-mx-1 flex gap-[var(--space-3)] overflow-x-auto px-1 pb-1 pt-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {supermarktSwimlaneStoresOrdered.map((store) => {
                const selected = selectedSupermarktStoreSlug === store.slug;
                return (
                  <StoreSelectionTile
                    key={store.slug}
                    role="radio"
                    aria-checked={selected}
                    label={store.label}
                    logoSrc={store.logoSrc}
                    selected={selected}
                    onClick={() =>
                      setSelectedSupermarktStoreSlug((prev) =>
                        prev === store.slug ? null : store.slug,
                      )
                    }
                  />
                );
              })}
            </div>
          </div>
        </div>
      </SlideInModal>

      <SlideInModal
        open={blankVenueSlideOpen}
        onClose={handleCloseBlankVenueStep}
        title="Nieuw lijstje"
        titleId="blank-list-venue-slide-title"
        containerClassName="z-[60]"
        className="!bg-[var(--bg-app)] pb-0"
        bodyClassName="px-[var(--space-4)] pb-[34px] pt-[var(--space-2)] md:px-6 md:pb-6"
      >
        {/* Canvas «Nieuw lijstje A»: favorieten als snelle start + soorten als witte kaarten met schaduw. */}
        <div className="flex w-full flex-col gap-4">
          {quickStartMasters.length > 0 ? (
            <div>
              <p className="mb-2 text-[13px] font-semibold text-[var(--text-secondary)]">Vanuit je favorieten</p>
              <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1.5 pt-0.5 [scrollbar-width:none] md:mx-0 md:flex-wrap md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
                {quickStartMasters.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        handleCloseBlankVenueStep();
                        handleStartFromMaster(m.id);
                      }}
                      className="flex h-[46px] shrink-0 items-center gap-2 rounded-pill bg-[var(--white)] pl-1.5 pr-3 shadow-[0_1px_2px_rgba(16,17,48,0.06),0_6px_16px_-8px_rgba(16,17,48,0.18)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                      aria-label={`Nieuw lijstje uit favorieten ${m.name}`}
                    >
                      <span className="flex size-[34px] items-center justify-center rounded-full bg-[var(--gray-25)]">
                        {/* eslint-disable-next-line @next/next/no-img-element -- winkellogo */}
                        <img src={m.masterIcon || m.icon} alt="" width={24} height={24} className="size-6 object-contain" />
                      </span>
                      <span className="text-sm font-semibold text-[var(--text-primary)]">{m.name}</span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden className="size-3.5 text-[var(--blue-500)]">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </button>
                  ))}
              </div>
            </div>
          ) : null}
          <div>
            {quickStartMasters.length > 0 ? (
              <p className="mb-2 text-[13px] font-semibold text-[var(--text-secondary)]">Of kies een soort lijstje</p>
            ) : null}
            <div className="flex flex-col gap-2.5 md:grid md:grid-cols-3 md:gap-3">
              {(
                [
                  ["Supermarkt", "Boodschappen voor een dag of de week", VENUE_TILE_ICON_SUPERMARKT, handleBlankVenuePickSupermarkt],
                  ["Frituur", "Iedereen kiest, jij bestelt", VENUE_TILE_ICON_FRITUUR, handleBlankVenuePickFrituur],
                  ["Café", "Rondjes bijhouden met vrienden", VENUE_TILE_ICON_CAFE, handleBlankVenuePickCafe],
                  ["Landal", "Voor je verblijf in een Landal-park", VENUE_TILE_ICON_LANDAL, handleBlankVenuePickLandal],
                  ["Vakantie", "Paklijst op maat voor je reis", VENUE_TILE_ICON_VAKANTIE, handleBlankVenuePickVakantie],
                ] as const
              ).map(([title, description, icon, onPick]) => (
                <button
                  key={title}
                  type="button"
                  onClick={onPick}
                  className="flex items-center gap-3 rounded-[18px] bg-[var(--white)] py-2.5 pl-2.5 pr-3.5 text-left shadow-[0_1px_2px_rgba(16,17,48,0.06),0_6px_16px_-8px_rgba(16,17,48,0.18)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] md:flex-col md:gap-1.5 md:px-3 md:pb-4 md:pt-[18px] md:text-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- lokale illustratie */}
                  <img src={icon} alt="" width={56} height={56} className="size-11 shrink-0 object-contain md:size-14" />
                  <span className="min-w-0 flex-1 leading-[19px] md:mt-1">
                    <span className="block text-[15.5px] font-semibold text-[var(--text-primary)]">{title}</span>
                    <span className="block text-[13px] text-[var(--text-secondary)] md:text-[12.5px] md:leading-[17px]">{description}</span>
                  </span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[18px] shrink-0 text-[var(--gray-300)] md:hidden">
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        </div>
      </SlideInModal>

      <SlideInModal
        open={pendingFrituurChoice != null}
        onClose={() => setPendingFrituurChoice(null)}
        title="Nieuw frituur lijstje"
        titleId="new-frituur-choice-slide-title"
        containerClassName="z-[60]"
        className="pb-0"
        bodyClassName="pb-[45px]"
      >
        <div className="flex w-full flex-col gap-4">
          <button
            type="button"
            onClick={() => {
              if (!pendingFrituurChoice || !latestFrituurList) return;
              createBlankList({
                listName: pendingFrituurChoice.listName,
                duplicateFrom: latestFrituurList,
                startFrituurWizard: false,
                customIconForCreate: pendingFrituurChoice.customIconUrl,
              });
            }}
            className="w-full bg-transparent p-0 text-left"
          >
            <SelectTile
              title="Vertrek van vorige lijstje"
              subtitle="Je bestelt bijna hetzelfde dan vorige keer"
              icon={<IconPrimaryMask src="/icons/list.svg" />}
            />
          </button>
          <button
            type="button"
            onClick={() => {
              if (!pendingFrituurChoice) return;
              createBlankList({
                listName: pendingFrituurChoice.listName,
                duplicateFrom: null,
                startFrituurWizard: true,
                customIconForCreate: pendingFrituurChoice.customIconUrl,
              });
            }}
            className="w-full bg-transparent p-0 text-left"
          >
            <SelectTile
              title="Nieuw lijstje"
              subtitle="Je doet een totaal andere bestelling"
              icon={<IconPrimaryMask src="/icons/plus-circle.svg" />}
            />
          </button>
        </div>
      </SlideInModal>

      <SlideInModal
        open={pendingLandalChoice != null}
        onClose={() => setPendingLandalChoice(null)}
        title="Landal lijstje"
        titleId="new-landal-choice-slide-title"
        containerClassName="z-[60]"
        className="pb-0"
        bodyClassName="px-[var(--space-4)] pb-[45px] pt-[var(--space-6)]"
      >
        <div className="grid w-full grid-cols-2 gap-[var(--space-4)]">
          <button
            type="button"
            onClick={() => handleLandalSubPick("Gezin")}
            className={cn(
              "flex min-w-0 flex-col items-center gap-[var(--space-2)] rounded-lg bg-[var(--white)] p-[var(--space-3)] text-center shadow-card transition-[background-color,box-shadow,transform] duration-fast ease-out-strong motion-safe:active:scale-[0.97]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
              "[@media(hover:hover)]:hover:bg-[var(--gray-25)]",
            )}
          >
            <div className="relative size-12 shrink-0 overflow-hidden rounded-[var(--radius-sm)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={VENUE_TILE_ICON_GEZIN} alt="" width={48} height={48} className="size-full object-cover" />
            </div>
            <p className="w-full truncate text-sm font-medium leading-20 tracking-normal text-[var(--text-primary)]">
              Gezin
            </p>
          </button>
          <button
            type="button"
            onClick={() => handleLandalSubPick("Vrienden")}
            className={cn(
              "flex min-w-0 flex-col items-center gap-[var(--space-2)] rounded-lg bg-[var(--white)] p-[var(--space-3)] text-center shadow-card transition-[background-color,box-shadow,transform] duration-fast ease-out-strong motion-safe:active:scale-[0.97]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
              "[@media(hover:hover)]:hover:bg-[var(--gray-25)]",
            )}
          >
            <div className="relative size-12 shrink-0 overflow-hidden rounded-[var(--radius-sm)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={VENUE_TILE_ICON_VRIENDEN} alt="" width={48} height={48} className="size-full object-cover" />
            </div>
            <p className="w-full truncate text-sm font-medium leading-20 tracking-normal text-[var(--text-primary)]">
              Vrienden
            </p>
          </button>
        </div>
      </SlideInModal>

      <SlideInModal
        open={newListIconPickerOpen}
        onClose={() => setNewListIconPickerOpen(false)}
        title="Afbeelding kiezen"
        titleId="new-list-icon-picker-slide-title"
        containerClassName="z-[60]"
        className="pb-0"
      >
        <div className="flex w-full flex-col gap-6">
          <button
            type="button"
            onClick={() => newListPhotoInputRef.current?.click()}
            className="w-full bg-transparent p-0 text-left"
          >
            <SelectTile
              title="Nieuwe foto"
              subtitle="Maak een foto of kies uit je galerij"
              icon={<IconPrimaryMask src="/icons/camera.svg" />}
            />
          </button>

          {savedListIconImages.length > 0 ? (
            <section className="flex w-full flex-col gap-3">
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-medium leading-24 tracking-normal text-[var(--text-primary)]">
                  Eerder gebruikt
                </h3>
                <p className="text-sm font-normal leading-20 tracking-normal text-[var(--text-secondary)]">
                  Kies snel een afbeelding die je al eens hebt gebruikt.
                </p>
              </div>
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                {savedListIconImages.map((image) => {
                  const isSelected = newListCustomIcon === image.imageDataUrl;
                  return (
                    <button
                      key={image.id ?? image.imageDataUrl}
                      type="button"
                      aria-label="Eerder gebruikte afbeelding kiezen"
                      aria-pressed={isSelected}
                      onClick={() => {
                        setNewListCustomIcon(image.imageDataUrl);
                        setNewListIconPickerOpen(false);
                      }}
                      className={cn(
                        "relative aspect-square w-full overflow-hidden rounded-[var(--radius-md)] border bg-[var(--white)] shadow-drop transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
                        isSelected
                          ? "border-action-primary ring-2 ring-action-primary"
                          : "border-[var(--border-default)]",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.imageDataUrl}
                        alt=""
                        className="size-full object-cover"
                        loading="lazy"
                      />
                      {isSelected ? (
                        <span
                          aria-hidden
                          className="absolute right-1 top-1 size-4 rounded-full bg-action-primary ring-2 ring-[var(--white)]"
                        />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : (
            <div className="rounded-[var(--radius-md)] bg-[var(--blue-25)] px-4 py-3">
              <p className="text-sm font-normal leading-20 tracking-normal text-[var(--text-secondary)]">
                Je hebt nog geen eerder gebruikte afbeeldingen. Voeg eerst een
                nieuwe foto toe.
              </p>
            </div>
          )}
        </div>
      </SlideInModal>

      <SlideInModal
        open={isQuickMasterModalOpen}
        onClose={handleCloseQuickMasterModal}
        title="Nieuw lijstje"
        footer={
          <Button
            type="submit"
            form="quick-master-create-form"
            variant="primary"
            disabled={!quickMasterListName.trim()}
          >
            Bewaren
          </Button>
        }
      >
        <form
          id="quick-master-create-form"
          onSubmit={handleQuickMasterSubmit}
          className="flex w-full flex-col items-center gap-8"
        >
          <ListDateStepper value={quickMasterDate} onChange={handleQuickMasterDateChange} />
          <InputField
            label="Naam lijstje"
            placeholder="Naam lijstje"
            name="newListName"
            value={quickMasterListName}
            autoComplete="off"
            onChange={(e) => setQuickMasterListName(e.target.value)}
            onFocus={selectListNameInputOnFocus}
          />
        </form>
      </SlideInModal>

      <div
        className={cn(
          "pointer-events-none fixed inset-x-0 z-20 lg:hidden",
          APP_FAB_BOTTOM_CLASS,
        )}
      >
        <div className="px-[var(--space-4)]">
          <div className="mx-auto flex w-full max-w-[956px] justify-end">
            <FloatingActionButton
              aria-label="Nieuw lijstje"
              elevated={false}
              className="pointer-events-auto"
              onClick={handleOpenCreateModal}
            />
          </div>
        </div>
      </div>

      <AddShoppingItemSlideIn
        open={teKopenSlideOpen}
        onClose={() => setTeKopenSlideOpen(false)}
        onAdd={handleAddShoppingItem}
      />
    </div>
  );
}
