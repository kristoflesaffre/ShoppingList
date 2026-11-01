import type { Meta, StoryObj } from "@storybook/react";
import { cn } from "@/lib/utils";
import { FROST_GRADIENT_CLASS, FrostDecor } from "./frost_background";

/** Design system «Frost»: achtergrond van de diepvries, op de startpaginakaart en op de diepvriespagina. */
const meta: Meta<typeof FrostDecor> = {
  title: "UI/FrostBackground",
  component: FrostDecor,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof FrostDecor>;

export const Card: Story = {
  render: () => (
    <div className={cn("relative isolate h-48 w-[358px] overflow-hidden rounded-[24px]", FROST_GRADIENT_CLASS)}>
      <FrostDecor />
    </div>
  ),
};
