"use client";

import * as React from "react";
import { Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { Button } from "@/components/ui/button";
import { LogoTile } from "@/components/ui/logo_tile";
import { db } from "@/lib/db";
import {
  MASTER_STORE_OPTIONS,
  findMasterStoreBySlug,
} from "@/lib/master-stores";
import { cn } from "@/lib/utils";
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

function StoreLogoImg({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt=""
      width={48}
      height={48}
      className="size-12 max-h-full max-w-full object-contain"
      aria-hidden
    />
  );
}

function SelecteerWinkelContent() {
  const router = useRouter();

  const { isLoading: authLoading, user } = db.useAuth();
  const ownerId = user?.id ?? "__no_user__";

  const { isLoading, error, data } = db.useQuery({
    lists: {
      $: { where: { ownerId } },
    },
  });

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  const handlePickStore = React.useCallback(
    (slug: string) => {
      if (!user) return;
      const store = findMasterStoreBySlug(slug);
      if (!store) return;
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
      router.push(`/lijstje/${newId}`);
    },
    [user, data?.lists, router],
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
    <div className="relative flex min-h-dvh w-full flex-col px-4">
      <div className="flex flex-1 flex-col pb-[96px] pt-[calc(52px+env(safe-area-inset-top,0px))]">
        <div className="mx-auto flex w-full max-w-[956px] flex-1 flex-col">
          <header className="mb-6 flex min-w-0 items-center gap-4">
            <Link
              href="/"
              aria-label="Terug naar lijstjes"
              className="relative z-[1] flex !min-w-0 !w-10 size-10 shrink-0 items-center justify-center p-0 text-[var(--blue-500)] hover:bg-[var(--blue-25)] hover:text-[var(--blue-600)] focus-visible:ring-2 focus-visible:ring-border-focus rounded-md"
            >
              <BackArrowIcon className="size-6 shrink-0" />
            </Link>
            <h1 className="min-w-0 flex-1 text-page-title font-bold leading-32 tracking-normal text-text-primary">
              Selecteer winkel
            </h1>
          </header>

          <div className="grid w-full min-w-0 grid-cols-3 gap-3 sm:gap-4">
            {MASTER_STORE_OPTIONS.map((store) => (
              <button
                key={store.slug}
                type="button"
                aria-label={`Selecteer ${store.label}`}
                title={store.label}
                onClick={() => handlePickStore(store.slug)}
                className={cn(
                  "flex h-full min-h-[6.5rem] min-w-0 flex-col items-stretch rounded-md border-0 bg-transparent p-0",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2",
                )}
              >
                <LogoTile
                  className="h-full min-h-[6.5rem] w-full min-w-0 justify-between"
                  label={store.label}
                  logo={<StoreLogoImg src={store.logoSrc} />}
                />
              </button>
            ))}
          </div>
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
