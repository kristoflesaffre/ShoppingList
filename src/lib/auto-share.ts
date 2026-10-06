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

/**
 * Leest de voorkeur en de deelgenoten van de ingelogde gebruiker en geeft een setter terug.
 */
export function useAutoShare(userId: string | null | undefined) {
  const uid = userId ?? "__no_user__";
  const { data } = db.useQuery({
    profiles: { $: { where: { instantUserId: uid } } },
    lists: { memberships: {}, $: { where: { ownerId: uid } } },
  });

  const profile = (data?.profiles?.[0] ?? null) as
    | { id: string; autoShareKindsJson?: string | null }
    | null;
  const enabledKinds = React.useMemo(
    () => parseAutoShareKinds(profile?.autoShareKindsJson),
    [profile?.autoShareKindsJson],
  );
  const partnerIds = React.useMemo(
    () => sharePartnerIds((data?.lists ?? []) as ListWithMemberships[], uid),
    [data?.lists, uid],
  );

  const setKinds = React.useCallback(
    async (next: ReadonlySet<AutoShareKind>) => {
      if (!userId) return;
      const json = JSON.stringify(ALL_KINDS.filter((k) => next.has(k)));
      try {
        await db.transact(
          db.tx.profiles[profile?.id ?? iid()].update({
            instantUserId: userId,
            autoShareKindsJson: json,
          }),
        );
      } catch (e) {
        console.error("[auto-share] voorkeur bewaren mislukt", e);
      }
    },
    [profile?.id, userId],
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

  return {
    enabledKinds,
    partnerIds,
    setKindEnabled,
    setKinds,
    ownedLists: (data?.lists ?? []) as OwnedListRow[],
  } as const;
}
