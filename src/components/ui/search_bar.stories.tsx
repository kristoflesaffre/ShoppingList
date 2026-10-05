import type { Meta, StoryObj } from "@storybook/react";
import { SearchBar } from "./search_bar";

const meta: Meta<typeof SearchBar> = {
  title: "UI/SearchBar",
  component: SearchBar,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div
        style={{
          padding: "var(--space-8)",
          background: "var(--bg-subtle)",
          minHeight: "120px",
          width: "min(100%, 358px)",
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
  argTypes: {
    placeholder: {
      control: "text",
      description: "Placeholder when empty",
    },
    value: {
      control: "text",
      description: "Controlled value",
    },
    defaultValue: {
      control: "text",
      description: "Uncontrolled default value",
    },
    disabled: {
      control: "boolean",
      description: "Disabled state",
    },
    size: {
      control: "select",
      options: ["default"],
      description: "Search bar size",
    },
    asChild: {
      control: "boolean",
      description: "Replace default search UI with child (Radix Slot)",
    },
  },
};

export default meta;

type Story = StoryObj<typeof SearchBar>;

/**
 * Design system «Zoekveld»: zacht grijs vlak, geen rand, vergrootglas links (radius 16, hoogte 48).
 * Zelfde look als de zoek-trigger van ItemNameAutocomplete, die op mobiel het zoekblad met de
 * zoekbalk bovenaan opent.
 */
/** Without content – placeholder only, default state */
export const WithoutContent: Story = {
  args: {
    defaultValue: "",
    placeholder: "Zoek een product",
  },
};

/** With content – value and grey clear button */
export const WithContent: Story = {
  args: {
    defaultValue: "Value",
    placeholder: "Zoek een product",
  },
};

/** Default state (empty, interactive) */
export const Default: Story = {
  args: {
    defaultValue: "",
    placeholder: "Zoek een product",
  },
};

/** Disabled state – faded, no interaction */
export const Disabled: Story = {
  args: {
    defaultValue: "",
    placeholder: "Zoek een product",
    disabled: true,
  },
};

/** Edge case: long value – input truncates, icon and clear button stay visible */
export const LongValue: Story = {
  args: {
    defaultValue: "Een heel lange zoektekst die niet op één regel past en moet worden afgekapt",
    placeholder: "Zoek een product",
  },
};

/** Focus state – white field with lavender ring (click into the field to see) */
export const Focus: Story = {
  args: {
    defaultValue: "",
    placeholder: "Zoek een product",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Click into the search field: the grey field turns white with a lavender ring and the icon turns blue.",
      },
    },
  },
};

/** All variants: without content / with content × default / disabled; bottom row has one with autoFocus */
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-full max-w-[358px]">
      <div className="flex flex-col gap-1">
        <span className="text-sm text-[var(--text-secondary)]">
          Without content
        </span>
        <SearchBar defaultValue="" placeholder="Zoek een product" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm text-[var(--text-secondary)]">
          With content
        </span>
        <SearchBar defaultValue="Value" placeholder="Zoek een product" />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm text-[var(--text-secondary)]">Disabled</span>
        <SearchBar defaultValue="" placeholder="Zoek een product" disabled />
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-sm text-[var(--text-secondary)]">
          Focus (click into field)
        </span>
        <SearchBar defaultValue="" placeholder="Zoek een product" />
      </div>
    </div>
  ),
};

export const AsChild: Story = {
  render: () => (
    <SearchBar asChild>
      <div
        className="flex h-12 w-full items-center gap-2.5 rounded-[16px] bg-[var(--gray-25)] px-3.5"
        role="search"
      >
        <input
          type="search"
          placeholder="Custom search"
          className="min-w-0 flex-1 border-none bg-transparent outline-none placeholder:text-[var(--text-placeholder)]"
          readOnly
          aria-label="Custom search"
        />
        <span className="text-[var(--gray-300)]" aria-hidden>
          🔍
        </span>
      </div>
    </SearchBar>
  ),
};
