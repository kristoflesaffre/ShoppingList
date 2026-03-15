import type { Meta, StoryObj } from "@storybook/react";
import { InputField } from "./input_field";

const meta: Meta<typeof InputField> = {
  title: "UI/InputField",
  component: InputField,
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
      description: "Label above the input",
    },
    placeholder: {
      control: "text",
      description: "Placeholder text when empty",
    },
    size: {
      control: "select",
      options: ["default"],
      description: "Input size",
    },
    disabled: {
      control: "boolean",
      description: "Disabled state",
    },
    asChild: {
      control: "boolean",
      description: "Merge props onto child input (Radix Slot)",
    },
  },
};

export default meta;

type Story = StoryObj<typeof InputField>;

export const WithoutContentDefault: Story = {
  args: {
    label: "Label",
    placeholder: "Placeholder text",
    defaultValue: "",
  },
};

export const WithContentDefault: Story = {
  args: {
    label: "Label",
    placeholder: "Placeholder text",
    defaultValue: "Value",
  },
};

export const WithoutContentDisabled: Story = {
  args: {
    label: "Label",
    placeholder: "Placeholder text",
    defaultValue: "",
    disabled: true,
  },
};

export const WithContentDisabled: Story = {
  args: {
    label: "Label",
    placeholder: "Placeholder text",
    defaultValue: "Value",
    disabled: true,
  },
};

export const Focus: Story = {
  args: {
    label: "Label",
    placeholder: "Placeholder text",
    defaultValue: "",
    autoFocus: true,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-6 w-full max-w-[358px]">
      <InputField label="Label" placeholder="Placeholder text" />
      <InputField
        label="Label"
        placeholder="Placeholder text"
        defaultValue="Value"
      />
      <InputField
        label="Label"
        placeholder="Placeholder text"
        disabled
      />
      <InputField
        label="Label"
        placeholder="Placeholder text"
        defaultValue="Value"
        disabled
      />
    </div>
  ),
};

export const LongLabelAndPlaceholder: Story = {
  args: {
    label: "Zeer lange labeltekst om overflow of wrapping te tonen",
    placeholder: "Zeer lange placeholdertekst voor het invoerveld",
    defaultValue: "",
  },
};

export const AsChild: Story = {
  render: () => (
    <InputField label="Label" placeholder="Placeholder text" asChild>
      <input type="email" />
    </InputField>
  ),
};
