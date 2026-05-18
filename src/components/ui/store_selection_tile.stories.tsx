import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { StoreSelectionTile } from "./store_selection_tile";
import {
  MASTER_STORE_OPTIONS,
  TE_KOPEN_STORE_OPTIONS,
} from "@/lib/master-stores";

const meta: Meta<typeof StoreSelectionTile> = {
  title: "UI/StoreSelectionTile",
  component: StoreSelectionTile,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div
        style={{
          padding: "var(--space-8)",
          background: "var(--bg-subtle)",
          minHeight: "160px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
  args: {
    label: "Lidl",
    logoSrc: "/logos/logos-lidl.svg",
    selected: false,
  },
  argTypes: {
    label: { control: "text" },
    logoSrc: { control: "text" },
    selected: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof StoreSelectionTile>;

export const Default: Story = {
  args: {
    selected: false,
    label: "Lidl",
    logoSrc: MASTER_STORE_OPTIONS.find((s) => s.slug === "lidl")?.logoSrc ?? "",
  },
};

export const Selected: Story = {
  args: {
    selected: true,
    label: "Lidl / Delhaize",
    logoSrc:
      MASTER_STORE_OPTIONS.find((s) => s.slug === "lidl-delhaize")?.logoSrc ?? "",
  },
};

export const Disabled: Story = {
  args: {
    selected: false,
    disabled: true,
  },
};

export const LongLabel: Story = {
  args: {
    selected: true,
    label: "Lidl / Delhaize combinatie",
    logoSrc:
      MASTER_STORE_OPTIONS.find((s) => s.slug === "lidl-delhaize")?.logoSrc ?? "",
  },
};

/** Swimlane zoals in slide-ins (radiogroup, één keuze tegelijk). */
export const Swimlane: Story = {
  render: function SwimlaneStory() {
    const [selectedSlug, setSelectedSlug] = React.useState<string | null>("lidl");
    const stores = TE_KOPEN_STORE_OPTIONS.filter((s) =>
      ["landal", "lidl-delhaize", "lidl", "delhaize"].includes(s.slug),
    );

    return (
      <div
        role="radiogroup"
        aria-label="Winkel, optioneel"
        className="-mx-1 flex gap-[var(--space-3)] overflow-x-auto px-1 pb-1 pt-0.5"
      >
        {stores.map((store) => {
          const selected = selectedSlug === store.slug;
          return (
            <StoreSelectionTile
              key={store.slug}
              label={store.label}
              logoSrc={store.logoSrc}
              selected={selected}
              role="radio"
              aria-checked={selected}
              onClick={() =>
                setSelectedSlug((prev) => (prev === store.slug ? null : store.slug))
              }
            />
          );
        })}
      </div>
    );
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="flex gap-[var(--space-3)]">
      <StoreSelectionTile
        label="Lidl"
        logoSrc={MASTER_STORE_OPTIONS[0]?.logoSrc ?? ""}
        selected={false}
      />
      <StoreSelectionTile
        label="Delhaize"
        logoSrc={MASTER_STORE_OPTIONS[1]?.logoSrc ?? ""}
        selected
      />
      <StoreSelectionTile
        label="Landal"
        logoSrc={TE_KOPEN_STORE_OPTIONS.find((s) => s.slug === "landal")?.logoSrc ?? ""}
        selected={false}
        disabled
      />
    </div>
  ),
};
