import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { RecipeTile } from "./recipe_tile";

/** Voorbeeld-URL voor Storybook (geen data-URL; thumbnailformaat). */
const DEMO_RECIPE_PHOTO =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=96&h=96&fit=crop";

const meta: Meta<typeof RecipeTile> = {
  title: "UI/RecipeTile",
  component: RecipeTile,
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
    recipeName: { control: "text", description: "Recipe name" },
    itemCount: {
      control: "text",
      description: "Number of ingredients (e.g. '5 items')",
    },
    state: {
      control: "select",
      options: ["default", "bare", "editable", "disabled"],
      description:
        "Figma 520:2469 — default (+potlood), bare (alleen tekst), editable (+sleep+prullenbak), disabled",
    },
  },
};

export default meta;
type Story = StoryObj<typeof RecipeTile>;

/** Standaard: witte kaart + schaduw + potlood (Figma “Default”). */
export const Default: Story = {
  args: {
    recipeName: "Pasta bolognese",
    itemCount: "5 items",
    state: "default",
    onEdit: fn(),
  },
};

export const DefaultWithPhoto: Story = {
  name: "Default with photo",
  args: {
    recipeName: "Pasta bolognese",
    itemCount: "5 items",
    state: "default",
    photoUrl: DEMO_RECIPE_PHOTO,
    onEdit: fn(),
  },
};

/** Alleen titel + subtitel, geen iconen (Figma “Bare”). */
export const Bare: Story = {
  args: {
    recipeName: "Pasta bolognese",
    itemCount: "5 items",
    state: "bare",
  },
};

/** Volgorde | tekst + potlood | verwijderen (Figma “Editable”). */
export const Editable: Story = {
  args: {
    recipeName: "Pasta bolognese",
    itemCount: "5 items",
    state: "editable",
    onEdit: fn(),
    onDelete: fn(),
    dragHandleProps: {
      onPointerDown: fn(),
    },
  },
};

export const Disabled: Story = {
  args: {
    recipeName: "Pasta bolognese",
    itemCount: "5 items",
    state: "disabled",
  },
};

export const DisabledWithPhoto: Story = {
  name: "Disabled with photo",
  args: {
    recipeName: "Pasta bolognese",
    itemCount: "5 items",
    state: "disabled",
    photoUrl: DEMO_RECIPE_PHOTO,
  },
};

export const WithoutItemCount: Story = {
  name: "Without item count",
  args: {
    recipeName: "Pasta bolognese",
    state: "default",
    onEdit: fn(),
  },
};

export const LongName: Story = {
  name: "Long recipe name",
  args: {
    recipeName: "Oma's klassieke zuurkoolstamppot met spek en mosterd",
    itemCount: "12 items",
    state: "default",
  },
};

export const AllStates: Story = {
  name: "All states (Figma order)",
  render: () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        width: "358px",
      }}
    >
      <RecipeTile
        recipeName="Recipe name"
        itemCount="5 items"
        state="default"
        onEdit={fn()}
      />
      <RecipeTile
        recipeName="Recipe name"
        itemCount="5 items"
        state="disabled"
      />
      <RecipeTile
        recipeName="Recipe name"
        itemCount="5 items"
        state="bare"
      />
      <RecipeTile
        recipeName="Recipe name"
        itemCount="5 items"
        state="editable"
        onEdit={fn()}
        onDelete={fn()}
        dragHandleProps={{}}
      />
    </div>
  ),
};
