import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "./checkbox";

const meta: Meta<typeof Checkbox> = {
  title: "UI/Checkbox",
  component: Checkbox,
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
    checked: {
      control: "boolean",
      description: "Checked state (selected). Omit to use defaultChecked (uncontrolled).",
    },
    defaultChecked: {
      control: "boolean",
      description: "Initial checked state when uncontrolled",
    },
    size: {
      control: "select",
      options: ["default"],
      description: "Checkbox size",
    },
    disabled: {
      control: "boolean",
      description: "Disabled state",
    },
    asChild: {
      control: "boolean",
      description: "Render indicator content as child (Radix Slot)",
    },
  },
};

export default meta;

type Story = StoryObj<typeof Checkbox>;

export const UnselectedDefault: Story = {
  args: {
    defaultChecked: false,
  },
};

export const UnselectedDisabled: Story = {
  args: {
    defaultChecked: false,
    disabled: true,
  },
};

export const SelectedDefault: Story = {
  args: {
    defaultChecked: true,
  },
};

export const SelectedDisabled: Story = {
  args: {
    defaultChecked: true,
    disabled: true,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 items-center">
      <Checkbox defaultChecked={false} />
      <Checkbox defaultChecked={false} disabled />
      <Checkbox defaultChecked={true} />
      <Checkbox defaultChecked={true} disabled />
    </div>
  ),
};

export const WithLabel: Story = {
  render: () => (
    <label className="flex items-center gap-2 cursor-pointer">
      <Checkbox />
      <span className="text-sm text-[var(--text-primary)]">Accept terms</span>
    </label>
  ),
};

export const AsChildCustomIndicator: Story = {
  render: () => (
    <Checkbox asChild defaultChecked>
      <span aria-hidden="true">✓</span>
    </Checkbox>
  ),
};
