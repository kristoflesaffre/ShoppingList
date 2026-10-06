import type { Meta, StoryObj } from "@storybook/react";
import { CountBadge } from "./count_badge";

/** Design system «Aantalpil»: zachte lavendel pil; in bewerkmodus vervangen door CountStepper. */
const meta: Meta<typeof CountBadge> = {
  title: "UI/CountBadge",
  component: CountBadge,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  args: { value: 3, label: "3 porties" },
};

export default meta;
type Story = StoryObj<typeof CountBadge>;

export const Default: Story = {};
export const TwoDigits: Story = { args: { value: 12, label: "12 porties" } };
