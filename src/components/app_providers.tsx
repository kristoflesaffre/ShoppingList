"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";

// InstantDB's async module graph cannot be prerendered by Next 14.
const StremioProvider = dynamic(
  () => import("@/hooks/use_stremio").then((module) => module.StremioProvider),
  { ssr: false },
);

const FreezerPlanningSync = dynamic(
  () => import("@/components/freezer_planning_sync").then((module) => module.FreezerPlanningSync),
  { ssr: false },
);

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <StremioProvider>
      {children}
      <FreezerPlanningSync />
    </StremioProvider>
  );
}
