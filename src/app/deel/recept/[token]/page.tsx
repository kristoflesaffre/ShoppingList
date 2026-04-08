"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";

/**
 * Recept-uitnodiging accepteren: recept wordt gekopieerd naar de receptenlijst
 * van de ingelogde gebruiker en doorgestuurd naar /recepten/[id].
 */
export default function DeelReceptPage() {
  const router = useRouter();
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";

  const { isLoading: authLoading, user } = db.useAuth();

  const recipeQuery =
    token.length > 0
      ? {
          recipes: {
            ingredients: {},
            $: { where: { shareToken: token } },
          },
        }
      : {
          recipes: {
            ingredients: {},
            $: { where: { shareToken: "__deel_recept_no_token__" } },
          },
        };

  const { isLoading, error, data } = db.useQuery(
    recipeQuery as unknown as Parameters<typeof db.useQuery>[0],
  );

  const recipe = data?.recipes?.[0];

  const [copying, setCopying] = React.useState(false);
  const [copyError, setCopyError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);

  React.useEffect(() => {
    if (!authLoading && !user) {
      const next = `/deel/recept/${encodeURIComponent(token)}`;
      router.replace(`/auth?next=${encodeURIComponent(next)}`);
    }
  }, [authLoading, user, router, token]);

  const handleCopy = React.useCallback(async () => {
    if (!recipe || copying || done) return;
    setCopying(true);
    setCopyError(null);

    const newRecipeId = iid();
    const sortedIngredients = [...(recipe.ingredients ?? [])].sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0),
    );

    const txns = [
      db.tx.recipes[newRecipeId].update({
        name: recipe.name,
        link: recipe.link ?? "",
        ...(recipe.steps !== undefined ? { steps: recipe.steps } : {}),
        persons: recipe.persons,
        order: Date.now(),
        ...(recipe.photoUrl !== undefined ? { photoUrl: recipe.photoUrl } : {}),
      }),
      ...sortedIngredients.map((ing, i) => {
        const ingId = iid();
        return db.tx.recipeIngredients[ingId]
          .update({ name: ing.name, quantity: ing.quantity, order: i })
          .link({ recipe: newRecipeId });
      }),
    ];

    try {
      await db.transact(txns as Parameters<typeof db.transact>[0]);
      setDone(true);
      router.replace(`/recepten/${newRecipeId}`);
    } catch (err) {
      setCopyError(
        err instanceof Error ? err.message : "Kopiëren mislukt.",
      );
      setCopying(false);
    }
  }, [recipe, copying, done, router]);

  if (!token) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-center text-base text-[var(--text-secondary)]">
          Ontbrekende deellink.
        </p>
      </div>
    );
  }

  if (authLoading || (user && isLoading)) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-center text-base text-[var(--text-secondary)]">Even geduld…</p>
      </div>
    );
  }

  if (error || (!isLoading && !recipe)) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
        <p className="text-center text-base text-[var(--text-secondary)]">
          {error?.message ?? "Deze deellink is ongeldig of verlopen."}
        </p>
        <button
          type="button"
          className="text-sm font-medium text-[var(--blue-500)] underline"
          onClick={() => router.replace("/recepten")}
        >
          Naar recepten
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[var(--white)] px-4">
      {recipe ? (
        <>
          {recipe.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={recipe.photoUrl}
              alt=""
              className="size-[120px] rounded-full object-cover shadow-md"
            />
          ) : null}
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {recipe.name}
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              {(recipe.ingredients ?? []).length > 0
                ? `${(recipe.ingredients ?? []).length} ingrediënten`
                : null}
            </p>
          </div>

          {copyError ? (
            <p className="max-w-xs text-center text-sm text-[var(--error-600)]">
              {copyError}
            </p>
          ) : null}

          <button
            type="button"
            disabled={copying || done}
            onClick={() => void handleCopy()}
            className="min-w-[200px] rounded-full bg-[var(--blue-500)] px-6 py-3 text-base font-semibold text-white shadow-md transition-opacity active:opacity-80 disabled:opacity-50"
          >
            {copying ? "Recept toevoegen…" : "Recept toevoegen"}
          </button>
          <button
            type="button"
            className="text-sm text-[var(--text-tertiary)] underline"
            onClick={() => router.replace("/recepten")}
          >
            Annuleren
          </button>
        </>
      ) : (
        <p className="text-center text-base text-[var(--text-secondary)]">Even geduld…</p>
      )}
    </div>
  );
}
