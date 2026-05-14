import { id as iid } from "@instantdb/react";
import { db } from "@/lib/db";
import {
  inferLandalTripLabel,
  isLandalListCard,
  type LandalListCardInput,
} from "@/lib/landal-list-card";

/**
 * Vaste gezinshuishouding voor Landal-gezinlijstjes.
 * E-mails worden in Instant Auth hoofdletterongevoelig behandeld; de app werkt
 * op client-side met Instant user ids, dus de ids hieronder horen bij deze
 * genormaliseerde e-mailadressen.
 */
export const LANDAL_GEZIN_HOUSEHOLD_USERS = [
  {
    email: "lesaffrekristof@gmail.com",
    instantUserId: "710067f6-47a8-4417-9ae6-01cafc6f249f",
  },
  {
    email: "claes_cc@live.be",
    instantUserId: "cee61167-6af6-4eba-a713-752106b069f0",
  },
] as const;

export const LANDAL_GEZIN_HOUSEHOLD_EMAILS: readonly string[] =
  LANDAL_GEZIN_HOUSEHOLD_USERS.map((user) => user.email);

export const LANDAL_GEZIN_HOUSEHOLD_INSTANT_USER_IDS: readonly string[] =
  LANDAL_GEZIN_HOUSEHOLD_USERS.map((user) => user.instantUserId);

export type LandalGezinListMembershipRow = {
  instantUserId?: string | null;
};

export function normalizeLandalGezinHouseholdEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isLandalGezinHouseholdEmail(email: string): boolean {
  const normalized = normalizeLandalGezinHouseholdEmail(email);
  return LANDAL_GEZIN_HOUSEHOLD_EMAILS.includes(normalized);
}

export function isLandalGezinHouseholdMember(userId: string): boolean {
  return (LANDAL_GEZIN_HOUSEHOLD_INSTANT_USER_IDS as readonly string[]).includes(
    userId,
  );
}

export function isLandalGezinList(list: LandalListCardInput): boolean {
  if (!isLandalListCard(list.customIconUrl)) return false;
  return inferLandalTripLabel(list) === "Gezin";
}

/** Array-variant van het transact-argument (nooit een losse chunk). */
type DbTxArray = Extract<Parameters<typeof db.transact>[0], unknown[]>;

/** Deelnemers toevoegen voor het andere gezin-lid (eigenaar hoeft geen membership). */
export function landalGezinHouseholdMembershipTransactions(
  listId: string,
  ownerId: string,
  memberships?: LandalGezinListMembershipRow[] | null,
): DbTxArray {
  if (!isLandalGezinHouseholdMember(ownerId)) return [];

  const memberIds = new Set(
    (memberships ?? [])
      .map((row) => row.instantUserId)
      .filter((id): id is string => typeof id === "string" && id.length > 0),
  );

  const txs: DbTxArray = [];
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
