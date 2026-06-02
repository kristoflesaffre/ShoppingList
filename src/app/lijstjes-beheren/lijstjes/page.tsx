"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { LijstjesBeherenClient } from "../lijstjes_beheren_client";

function LijstjesPage() {
  const searchParams = useSearchParams();
  const defaultEditMode = searchParams.get("edit") === "1";
  return <LijstjesBeherenClient section="lijstjes" defaultEditMode={defaultEditMode} />;
}

export default function LijstjesBeherenLijstjesPage() {
  return (
    <React.Suspense>
      <LijstjesPage />
    </React.Suspense>
  );
}
