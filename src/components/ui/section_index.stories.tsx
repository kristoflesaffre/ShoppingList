import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { SectionIndex } from "./section_index";

/**
 * Design system «Inhoudstafel»: zijbalk die naar een sectie springt en meelicht tijdens het scrollen
 * (`useScrollSpy`). Gebruikt op de Voorraadkast (desktop).
 */
const meta: Meta<typeof SectionIndex> = {
  title: "UI/SectionIndex",
  component: SectionIndex,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div style={{ padding: "var(--space-8)", width: 236, background: "linear-gradient(150deg,#ffdca8,#fbe0d0)" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof SectionIndex>;

function Demo() {
  const [active, setActive] = React.useState("olie");
  return (
    <SectionIndex
      ariaLabel="Groepen in je voorraadkast"
      activeKey={active}
      onSelect={setActive}
      items={[
        { key: "alles", label: "Alles", count: 11 },
        { key: "bijnaOp", label: "Bijna op", count: 3, dotColor: "var(--status-warning)", separatorAfter: true },
        { key: "bakken", label: "Bakken en droogwaren", count: 4, dotColor: "rgb(185,139,62)" },
        { key: "olie", label: "Olie en sauzen", count: 2, dotColor: "rgb(139,108,240)" },
        { key: "kruiden", label: "Kruiden", count: 2, dotColor: "rgb(63,174,92)" },
        { key: "snacks", label: "Snacks", count: 1, dotColor: "rgb(224,120,47)" },
        { key: "overig", label: "Overig", count: 1, dotColor: "rgb(112,119,132)" },
      ]}
    />
  );
}

export const Voorraadkast: Story = { render: () => <Demo /> };
