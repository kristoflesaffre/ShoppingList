"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RoundIconButton, RoundIcons } from "@/components/ui/round_icon_button";
import { cn } from "@/lib/utils";

/**
 * Design system «Terugknop naast de titel» (canvas «Terugnavigatie A»): alleen op desktop (lg+).
 * Ronde witte knop (surface 36) links van de grote paginatitel; op mobiel blijft de topbalk met pijl.
 */
export function PageBackButton({
  href = "/",
  label = "Terug",
  className,
}: {
  href?: string;
  label?: string;
  className?: string;
}) {
  const router = useRouter();
  return (
    <RoundIconButton
      tone="surface"
      size={36}
      aria-label={label}
      onClick={() => router.push(href)}
      className={cn("hidden shrink-0 lg:flex", className)}
    >
      {RoundIcons.back}
    </RoundIconButton>
  );
}

/** Klassen voor de vaste topbalk die op desktop verdwijnt (daar staat de terugknop naast de titel). */
export const MOBILE_ONLY_TOP_BAR_CLASS = "lg:hidden";
