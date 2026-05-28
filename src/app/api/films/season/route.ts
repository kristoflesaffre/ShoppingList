import { NextRequest, NextResponse } from "next/server";

const TMDB_TOKEN =
  "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZjcwNTdlNmIyZDQ1YWNjMGM2MTA1ZDIzNGQ2ZmY3YSIsIm5iZiI6MTc3OTcxOTk3My4yNTUsInN1YiI6IjZhMTQ1ZjI1NzdlMDAzODI5NTVlOGExZCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Cug3JDg_AK7xARootDKwEnQDHitdaEbQVbJTs5Y6iEI";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG_POSTER = "https://image.tmdb.org/t/p/w342";

const tmdbHeaders = {
  Authorization: `Bearer ${TMDB_TOKEN}`,
  "Content-Type": "application/json",
};

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const season = request.nextUrl.searchParams.get("season");

  if (!id || !season) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  const res = await fetch(
    `${TMDB_BASE}/tv/${id}/season/${season}?language=nl-NL&append_to_response=videos&include_video_language=en`,
    { headers: tmdbHeaders, next: { revalidate: 3600 } },
  );

  if (!res.ok) return NextResponse.json({ error: "not found" }, { status: 502 });

  const data = (await res.json()) as {
    overview?: string;
    poster_path?: string | null;
    videos?: { results?: Record<string, unknown>[] };
  };

  const videos = data.videos?.results ?? [];
  const trailer =
    (videos as Record<string, unknown>[]).find((v) => v.site === "YouTube" && v.type === "Trailer") ??
    (videos as Record<string, unknown>[]).find((v) => v.site === "YouTube") ??
    null;

  return NextResponse.json({
    overview: data.overview ?? "",
    trailerKey: (trailer?.key as string | undefined) ?? null,
    posterUrl: data.poster_path ? `${TMDB_IMG_POSTER}${data.poster_path}` : null,
  });
}
