import type { Meta, StoryObj } from "@storybook/react";
import { Snackbar } from "./snackbar";

const meta: Meta<typeof Snackbar> = {
  title: "UI/Snackbar",
  component: Snackbar,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div
        style={{
          padding: "var(--space-8)",
          background: "var(--bg-subtle)",
          minHeight: "160px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ width: "374px", minWidth: "374px" }}>
          <Story />
        </div>
      </div>
    ),
  ],
  tags: ["autodocs"],
  argTypes: {
    message: { control: "text", description: "Snackbar message" },
    actionLabel: { control: "text", description: "Action label (e.g. 'Zet terug')" },
    state: {
      control: "select",
      options: ["default", "disabled"],
      description: "Visual state of the snackbar",
    },
  },
};

export default meta;

type Story = StoryObj<typeof Snackbar>;

export const Default: Story = {
  args: {
    message: "‘Wasverzachter’ verwijderd",
    actionLabel: "Zet terug",
    state: "default",
  },
};

export const Disabled: Story = {
  args: {
    message: "‘Wasverzachter’ verwijderd",
    actionLabel: "Zet terug",
    state: "disabled",
  },
};

export const WithoutAction: Story = {
  name: "Without action",
  args: {
    message: "‘Wasverzachter’ verwijderd",
    actionLabel: undefined,
    state: "default",
  },
};

export const LongMessage: Story = {
  name: "Long message",
  args: {
    message:
      "‘Wasverzachter’ verwijderd uit de lijst. Je kunt dit ongedaan maken door op ‘Zet terug’ te klikken.",
    actionLabel: "Zet terug",
    state: "default",
  },
};

export const AllStates: Story = {
  name: "All states",
  render: () => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
        width: "374px",
      }}
    >
      <Snackbar
        message="‘Wasverzachter’ verwijderd"
        actionLabel="Zet terug"
        state="default"
      />
      <Snackbar
        message="‘Wasverzachter’ verwijderd"
        actionLabel="Zet terug"
        state="disabled"
      />
    </div>
  ),
};

