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

### InstantDB & omgeving

- **App ID** – staat in [src/lib/instant_app_id.ts](src/lib/instant_app_id.ts); optioneel override met `NEXT_PUBLIC_INSTANT_APP_ID`.
- **Inloggen met e-mail + paswoord** – vereist een **Admin-token** van het [Instant-dashboard](https://instantdb.com/docs/backend) (Settings → Admin):
  - Zet lokaal/productie: `INSTANT_APP_ADMIN_TOKEN=<jouw-token>`
  - Zonder deze variabele geeft de API `503` en zie je een duidelijke foutmelding op het inlogscherm.

Meer achtergrond: [InstantDB-docs](https://instantdb.com/docs).

### Google Calendar op het dashboard

De dashboardweergave kan afspraken van vandaag en morgen uit de primaire Google-agenda tonen. De koppeling gebruikt uitsluitend de read-only scope `calendar.events.readonly`.

1. Schakel de [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com) in binnen een Google Cloud-project.
2. Open [Google Auth Platform > Clients](https://console.cloud.google.com/auth/clients), configureer het OAuth-toestemmingsscherm en maak een OAuth 2.0-client van het type **Web application**.
3. Voeg de redirect-URI's toe die je gebruikt:
   - lokaal: `http://localhost:3000/api/google/callback`
   - lokale Codex-preview: `http://127.0.0.1:3000/api/google/callback`
   - productie: `https://<jouw-domein>/api/google/callback`
4. Vul `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` en `GOOGLE_OAUTH_COOKIE_SECRET` in `.env.local` en in de productieomgeving in.

Maak een cookiesleutel met bijvoorbeeld `openssl rand -base64 32`. Na configuratie kan iedere ingelogde gebruiker vanuit de tab **Dashboard** diens eigen Google Calendar koppelen of ontkoppelen.

### Philips Hue OAuth

Open **Profiel → Philips Hue** to connect an existing Hue account and online Bridge.
This initial integration prepares the connection; lighting controls are a separate feature.
The connection is specific to the signed-in app user, browser/PWA and deployment.
Tokens are AES-GCM encrypted in Secure, HttpOnly, SameSite=Lax cookies, never exposed to
client JavaScript. Disconnect clears the local connection; revoke the app in the Hue account
to withdraw Hue's authorization entirely.

Configure these **server-only production environment variables** on each host:

- `HUE_CLIENT_ID` and `HUE_CLIENT_SECRET`: that host's Hue OAuth application credentials.
- `HUE_REDIRECT_URI`: the exact registered `https://<production-domain>/api/hue/callback`.
- `HUE_OAUTH_SECRET`: an independently generated random secret of at least 32 characters.
- `INSTANT_APP_ADMIN_TOKEN`: already used by the app to verify the signed-in user's token.

Use separate registrations and secrets for Netlify and Vercel. Do not expose these through
`NEXT_PUBLIC_` variables or enable the production credentials on preview domains. Redeploy
after configuring them. Rotating the cookie secret requires reconnecting Hue.

The flow uses Hue's current `/v2/oauth2/authorize` and `/v2/oauth2/token` endpoints, PKCE S256,
a ten-minute encrypted state cookie, and the documented cloud Bridge pairing sequence.
Refresh saves both rotated tokens. A temporary Hue failure preserves the existing connection;
an invalid refresh grant asks the user to reconnect. OAuth must return to the same browser
that started it; test iPhone PWA authorization on a physical device.

References: [cloud setup](https://developers.meethue.com/develop/hue-api-v2/cloud2cloud-getting-started/)
and [OAuth](https://developers.meethue.com/develop/hue-api/remote-authentication-oauth/).
