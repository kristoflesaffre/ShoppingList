"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import { homeListCardIconSrc } from "@/lib/list-product-icons";
import { masterStoreLabelFromListIcon } from "@/lib/master-stores";
import { InviteTile, ShareInvite } from "@/components/share_invite";

/**
 * Uitnodiging voor een lijstje (canvas «24 · Uitnodiging lijstje»): eerst zien welk lijstje het
 * is, dan «Meedoen» → gekoppeld als listMember en door naar /lijstje/[id]. Eigenaar of al lid →
 * meteen door.
 */
export default function DeelUitnodigingPage() {
  const router = useRouter();
  const params = useParams();
  const token = typeof params.token === "string" ? params.token : "";

  const { isLoading: authLoading, user } = db.useAuth();

  /** Lege token: query die nooit matcht (hooks blijven stabiel). */
  const inviteQuery = {
    lists: {
      memberships: {},
      items: {},
      $: { where: token.length > 0 ? { shareToken: token } : { ownerId: "__deel_page_no_token__" } },
    },
  };

  // Instant typed queries verwachten NonEmpty strings; dynamische route-token casten we.
  const { isLoading, error, data } = db.useQuery(
    (user ? inviteQuery : null) as unknown as Parameters<typeof db.useQuery>[0],
  );

  const list = data?.lists?.[0] as
    | (Record<string, unknown> & {
        id: string;
        name?: string;
        icon?: string;
        ownerId?: string;
        memberships?: { instantUserId?: string }[];
        items?: unknown[];
      })
    | undefined;
  const listId = list?.id;
  const [state, setState] = React.useState<"ready" | "busy">("ready");
  const [joinError, setJoinError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!authLoading && !user) {
      const next = `/deel/${encodeURIComponent(token)}`;
      router.replace(`/auth?next=${encodeURIComponent(next)}`);
    }
  }, [authLoading, user, router, token]);

  const alreadyMember = Boolean(user && list?.memberships?.some((m) => m.instantUserId === user.id));
  const isOwner = Boolean(user && list?.ownerId === user.id);

  React.useEffect(() => {
    if (listId && (isOwner || alreadyMember)) router.replace(`/lijstje/${listId}`);
  }, [listId, isOwner, alreadyMember, router]);

  async function handleJoin() {
    if (!user || !listId || state === "busy") return;
    setState("busy");
    setJoinError(null);
    try {
      /** Instant vereist een UUID als entity-id (geen custom string). */
      await db.transact(db.tx.listMembers[iid()].update({ instantUserId: user.id }).link({ list: listId }));
      router.replace(`/lijstje/${listId}`);
    } catch (e) {
      setState("ready");
      setJoinError(e instanceof Error ? e.message : "Kon niet deelnemen aan dit lijstje.");
    }
  }

  const loading = !token ? false : authLoading || !user || isLoading || isOwner || alreadyMember;
  const invalid = !token || Boolean(error) || (!loading && !list);

  const masterIcon = String(list?.masterIcon ?? "");
  const storeIcon = masterIcon.startsWith("/logos/") ? masterIcon : String(list?.icon ?? "").startsWith("/logos/") ? String(list?.icon) : "";
  const customIconUrl = typeof list?.customIconUrl === "string" ? (list.customIconUrl as string) : null;
  const tileIcon =
    customIconUrl ??
    (list
      ? homeListCardIconSrc({
          id: list.id,
          icon: String(list.icon ?? ""),
          displayVariant: storeIcon ? "from-master" : "default",
          name: list.name ?? "",
        })
      : "");
  const itemCount = list?.items?.length ?? 0;
  const subtitle = [storeIcon ? masterStoreLabelFromListIcon(storeIcon) : null, `${itemCount} ${itemCount === 1 ? "item" : "items"}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <ShareInvite
      state={invalid ? "error" : loading ? "loading" : state}
      visual={tileIcon ? <InviteTile src={tileIcon} /> : null}
      title={list?.name ?? "Lijstje"}
      subtitle={subtitle}
      note="Je ziet en bewerkt dit lijstje samen. Wat de een afvinkt, ziet de ander meteen."
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
