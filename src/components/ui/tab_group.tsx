"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { TabGroupContext } from "@/components/ui/tab_element";

export interface TabGroupProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange" | "role"> {
  /** Id van het geselecteerde tabblad (moet matchen met `value` op elk {@link TabElement}). */
  value: string;
  onValueChange: (value: string) => void;
}

function selectorForTabValue(tabValue: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return `[data-tab-value="${CSS.escape(tabValue)}"]`;
  }
  return `[data-tab-value="${tabValue.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"]`;
}

/**
 * Horizontale tabrij met onderrand (Figma 860-5349): `gap` 24px, `border-b` neutraal.
 * Eén primary-onderlijn schuift geanimeerd naar het geselecteerde tabblad.
 * Kinderen zijn typisch één of meer {@link TabElement}-componenten.
 */
export function TabGroup({
  value,
  onValueChange,
  className,
  children,
  "aria-label": ariaLabel = "Tabs",
  ...props
}: TabGroupProps) {
  const tablistRef = React.useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = React.useState({ left: 0, width: 0 });

  const syncIndicator = React.useCallback(() => {
    const list = tablistRef.current;
    if (!list) return;
    const btn = list.querySelector<HTMLElement>(selectorForTabValue(value));
    if (!btn) {
      setIndicator({ left: 0, width: 0 });
      return;
    }
    const lr = list.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    setIndicator({
      left: br.left - lr.left,
      width: br.width,
    });
  }, [value]);

  React.useLayoutEffect(() => {
    syncIndicator();
    const id = window.requestAnimationFrame(() => syncIndicator());
    return () => window.cancelAnimationFrame(id);
  }, [syncIndicator]);

  React.useEffect(() => {
    const list = tablistRef.current;
    if (!list || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => syncIndicator());
    ro.observe(list);
    const onWin = () => syncIndicator();
    window.addEventListener("resize", onWin);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onWin);
    };
  }, [syncIndicator]);

  return (
    <TabGroupContext.Provider
      value={{ value, onValueChange, useSlidingUnderline: true }}
    >
      <div className={cn("relative w-full", className)} {...props}>
        <div
          ref={tablistRef}
          role="tablist"
          aria-label={ariaLabel}
          className="flex w-full items-start gap-[var(--space-6)] border-b border-[var(--border-subtle)]"
        >
          {children}
        </div>
        <div
          aria-hidden
          className={cn(
            "pointer-events-none absolute bottom-0 z-[1] h-[2px] bg-[var(--blue-500)]",
            "transition-[left,width] duration-200 ease-out motion-reduce:transition-none",
          )}
          style={{
            left: indicator.width > 0 ? indicator.left : 0,
            width: indicator.width,
          }}
        />
      </div>
    </TabGroupContext.Provider>
  );
}
