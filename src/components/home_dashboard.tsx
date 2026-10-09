"use client";

import Link from "next/link";
import { useItemPhotoUrl } from "@/lib/item-photos";
import { cn } from "@/lib/utils";

type QuickAction = {
  label: string;
  iconSrc: string;
  href?: string;
  onClick?: () => void;
};

function DashboardActionIcon({ src }: { src: string }) {
  return (
    <span
      aria-hidden
      className="inline-block size-5 shrink-0 bg-[var(--blue-500)]"
      style={{
        WebkitMaskImage: `url("${src}")`,
        maskImage: `url("${src}")`,
        WebkitMaskSize: "contain",
        maskSize: "contain",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
      }}
    />
  );
}

function QuickActionTile({ action }: { action: QuickAction }) {
  const className = cn(
    "flex min-h-14 min-w-0 items-center gap-3 rounded-md bg-[var(--white)] px-3.5 py-3 text-left no-underline shadow-card",
    "transition-[background-color,transform] duration-fast ease-out-strong motion-safe:active:scale-[0.98]",
    "[@media(hover:hover)]:hover:bg-[var(--gray-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
  );
  const content = (
    <>
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--blue-25)]">
        <DashboardActionIcon src={action.iconSrc} />
      </span>
      <span className="min-w-0 text-sm font-semibold leading-5 text-[var(--text-primary)]">
        {action.label}
      </span>
    </>
  );

  if (action.href) {
    return (
      <Link href={action.href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={action.onClick}>
      {content}
    </button>
  );
}

export function HomeDashboardQuickActions({
  onNewList,
  onAddProduct,
}: {
  onNewList: () => void;
  onAddProduct: () => void;
}) {
  const actions: QuickAction[] = [
    { label: "Nieuw lijstje", iconSrc: "/icons/list.svg", onClick: onNewList },
    { label: "Product toevoegen", iconSrc: "/icons/plus-circle.svg", onClick: onAddProduct },
    { label: "Klantenkaarten", iconSrc: "/icons/card.svg", href: "/klantenkaarten" },
    { label: "Diepvries", iconSrc: "/icons/freeze.svg", href: "/diepvriesvoorraad" },
  ];

  return (
    <section aria-labelledby="dashboard-quick-actions" className="flex min-w-0 flex-col gap-3">
      <h2
        id="dashboard-quick-actions"
        className="text-section-title font-semibold leading-24 tracking-tight text-[var(--text-primary)]"
      >
        Snelle acties
      </h2>
      <div className="grid grid-cols-2 gap-2.5 min-[1050px]:grid-cols-1 min-[1180px]:grid-cols-2">
        {actions.map((action) => (
          <QuickActionTile key={action.label} action={action} />
        ))}
      </div>
    </section>
  );
}

export type DashboardFreezerItem = {
  id: string;
  name: string;
  type?: string;
  packages: number;
  recipePhotoUrl?: string | null;
};

function FreezerPreview({ item }: { item: DashboardFreezerItem }) {
  const getPhotoUrl = useItemPhotoUrl(160);
  const photo = item.recipePhotoUrl ?? (item.type === "gerecht" ? null : getPhotoUrl(item.name));

  return (
    <span className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--gray-25)] shadow-[0_0_0_2px_var(--white)]">
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element -- receptfoto of lokale productfoto
        <img src={photo} alt="" width={44} height={44} className="size-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <span className="text-sm font-bold text-[var(--blue-400)]" aria-hidden>
          {item.name.trim().charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  );
}

export function HomeDashboardInventory({ items }: { items: DashboardFreezerItem[] }) {
  const totalPortions = items.reduce((sum, item) => sum + Math.max(0, item.packages || 0), 0);
  const dishes = items.filter((item) => item.type === "gerecht").length;
  const preview = items.slice(0, 3);

  return (
    <section aria-labelledby="dashboard-inventory" className="flex min-w-0 flex-col gap-3">
      <div className="flex min-h-8 items-center justify-between gap-3">
        <h2
          id="dashboard-inventory"
          className="text-section-title font-semibold leading-24 tracking-tight text-[var(--text-primary)]"
        >
          Voorraad
        </h2>
        <Link
          href="/diepvriesvoorraad"
          className="rounded-pill px-2 py-1 text-[13px] font-medium leading-[18px] text-action-primary no-underline [@media(hover:hover)]:hover:bg-action-ghost-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
        >
          Open
        </Link>
      </div>

      <Link
        href="/diepvriesvoorraad"
        className="flex min-h-[112px] items-center gap-4 rounded-lg bg-[var(--white)] p-4 no-underline shadow-card transition-transform duration-fast ease-out-strong motion-safe:active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
      >
        {items.length > 0 ? (
          <>
            <span className="flex shrink-0 pl-0.5" aria-hidden>
              {preview.map((item, index) => (
                <span key={item.id} className={cn(index > 0 && "-ml-3")}>
                  <FreezerPreview item={item} />
                </span>
              ))}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-base font-semibold leading-6 text-[var(--text-primary)]">
                {totalPortions} {totalPortions === 1 ? "portie" : "porties"}
              </span>
              <span className="text-[13px] leading-[18px] text-[var(--text-secondary)]">
                {items.length} {items.length === 1 ? "item" : "items"}
                {dishes > 0 ? ` · ${dishes} ${dishes === 1 ? "gerecht" : "gerechten"}` : ""}
              </span>
            </span>
          </>
        ) : (
          <>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-[var(--blue-25)]">
              <DashboardActionIcon src="/icons/freeze.svg" />
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-base font-semibold leading-6 text-[var(--text-primary)]">Je diepvries is leeg</span>
              <span className="text-[13px] leading-[18px] text-[var(--text-secondary)]">Voeg een product of gerecht toe</span>
            </span>
          </>
        )}
        <span
          aria-hidden
          className="inline-block size-4 shrink-0 bg-[var(--gray-300)]"
          style={{
            WebkitMaskImage: "url(/icons/chevron.svg)",
            maskImage: "url(/icons/chevron.svg)",
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            transform: "rotate(-90deg)",
          }}
        />
      </Link>
    </section>
  );
}
