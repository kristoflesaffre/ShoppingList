import type { Meta, StoryObj } from "@storybook/react";
import { FloatingActionButton } from "./floating_action_button";

const meta: Meta<typeof FloatingActionButton> = {
  title: "UI/FloatingActionButton",
  component: FloatingActionButton,
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
  argTypes: {
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

type Story = StoryObj<typeof FloatingActionButton>;

export const Default: Story = {
  args: {},
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 items-center">
      <FloatingActionButton />
      <FloatingActionButton disabled />
    </div>
  ),
};

export const CustomAriaLabel: Story = {
  args: {
    "aria-label": "Nieuwe lijst aanmaken",
  },
};

export const AsChild: Story = {
  render: () => (
    <FloatingActionButton asChild aria-label="Item toevoegen">
      <a href="#add">Add</a>
    </FloatingActionButton>
  ),
};
