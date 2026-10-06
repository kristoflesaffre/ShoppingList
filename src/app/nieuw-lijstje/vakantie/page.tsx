"use client";

import * as React from "react";
import { TitleEditButton } from "@/components/ui/title_edit_button";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { FloatingActionButton } from "@/components/ui/floating_action_button";
import { ItemCard } from "@/components/ui/item_card";
import { MiniButton } from "@/components/ui/mini_button";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import { StoreSelectionTile } from "@/components/ui/store_selection_tile";
import { TabElement } from "@/components/ui/tab_element";
import { TabGroup } from "@/components/ui/tab_group";
import { Button } from "@/components/ui/button";
import { InputField } from "@/components/ui/input_field";
import { PageBackButton } from "@/components/ui/page_back_button";
import { db } from "@/lib/db";
import { defaultVakantieListName } from "@/lib/list-default-name";
import { pickListProductIconForNewList } from "@/lib/list-product-icons";
import { buildVacationDefaultItems } from "@/lib/vacation-default-items";
import { cn } from "@/lib/utils";

const VACATION_ICON = "/images/ui/vakantie_160.webp";

type OptionValue =
  | "winter"
  | "zomer"
  | "man"
  | "vrouw"
  | "jongens"
  | "meisjes"
  | "auto"
  | "vliegtuig"
  | "hotel"
  | "appartement";

type Option = {
  value: OptionValue;
  label: string;
  imageSrc: string;
};

type TransportValue = "auto" | "vliegtuig";
type AccommodationValue = "hotel" | "appartement";
type VacationTabValue = "voor-vertrek" | "samen" | "kristof" | "chloe" | "noe";

type VacationChecklistItem = {
  name: string;
  imageSrc: string;
  kind?: "claim" | "check";
};

type ListRow = {
  id: string;
  name: string;
  icon: string;
  order: number;
};

type ListIconImageRow = {
  id: string;
  imageDataUrl: string;
};

const SEASON_OPTIONS: Option[] = [
  { value: "winter", label: "Winter", imageSrc: "/images/ui/winter_160.webp" },
  { value: "zomer", label: "Zomer", imageSrc: "/images/ui/zomer_160.webp" },
];

const HOUSEHOLD_OPTIONS: Option[] = [
  { value: "man", label: "Man", imageSrc: "/images/ui/man_160.webp" },
  { value: "vrouw", label: "Vrouw", imageSrc: "/images/ui/vrouw_160.webp" },
  { value: "jongens", label: "Jongen(s)", imageSrc: "/images/ui/jongen_160.webp" },
  { value: "meisjes", label: "Meisje(s)", imageSrc: "/images/ui/meisje_160.webp" },
];

const TRANSPORT_OPTIONS: Option[] = [
  { value: "auto", label: "Auto", imageSrc: "/images/ui/auto_160.webp" },
  { value: "vliegtuig", label: "Vliegtuig", imageSrc: "/images/ui/vliegtuig_160.webp" },
];

const ACCOMMODATION_OPTIONS: Option[] = [
  { value: "hotel", label: "Hotel", imageSrc: "/images/ui/hotel_160.webp" },
  { value: "appartement", label: "Appartement", imageSrc: "/images/ui/appartement_160.webp" },
];

const COMMON_PRE_DEPARTURE_ITEMS: VacationChecklistItem[] = [
  {
    name: "Puddy verzorgen",
    imageSrc: "/images/vakantie/puddy_160.webp",
    kind: "claim",
  },
  {
    name: "Planten water geven",
    imageSrc: "/images/vakantie/planten_water_geven_160.webp",
  },
  {
    name: "Waterbak Puddy bijvullen",
    imageSrc: "/images/vakantie/waterbak_160.webp",
  },
  {
    name: "Kattenbak leegscheppen",
    imageSrc: "/images/vakantie/kattenbak_160.webp",
  },
  {
    name: "Kattenkorrels aanvullen",
    imageSrc: "/images/vakantie/kattekorrels_160.webp",
  },
  { name: "Vaccinatie regelen", imageSrc: "/images/vakantie/vaccin_160.webp" },
  { name: "Paspoort regelen", imageSrc: "/images/vakantie/paspoort_160.webp" },
  {
    name: "Kids ID regelen",
    imageSrc: "/images/vakantie/identiteitskaart_kind_160.webp",
  },
];

