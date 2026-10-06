"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { PageBackButton } from "@/components/ui/page_back_button";
import { useLargeTitleCollapse } from "@/lib/use_large_title_collapse";
import {
  type HomeSectionId,
  HOME_SECTIONS_META,
  DEFAULT_SECTION_ORDER,
  loadHomeSectionConfig,
  saveHomeSectionConfig,
} from "@/lib/home-section-config";

function BackArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-6">
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </svg>
  );
}

function GripIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-[18px]">
      <circle cx="9" cy="6" r="1.4" />
      <circle cx="15" cy="6" r="1.4" />
      <circle cx="9" cy="12" r="1.4" />
      <circle cx="15" cy="12" r="1.4" />
      <circle cx="9" cy="18" r="1.4" />
      <circle cx="15" cy="18" r="1.4" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-3">
      <rect x="5" y="11" width="14" height="9" rx="2.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/** Canvas «13 · Startpagina — voorstel»: greep · illustratie · label + uitleg · schakelaar. */
function SortableSectionRow({
  id,
  first,
  hidden,
  onToggle,
}: {
  id: HomeSectionId;
  first: boolean;
  hidden: boolean;
  onToggle: (id: HomeSectionId) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const meta = HOME_SECTIONS_META.find((m) => m.id === id);
  if (!meta) return null;
  const visible = !meta.hideable || !hidden;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative flex items-center gap-2.5 bg-[var(--white)] py-2.5 pl-2 pr-3.5 first:rounded-t-[20px] last:rounded-b-[20px]",
        !first && !isDragging && "border-t border-[var(--border-subtle)]",
        isDragging &&
          "z-10 scale-[1.02] rounded-[16px] shadow-[0_14px_28px_-10px_rgba(16,17,48,0.28),0_0_0_1px_var(--blue-100)]",
      )}
    >
      <button
        type="button"
        aria-label={`Verplaats ${meta.label}`}
        className={cn(
          "flex h-11 w-[22px] shrink-0 cursor-grab touch-none items-center justify-center rounded-md transition-colors active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
          isDragging ? "text-[var(--blue-500)]" : "text-[var(--gray-300)] [@media(hover:hover)]:hover:text-[var(--blue-500)]",
        )}
        {...attributes}
        {...listeners}
      >
        <GripIcon />
      </button>
      <span
        className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-[13px] transition-[opacity,filter] duration-fast",
          !visible && "opacity-[0.45] grayscale-[0.6]",
        )}
        style={{ backgroundColor: meta.tint }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- lokale illustratie */}
        <img src={meta.illustration} alt="" width={32} height={32} className="size-8 object-contain" decoding="async" />
      </span>
      <span className={cn("flex min-w-0 flex-1 flex-col transition-opacity duration-fast", !visible && "opacity-[0.55]")}>
        <span id={`sectie-${id}`} className="text-[15px] font-semibold leading-5 text-[var(--text-primary)]">
          {meta.label}
        </span>
        <span className="truncate text-[12.5px] leading-[17px] text-[var(--text-secondary)]">{meta.description}</span>
      </span>
      {meta.hideable ? (
        <Switch checked={visible} onCheckedChange={() => onToggle(id)} aria-labelledby={`sectie-${id}`} />
      ) : (
        <span className="inline-flex h-[26px] shrink-0 items-center gap-1 rounded-pill bg-[var(--gray-25)] px-2.5 text-xs font-semibold text-[var(--text-secondary)]">
          <LockIcon />
          Altijd
        </span>
      )}
    </li>
  );
}

export default function BeheerHomepaginaPage() {
  const router = useRouter();
  const { titleRef, collapsed } = useLargeTitleCollapse<HTMLHeadingElement>(64);

  const [order, setOrder] = React.useState<HomeSectionId[]>(() => {
    const config = loadHomeSectionConfig();
    const known = new Set(config.order);
    const extra = DEFAULT_SECTION_ORDER.filter((id) => !known.has(id));
    return [...config.order, ...extra];
  });
  const [hidden, setHidden] = React.useState<HomeSectionId[]>(() => loadHomeSectionConfig().hidden);

  const persist = React.useCallback((nextOrder: HomeSectionId[], nextHidden: HomeSectionId[]) => {
    saveHomeSectionConfig({ order: nextOrder, hidden: nextHidden });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = React.useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = order.indexOf(active.id as HomeSectionId);
      const newIndex = order.indexOf(over.id as HomeSectionId);
      if (oldIndex < 0 || newIndex < 0) return;
      const next = arrayMove(order, oldIndex, newIndex);
      setOrder(next);
      persist(next, hidden);
    },
    [order, hidden, persist],
  );

  const handleToggle = React.useCallback(
    (id: HomeSectionId) => {
      setHidden((prev) => {
        const next = prev.includes(id) ? prev.filter((h) => h !== id) : [...prev, id];
        persist(order, next);
        return next;
      });
    },
    [order, persist],
  );

  return (
    <div className="relative flex min-h-dvh w-full flex-col">
      {/* Mobiel: vaste topbalk; compacte titel pas bij scrollen. Desktop: terugknop naast de titel. */}
      <div
        className={cn(
          "fixed left-0 right-0 top-0 z-20 bg-[var(--bg-app)] pt-[env(safe-area-inset-top,0px)] transition-shadow duration-200 lg:hidden",
          collapsed ? "shadow-[0_1px_0_var(--border-subtle)]" : "shadow-none",
        )}
      >
        <header className="mx-auto flex h-16 w-full max-w-[620px] items-center gap-4 px-4">
          <button
            type="button"
            aria-label="Terug naar je profiel"
            onClick={() => router.push("/profiel")}
            className="flex size-6 shrink-0 items-center justify-center text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            <BackArrowIcon />
          </button>
          <p
            className={cn(
              "min-w-0 flex-1 text-center text-base font-medium leading-6 text-[var(--text-primary)] motion-safe:transition-[opacity,transform] motion-safe:duration-200",
              collapsed ? "opacity-100" : "opacity-0 motion-safe:translate-y-1",
            )}
          >
            Startpagina
          </p>
          <span className="size-6 shrink-0" aria-hidden />
        </header>
      </div>

      <main className="mx-auto flex w-full max-w-[620px] flex-1 flex-col px-4 pb-[calc(48px+env(safe-area-inset-bottom,0px))] pt-[calc(64px+8px+env(safe-area-inset-top,0px))] motion-safe:animate-fade-up lg:pt-12">
        <div className="flex items-center gap-3">
          <PageBackButton href="/profiel" label="Terug naar je profiel" />
          <h1 ref={titleRef} className="text-[30px] font-bold leading-9 tracking-tight text-[var(--text-primary)] lg:text-[34px] lg:leading-10">
            Startpagina
          </h1>
        </div>
        <p className="mb-4 mt-0.5 text-sm leading-5 text-[var(--text-secondary)] lg:mb-[22px] lg:pl-12">
          Kies wat je ziet en in welke volgorde.
        </p>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={order} strategy={verticalListSortingStrategy}>
            <ul className="m-0 list-none rounded-[20px] bg-[var(--white)] p-0 shadow-card">
              {order.map((id, i) => (
                <SortableSectionRow key={id} id={id} first={i === 0} hidden={hidden.includes(id)} onToggle={handleToggle} />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        <p className="px-1 pt-2 text-xs leading-[17px] text-[var(--text-tertiary)]">
          Sleep aan de bolletjes om de volgorde te wijzigen. Verborgen secties zie je niet meer op je startpagina.
        </p>
      </main>
    </div>
  );
}
