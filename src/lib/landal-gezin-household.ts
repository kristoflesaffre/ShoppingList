import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import {
  inferLandalTripLabel,
  isLandalListCard,
  type LandalListCardInput,
} from "@/lib/landal-list-card";

/** Vaste gezinshuishouding voor Landal-gezinlijstjes (Kristof + Chloé). */
export const LANDAL_GEZIN_HOUSEHOLD_INSTANT_USER_IDS = [
  "710067f6-47a8-4417-9ae6-01cafc6f249f",
  "cee61167-6af6-4eba-a713-752106b069f0",
] as const;

export type LandalGezinListMembershipRow = {
  instantUserId?: string | null;
};

export function isLandalGezinHouseholdMember(userId: string): boolean {
  return (LANDAL_GEZIN_HOUSEHOLD_INSTANT_USER_IDS as readonly string[]).includes(
    userId,
  );
}

export function isLandalGezinList(list: LandalListCardInput): boolean {
  if (!isLandalListCard(list.customIconUrl)) return false;
  return inferLandalTripLabel(list) === "Gezin";
}

/** Deelnemers toevoegen voor het andere gezin-lid (eigenaar hoeft geen membership). */
export function landalGezinHouseholdMembershipTransactions(
  listId: string,
  ownerId: string,
  memberships?: LandalGezinListMembershipRow[] | null,
): Parameters<typeof db.transact>[0] {
  if (!isLandalGezinHouseholdMember(ownerId)) return [];

  const memberIds = new Set(
    (memberships ?? [])
      .map((row) => row.instantUserId)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );

  const txs: Parameters<typeof db.transact>[0] = [];
  for (const householdUserId of LANDAL_GEZIN_HOUSEHOLD_INSTANT_USER_IDS) {
    if (householdUserId === ownerId) continue;
    if (memberIds.has(householdUserId)) continue;
    txs.push(
      db.tx.listMembers[iid()]
        .update({ instantUserId: householdUserId })
        .link({ list: listId }),
    );
  }
  return txs;
}
