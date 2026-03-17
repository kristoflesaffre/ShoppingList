import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div
        style={{
          padding: "2rem",
          background: "var(--bg-subtle, #e2e4e6)",
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
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "tertiary"],
      description: "Visual variant",
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

type Story = StoryObj<typeof Button>;

export const Primary: Story = {
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

export const Secondary: Story = {
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

export const Tertiary: Story = {
  args: {
    variant: "tertiary",
    children: "button label",
  },
};

export const TertiaryDisabled: Story = {
  args: {
    variant: "tertiary",
    disabled: true,
    children: "button label",
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <Button variant="primary">Primary</Button>
      <Button variant="primary" disabled>
        Primary disabled
      </Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="secondary" disabled>
        Secondary disabled
      </Button>
      <Button variant="tertiary">Tertiary</Button>
      <Button variant="tertiary" disabled>
        Tertiary disabled
      </Button>
    </div>
  ),
};

export const AsChild: Story = {
  args: {
    variant: "primary",
    asChild: true,
    children: (
      <a href="#link">Renders as link with button styles</a>
    ),
  },
};

export const EmptyLabel: Story = {
  args: {
    variant: "primary",
    children: "",
  },
};

export const LongText: Story = {
  args: {
    variant: "secondary",
    children:
      "Button with a very long label that truncates at max-width 280px",
  },
  parameters: {
    docs: {
      description: {
        story: "Button has max-width 280px; long text truncates.",
      },
    },
  },
};
