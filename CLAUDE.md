# ShoppingList — werkafspraken

## Design system: altijd gebruiken

Bouw schermen uit de gedeelde componenten in `src/components/ui/`. Style deze patronen
**nooit inline** opnieuw; heb je een variant nodig, voeg ze toe aan het component (en de story).

| Patroon | Component | Regels |
| --- | --- | --- |
| Zoekveld | `SearchBar`, `ItemNameAutocomplete` | Zacht grijs vlak (gray-25), geen rand, vergrootglas links, radius 16, h 48. Op mobiel opent het zoekblad met de zoekbalk bovenaan + «Annuleer», filterchips, rijen met foto + naam (geen plussen). |
| Invoerveld | `InputField` | Zelfde vorm als het zoekveld; focus = wit + lavendel rand. |
| Segmentknop | `SegmentedControl` (`PillTab` heeft dezelfde stijl) | 2–4 opties naast elkaar. Grijze trog (gray-50, radius 13), actief wit met donkere tekst. |
| Tabs | `TabGroup` / `TabElement` | Onderlijn-tabs enkel voor navigatie tussen grotere secties. |
| Filterchip | `FilterChip`, `FilterChipRow` | 30px, halfvet; actief vol blauw, inactief grijs. Optioneel `dotColor` (categorie) en `count`. |
| Ronde icoonknop | `RoundIconButton` + `RoundIcons` | Tonen: primary (acties), danger (verwijderen), neutral (sluiten), surface (los op de pagina), onColor (op een kaartkop). Maten: 28 in kaartkoppen en rijen, 32 naast een titel, 36 los op de pagina. |
| Bewerken / Gereed | `TitleEditButton`, `DoneButton` | Potlood = RoundIconButton primary 32; Gereed = blauwe pil 34px. |
| Paginakop + terug | `PageBackButton`, `useLargeTitleCollapse` | Mobiel: vaste topbalk (paginakleur) met terugpijl; compacte titel pas bij scrollen. Desktop (lg+): geen topbalk, ronde terugknop (surface 36) links van de grote titel; acties uit de topbalk (bv. «⋯») als ronde knoppen rechts. |
| Knop | `Button` (`MiniButton` = sm) | Maten lg 50 (hoofdactie onderaan een blad), md 42, sm 34. Secundair = zacht lavendel zonder rand. |
| Stepper | `CountStepper` (lijsten), `Stepper` (formulieren) | Lijst: blauwe pil, vuilbakje bij 1. Formulier: breed grijs veld met ronde witte knoppen. |
| Aantalpil | `CountBadge` | Zachte lavendel pil (blue-50, blauw getal, 30px) om een aantal te tonen; in bewerkmodus vervangen door `CountStepper`. |
| Blad (bottom sheet) | `SlideInModal` | Mobiel: greepje bovenaan, hoeken 26, titel links + grijze ronde sluitknop. Vanaf tablet (md): gecentreerd venster (`size="dialog"` 620px, `size="wide"` 956px voor volle-hoogte bladen) met «Annuleer» + actie (md 42) rechts onderaan. |
| Winkeltegel | `StoreSelectionTile` | 84×84, zacht grijs (gray-25), radius 16, logo 32 + naam; gekozen = wit + blauwe rand 2px + rond vinkje. Optioneel `icon` (bv. «Algemeen»). |
| Aantal + eenheid | `QuantityUnitField` | Formulier-stepper + eenheidschips (stuk · pak · … · «Andere…» → `InputField`). Tablet+: compacte stepper met chips ernaast. Zonder eenheid = alleen stepper. |
| Productveld | `ItemNameAutocomplete` | Leeg = zacht zoekveld; gekozen = foto-tegel (of monogram) · naam vet · «Wijzig», 58px. |
| Keuzerij | `ChoiceRow` | Eén item uit een lijst kiezen: beeld · titel · subtitel · rondje; gekozen = lavendel vlak + blauwe rand + rond vinkje. In een `radiogroup`. |
| Categoriekaart | `CategoryCard` (+ `categoryGradient`) | Witte kaart radius 20, kop met verloop 16%→5% van de categoriekleur, bolletje · titel · aantal · actie. |
| Lijstkaart | `ListCard` | Witte kaart radius 20: tegel 48 (lavendel; grijs bij favorieten) · titel 16 halfvet · subtitel (winkellogo + aantal, of ♥ favorieten) · pijltje of «+ Lijstje». Bewerken: sleepgreep links, rode ronde vuilbak rechts. |
| Favorieten-promo | `FavoritesPromoBanner`, `FavoritesEmptyState` | Banner (lavendel→roze, productwaaier + hartje) voor wie nog geen favorietenlijst heeft; sluitbaar (localStorage). Lege staat met 3 stappen + grote knop. |
| Schakelaar | `Switch` | Aan/uit voor een instelling die meteen geldt (geen bewaarknop): 46×28, aan = primair blauw, uit = lichtgrijs. Voor een keuze uit een lijst → Checkbox / ChoiceRow. |
| Deelblad | `ShareListModal` | «Lijstje delen»: lijstfoto in lavendel cirkel met twee (fictieve) avatarfoto's eronder · titel «Samen op één lijstje» · ronde deelknoppen (WhatsApp, E-mail, Meer… enkel met Web Share) · witte linkbalk met «Kopieer» · optioneel kaart «Ook toekomstige lijstjes» met `Switch` (zie `src/lib/auto-share.ts`). Blad op `--bg-app`, desktop 540px. |
| Minikaart | `LoyaltyMiniCard` | Klantenkaart in creditcardformaat in de winkeltint (logokleur via `useLogoTint` + `cardColors`), logo op wit tegeltje, naam + decoratieve barcode. `md` in het raster «Klantenkaart toevoegen», `lg` (licht gekanteld) in het blad «Kaart van …». |
| Dagkaart / lijstkaarten | `ListCardsView` (`list_cards_view.tsx`) | Dag = datumtegel (mobiel) of gerechtfoto/ingrediëntenbord (desktop) + dag als titel + gerecht/items als sublabel. |

### Vormtaal (tokens)

- Kleuren: alleen tokens uit `styles/tokens.css` (`--blue-*`, `--gray-*`, `--text-*`, `--error-*`, …); geen losse hex in componenten.
- Radii: 10 (thumb in segment) · 12 (productfoto-vlak) · 13 (segment) · 16 (velden) · 20 (kaarten) · 26 (bladen) · pill.
- Schaduwen: kaart `0 1px 2px rgba(16,17,48,.04)`; zwevende balk `0 14px 30px -12px rgba(16,17,48,.6)`.
- Blauw (`--blue-500`) is voor acties en selectie; niet als achtergrond voor keuzecontrols.

### Documentatie

- Elke component in `src/components/ui/` heeft een Storybook-story (`*.stories.tsx`). Pas die mee aan.
- Het design-system-artifact «Shopping List» documenteert dezelfde componenten:
  https://claude.ai/artifact/4PpVr8fdCyCU8f6w5HziZj — werk het bij wanneer een component verandert.
- Nieuwe schermen eerst ontwerpen op het canvas (https://claude.ai/artifact/MWQqzUVrS1MdM3MiPUdxcP),
  opgebouwd uit deze componenten, en pas daarna bouwen.

## Git en publiceren

- Werk op branch `login-redesign`; commit en push naar GitHub. Niet deployen naar Vercel of Netlify.
- De database-schema (InstantDB) niet wijzigen zonder expliciete vraag.
- Lokaal testen op http://localhost:3010.
