import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { ALL_LIST_PRODUCT_ICON_URLS } from "@/lib/list-product-icon-urls";
import { ListCard } from "./list_card";

function randomListProductIcon() {
  const pool = [...ALL_LIST_PRODUCT_ICON_URLS];
  return pool[Math.floor(Math.random() * pool.length)];
}

const defaultIcon = (
  <img
    src={randomListProductIcon()}
    alt=""
    width={48}
    height={48}
    className="size-12 shrink-0 object-contain"
    aria-hidden
  />
);

const meta: Meta<typeof ListCard> = {
  title: "UI/ListCard",
  component: ListCard,
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
    listName: {
      control: "text",
      description: "List title",
    },
    date: {
      control: "text",
      description: "Optional date string",
    },
    itemCount: {
      control: "text",
      description: "Optional item count label",
    },
    state: {
      control: "select",
      options: ["default", "editable"],
      description: "default = display only; editable = reorder + delete",
    },
    displayVariant: {
      control: "select",
      options: ["default", "shared", "master"],
      description:
        "shared = (gedeeld met …) — 762:3452; master = plus-circle — 773:4183",
    },
    sharedWithFirstName: {
      control: "text",
      description: "Voornaam bij displayVariant shared",
    },
    size: {
      control: "select",
      options: ["default"],
      description: "Card size",
    },
    asChild: {
      control: "boolean",
      description: "Replace default card content with child (Radix Slot)",
    },
  },
};

export default meta;

type Story = StoryObj<typeof ListCard>;

/** Default state – display only, no actions */
export const Default: Story = {
  args: {
    listName: "List name",
    date: "25-04-2026",
    itemCount: "6 items",
    icon: defaultIcon,
    state: "default",
  },
};

/** Editable state – reorder handle, dividers, delete button */
export const Editable: Story = {
  args: {
    listName: "List name",
    date: "25-04-2026",
    itemCount: "6 items",
    icon: defaultIcon,
    state: "editable",
  },
};

const masterListIcon = (
  <img
    src="/logos/logos-action.svg"
    alt=""
    width={48}
    height={48}
    className="size-12 shrink-0 object-contain"
    aria-hidden
  />
);

/** Masterlijst-tegel – Figma 773:4183 (`public/icons/plus-circle.svg` in de kaart) */
export const Master: Story = {
  args: {
    listName: "Master list name",
    itemCount: "6 items",
    icon: masterListIcon,
    state: "default",
    displayVariant: "master",
    onMasterAdd: fn(),
  },
};

/** From-master lijst – Figma 927:7808: winkellogo-badge(s) rechtsboven */
export const FromMaster: Story = {
  args: {
    listName: "List name",
    date: "25-04-2026",
    itemCount: "6 items",
    icon: defaultIcon,
    state: "default",
    displayVariant: "from-master",
    storeLogos: ["/logos/logos-delhaize.svg", "/logos/logos-lidl.svg"],
  },
};

/** From-master met één winkel */
export const FromMasterSingleStore: Story = {
  args: {
    listName: "Lidl weekboodschappen",
    date: "25-04-2026",
    itemCount: "12 items",
    icon: defaultIcon,
    state: "default",
    displayVariant: "from-master",
    storeLogos: ["/logos/logos-lidl.svg"],
  },
};

/** Gedeelde lijst – Figma 762:3452 */
export const Shared: Story = {
  args: {
    listName: "List name",
    date: "25-04-2026",
    itemCount: "6 items",
    icon: defaultIcon,
    state: "default",
    displayVariant: "shared",
    sharedWithFirstName: "Chloé",
  },
};

/** All variants: default and editable */
export const AllVariants: Story = {
  render: () => (
    <div className="flex w-[358px] flex-col gap-4">
      <ListCard
        listName="List name"
        date="25-04-2026"
        itemCount="6 items"
        icon={defaultIcon}
        state="default"
      />
      <ListCard
        listName="List name"
        date="25-04-2026"
        itemCount="6 items"
        icon={defaultIcon}
        state="editable"
      />
      <ListCard
        listName="List name"
        date="25-04-2026"
        itemCount="6 items"
        icon={defaultIcon}
        state="default"
        displayVariant="shared"
        sharedWithFirstName="Chloé"
      />
      <ListCard
        listName="Master list name"
        itemCount="6 items"
        icon={masterListIcon}
        state="default"
        displayVariant="master"
        onMasterAdd={fn()}
      />
      <ListCard
        listName="Weekboodschappen"
        date="25-04-2026"
        itemCount="6 items"
        icon={defaultIcon}
        state="default"
        displayVariant="from-master"
        storeLogos={["/logos/logos-delhaize.svg", "/logos/logos-lidl.svg"]}
      />
    </div>
  ),
};

/** Without icon – text only */
export const WithoutIcon: Story = {
  args: {
    listName: "Boodschappen",
    date: "14-03-2026",
    itemCount: "12 items",
    state: "default",
  },
};

/** Edge case: long list name – text truncates with ellipsis in constrained width */
export const LongListName: Story = {
  args: {
    listName: "Een heel lange boodschappenlijstnaam die niet op één regel past",
    date: "25-04-2026",
    itemCount: "6 items",
    icon: defaultIcon,
    state: "default",
  },
};

/** AsChild – custom content with merged container props */
export const AsChild: Story = {
  render: () => (
    <ListCard asChild>
      <div className="flex w-full items-center gap-3 rounded-md border border-[var(--gray-100)] bg-[var(--white)] px-3 py-3">
        <span className="text-[var(--text-primary)] font-medium">
          Custom list card
        </span>
      </div>
    </ListCard>
  ),
};
