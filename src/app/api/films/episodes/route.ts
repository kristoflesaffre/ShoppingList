import { NextRequest, NextResponse } from "next/server";

const TMDB_TOKEN =
  "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZjcwNTdlNmIyZDQ1YWNjMGM2MTA1ZDIzNGQ2ZmY3YSIsIm5iZiI6MTc3OTcxOTk3My4yNTUsInN1YiI6IjZhMTQ1ZjI1NzdlMDAzODI5NTVlOGExZCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Cug3JDg_AK7xARootDKwEnQDHitdaEbQVbJTs5Y6iEI";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG_STILL = "https://image.tmdb.org/t/p/w300";

const tmdbHeaders = {
  Authorization: `Bearer ${TMDB_TOKEN}`,
  "Content-Type": "application/json",
};

type TmdbEpisode = {
  episode_number: number;
  name: string;
  air_date?: string | null;
  runtime?: number | null;
  vote_average?: number;
  overview?: string;
  still_path?: string | null;
};

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const season = request.nextUrl.searchParams.get("season");

  if (!id || !season) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  const res = await fetch(
    `${TMDB_BASE}/tv/${id}/season/${season}?language=nl-NL`,
    { headers: tmdbHeaders, next: { revalidate: 3600 } },
  );

  if (!res.ok) return NextResponse.json({ error: "not found" }, { status: 502 });

  const data = (await res.json()) as { episodes?: TmdbEpisode[]; air_date?: string };

  const episodes = (data.episodes ?? []).map((e) => {
    const avg = e.vote_average ?? 0;
    const mins = e.runtime ?? null;
    let runtime = "";
    if (mins && mins > 0) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      runtime = h > 0 ? `${h}u${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
    }
    return {
      episodeNumber: e.episode_number,
      name: e.name,
      airDate: e.air_date ?? null,
      runtime,
      rating: avg > 0 ? Math.round(avg * 10) / 10 : null,
      overview: e.overview ?? "",
      stillUrl: e.still_path ? `${TMDB_IMG_STILL}${e.still_path}` : null,
    };
  });

  const year = (data.air_date ?? "").slice(0, 4);

  return NextResponse.json({ episodes, year });
}
