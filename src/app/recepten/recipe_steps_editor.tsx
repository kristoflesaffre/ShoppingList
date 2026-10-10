"use client";

import * as React from "react";
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
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

/**
 * Canvas «Recept bewerken · 1 · inline»: bereidingsstappen rechtstreeks bewerken op de detailpagina.
 * Greep om te ordenen, tekstveld per stap, prullenbak, «Stap toevoegen». Bewaart (na een korte pauze
 * en bij verlaten) als één tekst met een stap per regel, zoals de rest van de app ze leest.
 */
type DraftStep = { key: string; text: string };

let stepKeySeq = 0;
const nextKey = () => `step-${(stepKeySeq += 1)}`;

export function DragGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className="size-[18px]">
      <circle cx="9" cy="6" r="1.3" />
      <circle cx="15" cy="6" r="1.3" />
      <circle cx="9" cy="12" r="1.3" />
      <circle cx="15" cy="12" r="1.3" />
      <circle cx="9" cy="18" r="1.3" />
      <circle cx="15" cy="18" r="1.3" />
    </svg>
  );
}

export function TrashGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-[17px]">
      <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />
    </svg>
  );
}

export const deleteTone =
  "bg-[var(--error-25)] text-[var(--error-400)] shadow-[inset_0_0_0_1px_rgba(214,64,64,0.12)] [@media(hover:hover)]:hover:bg-[rgba(214,64,64,0.12)]";

export const editIconBtn =
  "flex size-9 shrink-0 items-center justify-center rounded-full transition-[background-color,transform] duration-fast motion-safe:active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]";

function AutoGrowTextarea({
  value,
  onChange,
  onBlur,
  ariaLabel,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  onBlur: () => void;
  ariaLabel: string;
  autoFocus?: boolean;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  React.useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  React.useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      aria-label={ariaLabel}
      placeholder="Beschrijf deze stap…"
      onChange={(e) => onChange(e.target.value.replace(/\n/g, " "))}
      onBlur={onBlur}
      className="min-w-0 flex-1 resize-none overflow-hidden rounded-[10px] bg-[var(--gray-25)] px-2.5 py-1.5 text-[15px] leading-[22px] text-text-primary outline-none transition-shadow placeholder:text-[var(--text-tertiary)] focus:bg-[var(--white)] focus:shadow-[0_0_0_1.5px_var(--blue-500)]"
    />
  );
}

function SortableStep({
  step,
  index,
  autoFocus,
  onChange,
  onBlur,
  onDelete,
}: {
  step: DraftStep;
  index: number;
  autoFocus: boolean;
  onChange: (text: string) => void;
  onBlur: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: step.key });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-start gap-2 rounded-[18px] bg-[var(--white)] p-2.5 shadow-[0_0_0_1px_var(--border-subtle)]",
        isDragging && "relative z-10 shadow-[0_14px_28px_-10px_rgba(16,17,48,0.28),0_0_0_1px_var(--blue-100)]",
      )}
    >
      <button
        type="button"
        aria-label={`Verplaats stap ${index + 1}`}
        className={cn(
          "flex h-9 w-6 shrink-0 cursor-grab touch-none items-center justify-center active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
          isDragging ? "text-[var(--blue-500)]" : "text-[var(--gray-300)] [@media(hover:hover)]:hover:text-[var(--blue-500)]",
        )}
        {...attributes}
        {...listeners}
      >
        <DragGlyph />
      </button>
      <span aria-hidden className="mt-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-[var(--blue-50)] text-[13px] font-bold text-[var(--blue-500)]">
        {index + 1}
      </span>
      <AutoGrowTextarea value={step.text} onChange={onChange} onBlur={onBlur} ariaLabel={`Stap ${index + 1}`} autoFocus={autoFocus} />
      <button
        type="button"
        aria-label={`Stap ${index + 1} verwijderen`}
        onClick={onDelete}
        className={cn(editIconBtn, deleteTone)}
      >
        <TrashGlyph />
      </button>
    </li>
  );
}

export function RecipeStepsEditor({ steps, onSave }: { steps: string[]; onSave: (steps: string[]) => Promise<void> | void }) {
  const [draft, setDraft] = React.useState<DraftStep[]>(() => steps.map((text) => ({ key: nextKey(), text })));
  const [focusKey, setFocusKey] = React.useState<string | null>(null);
  const dirtyRef = React.useRef(false);
  const draftRef = React.useRef(draft);
  draftRef.current = draft;
  const onSaveRef = React.useRef(onSave);
  onSaveRef.current = onSave;
  const timer = React.useRef<number | null>(null);

  const flush = React.useCallback(() => {
    if (timer.current != null) window.clearTimeout(timer.current);
    timer.current = null;
    if (!dirtyRef.current) return;
    dirtyRef.current = false;
    void Promise.resolve(onSaveRef.current(draftRef.current.map((s) => s.text.trim()).filter(Boolean))).catch(() => {
      dirtyRef.current = true;
    });
  }, []);

  const update = React.useCallback(
    (next: DraftStep[], delay = 700) => {
      setDraft(next);
      draftRef.current = next;
      dirtyRef.current = true;
      if (timer.current != null) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(flush, delay);
    },
    [flush],
  );

  // Bewerkstand dicht → wat nog wacht meteen bewaren.
  React.useEffect(() => flush, [flush]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 100, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = draft.findIndex((s) => s.key === active.id);
    const to = draft.findIndex((s) => s.key === over.id);
    if (from < 0 || to < 0) return;
    update(arrayMove(draft, from, to), 0);
  };

  const addStep = () => {
    const key = nextKey();
    setFocusKey(key);
    // Lege stap wordt pas bewaard als er tekst in staat.
    setDraft((d) => [...d, { key, text: "" }]);
  };

  return (
    <div>
      {draft.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd} modifiers={[restrictToVerticalAxis]}>
          <SortableContext items={draft.map((s) => s.key)} strategy={verticalListSortingStrategy}>
            <ol className="flex flex-col gap-2.5">
              {draft.map((step, i) => (
                <SortableStep
                  key={step.key}
                  step={step}
                  index={i}
                  autoFocus={focusKey === step.key}
                  onChange={(text) => update(draft.map((s) => (s.key === step.key ? { ...s, text } : s)))}
                  onBlur={flush}
                  onDelete={() => update(draft.filter((s) => s.key !== step.key), 0)}
                />
              ))}
            </ol>
          </SortableContext>
        </DndContext>
      ) : (
        <p className="py-3 text-center text-sm text-[var(--text-tertiary)]">Nog geen stappen.</p>
      )}
      <div className="mt-3.5 flex justify-center">
        <button
          type="button"
          onClick={addStep}
          className="inline-flex h-9 items-center gap-1.5 rounded-pill bg-[var(--blue-50)] px-3.5 text-sm font-semibold text-[var(--blue-500)] transition-colors [@media(hover:hover)]:hover:bg-[var(--blue-100)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden className="size-4">
            <path d="M12 5v14M5 12h14" />
          </svg>
          Stap toevoegen
        </button>
      </div>
    </div>
  );
}
