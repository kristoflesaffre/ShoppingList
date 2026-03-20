import type { Meta, StoryObj } from "@storybook/react";

/**
 * De echte `Home`-pagina (`page.tsx`) gebruikt InstantDB (`db.useQuery`) en Next.js `useRouter`.
 * Die combinatie hoort in `npm run dev` getest te worden, niet in Storybook — anders zie je vaak
 * eeuwig "Laden…", netwerkfouten in de iframe, of onverwacht gedrag.
 *
 * UI van de home-flow zit in o.a. **UI/ListCard**, **UI/SlideInModal**, **UI/Button**.
 */
const meta: Meta = {
  title: "App/Home",
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Home is gekoppeld aan InstantDB en de App Router. Test op `http://localhost:3000` (of je dev-poort). Voor losse UI: zie **UI/ListCard** en gerelateerde componenten.",
      },
    },
  },
};

export default meta;

type Story = StoryObj;

export const NietInStorybook: Story = {
  name: "Documentatie",
  render: () => (
    <div className="max-w-md rounded-md border border-[var(--gray-200)] bg-[var(--white)] p-6 text-[var(--text-primary)]">
      <p className="text-base font-medium leading-24">
        De Home-pagina draait op InstantDB en hoort in de Next-app bekeken te worden.
      </p>
      <p className="mt-3 text-sm leading-20 text-[var(--text-secondary)]">
        Start <code className="rounded bg-[var(--gray-100)] px-1">npm run dev</code> en open{" "}
        <code className="rounded bg-[var(--gray-100)] px-1">/</code>. Voor kaarten en modals:
        gebruik de stories onder <strong>UI/</strong>.
      </p>
    </div>
  ),
};
