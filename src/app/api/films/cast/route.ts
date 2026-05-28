import { NextRequest, NextResponse } from "next/server";

const TMDB_TOKEN =
  "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZjcwNTdlNmIyZDQ1YWNjMGM2MTA1ZDIzNGQ2ZmY3YSIsIm5iZiI6MTc3OTcxOTk3My4yNTUsInN1YiI6IjZhMTQ1ZjI1NzdlMDAzODI5NTVlOGExZCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Cug3JDg_AK7xARootDKwEnQDHitdaEbQVbJTs5Y6iEI";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG_PROFILE = "https://image.tmdb.org/t/p/w185";

const tmdbHeaders = {
  Authorization: `Bearer ${TMDB_TOKEN}`,
  "Content-Type": "application/json",
};

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type") as "movie" | "tv" | null;
  const id = request.nextUrl.searchParams.get("id");

  if (!type || !id || (type !== "movie" && type !== "tv")) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  if (type === "movie") {
    const [detailRes, creditsRes] = await Promise.all([
      fetch(`${TMDB_BASE}/movie/${id}?language=nl-NL`, {
        headers: tmdbHeaders,
        next: { revalidate: 3600 },
      }),
      fetch(`${TMDB_BASE}/movie/${id}/credits?language=nl-NL`, {
        headers: tmdbHeaders,
        next: { revalidate: 3600 },
      }),
    ]);

    if (!detailRes.ok || !creditsRes.ok) {
      return NextResponse.json({ error: "not found" }, { status: 502 });
    }

    const detail = (await detailRes.json()) as { title?: string };
    const credits = (await creditsRes.json()) as {
      cast?: { name: string; character: string; profile_path?: string | null }[];
    };

    const cast = (credits.cast ?? []).map((c) => ({
      name: c.name,
      character: c.character,
      profileUrl: c.profile_path ? `${TMDB_IMG_PROFILE}${c.profile_path}` : null,
    }));

    return NextResponse.json({ title: detail.title ?? "", type: "movie", cast });
  }

  // TV: aggregate_credits voor afleveringsaantallen + detail voor jaarbereik
  const [detailRes, aggRes] = await Promise.all([
    fetch(`${TMDB_BASE}/tv/${id}?language=nl-NL`, {
      headers: tmdbHeaders,
      next: { revalidate: 3600 },
    }),
    fetch(`${TMDB_BASE}/tv/${id}/aggregate_credits?language=nl-NL`, {
      headers: tmdbHeaders,
      next: { revalidate: 3600 },
    }),
  ]);

  if (!detailRes.ok || !aggRes.ok) {
    return NextResponse.json({ error: "not found" }, { status: 502 });
  }

  const detail = (await detailRes.json()) as {
    name?: string;
    first_air_date?: string;
    last_air_date?: string;
    in_production?: boolean;
  };

  const agg = (await aggRes.json()) as {
    cast?: {
      name: string;
      total_episode_count: number;
      roles?: { character: string; episode_count: number }[];
      profile_path?: string | null;
    }[];
  };

  const startYear = (detail.first_air_date ?? "").slice(0, 4);
  const endYear = detail.in_production
    ? new Date().getFullYear().toString()
    : (detail.last_air_date ?? "").slice(0, 4);
  const yearRange = startYear && endYear && startYear !== endYear
    ? `${startYear}-${endYear}`
    : startYear || null;

  const cast = (agg.cast ?? []).map((c) => ({
    name: c.name,
    character: c.roles?.[0]?.character ?? "",
    profileUrl: c.profile_path ? `${TMDB_IMG_PROFILE}${c.profile_path}` : null,
    episodeCount: c.total_episode_count,
    yearRange,
  }));

  return NextResponse.json({ title: detail.name ?? "", type: "tv", cast });
}
