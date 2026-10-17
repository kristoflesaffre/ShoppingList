"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RoundIcons } from "@/components/ui/round_icon_button";
import { headerRoundButtonClass } from "@/components/ui/header_round_button";
import { cn } from "@/lib/utils";

/**
 * Design system «Terugknop naast de titel» (canvas «Terugnavigatie A»): alleen op desktop (lg+).
 * Ronde witte kopknop (40px, blauw icoon) links van de grote paginatitel; op mobiel blijft de topbalk met pijl.
 */
export function PageBackButton({
  href = "/",
  label = "Terug",
  className,
  onClick,
}: {
  href?: string;
  label?: string;
  className?: string;
  /** Eigen gedrag (bv. terug naar waar je vandaan kwam); anders naar `href`. */
  onClick?: () => void;
}) {
  const router = useRouter();
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick ?? (() => router.push(href))}
      className={cn(headerRoundButtonClass, "!hidden lg:!flex", className)}
    >
      {RoundIcons.back}
    </button>
  );
}

/** Klassen voor de vaste topbalk die op desktop verdwijnt (daar staat de terugknop naast de titel). */
export const MOBILE_ONLY_TOP_BAR_CLASS = "lg:hidden";
