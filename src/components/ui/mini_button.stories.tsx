import type { Meta, StoryObj } from "@storybook/react";
import { MiniButton } from "./mini_button";

const meta: Meta<typeof MiniButton> = {
  title: "UI/MiniButton",
  component: MiniButton,
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
    children: "button label",
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary"],
      description: "primary = filled; secondary = outline",
    },
    size: {
      control: "select",
      options: ["default"],
      description: "Button size",
    },
    disabled: {
      control: "boolean",
      description: "Disabled state",
    },
    asChild: {
      control: "boolean",
      description: "Render as child component (Radix Slot)",
    },
  },
};

export default meta;

type Story = StoryObj<typeof MiniButton>;

export const PrimaryDefault: Story = {
  args: {
    variant: "primary",
    children: "button label",
  },
};

export const PrimaryDisabled: Story = {
  args: {
    variant: "primary",
    disabled: true,
    children: "button label",
  },
};

export const SecondaryDefault: Story = {
  args: {
    variant: "secondary",
    children: "button label",
  },
};

export const SecondaryDisabled: Story = {
  args: {
    variant: "secondary",
    disabled: true,
    children: "button label",
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 items-center">
      <MiniButton variant="primary">button label</MiniButton>
      <MiniButton variant="primary" disabled>
        button label
      </MiniButton>
      <MiniButton variant="secondary">button label</MiniButton>
      <MiniButton variant="secondary" disabled>
        button label
      </MiniButton>
    </div>
  ),
};

export const LongLabel: Story = {
  args: {
    variant: "primary",
    children: "Zeer lange knoptekst om overflow te tonen",
  },
};

export const AsChild: Story = {
  render: () => (
    <MiniButton variant="secondary" asChild>
      <a href="#mini">button label (as link)</a>
    </MiniButton>
  ),
};
