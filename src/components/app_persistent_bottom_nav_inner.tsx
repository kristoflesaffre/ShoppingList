"use client";

import * as React from "react";
import { db } from "@/lib/db";
import {
  AppBottomNav,
  type AppBottomNavProps,
} from "@/components/app_bottom_nav";

function isMainBottomNavRoute(pathname: string): boolean {
  if (pathname === "/") return true;
  if (pathname === "/recepten") return true;
  if (pathname === "/kalender") return true;
  if (pathname === "/klantenkaarten") return true;
  if (pathname === "/profiel") return true;
  if (pathname === "/nieuw-lijstje/selecteer-winkel") return true;
  if (pathname === "/nieuw-lijstje/selecteer-master-lijstje") return true;
  return false;
}

function navActiveForPath(pathname: string): AppBottomNavProps["active"] {
  if (pathname === "/kalender") return "kalender";
  if (pathname === "/klantenkaarten") return "klantenkaarten";
  if (pathname === "/profiel") return "profiel";
  if (pathname === "/recepten") return "recepten";
  return "lijstjes";
}

export function AppPersistentBottomNavInner({
  pathname,
}: {
  pathname: string;
}) {
  const { user, isLoading: authLoading } = db.useAuth();
  const ownerId = user?.id ?? null;
  const onMainNav = isMainBottomNavRoute(pathname);
  const showBottomNav = Boolean(user) && !authLoading && onMainNav;

  const { data } = db.useQuery(
    showBottomNav && ownerId
      ? {
          profiles: {
            $: { where: { instantUserId: ownerId } },
          },
        }
      : null,
  );

  const row = data?.profiles?.[0];
  const profileAvatarUrl =
    typeof row?.avatarUrl === "string" ? row.avatarUrl : null;
  const profileFirstNameRaw = (row?.firstName ?? "").trim();
  const profileFirstName =
    profileFirstNameRaw.length > 0 ? profileFirstNameRaw : null;

  if (!showBottomNav) return null;

  return (
    <AppBottomNav
      active={navActiveForPath(pathname)}
      profileAvatarUrl={profileAvatarUrl}
      profileFirstName={profileFirstName}
    />
  );
}
