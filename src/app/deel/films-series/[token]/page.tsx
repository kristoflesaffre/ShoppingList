"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import { InviteTile, ShareInvite } from "@/components/share_invite";

/**
 * Uitnodiging voor de films- en serielijst (canvas «24 · Gedeelde link»): eerst zien wat het is, dan «Meedoen».
 * Eigenaar of al lid → meteen door naar /films-series.
 */
export default function DeelFilmsSeriesUitnodigingPage() {
  const router = useRouter();
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";
  const { isLoading: authLoading, user } = db.useAuth();

  const query = {
    filmsShares: {
      memberships: {},
      $: { where: token.length > 0 ? { shareToken: token } : { ownerId: "__deel_films_series_no_token__" } },
    },
  };
  const { isLoading, error, data } = db.useQuery(
    (user ? query : null) as unknown as Parameters<typeof db.useQuery>[0],
  );
  const share = data?.filmsShares?.[0] as
    | { id: string; ownerId?: string; memberships?: { instantUserId?: string }[] }
    | undefined;
  const shareId = share?.id;
  const [state, setState] = React.useState<"ready" | "busy">("ready");
  const [joinError, setJoinError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!authLoading && !user) {
      const next = `/deel/films-series/${encodeURIComponent(token)}`;
      router.replace(`/auth?next=${encodeURIComponent(next)}`);
    }
  }, [authLoading, user, router, token]);

  const alreadyMember = Boolean(user && share?.memberships?.some((m) => m.instantUserId === user.id));
  const isOwner = Boolean(user && share?.ownerId === user.id);

  React.useEffect(() => {
    if (shareId && (isOwner || alreadyMember)) router.replace("/films-series");
  }, [shareId, isOwner, alreadyMember, router]);

  async function handleJoin() {
    if (!user || !shareId || state === "busy") return;
    setState("busy");
    setJoinError(null);
    try {
      await db.transact(db.tx.filmsShareMembers[iid()].update({ instantUserId: user.id }).link({ filmsShare: shareId }));
      router.replace("/films-series");
    } catch (e) {
      setState("ready");
      setJoinError(e instanceof Error ? e.message : "Kon niet deelnemen aan dit lijstje.");
    }
  }

  const loading = !token ? false : authLoading || !user || isLoading || isOwner || alreadyMember;
  const invalid = !token || Boolean(error) || (!loading && !share);

  return (
    <ShareInvite
      state={invalid ? "error" : loading ? "loading" : state}
      visual={<InviteTile src="/images/ui/films_160.webp" tint />}
      title="Films & series"
      subtitle="Een gedeelde watchlist"
      note="Jullie delen één watchlist en zien elkaars voorstellen."
      acceptLabel="Meedoen"
      busyLabel="Je doet mee…"
      onAccept={() => void handleJoin()}
      onDecline={() => router.replace("/")}
      errorText={error?.message ?? "Misschien werd het delen gestopt. Vraag om een nieuwe link."}
      onErrorAction={() => router.replace("/")}
      acceptError={joinError}
    />
  );
}
