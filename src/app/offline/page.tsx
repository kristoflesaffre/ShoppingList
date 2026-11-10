"use client";

import { Button } from "@/components/ui/button";

/**
 * Vangnet van de service worker (src/app/sw.ts): getoond als je offline een pagina opent die nog niet
 * bewaard is. Pagina's die je al eens opende, werken offline gewoon.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-[var(--bg-app)] px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--blue-50)] text-[var(--blue-500)]" aria-hidden>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 8.8a15 15 0 0 1 4.2-2.6M9.5 5.3A15 15 0 0 1 22 8.8M5 12.6a10 10 0 0 1 3.4-2M12 10a10 10 0 0 1 7 2.6M8.5 16.4a5 5 0 0 1 7 0M12 20h.01M3 3l18 18" />
        </svg>
      </div>
      <div className="flex max-w-[320px] flex-col gap-2">
        <h1 className="text-[22px] font-bold text-[var(--text-primary)]">Je bent offline</h1>
        <p className="text-[15px] leading-[1.45] text-[var(--text-secondary)]">
          Deze pagina is nog niet op dit toestel bewaard. Je lijstjes en recepten werken wel: ga terug naar de start.
        </p>
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" size="md" onClick={() => window.location.reload()}>
          Opnieuw proberen
        </Button>
        <Button size="md" onClick={() => window.location.assign("/")}>
          Naar de start
        </Button>
      </div>
    </main>
  );
}
