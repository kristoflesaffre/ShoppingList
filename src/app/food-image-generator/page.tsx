"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { db } from "@/lib/db";
import { MiniButton } from "@/components/ui/mini_button";
import { FoodImageGenerator } from "@/components/food-image-generator";

function FoodImageGeneratorPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoading: authLoading, user } = db.useAuth();
  const initialDishName = (searchParams.get("dishName") ?? "").trim();

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--white)]">
        <p className="text-base text-[var(--text-secondary)]">Laden…</p>
      </div>
    );
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[956px] flex-col gap-6 bg-[var(--white)] px-4 py-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-page-title font-bold leading-32 tracking-normal text-[var(--text-primary)]">
          Food image generator
        </h1>
        <MiniButton variant="secondary" onClick={() => router.push("/recepten")}>
          Terug
        </MiniButton>
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
