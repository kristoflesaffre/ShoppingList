"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { PRIORITY, plainTaskText, type TodoTask } from "@/lib/todoist-client";

/**
 * Rond afvinkvakje voor een Todoist-taak (rand in de prioriteitskleur, zoals in Todoist). Tik = vinkje vult
 * zich, en na een kort moment `onCheck` (zo zie je wat je afvinkt voordat de taak verdwijnt).
 */
export function TodoCheck({ task, onCheck, className }: { task: TodoTask; onCheck: (task: TodoTask) => void; className?: string }) {
  const [checked, setChecked] = React.useState(false);
  const color = PRIORITY[task.priority]?.color;
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={`${plainTaskText(task.content)} afvinken`}
      disabled={checked}
      onClick={(e) => {
        e.stopPropagation();
        setChecked(true);
        window.setTimeout(() => onCheck(task), 320);
      }}
      className={cn(
        "group/check relative flex size-[22px] shrink-0 items-center justify-center rounded-full border-2 transition-[background-color,transform] duration-fast ease-out-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2 motion-safe:active:scale-90",
        className,
      )}
      style={{
        borderColor: color ?? "var(--gray-300)",
        backgroundColor: checked ? color ?? "var(--gray-500)" : color ? `${color}14` : undefined,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className={cn(
          "size-3 transition-opacity duration-fast",
          checked ? "text-fixed-white opacity-100" : "opacity-0 [@media(hover:hover)]:group-hover/check:opacity-60",
        )}
        style={checked ? undefined : { color: color ?? "var(--gray-400)" }}
      >
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </button>
  );
}

/** Korte melding onderaan (afvinken mislukt of opnieuw koppelen nodig). */
export function TodoNotice({ notice, onReconnect, onClose }: { notice: { text: string; reconnect: boolean } | null; onReconnect: () => void; onClose: () => void }) {
  if (!notice) return null;
  return (
    <div role="status" className="fixed inset-x-4 bottom-[calc(110px+env(safe-area-inset-bottom,0px))] z-30 mx-auto flex max-w-[460px] items-center gap-3 rounded-[16px] bg-[rgba(16,17,48,0.92)] px-4 py-3 text-[13.5px] font-medium text-fixed-white shadow-raised">
      <span className="min-w-0 flex-1">{notice.text}</span>
      {notice.reconnect ? (
        <button type="button" onClick={onReconnect} className="shrink-0 rounded-pill bg-fixed-white px-3 py-1.5 text-[13px] font-bold text-[#101130]">
          Opnieuw koppelen
        </button>
      ) : null}
      <button type="button" onClick={onClose} aria-label="Sluiten" className="shrink-0 text-fixed-white/70">
        ✕
      </button>
    </div>
  );
}
