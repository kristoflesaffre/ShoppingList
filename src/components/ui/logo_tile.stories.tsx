import type { Meta, StoryObj } from "@storybook/react";
import { LogoTile } from "./logo_tile";

const delhaizeLogo = (
  <img
    src="/logos/logos-delhaize.svg"
    alt=""
    width={48}
    height={48}
    className="size-12 max-h-full max-w-full object-contain"
    aria-hidden
  />
);

const meta: Meta<typeof LogoTile> = {
  title: "UI/LogoTile",
  component: LogoTile,
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
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
  args: {
    variant: "default",
    size: "default",
    state: "default",
    label: "Delhaize",
    logo: delhaizeLogo,
  },
  argTypes: {
    variant: {
      control: "select",
      options: ["default"],
      description: "Design system variant (Figma 791:3292)",
    },
    size: {
      control: "select",
      options: ["default"],
      description: "Tegelgrootte",
    },
    state: {
      control: "select",
      options: ["default", "disabled"],
      description: "Interactieve staat",
    },
    label: { control: "text" },
    asChild: {
      control: "boolean",
      description: "Radix Slot: styling op een enkel child (bijv. button)",
    },
  },
};

export default meta;
type Story = StoryObj<typeof LogoTile>;

/** Default — 82px breed, witte tile, schaduw, primaire tekst (Figma 791:3292). */
export const Default: Story = {
  args: {
    state: "default",
    label: "Delhaize",
    logo: delhaizeLogo,
  },
};

/** Disabled — zelfde afmetingen; primary-25, geen schaduw, gedempt logo en neutrals-400 label. */
export const Disabled: Story = {
  args: {
    state: "disabled",
    label: "Delhaize",
    logo: delhaizeLogo,
  },
};

/** Alle combinaties: variant × state (nu: alleen default-variant, beide states). */
export const AllVariants: Story = {
  name: "All variants",
  render: () => (
    <div
      className="flex flex-wrap items-start justify-center gap-6"
      style={{ maxWidth: "480px" }}
    >
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs font-medium leading-16 text-text-secondary">
          Default
        </span>
        <LogoTile state="default" label="Delhaize" logo={delhaizeLogo} />
      </div>
      <div className="flex flex-col items-center gap-2">
        <span className="text-xs font-medium leading-16 text-text-secondary">
          Disabled
        </span>
        <LogoTile state="disabled" label="Delhaize" logo={delhaizeLogo} />
      </div>
    </div>
  ),
};

/**
 * `asChild`: containerclasses op een `<button>` voor klikbare tegel in flows
 * (bijv. winkelkeuze).
 */
export const AsChildButton: Story = {
  name: "asChild (button)",
  args: {
    asChild: true,
    children: (
      <button
        type="button"
        className="cursor-pointer border-0 bg-transparent font-[inherit] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--border-focus)] focus-visible:ring-offset-2"
      >
        <span className="pointer-events-none flex w-full min-w-0 flex-col items-center gap-2">
          <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden">
            {delhaizeLogo}
          </span>
          <span className="w-full min-w-0 shrink-0 text-center text-sm font-medium leading-20 text-text-primary">
            Delhaize
          </span>
        </span>
      </button>
    ),
  },
};
