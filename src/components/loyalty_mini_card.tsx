"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { cardColors, useIsDarkTheme, useLogoTint } from "@/components/loyalty_wallet";

const BAR_WIDTHS = [2, 1, 1, 2, 1, 3, 1, 1, 2, 1, 2, 1, 1, 3, 1, 2];

/** Decoratieve barcode-strook rechtsonder op de minikaart. */
function DecorBarcode({ size }: { size: "md" | "lg" }) {
  return (
    <span aria-hidden className="flex opacity-55">
      {BAR_WIDTHS.map((w, i) => (
        <span
          key={i}
          className={size === "lg" ? "inline-block h-4" : "inline-block h-3"}
          style={{ width: w * (size === "lg" ? 1.6 : 1.3), background: i % 2 === 0 ? "#16181a" : "transparent" }}
        />
      ))}
    </span>
  );
}

/**
 * Design system «Minikaart» (canvas «14 · leuker A»): klantenkaart in creditcardformaat in de
 * winkeltint (logokleur, zoals op de kaartenpagina), logo op wit tegeltje, naam + strook onderaan.
 * Zonder logo: eerste letter op een wit tegeltje in de standaardtint.
 */
export function LoyaltyMiniCard({
  label,
  logoSrc,
  size = "md",
  badge,
  className,
}: {
  label: string;
  logoSrc?: string | null;
  /** md = raster (kaartkeuze), lg = groter in het blad «Kaart van …». */
  size?: "md" | "lg";
  /** Rechtsboven, bv. «✓ Toegevoegd». */
  badge?: React.ReactNode;
  className?: string;
}) {
  const dark = useIsDarkTheme();
  const colors = cardColors(useLogoTint(logoSrc ?? ""), dark);
  const lg = size === "lg";
  return (
    <span
      className={cn(
        "relative flex aspect-[1.586] w-full min-w-0 flex-col justify-between overflow-hidden text-left",
        lg ? "rounded-[18px] p-4" : "rounded-[14px] p-[11px] lg:rounded-[16px] lg:p-3.5",
        className,
      )}
      style={{ background: colors.background, boxShadow: `inset 0 0 0 1px ${colors.edge}, 0 ${lg ? 18 : 8}px ${lg ? 34 : 18}px -${lg ? 18 : 12}px rgba(16,17,48,0.4)` }}
    >
      <span
        aria-hidden
        className={cn("absolute rounded-full", lg ? "-right-8 -top-8 size-[120px]" : "-right-6 -top-6 size-[90px]")}
        style={{ background: colors.edge, opacity: 0.45 }}
      />
      <span className="relative flex items-start justify-between gap-2">
        <span
          className={cn(
            "flex shrink-0 items-center justify-center bg-[var(--white)] shadow-[0_1px_3px_rgba(16,17,48,0.1)]",
            lg ? "size-11 rounded-[12px]" : "size-[30px] rounded-[9px] lg:size-9",
          )}
        >
          {logoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element -- winkellogo
            <img src={logoSrc} alt="" width={28} height={28} className={lg ? "size-7 object-contain" : "size-5 object-contain lg:size-6"} />
          ) : (
            <span className={cn("font-bold text-[var(--blue-500)]", lg ? "text-lg" : "text-sm")}>
              {label.trim().charAt(0).toUpperCase()}
            </span>
          )}
        </span>
        {badge}
      </span>
      <span className="relative flex items-end justify-between gap-2">
        <span className={cn("min-w-0 truncate font-bold text-[var(--text-primary)]", lg ? "text-base" : "text-[13px] lg:text-[14.5px]")}>
          {label}
        </span>
        <DecorBarcode size={size} />
      </span>
    </span>
  );
}
