"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { ListCard } from "@/components/ui/list_card";
import { MiniButton } from "@/components/ui/mini_button";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { InputField } from "@/components/ui/input_field";
import { Button } from "@/components/ui/button";
import { SelectTile } from "@/components/ui/select_tile";
import { cn } from "@/lib/utils";
import {
  defaultNewListName,
  selectListNameInputOnFocus,
} from "@/lib/list-default-name";
import { listIsMasterTemplate } from "@/lib/list-master";
import {
  MASTER_STORE_OPTIONS,
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
  EMPTY_HOME_LIST_ILLUSTRATION_SRC,
  homeListCardIconSrc,
  pickListProductIconForNewList,
  planOwnerListDecorIconUpdates,
} from "@/lib/list-product-icons";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import { ListSectionHeader } from "@/components/list_section_header";
import type { LoyaltyCardCodeType } from "@/lib/loyalty_card";
import {
  buildCalendarEntries,
  toIsoDate,
  dayEntryHasContent,
  type DayEntry,
} from "@/lib/calendar-utils";
import { useItemPhotoUrl } from "@/lib/item-photos";

type ListMembershipRow = { id?: string; instantUserId?: string };

/** Soort nieuw lijstje in create-modal (Figma 772:3065); bewaren gebruikt nu alleen `blank` in de DB. */
type NewListKind = "blank" | "from_master" | "master";

const HOME_NEW_LIST_FORM_ID = "home-new-list-form";