const AUTO_PRE_DEPARTURE_ITEMS: VacationChecklistItem[] = [
  ...COMMON_PRE_DEPARTURE_ITEMS,
  { name: "Autovignet aanvragen", imageSrc: "/images/vakantie/autovignet_160.webp" },
  { name: "Auto opladen/voltanken", imageSrc: "/images/vakantie/auto_160.webp" },
  {
    name: "Bandenspanning controleren",
    imageSrc: "/images/vakantie/band_160.webp",
  },
  { name: "EV-route plannen", imageSrc: "/images/vakantie/laadpaal_160.webp" },
  { name: "Laadpas regelen", imageSrc: "/images/vakantie/laadpas_160.webp" },
  {
    name: "Medicatievoorraad aanvullen",
    imageSrc: "/images/vakantie/medicatie_160.webp",
  },
  { name: "Huissleutel afgeven", imageSrc: "/images/vakantie/huissleutel_160.webp" },
  { name: "Tablet opladen", imageSrc: "/images/vakantie/tablet_160.webp" },
  {
    name: "Medicatie reisziekte innemen",
    imageSrc: "/images/vakantie/medicatie_reisziekte_160.webp",
  },
];

const FLIGHT_PRE_DEPARTURE_ITEMS: VacationChecklistItem[] = [
  ...COMMON_PRE_DEPARTURE_ITEMS,
  {
    name: "Boardingpassen downloaden",
    imageSrc: "/images/vakantie/boarding_pass_160.webp",
  },
  {
    name: "Vervoer luchthaven regelen",
    imageSrc: "/images/vakantie/luchthavenvervoer_160.webp",
  },
  {
    name: "Medicatievoorraad aanvullen",
    imageSrc: "/images/vakantie/medicatie_160.webp",
  },
  { name: "Huissleutel afgeven", imageSrc: "/images/vakantie/huissleutel_160.webp" },
  { name: "Tablet opladen", imageSrc: "/images/vakantie/tablet_160.webp" },
];

function computeVacationTabs(
  household: Set<OptionValue>,
): { value: VacationTabValue; label: string }[] {
  const tabs: { value: VacationTabValue; label: string }[] = [
    { value: "voor-vertrek", label: "Voor vertrek" },
    { value: "samen", label: "Samen" },
  ];
  if (household.has("man")) tabs.push({ value: "kristof", label: "Kristof" });
  if (household.has("vrouw")) tabs.push({ value: "chloe", label: "Chloé" });
  if (household.has("jongens") || household.has("meisjes"))
    tabs.push({ value: "noe", label: "Noë" });
  return tabs;
}

function BackArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M3.59377 12.31C3.60777 12.329 3.61477 12.351 3.63177 12.368L9.23178 17.968C9.33378 18.069 9.46678 18.119 9.59978 18.119C9.73278 18.119 9.86678 18.068 9.96778 17.968C10.1698 17.765 10.1698 17.435 9.96778 17.232L5.25578 12.521L19.9998 12.521C20.2868 12.521 20.5198 12.288 20.5198 12.001C20.5198 11.714 20.2868 11.48 19.9998 11.48L5.25477 11.48L9.96678 6.768C10.1688 6.565 10.1688 6.236 9.96577 6.033C9.76477 5.83 9.43378 5.83 9.23078 6.033L3.63078 11.633C3.61378 11.65 3.60577 11.673 3.59177 11.692C3.56477 11.727 3.53678 11.76 3.51978 11.801C3.46677 11.929 3.46677 12.072 3.51978 12.2C3.53778 12.241 3.56677 12.275 3.59377 12.31Z"
        fill="currentColor"
      />
    </svg>
  );
}

