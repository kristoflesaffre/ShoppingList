import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { Switch } from "./switch";

/** Design system «Schakelaar»: aan/uit voor een instelling die meteen geldt. */
const meta: Meta<typeof Switch> = {
  title: "UI/Switch",
  component: Switch,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { checked: true, "aria-label": "Automatisch delen", onCheckedChange: () => {} },
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const On: Story = {};
export const Off: Story = { args: { checked: false } };
export const Disabled: Story = { args: { disabled: true } };
export const Interactive: Story = {
  render: (args) => {
    const [on, setOn] = React.useState(false);
    return <Switch {...args} checked={on} onCheckedChange={setOn} />;
  },
};