/** Native radio + SelectTile zodat FormData bij "Bewaren" altijd de echte tegelkeuze wéérgeeft (geen React-state drift). */
function NewListKindFormOption({
  value,
  defaultChecked,
  title,
  subtitle,
  icon,
}: {
  value: NewListKind;
  defaultChecked?: boolean;
  title: string;
  subtitle: string;
  icon?: React.ReactNode;
}) {
  return (
    <label className="flex w-full min-w-0 cursor-pointer items-center gap-3 rounded-md focus-within:outline-none focus-within:ring-2 focus-within:ring-border-focus focus-within:ring-offset-2">
      <input
        type="radio"
        name="newListKind"
        value={value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span
        className={cn(
          "inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-[var(--blue-200)] bg-[var(--white)] transition-colors",
          "peer-checked:border-action-primary peer-checked:[&>span]:opacity-100",
        )}
        aria-hidden
      >
        <span className="size-4 rounded-full border border-[var(--blue-100)] bg-action-primary opacity-0 transition-opacity" />
      </span>
      <SelectTile
        className="min-w-0 flex-1"
        title={title}
        subtitle={subtitle}
        icon={icon}
      />
    </label>
  );
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
  /** Winkellogo-URL's (1-2) voor kaartbadge bij displayVariant "from-master". */
  storeLogos: string[];
  /** Master-template (niet: weeklijst met winkel-logo). */
  isMasterTemplate: boolean;
};

function itemCountLabel(count: number): string {
  return count === 1 ? "1 product" : `${count} producten`;
}

/** Telling op favorietenmastertegels (Figma 1148:8298). */
function favoriteCountLabel(count: number): string {
  return count === 1 ? "1 favoriet" : `${count} favorieten`;
}

type HomeLoyaltyCard = {
  id: string;
  cardName: string;
  logoSrc: string;
  codeType: LoyaltyCardCodeType;
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
function HomeLoyaltyCardTile({ card }: { card: HomeLoyaltyCard }) {
  return (
    <Link
      href="/klantenkaarten"
      className="block rounded-[8px] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
    >
      <div className="flex w-[120px] shrink-0 items-center rounded-[8px] border border-[var(--gray-100)] bg-[var(--white)] p-3 shadow-[0px_2px_8px_0px_rgba(0,0,0,0.06)] transition-colors [@media(hover:hover)]:hover:bg-[var(--gray-25)]">
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
    </Link>
  );
}

/** Figma 1156:10457 — sectie klantenkaarten op startpagina (swimlane). */
function HomeLoyaltyCardsSwimlane({ cards }: { cards: HomeLoyaltyCard[] }) {
  return (
    <div className="flex flex-col gap-4">
      <ListSectionHeader
        icon="card"
        label="Klantenkaarten"
        showNaarOverzicht
        naarOverzichtHref="/klantenkaarten"
      />
      {/* -mx + px: tegel-scroll loopt tot aan de schermrand, padding houdt eerste tegel op grid. */}
      <div
        className="-mx-[var(--space-4)] flex gap-3 overflow-x-auto px-[var(--space-4)] pb-1"
        // verberg scrollbar (visueel ongewenst op desktop)
        style={{ scrollbarWidth: "none" } as React.CSSProperties}
      >
        {cards.map((card) => (
          <HomeLoyaltyCardTile key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
}

/** Figma 1135:7448 — ingrediëntenfoto's variant (geen recept, enkel losse ingrediënten).
 *  Vult de beschikbare breedte op via ResizeObserver: meer slots op grotere schermen. */
function HomeCalendarIngredientPhotos({
  ingredients,
}: {
  ingredients: { name: string; quantity: string }[];
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

  const visiblePhotos = ingredients
    .slice(0, maxPhotos)
    .map((ing) => ({ name: ing.name, url: getPhotoUrl(ing.name) }));

  const overflowCount = Math.max(0, ingredients.length - maxPhotos);

  if (ingredients.length === 0) return null;

  return (
    <div ref={containerRef} className="flex min-w-0 flex-1 items-center justify-between">
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

/** Figma 1142:7467 / 1134:12682 — kalender-dagkaart op startpagina. */
function HomeCalendarCard({ isoDate, entry }: { isoDate: string; entry: DayEntry }) {
  const date = entry.date;
  const monthAbbr = date
    .toLocaleDateString("nl-NL", { month: "short" })
    .replace(".", "")
    .slice(0, 3)
    .toUpperCase();
  const dayNum = date.getDate();

  const firstMeal = entry.meals[0] ?? null;
  const hasOnlyLooseIngredients = firstMeal === null && entry.looseIngredients.length > 0;

  const href =
    firstMeal?.recipeId != null
      ? `/recepten/${firstMeal.recipeId}`
      : `/kalender?date=${isoDate}`;

  return (
    <Link
      href={href}
      className="block rounded-md no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 lg:max-w-[50%]"
    >
      <div className="flex w-full items-end gap-3 rounded-md bg-[var(--white)] px-3 py-3 shadow-drop">
        {/* Datumwidget */}
        <div className="flex size-10 shrink-0 flex-col items-center justify-center gap-px rounded-[4px] bg-[var(--blue-25)] px-2 py-1">
          <p className="text-[8px] font-semibold leading-none text-[var(--blue-500)]">
            {monthAbbr}
          </p>
          <p className="text-[18px] font-bold leading-none text-[var(--gray-900)]">
            {dayNum}
          </p>
        </div>

        {hasOnlyLooseIngredients ? (
          /* Figma 1135:7448: rij van ingrediëntenfoto's met overflow */
          <HomeCalendarIngredientPhotos ingredients={entry.looseIngredients} />
        ) : (
          /* Recept: naam + aantal + foto */
          <>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="truncate text-base font-medium leading-6 text-[var(--gray-900)]">
                {firstMeal?.recipeName ?? ""}
              </p>
              <p className="text-xs leading-5 text-[var(--gray-400)]">
                {firstMeal?.ingredientCount === 1
                  ? "1 ingrediënt"
                  : `${firstMeal?.ingredientCount ?? 0} ingrediënten`}
              </p>
            </div>
            {firstMeal?.photoUrl ? (
              <div className="relative size-10 shrink-0 overflow-hidden rounded-full">
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
            ) : null}
          </>
        )}
      </div>
    </Link>
  );
}

/** Figma 1142:7467 — kalender-sectie op startpagina (alleen bij content vandaag of toekomst). */
function HomeCalendarSection({
  entries,
}: {
  entries: Array<{ isoDate: string; entry: DayEntry }>;
}) {
  return (
    <div className="flex flex-col gap-4">
      <ListSectionHeader
        icon="calendar"
        label="Kalender"
        showNaarOverzicht
        naarOverzichtHref="/kalender"
      />
      <div className="flex flex-col gap-3">
        {entries.map(({ isoDate, entry }) => (
          <HomeCalendarCard key={isoDate} isoDate={isoDate} entry={entry} />
        ))}
      </div>
    </div>
  );
}

/** Startpagina: alleen tikken om te openen; volgorde/verwijderen op `/lijstjes-beheren/lijstjes` of `/lijstjes-beheren/favorieten`. */
function HomeStaticListSections({
  lists,
  addingId,
  addingIdExpanded,
  onStartFromMaster,
}: {
  lists: HomeList[];
  addingId: string | null;
  addingIdExpanded: boolean;
  onStartFromMaster: (id: string) => void;
}) {
  const router = useRouter();

  const normalLists = lists.filter((l) => l.displayVariant !== "master");
  const masterLists = lists.filter((l) => l.displayVariant === "master");
  const visibleNormalLists = normalLists.slice(0, 3);
  const visibleMasterLists = masterLists.slice(0, 3);

  const rowWrapperClass = (isAddingCollapsed: boolean, index: number, len: number) =>
    cn(
      "overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out",
      isAddingCollapsed
        ? "mb-0 max-h-0 opacity-0"
        : "max-h-[200px] opacity-100",
      !isAddingCollapsed && (index < len - 1 ? "mb-3" : "mb-0"),
    );

  const cardFor = (list: HomeList) => (
    <ListCard
      listName={list.name}
      itemCount={
        list.displayVariant === "master"
          ? favoriteCountLabel(list.items?.length ?? 0)
          : itemCountLabel(list.items?.length ?? 0)
      }
      displayVariant={list.displayVariant}
      storeLogos={list.storeLogos}
      sharedWithFirstName={list.sharedWithFirstName ?? undefined}
      icon={
        // eslint-disable-next-line @next/next/no-img-element -- lokale webp
        <img
          src={homeListCardIconSrc(list)}
          alt=""
          width={48}
          height={48}
          decoding="async"
          className="object-contain"
        />
      }
      state="default"
      onMasterAdd={
        list.displayVariant === "master"
          ? () => onStartFromMaster(list.id)
          : undefined
      }
      className="cursor-pointer"
    />
  );

  return (
    <div className="flex flex-col">
      {normalLists.length > 0 ? (
        <div className="flex flex-col">
          <ListSectionHeader
            icon="list"
            label="Lijstjes"
            showNaarOverzicht={normalLists.length > 3}
            naarOverzichtHref="/lijstjes-beheren/lijstjes"
          />
          <div className="mt-4 flex flex-col">
            {visibleNormalLists.map((list, index) => {
              const isAdding = addingId === list.id;
              const isAddingCollapsed = isAdding && !addingIdExpanded;
              return (
                <div
                  key={list.id}
                  className={rowWrapperClass(
                    isAddingCollapsed,
                    index,
                    visibleNormalLists.length,
                  )}
                >
                  <Link
                    href={`/lijstje/${list.id}`}
                    className="block no-underline"
                  >
                    {cardFor(list)}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {masterLists.length > 0 ? (
        <div
          className={cn(
            "flex flex-col",
            normalLists.length > 0 ? "mt-10" : undefined,
          )}
        >
          <ListSectionHeader
            icon="heart"
            label="Favorieten lijstjes"
            showNaarOverzicht
            naarOverzichtHref="/lijstjes-beheren/favorieten"
          />
          <div className="mt-4 flex flex-col">
            {visibleMasterLists.map((list, index) => {
              const isAdding = addingId === list.id;
              const isAddingCollapsed = isAdding && !addingIdExpanded;
              return (
                <div
                  key={list.id}
                  className={rowWrapperClass(
                    isAddingCollapsed,
                    index,
                    visibleMasterLists.length,
                  )}
                >
                  <div
                    role="link"
                    tabIndex={0}
                    className="block cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
                    onClick={(e) => {
                      if ((e.target as HTMLElement).closest("button")) return;
                      router.push(`/lijstje/${list.id}`);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        if ((e.target as HTMLElement).closest("button")) return;
                        e.preventDefault();
                        router.push(`/lijstje/${list.id}`);
                      }
                    }}
                  >
                    {cardFor(list)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
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
      $: { where: { ownerId } },
    },
    recipes: {},
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

  const lists: HomeList[] = React.useMemo(() => {
    const owned: HomeList[] = (data?.lists ?? []).map((l) => {
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
      const isFromMaster = !isMaster && effectiveStoreIcon.length > 0;
      return {
        id: l.id,
        name: l.name,
        date: l.date,
        icon: l.icon,
        order: l.order,
        items: l.items ?? [],
        isOwner: true,
        membershipIds: (l.memberships ?? []).map((m) => m.id),
        displayVariant: isMaster
          ? "master"
          : hasOtherMembers
            ? "shared"
            : isFromMaster
              ? "from-master"
              : "default",
        storeLogos: isFromMaster ? storeLogosFromListIcon(effectiveStoreIcon) : [],
        sharedWithFirstName: isMaster ? null : hasOtherMembers ? sharedName : null,
        isMasterTemplate: isMaster,
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
        const isFromMaster = !isMaster && effectiveStoreIcon2.length > 0;
        return {
          id: l.id,
          name: l.name,
          date: l.date,
          icon: l.icon,
          order: l.order,
          items: l.items ?? [],
          isOwner: false,
          displayVariant: isMaster
            ? ("master" as const)
            : isFromMaster
              ? ("from-master" as const)
              : ("shared" as const),
          sharedWithFirstName: isMaster || isFromMaster ? null : ownerFirst,
          storeLogos: isFromMaster ? storeLogosFromListIcon(effectiveStoreIcon2) : [],
          isMasterTemplate: isMaster,
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
  }, [data, user?.id, shareFirstNameByUserId]);

  /** Klantenkaarten voor de swimlane op de startpagina: afgeleid van winkelicons (zelfde logica als /klantenkaarten). */
  const homeLoyaltyCards: HomeLoyaltyCard[] = React.useMemo(() => {
    const seenId = new Set<string>();
    const raw: HomeLoyaltyCard[] = [];

    const push = (
      c: { id: string; codeType?: unknown },
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
  const homeCalendarEntries = React.useMemo(() => {
    if (!data) return [] as Array<{ isoDate: string; entry: DayEntry }>;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = toIsoDate(today);

    const calMap = buildCalendarEntries(
      (data.lists ?? []) as Parameters<typeof buildCalendarEntries>[0],
      ((data as Record<string, unknown>).recipes ?? []) as Parameters<typeof buildCalendarEntries>[1],
    );

    const result: Array<{ isoDate: string; entry: DayEntry }> = [];
    for (const [iso, entry] of Array.from(calMap.entries())) {
      if (iso >= todayIso && dayEntryHasContent(entry)) {
        result.push({ isoDate: iso, entry });
      }
    }
    result.sort((a, b) => a.isoDate.localeCompare(b.isoDate));
    return result;
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
        isMasterTemplate: listIsMasterTemplate(l),
      })),
    );
    if (plans.length === 0) return;
    void db.transact(
      plans.map((p) => db.tx.lists[p.listId].update({ icon: p.nextIcon })),
    );
  }, [user?.id, authLoading, isLoading, data?.lists]);

  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [newListName, setNewListName] = React.useState("");
  const [quickMasterListName, setQuickMasterListName] = React.useState("");
  const [quickMasterId, setQuickMasterId] = React.useState<string | null>(null);
  const [isQuickMasterModalOpen, setIsQuickMasterModalOpen] = React.useState(false);
  /** Nieuwe key bij elke modal-open: remount van het formulier zodat radio’s terug naar default staan. */
  const [newListFormKey, setNewListFormKey] = React.useState(0);
  const [addingId, setAddingId] = React.useState<string | null>(null);
  const [addingIdExpanded, setAddingIdExpanded] = React.useState(false);

  const hasLists = lists.length > 0;

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

  const handleCloseCreateModal = React.useCallback(() => {
    setIsCreateModalOpen(false);
    setNewListName("");
  }, []);

  const handleOpenCreateModal = () => {
    setNewListName(defaultNewListName());
    setNewListFormKey((k) => k + 1);
    setIsCreateModalOpen(true);
  };

  const handleCloseQuickMasterModal = React.useCallback(() => {
    setIsQuickMasterModalOpen(false);
    setQuickMasterId(null);
    setQuickMasterListName("");
  }, []);

  const handleStartFromMaster = React.useCallback((masterId: string) => {
    setQuickMasterId(masterId);
    setQuickMasterListName(defaultNewListName());
    setIsQuickMasterModalOpen(true);
  }, []);

  const handleQuickMasterSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!quickMasterId) return;
      const name = quickMasterListName.trim();
      if (!name) return;
      router.push(
        `/nieuw-lijstje/selecteer-master-lijstje/${encodeURIComponent(
          quickMasterId,
        )}/items?naam=${encodeURIComponent(name)}`,
      );
      handleCloseQuickMasterModal();
    },
    [handleCloseQuickMasterModal, quickMasterId, quickMasterListName, router],
  );

  const handleNewListFormSubmit = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!user) return;
      const fd = new FormData(event.currentTarget);
      const name = String(fd.get("newListName") ?? "").trim();
      if (!name) return;
      const rawKind = fd.get("newListKind");
      const kind: NewListKind =
        rawKind === "from_master" || rawKind === "master" || rawKind === "blank"
          ? rawKind
          : "blank";

      if (kind === "from_master") {
        router.push(
          `/nieuw-lijstje/selecteer-master-lijstje?naam=${encodeURIComponent(
            name,
          )}`,
        );
        handleCloseCreateModal();
        return;
      }
      if (kind === "master") {
        router.push(
          `/nieuw-lijstje/selecteer-winkel?naam=${encodeURIComponent(name)}`,
        );
        handleCloseCreateModal();
        return;
      }

      const listName = name;
      const icon = pickListProductIconForNewList(lists);
      const now = new Date();
      const newId = iid();
      db.transact(
        db.tx.lists[newId].update({
          name: listName,
          date: now.toLocaleDateString("nl-NL"),
          icon,
          order:
            lists.length > 0 ? Math.min(...lists.map((l) => l.order)) - 1 : 0,
          ownerId: user.id,
          isMasterTemplate: false,
        }),
      );
      setAddingId(newId);
      handleCloseCreateModal();
    },
    [user, lists, router, handleCloseCreateModal],
  );

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
    <div className="relative flex min-h-dvh w-full flex-col px-[var(--space-4)]">
      <div className="flex flex-1 flex-col pb-[calc(195px+env(safe-area-inset-bottom,0px))] pt-[calc(var(--space-4)+env(safe-area-inset-top,0px))]">
        <div className="mx-auto flex w-full max-w-[956px] flex-1 flex-col">
          {!hasLists ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-6">
              <div className="relative size-24 overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element -- lokale webp */}
                <img
                  src={EMPTY_HOME_LIST_ILLUSTRATION_SRC}
                  alt=""
                  width={96}
                  height={96}
                  decoding="async"
                  className="object-contain"
                />
              </div>
              <p className="text-center text-base font-medium leading-24 text-[var(--text-secondary)]">
                Je hebt nog geen lijstjes
              </p>
              <MiniButton variant="primary" onClick={handleOpenCreateModal}>
                Voeg lijstje toe
              </MiniButton>
            </div>
          ) : (
            <HomeStaticListSections
              lists={lists}
              addingId={addingId}
              addingIdExpanded={addingIdExpanded}
              onStartFromMaster={handleStartFromMaster}
            />
          )}
          {homeCalendarEntries.length > 0 ? (
            <div className="mt-10">
              <HomeCalendarSection entries={homeCalendarEntries} />
            </div>
          ) : null}
          {homeLoyaltyCards.length > 0 ? (
            <div className="mt-10">
              <HomeLoyaltyCardsSwimlane cards={homeLoyaltyCards} />
            </div>
          ) : null}
        </div>
      </div>

      {/* Slide-in: Nieuw lijstje (472:2235, 772:3065); master → fullscreen winkelkeuze (794:3317) */}
      <SlideInModal
        open={isCreateModalOpen}
        onClose={handleCloseCreateModal}
        title="Nieuw lijstje"
        footer={
          <Button
            type="submit"
            form={HOME_NEW_LIST_FORM_ID}
            variant="primary"
            disabled={!newListName.trim()}
          >
            Bewaren
          </Button>
        }
      >
        <form
          id={HOME_NEW_LIST_FORM_ID}
          key={newListFormKey}
          onSubmit={handleNewListFormSubmit}
          className="flex w-full flex-col items-center gap-8"
        >
          <InputField
            label="Naam lijstje"
            placeholder="Naam lijstje"
            name="newListName"
            value={newListName}
            autoComplete="off"
            onChange={(e) => setNewListName(e.target.value)}
            onFocus={selectListNameInputOnFocus}
          />
          <div
            role="radiogroup"
            aria-label="Soort lijstje"
            className="flex w-full flex-col gap-4"
          >
            <NewListKindFormOption
              value="blank"
              defaultChecked
              title="Lijstje"
              subtitle="Nieuw blanco lijstje"
            />
            <NewListKindFormOption
              value="from_master"
              title="Lijstje van favoriet"
              subtitle="Vertrek van een favorietenlijst (geen winkel kiezen)"
              icon={<IconPrimaryMask src="/icons/list-from-master-list.svg" />}
            />
            <NewListKindFormOption
              value="master"
              title="Favorieten lijstje"
              subtitle="Nieuwe template: eerst winkel kiezen"
              icon={<IconPrimaryMask src="/icons/master-list.svg" />}
            />
          </div>
        </form>
      </SlideInModal>

      <SlideInModal
        open={isQuickMasterModalOpen}
        onClose={handleCloseQuickMasterModal}
        title="Naam lijstje"
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
          "pointer-events-none fixed inset-x-0 z-20",
          APP_FAB_BOTTOM_CLASS,
        )}
      >
        <div className="px-[var(--space-4)]">
          <div className="mx-auto flex w-full max-w-[956px] justify-end">
            <FloatingActionButton
              aria-label="Nieuw lijstje"
              className="pointer-events-auto"
              onClick={handleOpenCreateModal}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
