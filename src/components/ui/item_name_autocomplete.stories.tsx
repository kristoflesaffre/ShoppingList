import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { ItemNameAutocomplete } from "./item_name_autocomplete";

/**
 * Design system «Productveld»: leeg = zacht zoekveld; gekozen = foto-tegel (of monogram) · naam vet · «Wijzig», 58px.
 * Op de gsm opent het zoekblad. Met `showChosen` toont ook tablet/computer het gekozen product; «Wijzig» geeft het
 * zoekveld terug (gebruikt in «Item wijzigen»).
 */
const meta: Meta<typeof ItemNameAutocomplete> = {
  title: "UI/ItemNameAutocomplete",
  component: ItemNameAutocomplete,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  decorators: [(Story) => <div style={{ width: 420, padding: 24, background: "var(--white)" }}><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof ItemNameAutocomplete>;

function Demo({ initial, showChosen }: { initial: string; showChosen?: boolean }) {
  const [value, setValue] = React.useState(initial);
  return (
    <ItemNameAutocomplete
      searchVariant="top"
      showChosen={showChosen}
      placeholder="Naam item"
      ariaLabel="Product"
      value={value}
      onChange={setValue}
      onSelectItem={setValue}
    />
  );
}

export const Leeg: Story = { render: () => <Demo initial="" /> };
export const GekozenOokOpComputer: Story = { render: () => <Demo initial="Glasreiniger" showChosen /> };
