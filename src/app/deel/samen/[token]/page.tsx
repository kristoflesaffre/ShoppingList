"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import {
  ALL_KINDS,
  parseAutoShareKinds,
  shareExistingListsTransactions,
  useAutoShare,
  type OwnedListRow,
} from "@/lib/auto-share";

const NO_MATCH = "__deel_samen_geen_token__";

/**
 * Algemene uitnodiging («Samen delen» in het profiel). Na inloggen worden beide mensen
 * deelgenoten van elkaar (in beide richtingen): de ontvanger krijgt de lijstjes van de
 * soorten die de eigenaar deelt, neemt die soorten over en deelt zijn eigen lijstjes van
 * die soorten terug. Nieuwe lijstjes volgen via `useAutoShare`.
 */
export default function DeelSamenUitnodigingPage() {
  const router = useRouter();
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const { isLoading: authLoading, user } = db.useAuth();

  React.useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/auth?next=${encodeURIComponent(`/deel/samen/${token}`)}`);
    }
  }, [authLoading, user, router, token]);

  const { isLoading: ownerLoading, data: ownerData } = db.useQuery({
    profiles: { $: { where: { shareInviteToken: token || NO_MATCH } } },
  });
  const owner = ownerData?.profiles?.[0] as
    | { instantUserId?: string; firstName?: string | null; autoShareKindsJson?: string | null }
    | undefined;
  const ownerId = owner?.instantUserId ?? NO_MATCH;

  const { isLoading: listsLoading, data } = db.useQuery({
    lists: { memberships: {}, $: { where: { ownerId } } },
    sharePartners: { $: { where: { ownerId } } },
  });

  const me = useAutoShare(user?.id);
  const [error, setError] = React.useState<string | null>(null);
  const startedRef = React.useRef(false);

  React.useEffect(() => {
    if (authLoading || !user || ownerLoading || listsLoading || me.isLoading || startedRef.current) return;
    if (!owner?.instantUserId) {
      setError("Deze uitnodigingslink is ongeldig of verlopen.");
      return;
    }
    if (owner.instantUserId === user.id) {
      router.replace("/profiel/delen");
      return;
    }
    startedRef.current = true;

    const alreadyPartner = ((data?.sharePartners ?? []) as Array<{ partnerUserId?: string }>).some(
      (p) => p.partnerUserId === user.id,
    );
    const ownerKinds = parseAutoShareKinds(owner.autoShareKindsJson);
    const myKinds = new Set([...Array.from(me.enabledKinds), ...Array.from(ownerKinds)]);
    const txs = [
      ...(alreadyPartner
        ? []
        : [
            db.tx.sharePartners[iid()].update({
              ownerId: owner.instantUserId,
              partnerUserId: user.id,
              createdAtIso: new Date().toISOString(),
            }),
          ]),
      // Eigenaar → ontvanger
      ...shareExistingListsTransactions((data?.lists ?? []) as OwnedListRow[], ownerKinds, [user.id]),
      // Ontvanger neemt de soorten over en deelt terug
      db.tx.profiles[me.profileId ?? iid()].update({
        instantUserId: user.id,
        autoShareKindsJson: JSON.stringify(ALL_KINDS.filter((k) => myKinds.has(k))),
      }),
      ...shareExistingListsTransactions(me.ownedLists, myKinds, [owner.instantUserId]),
    ];

    (txs.length > 0 ? db.transact(txs) : Promise.resolve())
      .then(() => router.replace("/"))
      .catch((e: unknown) => {
        startedRef.current = false;
        setError(e instanceof Error ? e.message : "Kon de uitnodiging niet verwerken.");
      });
  }, [authLoading, user, ownerLoading, listsLoading, owner, data, router, me]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--white)] px-4">
      <p className="text-center text-base font-medium text-[var(--text-primary)]">
        {error ? "Uitnodiging" : "Uitnodiging verwerken…"}
      </p>
      {error ? (
        <>
          <p className="max-w-md text-center text-sm text-[var(--error-600)]">{error}</p>
          <button
            type="button"
            className="text-sm font-medium text-[var(--blue-500)] underline"
            onClick={() => router.replace("/")}
          >
            Naar start
          </button>
        </>
      ) : null}
    </div>
  );
}
