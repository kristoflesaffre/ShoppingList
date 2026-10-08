"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import { InviteIcons, InvitePlate, InviteTile, ShareInvite } from "@/components/share_invite";

/**
 * Recept-uitnodiging (canvas «24 · Recept gedeeld»): recept bekijken en met «Recept bewaren»
 * kopiëren naar de eigen recepten; daarna door naar /recepten/[id].
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

  const ingredientCount = (recipe?.ingredients ?? []).length;
  const persons = typeof recipe?.persons === "number" ? recipe.persons : null;
  const loading = Boolean(token) && (authLoading || !user || isLoading);
  const invalid = !token || Boolean(error) || (!loading && !recipe);

  return (
    <ShareInvite
      state={invalid ? "error" : loading ? "loading" : copying || done ? "busy" : "ready"}
      eyebrow="Recept gedeeld"
      visual={recipe?.photoUrl ? <InvitePlate src={recipe.photoUrl} /> : <InviteTile src="/images/ui/recept_160.webp" tint />}
      title={recipe?.name ?? "Recept"}
      subtitle={[
        ingredientCount > 0 ? `${ingredientCount} ${ingredientCount === 1 ? "ingrediënt" : "ingrediënten"}` : null,
        persons ? `${persons} ${persons === 1 ? "persoon" : "personen"}` : null,
      ]
        .filter(Boolean)
        .join(" · ")}
      note="Je krijgt een eigen kopie in je recepten. Aanpassen kan zonder dat het origineel verandert."
      noteIcon={InviteIcons.copy}
      acceptLabel="Recept bewaren"
      busyLabel="Recept bewaren…"
      onAccept={() => void handleCopy()}
      onDecline={() => router.replace("/recepten")}
      errorText={error?.message ?? "Misschien werd het delen gestopt. Vraag om een nieuwe link."}
      errorActionLabel="Naar recepten"
      onErrorAction={() => router.replace("/recepten")}
      acceptError={copyError}
    />
  );
}
