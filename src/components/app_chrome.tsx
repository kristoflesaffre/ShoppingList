"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const AppPersistentBottomNavLazy = dynamic(
  () =>
    import("@/components/app_persistent_bottom_nav_inner").then(
      (m) => m.AppPersistentBottomNavInner,
    ),
  { ssr: false },
);

export function AppPersistentBottomNav() {
  const pathname = usePathname();
  return <AppPersistentBottomNavLazy pathname={pathname} />;
}
