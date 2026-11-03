"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { teKopenMonogramStyle } from "@/lib/te-kopen-style";

/**
 * Design system «Gekozen product»: kopblok bovenaan een formulierblad nadat je een product koos
 * (canvas «Product toevoegen» A). Zacht grijs vlak (gray-25, radius 20): foto op een wit tegeltje (56) ·
 * naam vet · subtitel · «Wijzig product» (gsm: «Wijzig»). Het hele blok is de knop om opnieuw te zoeken.
 */
export function ChosenProductCard({
  name,
  photoUrl,
  subtitle,
  onChange,
  className,
}: {
  name: string;
  photoUrl: string | null;
  subtitle?: React.ReactNode;
  /** Terug naar het zoeken. */
  onChange: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-label={`Product: ${name}. Wijzig product`}
      className={cn(
        "flex w-full items-center gap-3.5 rounded-[20px] bg-[var(--gray-25)] p-3 text-left transition-colors",
        "active:bg-[var(--gray-50)] [@media(hover:hover)]:hover:bg-[var(--gray-50)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
        className,
      )}
    >
      {photoUrl ? (
        <span className="flex size-14 shrink-0 items-center justify-center rounded-[14px] bg-[var(--white)]">
          {/* eslint-disable-next-line @next/next/no-img-element -- lokale item-webp */}
          <img src={photoUrl} alt="" width={42} height={42} className="size-[42px] object-contain" aria-hidden decoding="async" />
        </span>
      ) : (
        <span className="flex size-14 shrink-0 items-center justify-center rounded-[14px] text-[20px] font-bold" style={teKopenMonogramStyle(name)} aria-hidden>
          {name.trim().charAt(0).toUpperCase()}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[17px] font-bold leading-[22px] text-[var(--text-primary)] first-letter:uppercase">{name}</span>
        {subtitle ? <span className="block truncate text-[13px] leading-[18px] text-[var(--text-secondary)]">{subtitle}</span> : null}
      </span>
      <span className="shrink-0 text-[14.5px] font-semibold text-[var(--blue-500)]">
        <span className="md:hidden">Wijzig</span>
        <span className="hidden md:inline">Wijzig product</span>
      </span>
    </button>
  );
}
