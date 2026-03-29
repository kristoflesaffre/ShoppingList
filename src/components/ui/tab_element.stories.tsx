import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { TabGroup } from "./tab_group";
import { TabElement, TabGroupContext } from "./tab_element";

const meta: Meta<typeof TabElement> = {
  title: "UI/TabElement",
  component: TabElement,
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
  argTypes: {
    value: { control: "text", description: "Tab id (match TabGroup value)" },
    disabled: { control: "boolean" },
  },
};

export default meta;

type Story = StoryObj<typeof TabElement>;

const listChrome =
  "flex w-full items-start gap-[var(--space-6)] border-b border-[var(--border-subtle)]";

/** Inactieve staat – ander tabblad is “selected” in context */
export const Inactive: Story = {
  render: () => (
    <TabGroupContext.Provider
      value={{ value: "other", onValueChange: () => {} }}
    >
      <div className={listChrome}>
        <TabElement value="this">Tab</TabElement>
      </div>
    </TabGroupContext.Provider>
  ),
};

/** Actieve staat */
export const Active: Story = {
  render: () => (
    <TabGroupContext.Provider value={{ value: "this", onValueChange: () => {} }}>
      <div className={listChrome}>
        <TabElement value="this">Tab</TabElement>
      </div>
    </TabGroupContext.Provider>
  ),
};

function InGroupLikeFigmaDemo() {
  const [v, setV] = React.useState("1");
  return (
    <TabGroup value={v} onValueChange={setV}>
      <TabElement value="1">Tab 1</TabElement>
      <TabElement value="2">Tab</TabElement>
    </TabGroup>
  );
}

/** Zelfde opbouw als Figma-tab group: eerste actief, tweede inactief */
export const InGroupLikeFigma: Story = {
  render: () => <InGroupLikeFigmaDemo />,
};
