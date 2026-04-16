"use client";

import { useEffect } from "react";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[var(--bg-default)] px-4 text-center">
      <h1 className="text-section-title font-bold leading-24 text-[var(--text-primary)]">
        Er ging iets mis
      </h1>
      <p className="max-w-[28rem] text-sm leading-20 text-[var(--text-secondary)]">
        Er is een onverwachte fout opgetreden. Probeer de pagina opnieuw te laden.
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-pill bg-[var(--action-primary)] px-4 py-2 text-sm font-medium leading-20 text-[var(--action-primary-foreground)]"
      >
        Probeer opnieuw
      </button>
    </main>
  );
}
