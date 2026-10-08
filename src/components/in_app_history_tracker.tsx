"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { noteInAppNavigation } from "@/lib/in_app_history";

/** Telt paginawissels zodat terugknoppen weten of `router.back()` binnen de app blijft. */
export function InAppHistoryTracker() {
  const pathname = usePathname();
  React.useEffect(() => {
    noteInAppNavigation(pathname);
  }, [pathname]);
  return null;
}
