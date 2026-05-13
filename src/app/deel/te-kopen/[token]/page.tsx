"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";

function joinGuardKey(shareId: string, userId: string) {
  return `shoppinglist-te-kopen-deel-join:${shareId}:${userId}`;
}

export default function DeelTeKopenUitnodigingPage() {
  const router = useRouter();
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";

  const { isLoading: authLoading, user } = db.useAuth();

  const inviteQuery =
    token.length > 0
      ? {
          shoppingShares: {
            memberships: {},
            $: { where: { shareToken: token } },
          },
        }
      : {
          shoppingShares: {
            memberships: {},
            $: { where: { ownerId: "__deel_te_kopen_no_token__" } },
          },
        };

  const { isLoading, error, data } = db.useQuery(
    inviteQuery as unknown as Parameters<typeof db.useQuery>[0],
  );

  const share = data?.shoppingShares?.[0];
  const shareId = share?.id;
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [joining, setJoining] = React.useState(false);

  React.useEffect(() => {
    if (!authLoading && !user) {
      const next = `/deel/te-kopen/${encodeURIComponent(token)}`;
      router.replace(`/auth?next=${encodeURIComponent(next)}`);
    }
  }, [authLoading, user, router, token]);

  const alreadyMember = React.useMemo(() => {
    if (!user || !share?.memberships) return false;
    return share.memberships.some((m) => m.instantUserId === user.id);
  }, [share?.memberships, user]);

  React.useEffect(() => {
    if (authLoading || !user || !token) return;
    if (isLoading) return;
    if (error) {
      setJoinError(error.message);
      return;
    }
    if (!share || !shareId) {
      setJoinError("Deze uitnodigingslink is ongeldig of verlopen.");
      return;
    }

    if (share.ownerId === user.id || alreadyMember) {
      router.replace("/te-kopen");
      return;
    }

    const guard = joinGuardKey(shareId, user.id);
    if (typeof window !== "undefined") {
      if (sessionStorage.getItem(guard)) return;
      sessionStorage.setItem(guard, "1");
    }

    if (joining) return;
    setJoining(true);
    setJoinError(null);

    db.transact(
      db.tx.shoppingShareMembers[iid()]
        .update({ instantUserId: user.id })
        .link({ shoppingShare: shareId }),
    )
      .then(() => {
        router.replace("/te-kopen");
      })
      .catch((e: unknown) => {
        if (typeof window !== "undefined") {
          sessionStorage.removeItem(guard);
        }
        setJoining(false);
        setJoinError(
          e instanceof Error ? e.message : "Kon niet deelnemen aan dit lijstje.",
        );
      });
  }, [
    authLoading,
    user,
    token,
    isLoading,
    error,
    share,
    shareId,
    alreadyMember,
    joining,
    router,
  ]);

  if (!token) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-center text-base text-[var(--text-secondary)]">
          Ontbrekende uitnodiging.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--white)] px-4">
      <p className="text-center text-base font-medium text-[var(--text-primary)]">
        {joining || (user && isLoading)
          ? "Uitnodiging verwerken…"
          : "Even geduld…"}
      </p>
      {joinError ? (
        <p className="max-w-md text-center text-sm text-[var(--error-600)]">
          {joinError}
        </p>
      ) : null}
      {joinError ? (
        <button
          type="button"
          className="text-sm font-medium text-[var(--blue-500)] underline"
          onClick={() => router.replace("/")}
        >
          Naar start
        </button>
      ) : null}
    </div>
  );
}
