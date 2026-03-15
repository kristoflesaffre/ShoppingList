import type { Meta, StoryObj } from "@storybook/react";
import { Stepper } from "./stepper";

const meta: Meta<typeof Stepper> = {
  title: "UI/Stepper",
  component: Stepper,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div
        style={{
          padding: "var(--space-8)",
          background: "var(--bg-subtle)",
          minHeight: "200px",
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
    label: {
      control: "text",
      description: "Label above the stepper",
    },
    value: {
      control: { type: "number", min: 0 },
      description: "Current value (controlled)",
    },
    defaultValue: {
      control: { type: "number", min: 0 },
      description: "Initial value (uncontrolled)",
    },
    min: {
      control: { type: "number", min: 0 },
      description: "Minimum value",
    },
    max: {
      control: { type: "number", min: 0 },
      description: "Maximum value",
    },
    size: {
      control: "select",
      options: ["default"],
      description: "Stepper size",
    },
    disabled: {
      control: "boolean",
      description: "Disabled state",
    },
    asChild: {
      control: "boolean",
      description: "Replace bar with child (Radix Slot)",
    },
  },
};

export default meta;

type Story = StoryObj<typeof Stepper>;

/** Variant "0": value at minimum, decrement disabled */
export const VariantZero: Story = {
  args: {
    label: "Label",
    defaultValue: 0,
  },
};

/** Variant "1 or more": value > 0, both buttons active */
export const VariantOneOrMore: Story = {
  args: {
    label: "Label",
    defaultValue: 1,
  },
};

export const DefaultDisabled: Story = {
  args: {
    label: "Label",
    defaultValue: 1,
    disabled: true,
  },
};

export const ZeroDisabled: Story = {
  args: {
    label: "Label",
    defaultValue: 0,
    disabled: true,
  },
};

export const Focus: Story = {
  args: {
    label: "Label",
    defaultValue: 1,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Focus the stepper (e.g. tab to a button) to see the 1px blue border.",
      },
    },
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-6 w-full max-w-[358px]">
      <Stepper label="Label" defaultValue={1} />
      <Stepper label="Label" defaultValue={0} />
      <Stepper label="Label" defaultValue={1} disabled />
      <Stepper label="Label" defaultValue={0} disabled />
    </div>
  ),
};

export const WithMax: Story = {
  args: {
    label: "Quantity",
    defaultValue: 2,
    min: 0,
    max: 5,
  },
};

export const TypeInValue: Story = {
  args: {
    label: "Quantity",
    defaultValue: 1,
  },
  parameters: {
    docs: {
      description: {
        story:
          "Click the value in the middle to select it and type a new number. Blur or press Enter to commit.",
      },
    },
  },
};

export const AsChild: Story = {
  render: () => (
    <Stepper label="Label" defaultValue={1} asChild>
      <div className="flex items-center gap-2 rounded-md border border-[var(--border-default)] px-3 py-2">
        <span className="text-[var(--text-primary)]">Custom bar content</span>
      </div>
    </Stepper>
  ),
};
