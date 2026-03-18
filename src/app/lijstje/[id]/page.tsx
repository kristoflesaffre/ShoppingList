"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ItemCard } from "@/components/ui/item_card";
import { EditButton } from "@/components/ui/edit_button";
import { FloatingActionButton } from "@/components/ui/floating_action_button";
import { MiniButton } from "@/components/ui/mini_button";
import { Snackbar } from "@/components/ui/snackbar";
import { cn } from "@/lib/utils";

type ListItem = {
  id: string;
  name: string;
  quantity: string;
  checked: boolean;
  section: string;
};

const SECTION_ORDER = [
  "Algemeen",
  "Maandag",
  "Dinsdag",
  "Woensdag",
  "Donderdag",
  "Vrijdag",
  "Zaterdag",
  "Zondag",
] as const;

const DEMO_ITEMS: ListItem[] = [
  { id: "1", name: "Brood", quantity: "1 stuk", checked: false, section: "Algemeen" },
  { id: "2", name: "Item met een zeer lange naam waardoor het afkapt", quantity: "1 stuk", checked: false, section: "Algemeen" },
  { id: "3", name: "Nutella", quantity: "2 stuks", checked: false, section: "Algemeen" },
  { id: "4", name: "Aardappelen", quantity: "5 kg", checked: false, section: "Maandag" },
  { id: "5", name: "Bloemkool", quantity: "1 stuk", checked: false, section: "Maandag" },
  { id: "6", name: "Worst", quantity: "600 gram", checked: false, section: "Maandag" },
];

const LIST_NAMES: Record<string, string> = {
  weeklijstje: "Weeklijstje",
  feestje: "Feestje",
  derde: "Weeklijstje",
};

function BackArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15.41 7.41L14 6L8 12L14 18L15.41 16.59L10.83 12L15.41 7.41Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PersonAddIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M15 12C17.21 12 19 10.21 19 8C19 5.79 17.21 4 15 4C12.79 4 11 5.79 11 8C11 10.21 12.79 12 15 12ZM6 10V7H4V10H1V12H4V15H6V12H9V10H6ZM15 14C12.33 14 7 15.34 7 18V20H23V18C23 15.34 17.67 14 15 14Z"
        fill="currentColor"
      />
    </svg>
  );
}

function MoreDotsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="5" r="2" fill="currentColor" />
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <circle cx="12" cy="19" r="2" fill="currentColor" />
    </svg>
  );
}

function ChecklistIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 5H9V11H3V5ZM5 7V9H7V7H5ZM11 6H21V8H11V6ZM11 12H21V14H11V12ZM11 18H21V20H11V18ZM3 13H9V19H3V13ZM5 15V17H7V15H5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PlusCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM17 13H13V17H11V13H7V11H11V7H13V11H17V13Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function ListDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const listId = params.id;
  const listName = LIST_NAMES[listId] ?? "Lijstje";

  const [items, setItems] = React.useState<ListItem[]>(DEMO_ITEMS);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [snackbarMessage, setSnackbarMessage] = React.useState<string | null>(null);
  const [lastDeleted, setLastDeleted] = React.useState<{
    item: ListItem;
    index: number;
  } | null>(null);

  React.useEffect(() => {
    if (!snackbarMessage) return;
    const timeout = window.setTimeout(() => {
      setSnackbarMessage(null);
      setLastDeleted(null);
    }, 4500);
    return () => window.clearTimeout(timeout);
  }, [snackbarMessage]);

  const handleCheckedChange = React.useCallback(
    (id: string, checked: boolean) => {
      setItems((current) =>
        current.map((item) =>
          item.id === id ? { ...item, checked } : item
        )
      );
    },
    []
  );

  const handleDeleteItem = React.useCallback(
    (id: string) => {
      setItems((current) => {
        const index = current.findIndex((i) => i.id === id);
        if (index === -1) return current;
        const item = current[index];
        const next = [...current];
        next.splice(index, 1);
        setLastDeleted({ item, index });
        setSnackbarMessage(`'${item.name}' verwijderd`);
        return next;
      });
    },
    []
  );

  const handleUndoDelete = React.useCallback(() => {
    if (!lastDeleted) return;
    setItems((current) => {
      const next = [...current];
      next.splice(lastDeleted.index, 0, lastDeleted.item);
      return next;
    });
    setLastDeleted(null);
    setSnackbarMessage(null);
  }, [lastDeleted]);

  const sections = React.useMemo(() => {
    const grouped = new Map<string, ListItem[]>();
    for (const item of items) {
      const existing = grouped.get(item.section) ?? [];
      existing.push(item);
      grouped.set(item.section, existing);
    }
    return SECTION_ORDER.filter((s) => grouped.has(s)).map((s) => ({
      title: s,
      items: grouped.get(s)!,
    }));
  }, [items]);

  const hasItems = items.length > 0;

  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 bg-[var(--white)] px-4">
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="Terug naar lijstjes"
          className="flex size-6 shrink-0 items-center justify-center text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        >
          <BackArrowIcon />
        </button>
        <h1 className="flex-1 text-center text-base font-medium leading-24 tracking-normal text-[var(--text-primary)]">
          {listName}
        </h1>
        <button
          type="button"
          aria-label="Uitnodigen"
          className="flex size-6 shrink-0 items-center justify-center text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        >
          <PersonAddIcon />
        </button>
        <button
          type="button"
          aria-label="Meer opties"
          className="flex size-6 shrink-0 items-center justify-center text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        >
          <MoreDotsIcon />
        </button>
      </header>

      <div className="flex flex-1 flex-col px-4 pb-24 pt-8">
        <div className="mx-auto flex w-full max-w-[956px] flex-col gap-6">
          {hasItems && (
            <div className="flex items-center gap-4">
              <div className="flex flex-1 items-center gap-2">
                <ChecklistIcon className="size-6 shrink-0 text-[var(--text-primary)]" />
                <h2 className="text-page-title font-bold leading-32 tracking-normal text-[var(--text-primary)]">
                  {listName}
                </h2>
              </div>
              <EditButton
                variant={isEditMode ? "active" : "inactive"}
                onClick={() => setIsEditMode((p) => !p)}
              />
            </div>
          )}

          {!hasItems ? (
            <section
              className="flex flex-1 flex-col items-center justify-center gap-6 pt-32"
              aria-label="Lege staat"
            >
              <p className="text-center text-base font-medium leading-24 tracking-normal text-[var(--text-tertiary)]">
                Geen items in je lijstje
              </p>
              <MiniButton variant="primary">
                Voeg item toe
              </MiniButton>
            </section>
          ) : (
            <div className="flex flex-col gap-6">
              {sections.map((section) => (
                <section key={section.title} aria-label={section.title}>
                  <div className="mb-4 flex items-center gap-3 pr-4">
                    <h3 className="flex-1 text-section-title font-bold leading-24 tracking-normal text-[var(--blue-900)]">
                      {section.title}
                    </h3>
                    <button
                      type="button"
                      aria-label={`Item toevoegen aan ${section.title}`}
                      className="flex size-6 shrink-0 items-center justify-center text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
                    >
                      <PlusCircleIcon />
                    </button>
                  </div>
                  <div className="flex flex-col gap-3">
                    {section.items.map((item) => (
                      <ItemCard
                        key={item.id}
                        itemName={item.name}
                        quantity={item.quantity}
                        checked={item.checked}
                        onCheckedChange={(checked) =>
                          handleCheckedChange(item.id, checked)
                        }
                        state={isEditMode ? "editable" : "default"}
                        onDelete={
                          isEditMode
                            ? () => handleDeleteItem(item.id)
                            : undefined
                        }
                      />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>
      </div>

      {snackbarMessage && (
        <div
          className="fixed inset-x-0 bottom-24 z-10 flex justify-center px-2"
          role="region"
          aria-label="Melding"
        >
          <Snackbar
            message={snackbarMessage}
            actionLabel="Zet terug"
            onAction={handleUndoDelete}
          />
        </div>
      )}

      <FloatingActionButton
        aria-label="Item toevoegen"
        className="fixed bottom-[45px] right-6 z-20"
      />
    </div>
  );
}
