import type { Meta, StoryObj } from "@storybook/react";
import { RecipeTile } from "./recipe_tile";

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
    itemCount: { control: "text", description: "Number of ingredients (e.g. '5 items')" },
    state: {
      control: "select",
      options: ["default", "disabled"],
      description: "Visual state of the tile",
    },
  },
};

export default meta;
type Story = StoryObj<typeof RecipeTile>;

export const Default: Story = {
  args: {
    recipeName: "Pasta bolognese",
    itemCount: "5 items",
    state: "default",
  },
};

export const Disabled: Story = {
  args: {
    recipeName: "Pasta bolognese",
    itemCount: "5 items",
    state: "disabled",
  },
};

export const WithoutItemCount: Story = {
  name: "Without item count",
  args: {
    recipeName: "Pasta bolognese",
    state: "default",
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
  name: "All states",
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", width: "358px" }}>
      <RecipeTile recipeName="Pasta bolognese" itemCount="5 items" state="default" />
      <RecipeTile recipeName="Pasta bolognese" itemCount="5 items" state="disabled" />
    </div>
  ),
};
