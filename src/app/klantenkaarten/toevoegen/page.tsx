"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db";
import { LOYALTY_STANDALONE_STORE_OPTIONS } from "@/lib/loyalty-standalone-stores";
import { SearchBar } from "@/components/ui/search_bar";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import { cn } from "@/lib/utils";

/** Zelfde pijl als SlideInModal — public/icons/arrow.svg */
function BackArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M3.59377 12.31C3.60777 12.329 3.61477 12.351 3.63177 12.368L9.23178 17.968C9.33378 18.069 9.46678 18.119 9.59978 18.119C9.73278 18.119 9.86678 18.068 9.96778 17.968C10.1698 17.765 10.1698 17.435 9.96778 17.232L5.25578 12.521L19.9998 12.521C20.2868 12.521 20.5198 12.288 20.5198 12.001C20.5198 11.714 20.2868 11.48 19.9998 11.48L5.25477 11.48L9.96678 6.768C10.1688 6.565 10.1688 6.236 9.96577 6.033C9.76477 5.83 9.43378 5.83 9.23078 6.033L3.63078 11.633C3.61378 11.65 3.60577 11.673 3.59177 11.692C3.56477 11.727 3.53678 11.76 3.51978 11.801C3.46678 11.929 3.46678 12.072 3.51978 12.2C3.53778 12.241 3.56677 12.275 3.59377 12.31Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Generiek klantenkaart + plus (32×32 beeldvlak). */
function CardPlusIcon({ className }: { className?: string }) {
  return (
    <svg
      className={cn("size-8 shrink-0", className)}
      viewBox="0 0 32 32"
      width={32}
      height={32}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <rect
        x="5"
        y="9"
        width="18"
        height="12"
        rx="2"
        stroke="var(--gray-600)"
        strokeWidth="1.5"
      />
      <path
        d="M5 13h18"
        stroke="var(--gray-600)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle
        cx="22"
        cy="10"
        r="5.5"
        fill="var(--white)"
        stroke="var(--blue-500)"
        strokeWidth="1.5"
      />
      <path
        d="M22 8v4M20 10h4"
        stroke="var(--blue-500)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

const MAX_CUSTOM_NAAM_QUERY = 120;

function CustomCardAddRow({ query }: { query: string }) {
  const trimmed = query.trim().slice(0, MAX_CUSTOM_NAAM_QUERY);
  const enabled = trimmed.length > 0;
  const href = `/klantenkaarten/toevoegen/nieuw?naam=${encodeURIComponent(trimmed)}`;

  const rowClass = cn(
    "flex w-full min-w-0 items-center gap-3 rounded-[8px] bg-[var(--white)] py-3 pl-4 pr-3 text-left shadow-[0px_2px_8px_0px_rgba(0,0,0,0.16)] transition-colors",
    enabled
      ? "no-underline [@media(hover:hover)]:hover:bg-[var(--gray-25)] active:bg-[var(--gray-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
      : "cursor-not-allowed opacity-50",
  );

  const body = (
    <>
      <CardPlusIcon />
      <div className="min-w-0 flex-1">
        <p className="text-base font-medium leading-24 tracking-normal text-[var(--text-primary)]">
          Klantenkaart toevoegen
        </p>
        <p
          className={cn(
            "truncate text-sm font-normal leading-20 tracking-normal",
            enabled
              ? "text-[var(--text-secondary)]"
              : "text-[var(--text-tertiary)]",
          )}
        >
          {enabled ? `“${trimmed}”` : "Typ een winkelnaam in het zoekveld"}
        </p>
      </div>
    </>
  );

  if (enabled) {
    return (
      <Link href={href} className={rowClass} aria-label={`Klantenkaart toevoegen: ${trimmed}`}>
        {body}
      </Link>
    );
  }

  return (
    <div className={rowClass} aria-disabled="true">
      {body}
    </div>
  );
}

function StorePickRow({
  label,
  logoSrc,
  href,
}: {
  label: string;
  logoSrc: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex w-full min-w-0 items-center gap-3 rounded-[8px] bg-[var(--white)] py-3 pl-4 pr-3 no-underline shadow-[0px_2px_8px_0px_rgba(0,0,0,0.16)] transition-colors",
        "[@media(hover:hover)]:hover:bg-[var(--gray-25)] active:bg-[var(--gray-50)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2",
      )}
    >
      {/* Figma 1096:7045: logo 32×32, overflow-clip, géén achtergrondkleur */}
      <div className="relative size-8 shrink-0 overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element -- winkel-SVG uit /public/logos */}
        <img
          src={logoSrc}
          alt=""
          width={32}
          height={32}
          className="size-full object-contain object-center"
        />
      </div>
      <p className="min-w-0 flex-1 truncate text-base font-medium leading-24 tracking-normal text-[var(--text-primary)]">
        {label}
      </p>
    </Link>
  );
}

export default function KlantenkaartToevoegenPage() {
  const router = useRouter();
  const { isLoading: authLoading, user } = db.useAuth();
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  const sortedStores = React.useMemo(
    () =>
      [...LOYALTY_STANDALONE_STORE_OPTIONS].sort((a, b) =>
        a.label.localeCompare(b.label, "nl", { sensitivity: "base" }),
      ),
    [],
  );

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sortedStores;
    return sortedStores.filter((s) => s.label.toLowerCase().includes(q));
  }, [sortedStores, query]);

  if (authLoading || !user) {
    return <PageSpinner />;
  }

  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-gradient-to-b from-[var(--blue-100)] to-[var(--white)] px-[16px]">
      <div className="flex min-w-0 flex-1 flex-col pb-[calc(24px+env(safe-area-inset-bottom,0px))] pt-[calc(52px+env(safe-area-inset-top,0px))]">
        <div className="mx-auto flex w-full min-w-0 max-w-[956px] flex-1 flex-col gap-6">
          <header className="flex min-h-8 items-center gap-4">
            <Link
              href="/klantenkaarten"
              className="flex size-10 shrink-0 items-center justify-center rounded-full text-[var(--blue-500)] transition-colors [@media(hover:hover)]:hover:bg-[var(--blue-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              aria-label="Terug naar klantenkaarten"
            >
              <BackArrowIcon className="size-6" />
            </Link>
            <h1 className="min-w-0 flex-1 text-page-title font-bold leading-32 tracking-normal text-text-primary">
              Klantenkaart toevoegen
            </h1>
          </header>

          <SearchBar
            placeholder="Zoek klantenkaart"
            value={query}
            onValueChange={setQuery}
            autoComplete="off"
            enterKeyHint="search"
            className="shrink-0"
          />

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pb-2">
            {filtered.length === 0 && query.trim() ? (
              <p className="py-2 text-center text-sm font-normal leading-20 text-[var(--text-tertiary)]">
                Geen overeenkomst in de lijst — gebruik onderstaande knop om door te gaan.
              </p>
            ) : null}
            {filtered.map((store) => (
              <StorePickRow
                key={store.slug}
                label={store.label}
                logoSrc={store.logoSrc}
                href={`/klantenkaarten/toevoegen/${store.slug}`}
              />
            ))}
            <CustomCardAddRow query={query} />
          </div>
        </div>
      </div>
    </div>
  );
}
