export type ShoppingShareMemberLike = {
  id?: string;
  instantUserId?: string | null;
};

export type ShoppingShareLike = {
  id?: string;
  ownerId?: string | null;
  memberships?: ShoppingShareMemberLike[] | null;
};

export type JoinedShoppingShareMemberLike = {
  shoppingShare?: ShoppingShareLike | null;
};

export function getVisibleShoppingOwnerIds({
  userId,
  ownedShares,
  joinedMemberships,
}: {
  userId: string | null | undefined;
  ownedShares?: ShoppingShareLike[] | null;
  joinedMemberships?: JoinedShoppingShareMemberLike[] | null;
}) {
  const ids = new Set<string>();
  if (!userId) return ids;

  ids.add(userId);

  for (const share of ownedShares ?? []) {
    if (share?.ownerId === userId) {
      for (const member of share.memberships ?? []) {
        if (member.instantUserId) ids.add(member.instantUserId);
      }
    }
  }

  for (const row of joinedMemberships ?? []) {
    const share = row.shoppingShare;
    if (!share) continue;
    if (share.ownerId) ids.add(share.ownerId);
    for (const member of share.memberships ?? []) {
      if (member.instantUserId) ids.add(member.instantUserId);
    }
  }

  return ids;
}
