import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { EditFormRow } from "./edit_form_row";
import { Stepper } from "./stepper";

/** Formulierrij: label links (96px), bediening rechts; op de gsm het label erboven. */
const meta: Meta<typeof EditFormRow> = {
  title: "UI/EditFormRow",
  component: EditFormRow,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof EditFormRow>;

function Demo() {
  const [value, setValue] = React.useState(1);
  return (
    <div className="w-[420px] max-w-full">
      <EditFormRow label="Aantal">
        <Stepper value={value} min={1} onValueChange={setValue} />
      </EditFormRow>
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
