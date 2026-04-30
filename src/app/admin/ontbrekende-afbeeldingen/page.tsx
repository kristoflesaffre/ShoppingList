"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RouteLoadingSpinner as PageSpinner } from "@/components/ui/route_loading_spinner";
import { SearchBar } from "@/components/ui/search_bar";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

type MissingImageReport = {
  id: string;
  reportKey: string;
  ownerId?: string;
  sourceType: "list-item" | "recipe-ingredient" | "recipe-photo";
  sourceId: string;
  sourceName: string;
  sourceKind?: string;
  itemName: string;
  normalizedName: string;
  imageKind: "product" | "ingredient" | "recipe";
  sourcePath?: string;
  occurrenceCount?: number;
  active?: boolean;
  firstSeenAtIso?: string;
  lastSeenAtIso?: string;
  resolvedAtIso?: string;
};

type ScanResult = {
  createdOrUpdated: number;
  resolved: number;
  active: number;
  scannedAtIso: string;
};

type FilterType = "active" | "resolved" | "all";
type ImageKindFilter = "all" | MissingImageReport["imageKind"];

type AuthUserWithEmail = {
  id: string;
  email?: string | null;
};

const IMAGE_KIND_LABELS: Record<MissingImageReport["imageKind"], string> = {
  product: "Productfoto",
  ingredient: "Ingrediëntfoto",
  recipe: "Receptfoto",
};

const SOURCE_TYPE_LABELS: Record<MissingImageReport["sourceType"], string> = {
  "list-item": "Lijstje",
  "recipe-ingredient": "Receptingrediënt",
  "recipe-photo": "Recept",
};

function formatDateTime(value?: string): string {
  if (!value) return "Onbekend";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Onbekend";
  return new Intl.DateTimeFormat("nl-BE", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function reportIsActive(report: MissingImageReport): boolean {
  return report.active !== false;
}

function uniqueNormalizedCount(reports: MissingImageReport[]): number {
  return new Set(reports.map((report) => report.normalizedName)).size;
}

function filterReports({
  reports,
  query,
  status,
  imageKind,
}: {
  reports: MissingImageReport[];
  query: string;
  status: FilterType;
  imageKind: ImageKindFilter;
}): MissingImageReport[] {
  const normalizedQuery = query.trim().toLowerCase();
  return reports
    .filter((report) => {
      if (status === "active" && !reportIsActive(report)) return false;
      if (status === "resolved" && reportIsActive(report)) return false;
      if (imageKind !== "all" && report.imageKind !== imageKind) return false;
      if (!normalizedQuery) return true;
      return [
        report.itemName,
        report.sourceName,
        report.normalizedName,
        report.ownerId,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedQuery));
    })
    .sort((a, b) => {
      const aTime = new Date(a.lastSeenAtIso ?? a.firstSeenAtIso ?? 0).getTime();
      const bTime = new Date(b.lastSeenAtIso ?? b.firstSeenAtIso ?? 0).getTime();
      return bTime - aTime || a.itemName.localeCompare(b.itemName, "nl");
    });
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string | number;
  helper?: string;
}) {
  return (
    <div className="rounded-lg border border-[var(--gray-100)] bg-[var(--white)] p-4">
      <p className="text-sm font-normal leading-5 text-[var(--text-secondary)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold leading-8 text-[var(--text-primary)]">
        {value}
      </p>
      {helper ? (
        <p className="mt-1 text-xs font-normal leading-4 text-[var(--text-secondary)]">
          {helper}
        </p>
      ) : null}
    </div>
  );
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-pill border px-4 py-2 text-sm font-medium leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]",
        active
          ? "border-[var(--action-primary)] bg-[var(--action-primary)] text-[var(--action-primary-foreground)]"
          : "border-[var(--gray-200)] bg-[var(--white)] text-[var(--text-primary)] hover:bg-[var(--gray-25)]",
      )}
    >
      {children}
    </button>
  );
}

