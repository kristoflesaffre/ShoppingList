"use client";

import { TasteOverviewPage } from "@/components/films/taste_overview_page";
import { MOVIE_TASTE } from "@/lib/taste-kinds";

export default function FilmsmaakPage() {
  return <TasteOverviewPage kind={MOVIE_TASTE} />;
}
