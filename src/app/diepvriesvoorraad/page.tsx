"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { MiniButton } from "@/components/ui/mini_button";
import { db } from "@/lib/db";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";

export default function DiepvriesvoorraadPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = db.useAuth();

  if (authLoading) return <PageSpinner />;
  if (!user) {
    router.replace("/auth");
    return null;
  }

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-white">
      {/* Gradient achtergrond (Figma 1170:7316) */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[478px]"
        style={{ background: "linear-gradient(to bottom, #e3e4ff, white)" }}
        aria-hidden
      />

      {/* Header — wit, fixed bovenaan (zelfde patroon als andere pagina's) */}
      <div className="fixed left-0 right-0 top-0 z-20 bg-white pt-[env(safe-area-inset-top,0px)]">
        <header className="mx-auto flex h-16 max-w-[956px] items-center gap-4 px-4">
          <button
            type="button"
            aria-label="Terug"
            onClick={() => router.push("/")}
            className="flex size-6 shrink-0 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
          >
            <span
              className="inline-block size-6 shrink-0 bg-[var(--blue-500)]"
              style={{
                WebkitMaskImage: "url(/icons/arrow.svg)",
                maskImage: "url(/icons/arrow.svg)",
                WebkitMaskSize: "contain",
                maskSize: "contain",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskPosition: "center",
                maskPosition: "center",
              }}
              aria-hidden
            />
          </button>
          <p className="min-w-0 flex-1 text-center text-base font-medium leading-6 text-[var(--text-primary)]">
            Diepvriesvoorraad
          </p>
          {/* Placeholder voor symmetrie */}
          <div className="size-6 shrink-0" />
        </header>
      </div>

      {/* Empty state — gecentreerd in de resterende ruimte, compenseer fixed header */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-[env(safe-area-inset-bottom,0px)] pt-[calc(64px+env(safe-area-inset-top,0px))]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/ui/empty_state_diepvries.png"
          alt=""
          width={96}
          height={96}
          className="size-24 object-contain"
        />
        <p className="text-center text-base font-medium leading-6 text-[var(--text-tertiary)]">
          Je hebt geen items in je diepvriesvoorraad
        </p>
        <MiniButton variant="primary" onClick={() => {}}>
          Voeg item toe
        </MiniButton>
      </div>
    </div>
  );
}
