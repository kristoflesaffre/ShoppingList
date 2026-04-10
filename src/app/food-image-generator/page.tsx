"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/db";
import { MiniButton } from "@/components/ui/mini_button";
import { FoodImageGenerator } from "@/components/food-image-generator";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";

function FoodImageGeneratorPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading: authLoading, user } = db.useAuth();
  const initialDishName = (searchParams.get("dishName") ?? "").trim();

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return <PageSpinner surface="white" />;
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[956px] flex-col gap-6 bg-[var(--white)] px-4 py-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-page-title font-bold leading-32 tracking-normal text-[var(--text-primary)]">
          Food image generator
        </h1>
        <Link href="/recepten" className="no-underline">
          <MiniButton variant="secondary">
            Terug
          </MiniButton>
        </Link>
      </div>

      <p className="text-sm leading-20 text-[var(--text-secondary)]">
        Genereer consistente top-down premium food images met OpenAI en 4 vaste referentiebeelden.
      </p>

      <FoodImageGenerator
        ownerId={user.id}
        initialDishName={initialDishName}
      />
    </main>
  );
}

export default function FoodImageGeneratorPage() {
  return (
    <React.Suspense>
      <FoodImageGeneratorPageInner />
    </React.Suspense>
  );
}