function MaskIcon({
  src,
  className,
}: {
  src: string;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block size-6 shrink-0 bg-current", className)}
      style={{
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
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

function VacationItemImage({ src }: { src: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- vaste itembeelden uit /public/images/vakantie
    <img
      src={src}
      alt=""
      width={44}
      height={44}
      className="size-11 object-cover"
      aria-hidden
      decoding="async"
    />
  );
}

/** Canvas «10 · vakantie — voorstel»: compacte keuzetegel (illustratie · naam · keuzerondje). */
function VacationOptionTile({
  option,
  selected,
  multiple,
  onClick,
}: {
  option: Option;
  selected: boolean;
  multiple?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role={multiple ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex h-[58px] min-w-0 items-center gap-1 rounded-[16px] pl-1.5 pr-2.5 text-left transition-[background-color,box-shadow] duration-fast ease-out-strong motion-safe:active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
        selected
          ? "bg-[var(--blue-25)] shadow-[inset_0_0_0_2px_var(--blue-500)]"
          : "bg-[var(--gray-25)] [@media(hover:hover)]:hover:bg-[var(--gray-50)]",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- lokale illustratie */}
      <img src={option.imageSrc} alt="" width={34} height={34} className="size-[34px] shrink-0 object-contain" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">{option.label}</span>
      {/* Canvas: keuzerondje rechts, verticaal gecentreerd (leeg of blauw met vinkje). */}
      {selected ? (
        <span className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-[var(--blue-500)] text-[var(--white)] motion-safe:animate-pop" aria-hidden>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
      ) : (
        <span className="size-[18px] shrink-0 rounded-full shadow-[inset_0_0_0_1.5px_var(--blue-200)]" aria-hidden />
      )}
    </button>
  );
}

function VacationTopBar({
  title,
  onBack,
  showActions = false,
}: {
  title: string;
  onBack?: () => void;
  showActions?: boolean;
}) {
  const backControl = onBack ? (
    <button
      type="button"
      aria-label="Terug"
      onClick={onBack}
      className="flex size-10 items-center justify-start text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
    >
      <BackArrowIcon className="size-6" />
    </button>
  ) : (
    <Link
      href="/"
      aria-label="Terug"
      className="flex size-10 items-center justify-start text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
    >
      <BackArrowIcon className="size-6" />
    </Link>
  );

  return (
    <header className="flex shrink-0 flex-col bg-white pt-[env(safe-area-inset-top,0px)]">
      <div
        className={cn(
          "grid h-16 items-center gap-4 px-4",
          showActions ? "grid-cols-[40px_1fr_64px]" : "grid-cols-[40px_1fr_40px]",
        )}
      >
        {backControl}
        <h1 className="min-w-0 text-center text-base font-medium leading-24 tracking-normal text-[var(--text-primary)]">
          {title}
        </h1>
        {showActions ? (
          <div className="flex items-center justify-end gap-4 text-[var(--blue-500)]">
            <button
              type="button"
              aria-label="Persoon toevoegen"
              className="flex size-6 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
            >
              <MaskIcon src="/icons/add_person.svg" />
            </button>
            <button
              type="button"
              aria-label="Meer opties"
              className="flex size-6 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
            >
              <MaskIcon src="/icons/dots.svg" />
            </button>
          </div>
        ) : (
          <span aria-hidden />
        )}
      </div>
    </header>
  );
}

function VacationListHeader() {
  return (
    <div className="flex w-full items-start gap-4">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2">
          <h2 className="text-page-title font-bold leading-32 tracking-normal text-[var(--text-primary)]">
            Vakantie
          </h2>
          <TitleEditButton aria-label="Naam wijzigen" />
        </div>
        <div className="flex w-full items-center gap-1">
          <span className="flex size-4 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--gray-100)]">
            <span className="size-2 rounded-full bg-[var(--secondary-600)]" />
          </span>
          <p className="min-w-0 flex-1 truncate text-xs font-normal leading-16 tracking-normal text-[var(--gray-400)]">
            Gedeeld met Chloé
          </p>
        </div>
      </div>
      <div className="flex shrink-0 overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border-subtle)]">
        <button
          type="button"
          aria-label="Lijstweergave"
          className="flex size-8 items-center justify-center bg-white text-[var(--blue-300)]"
        >
          <MaskIcon src="/icons/toggle_list.svg" />
        </button>
        <span className="h-8 w-px bg-[var(--border-subtle)]" aria-hidden />
        <button
          type="button"
          aria-label="Gridweergave"
          className="flex size-8 items-center justify-center bg-[var(--blue-25)] text-[var(--blue-500)]"
        >
          <MaskIcon src="/icons/toggle_grid.svg" />
        </button>
      </div>
    </div>
  );
}

function ClaimableVacationItem({ item }: { item: VacationChecklistItem }) {
  return (
    <div className="flex min-h-[68px] w-full items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-white py-3 pl-4 pr-3">
      <div className="relative size-11 shrink-0 overflow-hidden rounded-[var(--radius-md)]">
        <VacationItemImage src={item.imageSrc} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="w-full truncate text-base font-medium leading-24 tracking-normal text-[var(--text-primary)]">
          {item.name}
        </p>
        <p className="w-full truncate text-sm font-normal leading-20 tracking-normal text-[var(--gray-400)]">
          Niemand gekozen
        </p>
      </div>
      <MiniButton type="button">Kies</MiniButton>
    </div>
  );
}

function VacationChecklist({ transport }: { transport: TransportValue }) {
  const items =
    transport === "auto" ? AUTO_PRE_DEPARTURE_ITEMS : FLIGHT_PRE_DEPARTURE_ITEMS;

  return (
    <div className="flex w-full flex-col gap-4">
      <h3 className="text-section-title font-bold leading-24 tracking-normal text-[var(--blue-900)]">
        Te regelen
      </h3>
      <div className="flex w-full flex-col gap-3">
        {items.map((item) =>
          item.kind === "claim" ? (
            <ClaimableVacationItem key={item.name} item={item} />
          ) : (
            <ItemCard
              key={item.name}
              itemName={item.name}
              itemThumbnail={<VacationItemImage src={item.imageSrc} />}
            />
          ),
        )}
      </div>
    </div>
  );
}

function VacationChecklistStep({
  transport,
  household,
  onBack,
}: {
  transport: TransportValue;
  household: Set<OptionValue>;
  onBack: () => void;
}) {
  const vacationTabs = React.useMemo(
    () => computeVacationTabs(household),
    [household],
  );
  const [activeTab, setActiveTab] =
    React.useState<VacationTabValue>("voor-vertrek");

  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-[390px] flex-col">
      <VacationTopBar title="Vakantie" onBack={onBack} showActions />
      <div className="relative flex flex-1 flex-col gap-6 overflow-hidden px-4 pb-[calc(120px+env(safe-area-inset-bottom,0px))] pt-8">
        <div className="relative z-[1] flex flex-col gap-6">
          <VacationListHeader />
          <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <TabGroup
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as VacationTabValue)}
              aria-label="Vakantielijst tabs"
              className="min-w-max"
            >
              {vacationTabs.map((tab) => (
                <TabElement key={tab.value} value={tab.value}>
                  {tab.label}
                </TabElement>
              ))}
            </TabGroup>
          </div>

          {activeTab === "voor-vertrek" ? (
            <VacationChecklist transport={transport} />
          ) : (
            <div className="min-h-[220px]" />
          )}
        </div>
      </div>
      <FloatingActionButton className="fixed bottom-[calc(45px+env(safe-area-inset-bottom,0px))] right-6 z-10" />
    </main>
  );
}

function OptionSection({
  title,
  options,
  selectedValues,
  onToggle,
  multiple = false,
}: {
  title: string;
  options: Option[];
  selectedValues: Set<OptionValue>;
  onToggle: (value: OptionValue) => void;
  multiple?: boolean;
}) {
  return (
    <section className="rounded-[20px] bg-[var(--white)] p-3 shadow-[0_1px_2px_rgba(16,17,48,0.04)]">
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-bold text-[var(--text-primary)]">{title}</h2>
        <span className="text-xs text-[var(--text-tertiary)]">{multiple ? "meerdere mogelijk" : "kies één"}</span>
      </div>
      <div role={multiple ? "group" : "radiogroup"} aria-label={title} className="grid w-full grid-cols-2 gap-1.5">
        {options.map((option) => (
          <VacationOptionTile
            key={option.value}
            option={option}
            selected={selectedValues.has(option.value)}
            multiple={multiple}
            onClick={() => onToggle(option.value)}
          />
        ))}
      </div>
    </section>
  );
}

export default function NieuwVakantielijstjePage() {
  const router = useRouter();
  const { isLoading: authLoading, user } = db.useAuth();
  const ownerId = user?.id ?? "__no_user__";
  const { isLoading, error, data } = db.useQuery({
    lists: {
      $: { where: { ownerId } },
    },
    listIconImages: {
      $: { where: { ownerId } },
    },
  });
  const [season, setSeason] = React.useState<OptionValue | null>(null);
  const [household, setHousehold] = React.useState<Set<OptionValue>>(
    () => new Set(),
  );
  const [transport, setTransport] = React.useState<TransportValue | null>(null);
  const [accommodation, setAccommodation] = React.useState<AccommodationValue | null>(null);
  const [vacationName, setVacationName] = React.useState("");
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, router, user]);

  const lists = React.useMemo<ListRow[]>(() => {
    return (data?.lists ?? []).map((list: any) => ({
      id: String(list.id),
      name: String(list.name ?? ""),
      icon: String(list.icon ?? ""),
      order: typeof list.order === "number" ? list.order : 0,
    }));
  }, [data?.lists]);

  const savedListIconImages = React.useMemo<ListIconImageRow[]>(() => {
    return (data?.listIconImages ?? [])
      .filter((row: any) => typeof row.id === "string")
      .map((row: any) => ({
        id: String(row.id),
        imageDataUrl: String(row.imageDataUrl ?? ""),
      }));
  }, [data?.listIconImages]);

  const canContinue =
    season != null && household.size > 0 && transport != null && accommodation != null && !isSaving;

  const saveVacationList = React.useCallback(async () => {
    if (!user || !transport || !accommodation || !canContinue) return;

    setIsSaving(true);
    try {
      const typedListName = vacationName.trim();
      const listName =
        typedListName || defaultVakantieListName(lists.map((list) => list.name));
      const now = new Date();
      const nowIso = now.toISOString();
      const newId = iid();
      const existingIcon = savedListIconImages.find(
        (img) => img.imageDataUrl === VACATION_ICON,
      );
      const preDepartureItems =
        transport === "auto"
          ? AUTO_PRE_DEPARTURE_ITEMS
          : FLIGHT_PRE_DEPARTURE_ITEMS;
      const defaultItems = buildVacationDefaultItems({
        season: season as "zomer" | "winter",
        transport,
        accommodation,
        household,
        userEmail: user?.email ?? undefined,
      });

      const txs: Parameters<typeof db.transact>[0] = [
        db.tx.lists[newId].update({
          name: listName,
          date: now.toLocaleDateString("nl-NL"),
          icon: pickListProductIconForNewList(lists, listName),
          order:
            lists.length > 0 ? Math.min(...lists.map((l) => l.order)) - 1 : 0,
          ownerId: user.id,
          isMasterTemplate: false,
          customIconUrl: VACATION_ICON,
        }),
      ];

      let order = 0;

      preDepartureItems.forEach((item) => {
        txs.push(
          db.tx.items[iid()]
            .update({
              name: item.name,
              quantity: "",
              checked: false,
              section: "Voor vertrek",
              itemCategory: "Te regelen",
              order: order++,
            })
            .link({ list: newId }),
        );
      });

      defaultItems.forEach((item) => {
        txs.push(
          db.tx.items[iid()]
            .update({
              name: item.name,
              quantity: "",
              checked: false,
              section: item.tripPerson,
              tripPerson: item.tripPerson,
              itemCategory: item.itemCategory,
              order: order++,
            })
            .link({ list: newId }),
        );
      });

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
            imageDataUrl: VACATION_ICON,
            createdAtIso: nowIso,
            lastUsedAtIso: nowIso,
          }),
        );
      }

      await db.transact(txs);
      router.replace(`/lijstje/${newId}`);
    } finally {
      setIsSaving(false);
    }
  }, [
    canContinue,
    accommodation,
    household,
    lists,
    savedListIconImages,
    season,
    transport,
    user,
    vacationName,
  ]);

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

  const labelOf = (opts: Option[], v: OptionValue | null) => opts.find((o) => o.value === v)?.label;
  const summary = [
    labelOf(SEASON_OPTIONS, season),
    household.size > 0
      ? HOUSEHOLD_OPTIONS.filter((o) => household.has(o.value)).map((o) => o.label).join(", ")
      : null,
    labelOf(TRANSPORT_OPTIONS, transport),
    labelOf(ACCOMMODATION_OPTIONS, accommodation),
  ].filter(Boolean);
  const missing =
    (season ? 0 : 1) + (household.size > 0 ? 0 : 1) + (transport ? 0 : 1) + (accommodation ? 0 : 1);

  const nameCard = (
    <section className="rounded-[20px] bg-[var(--white)] p-3.5 shadow-[0_1px_2px_rgba(16,17,48,0.04)]">
      <InputField
        label="Naam"
        placeholder={defaultVakantieListName(lists.map((l) => l.name))}
        value={vacationName}
        onChange={(event) => setVacationName(event.target.value)}
        autoComplete="off"
      />
    </section>
  );
  const seasonCard = (
    <OptionSection
      title="Seizoen"
      options={SEASON_OPTIONS}
      selectedValues={season ? new Set([season]) : new Set()}
      onToggle={(value) => setSeason((current) => (current === value ? null : value))}
    />
  );
  const householdCard = (
    <OptionSection
      title="Wie gaat er mee?"
      multiple
      options={HOUSEHOLD_OPTIONS}
      selectedValues={household}
      onToggle={(value) =>
        setHousehold((current) => {
          const next = new Set(current);
          if (next.has(value)) next.delete(value);
          else next.add(value);
          return next;
        })
      }
    />
  );
  const transportCard = (
    <OptionSection
      title="Vervoer"
      options={TRANSPORT_OPTIONS}
      selectedValues={transport ? new Set([transport]) : new Set()}
      onToggle={(value) => setTransport((current) => (current === value ? null : (value as TransportValue)))}
    />
  );
  const accommodationCard = (
    <OptionSection
      title="Verblijf"
      options={ACCOMMODATION_OPTIONS}
      selectedValues={accommodation ? new Set([accommodation]) : new Set()}
      onToggle={(value) =>
        setAccommodation((current) => (current === value ? null : (value as AccommodationValue)))
      }
    />
  );

  return (
    <main className="relative flex min-h-dvh w-full flex-col bg-[var(--bg-app)] px-4">
      {/* Mobiel: topbalk met terugpijl; desktop: ronde terugknop naast de titel. */}
      <div className="fixed left-0 right-0 top-0 z-20 bg-[var(--bg-app)] pt-[env(safe-area-inset-top,0px)] lg:hidden">
        <header className="mx-auto flex h-16 max-w-[956px] items-center px-4">
          <Link
            href="/"
            aria-label="Terug"
            className="flex size-10 items-center justify-center rounded-full text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            <BackArrowIcon className="size-6" />
          </Link>
        </header>
      </div>

      <div className="mx-auto flex w-full max-w-[956px] flex-1 flex-col gap-3 pb-[calc(120px+env(safe-area-inset-bottom,0px))] pt-[calc(64px+8px+env(safe-area-inset-top,0px))] lg:gap-[14px] lg:pt-[calc(40px+env(safe-area-inset-top,0px))]">
        <div className="mb-1 flex items-center gap-3 lg:mb-1.5">
          <PageBackButton href="/" label="Terug" />
          <div>
            <h1 className="text-page-title font-bold leading-32 tracking-tight text-[var(--text-primary)]">Vakantielijstje</h1>
            <p className="mt-0.5 text-[13px] leading-[18px] text-[var(--text-secondary)]">
              Beantwoord 4 vragen, wij maken je paklijst
            </p>
          </div>
        </div>

        {/* Mobiel: één kolom; desktop: twee kolommen. */}
        <div className="flex flex-col gap-3 lg:hidden">
          {nameCard}
          {seasonCard}
          {householdCard}
          {transportCard}
          {accommodationCard}
        </div>
        <div className="hidden lg:grid lg:grid-cols-2 lg:items-start lg:gap-[14px]">
          <div className="flex flex-col gap-[14px]">
            {nameCard}
            {seasonCard}
            {transportCard}
          </div>
          <div className="flex flex-col gap-[14px]">
            {householdCard}
            {accommodationCard}
          </div>
        </div>
      </div>

      {/* Zwevende balk: samenvatting + «Maak paklijst» */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(24px+env(safe-area-inset-bottom,0px))] z-10 px-4">
        <div className="pointer-events-auto mx-auto flex w-full max-w-[520px] items-center gap-3 rounded-[22px] bg-[var(--white)] py-3 pl-4 pr-3 shadow-[0_14px_30px_-12px_rgba(16,17,48,0.35),0_0_0_1px_rgba(16,17,48,0.04)]">
          <div className="min-w-0 flex-1 leading-[18px]">
            <p className="text-[13px] font-bold text-[var(--text-primary)]">
              {missing === 0 ? "Klaar om te maken" : missing === 1 ? "Nog 1 vraag" : `Nog ${missing} vragen`}
            </p>
            <p className="truncate text-[12.5px] text-[var(--text-secondary)]">
              {summary.length > 0 ? summary.join(" · ") : "Kies seizoen, wie er mee gaat, vervoer en verblijf"}
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            size="md"
            disabled={!canContinue}
            onClick={saveVacationList}
            className="!w-auto shrink-0"
          >
            Maak paklijst
          </Button>
        </div>
      </div>
    </main>
  );
}
