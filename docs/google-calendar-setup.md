# Google Calendar activeren

Dit is een eenmalige instelling voor de appbeheerder. Gebruikers kiezen daarna
alleen hun Google-account en geven toestemming om hun agenda te bekijken.
De app leest afspraken in de getoonde periode uit zichtbare agenda's, inclusief
gedeelde agenda's, herhalingen en afspraken die de hele dag duren. Er worden geen
afspraken gewijzigd of aangemaakt. De gegevens worden live opgehaald, niet als
een permanente kopie van de volledige agendageschiedenis opgeslagen.

1. Open https://console.cloud.google.com/ en kies of maak een project.
2. Activeer de Google Calendar API via https://console.cloud.google.com/apis/library/calendar-json.googleapis.com.
3. Open Google Auth Platform. Vul Branding in en kies bij Audience voor External
   als ook gewone Gmail-accounts de app moeten gebruiken. Voeg tijdens Testing de
   e-mailadressen van je testgebruikers toe.
4. Maak bij Clients een OAuth-client van het type Web application. Voeg de exacte
   redirect-URI's toe voor de adressen waarop je de app gebruikt:
   - `http://127.0.0.1:3000/api/google/callback`
   - `http://localhost:3000/api/google/callback`
   - Voor een latere productieconfiguratie: `https://jouw-domein/api/google/callback`
5. Zet de Client ID en Client secret in `.env.local` als `GOOGLE_CLIENT_ID` en
   `GOOGLE_CLIENT_SECRET`. Gebruik voor `GOOGLE_OAUTH_COOKIE_SECRET` een willekeurig
   geheim van minstens 32 tekens. Commit deze gegevens nooit. Herstart de lokale
   server na wijzigingen.
6. Open de app, kies Google-agenda koppelen en sta de twee alleen-lezen rechten toe:
   `calendar.events.readonly` en `calendar.calendarlist.readonly`.

De koppeling wordt versleuteld in een HttpOnly-cookie van deze browser bewaard.
Een ander apparaat of browser moet apart gekoppeld worden. Ontkoppelen verwijdert
de lokale koppeling en trekt de Google-toestemming in.

Voor algemeen gebruik moet de OAuth-app gepubliceerd worden en kan Google
verificatie vereisen. In Google's External Testing-modus verlopen refresh tokens
voor deze rechten na zeven dagen; dan moet je opnieuw koppelen. Dit is geen
geschikte permanente instelling voor een tablet-dashboard.

Google-documentatie:
- https://developers.google.com/identity/protocols/oauth2/web-server
- https://developers.google.com/identity/protocols/oauth2#expiration
- https://developers.google.com/workspace/calendar/api/v3/reference/calendarList/list
- https://developers.google.com/workspace/calendar/api/v3/reference/events/list
