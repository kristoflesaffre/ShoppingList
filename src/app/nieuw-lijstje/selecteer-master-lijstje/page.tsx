"use client";

import * as React from "react";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { ListCard } from "@/components/ui/list_card";
import { defaultNewListName } from "@/lib/list-default-name";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import {
  listIsMasterTemplate,
  type ListMasterTemplateFields,
} from "@/lib/list-master";

/** Zelfde pijl als SlideInModal — public/icons/arrow.svg */
function BackArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M3.59377 12.31C3.60777 12.329 3.61477 12.351 3.63177 12.368L9.23178 17.968C9.33378 18.069 9.46678 18.119 9.59978 18.119C9.73278 18.119 9.86678 18.068 9.96778 17.968C10.1698 17.765 10.1698 17.435 9.96778 17.232L5.25578 12.521L19.9998 12.521C20.2868 12.521 20.5198 12.288 20.5198 12.001C20.5198 11.714 20.2868 11.48 19.9998 11.48L5.25477 11.48L9.96678 6.768C10.1688 6.565 10.1688 6.236 9.96577 6.033C9.76477 5.83 9.43378 5.83 9.23078 6.033L3.63078 11.633C3.61378 11.65 3.60577 11.673 3.59177 11.692C3.56477 11.727 3.53678 11.76 3.51978 11.801C3.46677 11.929 3.46677 12.072 3.51978 12.2C3.53778 12.241 3.56677 12.275 3.59377 12.31Z"
        fill="currentColor"
      />
    </svg>
  );
}

function StoreLogoImg({ src }: { src: string }) {
  return (
    <Image
      src={src}
      alt=""
      width={48}
      height={48}
      className="size-12 max-h-full max-w-full object-contain"
      aria-hidden
    />
  );
}

type MasterListRow = {
  id: string;
  name: string;
  icon: string;
  order?: number;
  items?: { id: string }[];
};

function SelecteerMasterLijstPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listNameRaw = searchParams.get("naam") ?? "";

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

  const masterLists: MasterListRow[] = React.useMemo(() => {
    const rawLists = data?.lists ?? [];
    const template = rawLists
      .filter(
        (l: unknown) =>
          typeof l === "object" &&
          l != null &&
          listIsMasterTemplate(l as ListMasterTemplateFields),
      )
      .map((l: any) => ({
        id: String(l.id),
        name: String(l.name ?? "Master lijstje"),
        icon: String(l.icon ?? ""),
        order: typeof l.order === "number" ? l.order : 0,
        items: Array.isArray(l.items) ? l.items : [],
      }));
    template.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return template;
  }, [data?.lists]);

  const handlePickMaster = React.useCallback(
    (template: MasterListRow) => {
      if (!user) return;
      const name = listNameRaw.trim() || defaultNewListName();
      router.push(
        `/nieuw-lijstje/selecteer-master-lijstje/${encodeURIComponent(
          template.id,
        )}/items?naam=${encodeURIComponent(name)}`,
      );
    },
    [listNameRaw, router, user],
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
    <div className="relative flex min-h-dvh w-full flex-col bg-gradient-to-b from-[#dcddfc] to-[var(--white)] px-4">
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
              Selecteer master lijstje
            </h1>
          </header>

          {masterLists.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-6">
              <p className="text-center text-base font-medium leading-24 tracking-normal text-[var(--text-tertiary)]">
                Je hebt nog geen masterlijstjes
              </p>
            </div>
          ) : (
            <div className="flex w-full min-w-0 flex-col gap-3">
              {masterLists.map((ml) => {
                const count = ml.items?.length ?? 0;
                const itemCountLabel = count === 1 ? "1 item" : `${count} items`;
                return (
                  <ListCard
                    key={ml.id}
                    listName={ml.name}
                    itemCount={itemCountLabel}
                    icon={<StoreLogoImg src={ml.icon} />}
                    onClick={() => handlePickMaster(ml)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handlePickMaster(ml);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    className="cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

export default function SelecteerMasterLijstPage() {
  return (
    <Suspense
      fallback={<PageSpinner />}
    >
      <SelecteerMasterLijstPageContent />
    </Suspense>
  );
}

