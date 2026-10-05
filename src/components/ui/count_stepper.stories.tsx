import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { CountStepper } from "./count_stepper";

/**
 * Design system «Stepper · lijst»: blauwe pil voor aantallen in lijsten (favorieten, items
 * toevoegen). Bij 1 wordt de min een vuilbakje. Formulieren gebruiken Stepper (grijs veld).
 */
const meta: Meta<typeof CountStepper> = {
  title: "UI/CountStepper",
  component: CountStepper,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof CountStepper>;

function Demo({ start }: { start: number }) {
  const [value, setValue] = React.useState(start);
  return value > 0 ? (
    <CountStepper name="Appels" value={value} onChange={setValue} />
  ) : (
    <button type="button" className="text-sm font-semibold text-[var(--blue-500)]" onClick={() => setValue(1)}>
      Opnieuw toevoegen
    </button>
  );
}

export const One: Story = { render: () => <Demo start={1} /> };
export const Several: Story = { render: () => <Demo start={3} /> };
