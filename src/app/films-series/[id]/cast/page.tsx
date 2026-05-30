"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { SearchBar } from "@/components/ui/search_bar";
import { cn } from "@/lib/utils";

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

function MaskIcon({ src, className }: { src: string; className?: string }) {
  return (
    <span
      className={cn("inline-block shrink-0", className)}
      style={{
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
      aria-hidden
    />
  );
}

function ThreeDotsIcon({ className }: { className?: string }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <circle cx="5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" />
    </svg>
  );
}

function CastRowSkeleton() {
  return (
    <div className="flex animate-pulse items-start gap-7">
      <div className="h-[131px] w-[87px] shrink-0 rounded bg-[var(--gray-100)]" />
      <div className="flex flex-1 flex-col gap-2 pt-2">
        <div className="h-4 w-2/3 rounded bg-[var(--gray-100)]" />
        <div className="h-4 w-1/2 rounded bg-[var(--gray-100)]" />
        <div className="h-4 w-3/4 rounded bg-[var(--gray-100)]" />
      </div>
    </div>
  );
}

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

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-white">

      {/* Vaste header */}
      <div className="fixed left-0 right-0 top-0 z-20 bg-white pt-[env(safe-area-inset-top,0px)]">
        <div className="flex justify-center px-4">
          <header className="flex h-16 w-full max-w-[956px] items-center gap-4">
            <button
              type="button"
              aria-label="Terug"
              onClick={() => router.back()}
              className="flex size-6 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              <MaskIcon src="/icons/arrow.svg" className="size-6 bg-[var(--blue-500)]" />
            </button>
            <p className="min-w-0 flex-1 text-center text-base font-medium leading-6 text-[var(--text-primary)]">
              Cast
            </p>
            <button
              type="button"
              aria-label="Meer opties"
              className="flex size-6 shrink-0 items-center justify-center text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
            >
              <ThreeDotsIcon />
            </button>
          </header>
        </div>
      </div>

      {/* Scrollbare inhoud */}
      <div
        className="relative z-10 mx-auto flex w-full max-w-[956px] flex-1 flex-col px-4 pt-8 pb-[calc(env(safe-area-inset-bottom,0px)+32px)]"
        style={{ marginTop: "calc(64px + env(safe-area-inset-top, 0px))" }}
      >
        {/* Heading + subtitle */}
        <div className="mb-4 flex flex-col gap-1">
          <h1 className="text-2xl font-bold leading-8 text-[#16181a]">Cast</h1>
          {data?.title && (
            <p className="text-[14px] font-normal leading-5 text-[#8c929d]">{data.title}</p>
          )}
        </div>

        {/* Zoekbalk */}
        <div className="mb-6">
          <SearchBar
            placeholder="Zoek op naam of karakter"
            value={query}
            onValueChange={setQuery}
          />
        </div>

        {/* Cast lijst */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <CastRowSkeleton key={i} />
            ))}
          </div>
        ) : filteredCast.length === 0 ? (
          <p className="py-8 text-center text-sm text-[var(--gray-400)]">
            {query ? `Geen resultaten voor "${query}"` : "Geen cast gevonden."}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {filteredCast.map((member, i) => (
              <div key={i} className="flex items-center gap-7">
                {/* Foto */}
                <div
                  className="relative h-[131px] w-[87px] shrink-0 overflow-hidden rounded bg-[var(--gray-50)]"
                >
                  {member.profileUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.profileUrl}
                      alt={member.name}
                      className="absolute inset-0 size-full object-cover"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center">
                      <MaskIcon src="/icons/films.svg" className="size-8 bg-[var(--gray-200)]" />
                    </div>
                  )}
                </div>

                {/* Tekst */}
                <div className="flex flex-col gap-0.5">
                  <p className="text-[16px] font-medium leading-6 text-[#16181a]">
                    {member.name}
                  </p>
                  {member.character && (
                    <p className="text-[14px] font-normal leading-5 text-[#8c929d]">
                      {member.character}
                    </p>
                  )}
                  {data?.type === "tv" && member.episodeCount != null && (
                    <p className="text-[14px] font-normal leading-5 text-[#8c929d]">
                      ({member.episodeCount}{" "}
                      {member.episodeCount === 1 ? "aflevering" : "afleveringen"}
                      {member.yearRange ? `, ${member.yearRange}` : ""})
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
