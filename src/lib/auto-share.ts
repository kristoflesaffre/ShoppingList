"use client";

import * as React from "react";
import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import { isLandalListCard } from "@/lib/landal-list-card";
import {
  listIsCafeVenueList,
  listIsFrituurVenueList,
} from "@/lib/list-product-icons";

/**
 * «Ook toekomstige lijstjes»: per soort lijstje kiest de eigenaar of nieuwe lijstjes
 * automatisch gedeeld worden met de mensen die al op een van zijn lijstjes meeschrijven.
 * Voorkeur staat op `profiles.autoShareKindsJson` (JSON-array van soorten).
 */
export type AutoShareKind = "supermarkt" | "frituur" | "cafe" | "landal" | "vakantie";

export const AUTO_SHARE_KIND_META: Record<
  AutoShareKind,
  { label: string; imageSrc: string; tint: string }
> = {
  supermarkt: { label: "Supermarkt", imageSrc: "/images/ui/supermarkt_160.webp", tint: "#e7f5ea" },
  frituur: { label: "Frituur", imageSrc: "/images/ui/product_icons/frieten_160.webp", tint: "#fdf3df" },
  cafe: { label: "Café", imageSrc: "/images/ui/cafe_160.webp", tint: "#f9e6ef" },
  landal: { label: "Landal", imageSrc: "/images/ui/landal_160.webp", tint: "#e3eef8" },
  vakantie: { label: "Vakantie", imageSrc: "/images/ui/vakantie_160.webp", tint: "#fdeadf" },
};

export const ALL_KINDS = Object.keys(AUTO_SHARE_KIND_META) as AutoShareKind[];

export type AutoShareListInput = {
  name?: string | null;
  customIconUrl?: string | null;
  isMasterTemplate?: boolean | null;
};

/** Soort van een lijstje; `null` voor favorietenlijsten (die deel je niet automatisch). */
export function listAutoShareKind(list: AutoShareListInput): AutoShareKind | null {
  if (list.isMasterTemplate) return null;
  const icon = String(list.customIconUrl ?? "").toLowerCase();
  if (isLandalListCard(icon)) return "landal";
  if (icon.includes("vakantie_")) return "vakantie";
  if (listIsFrituurVenueList(list.name)) return "frituur";
  if (listIsCafeVenueList(list.name)) return "cafe";
  return "supermarkt";
}

export function parseAutoShareKinds(json: string | null | undefined): Set<AutoShareKind> {
  if (!json) return new Set();
  try {
    const raw: unknown = JSON.parse(json);
    if (!Array.isArray(raw)) return new Set();
    return new Set(raw.filter((k): k is AutoShareKind => ALL_KINDS.includes(k as AutoShareKind)));
  } catch {
    return new Set();
  }
}

type MembershipRow = { id?: string; instantUserId?: string | null };

export type OwnedListRow = {
  id: string;
  name?: string | null;
  icon?: string | null;
  customIconUrl?: string | null;
  masterIcon?: string | null;
  shareToken?: string | null;
  isMasterTemplate?: boolean | null;
  order?: number | null;
  memberships?: MembershipRow[] | null;
};
type ListWithMemberships = { memberships?: MembershipRow[] | null };

/** Iedereen die op minstens één lijstje van de eigenaar meeschrijft. */
export function sharePartnerIds(
  ownedLists: readonly ListWithMemberships[],
  ownerId: string,
): string[] {
  const ids = new Set<string>();
  for (const list of ownedLists) {
    for (const m of list.memberships ?? []) {
      const uid = m.instantUserId;
      if (typeof uid === "string" && uid && uid !== ownerId) ids.add(uid);
    }
  }
  return Array.from(ids);
}

/** Array-variant van het transact-argument (nooit een losse chunk). */
type DbTxArray = Extract<Parameters<typeof db.transact>[0], unknown[]>;

/** Deelnemers toevoegen aan een nieuw lijstje als die soort automatisch gedeeld wordt. */
export function autoShareMembershipTransactions(
  listId: string,
  kind: AutoShareKind | null,
  enabledKinds: ReadonlySet<AutoShareKind>,
  partnerIds: readonly string[],
  existingMemberIds: readonly string[] = [],
): DbTxArray {
  if (!kind || !enabledKinds.has(kind)) return [];
  const existing = new Set(existingMemberIds);
  return partnerIds
    .filter((uid) => !existing.has(uid))
    .map((uid) =>
      db.tx.listMembers[iid()].update({ instantUserId: uid }).link({ list: listId }),
    );
}

/** Bestaande lijstjes van de soorten die net aangezet zijn, delen met alle deelgenoten. */
export function shareExistingListsTransactions(
  lists: readonly OwnedListRow[],
  kinds: ReadonlySet<AutoShareKind>,
  partnerIds: readonly string[],
): DbTxArray {
  return lists.flatMap((list) =>
    autoShareMembershipTransactions(
      list.id,
      listAutoShareKind(list),
      kinds,
      partnerIds,
      (list.memberships ?? []).map((m) => m.instantUserId ?? ""),
    ),
  );
}

/**
 * Leest de voorkeur en de deelgenoten van de ingelogde gebruiker en geeft setters terug.
 * Een uitnodiging verbindt twee mensen in beide richtingen: `sharePartners` telt zowel
 * waar je eigenaar als waar je deelgenoot bent.
 */