function ReportRow({ report }: { report: MissingImageReport }) {
  const active = reportIsActive(report);
  return (
    <article className="rounded-lg border border-[var(--gray-100)] bg-[var(--white)] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-pill bg-[var(--blue-25)] px-3 py-1 text-xs font-medium leading-4 text-[var(--blue-700)]">
              {IMAGE_KIND_LABELS[report.imageKind]}
            </span>
            <span
              className={cn(
                "rounded-pill px-3 py-1 text-xs font-medium leading-4",
                active
                  ? "bg-[var(--status-error-bg)] text-[var(--status-error)]"
                  : "bg-[var(--status-success-bg)] text-[var(--status-success)]",
              )}
            >
              {active ? "Ontbreekt" : "Opgelost"}
            </span>
          </div>
          <h2 className="mt-3 text-lg font-semibold leading-7 text-[var(--text-primary)]">
            {report.itemName}
          </h2>
          <p className="mt-1 text-sm font-normal leading-5 text-[var(--text-secondary)]">
            {SOURCE_TYPE_LABELS[report.sourceType]}: {report.sourceName}
          </p>
          <p className="mt-1 break-all text-xs font-normal leading-4 text-[var(--text-secondary)]">
            Eigenaar: {report.ownerId || "Onbekend"} · sleutel:{" "}
            {report.normalizedName}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 text-sm leading-5 text-[var(--text-secondary)] sm:text-right">
          <span>Laatst gezien: {formatDateTime(report.lastSeenAtIso)}</span>
          {report.sourcePath ? (
            <Link
              href={report.sourcePath}
              className="font-medium text-[var(--text-link)] underline"
            >
              Open bron
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function MissingImagesAdminPage() {
  const router = useRouter();
  const { isLoading: authLoading, user } = db.useAuth();
  const adminUser = user as AuthUserWithEmail | null;
  const [reports, setReports] = React.useState<MissingImageReport[]>([]);
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState<FilterType>("active");
  const [imageKind, setImageKind] = React.useState<ImageKindFilter>("all");
  const [loading, setLoading] = React.useState(false);
  const [scanning, setScanning] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [lastScan, setLastScan] = React.useState<ScanResult | null>(null);

  React.useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [authLoading, user, router]);

  const loadReports = React.useCallback(async () => {
    if (!adminUser?.id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/missing-images", {
        headers: {
          "x-admin-user-id": adminUser.id,
          "x-admin-email": adminUser.email ?? "",
        },
      });
      const data = (await response.json()) as {
        reports?: MissingImageReport[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Rapporten laden mislukt.");
      setReports(data.reports ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Rapporten laden is mislukt.",
      );
    } finally {
      setLoading(false);
    }
  }, [adminUser?.email, adminUser?.id]);

  React.useEffect(() => {
    void loadReports();
  }, [loadReports]);

  const handleScan = React.useCallback(async () => {
    if (!adminUser?.id) return;
    setScanning(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/missing-images", {
        method: "POST",
        headers: {
          "x-admin-user-id": adminUser.id,
          "x-admin-email": adminUser.email ?? "",
        },
      });
      const data = (await response.json()) as ScanResult & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Scan uitvoeren mislukt.");
      setLastScan(data);
      await loadReports();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Ontbrekende afbeeldingen scannen is mislukt.",
      );
    } finally {
      setScanning(false);
    }
  }, [adminUser?.email, adminUser?.id, loadReports]);

  const activeReports = React.useMemo(
    () => reports.filter(reportIsActive),
    [reports],
  );
  const filteredReports = React.useMemo(
    () => filterReports({ reports, query, status, imageKind }),
    [reports, query, status, imageKind],
  );

  if (authLoading || (!user && !error)) {
    return <PageSpinner />;
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[960px] flex-col gap-6 bg-[var(--bg-default)] px-4 pb-28 pt-[calc(24px+env(safe-area-inset-top,0px))]">
      <header className="flex flex-col gap-4 rounded-xl bg-[var(--white)] p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium leading-5 text-[var(--text-secondary)]">
              Admin
            </p>
            <h1 className="text-2xl font-semibold leading-8 text-[var(--text-primary)]">
              Ontbrekende afbeeldingen
            </h1>
            <p className="mt-2 max-w-2xl text-sm font-normal leading-5 text-[var(--text-secondary)]">
              Scan alle lijstjes, favorietenlijstjes, receptingrediënten en
              recepten om te zien waar nog foto’s ontbreken.
            </p>
          </div>
          <Button
            type="button"
            variant="primary"
            className="w-full max-w-none sm:w-auto"
            disabled={scanning || !user}
            onClick={handleScan}
          >
            {scanning ? "Scannen…" : "Nu scannen"}
          </Button>
        </div>
        {lastScan ? (
          <p className="rounded-md bg-[var(--blue-25)] px-3 py-2 text-sm leading-5 text-[var(--text-primary)]">
            Laatste scan: {formatDateTime(lastScan.scannedAtIso)} · actief:{" "}
            {lastScan.active} · opgelost: {lastScan.resolved}
          </p>
        ) : null}
        {error ? (
          <p className="rounded-md bg-[var(--status-error-bg)] px-3 py-2 text-sm leading-5 text-[var(--status-error)]">
            {error}
          </p>
        ) : null}
      </header>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Actieve meldingen" value={activeReports.length} />
        <StatCard
          label="Unieke namen"
          value={uniqueNormalizedCount(activeReports)}
          helper="Genormaliseerde product-/ingrediëntnamen"
        />
        <StatCard
          label="Totaal historiek"
          value={reports.length}
          helper="Inclusief opgeloste meldingen"
        />
      </section>

      <section className="flex flex-col gap-4 rounded-xl bg-[var(--white)] p-4">
        <SearchBar
          value={query}
          onValueChange={setQuery}
          placeholder="Zoek op naam, bron of eigenaar"
        />
        <div className="flex flex-wrap gap-2">
          <FilterButton active={status === "active"} onClick={() => setStatus("active")}>
            Actief
          </FilterButton>
          <FilterButton active={status === "resolved"} onClick={() => setStatus("resolved")}>
            Opgelost
          </FilterButton>
          <FilterButton active={status === "all"} onClick={() => setStatus("all")}>
            Alles
          </FilterButton>
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterButton active={imageKind === "all"} onClick={() => setImageKind("all")}>
            Alle types
          </FilterButton>
          <FilterButton active={imageKind === "product"} onClick={() => setImageKind("product")}>
            Producten
          </FilterButton>
          <FilterButton active={imageKind === "ingredient"} onClick={() => setImageKind("ingredient")}>
            Ingrediënten
          </FilterButton>
          <FilterButton active={imageKind === "recipe"} onClick={() => setImageKind("recipe")}>
            Recepten
          </FilterButton>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        {loading ? (
          <PageSpinner />
        ) : filteredReports.length > 0 ? (
          filteredReports.map((report) => (
            <ReportRow key={report.id ?? report.reportKey} report={report} />
          ))
        ) : (
          <div className="rounded-xl border border-[var(--gray-100)] bg-[var(--white)] p-6 text-center">
            <h2 className="text-lg font-semibold leading-7 text-[var(--text-primary)]">
              Geen meldingen gevonden
            </h2>
            <p className="mt-2 text-sm leading-5 text-[var(--text-secondary)]">
              Pas je filters aan of start een nieuwe scan.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
