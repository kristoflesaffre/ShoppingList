import { NextResponse } from "next/server";
import { getInstantAdminDb } from "@/lib/server/instant-admin";

export function adminUserIdsFromEnv(): Set<string> {
  return new Set(
    (process.env.ADMIN_INSTANT_USER_IDS ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
}

export function adminEmailsFromEnv(): Set<string> {
  return new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAllowedAdminUserId(userId: string | null | undefined): boolean {
  const trimmed = userId?.trim();
  if (!trimmed) return false;
  return adminUserIdsFromEnv().has(trimmed);
}

export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;
  return adminEmailsFromEnv().has(normalized);
}

export function isAllowedAdminIdentity({
  userId,
  email,
}: {
  userId?: string | null;
  email?: string | null;
}): boolean {
  return isAllowedAdminUserId(userId) || isAllowedAdminEmail(email);
}

async function emailForInstantUserId(userId: string): Promise<string | null> {
  const adminDb = getInstantAdminDb();
  if (!adminDb) return null;
  try {
    const queryUsers = adminDb.query as (query: unknown) => Promise<unknown>;
    const result = (await queryUsers({ "$users": {} })) as {
      $users?: Array<{ id?: string; email?: string | null }>;
    };
    const user = (result.$users ?? []).find((row) => row.id === userId);
    return user?.email ?? null;
  } catch {
    return null;
  }
}

export async function isAllowedAdminRequest(req: Request): Promise<{
  allowed: boolean;
  userId: string;
}> {
  const url = new URL(req.url);
  const userId =
    req.headers.get("x-admin-user-id") ??
    url.searchParams.get("adminUserId") ??
    "";
  const emailFromClient =
    req.headers.get("x-admin-email") ??
    url.searchParams.get("adminEmail") ??
    "";

  const trimmedUserId = userId.trim();
  if (!trimmedUserId) return { allowed: false, userId: "" };
  if (isAllowedAdminUserId(trimmedUserId)) {
    return { allowed: true, userId: trimmedUserId };
  }

  const serverEmail = await emailForInstantUserId(trimmedUserId);
  const allowed =
    isAllowedAdminEmail(serverEmail) ||
    // Fallback voor lokale dev als Instant admin-token nog ontbreekt maar de client het e-mailadres kent.
    isAllowedAdminEmail(emailFromClient);

  return { allowed, userId: trimmedUserId };
}

export function adminAccessIsConfigured(): boolean {
  return Boolean(
    process.env.ADMIN_INSTANT_USER_IDS?.trim() ||
      process.env.ADMIN_EMAILS?.trim(),
  );
}

export async function requireAdminUserId(req: Request): Promise<string | NextResponse> {
  if (!adminAccessIsConfigured()) {
    return NextResponse.json(
      {
        error:
          "Adminoverzicht is niet geconfigureerd. Zet ADMIN_EMAILS of ADMIN_INSTANT_USER_IDS in de omgeving.",
      },
      { status: 503 },
    );
  }

  const adminRequest = await isAllowedAdminRequest(req);
  if (!adminRequest.allowed) {
    return NextResponse.json(
      { error: "Je hebt geen toegang tot dit adminoverzicht." },
      { status: 403 },
    );
  }

  return adminRequest.userId;
}
