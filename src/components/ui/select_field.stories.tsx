import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { SelectField } from "./select_field";

/**
 * Design system «Keuzeveld»: één waarde uit een lijst, zelfde vorm als het invoerveld. Gebruikt in «Item wijzigen»
 * voor de eenheid en de categorie (met bolletje).
 */
const meta: Meta<typeof SelectField> = {
  title: "UI/SelectField",
  component: SelectField,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  decorators: [(Story) => <div style={{ width: 320, padding: 24, background: "var(--white)" }}><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof SelectField>;

function Demo({ dots }: { dots: boolean }) {
  const options = dots
    ? [
        { value: "groenten", label: "Groenten & Fruit", dotColor: "rgb(63, 174, 92)" },
        { value: "huishouden", label: "Huishouden & Schoonmaak", dotColor: "rgb(43, 179, 163)" },
        { value: "dranken", label: "Koude Dranken", dotColor: "rgb(47, 143, 224)" },
      ]
    : ["stuk", "pak", "fles", "kilogram", "gram"].map((u) => ({ value: u, label: u }));
  const [value, setValue] = React.useState(options[dots ? 1 : 0].value);
  return <SelectField ariaLabel={dots ? "Categorie" : "Eenheid"} value={value} onChange={setValue} options={options} />;
}

export const Eenheid: Story = { render: () => <Demo dots={false} /> };
export const CategorieMetBolletje: Story = { render: () => <Demo dots /> };
