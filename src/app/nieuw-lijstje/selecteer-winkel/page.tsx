"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { SearchBar } from "@/components/ui/search_bar";
import { PageBackButton } from "@/components/ui/page_back_button";
import {
  isEmptyDraftMasterList,
  markDraftMasterList,
  useCleanupDraftMasterLists,
} from "@/lib/draft-master-lists";
import { db } from "@/lib/db";
import {
  MASTER_STORE_OPTIONS,
  findMasterStoreBySlug,
} from "@/lib/master-stores";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";

/** Zelfde pijl als SlideInModal — public/icons/arrow.svg */
function BackArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M3.59377 12.31C3.60777 12.329 3.61477 12.351 3.63177 12.368L9.23178 17.968C9.33378 18.069 9.46678 18.119 9.59978 18.119C9.73278 18.119 9.86678 18.068 9.96778 17.968C10.1698 17.765 10.1698 17.435 9.96778 17.232L5.25578 12.521L19.9998 12.521C20.2868 12.521 20.5198 12.288 20.5198 12.001C20.5198 11.714 20.2868 11.48 19.9998 11.48L5.25477 11.48L9.96678 6.768C10.1688 6.565 10.1688 6.236 9.96577 6.033C9.76477 5.83 9.43378 5.83 9.23078 6.033L3.63078 11.633C3.61378 11.65 3.60577 11.673 3.59177 11.692C3.56477 11.727 3.53678 11.76 3.51978 11.801C3.46678 11.929 3.46678 12.072 3.51978 12.2C3.53778 12.241 3.56677 12.275 3.59377 12.31Z"
        fill="currentColor"
      />
    </svg>
  );
}

function SelecteerWinkelContent() {
  const router = useRouter();

  const { isLoading: authLoading, user } = db.useAuth();
  const ownerId = user?.id ?? "__no_user__";

  const { isLoading, error, data } = db.useQuery({
    lists: {
      items: {},
      $: { where: { ownerId } },
    },
  });

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  const [query, setQuery] = React.useState("");
  /** Gekozen winkel blijft zichtbaar tot de volgende pagina open is (geen verspringend raster). */
  const [pickedSlug, setPickedSlug] = React.useState<string | null>(null);

  // Opruimen bij het openen (bv. na «terug»), maar niet meer zodra je net een winkel koos.
  useCleanupDraftMasterLists(pickedSlug ? undefined : data?.lists);

  /** Winkels waarvoor je al een favorietenlijst hebt, tonen we niet (geen dubbele lijsten). */
  const availableStores = React.useMemo(() => {
    const masters = (data?.lists ?? []).filter((l) => l.isMasterTemplate);
    const q = query.trim().toLowerCase();
    return MASTER_STORE_OPTIONS.filter(
      (store) =>
        store.slug === pickedSlug ||
        !masters.some(
          (l) => !isEmptyDraftMasterList(l) && (l.icon === store.logoSrc || l.name === store.label),
        ),
    ).filter((store) => !q || store.label.toLowerCase().includes(q));
  }, [data?.lists, query, pickedSlug]);

  const handlePickStore = React.useCallback(
    (slug: string) => {
      if (!user) return;
      const store = findMasterStoreBySlug(slug);
      if (!store || pickedSlug) return;
      setPickedSlug(slug);
      const myLists = data?.lists ?? [];
      const order =
        myLists.length > 0
          ? Math.min(...myLists.map((l) => l.order ?? 0)) - 1
          : 0;
      const now = new Date();
      const newId = iid();
      db.transact(
        db.tx.lists[newId].update({
          name: store.label,
          date: now.toLocaleDateString("nl-NL"),
          icon: store.logoSrc,
          order,
          ownerId: user.id,
          isMasterTemplate: true,
        }),
      );
      // Concept tot de eerste favoriet: zonder favorieten terugkeren ruimt de lijst op.
      markDraftMasterList(newId);
      router.push(`/lijstje/${newId}?nieuweFavorieten=1`);
    },
    [user, data?.lists, router, pickedSlug],
  );

  if (authLoading || !user || isLoading) {
    return <PageSpinner />;
  }

  if (error) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-base text-[var(--error-600)]">
          Er ging iets mis: {error.message}
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-[var(--bg-app)] px-4">
      {/* Mobiel: topbalk met terugpijl; desktop: ronde terugknop naast de titel. */}
      <div className="fixed left-0 right-0 top-0 z-20 bg-[var(--bg-app)] pt-[env(safe-area-inset-top,0px)] lg:hidden">
        <header className="mx-auto flex h-16 max-w-[956px] items-center px-4">
          <Link
            href="/"
            aria-label="Terug"
            className="flex size-10 items-center justify-center rounded-full text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <BackArrowIcon className="size-6 shrink-0" />
          </Link>
        </header>
      </div>

      <div className="flex flex-1 flex-col pb-[110px] pt-[calc(64px+8px+env(safe-area-inset-top,0px))] lg:pt-[calc(40px+env(safe-area-inset-top,0px))]">
        <div className="mx-auto flex w-full max-w-[956px] flex-1 flex-col gap-4 lg:gap-5">
          {/* Canvas «08 · kies winkel — voorstel» */}
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-4">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <PageBackButton href="/" label="Terug" />
              <div className="min-w-0">
                <h1 className="text-page-title font-bold leading-32 tracking-tight text-text-primary">
                  Nieuwe favorietenlijst
                </h1>
                <p className="mt-0.5 text-[13px] leading-[18px] text-[var(--text-secondary)]">
                  Kies de winkel waarvoor je je vaste producten wil bewaren
                </p>
              </div>
            </div>
            <SearchBar
              className="!bg-[var(--white)] shadow-[0_1px_2px_rgba(16,17,48,0.04)] lg:w-[300px]"
              value={query}
              onValueChange={setQuery}
              placeholder="Zoek een winkel"
            />
          </div>

          {availableStores.length === 0 ? (
            <p className="py-10 text-center text-[15px] text-[var(--text-tertiary)]">
              {query.trim()
                ? `Geen winkel gevonden voor «${query.trim()}».`
                : "Je hebt voor elke winkel al een favorietenlijst."}
            </p>
          ) : (
            <div className="grid w-full min-w-0 grid-cols-3 gap-2.5 lg:grid-cols-6 lg:gap-3">
              {availableStores.map((store) => (
                <button
                  key={store.slug}
                  type="button"
                  aria-label={`Favorietenlijst maken voor ${store.label}`}
                  onClick={() => handlePickStore(store.slug)}
                  className="flex h-[104px] min-w-0 flex-col items-center justify-center gap-[9px] rounded-[20px] bg-[var(--white)] px-2 shadow-[0_1px_2px_rgba(16,17,48,0.04)] transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus lg:h-[116px]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- winkellogo */}
                  <img src={store.logoSrc} alt="" width={46} height={46} className="size-10 object-contain lg:size-[46px]" aria-hidden />
                  <span className="w-full truncate text-[13.5px] font-semibold text-text-primary">{store.label}</span>
                </button>
              ))}
            </div>
          )}
          {availableStores.length > 0 && !query.trim() ? (
            <p className="text-center text-[12.5px] text-[var(--text-tertiary)]">
              Winkels waarvoor je al favorieten hebt, staan hier niet meer
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function SelecteerWinkelPage() {
  return (
    <Suspense
      fallback={<PageSpinner />}
    >
      <SelecteerWinkelContent />
    </Suspense>
  );
}
