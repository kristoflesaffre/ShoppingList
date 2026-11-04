import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal_page";

export const metadata: Metadata = { title: "Gebruiksvoorwaarden · Shopping List" };

export default function VoorwaardenPage() {
  return (
    <LegalPage title="Gebruiksvoorwaarden" updated="4 november 2026">
      <p>
        Shopping List is een persoonlijke app voor het eigen huishouden. Ze wordt gratis en niet commercieel gebruikt, en
        is niet bedoeld als openbare dienst.
      </p>
      <LegalSection title="Gebruik">
        <p>Je gebruikt de app enkel met een eigen account of na een uitnodiging, en voor je eigen huishouden.</p>
      </LegalSection>
      <LegalSection title="Geen garanties">
        <p>
          De app wordt aangeboden zoals ze is. Functies kunnen veranderen of verdwijnen, en de app kan tijdelijk niet
          beschikbaar zijn. Er is geen garantie dat gegevens altijd volledig of juist zijn.
        </p>
      </LegalSection>
      <LegalSection title="Gekoppelde diensten">
        <p>
          Voor diensten die je koppelt, zoals Google, Todoist of Philips Hue, gelden ook de voorwaarden van die diensten.
          Je kunt een koppeling op elk moment verbreken.
        </p>
      </LegalSection>
      <LegalSection title="Privacy">
        <p>
          Hoe de app met gegevens omgaat, lees je in het{" "}
          <a className="font-semibold text-[var(--text-link)]" href="/privacy">
            privacybeleid
          </a>
          .
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
