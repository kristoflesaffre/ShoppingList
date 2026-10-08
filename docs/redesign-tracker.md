# Redesign-tracker

Werkwijze per scherm: (1) huidig scherm op het canvas zetten, (2) een voorstel met de
design-system-componenten, (3) samen bijsturen, (4) bouwen en testen op localhost:3010,
(5) hier afvinken.

Canvas: https://claude.ai/artifact/MWQqzUVrS1MdM3MiPUdxcP (pagina «werk») ·
Design system: https://claude.ai/artifact/4PpVr8fdCyCU8f6w5HziZj

Status: ✅ klaar · 🔄 bezig · ⬜ nog te doen

## Al herontworpen (nakijken op restjes)

| Scherm | Route / bestand | Status |
| --- | --- | --- |
| Startpagina | `/` | ✅ (Diepvries-sectie: fototegels C2; favorieten-banner; nieuwe lijstkaarten) |
| Lijstje (per dag / per categorie, bewerkmodus) | `/lijstje/[id]` | ✅ |
| Items toevoegen + zoekblad | `new_item_modal.tsx` | ✅ |
| Suggesties | `list_suggestions.tsx` | ✅ |
| Favorieten beheren | `/lijstje/[id]` (favorietenlijst) | ✅ |
| Favorieten toevoegen | `master_add_sheet.tsx` | ✅ |
| Nieuw lijstje vanuit favorieten | `/nieuw-lijstje/selecteer-master-lijstje/[masterId]/items` | ✅ |
| Recepten | `/recepten` | ✅ |
| Recept detail | `/recepten/[id]` | ✅ |
| Kalender | `/kalender` | ✅ |
| Klantenkaarten (wallet) | `/klantenkaarten` | ✅ |
| Inloggen / registreren | `/auth` | ✅ (e-mailveld nog eigen stijl) |
| Profiel | `/profiel` | ✅ (nakijken) |

## Nog te herontwerpen

| # | Scherm | Route / bestand | Status |
| --- | --- | --- | --- |
| 1 | Te kopen | `/te-kopen` | ✅ |
| 2 | Te kopen · item toevoegen | `add_shopping_item_slide_in.tsx` | ✅ |
| 3 | Diepvriesvoorraad | `/diepvriesvoorraad` | ✅ |
| 4 | Diepvries · item toevoegen | `new_freezer_item_modal.tsx` | ✅ |
| 5 | Lijstjes beheren (overzicht) | `/lijstjes-beheren` → redirect naar 6 | ✅ |
| 6 | Alle lijstjes | `/lijstjes-beheren/lijstjes` | ✅ |
| 7 | Alle favorietenlijsten | `/lijstjes-beheren/favorieten` | ✅ |
| 8 | Nieuwe favorietenlijst · kies winkel | `/nieuw-lijstje/selecteer-winkel` | ✅ |
| 9 | Nieuw lijstje · kies favorietenlijst | `/nieuw-lijstje/selecteer-master-lijstje` | ✅ vervallen (redirect naar Favorieten) |
| 10 | Nieuw lijstje · vakantie | `/nieuw-lijstje/vakantie` | ✅ |
| 10b | Nieuw lijstje · keuze (modal op home) | `page.tsx` (`blankVenueSlideOpen`) | ✅ (variant A) |
| 11 | Lijstje · instellingen | `/lijstje/[id]/instellingen` | ✅ |
| 12 | Lijstje delen | `share_list_modal.tsx` | ✅ foto-avatars, deelknoppen boven link, «Ook toekomstige lijstjes» (auto-delen per soort). Beheerpagina «Samen delen» (`/profiel/delen`): deelgenoten + algemene uitnodigingslink (`/deel/samen/[token]`), soorten aan/uit, overzicht gedeelde lijstjes met schakelaar |
| 13 | Startpagina aanpassen | `/beheer-homepagina` | ✅ één kaart met greep · illustratie · uitleg · schakelaar; Favorieten-sectie van de startpagina verwijderd |
| 14 | Klantenkaart toevoegen (kies winkel) | `/klantenkaarten/toevoegen` | ✅ tegelraster (3/6), zoeken; eigen kaart enkel bij geen resultaat; «Al toegevoegd» opent de kaart |
| 15 | Klantenkaart toevoegen (winkel / nieuw) | `add_loyalty_card_sheet.tsx` (oude routes → redirect) | ✅ variant 1a: blad «Kaart van …» met twee gelijke tegels Scannen / Screenshot |
| 16 | Klantenkaart bewerken / scanresultaat | `loyalty_card_editor_slide_in.tsx`, `loyalty_card_scan_result_slide_in.tsx` + `loyalty_card_preview.tsx` | ✅ kaartpreview in winkeltint, Code vervangen (2 gelijke tegels), Kaart verwijderen; scanresultaat met vinkje + Kaart bewaren / Opnieuw scannen |
| 17 | Recept bewerken | `recipe_editor_slide_in.tsx`, `recipe_ingredient_form_slide_in.tsx` | ✅ |
| 18 | Recept toevoegen via link / AI / foto | `recipe_link_slide_in.tsx`, `recipe_photo_upload_slide_in.tsx`, `photo_source_slide_in.tsx` (`recipe_ai_source_slide_in.tsx` verwijderd) | ✅ |
| 19 | Recept delen | `recipe_share_slide_in.tsx` | ⬜ |
| 20 | Films & series · overzicht | `/films-series` | ⬜ |
| 21 | Films & series · detail, cast, afleveringen | `/films-series/[id]/…` | ⬜ |
| 22 | Films & series · watchlist, aan het kijken, ontdekken, partner | `/films-series/watchlist/[kind]`, `/aan-het-kijken`, `/discover`, `/partner-watchlist`, `/partner/[id]` | ⬜ |
| 23 | Films & series · instellingen | `/films-series/instellingen` | ⬜ |
| 24 | Gedeelde pagina's (link) | `/deel/[token]`, `/deel/recept/…`, `/deel/te-kopen/…`, `/deel/films-series/…` | ⬜ |
| 25 | Beheer · ontbrekende afbeeldingen | `/admin/ontbrekende-afbeeldingen` | ⬜ |
| 26 | Beheer · foto-generator | `/food-image-generator`, `food_image_generator_slide_in.tsx` | ⬜ |
| 27 | Barcode scannen | `camera_barcode_scanner_slide_in.tsx` | ⬜ |
