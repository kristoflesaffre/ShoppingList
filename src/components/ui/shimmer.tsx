import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Design system «Shimmer»: grijs laadvlak met een glans die voorbij schuift. Geef vorm en maat
 * mee via `className` (bv. `h-4 w-1/2 rounded`). Voor schermen die nog data ophalen.
 */
export function Shimmer({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div aria-hidden className={cn("shimmer", className)} style={style} />;
}
