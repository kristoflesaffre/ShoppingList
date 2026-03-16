import type { Meta, StoryObj } from "@storybook/react";
import { ItemCard } from "./item_card";

const meta: Meta<typeof ItemCard> = {
  title: "UI/ItemCard",
  component: ItemCard,
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
        <div style={{ width: "358px", minWidth: "358px" }}>
          <Story />
        </div>
      </div>
    ),
  ],
  tags: ["autodocs"],
  argTypes: {
    itemName: { control: "text", description: "Item name" },
    quantity: { control: "text", description: "Quantity or description" },
    claimedByLabel: {
      control: "text",
      description: "e.g. 'jij haalt dit' or 'Anne haalt dit'",
    },
    checked: {
      control: "boolean",
      description: "Item obtained (strikethrough, no claim button)",
    },
    variant: {
      control: "select",
      options: ["default", "gotten-by-you", "gotten-by-other"],
      description: "Card variant",
    },
    state: {
      control: "select",
      options: ["default", "editable"],
      description: "default or editable",
    },
    size: { control: "select", options: ["default"], description: "Size" },
    asChild: {
      control: "boolean",
      description: "Replace content with child (Radix Slot)",
    },
  },
};

export default meta;

type Story = StoryObj<typeof ItemCard>;

/** Default – unchecked, claim hand icon */
export const Default: Story = {
  args: {
    itemName: "Item name",
    quantity: "Quantity",
    variant: "default",
    state: "default",
  },
};

/** Checked – obtained, strikethrough, no right icon (toggle works via checkbox) */
export const Checked: Story = {
  args: {
    itemName: "Item name",
    quantity: "Quantity",
    variant: "default",
    state: "default",
    checked: true,
  },
};

/** Gotten by you – blue border, "jij haalt dit", filled hand icon */
export const GottenByYou: Story = {
  args: {
    itemName: "Item name",
    quantity: "Quantity",
    claimedByLabel: "jij haalt dit",
    variant: "gotten-by-you",
    state: "default",
  },
};

/** Gotten by other user – blue-25 bg, "Anne haalt dit", avatar */
export const GottenByOther: Story = {
  args: {
    itemName: "Item name",
    quantity: "Quantity",
    claimedByLabel: "Anne haalt dit",
    avatar: (
      <div
        className="size-8 rounded-full bg-[var(--gray-200)]"
        aria-hidden
      />
    ),
    variant: "gotten-by-other",
    state: "default",
  },
};

/** Editable – reorder, pencil, delete */
export const Editable: Story = {
  args: {
    itemName: "Item name",
    quantity: "Quantity",
    variant: "default",
    state: "editable",
  },
};

/** Editable checked – strikethrough content, reorder, pencil, delete */
export const EditableChecked: Story = {
  args: {
    itemName: "Item name",
    quantity: "Quantity",
    variant: "default",
    state: "editable",
    checked: true,
  },
};

/** All variants */
export const AllVariants: Story = {
  render: () => (
    <div className="flex w-[358px] flex-col gap-4">
      <ItemCard
        itemName="Item name"
        quantity="Quantity"
        variant="default"
        state="default"
      />
      <ItemCard
        itemName="Item name"
        quantity="Quantity"
        variant="default"
        state="default"
        checked
      />
      <ItemCard
        itemName="Item name"
        quantity="Quantity"
        claimedByLabel="jij haalt dit"
        variant="gotten-by-you"
        state="default"
      />
      <ItemCard
        itemName="Item name"
        quantity="Quantity"
        claimedByLabel="Anne haalt dit"
        avatar={
          <div className="size-8 rounded-full bg-[var(--gray-200)]" aria-hidden />
        }
        variant="gotten-by-other"
        state="default"
      />
      <ItemCard
        itemName="Item name"
        quantity="Quantity"
        variant="default"
        state="editable"
      />
    </div>
  ),
};

export const AsChild: Story = {
  render: () => (
    <ItemCard asChild>
      <div className="flex w-full items-center gap-3 rounded-md border border-[var(--gray-100)] bg-[var(--white)] px-4 py-3 pr-3">
        <span className="text-[var(--text-primary)] font-medium">
          Custom item card
        </span>
      </div>
    </ItemCard>
  ),
};
