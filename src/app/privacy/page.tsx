import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal_page";

export const metadata: Metadata = { title: "Privacybeleid · Shopping List" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacybeleid" updated="4 november 2026">
      <p>
        Shopping List is een persoonlijke app voor het eigen huishouden, om boodschappen, recepten, voorraad, agenda en
        films en series te beheren. Ze wordt niet commercieel aangeboden.
      </p>
      <LegalSection title="Welke gegevens de app bewaart">
        <p>
          Je account (e-mailadres) en wat je zelf in de app invoert, zoals lijstjes, recepten, voorraad, to-do’s en
          kijkgeschiedenis. Koppel je een dienst zoals Google, Todoist, Philips Hue of Stremio, dan bewaart de app de
          toegangsgegevens versleuteld, enkel om die koppeling te laten werken.
        </p>
      </LegalSection>
      <LegalSection title="Google Agenda">
        <p>
          Als je Google koppelt, vraagt de app enkel leestoegang tot je agenda’s en afspraken. De app kan niets in je
          agenda wijzigen of verwijderen. Afspraken worden opgehaald om ze aan jou te tonen in de app, en kunnen tijdelijk
          op je eigen toestel bewaard worden zodat ze sneller laden. De afspraken worden niet op de server opgeslagen; daar
          staan enkel de versleutelde toegangsgegevens.
        </p>
        <p>
          Gegevens van Google worden niet verkocht, niet gebruikt voor reclame, niet gedeeld met anderen en niet naar
          AI-diensten gestuurd. Het gebruik van gegevens uit Google-API’s volgt de{" "}
          <a className="font-semibold text-[var(--text-link)]" href="https://developers.google.com/terms/api-services-user-data-policy">
            Google API Services User Data Policy
          </a>
          , inclusief de Limited Use-vereisten.
        </p>
      </LegalSection>
      <LegalSection title="Andere diensten">
        <p>
          De app draait op Vercel en bewaart gegevens bij InstantDB. Gebruik je AI-functies, zoals een recept uitlezen of
          een foto laten maken, dan gaat wat je daarvoor aanlevert naar OpenAI. Gekoppelde diensten ontvangen enkel wat
          nodig is voor de functie die je gebruikt.
        </p>
      </LegalSection>
      <LegalSection title="Koppeling of gegevens verwijderen">
        <p>
          Je kunt Google op elk moment ontkoppelen in de app; dan wordt de toegang ingetrokken. Dat kan ook via{" "}
          <a className="font-semibold text-[var(--text-link)]" href="https://myaccount.google.com/permissions">
            je Google-account
          </a>
          . Wil je dat je andere gegevens verwijderd worden, stuur dan een e-mail naar het adres hieronder.
        </p>
      </LegalSection>
      <LegalSection title="Contact">
        <p>
          <a className="font-semibold text-[var(--text-link)]" href="mailto:lesaffrekristof@gmail.com">
            lesaffrekristof@gmail.com
          </a>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
