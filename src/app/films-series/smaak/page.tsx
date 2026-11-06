"use client";

import { TasteOverviewPage } from "@/components/films/taste_overview_page";
import { SERIES_TASTE } from "@/lib/taste-kinds";

export default function SmaakPage() {
  return <TasteOverviewPage kind={SERIES_TASTE} />;
}
