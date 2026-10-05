import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { SegmentedControl } from "./segmented_control";

/**
 * Design system «Segmentknop»: kiezen tussen 2–4 opties naast elkaar. Grijze trog, actieve optie
 * wit met donkere tekst. Voor navigatie tussen grotere secties: TabGroup (onderlijn-tabs).
 */
const meta: Meta<typeof SegmentedControl> = {
  title: "UI/SegmentedControl",
  component: SegmentedControl,
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
type Story = StoryObj<typeof SegmentedControl>;

function Demo({ fill = true }: { fill?: boolean }) {
  const [value, setValue] = React.useState<"all" | "items" | "recipes">("all");
  return (
    <SegmentedControl
      ariaLabel="Filter op type"
      fill={fill}
      value={value}
      onChange={setValue}
      options={[
        { value: "all", label: "Alles" },
        { value: "items", label: "Producten" },
        { value: "recipes", label: "Recepten" },
      ]}
    />
  );
}

/** Volle breedte (Items toevoegen). */
export const FullWidth: Story = { render: () => <Demo /> };

/** Eigen breedte (Per dag / Per categorie op desktop). */
function CompactDemo() {
  {
    const [value, setValue] = React.useState<"day" | "category">("day");
    return (
      <SegmentedControl
        ariaLabel="Groepering lijst"
        fill={false}
        value={value}
        onChange={setValue}
        options={[
          { value: "day", label: "Per dag" },
          { value: "category", label: "Per categorie" },
        ]}
      />
    );
  }
}
export const Compact: Story = { render: () => <CompactDemo /> };

/** Iconen (weergave: 1 kolom / 2 kolommen / tegels). */
function IconsDemo() {
  {
    const [value, setValue] = React.useState<"one" | "two" | "tiles">("two");
    const icon = (rects: string) => (
      <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden className="size-[18px]" dangerouslySetInnerHTML={{ __html: rects }} />
    );
    return (
      <SegmentedControl
        ariaLabel="Weergave"
        size="icon"
        fill={false}
        value={value}
        onChange={setValue}
        options={[
          { value: "one", ariaLabel: "1 kolom", label: icon('<rect x="2.5" y="3" width="15" height="3.6" rx="1.8"/><rect x="2.5" y="8.2" width="15" height="3.6" rx="1.8"/><rect x="2.5" y="13.4" width="15" height="3.6" rx="1.8"/>') },
          { value: "two", ariaLabel: "2 kolommen", label: icon('<rect x="2.5" y="3" width="6.6" height="3.6" rx="1.8"/><rect x="10.9" y="3" width="6.6" height="3.6" rx="1.8"/><rect x="2.5" y="8.2" width="6.6" height="3.6" rx="1.8"/><rect x="10.9" y="8.2" width="6.6" height="3.6" rx="1.8"/>') },
          { value: "tiles", ariaLabel: "Tegels", label: icon('<rect x="2.5" y="2.5" width="6.6" height="6.6" rx="2"/><rect x="10.9" y="2.5" width="6.6" height="6.6" rx="2"/><rect x="2.5" y="10.9" width="6.6" height="6.6" rx="2"/><rect x="10.9" y="10.9" width="6.6" height="6.6" rx="2"/>') },
        ]}
      />
    );
  }
}
export const Icons: Story = { render: () => <IconsDemo /> };

