import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { ControlRail } from "./control_rail";

/**
 * Design system «Bedieningsrail»: omhoog · stop · omlaag als één verbonden pil naast een rolluik of in het schermpaneel.
 * Omhoog/omlaag blijven ingedrukt zolang de beweging loopt; stop veert terug.
 */
const meta: Meta<typeof ControlRail> = {
  title: "UI/ControlRail",
  component: ControlRail,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ControlRail>;

function Demo({ tone }: { tone: "surface" | "glass" }) {
  const [pressed, setPressed] = React.useState<"up" | "down" | null>(null);
  return <ControlRail name="Blinden rechts" tone={tone} pressed={pressed}
    up={{ label: "open", onClick: () => setPressed("up") }}
    stop={{ onClick: () => setPressed(null) }}
    down={{ label: "dicht", onClick: () => setPressed("down") }} />;
}

export const Surface: Story = {
  render: () => <div className="rounded-[20px] bg-[var(--bg-app,#f5f6fa)] p-8"><Demo tone="surface" /></div>,
};

export const Glass: Story = {
  render: () => <div className="rounded-[20px] bg-[#1d2350] p-8"><Demo tone="glass" /></div>,
};

export const Pressed: Story = {
  render: () => <div className="flex gap-4 rounded-[20px] bg-[var(--bg-app,#f5f6fa)] p-8">
    <ControlRail name="Omhoog" pressed="up" up={{ label: "open", onClick: () => {} }} stop={{ onClick: () => {} }} down={{ label: "dicht", onClick: () => {} }} />
    <ControlRail name="Omlaag" pressed="down" up={{ label: "open", onClick: () => {} }} stop={{ onClick: () => {} }} down={{ label: "dicht", onClick: () => {} }} />
  </div>,
};

export const Horizontal: Story = {
  render: () => <div className="rounded-[20px] bg-[#171a33] p-8">
    <ControlRail name="Projectiescherm" tone="glass" orientation="horizontal" pressed="up" className="!h-12 !w-[150px]"
      up={{ label: "helemaal omhoog", onClick: () => {} }} stop={{ onClick: () => {} }} down={{ label: "omlaag", onClick: () => {} }} />
  </div>,
};
