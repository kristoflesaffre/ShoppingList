import * as React from "react";

/** Eén vraag in een formulierblad («Item wijzigen», «Product toevoegen»): label links (96px) en de bediening rechts; op de gsm het label erboven. */
export function EditFormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 md:flex-row md:items-start md:gap-4">
      <span className="text-sm leading-20 text-[var(--text-secondary)] md:w-[96px] md:shrink-0 md:pt-3.5">{label}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
