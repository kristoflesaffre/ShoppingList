import { NextRequest, NextResponse } from "next/server";

const TMDB_TOKEN =
  "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZjcwNTdlNmIyZDQ1YWNjMGM2MTA1ZDIzNGQ2ZmY3YSIsIm5iZiI6MTc3OTcxOTk3My4yNTUsInN1YiI6IjZhMTQ1ZjI1NzdlMDAzODI5NTVlOGExZCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Cug3JDg_AK7xARootDKwEnQDHitdaEbQVbJTs5Y6iEI";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG_STILL = "https://image.tmdb.org/t/p/w780";
const TMDB_IMG_PROFILE = "https://image.tmdb.org/t/p/w185";

const tmdbHeaders = {
  Authorization: `Bearer ${TMDB_TOKEN}`,
  "Content-Type": "application/json",
};

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  const season = request.nextUrl.searchParams.get("season");
  const episode = request.nextUrl.searchParams.get("episode");

  if (!id || !season || !episode) {
    return NextResponse.json({ error: "invalid params" }, { status: 400 });
  }

  const res = await fetch(
    `${TMDB_BASE}/tv/${id}/season/${season}/episode/${episode}?language=nl-NL&append_to_response=credits`,
    { headers: tmdbHeaders, next: { revalidate: 3600 } },
  );

  if (!res.ok) return NextResponse.json({ error: "not found" }, { status: 502 });

  const data = (await res.json()) as Record<string, unknown>;

  const mins = data.runtime as number | null | undefined;
  let runtime = "";
  if (mins && mins > 0) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    runtime = h > 0 ? `${h}u${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
  }

  const avg = (data.vote_average as number | undefined) ?? 0;
  const rating = avg > 0 ? Math.round(avg * 10) / 10 : null;

  const credits = data.credits as { cast?: unknown[] } | undefined;
  const cast = (
    (credits?.cast ?? []) as {
      name: string;
      character: string;
      profile_path?: string | null;
    }[]
  ).map((c) => ({
    name: c.name,
    character: c.character,
    profileUrl: c.profile_path ? `${TMDB_IMG_PROFILE}${c.profile_path}` : null,
  }));

  return NextResponse.json({
    title: (data.name as string | undefined) ?? "",
    seasonNumber: parseInt(season),
    episodeNumber: parseInt(episode),
    airDate: (data.air_date as string | null | undefined) ?? null,
    runtime,
    rating,
    overview: (data.overview as string | undefined) ?? "",
    stillUrl: data.still_path ? `${TMDB_IMG_STILL}${data.still_path as string}` : null,
    cast,
  });
}
