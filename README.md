# Shopping List

Collaborative grocery list app. Zie [docs/PRD.md](docs/PRD.md) voor de productvereisten.

## Tech stack

Volgens het PRD zijn de volgende dependencies geïnstalleerd:

| Categorie   | Technologie |
|------------|-------------|
| Frontend   | Next.js 14 (App Router), React, Tailwind CSS, Radix UI, TypeScript, Storybook |
| Backend/Data | InstantDB (real-time database) |
| State/Sync | InstantDB realtime subscriptions |

### Packages

- **Next.js 14** – App Router, TypeScript, ESLint
- **Tailwind CSS** – Styling
- **Radix UI** – `@radix-ui/react-dialog`, `@radix-ui/react-tabs`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-checkbox`, `@radix-ui/react-slot`
- **InstantDB** – `@instantdb/react` voor real-time sync
- **Storybook** – Componentdocumentatie (`.storybook/`, stories in `src/**/*.stories.*`)

### Design tokens

Design tokens (Figma-naamgeving: Gray 100, Blue 600, enz.) staan in [styles/tokens.css](styles/tokens.css) als CSS custom properties, gegroepeerd in: backgrounds, borders, text, actions, status, typography, spacing, radii. Tailwind is gekoppeld aan deze variabelen via [tailwind.config.ts](tailwind.config.ts); gebruik bijvoorbeeld `bg-background`, `text-text-primary`, `rounded-md`. Geschikt voor Radix UI-componenten.

## Scripts

```bash
npm run dev          # Next.js development server (poort 3000)
npm run build        # Next.js productie-build
npm run start        # Next.js productie-server
npm run lint         # ESLint
npm run storybook    # Storybook dev (poort 6006) – gebruikt scripts/run-storybook.sh
npm run build-storybook  # Storybook statische build
```

**Storybook en EMFILE (macOS):** Het script `scripts/run-storybook.sh` verhoogt het file limit en zet polling aan. Als je toch **EMFILE: too many open files** ziet, voer in dezelfde terminal eerst uit: `ulimit -n 10240`, daarna opnieuw `npm run storybook`.

## Ontwikkeling

1. `npm install` (eenmalig)
2. `npm run dev` voor de app, of `npm run storybook` voor componenten

InstantDB vereist nog configuratie (app ID, env vars); zie [InstantDB-docs](https://instantdb.com/docs).
