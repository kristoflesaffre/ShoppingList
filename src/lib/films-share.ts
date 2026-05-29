export type FilmsShareMemberLike = {
  id?: string;
  instantUserId?: string | null;
};

export type FilmsShareLike = {
  id?: string;
  ownerId?: string | null;
  shareToken?: string | null;
  memberships?: FilmsShareMemberLike[] | null;
};

export type JoinedFilmsShareMemberLike = {
  filmsShare?: FilmsShareLike | null;
};

/**
 * Bepaalt welke `groupOwnerId` gebruikt wordt voor gedeelde films-data.
 * Deelnemers aan iemand anders zijn lijstje gebruiken de ownerId van die share.
 */
export function resolveFilmsGroupOwnerId({
  userId,
  joinedMemberships,
}: {
  userId: string | null | undefined;
  joinedMemberships?: JoinedFilmsShareMemberLike[] | null;
}): string | null {
  if (!userId) return null;

  for (const row of joinedMemberships ?? []) {
    const share = row.filmsShare;
    const ownerId = share?.ownerId;
    if (ownerId && ownerId !== userId) return ownerId;
  }

  return userId;
}
