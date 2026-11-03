import type { Meta, StoryObj } from "@storybook/react";
import { ChosenProductCard } from "./chosen_product_card";

/**
 * Design system «Gekozen product»: kopblok bovenaan «Product toevoegen» (Voorraadkast) nadat je een product koos.
 */
const meta: Meta<typeof ChosenProductCard> = {
  title: "UI/ChosenProductCard",
  component: ChosenProductCard,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  decorators: [(Story) => <div style={{ width: 520, padding: 24, background: "var(--white)" }}><Story /></div>],
  args: { onChange: () => {} },
};

export default meta;
type Story = StoryObj<typeof ChosenProductCard>;

export const MetFoto: Story = {
  args: { name: "Olijfolie", photoUrl: "/images/ingredients/olijfolie_160.webp", subtitle: "Olie en sauzen · nieuw in je voorraadkast" },
};

export const AlInVoorraad: Story = {
  args: { name: "Bloem", photoUrl: "/images/ingredients/bloem_160.webp", subtitle: "Je hebt al 1 pak · dit komt erbij" },
};

export const ZonderFoto: Story = {
  args: { name: "Pick up", photoUrl: null, subtitle: "Snacks · nieuw in je voorraadkast" },
};
