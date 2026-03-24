import type { Meta, StoryObj } from "@storybook/react";
import { RadioButton } from "./radio_button";

const meta: Meta<typeof RadioButton> = {
  title: "UI/RadioButton",
  component: RadioButton,
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
    variant: "unselected",
    size: "default",
    state: "default",
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
    asChild: {
      control: "boolean",
    },
  },
};

export default meta;
type Story = StoryObj<typeof RadioButton>;

export const UnselectedDefault: Story = {
  args: {
    variant: "unselected",
    state: "default",
  },
};

export const UnselectedDisabled: Story = {
  args: {
    variant: "unselected",
    state: "disabled",
  },
};

export const SelectedDefault: Story = {
  args: {
    variant: "selected",
    state: "default",
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
    <RadioButton asChild variant="selected" state="default">
      <button
        type="button"
        className="border-0 bg-transparent p-0 focus-visible:outline-none"
      />
    </RadioButton>
  ),
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <RadioButton variant="unselected" state="default" />
      <RadioButton variant="unselected" state="disabled" />
      <RadioButton variant="selected" state="default" />
      <RadioButton variant="selected" state="disabled" />
    </div>
  ),
};
