import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { ChoiceRow } from "./choice_row";

/** Design system «Keuzerij»: één item kiezen uit een lijst. */
const meta: Meta<typeof ChoiceRow> = {
  title: "UI/ChoiceRow",
  component: ChoiceRow,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ChoiceRow>;

function ListDemo() {
  const [picked, setPicked] = React.useState("wortelsoep");
  const items = [
    { id: "wortelsoep", title: "Wortelsoep", subtitle: "4 personen" },
    { id: "paprikasoep", title: "Paprikasoep", subtitle: "2 personen" },
    { id: "witloofsoep", title: "Witloofsoep", subtitle: "2 personen" },
  ];
  return (
    <div role="radiogroup" aria-label="Recept" style={{ width: 340, display: "flex", flexDirection: "column", gap: 4 }}>
      {items.map((i) => (
        <ChoiceRow
          key={i.id}
          selected={picked === i.id}
          onSelect={() => setPicked(i.id)}
          media={<span className="size-[42px] shrink-0 rounded-full bg-[var(--gray-50)]" />}
          title={i.title}
          subtitle={i.subtitle}
        />
      ))}
    </div>
  );
}

export const List: Story = { render: () => <ListDemo /> };
