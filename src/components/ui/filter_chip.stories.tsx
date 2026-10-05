import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { FilterChip, FilterChipRow } from "./filter_chip";

/**
 * Design system «Filterchip»: compact en halfvet; actief vol blauw, inactief lichtgrijs.
 * Categorie-chips tonen een gekleurd bolletje, telchips een aantal.
 */
const meta: Meta<typeof FilterChip> = {
  title: "UI/FilterChip",
  component: FilterChip,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ padding: "var(--space-8)", width: "min(100%, 358px)", background: "var(--white)" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FilterChip>;

function TypeDemo() {
  const [value, setValue] = React.useState("all");
  return (
    <FilterChipRow ariaLabel="Filter op type">
      {[
        ["all", "Alles"],
        ["items", "Producten"],
        ["recipes", "Recepten"],
      ].map(([v, l]) => (
        <FilterChip key={v} selected={value === v} onClick={() => setValue(v)}>
          {l}
        </FilterChip>
      ))}
    </FilterChipRow>
  );
}

function CategoryDemo() {
  const [value, setValue] = React.useState<string | null>("soep");
  const cats = [
    { id: "soep", label: "Soepen", dot: "#f0a33b", n: 8 },
    { id: "hoofd", label: "Hoofdgerechten", dot: "#e5484d", n: 11 },
    { id: "bij", label: "Bijgerechten", dot: "#3fae5c", n: 4 },
  ];
  return (
    <FilterChipRow wrap ariaLabel="Categorie">
      <FilterChip selected={value === null} onClick={() => setValue(null)}>
        Alle
      </FilterChip>
      {cats.map((c) => (
        <FilterChip key={c.id} selected={value === c.id} dotColor={c.dot} count={c.n} onClick={() => setValue(value === c.id ? null : c.id)}>
          {c.label}
        </FilterChip>
      ))}
    </FilterChipRow>
  );
}

/** Type-filter (zoekblad). */
export const Types: Story = { render: () => <TypeDemo /> };

/** Categorieën met bolletje en aantal. */
export const Categories: Story = { render: () => <CategoryDemo /> };
