"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDndContext,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import { ItemCard } from "@/components/ui/item_card";
import { EditButton } from "@/components/ui/edit_button";
import { FloatingActionButton } from "@/components/ui/floating_action_button";
import { MiniButton } from "@/components/ui/mini_button";
import { Snackbar } from "@/components/ui/snackbar";
import { SlideInModal } from "@/components/ui/slide_in_modal";
import { ToggleButton } from "@/components/ui/toggle_button";
import { PillTab } from "@/components/ui/pill_tab";
import { InputField } from "@/components/ui/input_field";
import { Stepper } from "@/components/ui/stepper";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/ui/search_bar";
import { RecipeTile } from "@/components/ui/recipe_tile";
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

const DAY_OPTIONS = [
  { label: "Geen", value: "Geen" },
  { label: "Ma", value: "Maandag" },
  { label: "Di", value: "Dinsdag" },
  { label: "Wo", value: "Woensdag" },
  { label: "Do", value: "Donderdag" },
  { label: "Vr", value: "Vrijdag" },
  { label: "Za", value: "Zaterdag" },
  { label: "Zo", value: "Zondag" },
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

/** public/icons/arrow.svg – terugpijl */
function BackArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3.59377 12.31C3.60777 12.329 3.61477 12.351 3.63177 12.368L9.23178 17.968C9.33378 18.069 9.46678 18.119 9.59978 18.119C9.73278 18.119 9.86678 18.068 9.96778 17.968C10.1698 17.765 10.1698 17.435 9.96778 17.232L5.25578 12.521L19.9998 12.521C20.2868 12.521 20.5198 12.288 20.5198 12.001C20.5198 11.714 20.2868 11.48 19.9998 11.48L5.25477 11.48L9.96678 6.768C10.1688 6.565 10.1688 6.236 9.96577 6.033C9.76477 5.83 9.43378 5.83 9.23078 6.033L3.63078 11.633C3.61378 11.65 3.60577 11.673 3.59177 11.692C3.56477 11.727 3.53678 11.76 3.51978 11.801C3.46678 11.929 3.46678 12.072 3.51978 12.2C3.53778 12.241 3.56677 12.275 3.59377 12.31Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** public/icons/add_person.svg */
function PersonAddIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M19.4 17.5C19.4 17.7205 19.221 17.9 19 17.9H17.9V19C17.9 19.2205 17.721 19.4 17.5 19.4C17.279 19.4 17.1 19.221 17.1 19V17.9H16C15.7795 17.9 15.6 17.721 15.6 17.5C15.6 17.279 15.779 17.1 16 17.1H17.1V16C17.1 15.7795 17.279 15.6 17.5 15.6C17.721 15.6 17.9 15.779 17.9 16V17.1H19C19.2205 17.1 19.4 17.2795 19.4 17.5ZM21.9 17.5C21.9 19.9265 19.9265 21.9 17.5 21.9C15.0735 21.9 13.1 19.9265 13.1 17.5C13.1 15.0735 15.0735 13.1 17.5 13.1C19.9265 13.1 21.9 15.0735 21.9 17.5ZM21.1 17.5C21.1 15.515 19.485 13.9 17.5 13.9C15.515 13.9 13.9 15.515 13.9 17.5C13.9 19.485 15.515 21.1 17.5 21.1C19.485 21.1 21.1 19.485 21.1 17.5ZM8.01199 10.878C7.10749 9.9775 6.60599 8.7785 6.59999 7.502V6.58C6.68349 5.334 7.21999 4.204 8.11199 3.37C9.00399 2.536 10.168 2.0765 11.3895 2.0765C12.611 2.0765 13.775 2.5355 14.667 3.37C15.56 4.2045 16.0965 5.335 16.178 6.553L16.179 7.47C16.1625 8.746 15.6595 9.942 14.763 10.843C13.8655 11.7435 12.6715 12.252 11.4015 12.275C11.3995 12.275 11.397 12.275 11.3945 12.275C10.118 12.275 8.91649 11.779 8.01199 10.878ZM7.39999 7.5C7.40499 8.562 7.82299 9.561 8.57649 10.3115C9.32949 11.061 10.329 11.4745 11.3915 11.4755C12.4515 11.4555 13.4475 11.0305 14.1965 10.279C14.9455 9.5265 15.3655 8.527 15.3795 7.4655V6.5805C15.312 5.592 14.865 4.6505 14.121 3.955C13.377 3.2595 12.407 2.877 11.3895 2.877C10.372 2.877 9.40149 3.26 8.65849 3.955C7.91499 4.65 7.46749 5.5915 7.39899 6.6075L7.39999 7.5ZM3.52399 16.773C3.86699 16.3175 4.35649 15.9785 4.90349 15.819C6.96549 15.209 9.09949 14.9 11.2495 14.9C11.283 14.9 11.325 14.911 11.35 14.9C11.57 14.9 11.749 14.7225 11.75 14.502C11.751 14.281 11.573 14.101 11.352 14.1C9.08849 14.0655 6.84449 14.41 4.67799 15.051C3.96799 15.2585 3.33099 15.699 2.88499 16.2915C2.43999 16.884 2.19299 17.6175 2.19049 18.3595V21.5C2.19049 21.7205 2.36949 21.9 2.59049 21.9H11.35C11.571 21.9 11.75 21.721 11.75 21.5C11.75 21.279 11.571 21.1 11.35 21.1H2.98999V18.361C2.99199 17.792 3.18199 17.228 3.52399 16.773Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** public/icons/dots.svg */
function MoreDotsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M14.1 12C14.1 13.16 13.16 14.1 12 14.1C10.84 14.1 9.9 13.16 9.9 12C9.9 10.84 10.84 9.9 12 9.9C13.16 9.9 14.1 10.84 14.1 12ZM4.6 9.9C3.44 9.9 2.5 10.84 2.5 12C2.5 13.16 3.44 14.1 4.6 14.1C5.76 14.1 6.7 13.16 6.7 12C6.7 10.84 5.76 9.9 4.6 9.9ZM19.4 9.9C18.24 9.9 17.3 10.84 17.3 12C17.3 13.16 18.24 14.1 19.4 14.1C20.56 14.1 21.5 13.16 21.5 12C21.5 10.84 20.56 9.9 19.4 9.9Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** public/icons/list.svg */
function ListIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M9.19998 2.1H2.59998C2.32398 2.1 2.09998 2.324 2.09998 2.6V9.16C2.09998 9.436 2.32398 9.66 2.59998 9.66H9.19998C9.47598 9.66 9.69998 9.436 9.69998 9.16V2.6C9.69998 2.323 9.47698 2.1 9.19998 2.1ZM8.69998 8.66H3.09998V3.1H8.69998V8.66ZM9.19998 14.3H2.59998C2.32398 14.3 2.09998 14.524 2.09998 14.8V21.36C2.09998 21.636 2.32398 21.86 2.59998 21.86H9.19998C9.47598 21.86 9.69998 21.636 9.69998 21.36V14.8C9.69998 14.523 9.47698 14.3 9.19998 14.3ZM8.69998 20.859H3.09998V15.3H8.69998V20.859ZM13.4 3.6C13.4 3.324 13.624 3.1 13.9 3.1H21.4C21.676 3.1 21.9 3.324 21.9 3.6C21.9 3.876 21.676 4.1 21.4 4.1H13.9C13.624 4.1 13.4 3.876 13.4 3.6ZM21.9 8.3C21.9 8.576 21.676 8.8 21.4 8.8H13.9C13.624 8.8 13.4 8.576 13.4 8.3C13.4 8.024 13.624 7.8 13.9 7.8H21.4C21.677 7.8 21.9 8.023 21.9 8.3ZM21.9 15.7C21.9 15.976 21.676 16.2 21.4 16.2H13.9C13.624 16.2 13.4 15.976 13.4 15.7C13.4 15.424 13.624 15.2 13.9 15.2H21.4C21.677 15.2 21.9 15.424 21.9 15.7ZM21.9 20.399C21.9 20.675 21.676 20.899 21.4 20.899H13.9C13.624 20.899 13.4 20.675 13.4 20.399C13.4 20.123 13.624 19.899 13.9 19.899H21.4C21.677 19.899 21.9 20.123 21.9 20.399Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** public/icons/recycle_bin.svg */
function RecycleBinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M18.938 9.5933V19.2223C18.938 19.7893 18.717 20.3243 18.317 20.7253C17.916 21.1253 17.381 21.3463 16.814 21.3463H7.18595C6.61795 21.3463 6.08395 21.1253 5.68395 20.7253C5.28295 20.3233 5.06095 19.7893 5.06095 19.2223V9.5933C5.06095 9.3063 5.29395 9.0733 5.58095 9.0733C5.86795 9.0733 6.10095 9.3063 6.10095 9.5933V19.2223C6.10095 19.5073 6.21695 19.7873 6.41895 19.9893C6.62395 20.1943 6.89595 20.3073 7.18595 20.3073H16.815C17.105 20.3073 17.377 20.1943 17.582 19.9893C17.787 19.7853 17.9 19.5123 17.9 19.2223V9.5933C17.9 9.3063 18.132 9.0733 18.42 9.0733C18.708 9.0733 18.938 9.3063 18.938 9.5933ZM21.346 6.3843C21.346 6.6713 21.114 6.9043 20.826 6.9043H3.17295C2.88595 6.9043 2.65295 6.6713 2.65295 6.3843C2.65295 6.0973 2.88595 5.8643 3.17295 5.8643H8.26995V3.1743C8.26995 2.8873 8.50295 2.6543 8.78995 2.6543H15.209C15.496 2.6543 15.729 2.8873 15.729 3.1743V5.8643H20.826C21.113 5.8643 21.346 6.0973 21.346 6.3843ZM9.31095 5.8643H14.691V3.6943H9.31095V5.8643ZM14.659 16.8143V12.0003C14.659 11.7133 14.427 11.4803 14.139 11.4803C13.851 11.4803 13.619 11.7133 13.619 12.0003V16.8143C13.619 17.1013 14.427 17.3343 14.139 17.3343C14.427 17.3343 14.659 17.1023 14.659 16.8143ZM10.38 16.8143V12.0003C10.38 11.7133 10.147 11.4803 9.85995 11.4803C9.57295 11.4803 9.33995 11.7133 9.33995 12.0003V16.8143C9.33995 17.1013 9.57295 17.3343 9.85995 17.3343C10.147 17.3343 10.38 17.1023 10.38 16.8143Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** public/icons/plus-circle.svg */
function PlusCircleIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M15.079 11.9997C15.079 12.2867 14.847 12.5197 14.559 12.5197H12.519V14.5607C12.519 14.8477 12.286 15.0807 11.999 15.0807C11.712 15.0807 11.479 14.8487 11.479 14.5607V12.5197H9.43997C9.15297 12.5197 8.91997 12.2867 8.91997 11.9997C8.91997 11.7127 9.15297 11.4797 9.43997 11.4797H11.48V9.43973C11.48 9.15273 11.713 8.91973 12 8.91973C12.287 8.91973 12.52 9.15273 12.52 9.43973V11.4797H14.56C14.847 11.4797 15.079 11.7127 15.079 11.9997ZM21.529 11.9997C21.529 17.2547 17.255 21.5287 12 21.5287C6.74497 21.5287 2.46997 17.2547 2.46997 11.9997C2.46997 6.74473 6.74497 2.46973 12 2.46973C17.255 2.46973 21.529 6.74473 21.529 11.9997ZM20.49 11.9997C20.49 7.31873 16.681 3.50973 12 3.50973C7.31897 3.50973 3.50997 7.31873 3.50997 11.9997C3.50997 16.6817 7.31897 20.4897 12 20.4897C16.681 20.4897 20.49 16.6817 20.49 11.9997Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Parse quantity "2 stuks" or "5 kg" into { stepperValue, quantityDesc } */
function parseQuantity(qty: string): { stepperValue: number; quantityDesc: string } {
  const match = qty.match(/^(\d+)\s*(.*)$/);
  if (match) {
    const num = parseInt(match[1], 10);
    return {
      stepperValue: Number.isNaN(num) ? 1 : num,
      quantityDesc: match[2].trim() || "stuk",
    };
  }
  return { stepperValue: 1, quantityDesc: qty.trim() || "stuk" };
}

/** New Item Modal – slide-in from FAB or edit from pencil */
function NewItemModal({
  open,
  onClose,
  onAdd,
  editingItem,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (item: { name: string; quantity: string; section: string }) => void;
  editingItem?: ListItem | null;
  onSave?: (item: ListItem) => void;
}) {
  const isEditMode = editingItem != null;
  const [selectedDay, setSelectedDay] = React.useState("Geen");
  const [activeTab, setActiveTab] = React.useState<"first" | "second">("first");
  const [itemName, setItemName] = React.useState("");
  const [stepperValue, setStepperValue] = React.useState(1);
  const [quantityDesc, setQuantityDesc] = React.useState("stuk");
  const [recipeSearch, setRecipeSearch] = React.useState("");
  const recipes: { id: string; name: string }[] = []; // TODO: connect to real data

  const isWeekday = selectedDay !== "Geen";
  const canAdd = itemName.trim().length > 0;

  React.useEffect(() => {
    if (!open) {
      setSelectedDay("Geen");
      setActiveTab("first");
      setItemName("");
      setStepperValue(1);
      setQuantityDesc("stuk");
      setRecipeSearch("");
    } else if (editingItem) {
      setItemName(editingItem.name);
      const { stepperValue: sv, quantityDesc: qd } = parseQuantity(
        editingItem.quantity
      );
      setStepperValue(sv);
      setQuantityDesc(qd);
      setSelectedDay(
        editingItem.section === "Algemeen" ? "Geen" : editingItem.section
      );
      setActiveTab("first");
    }
  }, [open, editingItem]);

  const handleAdd = () => {
    if (!canAdd && !isEditMode) return;
    const section = selectedDay === "Geen" ? "Algemeen" : selectedDay;
    const qty = `${stepperValue} ${quantityDesc}`;
    if (isEditMode && editingItem && onSave) {
      onSave({
        ...editingItem,
        name: itemName.trim(),
        quantity: qty,
        section,
      });
    } else {
      onAdd({ name: itemName.trim(), quantity: qty, section });
    }
    onClose();
  };

  return (
    <SlideInModal
      open={open}
      onClose={onClose}
      title={isEditMode ? "Wijzig item(s)" : "Item(s) toevoegen"}
      footer={
        !isWeekday || activeTab === "first" ? (
          <Button
            variant="primary"
            disabled={!isEditMode && !canAdd}
            onClick={handleAdd}
          >
            {isEditMode ? "Bewaren" : "Toevoegen"}
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-6">
        {/* Day selector */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-normal leading-20 tracking-normal text-[var(--text-primary)]">
            Dag
          </span>
          <div className="grid grid-cols-4 gap-2">
            {DAY_OPTIONS.map((day) => (
              <ToggleButton
                key={day.value}
                variant={selectedDay === day.value ? "active" : "inactive"}
                className="w-full"
                onClick={() => {
                  setSelectedDay(day.value);
                  if (day.value === "Geen") setActiveTab("first");
                }}
              >
                {day.label}
              </ToggleButton>
            ))}
          </div>
        </div>

        {/* Pill tab (only when weekday selected) */}
        {isWeekday && (
          <PillTab
            value={activeTab}
            onValueChange={setActiveTab}
            labelFirst="item"
            labelSecond="recept"
          />
        )}

        {/* Item form (default tab or "Geen" selected) */}
        {(!isWeekday || activeTab === "first") && (
          <div className="flex flex-col gap-6">
            <InputField
              label="Naam item"
              placeholder="Naam item"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
            />
            <div className="flex flex-col gap-2">
              <Stepper
                label="Hoeveelheid"
                value={stepperValue}
                onValueChange={setStepperValue}
                min={1}
              />
              <InputField
                value={quantityDesc}
                className="text-center"
                onFocus={(e) => {
                  const input = e.target;
                  requestAnimationFrame(() => input.select());
                }}
                onChange={(e) => setQuantityDesc(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Recipe tab */}
        {isWeekday && activeTab === "second" && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <h3 className="flex-1 text-section-title font-bold leading-24 tracking-normal text-[var(--text-primary)]">
                Jouw recepten
              </h3>
              {recipes.length > 0 && (
                <MiniButton variant="primary">+</MiniButton>
              )}
            </div>
            <SearchBar
              placeholder="Zoek recept"
              value={recipeSearch}
              onValueChange={setRecipeSearch}
            />
            {/* Empty state */}
            {recipes.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-8">
                <p className="text-center text-base font-medium leading-24 tracking-normal text-[var(--text-tertiary)]">
                  Je hebt nog geen recepten toegevoegd
                </p>
                <MiniButton variant="primary">Voeg recept toe</MiniButton>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </SlideInModal>
  );
}

/** Renders sortable item cards; must be inside DndContext for drag state. */
function SortableItemItems({
  sections,
  isEditMode,
  removingId,
  removingSectionTitle,
  addingId,
  addingIdExpanded,
  onCheckedChange,
  onDelete,
  onDeleteSection,
  onEdit,
}: {
  sections: { title: string; items: ListItem[] }[];
  isEditMode: boolean;
  removingId: string | null;
  removingSectionTitle: string | null;
  addingId: string | null;
  addingIdExpanded: boolean;
  onCheckedChange: (id: string, checked: boolean) => void;
  onDelete: (id: string) => void;
  onDeleteSection: (sectionTitle: string) => void;
  onEdit: (item: ListItem) => void;
}) {
  const { active } = useDndContext();
  const isDndActive = active != null;

  return (
    <div className="flex flex-col gap-6">
      {sections.map((section) => {
        const isSectionRemoving = removingSectionTitle === section.title;
        return (
        <section
          key={section.title}
          aria-label={section.title}
          className={cn(
            "overflow-hidden transition-[max-height,opacity] duration-200",
            "[transition-timing-function:cubic-bezier(0.16,1,0.3,1)]",
            isSectionRemoving ? "max-h-0 opacity-0" : "max-h-[3000px] opacity-100"
          )}
        >
          <div className="mb-4 flex items-center gap-3 pr-4">
            <h3 className="flex-1 text-section-title font-bold leading-24 tracking-normal text-[var(--blue-900)]">
              {section.title}
            </h3>
            {isEditMode ? (
              <button
                type="button"
                aria-label={`Sectie ${section.title} verwijderen`}
                onClick={() => onDeleteSection(section.title)}
                className="flex size-6 shrink-0 items-center justify-center text-[var(--error-600)] transition-colors hover:bg-[var(--error-25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              >
                <RecycleBinIcon />
              </button>
            ) : (
              <button
                type="button"
                aria-label={`Item toevoegen aan ${section.title}`}
                className="flex size-6 shrink-0 items-center justify-center text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
              >
                <PlusCircleIcon />
              </button>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {section.items.map((item) => {
              const isRemoving = removingId === item.id;
              const isAdding = addingId === item.id;
              const isAddingCollapsed = isAdding && !addingIdExpanded;
              const isAnimating = isRemoving || isAddingCollapsed;
              const wrapperClass = isDndActive
                ? ""
                : cn(
                    "overflow-hidden transition-[max-height,opacity,margin] duration-300 ease-out",
                    isAnimating
                      ? "max-h-0 opacity-0"
                      : "max-h-[200px] opacity-100"
                  );

              return (
                <div key={item.id} className={wrapperClass}>
                  <SortableItemCard
                    item={item}
                    isEditMode={isEditMode}
                    onCheckedChange={(checked) =>
                      onCheckedChange(item.id, checked)
                    }
                    onDelete={() => onDelete(item.id)}
                    onEdit={() => onEdit(item)}
                  />
                </div>
              );
            })}
          </div>
        </section>
        );
      })}
    </div>
  );
}

function SortableItemCard({
  item,
  isEditMode,
  onCheckedChange,
  onDelete,
  onEdit,
}: {
  item: ListItem;
  isEditMode: boolean;
  onCheckedChange: (checked: boolean) => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        isDragging &&
          "z-10 cursor-grabbing opacity-90 shadow-[var(--shadow-drop)]"
      )}
    >
      <ItemCard
        itemName={item.name}
        quantity={item.quantity}
        checked={item.checked}
        onCheckedChange={onCheckedChange}
        state={isEditMode ? "editable" : "default"}
        onDelete={isEditMode ? onDelete : undefined}
        onEdit={isEditMode ? onEdit : undefined}
        dragHandleProps={
          isEditMode ? { ...attributes, ...listeners } : undefined
        }
      />
    </div>
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
  const [isNewItemOpen, setIsNewItemOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<ListItem | null>(null);
  const [snackbarMessage, setSnackbarMessage] = React.useState<string | null>(
    null
  );
  const [lastDeleted, setLastDeleted] = React.useState<{
    item: ListItem;
    index: number;
  } | null>(null);
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [removingSectionTitle, setRemovingSectionTitle] = React.useState<
    string | null
  >(null);
  const [addingId, setAddingId] = React.useState<string | null>(null);
  const [addingIdExpanded, setAddingIdExpanded] = React.useState(false);
  const removeTimeoutRef = React.useRef<number | NodeJS.Timeout | null>(null);

  const DELETE_ANIMATION_MS = 300;
  const ADD_ANIMATION_MS = 300;

  React.useEffect(() => {
    if (!addingId) return;
    setAddingIdExpanded(false);
    const rafId = requestAnimationFrame(() => {
      setAddingIdExpanded(true);
    });
    const timeoutId = window.setTimeout(() => {
      setAddingId(null);
      setAddingIdExpanded(false);
    }, ADD_ANIMATION_MS);
    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timeoutId);
    };
  }, [addingId]);

  React.useEffect(() => {
    return () => {
      if (removeTimeoutRef.current) clearTimeout(removeTimeoutRef.current);
    };
  }, []);

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

  const handleDeleteItem = React.useCallback((id: string) => {
    if (removeTimeoutRef.current) {
      clearTimeout(removeTimeoutRef.current);
      removeTimeoutRef.current = null;
    }
    setRemovingId(id);
    removeTimeoutRef.current = window.setTimeout(() => {
      removeTimeoutRef.current = null;
      setItems((current) => {
        const index = current.findIndex((i) => i.id === id);
        if (index === -1) return current;
        const item = current[index];
        const next = [...current];
        next.splice(index, 1);
        setLastDeleted({ item, index });
        setSnackbarMessage(`'${item.name}' verwijderd`);
        setRemovingId(null);
        return next;
      });
    }, DELETE_ANIMATION_MS);
  }, []);

  const SECTION_DELETE_ANIMATION_MS = 200;

  const handleDeleteSection = React.useCallback((sectionTitle: string) => {
    setRemovingSectionTitle(sectionTitle);
    window.setTimeout(() => {
      setItems((current) =>
        current.filter((item) => item.section !== sectionTitle)
      );
      setRemovingSectionTitle(null);
    }, SECTION_DELETE_ANIMATION_MS);
  }, []);

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

  const handleAddNewItem = React.useCallback(
    (newItem: { name: string; quantity: string; section: string }) => {
      const id = `new-${Date.now()}`;
      setItems((current) => [
        ...current,
        {
          id,
          name: newItem.name,
          quantity: newItem.quantity,
          checked: false,
          section: newItem.section,
        },
      ]);
      setAddingId(id);
      setIsNewItemOpen(false);
    },
    [],
  );

  const handleSaveEditedItem = React.useCallback((updatedItem: ListItem) => {
    setItems((current) =>
      current.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
    setEditingItem(null);
  }, []);

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

  const handleReorderItems = React.useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    if (over == null || active.id === over.id) return;
    setItems((current) => {
      const oldIndex = current.findIndex((i) => i.id === active.id);
      const newIndex = current.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return current;
      return arrayMove(current, oldIndex, newIndex);
    });
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 3 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 100, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div className="relative flex min-h-screen w-full flex-col">
      <header className="sticky top-0 z-10 flex h-16 items-center gap-4 bg-[var(--white)] px-4">
        <button
          type="button"
          onClick={() => router.push("/")}
          aria-label="Terug naar lijstjes"
          className="flex size-6 shrink-0 items-center justify-center text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        >
          <BackArrowIcon />
        </button>
        <h1 className="flex-1 text-center text-base font-medium leading-24 tracking-normal text-[var(--text-primary)]">
          {listName}
        </h1>
        <button
          type="button"
          aria-label="Uitnodigen"
          className="flex size-6 shrink-0 items-center justify-center text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        >
          <PersonAddIcon />
        </button>
        <button
          type="button"
          aria-label="Meer opties"
          className="flex size-6 shrink-0 items-center justify-center text-[var(--blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)]"
        >
          <MoreDotsIcon />
        </button>
      </header>

      <div className="flex flex-1 flex-col px-4 pb-24 pt-8">
        <div className="mx-auto flex w-full max-w-[956px] flex-col gap-6">
          {hasItems && (
            <div className="flex items-center gap-4">
              <div className="flex flex-1 items-center gap-2">
                <ListIcon className="size-6 shrink-0 text-[var(--text-primary)]" />
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
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleReorderItems}
              modifiers={[restrictToVerticalAxis]}
            >
              <SortableContext
                items={items.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                <SortableItemItems
                  sections={sections}
                  isEditMode={isEditMode}
                  removingId={removingId}
                  removingSectionTitle={removingSectionTitle}
                  addingId={addingId}
                  addingIdExpanded={addingIdExpanded}
                  onCheckedChange={handleCheckedChange}
                  onDelete={handleDeleteItem}
                  onDeleteSection={handleDeleteSection}
                  onEdit={(item) => {
                    setEditingItem(item);
                  }}
                />
              </SortableContext>
            </DndContext>
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
        onClick={() => {
          setEditingItem(null);
          setIsNewItemOpen(true);
        }}
      />

      <NewItemModal
        open={isNewItemOpen || editingItem != null}
        onClose={() => {
          setIsNewItemOpen(false);
          setEditingItem(null);
        }}
        onAdd={handleAddNewItem}
        editingItem={editingItem}
        onSave={handleSaveEditedItem}
      />
    </div>
  );
}
