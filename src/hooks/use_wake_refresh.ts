"use client";

import * as React from "react";
import { startWakeRefresh } from "@/lib/wake_refresh";

/**
 * Roept `refresh` op elke `everyMs`, precies na middernacht en zodra het toestel wakker wordt; zie `startWakeRefresh`.
 * `refresh` mag bij elke render een nieuwe functie zijn.
 */
export function useWakeRefresh(refresh: () => void, everyMs: number | null = null) {
  const latest = React.useRef(refresh);
  latest.current = refresh;
  React.useEffect(() => startWakeRefresh(() => latest.current(), everyMs, { win: window, doc: document }), [everyMs]);
}
