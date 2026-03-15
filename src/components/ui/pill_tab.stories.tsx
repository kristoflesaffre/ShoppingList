import type { Meta, StoryObj } from "@storybook/react";
import { PillTab } from "./pill_tab";

const meta: Meta<typeof PillTab> = {
  title: "UI/PillTab",
  component: PillTab,
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
    value: {
      control: "select",
      options: ["first", "second"],
      description: "Active tab (controlled)",
    },
    defaultValue: {
      control: "select",
      options: ["first", "second"],
      description: "Initial active tab (uncontrolled)",
    },
    labelFirst: {
      control: "text",
      description: "Label for the first (left) tab",
    },
    labelSecond: {
      control: "text",
      description: "Label for the second (right) tab",
    },
    size: {
      control: "select",
      options: ["default"],
      description: "Pill tab size",
    },
    asChild: {
      control: "boolean",
      description: "Replace default pill with child (Radix Slot)",
    },
  },
};

export default meta;

type Story = StoryObj<typeof PillTab>;

/** First (left) tab active – click tabs to switch */
export const FirstTabActive: Story = {
  args: {
    defaultValue: "first",
    labelFirst: "Tab 1",
    labelSecond: "Tab 2",
  },
};

/** Second (right) tab active */
export const SecondTabActive: Story = {
  args: {
    defaultValue: "second",
    labelFirst: "Tab 1",
    labelSecond: "Tab 2",
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-4 w-full max-w-[358px]">
      <PillTab defaultValue="first" labelFirst="Tab 1" labelSecond="Tab 2" />
      <PillTab defaultValue="second" labelFirst="Tab 1" labelSecond="Tab 2" />
    </div>
  ),
};

export const LongLabels: Story = {
  args: {
    defaultValue: "first",
    labelFirst: "Eerste tab met lange tekst",
    labelSecond: "Tweede tab met lange tekst",
  },
};

export const AsChild: Story = {
  render: () => (
    <PillTab defaultValue="first" asChild>
      <div className="flex gap-0 rounded-pill border border-[var(--gray-100)] bg-[var(--gray-25)] px-4 py-2">
        <span className="text-[var(--action-primary)] font-semibold">Custom content</span>
      </div>
    </PillTab>
  ),
};
