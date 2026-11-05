import { NextRequest, NextResponse } from "next/server";
import { fetchDiscoverItems } from "@/lib/discover-fetch";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const limitRaw = parseInt(params.get("limit") ?? "30", 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 50) : 30;

  const excludeRaw = params.get("exclude") ?? "";
  const excludeIds = new Set(
    excludeRaw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
  );

  const isRefill = excludeIds.size > 0 || limit < 20;

  const { results, hasMore } = await fetchDiscoverItems({
    limit,
    excludeIds,
    diversifyGenres: !isRefill,
  });

  // Zelfde voorstellen voor iedereen (de URL bepaalt ze): Vercel serveert ze een uur uit de CDN
  // en vernieuwt op de achtergrond, zodat niemand wacht op de dertig OMDb-scores.
  return NextResponse.json(
    { results, hasMore },
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
