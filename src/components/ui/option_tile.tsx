"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Design system «Keuzetegel» (canvas «15 · variant 1a»): twee of meer gelijke tegels naast elkaar
 * voor een keuze in een blad (scannen / screenshot, foto nemen / uit je foto's, …). Wit rondje met
 * icoon, titel en korte uitleg; allemaal hetzelfde gewicht.
 */
export function OptionTile({
  icon,
  title,
  subtitle,
  onClick,
  disabled,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-2.5 rounded-[20px] bg-[var(--blue-25)] px-2.5 py-[18px] shadow-[inset_0_0_0_1px_var(--blue-100)] transition-[background-color,transform] duration-fast ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] disabled:opacity-60 [@media(hover:hover)]:hover:bg-[var(--blue-50)]",
        className,
      )}
    >
      <span className="flex size-[52px] items-center justify-center rounded-full bg-[var(--white)] text-[var(--blue-500)] shadow-[0_4px_10px_-6px_rgba(79,85,241,0.5)]">
        {icon}
      </span>
      <span className="text-[15px] font-bold leading-5 text-[var(--text-primary)]">{title}</span>
      <span className="text-center text-xs leading-4 text-[var(--text-secondary)]">{subtitle}</span>
    </button>
  );
}

/** Kop bovenaan een blad zonder titelbalk: rond icoon, titel en één regel uitleg. */
export function SheetIntro({ icon, title, text }: { icon: React.ReactNode; title: string; text: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <span aria-hidden className="mb-1 flex size-16 items-center justify-center rounded-full bg-[var(--blue-50)] text-[var(--blue-500)]">
        {icon}
      </span>
      <p className="text-xl font-bold leading-7 text-[var(--text-primary)]">{title}</p>
      <p className="max-w-[340px] break-words text-[13.5px] leading-[19px] text-[var(--text-secondary)]">{text}</p>
    </div>
  );
}
