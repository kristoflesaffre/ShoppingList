import type { Meta, StoryObj } from "@storybook/react";
import { EditButton } from "./edit_button";

const meta: Meta<typeof EditButton> = {
  title: "UI/EditButton",
  component: EditButton,
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
      options: ["active", "inactive"],
      description: "active = check + Gereed (filled); inactive = pencil + Wijzigen (outline)",
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

type Story = StoryObj<typeof EditButton>;

export const InactiveDefault: Story = {
  args: {
    variant: "inactive",
  },
};

export const InactiveDisabled: Story = {
  args: {
    variant: "inactive",
    disabled: true,
  },
};

export const ActiveDefault: Story = {
  args: {
    variant: "active",
  },
};

export const ActiveDisabled: Story = {
  args: {
    variant: "active",
    disabled: true,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 items-center">
      <EditButton variant="inactive" />
      <EditButton variant="inactive" disabled />
      <EditButton variant="active" />
      <EditButton variant="active" disabled />
    </div>
  ),
};

export const CustomLabels: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 items-center">
      <EditButton variant="inactive" labelInactive="Bewerken" />
      <EditButton variant="active" labelActive="Opslaan" />
      <EditButton
        variant="inactive"
        labelInactive="Zeer lange knoptekst om overflow te tonen"
      />
    </div>
  ),
};

export const AsChild: Story = {
  render: () => (
    <EditButton variant="inactive" asChild>
      <a href="#edit">Wijzigen (as link)</a>
    </EditButton>
  ),
};
