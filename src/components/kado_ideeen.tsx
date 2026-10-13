"use client";

import * as React from "react";
import Link from "next/link";
import { id as iid } from "@instantdb/react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/db";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { InputField } from "@/components/ui/input_field";
import { Button } from "@/components/ui/button";
import { deepRgb, mixWithWhiteRgb } from "@/lib/vaste-lijstjes";

/**
 * Kado-ideeën (canvas «Kado's met links»): elk idee is een link naar een webwinkel met foto, titel en
 * prijs uit de pagina (`/api/link-preview`). Eerst om terug te bekijken en de winkel te openen;
 * afvinken («Gekocht») is bijzaak.
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

/** Eerste http(s)-link in een tekst (plakken of slepen); ook «bol.com/…» zonder schema. */
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

function KadoCard({
  item,
  listId,
  color,
  userId,
  emptyIcon,
}: {
  item: KadoItem;
  listId: string;
  color: Rgb;
  userId: string;
  emptyIcon: string;
}) {
  const store = item.linkStore || storeOf(item.linkUrl);
  return (
    <div className="relative flex flex-col rounded-[22px] bg-[var(--white)] p-1.5 pb-3 shadow-[0_1px_2px_rgba(16,17,48,0.04),0_0_0_1px_var(--border-subtle)] transition-transform duration-fast ease-out-strong has-[a:active]:motion-safe:scale-[0.98]">
      <Link
        href={`/vast/${listId}/idee/${item.id}`}
        className="flex flex-col rounded-[18px] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
      >
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

/** Galerij + plakbalk + slepen (desktop) + «Gekocht» onderaan. */
export function KadoIdeeen({
  listId,
  listName,
  items,
  color,
  userId,
  emptyIcon,
  header,
}: {
  /** Kop (illustratie + naam); op desktop staat de plakbalk ernaast. */
  header?: React.ReactNode;
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
  const [sheetUrl, setSheetUrl] = React.useState<string | null>(null);
  const [dragging, setDragging] = React.useState(false);
  const [showDone, setShowDone] = React.useState(false);
  const [pasteHint, setPasteHint] = React.useState<string | null>(null);
  const dragDepth = React.useRef(0);

  const nextOrder = () =>
    items.length > 0 ? Math.max(...items.map((i) => i.order ?? 0)) + 1 : 0;

  /** Link → voorbeeld-blad; gewone tekst → idee zonder link. */
  const submit = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const link = findLink(t);
    if (link) {
      setSheetUrl(link);
    } else {
      void db
        .transact(
          db.tx.items[iid()]
            .update({
              name: t,
              quantity: "",
              checked: false,
              section: "Algemeen",
              order: nextOrder(),
            })
            .link({ list: listId }),
        )
        .catch(() => undefined);
    }
    setDraft("");
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (findLink(text)) submit(text);
      else setPasteHint("Geen link gevonden op het klembord.");
    } catch {
      setPasteHint("Plakken mag niet; plak de link in het veld.");
    }
  };
  React.useEffect(() => {
    if (!pasteHint) return;
    const t = setTimeout(() => setPasteHint(null), 3500);
    return () => clearTimeout(t);
  }, [pasteHint]);

  // ⌘V / Ctrl+V ergens op de pagina (niet in een tekstveld) voegt de link toe.
  const submitRef = React.useRef(submit);
  submitRef.current = submit;
  const sheetOpen = sheetUrl != null;
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
      const text = e.clipboardData?.getData("text") ?? "";
      if (!findLink(text)) return;
      e.preventDefault();
      submitRef.current(text);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [sheetOpen]);

  const hasLinkData = (e: React.DragEvent) => {
    const types = Array.from(e.dataTransfer.types);
    return types.includes("text/uri-list") || types.includes("text/plain");
  };

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
    <div
      className="relative"
      onDragEnter={(e) => {
        if (!hasLinkData(e)) return;
        dragDepth.current += 1;
        setDragging(true);
      }}
      onDragOver={(e) => {
        if (!hasLinkData(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={() => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        const link =
          findLink(e.dataTransfer.getData("text/uri-list")) ??
          findLink(e.dataTransfer.getData("text/plain"));
        if (link) setSheetUrl(link);
      }}
    >
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
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onPaste={(e) => {
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
        <p className="mx-4 mt-2 text-[13px] text-[var(--text-secondary)] lg:text-right">
          {pasteHint}
        </p>
      ) : null}

      <div className="mx-1 mb-2.5 mt-5 flex items-center justify-between">
        <h2 className="text-[17px] font-bold text-text-primary">
          {open.length} {open.length === 1 ? "idee" : "ideeën"}
        </h2>
        {total > 0 ? (
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
        <div
          aria-hidden
          className={cn(
            "flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-[22px] border-2 border-dashed p-4 text-center transition-colors",
            dragging
              ? "flex border-action-primary bg-[var(--blue-25)]"
              : "hidden border-[#c9cbe6] lg:flex",
          )}
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-[var(--white)] text-action-primary shadow-[0_6px_14px_-8px_rgba(79,85,241,0.6)]">
            <LinkIcon className="size-5" />
          </span>
          <span className="text-[15px] font-extrabold leading-5 text-action-primary">
            {dragging ? "Laat los om toe te voegen" : "Sleep een link hierheen"}
          </span>
          <span className="text-[12.5px] text-[var(--text-secondary)]">
            of plak een link (⌘V)
          </span>
        </div>
      </div>
      {open.length === 0 && !dragging ? (
        <p className="mt-3 px-2 text-center text-sm text-[var(--text-tertiary)] lg:hidden">
          Plak een link uit een webwinkel; foto en prijs komen er vanzelf bij.
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
        url={sheetUrl}
        onClose={() => setSheetUrl(null)}
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

/** Blad «Idee toevoegen»: haalt het voorbeeld op en laat titel, prijs en notitie aanvullen. */
function KadoAddSheet({
  url,
  onClose,
  listId,
  listName,
  order,
  color,
  emptyIcon,
  accent,
}: {
  url: string | null;
  onClose: () => void;
  listId: string;
  listName: string;
  order: number;
  color: Rgb;
  emptyIcon: string;
  accent: string;
}) {
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [title, setTitle] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setPreview(null);
    setTitle("");
    setPrice("");
    setNote("");
    setLoading(true);
    fetch("/api/link-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    })
      .then((r) => r.json() as Promise<Preview & { error?: string }>)
      .then((p) => {
        if (cancelled) return;
        const pv: Preview = {
          url: p.url || url,
          store: p.store || storeOf(url) || "",
          title: p.title ?? null,
          image: p.image ?? null,
          price: p.price ?? null,
          blocked: p.blocked || !!p.error,
        };
        setPreview(pv);
        setTitle((t) => t || pv.title || "");
        setPrice((v) => v || pv.price || "");
      })
      .catch(() => {
        if (!cancelled)
          setPreview({
            url,
            store: storeOf(url) ?? "",
            title: null,
            image: null,
            price: null,
            blocked: true,
          });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  const found = preview && (preview.title || preview.image || preview.price);
  const canSave = !!url && !loading && title.trim().length > 0;
  const save = () => {
    if (!url || !canSave) return;
    void db
      .transact(
        db.tx.items[iid()]
          .update({
            name: title.trim(),
            quantity: "",
            checked: false,
            section: "Algemeen",
            order,
            linkUrl: preview?.url || url,
            linkStore: preview?.store || storeOf(url) || "",
            ...(preview?.image ? { linkImage: preview.image } : {}),
            ...(price.trim() ? { linkPrice: price.trim() } : {}),
            ...(note.trim() ? { note: note.trim() } : {}),
          })
          .link({ list: listId }),
      )
      .catch(() => undefined);
    onClose();
  };

  const item: KadoItem = {
    id: "preview",
    name: title,
    linkImage: preview?.image ?? null,
  };
  return (
    <SlideInModal
      open={url != null}
      onClose={onClose}
      title="Idee toevoegen"
      footer={
        <Button variant="primary" disabled={!canSave} onClick={save}>
          Toevoegen aan {listName}
        </Button>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex h-11 items-center gap-2 overflow-hidden rounded-[14px] bg-[var(--blue-25)] px-3.5 text-[13px] font-semibold text-action-primary">
          <LinkIcon className="size-4 shrink-0" />
          <span className="truncate">
            {url?.replace(/^https?:\/\/(www\.)?/, "")}
          </span>
        </div>
        <div className="flex gap-3.5">
          {loading ? (
            <div className="size-[120px] shrink-0 animate-pulse rounded-[16px] bg-[var(--gray-25)]" />
          ) : (
            <KadoPhoto
              item={item}
              color={color}
              emptyIcon={emptyIcon}
              className="size-[120px] shrink-0 rounded-[16px]"
            />
          )}
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
            {loading ? (
              <>
                <span className="text-[11.5px] font-extrabold tracking-[0.04em] text-[var(--text-tertiary)]">
                  PAGINA LEZEN…
                </span>
                <span className="h-4 w-4/5 animate-pulse rounded bg-[var(--gray-25)]" />
                <span className="h-4 w-1/2 animate-pulse rounded bg-[var(--gray-25)]" />
              </>
            ) : found ? (
              <>
                <span className="flex items-center gap-1 text-[11.5px] font-extrabold tracking-[0.04em] text-[#2f8f5a]">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                    className="size-3.5"
                  >
                    <path d="M5 12.5l4.2 4L19 7" />
                  </svg>
                  GEVONDEN OP DE PAGINA
                </span>
                {preview?.price ? (
                  <span className="text-lg font-extrabold text-text-primary">
                    {preview.price}
                  </span>
                ) : null}
                {preview?.store ? (
                  <StoreChip store={preview.store} className="text-[12.5px]" />
                ) : null}
              </>
            ) : (
              <>
                <span
                  className="text-[11.5px] font-extrabold tracking-[0.04em]"
                  style={{ color: accent }}
                >
                  NIETS GEVONDEN
                </span>
                <span className="text-[13px] leading-[18px] text-[var(--text-secondary)]">
                  Deze winkel laat de pagina niet lezen. Vul zelf een naam in;
                  de link blijft bewaard.
                </span>
              </>
            )}
          </div>
        </div>
        <InputField
          label="Naam"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="bv. Lego Duplo trein"
        />
        <InputField
          label="Prijs"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="bv. € 24,95"
          inputMode="decimal"
        />
        <InputField
          label="Notitie"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="bv. maat 27"
        />
      </div>
    </SlideInModal>
  );
}
