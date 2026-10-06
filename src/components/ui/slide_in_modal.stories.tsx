import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { SlideInModal } from "./slide_in_modal";
import { Button } from "./button";
import { InputField } from "./input_field";

/**
 * Design system «Blad»: op mobiel een blad van onderen met greepje;
 * vanaf tablet (md) een gecentreerd venster met «Annuleer» + actie rechts onderaan.
 * Wissel de viewport in Storybook om beide te zien.
 */
const meta: Meta<typeof SlideInModal> = {
  title: "UI/SlideInModal",
  component: SlideInModal,
  parameters: { layout: "fullscreen" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof SlideInModal>;

function Demo({ size }: { size: "dialog" | "wide" }) {
  const [open, setOpen] = React.useState(true);
  return (
    <div style={{ minHeight: "100vh", padding: 24, background: "var(--bg-app)" }}>
      <Button onClick={() => setOpen(true)}>Open blad</Button>
      <SlideInModal
        open={open}
        onClose={() => setOpen(false)}
        title="Nieuw te kopen product"
        size={size}
        footer={
          <Button variant="primary" onClick={() => setOpen(false)}>
            Toevoegen
          </Button>
        }
      >
        <InputField placeholder="Naam product" aria-label="Naam product" />
      </SlideInModal>
    </div>
  );
}

export const Dialog: Story = { render: () => <Demo size="dialog" /> };
export const Wide: Story = { render: () => <Demo size="wide" /> };
