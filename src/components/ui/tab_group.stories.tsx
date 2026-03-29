import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { TabGroup } from "./tab_group";
import { TabElement } from "./tab_element";

const meta: Meta<typeof TabGroup> = {
  title: "UI/TabGroup",
  component: TabGroup,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div
        style={{
          padding: "var(--space-8)",
          background: "var(--bg-subtle)",
          minHeight: "120px",
          width: "min(100%, 358px)",
        }}
      >
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof TabGroup>;

/** Figma 860-5349: twee tabs, eerste standaard actief */
export const TwoTabs: Story = {
  render: () => {
    const [value, setValue] = React.useState("1");
    return (
      <TabGroup value={value} onValueChange={setValue}>
        <TabElement value="1">Tab 1</TabElement>
        <TabElement value="2">Tab</TabElement>
      </TabGroup>
    );
  },
};

/** Drie tabs waarvan een uitgeschakeld */
export const ThreeTabsOneDisabled: Story = {
  render: () => {
    const [value, setValue] = React.useState("a");
    return (
      <TabGroup value={value} onValueChange={setValue} aria-label="Secties">
        <TabElement value="a">Overzicht</TabElement>
        <TabElement value="b" disabled>
          Concept
        </TabElement>
        <TabElement value="c">Archief</TabElement>
      </TabGroup>
    );
  },
};

/** Lange labels – truncate op het label via tab */
export const LongLabels: Story = {
  render: () => {
    const [value, setValue] = React.useState("1");
    return (
      <TabGroup value={value} onValueChange={setValue}>
        <TabElement value="1" className="max-w-[120px]">
          <span className="block truncate">
            Zeer lange tabtitel één
          </span>
        </TabElement>
        <TabElement value="2" className="max-w-[120px]">
          <span className="block truncate">Twee</span>
        </TabElement>
      </TabGroup>
    );
  },
};
