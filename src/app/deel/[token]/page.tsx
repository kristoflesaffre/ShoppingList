"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";

function joinGuardKey(listId: string, userId: string) {
  return `shoppinglist-deel-join:${listId}:${userId}`;
}

/**
 * Uitnodiging accepteren: na inloggen wordt de gebruiker gekoppeld als
 * listMember aan het lijstje en doorgestuurd naar /lijstje/[id].
 */
export default function DeelUitnodigingPage() {
  const router = useRouter();
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";

  const { isLoading: authLoading, user } = db.useAuth();

  /** Lege token: query die nooit matcht (hooks blijven stabiel). */
  const inviteQuery =
    token.length > 0
      ? {
          lists: {
            memberships: {},
            $: { where: { shareToken: token } },
          },
        }
      : {
          lists: {
            memberships: {},
            $: { where: { ownerId: "__deel_page_no_token__" } },
          },
        };

  // Instant typed queries verwachten NonEmpty strings; dynamische route-token casten we.
  const { isLoading, error, data } = db.useQuery(
    inviteQuery as unknown as Parameters<typeof db.useQuery>[0],
  );

  const list = data?.lists?.[0];
  const listId = list?.id;
  const [joinError, setJoinError] = React.useState<string | null>(null);
  const [joining, setJoining] = React.useState(false);

  React.useEffect(() => {
    if (!authLoading && !user) {
      const next = `/deel/${encodeURIComponent(token)}`;
      router.replace(`/auth?next=${encodeURIComponent(next)}`);
    }
  }, [authLoading, user, router, token]);

  const alreadyMember = React.useMemo(() => {
    if (!user || !list?.memberships) return false;
    return list.memberships.some((m) => m.instantUserId === user.id);
  }, [list?.memberships, user]);

  React.useEffect(() => {
    if (authLoading || !user || !token) return;
    if (isLoading) return;
    if (error) {
      setJoinError(error.message);
      return;
    }
    if (!list || !listId) {
      setJoinError("Deze uitnodigingslink is ongeldig of verlopen.");
      return;
    }

    if (list.ownerId === user.id) {
      router.replace(`/lijstje/${listId}`);
      return;
    }

    if (alreadyMember) {
      router.replace(`/lijstje/${listId}`);
      return;
    }

    const guard = joinGuardKey(listId, user.id);
    if (typeof window !== "undefined") {
      if (sessionStorage.getItem(guard)) {
        /** Strict Mode / dubbele effect: join al gestart; wacht tot membership in query zit. */
        return;
      }
      sessionStorage.setItem(guard, "1");
    }

    if (joining) return;
    setJoining(true);
    setJoinError(null);

    /** Instant vereist een UUID als entity-id (geen custom string). */
    const memberId = iid();
    db.transact(
      db.tx.listMembers[memberId]
        .update({ instantUserId: user.id })
        .link({ list: listId }),
    )
      .then(() => {
        router.replace(`/lijstje/${listId}`);
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
    list,
    listId,
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
