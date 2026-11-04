# Handmatig een gerechtfoto maken

Op de detailpagina van een eigen recept onder **Nog te testen** staat **Maak gerechtfoto**. Eén klik start één Gemini-aanvraag en past de geslaagde afbeelding direct toe. Openen van een recept, imports, n8n en collectiecontroles genereren geen afbeeldingen.

De server gebruikt `gemini-nano-banana-2.1`, vier bestaande stijlreferenties uit `public/images/reference_images` en, indien beschikbaar, de oorspronkelijke gerechtfoto. Naam, ingrediënten en bereiding komen uit het opgeslagen recept; er worden geen bijgerechten of ingrediënten verzonnen. De foto is 1024 × 1024, bovenaanzicht, met één volledig zichtbaar rond gekleurd keramisch bord. Een palet van twaalf kleuren kiest een minder gebruikte tint en vermijdt bij hergeneratie de vorige kleur.

De achtergrond moet echte alpha bevatten. Bij een magenta technische achtergrond verwijdert de server alleen de aaneengesloten achtergrond vanaf de beeldrand, met randcorrectie. Een onbruikbare achtergrond of ontbrekend beeld veroorzaakt een fout en behoudt de bestaande foto. Er is geen mockfoto of automatische betaalde herpoging.

## Serverconfiguratie

`GEMINI_API_KEY` en `INSTANT_APP_ADMIN_TOKEN` zijn uitsluitend servervariabelen. `BLOB_READ_WRITE_TOKEN` gebruikt de bestaande afbeeldingsopslag; zonder Blob bewaart de app een transparante WebP-data-URL. Geen databaseschema- of rechtenwijziging nodig. De sleutel is lokaal ingesteld. Voor publiceren moet dezelfde bestaande Gemini-key ook als serversecret in het Vercel-project staan; nooit in `NEXT_PUBLIC_*` of Git opslaan.

De bestaande Instant bearer-token bepaalt de eigenaar. De route accepteert alleen een eigen recept in `nog_te_testen`. Een atomaire strict-create in `foodImages` vergrendelt het gerecht tijdens de aanvraag, ook over meerdere serverinstanties. Een aanvraag-ID voorkomt herhaalde kosten bij een herhaalde HTTP-aanvraag. Er wordt niet automatisch opnieuw gegenereerd.

`foodImages` bewaart de oorspronkelijke foto, het resultaat, de gekozen kleur, tokengebruik en berekende USD-kost. Een eerste proef kostte $0,05517 inclusief vier referenties, één gerechtbeeld en thinking; de knop toont circa $0,06 vooraf en de berekende kost na afloop. Deze aanroepen staan in ShoppingLists `foodImages`, niet in de lokale importer-`calls`-tabel. Kostenberekening gebruikt op 4 november 2026 gecontroleerde tarieven ($1,50/M input; $7,50/M tekst/thinking; $30/M beeldoutput). Een verbindingsfout kan een onbekende providerkost hebben; er wordt nooit een gratis herpoging beloofd.

Als een serverproces hard beëindigd wordt, kan een `gemini-lock` achterblijven. Controleer eerst de bijbehorende aanvraag en of de serveraanvraag definitief gestopt is; verwijder uitsluitend die oude lock. Verwijder geen betaalde generatie- of kostrecords.

## Verificatie

Gerichte Vitest-tests controleren autorisatie, categorie, herhaalde en gelijktijdige aanvragen, één API-aanroep, kostopslag, toepassen, behoud van de originele foto, kleurvariatie en echte transparantie. De betaalde API is hierbij gemockt. Een echte lokale detailpagina is visueel gecontroleerd. Er is geen tweede betaalde afbeelding gemaakt voor de knopimplementatie.
