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

function OnColorDemo() {
  const [value, setValue] = React.useState("alles");
  return (
    <div style={{ padding: "var(--space-4)", background: "#f6dcae", borderRadius: 16 }}>
      <FilterChipRow wrap ariaLabel="Filter de voorraadkast">
        <FilterChip surface="onColor" selected={value === "alles"} onClick={() => setValue("alles")}>
          Alles
        </FilterChip>
        <FilterChip surface="onColor" selected={value === "olie"} onClick={() => setValue("olie")}>
          Olie en sauzen
        </FilterChip>
        <FilterChip surface="onColor" selected={value === "op"} dotColor="var(--status-warning)" count={2} onClick={() => setValue("op")}>
          Bijna op
        </FilterChip>
      </FilterChipRow>
    </div>
  );
}

/** Op een gekleurde achtergrond (Frost, Voorraadkast): inactief wit. */
export const OnColor: Story = { render: () => <OnColorDemo /> };
