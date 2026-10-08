"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { backOr } from "@/lib/in_app_history";
import { SearchBar } from "@/components/ui/search_bar";
import { CastRow, ListCard, SubpageHeader } from "@/components/films/film_detail_ui";

type CastMember = {
  name: string;
  character: string;
  profileUrl: string | null;
  episodeCount?: number;
  yearRange?: string | null;
};

type CastData = {
  title: string;
  type: "movie" | "tv";
  cast: CastMember[];
};

export default function CastPage() {
  const router = useRouter();
  const params = useParams();
  const rawId = params.id as string;

  const [data, setData] = React.useState<CastData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    if (!rawId) return;
    const dashIdx = rawId.indexOf("-");
    const type = rawId.slice(0, dashIdx);
    const tmdbId = rawId.slice(dashIdx + 1);
    if (!type || !tmdbId) return;

    setLoading(true);
    fetch(`/api/films/cast?type=${type}&id=${tmdbId}`)
      .then((r) => r.json())
      .then((d: CastData) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [rawId]);

  const filteredCast = React.useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data.cast;
    return data.cast.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.character.toLowerCase().includes(q),
    );
  }, [data, query]);

  const subtitle = data
    ? [data.title, data.cast.length ? `${data.cast.length} ${data.cast.length === 1 ? "acteur" : "acteurs"}` : null].filter(Boolean).join(" · ")
    : undefined;

  return (
    <div className="relative flex min-h-dvh w-full flex-col">
      {/* Canvas «21 · Cast — voorstel»: grote titel, wit zoekveld, lijstkaart met ronde foto's. */}
      <div className="mx-auto flex w-full max-w-[956px] flex-1 flex-col gap-4 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+40px)] pt-[calc(env(safe-area-inset-top,0px)+12px)] lg:pt-10">
        <div>
          <SubpageHeader title="Cast" subtitle={subtitle} onBack={() => backOr(router, `/films-series/${rawId}`)} />
        </div>
        <SearchBar surface="app" placeholder="Zoek op naam of rol" value={query} onValueChange={setQuery} />

        {loading ? (
          <ListCard>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex animate-pulse items-center gap-3 border-t border-[var(--border-subtle)] px-3.5 py-2.5 first:border-t-0">
                <div className="size-12 rounded-full bg-[var(--gray-100)]" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="h-4 w-1/2 rounded bg-[var(--gray-100)]" />
                  <div className="h-3 w-1/3 rounded bg-[var(--gray-100)]" />
                </div>
              </div>
            ))}
          </ListCard>
        ) : filteredCast.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--text-secondary)]">
            {query ? `Geen resultaten voor "${query}"` : "Geen cast gevonden."}
          </p>
        ) : (
          <ListCard className="lg:grid lg:grid-cols-2 lg:[&>*:nth-child(2)]:border-t-0">
            {filteredCast.map((member, i) => (
              <CastRow
                key={i}
                person={member}
                extra={
                  data?.type === "tv" && member.episodeCount != null ? (
                    <span className="shrink-0 whitespace-nowrap text-right text-xs font-semibold leading-4 text-[var(--text-tertiary)]">
                      {member.episodeCount} afl.
                      {member.yearRange ? <span className="block font-medium">{member.yearRange}</span> : null}
                    </span>
                  ) : null
                }
              />
            ))}
          </ListCard>
        )}
      </div>
    </div>
  );
}
