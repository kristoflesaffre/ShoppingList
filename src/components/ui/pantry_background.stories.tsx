import type { Meta, StoryObj } from "@storybook/react";
import { PANTRY_GRADIENT_CLASS, PANTRY_TEXT_CLASS } from "./pantry_background";

/** Design system «Voorraadkast»: warme tegenhanger van Frost, op de startpaginakaart en de voorraadkastpagina. */
const meta: Meta = {
  title: "UI/PantryBackground",
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj;

export const Kaart: Story = {
  render: () => (
    <div className={`w-[358px] rounded-[24px] p-5 ${PANTRY_GRADIENT_CLASS}`}>
      <p className={`text-xs font-extrabold uppercase tracking-[0.06em] ${PANTRY_TEXT_CLASS}`}>24 producten · 3 bijna op</p>
    </div>
  ),
};
