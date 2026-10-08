"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { id as instantId } from "@instantdb/react";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import { db } from "@/lib/db";
import { cn, isIPhoneDevice } from "@/lib/utils";
import { PageBackButton } from "@/components/ui/page_back_button";
import { useFilmsLibrary } from "@/hooks/use_films_library";

const ShareListModal = dynamic(
  () => import("@/components/share_list_modal").then((m) => m.ShareListModal),
  { ssr: false },
);

function BackArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3.59377 12.31C3.60777 12.329 3.61477 12.351 3.63177 12.368L9.23178 17.968C9.33378 18.069 9.46678 18.119 9.59978 18.119C9.73278 18.119 9.86678 18.068 9.96778 17.968C10.1698 17.765 10.1698 17.435 9.96778 17.232L5.25578 12.521L19.9998 12.521C20.2868 12.521 20.5198 12.288 20.5198 12.001C20.5198 11.714 20.2868 11.48 19.9998 11.48L5.25477 11.48L9.96678 6.768C10.1688 6.565 10.1688 6.236 9.96577 6.033C9.76477 5.83 9.43378 5.83 9.23078 6.033L3.63078 11.633C3.61378 11.65 3.60577 11.673 3.59177 11.692C3.56477 11.727 3.53678 11.76 3.51978 11.801C3.46678 11.929 3.46678 12.072 3.51978 12.2C3.53778 12.241 3.56677 12.275 3.59377 12.31Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function FilmsSeriesInstellingenPage() {
  const router = useRouter();
  const { isLoading: authLoading, user } = db.useAuth();
  const [shareModalOpen, setShareModalOpen] = React.useState(false);
  const { ownWatchlist, isFilmsListShared, partnerName, partnerAvatarUrl, userName, userAvatarUrl } = useFilmsLibrary();
  const filmCount = ownWatchlist.filter((i) => i.type === "movie").length;
  const seriesCount = ownWatchlist.filter((i) => i.type === "tv").length;
  const [localShareToken, setLocalShareToken] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  const { data, isLoading } = db.useQuery(
    user
      ? ({
          filmsShares: {
            memberships: {},
            $: { where: { ownerId: user.id } },
          },
        } as unknown as Parameters<typeof db.useQuery>[0])
      : null,
  );

  const ownedShare =
    ((data?.filmsShares ?? []) as { id?: string; shareToken?: string | null }[])[0] ?? null;

  const ensureShareToken = React.useCallback(async () => {
    if (!user) return null;
    const existingToken = ownedShare?.shareToken ?? localShareToken;
    if (existingToken) return existingToken;

    const token = crypto.randomUUID();
    if (ownedShare?.id) {
      await db.transact(db.tx.filmsShares[ownedShare.id].update({ shareToken: token }));
    } else {
      await db.transact(
        db.tx.filmsShares[instantId()].update({
          ownerId: user.id,
          shareToken: token,
        }),
      );
    }
    setLocalShareToken(token);
    return token;
  }, [user, ownedShare?.id, ownedShare?.shareToken, localShareToken]);

  const handleShareInvitePress = React.useCallback(async () => {
    if (!user) return;

    const canNativeShare =
      isIPhoneDevice() &&
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function";

    if (canNativeShare) {
      try {
        const token = await ensureShareToken();
        if (!token || typeof window === "undefined") return;
        const url = `${window.location.origin}/deel/films-series/${encodeURIComponent(token)}`;
        await navigator.share({
          title: "Lijstje delen",
          text: "Schrijf mee op dit films-en-series lijstje:",
          url,
        });
      } catch (e) {
        const err = e as { name?: string };
        if (err?.name === "AbortError") return;
        setShareModalOpen(true);
      }
      return;
    }

    await ensureShareToken();
    setShareModalOpen(true);
  }, [user, ensureShareToken]);

  const shareUrl = React.useMemo(() => {
    const tok = ownedShare?.shareToken ?? localShareToken;
    if (!tok || typeof window === "undefined") return "";
    return `${window.location.origin}/deel/films-series/${encodeURIComponent(tok)}`;
  }, [ownedShare?.shareToken, localShareToken]);

  if (authLoading || !user || isLoading) {
    return <PageSpinner />;
  }

  const avatar = (url: string | null | undefined, name: string | null | undefined, extra?: string) => (
    <span className={cn("flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--blue-50)] shadow-[0_0_0_2px_var(--white)]", extra)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="size-full object-cover" />
      ) : (
        <span className="text-[11px] font-bold text-[var(--blue-500)]">{(name ?? "?").slice(0, 1).toUpperCase()}</span>
      )}
    </span>
  );
  const shared = isFilmsListShared && Boolean(partnerName);

  return (
    <div className="relative flex min-h-dvh w-full flex-col">
      {/* Mobiel: topbalk met terugpijl; desktop: ronde terugknop naast de titel (zoals «11 · instellingen»). */}
      <div className="fixed left-0 right-0 top-0 z-10 w-full bg-[var(--bg-app)] pt-[env(safe-area-inset-top,0px)] lg:hidden">
        <header className="relative mx-auto flex h-16 max-w-[956px] items-center px-4">
          <Link
            href="/films-series"
            aria-label="Terug naar films en series"
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-action-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <BackArrowIcon className="size-6" />
          </Link>
          <p className="flex-1 text-center text-base font-medium leading-6 text-[var(--text-primary)]">Instellingen</p>
          <span className="size-10 shrink-0" aria-hidden />
        </header>
      </div>

      <main className="mx-auto flex w-full max-w-[956px] flex-1 flex-col gap-3.5 px-4 pb-[calc(40px+env(safe-area-inset-bottom,0px))] pt-[calc(64px+12px+env(safe-area-inset-top,0px))] lg:pt-[calc(40px+env(safe-area-inset-top,0px))]">
        <div className="mb-1 hidden items-center gap-3 lg:flex">
          <PageBackButton href="/films-series" label="Terug naar films en series" />
          <h1 className="text-page-title font-bold leading-32 tracking-tight text-[var(--text-primary)]">Instellingen</h1>
        </div>

        {/* Canvas «23 · Films-instellingen — voorstel» */}
        <div className="flex flex-col gap-3.5 lg:grid lg:grid-cols-[1fr_1.2fr] lg:items-start lg:gap-4">
          <section className="rounded-[20px] bg-[var(--white)] p-[18px] shadow-[0_1px_2px_rgba(16,17,48,0.04)]">
            <div className="flex items-center gap-4">
              <span className="flex size-[72px] shrink-0 items-center justify-center rounded-[20px] bg-[var(--blue-25)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/ui/films_160.webp" alt="" width={54} height={54} className="size-[54px] object-contain" />
              </span>
              <div className="min-w-0">
                <h2 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">Films &amp; series</h2>
                <p className="mt-1 text-[13px] text-[var(--text-secondary)]">
                  {filmCount} {filmCount === 1 ? "film" : "films"} · {seriesCount} {seriesCount === 1 ? "serie" : "series"} op je watchlist
                </p>
              </div>
            </div>
            <div className="mt-3.5 flex items-center gap-2.5 border-t border-[var(--border-subtle)] pt-3.5">
              <span className="flex">
                {avatar(userAvatarUrl, userName, "z-[1]")}
                {shared ? avatar(partnerAvatarUrl, partnerName, "-ml-[9px]") : null}
              </span>
              <span className="text-[13.5px] text-[var(--text-secondary)]">
                {shared ? (
                  <>
                    Je deelt dit met <b className="font-bold text-[var(--text-primary)]">{partnerName}</b>
                  </>
                ) : (
                  "Nog niet gedeeld"
                )}
              </span>
            </div>
          </section>

          <section className="rounded-[20px] bg-[var(--white)] px-3.5 py-1 shadow-[0_1px_2px_rgba(16,17,48,0.04)]">
            <button
              type="button"
              onClick={() => void handleShareInvitePress()}
              className="flex w-full items-center gap-3 px-1 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--border-focus)]"
            >
              <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-[var(--blue-50)] text-[var(--blue-500)]" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-[17px]">
                  <circle cx="18" cy="6" r="2.5" />
                  <circle cx="6" cy="12" r="2.5" />
                  <circle cx="18" cy="18" r="2.5" />
                  <path d="M8.2 10.8l7.6-3.6M8.2 13.2l7.6 3.6" />
                </svg>
              </span>
              <span className="min-w-0 flex-1 leading-[19px]">
                <span className="block text-[15.5px] font-semibold text-[var(--text-primary)]">Lijstje delen</span>
                <span className="block text-[13px] text-[var(--text-secondary)]">
                  {shared ? `Kijk samen met ${partnerName}` : "Nodig iemand uit om samen te kijken"}
                </span>
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="size-4 shrink-0 text-[var(--text-tertiary)]">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </section>
        </div>
      </main>

      <ShareListModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        shareUrl={shareUrl}
        urlReady={Boolean(shareUrl)}
      />
    </div>
  );
}
