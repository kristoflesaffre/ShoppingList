import { NextRequest, NextResponse } from "next/server";
import { hasOmdbKey, resolveImdbScore } from "@/lib/omdb";

const TMDB_TOKEN =
  "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIxZjcwNTdlNmIyZDQ1YWNjMGM2MTA1ZDIzNGQ2ZmY3YSIsIm5iZiI6MTc3OTcxOTk3My4yNTUsInN1YiI6IjZhMTQ1ZjI1NzdlMDAzODI5NTVlOGExZCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.Cug3JDg_AK7xARootDKwEnQDHitdaEbQVbJTs5Y6iEI";
const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_IMG_POSTER = "https://image.tmdb.org/t/p/w342";
const TMDB_IMG_BACKDROP = "https://image.tmdb.org/t/p/w780";
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

  const appendToResponse =
    type === "movie"
      ? "videos,release_dates,external_ids"
      : "videos,content_ratings,external_ids";

  // include_video_language=en: trailers zijn vrijwel altijd Engelstalig; nl-NL filtert ze anders weg
  // Credits apart ophalen met nl-NL zodat karakternamen gelokaliseerd zijn
  const [detailRes, creditsRes] = await Promise.all([
    fetch(
      `${TMDB_BASE}/${type}/${id}?append_to_response=${appendToResponse}&language=nl-NL&include_video_language=en`,
      { headers: tmdbHeaders, next: { revalidate: 3600 } },
    ),
    fetch(
      `${TMDB_BASE}/${type}/${id}/credits?language=nl-NL`,
      { headers: tmdbHeaders, next: { revalidate: 3600 } },
    ),
  ]);
  if (!detailRes.ok) return NextResponse.json({ error: "not found" }, { status: 502 });

  const data = (await detailRes.json()) as Record<string, unknown>;
  const creditsData = creditsRes.ok
    ? ((await creditsRes.json()) as { cast?: unknown[] })
    : { cast: [] };

  // Trailer (YouTube preferred)
  const videos = (
    ((data.videos as { results?: unknown[] } | undefined)?.results ?? []) as Record<string, unknown>[]
  );
  const trailer =
    videos.find((v) => v.site === "YouTube" && v.type === "Trailer") ??
    videos.find((v) => v.site === "YouTube") ??
    null;

  // Certification
  let certification = "";
  if (type === "movie") {
    const releases = (
      ((data.release_dates as { results?: unknown[] } | undefined)?.results ?? []) as {
        iso_3166_1: string;
        release_dates?: { certification?: string }[];
      }[]
    );
    const us = releases.find((r) => r.iso_3166_1 === "US");
    certification = us?.release_dates?.[0]?.certification ?? "";
  } else {
    const ratings = (
      ((data.content_ratings as { results?: unknown[] } | undefined)?.results ?? []) as {
        iso_3166_1: string;
        rating?: string;
      }[]
    );
    const us = ratings.find((r) => r.iso_3166_1 === "US");
    certification = us?.rating ?? "";
  }

  // Runtime
  let runtime = "";
  if (type === "movie") {
    const mins = data.runtime as number | undefined;
    if (mins && mins > 0) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      runtime = h > 0 ? `${h}u${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
    }
  } else {
    const seasons = data.number_of_seasons as number | undefined;
    if (seasons) runtime = `${seasons} seizoen${seasons > 1 ? "en" : ""}`;
  }

  const title = type === "movie" ? (data.title as string) : (data.name as string);
  const date =
    type === "movie"
      ? (data.release_date as string | undefined)
      : (data.first_air_date as string | undefined);
  const year = (date ?? "").slice(0, 4);

  // Score: IMDb via OMDB API, met TMDb vote_average als fallback
  const imdbId = (data.external_ids as { imdb_id?: string } | undefined)?.imdb_id ?? null;
  let score: number | null = null;
  let scoreSource: "imdb" | "tmdb" = "tmdb";

  if (hasOmdbKey()) {
    const omdb = await resolveImdbScore({ imdbId, title, year, type });
    if (omdb.score !== null) {
      score = omdb.score;
      scoreSource = omdb.scoreSource;
    }
  }

  if (score === null) {
    const avg = data.vote_average as number | undefined;
    if (avg && avg > 0) score = Math.round(avg * 10) / 10;
  }

  const genres = ((data.genres as { name: string }[] | undefined) ?? []).map((g) => g.name);

  const totalEpisodes =
    type === "tv" ? ((data.number_of_episodes as number | undefined) ?? null) : null;

  const seasons =
    type === "tv"
      ? ((data.seasons as {
          season_number: number;
          name: string;
          episode_count: number;
          poster_path?: string | null;
        }[]) ?? [])
          .filter((s) => s.season_number > 0)
          .map((s) => ({
            seasonNumber: s.season_number,
            name: s.name,
            episodeCount: s.episode_count,
            posterUrl: s.poster_path ? `${TMDB_IMG_POSTER}${s.poster_path}` : null,
          }))
      : [];

  const cast = (
    (creditsData.cast ?? []) as {
      name: string;
      character: string;
      profile_path?: string | null;
    }[]
  )
    .map((c) => ({
      name: c.name,
      character: c.character,
      profileUrl: c.profile_path ? `${TMDB_IMG_PROFILE}${c.profile_path}` : null,
    }));

  return NextResponse.json({
    id: `${type}-${id}`,
    tmdbId: parseInt(id),
    type,
    title,
    year,
    releaseDate: date ?? null,
    certification,
    runtime,
    genres,
    seasons,
    overview: (data.overview as string | undefined) ?? "",
    posterUrl: data.poster_path ? `${TMDB_IMG_POSTER}${data.poster_path as string}` : null,
    backdropUrl: data.backdrop_path ? `${TMDB_IMG_BACKDROP}${data.backdrop_path as string}` : null,
    score,
    scoreSource,
    imdbId,
    totalEpisodes,
    cast,
    trailerKey: (trailer?.key as string | undefined) ?? null,
  });
}
