import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
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
      options: [
        "default",
        "gotten-by-you",
        "gotten-by-other",
        "master",
        "added",
      ],
      description:
        "master = plus rechts (797:4807); added = primary-400, min/plus (797:5139)",
    },
    state: {
      control: "select",
      options: ["default", "shared", "editable"],
      description: "default (zonder claim), shared (met claim), of editable",
    },
    presentation: {
      control: "select",
      options: ["default", "bare"],
      description:
        "bare = alleen titel + hoeveelheid, rand, geen controls (Figma 797:4486)",
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

/** Default – unchecked, zonder claim hand icon */
export const Default: Story = {
  args: {
    itemName: "Item name",
    quantity: "Quantity",
    variant: "default",
    state: "default",
  },
};

/** Shared – unchecked, claim hand icon zichtbaar */
export const Shared: Story = {
  args: {
    itemName: "Item name",
    quantity: "Quantity",
    variant: "default",
    state: "shared",
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
    state: "shared",
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
    state: "shared",
  },
};

/** Bare – statische kaart, geen checkbox/claim/bewerken (Figma 797:4486) */
export const Bare: Story = {
  args: {
    itemName: "Item name",
    quantity: "Quantity",
    presentation: "bare",
  },
};

/** Master – tekst + divider + plus (public/icons/plus-circle.svg, Figma 797:4807) */
export const Master: Story = {
  args: {
    itemName: "Item name",
    quantity: "Quantity",
    variant: "master",
    state: "default",
    onMasterAdd: fn(),
  },
};

/** Added – primary-400, minus + plus, witte tekst (Figma 797:5139) */
export const Added: Story = {
  args: {
    itemName: "Item name",
    quantity: "Quantity",
    variant: "added",
    state: "default",
    onAddedDecrement: fn(),
    onAddedIncrement: fn(),
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
        presentation="bare"
      />
      <ItemCard
        itemName="Item name"
        quantity="Quantity"
        variant="master"
        state="default"
        onMasterAdd={fn()}
      />
      <ItemCard
        itemName="Item name"
        quantity="Quantity"
        variant="added"
        state="default"
        onAddedDecrement={fn()}
        onAddedIncrement={fn()}
      />
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
        state="shared"
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
        state="shared"
      />
      <ItemCard
        itemName="Item name"
        quantity="Quantity"
        claimedByLabel="Anne haalt dit"
        avatar={
          <div className="size-8 rounded-full bg-[var(--gray-200)]" aria-hidden />
        }
        variant="gotten-by-other"
        state="shared"
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
