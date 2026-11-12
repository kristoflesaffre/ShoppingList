"use client";

import * as React from "react";
import { db } from "@/lib/db";
import { watchLiveSync } from "@/lib/live-sync-watchdog";

type ReactorLike = { _startSocket?: () => void };

/** Zie `watchLiveSync`: houdt de live gegevens vers op een scherm dat dagen open blijft. */
export function useLiveSyncWatchdog(enabled: boolean) {
  React.useEffect(() => {
    if (!enabled) return;
    const reactor = (db.core as unknown as { _reactor?: ReactorLike })._reactor;
    if (typeof reactor?._startSocket !== "function") return;
    return watchLiveSync({
      probe: () => db.queryOnce({ lists: { $: { limit: 1 } } }),
      reconnect: () => reactor._startSocket?.(),
      onReconnect: () => console.info("[live-sync] geen antwoord van de database, nieuwe verbinding gestart"),
    });
  }, [enabled]);
}
