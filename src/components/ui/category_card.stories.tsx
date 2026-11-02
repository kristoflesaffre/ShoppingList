import type { Meta, StoryObj } from "@storybook/react";
import { CategoryCard, CategorySubheading } from "./category_card";
import { RoundIconButton, RoundIcons } from "./round_icon_button";

/** Design system «Categoriekaart»: witte kaart met gekleurde kop (bolletje · titel · aantal · actie). */
const meta: Meta<typeof CategoryCard> = {
  title: "UI/CategoryCard",
  component: CategoryCard,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ padding: "var(--space-8)", width: "min(100%, 358px)", background: "var(--bg-app, #f5f6fa)" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof CategoryCard>;

export const WithSubheadings: Story = {
  render: () => (
    <CategoryCard rgb={[63, 174, 92]} title="Groenten & Fruit" count={4}>
      <div className="px-3.5 pb-1 text-[15px]">
        <CategorySubheading className="pt-3">Groenten</CategorySubheading>
        <div className="py-2">Aardappelen</div>
        <div className="border-t border-[var(--border-subtle)] py-2">Komkommer</div>
        <CategorySubheading className="pt-3">Fruit</CategorySubheading>
        <div className="py-2">Appels</div>
        <div className="border-t border-[var(--border-subtle)] py-2">Bananen</div>
      </div>
    </CategoryCard>
  ),
};

export const WithAction: Story = {
  render: () => (
    <CategoryCard
      rgb={[63, 174, 92]}
      title="Groenten & Fruit"
      count={2}
      action={
        <RoundIconButton tone="onColor" size={28} aria-label="Toevoegen aan Groenten & Fruit">
          {RoundIcons.plus}
        </RoundIconButton>
      }
    >
      <ul className="px-3.5 py-2 text-[15px]">
        <li className="py-2">Appels</li>
        <li className="border-t border-[var(--border-subtle)] py-2">Bananen</li>
      </ul>
    </CategoryCard>
  ),
};
