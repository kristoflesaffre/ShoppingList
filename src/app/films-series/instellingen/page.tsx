"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { id as instantId } from "@instantdb/react";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import { db } from "@/lib/db";
import { cn, isIPhoneDevice } from "@/lib/utils";

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

function ChevronRightIcon() {
  return (
    <span
      aria-hidden
      className="inline-block size-6 shrink-0 bg-[var(--action-primary)]"
      style={{
        WebkitMaskImage: "url(/icons/chevron.svg)",
        maskImage: "url(/icons/chevron.svg)",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        transform: "rotate(-90deg)",
      }}
    />
  );
}

export default function FilmsSeriesInstellingenPage() {
  const router = useRouter();
  const { isLoading: authLoading, user } = db.useAuth();
  const [shareModalOpen, setShareModalOpen] = React.useState(false);
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
    return <PageSpinner surface="white" />;
  }

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-[var(--white)]">
      <div className="fixed top-0 left-0 right-0 z-10 w-full bg-[var(--white)] pt-[env(safe-area-inset-top,0px)]">
        <header className="relative mx-auto flex h-16 max-w-[956px] items-center px-4">
          <Link
            href="/films-series"
            aria-label="Terug naar films en series"
            className="flex size-10 shrink-0 items-center justify-center rounded-full text-action-primary transition-colors [@media(hover:hover)]:hover:bg-[var(--blue-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <BackArrowIcon className="size-6" />
          </Link>
          <p className="flex-1 text-center text-base font-medium leading-6 text-[var(--text-primary)]">
            Instellingen
          </p>
          <span className="size-10 shrink-0" aria-hidden />
        </header>
      </div>

      <main className="mx-auto flex w-full max-w-[956px] flex-1 flex-col px-4 pb-[calc(32px+env(safe-area-inset-bottom,0px))] pt-[calc(64px+env(safe-area-inset-top,0px))]">
        <div className="pt-8">
          <h1 className="text-[24px] font-bold leading-8 tracking-normal text-[var(--text-primary)]">
            Films en series
          </h1>
        </div>

        <div className="mt-6 flex flex-col divide-y divide-[var(--gray-100)]">
          <button
            type="button"
            onClick={() => void handleShareInvitePress()}
            className={cn(
              "flex w-full items-center gap-4 py-3 text-left transition-colors",
              "[@media(hover:hover)]:hover:bg-[var(--gray-50)]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
            )}
          >
            <span className="flex-1 text-base font-medium leading-6 text-[var(--text-primary)]">
              Lijstje delen
            </span>
            <ChevronRightIcon />
          </button>
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
