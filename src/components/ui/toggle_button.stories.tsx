import type { Meta, StoryObj } from "@storybook/react";
import { ToggleButton } from "./toggle_button";

const meta: Meta<typeof ToggleButton> = {
  title: "UI/ToggleButton",
  component: ToggleButton,
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
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
  args: {
    children: "Label",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["active", "inactive"],
      description: "active = bordered fill; inactive = subtle fill",
    },
    size: {
      control: "select",
      options: ["default"],
      description: "Button size",
    },
    asChild: {
      control: "boolean",
      description: "Render as child component (Radix Slot)",
    },
  },
};

export default meta;

type Story = StoryObj<typeof ToggleButton>;

export const Inactive: Story = {
  args: {
    variant: "inactive",
    children: "Label",
  },
};

export const Active: Story = {
  args: {
    variant: "active",
    children: "Label",
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 items-center">
      <ToggleButton variant="inactive">Label</ToggleButton>
      <ToggleButton variant="active">Label</ToggleButton>
    </div>
  ),
};

export const LongLabel: Story = {
  args: {
    variant: "active",
    children: "Zeer lange toggletekst om overflow te tonen",
  },
};

export const AsChild: Story = {
  render: () => (
    <ToggleButton variant="active" asChild>
      <a href="#toggle">Label (as link)</a>
    </ToggleButton>
  ),
};