export function useAutoShare(userId: string | null | undefined) {
  const uid = userId ?? "__no_user__";
  const { isLoading, data } = db.useQuery({
    profiles: { $: { where: { instantUserId: uid } } },
    lists: { memberships: {}, $: { where: { ownerId: uid } } },
    sharePartners: { $: { where: { or: [{ ownerId: uid }, { partnerUserId: uid }] } } },
  });

  const profile = (data?.profiles?.[0] ?? null) as
    | { id: string; autoShareKindsJson?: string | null; shareInviteToken?: string | null }
    | null;
  const enabledKinds = React.useMemo(
    () => parseAutoShareKinds(profile?.autoShareKindsJson),
    [profile?.autoShareKindsJson],
  );
  const ownedLists = React.useMemo(() => (data?.lists ?? []) as OwnedListRow[], [data?.lists]);
  const partnerRows = React.useMemo(
    () =>
      (data?.sharePartners ?? []) as Array<{
        id: string;
        ownerId?: string;
        partnerUserId?: string;
        createdAtIso?: string | null;
      }>,
    [data?.sharePartners],
  );
  const partnerIds = React.useMemo(() => {
    const fromLists = sharePartnerIds(ownedLists, uid);
    const fromInvite = partnerRows
      .map((p) => (p.ownerId === uid ? p.partnerUserId : p.ownerId))
      .filter((id): id is string => typeof id === "string" && id !== uid);
    return Array.from(new Set([...fromInvite, ...fromLists]));
  }, [ownedLists, partnerRows, uid]);

  /** Sinds wanneer je met iemand deelt (enkel bij verbindingen via de uitnodigingslink). */
  const partnerSince = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const r of partnerRows) {
      const other = r.ownerId === uid ? r.partnerUserId : r.ownerId;
      if (other && r.createdAtIso && (!map[other] || r.createdAtIso < map[other]!)) map[other] = r.createdAtIso;
    }
    return map;
  }, [partnerRows, uid]);

  /** Algemene uitnodigingslink: token op het profiel, aangemaakt bij eerste gebruik. */
  const ensureInviteToken = React.useCallback(async (): Promise<string | null> => {
    if (!userId) return null;
    if (profile?.shareInviteToken) return profile.shareInviteToken;
    const token = crypto.randomUUID();
    await db.transact(
      db.tx.profiles[profile?.id ?? iid()].update({ instantUserId: userId, shareInviteToken: token }),
    );
    return token;
  }, [profile?.id, profile?.shareInviteToken, userId]);

  /** Bewaart de soorten; een soort die aan gaat deelt meteen ook je bestaande lijstjes van die soort. */
  const setKinds = React.useCallback(
    async (next: ReadonlySet<AutoShareKind>) => {
      if (!userId) return;
      const json = JSON.stringify(ALL_KINDS.filter((k) => next.has(k)));
      const turnedOn = new Set(ALL_KINDS.filter((k) => next.has(k) && !enabledKinds.has(k)));
      try {
        await db.transact([
          db.tx.profiles[profile?.id ?? iid()].update({ instantUserId: userId, autoShareKindsJson: json }),
          ...shareExistingListsTransactions(ownedLists, turnedOn, partnerIds),
        ]);
      } catch (e) {
        console.error("[auto-share] voorkeur bewaren mislukt", e);
      }
    },
    [enabledKinds, ownedLists, partnerIds, profile?.id, userId],
  );

  const setKindEnabled = React.useCallback(
    async (kind: AutoShareKind, enabled: boolean) => {
      const next = new Set(enabledKinds);
      if (enabled) next.add(kind);
      else next.delete(kind);
      await setKinds(next);
    },
    [enabledKinds, setKinds],
  );

  /**
   * Verbinding verbreken (kan elk van beide kanten): de koppeling verdwijnt en jullie
   * schrijven niet langer mee op elkaars lijstjes.
   */
  const removePartner = React.useCallback(
    async (partnerId: string) => {
      if (!userId) return;
      const { data: theirs } = await db.queryOnce({
        lists: { memberships: {}, $: { where: { ownerId: partnerId } } },
      });
      const txs: DbTxArray = [
        ...partnerRows
          .filter(
            (r) =>
              (r.ownerId === userId && r.partnerUserId === partnerId) ||
              (r.ownerId === partnerId && r.partnerUserId === userId),
          )
          .map((r) => db.tx.sharePartners[r.id].delete()),
        ...ownedLists.flatMap((l) =>
          (l.memberships ?? [])
            .filter((m) => m.id && m.instantUserId === partnerId)
            .map((m) => db.tx.listMembers[m.id!].delete()),
        ),
        ...((theirs?.lists ?? []) as OwnedListRow[]).flatMap((l) =>
          (l.memberships ?? [])
            .filter((m) => m.id && m.instantUserId === userId)
            .map((m) => db.tx.listMembers[m.id!].delete()),
        ),
      ];
      if (txs.length > 0) await db.transact(txs);
    },
    [ownedLists, partnerRows, userId],
  );

  return {
    isLoading,
    profileId: profile?.id ?? null,
    enabledKinds,
    partnerIds,
    partnerSince,
    setKindEnabled,
    setKinds,
    removePartner,
    ensureInviteToken,
    inviteToken: profile?.shareInviteToken ?? null,
    ownedLists,
  } as const;
}
