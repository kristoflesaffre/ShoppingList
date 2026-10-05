import type { Meta, StoryObj } from "@storybook/react";
import { RoundIconButton, RoundIcons } from "./round_icon_button";

/**
 * Design system «Ronde icoonknop». Tonen: primary (acties), danger (verwijderen), neutral (sluiten),
 * surface (los op de pagina), onColor (op een gekleurde kaartkop). Maten: 28 · 32 · 36.
 */
const meta: Meta<typeof RoundIconButton> = {
  title: "UI/RoundIconButton",
  component: RoundIconButton,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof RoundIconButton>;

export const Tones: Story = {
  render: () => (
    <div className="flex items-center gap-3 rounded-[20px] bg-[var(--bg-app,#f5f6fa)] p-6">
      <RoundIconButton tone="primary" size={32} aria-label="Bewerken">{RoundIcons.pencil}</RoundIconButton>
      <RoundIconButton tone="danger" size={28} aria-label="Verwijderen">{RoundIcons.trash}</RoundIconButton>
      <RoundIconButton tone="neutral" size={36} aria-label="Sluiten">{RoundIcons.close}</RoundIconButton>
      <RoundIconButton tone="surface" size={36} aria-label="Zoeken">{RoundIcons.search}</RoundIconButton>
      <span className="flex items-center gap-2 rounded-[14px] px-3 py-2" style={{ background: "linear-gradient(90deg, rgba(63,174,92,.22), rgba(63,174,92,.06))" }}>
        <span className="text-sm font-bold">Groenten</span>
        <RoundIconButton tone="onColor" size={28} aria-label="Toevoegen">{RoundIcons.plus}</RoundIconButton>
      </span>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-3 p-6">
      <RoundIconButton size={28} aria-label="28">{RoundIcons.plus}</RoundIconButton>
      <RoundIconButton size={32} aria-label="32">{RoundIcons.plus}</RoundIconButton>
      <RoundIconButton size={36} aria-label="36">{RoundIcons.plus}</RoundIconButton>
    </div>
  ),
};
