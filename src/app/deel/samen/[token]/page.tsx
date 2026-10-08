"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import { InviteTile, ShareInvite } from "@/components/share_invite";
import {
  ALL_KINDS,
  AUTO_SHARE_KIND_META,
  parseAutoShareKinds,
  shareExistingListsTransactions,
  useAutoShare,
  type OwnedListRow,
} from "@/lib/auto-share";

const NO_MATCH = "__deel_samen_geen_token__";

/**
 * Algemene uitnodiging («Samen delen» in het profiel), canvas «24 · Gedeelde link». Na «Meedoen» worden beide mensen
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
  const [busy, setBusy] = React.useState(false);

  const ready = !authLoading && Boolean(user) && !ownerLoading && !listsLoading && !me.isLoading;
  const invalid = !token || (ready && !owner?.instantUserId);

  // Eigen uitnodiging geopend → naar de deelinstellingen.
  React.useEffect(() => {
    if (ready && owner?.instantUserId && user && owner.instantUserId === user.id) router.replace("/profiel/delen");
  }, [ready, owner, user, router]);

  async function handleAccept() {
    if (!ready || !user || !owner?.instantUserId || busy) return;
    setBusy(true);
    setError(null);
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
    try {
      if (txs.length > 0) await db.transact(txs);
      router.replace("/");
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "Kon de uitnodiging niet verwerken.");
    }
  }

  const name = owner?.firstName?.trim() || "Iemand";
  const kinds = owner ? ALL_KINDS.filter((k) => parseAutoShareKinds(owner.autoShareKindsJson).has(k)) : [];
  const kindLabels = kinds.map((k) => AUTO_SHARE_KIND_META[k].label.toLowerCase());
  const kindText =
    kindLabels.length === 0
      ? "lijstjes"
      : kindLabels.length === 1
        ? `${kindLabels[0]}lijstjes`
        : `${kindLabels.slice(0, -1).join(", ")} en ${kindLabels[kindLabels.length - 1]}lijstjes`;

  return (
    <ShareInvite
      state={invalid ? "error" : !ready || owner?.instantUserId === user?.id ? "loading" : busy ? "busy" : "ready"}
      visual={<InviteTile src={kinds[0] ? AUTO_SHARE_KIND_META[kinds[0]].imageSrc : "/images/ui/vrienden_160.webp"} tint />}
      title={`${name} wil samen delen`}
      subtitle={kinds.length > 0 ? kinds.map((k) => AUTO_SHARE_KIND_META[k].label).join(" · ") : undefined}
      note={`Jullie ${kindText} worden voortaan automatisch gedeeld, in beide richtingen.`}
      acceptLabel="Meedoen"
      busyLabel="Je doet mee…"
      onAccept={() => void handleAccept()}
      onDecline={() => router.replace("/")}
      onErrorAction={() => router.replace("/")}
      acceptError={error}
    />
  );
}
