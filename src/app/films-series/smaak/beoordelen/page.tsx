"use client";

import { TasteRatePage } from "@/components/films/taste_rate_page";
import { SERIES_TASTE } from "@/lib/taste-kinds";

export default function BeoordelenPage() {
  return <TasteRatePage kind={SERIES_TASTE} />;
}
