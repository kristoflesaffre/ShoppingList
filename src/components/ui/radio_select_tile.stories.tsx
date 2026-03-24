import type { Meta, StoryObj } from "@storybook/react";
import { RadioSelectTile } from "./radio_select_tile";

const meta: Meta<typeof RadioSelectTile> = {
  title: "UI/RadioSelectTile",
  component: RadioSelectTile,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div
        style={{
          padding: "var(--space-8)",
          background: "var(--bg-subtle)",
          minHeight: "220px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: "390px" }}>
          <Story />
        </div>
      </div>
    ),
  ],
  tags: ["autodocs"],
  args: {
    variant: "unselected",
    size: "default",
    state: "default",
    title: "Title",
    subtitle: "Subtitle",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["selected", "unselected"],
    },
    size: {
      control: "select",
      options: ["default"],
    },
    state: {
      control: "select",
      options: ["default", "disabled"],
    },
    title: { control: "text" },
    subtitle: { control: "text" },
    asChild: {
      control: "boolean",
      description: "Wrapper renderen als child via Radix Slot",
    },
  },
};

export default meta;
type Story = StoryObj<typeof RadioSelectTile>;

export const UnselectedDefault: Story = {
  args: {
    variant: "unselected",
    state: "default",
  },
};

export const SelectedDefault: Story = {
  args: {
    variant: "selected",
    state: "default",
  },
};

export const UnselectedDisabled: Story = {
  args: {
    variant: "unselected",
    state: "disabled",
  },
};

export const SelectedDisabled: Story = {
  args: {
    variant: "selected",
    state: "disabled",
  },
};

export const AsChild: Story = {
  render: () => (
    <RadioSelectTile asChild>
      <button
        type="button"
        className="w-full border-0 bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2"
      >
        <div className="flex w-full min-w-0 items-center gap-3">
          <span
            className="inline-flex size-6 shrink-0 items-center justify-center rounded-full border border-1 border-action-primary bg-white"
            aria-hidden="true"
          >
            <span className="size-4 rounded-full border border-1 border-blue-100 bg-action-primary" />
          </span>
          <span className="flex min-w-0 flex-1 items-center rounded-md bg-background-elevated px-4 py-3 shadow-drop">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-base font-medium leading-24 text-text-primary">
                AsChild tile
              </span>
              <span className="block truncate text-sm leading-20 text-gray-400">
                Wrapper met Slot op button
              </span>
            </span>
          </span>
        </div>
      </button>
    </RadioSelectTile>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex w-full flex-col gap-3">
      <RadioSelectTile variant="unselected" state="default" title="Title" subtitle="Subtitle" />
      <RadioSelectTile variant="selected" state="default" title="Title" subtitle="Subtitle" />
      <RadioSelectTile variant="unselected" state="disabled" title="Title" subtitle="Subtitle" />
      <RadioSelectTile variant="selected" state="disabled" title="Title" subtitle="Subtitle" />
    </div>
  ),
};
