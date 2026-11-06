"use client";

import { TasteRatePage } from "@/components/films/taste_rate_page";
import { MOVIE_TASTE } from "@/lib/taste-kinds";

export default function FilmsBeoordelenPage() {
  return <TasteRatePage kind={MOVIE_TASTE} />;
}
