"use client";

import * as React from "react";
import Link from "next/link";
import { id as iid } from "@instantdb/react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { RoundIconButton, RoundIcons } from "@/components/ui/round_icon_button";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { InputField } from "@/components/ui/input_field";
import { Button } from "@/components/ui/button";
import { deepRgb, mixWithWhiteRgb } from "@/lib/vaste-lijstjes";
import { fileToGiftPhotoDataUrl, uploadUserImageDataUrl } from "@/lib/image-storage";

/**
 * Kado-ideeën (canvas «Kado's met links»): elk idee is een link naar een webwinkel met foto, titel en
 * prijs uit de pagina (`/api/link-preview`), aangevuld door Gemini (`/api/link-preview/ai`: naam, omschrijving,
 * prijs, productfoto). Of zelf toevoegen met een foto (plakken uit het klembord of kiezen). Eerst om terug te
 * bekijken en de winkel te openen; afvinken («Gekocht») is bijzaak.
 */

export type KadoItem = {
  id: string;
  name: string;
  checked?: boolean;
  order?: number;
  linkUrl?: string | null;
  linkImage?: string | null;
  linkPrice?: string | null;
  linkStore?: string | null;
  note?: string | null;
  description?: string | null;
  claimedByInstantUserId?: string | null;
  claimedByDisplayName?: string | null;
};

type Rgb = [number, number, number];

type Preview = {
  url: string;
  store: string;
  title: string | null;
  image: string | null;
  price: string | null;
  blocked?: boolean;
};

/** Eerste http(s)-link in een tekst (plakken); ook «bol.com/…» zonder schema. */
export function findLink(text: string | null | undefined): string | null {
  if (!text) return null;
  const m =
    /https?:\/\/[^\s<>"']+/i.exec(text) ??
    /\b(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}\/[^\s<>"']*/i.exec(
      text,
    );
  if (!m) return null;
  const raw = m[0].replace(/[),.;]+$/, "");
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

export function storeOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

const STORE_COLORS: Rgb[] = [
  [214, 40, 40],
  [255, 105, 0],
  [0, 120, 200],
  [0, 0, 164],
  [47, 163, 107],
  [139, 108, 240],
  [229, 97, 138],
];

/** Vierkantje met de beginletter van de winkel (geen externe favicon-dienst). */
export function StoreChip({
  store,
  className,
}: {
  store: string;
  className?: string;
}) {
  const hash = Array.from(store).reduce(
    (h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0,
    7,
  );
  const c = STORE_COLORS[hash % STORE_COLORS.length];
  return (
    <span
      className={cn(
        "flex min-w-0 items-center gap-1.5 text-xs text-[var(--text-secondary)]",
        className,
      )}
    >
      <span
        className="flex size-4 shrink-0 items-center justify-center rounded-[5px] text-[9px] font-extrabold text-white"
        style={{ backgroundColor: `rgb(${c.join(",")})` }}
      >
        {store.charAt(0).toUpperCase()}
      </span>
      <span className="truncate">{store}</span>
    </span>
  );
}

const ExternalIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    className={className}
  >
    <path d="M14 5h5v5M19 5l-8 8M18 14v4a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h4" />
  </svg>
);
const LinkIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
    className={className}
  >
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  </svg>
);

/** Productfoto op een zachte tint; witte achtergronden van winkelfoto's vallen weg (multiply). */
export function KadoPhoto({
  item,
  color,
  className,
  emptyIcon,
}: {
  item: KadoItem;
  color: Rgb;
  className?: string;
  emptyIcon: string;
}) {
  const [failed, setFailed] = React.useState(false);
  const src = item.linkImage && !failed ? item.linkImage : null;
  return (
    <div
      className={cn(
        "relative flex items-center justify-center overflow-hidden",
        className,
      )}
      style={{ backgroundColor: mixWithWhiteRgb(color, 0.08) }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- externe winkelfoto, onbekende domeinen
        <img
          src={src}
          alt=""
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setFailed(true)}
          className="size-full object-contain p-[8%] mix-blend-multiply"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- lokale illustratie
        <img
          src={emptyIcon}
          alt=""
          className="size-1/2 object-contain opacity-60"
        />
      )}
    </div>
  );
}

export function ClaimBadge({
  item,
  userId,
}: {
  item: KadoItem;
  userId: string;
}) {
  if (!item.claimedByInstantUserId) return null;
  const mine = item.claimedByInstantUserId === userId;
  return (
    <span className="inline-flex h-[26px] items-center rounded-pill bg-[var(--white)] px-2.5 text-[11.5px] font-bold text-text-primary shadow-[0_1px_3px_rgba(16,17,48,0.12)]">
      {mine ? "Ik koop dit" : `${item.claimedByDisplayName || "Iemand"} koopt`}
    </span>
  );
}

const GripIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <circle cx="9" cy="6" r="1.5" />
    <circle cx="15" cy="6" r="1.5" />
    <circle cx="9" cy="12" r="1.5" />
    <circle cx="15" cy="12" r="1.5" />
    <circle cx="9" cy="18" r="1.5" />
    <circle cx="15" cy="18" r="1.5" />
  </svg>
);

function KadoCard({
  item,
  listId,
  color,
  userId,
  emptyIcon,
  editing,
  onDelete,
  dragHandle,
}: {
  item: KadoItem;
  listId: string;
  color: Rgb;
  userId: string;
  emptyIcon: string;
  /** Bewerkmodus: geen link, wel een greepje (slepen) en een rode ronde vuilbak. */
  editing?: boolean;
  onDelete?: () => void;
  dragHandle?: React.ButtonHTMLAttributes<HTMLButtonElement>;
}) {
  const store = item.linkStore || storeOf(item.linkUrl);
  const body = (
    <>
      <KadoPhoto
        item={item}
        color={color}
        emptyIcon={emptyIcon}
        className="aspect-square rounded-[18px]"
      />
      <span className="mt-2.5 line-clamp-2 min-h-[36px] px-1.5 text-sm font-bold leading-[18px] text-text-primary">
        {item.name}
      </span>
      {item.linkPrice ? (
        <span className="mt-1.5 px-1.5 text-base font-extrabold text-text-primary">
          {item.linkPrice}
        </span>
      ) : null}
      {store ? <StoreChip store={store} className="mt-1.5 px-1.5" /> : null}
      {item.note ? (
        <span className="mx-1.5 mt-1.5 inline-flex h-[22px] w-fit max-w-full items-center truncate rounded-pill bg-[var(--gray-25)] px-2 text-[11.5px] font-bold text-[var(--text-secondary)]">
          {item.note}
        </span>
      ) : null}
    </>
  );
  if (editing) {
    return (
      <div className="relative flex flex-col rounded-[22px] bg-[var(--white)] p-1.5 pb-3 shadow-[0_1px_2px_rgba(16,17,48,0.04),0_0_0_1px_var(--border-subtle)]">
        <div className="flex flex-col rounded-[18px]">{body}</div>
        <button
          type="button"
          aria-label={`Verplaats ${item.name}`}
          className="absolute left-3.5 top-3.5 flex size-9 cursor-grab touch-none items-center justify-center rounded-full bg-[var(--white)] text-[var(--text-secondary)] shadow-[0_1px_3px_rgba(16,17,48,0.12)] transition-colors active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] [@media(hover:hover)]:hover:text-action-primary"
          {...dragHandle}
        >
          <GripIcon className="size-[18px]" />
        </button>
        <RoundIconButton
          tone="danger"
          size={36}
          aria-label={`${item.name} verwijderen`}
          onClick={onDelete}
          className="absolute right-3.5 top-3.5 shadow-[0_1px_3px_rgba(16,17,48,0.12)]"
        >
          {RoundIcons.trash}
        </RoundIconButton>
      </div>
    );
  }
  return (
    <div className="relative flex flex-col rounded-[22px] bg-[var(--white)] p-1.5 pb-3 shadow-[0_1px_2px_rgba(16,17,48,0.04),0_0_0_1px_var(--border-subtle)] transition-transform duration-fast ease-out-strong has-[a:active]:motion-safe:scale-[0.98]">
      <Link
        href={`/vast/${listId}/idee/${item.id}`}
        className="flex flex-col rounded-[18px] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
      >
        {body}
      </Link>
      <span className="pointer-events-none absolute left-3.5 top-3.5">
        <ClaimBadge item={item} userId={userId} />
      </span>
      {item.linkUrl ? (
        <a
          href={item.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${item.name} openen${store ? ` op ${store}` : ""}`}
          className="absolute right-3.5 top-3.5 flex size-[30px] items-center justify-center rounded-full bg-[var(--white)] text-action-primary shadow-[0_1px_3px_rgba(16,17,48,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        >
          <ExternalIcon className="size-[15px]" />
        </a>
      ) : null}
    </div>
  );
}

/** Een kaart in de bewerkmodus: sleepbaar op het greepje (op een raster, dus `rectSortingStrategy`). */
function SortableKadoCard(props: Omit<React.ComponentProps<typeof KadoCard>, "editing" | "dragHandle">) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.item.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && "relative z-10 drop-shadow-[0_14px_20px_rgba(16,17,48,0.25)]")}
    >
      <KadoCard {...props} editing dragHandle={{ ...attributes, ...listeners }} />
    </div>
  );
}

function CheckDot({
  checked,
  color,
  onClick,
  label,
}: {
  checked: boolean;
  color: Rgb;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onClick}
      className="-m-2 flex size-10 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
    >
      <span
        className={cn(
          "flex size-[22px] items-center justify-center rounded-full",
          !checked && "shadow-[inset_0_0_0_1.6px_#c6c8ce]",
        )}
        style={
          checked ? { backgroundColor: `rgb(${color.join(",")})` } : undefined
        }
      >
        {checked ? (
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth={2.8}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="size-3"
          >
            <path d="M5 12.5l4.2 4L19 7" />
          </svg>
        ) : null}
      </span>
    </button>
  );
}

/** Galerij + plakbalk (ook ⌘V op de pagina) + «Gekocht» onderaan. */
export function KadoIdeeen({
  listId,
  listName,
  items,
  color,
  userId,
  emptyIcon,
  header,
  editing = false,
  onReorder,
  onDelete,
}: {
  /** Kop (illustratie + naam); op desktop staat de plakbalk ernaast. */
  header?: React.ReactNode;
  /** Bewerkmodus (potlood): slepen om te ordenen en een ronde vuilbak per idee. */
  editing?: boolean;
  /** De open ideeën in hun nieuwe volgorde (alleen de ids). */
  onReorder?: (ids: string[]) => void;
  onDelete?: (item: KadoItem) => void;
  listId: string;
  listName: string;
  items: KadoItem[];
  color: Rgb;
  userId: string;
  emptyIcon: string;
}) {
  const open = items.filter((i) => !i.checked);
  const done = items.filter((i) => i.checked);
  const [draft, setDraft] = React.useState("");
  const [sheet, setSheet] = React.useState<KadoDraft | null>(null);
  const { user } = db.useAuth();
  const token = (user as { refresh_token?: string } | null | undefined)?.refresh_token ?? null;
  const [showDone, setShowDone] = React.useState(false);
  const [pasteHint, setPasteHint] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = open.map((i) => i.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder?.(arrayMove(ids, from, to));
  };

  const nextOrder = () =>
    items.length > 0 ? Math.max(...items.map((i) => i.order ?? 0)) + 1 : 0;

  /** Link → blad met lezer + AI; gewone tekst → blad «zelf toevoegen» met die naam (foto, prijs erbij). */
  const submit = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const link = findLink(t);
    setSheet(link ? { kind: "link", url: link } : { kind: "manual", name: t, photo: null });
    setDraft("");
  };

  /**
   * Klembord lezen kan geweigerd worden (browserinstelling, ingebedde browser, geen toestemming).
   * Dan het veld focussen: gewoon plakken (⌘V / Ctrl+V of lang drukken) werkt altijd.
   */
  const pasteFromClipboard = async () => {
    const pasteKeys = /Mac|iPhone|iPad/i.test(navigator.userAgent) ? "⌘V" : "Ctrl+V";
    let text: string | null = null;
    try {
      text = navigator.clipboard?.readText ? await navigator.clipboard.readText() : null;
    } catch {
      text = null;
    }
    if (text != null && findLink(text)) {
      submit(text);
      return;
    }
    inputRef.current?.focus();
    setPasteHint(
      text == null
        ? `Je browser laat de knop niet in het klembord kijken. Druk ${pasteKeys} om de link te plakken.`
        : "Geen link op het klembord. Kopieer eerst de link van het product.",
    );
  };
  React.useEffect(() => {
    if (!pasteHint) return;
    const t = setTimeout(() => setPasteHint(null), 6000);
    return () => clearTimeout(t);
  }, [pasteHint]);

  // Ideeën met een link maar zonder foto (winkel kon niet gelezen worden, of oudere versie van de
  // lezer): één keer per bezoek opnieuw proberen en aanvullen wat nu wel gevonden wordt.
  const retried = React.useRef(new Set<string>());
  React.useEffect(() => {
    for (const it of items) {
      if (!it.linkUrl || it.linkImage || retried.current.has(it.id)) continue;
      retried.current.add(it.id);
      fetch("/api/link-preview", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: it.linkUrl }) })
        .then((r) => r.json() as Promise<Preview>)
        .then((p) => {
          if (!p?.image) return;
          void db
            .transact(db.tx.items[it.id].update({ linkImage: p.image, ...(p.price && !it.linkPrice ? { linkPrice: p.price } : {}), ...(p.title && /:\s*Amazon\./i.test(it.name) ? { name: p.title } : {}) }))
            .catch(() => undefined);
        })
        .catch(() => undefined);
    }
  }, [items]);

  // ⌘V / Ctrl+V ergens op de pagina (niet in een tekstveld) voegt de link toe.
  const submitRef = React.useRef(submit);
  submitRef.current = submit;
  const sheetOpen = sheet != null;
  React.useEffect(() => {
    if (sheetOpen) return;
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.closest("input, textarea, [contenteditable='true']") ||
          t.isContentEditable)
      )
        return;
      // Een geplakte foto (screenshot, gekopieerde afbeelding) = zelf toevoegen met die foto.
      const img = imageFromPaste(e);
      if (img) {
        e.preventDefault();
        setSheet({ kind: "manual", name: "", photo: img });
        return;
      }
      const text = e.clipboardData?.getData("text") ?? "";
      if (!findLink(text)) return;
      e.preventDefault();
      submitRef.current(text);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [sheetOpen]);

  const accent = deepRgb(color, 0.72);
  const total = open.reduce((sum, i) => {
    const n = Number(
      (i.linkPrice ?? "")
        .replace(/[^\d,.-]/g, "")
        .replace(/\./g, "")
        .replace(",", "."),
    );
    return Number.isFinite(n) ? sum + n : sum;
  }, 0);

  return (
    <div className="relative">
      <div className="flex flex-col gap-1 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        {header}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(draft);
          }}
          className="flex h-[52px] items-center gap-2.5 rounded-pill bg-[var(--white)] pl-4 pr-1.5 shadow-[0_0_0_1px_var(--border-subtle),0_6px_16px_-10px_rgba(16,17,48,0.25)] focus-within:shadow-[0_0_0_1.5px_var(--blue-300),0_6px_16px_-10px_rgba(16,17,48,0.25)] lg:w-[440px] lg:shrink-0"
        >
          <LinkIcon className="size-[18px] shrink-0 text-[var(--text-tertiary)]" />
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onPaste={(e) => {
              const img = imageFromPaste(e);
              if (img) {
                e.preventDefault();
                setSheet({ kind: "manual", name: draft.trim(), photo: img });
                setDraft("");
                return;
              }
              const text = e.clipboardData.getData("text");
              if (findLink(text)) {
                e.preventDefault();
                submit(text);
              }
            }}
            placeholder="Plak een link uit een winkel"
            aria-label="Link of kado-idee toevoegen"
            enterKeyHint="go"
            className="h-full min-w-0 flex-1 bg-transparent text-[15px] text-text-primary outline-none placeholder:text-[var(--text-tertiary)]"
          />
          {draft.trim() ? (
            <button
              type="submit"
              className="inline-flex h-10 shrink-0 items-center rounded-pill bg-action-primary px-4 text-sm font-bold text-white"
            >
              Toevoegen
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void pasteFromClipboard()}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-pill bg-[var(--blue-50)] px-3.5 text-sm font-bold text-action-primary"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
                className="size-4"
              >
                <rect x="7" y="4" width="10" height="4" rx="1.5" />
                <path d="M7 6H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1" />
              </svg>
              Plakken
            </button>
          )}
        </form>
      </div>
      {pasteHint ? (
        <p role="status" className="mx-4 mt-2 text-[13px] font-semibold text-action-primary lg:ml-auto lg:w-[440px]">
          {pasteHint}
        </p>
      ) : null}
      <div className="mx-1 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 lg:ml-auto lg:w-[440px] lg:px-3">
        <span className="flex items-center gap-1 text-[12.5px] text-[var(--text-tertiary)]">
          <SparkleIcon className="size-3.5 text-action-primary" />
          AI zoekt foto, prijs en omschrijving
        </span>
        <button
          type="button"
          onClick={() => setSheet({ kind: "manual", name: "", photo: null })}
          className="ml-auto inline-flex h-8 items-center gap-1 rounded-pill px-1 text-[13px] font-bold text-action-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        >
          + Zelf toevoegen met foto
        </button>
      </div>

      <div className="mx-1 mb-2.5 mt-5 flex items-center justify-between">
        <h2 className="text-[17px] font-bold text-text-primary">
          {open.length} {open.length === 1 ? "idee" : "ideeën"}
        </h2>
        {editing ? (
          <span className="text-[13px] font-semibold text-[var(--text-secondary)]">Sleep aan het greepje om te ordenen</span>
        ) : total > 0 ? (
          <span className="text-[13px] font-semibold text-[var(--text-secondary)]">
            {new Intl.NumberFormat("nl-BE", {
              style: "currency",
              currency: "EUR",
              maximumFractionDigits: 0,
            }).format(total)}{" "}
            in totaal
          </span>
        ) : null}
      </div>

      {editing ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={open.map((i) => i.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
              {open.map((item) => (
                <SortableKadoCard
                  key={item.id}
                  item={item}
                  listId={listId}
                  color={color}
                  userId={userId}
                  emptyIcon={emptyIcon}
                  onDelete={() => onDelete?.(item)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5 lg:gap-4">
          {open.map((item) => (
            <KadoCard
              key={item.id}
              item={item}
              listId={listId}
              color={color}
              userId={userId}
              emptyIcon={emptyIcon}
            />
          ))}
        </div>
      )}
      {open.length === 0 ? (
        <p className="mt-3 px-2 text-center text-sm text-[var(--text-tertiary)]">
          Plak de link van een product: AI zoekt de foto, prijs en omschrijving. Of voeg zelf iets toe met een foto.
        </p>
      ) : null}

      {done.length > 0 ? (
        <>
          <div className="mx-1 mb-1.5 mt-6 flex items-center justify-between">
            <span className="text-xs font-extrabold tracking-[0.05em] text-[var(--text-tertiary)]">
              GEKOCHT · {done.length}
            </span>
            <button
              type="button"
              onClick={() => setShowDone((v) => !v)}
              aria-expanded={showDone}
              className="rounded-pill px-1 text-[13px] font-semibold text-action-primary"
            >
              {showDone ? "Verberg" : "Toon"}
            </button>
          </div>
          {showDone ? (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {done.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-[18px] bg-[var(--white)] py-2 pl-2 pr-4 shadow-[0_0_0_1px_var(--border-subtle)]"
                >
                  {editing ? (
                    <div className="flex min-w-0 flex-1 items-center gap-3 opacity-60">
                      <KadoPhoto
                        item={item}
                        color={color}
                        emptyIcon={emptyIcon}
                        className="size-11 shrink-0 rounded-[12px]"
                      />
                      <span className="truncate text-sm font-semibold text-[var(--text-secondary)] line-through">
                        {item.name}
                      </span>
                    </div>
                  ) : (
                  <Link
                    href={`/vast/${listId}/idee/${item.id}`}
                    className="flex min-w-0 flex-1 items-center gap-3 no-underline opacity-60"
                  >
                    <KadoPhoto
                      item={item}
                      color={color}
                      emptyIcon={emptyIcon}
                      className="size-11 shrink-0 rounded-[12px]"
                    />
                    <span className="truncate text-sm font-semibold text-[var(--text-secondary)] line-through">
                      {item.name}
                    </span>
                  </Link>
                  )}
                  {editing ? (
                    <RoundIconButton tone="danger" size={28} aria-label={`${item.name} verwijderen`} onClick={() => onDelete?.(item)}>
                      {RoundIcons.trash}
                    </RoundIconButton>
                  ) : null}
                  <CheckDot
                    checked
                    color={color}
                    label={`${item.name} terugzetten`}
                    onClick={() =>
                      void db
                        .transact(
                          db.tx.items[item.id].update({ checked: false }),
                        )
                        .catch(() => undefined)
                    }
                  />
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}

      <KadoAddSheet
        draft={sheet}
        onClose={() => setSheet(null)}
        userId={userId}
        token={token}
        listId={listId}
        listName={listName}
        order={nextOrder()}
        color={color}
        emptyIcon={emptyIcon}
        accent={accent}
      />
    </div>
  );
}

/** Wat het blad «Idee toevoegen» opent: een link (lezen + AI) of zelf invullen (met of zonder foto). */
export type KadoDraft = { kind: "link"; url: string } | { kind: "manual"; name: string; photo: Blob | null };

const pasteKeys = () => (typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.userAgent) ? "⌘V" : "Ctrl+V");

/** Eerste afbeelding uit een plak-gebeurtenis (screenshot, gekopieerde foto). */
export function imageFromPaste(e: ClipboardEvent | React.ClipboardEvent): File | null {
  const files = Array.from(e.clipboardData?.files ?? []);
  const fromFiles = files.find((f) => f.type.startsWith("image/"));
  if (fromFiles) return fromFiles;
  for (const it of Array.from(e.clipboardData?.items ?? [])) {
    if (it.kind === "file" && it.type.startsWith("image/")) return it.getAsFile();
  }
  return null;
}

/** Afbeelding uit het klembord via de knop; `null` als de browser het niet toelaat of er geen foto op staat. */
export async function readClipboardImage(): Promise<Blob | "denied" | null> {
  try {
    if (!navigator.clipboard?.read) return "denied";
    for (const item of await navigator.clipboard.read()) {
      const type = item.types.find((t) => t.startsWith("image/"));
      if (type) return await item.getType(type);
    }
    return null;
  } catch {
    return "denied";
  }
}

/** Foto van een kado-idee naar de opslag (verkleind); geeft de publieke URL. */
export async function uploadKadoPhoto(photo: Blob, ownerId: string): Promise<string> {
  const dataUrl = await fileToGiftPhotoDataUrl(photo);
  return (await uploadUserImageDataUrl({ dataUrl, ownerId, kind: "gift-photo" })).url;
}

export const SparkleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
    <path d="M10 2.5l1.6 4.9a3 3 0 0 0 1.9 1.9l4.9 1.6-4.9 1.6a3 3 0 0 0-1.9 1.9L10 19.3l-1.6-4.9a3 3 0 0 0-1.9-1.9L1.6 10.9l4.9-1.6a3 3 0 0 0 1.9-1.9L10 2.5zM19 14l.8 2.2 2.2.8-2.2.8L19 20l-.8-2.2-2.2-.8 2.2-.8L19 14z" />
  </svg>
);
const PhotoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
    <rect x="3" y="5" width="18" height="15" rx="3" />
    <circle cx="9" cy="11" r="2" />
    <path d="M21 17l-5-5-7 7" />
  </svg>
);
const ClipboardIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
    <rect x="7" y="4" width="10" height="4" rx="1.5" />
    <path d="M7 6H6a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-1" />
  </svg>
);

const softPill =
  "inline-flex h-9 items-center gap-1.5 rounded-pill bg-[var(--blue-50)] px-3 text-[13px] font-bold text-action-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] disabled:opacity-50";

/** «Plakken» + «Kies foto» voor de foto van een idee (ook op de detailpagina). */
export function KadoPhotoButtons({
  onPhoto,
  onHint,
  hasPhoto,
  onRemove,
  disabled,
}: {
  onPhoto: (photo: Blob) => void;
  onHint: (hint: string) => void;
  hasPhoto?: boolean;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  const fileRef = React.useRef<HTMLInputElement>(null);
  const paste = async () => {
    const got = await readClipboardImage();
    if (got && got !== "denied") onPhoto(got);
    else onHint(got === "denied" ? `Je browser laat de knop niet in het klembord kijken. Druk ${pasteKeys()} om de foto te plakken.` : "Geen foto op het klembord. Kopieer eerst een afbeelding.");
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={disabled} onClick={() => void paste()} className={softPill}>
        <ClipboardIcon className="size-4" />
        Foto plakken
      </button>
      <button type="button" disabled={disabled} onClick={() => fileRef.current?.click()} className={softPill}>
        <PhotoIcon className="size-4" />
        Kies foto
      </button>
      {hasPhoto && onRemove ? (
        <button type="button" disabled={disabled} onClick={onRemove} className="h-9 rounded-pill px-2 text-[13px] font-semibold text-[var(--text-secondary)]">
          Verwijder
        </button>
      ) : null}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPhoto(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** Lokale voorbeeld-URL voor een geplakte of gekozen foto (opgeruimd bij wissel). */
function useObjectUrl(blob: Blob | null): string | null {
  const [url, setUrl] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!blob) {
      setUrl(null);
      return;
    }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

type AiInfo = { title: string | null; description: string | null; price: string | null; image: string | null; url?: string; store?: string };

/** Gemini leest de link (naam, omschrijving, prijs, foto). */
export async function askKadoAi(url: string, token: string): Promise<AiInfo> {
  const r = await fetch("/api/link-preview/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify({ url }),
  });
  const j = (await r.json().catch(() => null)) as (AiInfo & { error?: string }) | null;
  if (!r.ok || !j || j.error) throw new Error(j?.error ?? "ai-unavailable");
  return j;
}

/**
 * Blad «Idee toevoegen». Met een link: eerst de snelle lezer, dan Gemini die naam, omschrijving, prijs en foto
 * aanvult (wat je zelf al typte blijft staan). Zelf invullen: naam, foto (plakken of kiezen), prijs, omschrijving.
 */
function KadoAddSheet({
  draft,
  onClose,
  listId,
  listName,
  order,
  color,
  emptyIcon,
  accent,
  userId,
  token,
}: {
  draft: KadoDraft | null;
  onClose: () => void;
  listId: string;
  listName: string;
  order: number;
  color: Rgb;
  emptyIcon: string;
  accent: string;
  userId: string;
  token: string | null;
}) {
  const url = draft?.kind === "link" ? draft.url : null;
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [ai, setAi] = React.useState<"idle" | "busy" | "done" | "failed">("idle");
  const [title, setTitle] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [note, setNote] = React.useState("");
  const [image, setImage] = React.useState<string | null>(null);
  const [photo, setPhoto] = React.useState<Blob | null>(null);
  const [hint, setHint] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const photoUrl = useObjectUrl(photo);
  // Velden die je zelf aanpaste, laat de AI met rust.
  const touched = React.useRef(new Set<string>());
  const run = React.useRef(0);

  const runAi = React.useCallback(
    (link: string) => {
      if (!token) return;
      const id = run.current;
      setAi("busy");
      askKadoAi(link, token)
        .then((r) => {
          if (run.current !== id) return;
          if (r.title && !touched.current.has("title")) setTitle(r.title);
          if (r.price && !touched.current.has("price")) setPrice(r.price);
          if (r.description && !touched.current.has("description")) setDescription(r.description);
          if (r.image) setImage(r.image);
          setPreview((p) => (p ? { ...p, title: p.title ?? r.title, price: p.price ?? r.price, image: r.image ?? p.image } : p));
          setAi("done");
        })
        .catch(() => {
          if (run.current === id) setAi("failed");
        });
    },
    [token],
  );

  React.useEffect(() => {
    if (!draft) return;
    run.current += 1;
    const id = run.current;
    touched.current = new Set();
    setPreview(null);
    setTitle(draft.kind === "manual" ? draft.name : "");
    setPrice("");
    setDescription("");
    setNote("");
    setImage(null);
    setPhoto(draft.kind === "manual" ? draft.photo : null);
    setHint(null);
    setSaving(false);
    setAi("idle");
    if (draft.kind !== "link") {
      setLoading(false);
      return;
    }
    const link = draft.url;
    setLoading(true);
    fetch("/api/link-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: link }),
    })
      .then((r) => r.json() as Promise<Preview & { error?: string }>)
      .then((p) => {
        if (run.current !== id) return;
        const pv: Preview = {
          url: p.url || link,
          store: p.store || storeOf(link) || "",
          title: p.title ?? null,
          image: p.image ?? null,
          price: p.price ?? null,
          blocked: p.blocked || !!p.error,
        };
        setPreview(pv);
        if (!touched.current.has("title")) setTitle((t) => t || pv.title || "");
        if (!touched.current.has("price")) setPrice((v) => v || pv.price || "");
        setImage((v) => v ?? pv.image);
      })
      .catch(() => {
        if (run.current === id) setPreview({ url: link, store: storeOf(link) ?? "", title: null, image: null, price: null, blocked: true });
      })
      .finally(() => {
        if (run.current === id) setLoading(false);
      });
    runAi(link);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- enkel bij een nieuw concept
  }, [draft]);

  // ⌘V / Ctrl+V met een afbeelding terwijl het blad openstaat = foto van dit idee.
  React.useEffect(() => {
    if (!draft) return;
    const onPaste = (e: ClipboardEvent) => {
      const img = imageFromPaste(e);
      if (!img) return;
      e.preventDefault();
      setPhoto(img);
      setHint(null);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [draft]);

  React.useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(null), 6000);
    return () => clearTimeout(t);
  }, [hint]);

  const found = !!(title || image || price);
  const canSave = !!draft && !saving && title.trim().length > 0;
  const save = async () => {
    if (!draft || !canSave) return;
    setSaving(true);
    let finalImage = image;
    if (photo) {
      try {
        finalImage = await uploadKadoPhoto(photo, userId);
      } catch (e) {
        setHint(e instanceof Error ? e.message : "De foto kon niet bewaard worden.");
        setSaving(false);
        return;
      }
    }
    const link = url ? preview?.url || url : null;
    await db
      .transact(
        db.tx.items[iid()]
          .update({
            name: title.trim(),
            quantity: "",
            checked: false,
            section: "Algemeen",
            order,
            ...(link ? { linkUrl: link, linkStore: preview?.store || storeOf(link) || "" } : {}),
            ...(finalImage ? { linkImage: finalImage } : {}),
            ...(price.trim() ? { linkPrice: price.trim() } : {}),
            ...(description.trim() ? { description: description.trim() } : {}),
            ...(note.trim() ? { note: note.trim() } : {}),
          })
          .link({ list: listId }),
      )
      .catch(() => undefined);
    setSaving(false);
    onClose();
  };

  const shown: KadoItem = { id: "preview", name: title, linkImage: photoUrl ?? image };
  const edit = (field: string, set: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    touched.current.add(field);
    set(e.target.value);
  };
  const statusLabel = (text: string, tone: string, icon?: React.ReactNode) => (
    <span className="flex items-center gap-1 text-[11.5px] font-extrabold tracking-[0.04em]" style={{ color: tone }}>
      {icon}
      {text}
    </span>
  );

  return (
    <SlideInModal
      open={draft != null}
      onClose={onClose}
      title="Idee toevoegen"
      footer={
        <Button variant="primary" disabled={!canSave} onClick={() => void save()}>
          {saving ? "Bewaren…" : `Toevoegen aan ${listName}`}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        {url ? (
          <div className="flex h-11 items-center gap-2 overflow-hidden rounded-[14px] bg-[var(--blue-25)] px-3.5 text-[13px] font-semibold text-action-primary">
            <LinkIcon className="size-4 shrink-0" />
            <span className="truncate">{url.replace(/^https?:\/\/(www\.)?/, "")}</span>
          </div>
        ) : null}
        <div className="flex gap-3.5">
          {loading && !photoUrl && !image ? (
            <div className="shimmer size-[120px] shrink-0 rounded-[16px] bg-[var(--gray-25)]" />
          ) : (
            <KadoPhoto item={shown} color={color} emptyIcon={emptyIcon} className="size-[120px] shrink-0 rounded-[16px]" />
          )}
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
            {url && ai === "busy"
              ? statusLabel("AI LEEST DE PAGINA…", "var(--action-primary)", <SparkleIcon className="size-3.5 motion-safe:animate-pulse" />)
              : url && ai === "done"
                ? statusLabel("AANGEVULD MET AI", "var(--success-soft-fg)", <SparkleIcon className="size-3.5" />)
                : url && loading
                  ? statusLabel("PAGINA LEZEN…", "var(--text-tertiary)")
                  : url && found
                    ? statusLabel("GEVONDEN OP DE PAGINA", "var(--success-soft-fg)")
                    : url
                      ? statusLabel("NIETS GEVONDEN", accent)
                      : statusLabel("ZELF TOEVOEGEN", accent, <PhotoIcon className="size-3.5" />)}
            {url && ai !== "busy" && !found && !loading ? (
              <span className="text-[13px] leading-[18px] text-[var(--text-secondary)]">Deze winkel laat de pagina niet lezen. Vul zelf aan; de link blijft bewaard.</span>
            ) : null}
            {url && ai === "failed" ? (
              <button type="button" onClick={() => runAi(url)} className="flex w-fit items-center gap-1 text-[13px] font-bold text-action-primary">
                <SparkleIcon className="size-3.5" />
                Opnieuw met AI
              </button>
            ) : null}
            {price && url ? <span className="text-lg font-extrabold text-text-primary">{price}</span> : null}
            {preview?.store ? <StoreChip store={preview.store} className="text-[12.5px]" /> : null}
            {!url ? <span className="text-[13px] leading-[18px] text-[var(--text-secondary)]">Plak een foto ({pasteKeys()}) of kies er een.</span> : null}
          </div>
        </div>
        <KadoPhotoButtons onPhoto={(b) => setPhoto(b)} onHint={setHint} hasPhoto={!!photo} onRemove={() => setPhoto(null)} disabled={saving} />
        {hint ? (
          <p role="status" className="-mt-2 text-[13px] font-semibold text-action-primary">
            {hint}
          </p>
        ) : null}
        <InputField label="Naam" value={title} onChange={edit("title", setTitle)} placeholder="bv. Lego Duplo trein" />
        <InputField label="Prijs" value={price} onChange={edit("price", setPrice)} placeholder="bv. € 24,95" inputMode="decimal" />
        <InputField label="Omschrijving" asChild className="h-auto min-h-[96px] resize-none py-3">
          <textarea rows={3} value={description} onChange={edit("description", setDescription)} placeholder={url && ai === "busy" ? "AI schrijft een korte omschrijving…" : "Wat is het, wat maakt het leuk?"} />
        </InputField>
        <InputField label="Notitie" value={note} onChange={(e) => setNote(e.target.value)} placeholder="bv. maat 27" />
      </div>
    </SlideInModal>
  );
}
