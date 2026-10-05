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
| Knop | `Button` (`MiniButton` = sm) | Maten lg 50 (hoofdactie onderaan een blad), md 42, sm 34. Secundair = zacht lavendel zonder rand. |
| Stepper | `CountStepper` (lijsten), `Stepper` (formulieren) | Lijst: blauwe pil, vuilbakje bij 1. Formulier: breed grijs veld met ronde witte knoppen. |
| Blad (bottom sheet) | `SlideInModal` | Greepje bovenaan, hoeken 26, titel links + grijze ronde sluitknop. |
| Categoriekaart | `CategoryCard` (+ `categoryGradient`) | Witte kaart radius 20, kop met verloop 16%→5% van de categoriekleur, bolletje · titel · aantal · actie. |
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
