import Link from "next/link";
import type { ReactNode } from "react";

/** Eenvoudige tekstpagina zonder login (privacybeleid, voorwaarden). */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-[680px] bg-[var(--bg-app)] px-4 py-10 text-[15px] leading-[23px] text-[var(--text-secondary)]">
      <h1 className="text-[32px] font-bold leading-[38px] text-[var(--text-primary)]">{title}</h1>
      <p className="mt-2 text-sm text-[var(--text-tertiary)]">Laatst bijgewerkt: {updated}</p>
      <div className="mt-8 flex flex-col gap-7">{children}</div>
      <nav className="mt-10 flex gap-4 text-sm font-semibold text-[var(--text-link)]">
        <Link href="/privacy">Privacybeleid</Link>
        <Link href="/voorwaarden">Gebruiksvoorwaarden</Link>
      </nav>
    </main>
  );
}

export function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-bold text-[var(--text-primary)]">{title}</h2>
      {children}
    </section>
  );
}
