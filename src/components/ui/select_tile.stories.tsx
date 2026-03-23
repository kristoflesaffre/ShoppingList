import type { Meta, StoryObj } from "@storybook/react";
import { SelectTile } from "./select_tile";

const meta: Meta<typeof SelectTile> = {
  title: "UI/SelectTile",
  component: SelectTile,
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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "358px", minWidth: "280px", maxWidth: "100%" }}>
          <Story />
        </div>
      </div>
    ),
  ],
  tags: ["autodocs"],
  args: {
    variant: "default",
    size: "default",
    state: "default",
    title: "Title",
    subtitle: "Subtitle",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["default"],
      description: "Design system variant (Figma 764:5251)",
    },
    size: {
      control: "select",
      options: ["default"],
      description: "Tile size",
    },
    state: {
      control: "select",
      options: ["default", "disabled"],
      description: "Interactieve staat",
    },
    title: { control: "text" },
    subtitle: { control: "text" },
    asChild: {
      control: "boolean",
      description: "Radix Slot: ene child krijgt tile-styling",
    },
  },
};

export default meta;
type Story = StoryObj<typeof SelectTile>;

/** Default – witte tile, schaduw, primary icoon (Figma). */
export const Default: Story = {
  args: {
    title: "Title",
    subtitle: "Subtitle",
    state: "default",
  },
};

/** Disabled – primary-25 achtergrond, geen schaduw, gedempte tekst en icoon. */
export const Disabled: Story = {
  args: {
    title: "Title",
    subtitle: "Subtitle",
    state: "disabled",
  },
};

export const WithoutSubtitle: Story = {
  name: "Without subtitle",
  args: {
    title: "Alleen titel",
    subtitle: undefined,
    state: "default",
  },
};

export const LongTitle: Story = {
  name: "Long title",
  args: {
    title:
      "Zeer lange titel die wordt afgekapt met een ellipsis wanneer er geen ruimte is",
    subtitle: "Ondertitel blijft leesbaar tot de rand",
    state: "default",
  },
};

export const CustomIcon: Story = {
  name: "Custom icon",
  args: {
    title: "Eigen icoon",
    subtitle: "Via `icon` prop",
    icon: (
      <span
        className="flex size-10 shrink-0 items-center justify-center rounded-md bg-status-info-bg text-section-title font-bold text-status-info"
        aria-hidden
      >
        A
      </span>
    ),
    state: "default",
  },
};

/**
 * `asChild`: styling op een `<button>` (of link) voor klikbare tegels.
 * Inhoud moet je zelf in het child zetten.
 */
export const AsChildButton: Story = {
  name: "asChild (button)",
  render: () => (
    <SelectTile asChild>
      <button
        type="button"
        className="cursor-pointer border-0 bg-transparent p-0 text-left font-sans outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
      >
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-base font-medium text-action-primary"
          aria-hidden
        >
          +
        </span>
        <div className="min-w-0 flex-1 flex flex-col">
          <span className="truncate font-medium text-base leading-24 text-text-primary">
            Klikbare tile
          </span>
          <span className="truncate font-normal text-sm leading-20 text-gray-400">
            Radix Slot op button
          </span>
        </div>
      </button>
    </SelectTile>
  ),
};

/** Alle combinaties: default + disabled (variant en size zijn hier `default`). */
export const AllVariants: Story = {
  name: "All variants & states",
  render: () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        width: "100%",
      }}
    >
      <SelectTile
        variant="default"
        size="default"
        state="default"
        title="Title"
        subtitle="Subtitle"
      />
      <SelectTile
        variant="default"
        size="default"
        state="disabled"
        title="Title"
        subtitle="Subtitle"
      />
    </div>
  ),
};
