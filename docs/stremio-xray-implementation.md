# X-Ray companion: installatie en verificatie

Gebouwd op 11 november 2026. Dit is de uitvoerbare eerste versie, geen claim dat alle fysieke acceptatietests al zijn geslaagd.

## Geïmplementeerd

- `/films-series/nu-kijken`: responsive kijkheader, voortgangsinterpolatie, expliciete freshness/validatiestatus, scènepaneel, recente dialoog, optioneel onthulde afleveringscast, zes quick actions, chat met tijdsnapshot, gefilterde geschiedenis, ondertitelupload en offsetinstelling. X-Ray-knop op de bestaande filmpagina.
- Realtime compact playbackabonnement via Instant; private context en chat blijven server-only, buiten de Instant-browsercache. Nieuwe snapshots verbergen oude dialoog meteen bij sessiewissel of rewind.
- Bestaande HA-watcher kan via de optionele companion-flag uitgebreider dezelfde ADB-meting lezen. Geen extra pollingdaemon, geen AI op de Pi, geen screenshots of extra apparaatbediening.
- SRT/WebVTT-ingestie met limieten, cue-ID's, expliciete speakerlabels en offset. Alleen volledig uitgesproken cues tot de conservatieve gevalideerde positie worden toegelaten.
- Server-side Gemini-route met gedeelde deterministische jobkeys, maximaal 30 nieuwe modelaanvragen per eigenaar per uur, begrensde promptgrootte, cue-verwijzingen, sessie/track/offset/mode-controle na inference en usage-opslag.
- De modelcontext bestaat uit het recente venster, relevante eerdere fragmenten en maximaal twee eerdere, nog toegestane antwoorden. Dit is geen volledige automatische aflevering-samenvattingspipeline; de UI zegt daarom dat eerder bekeken afleveringen nog niet zijn gevalideerd.
- Spoilermodi worden expliciet ingesteld; Strict is standaard. Previously Watched voegt zonder geverifieerde kijkregistratie geen afleveringen toe. Unrestricted is een expliciete voorkeur, maar deze versie verruimt daarmee nog niet de beschikbare context.
- Server-side TTL-filtering, verwijderen van eigen gegevens, dagelijkse authenticated cron voor verlopen records; geen companion-API-cache of offline RSC-cache voor deze route.

## Reeds uitgevoerd

`node scripts/setup-cinema-companion.mjs --apply` heeft uitsluitend de twee companion-namespaces ingericht en bestaande rechten behouden. De privébackup staat onder `.cache/cinema-companion/`. Er is een niet-actief `unknown`-playbackrecord geprovisioneerd om schema en bevoegdheden te testen, geen filmsessie nagebootst.

Tests bevestigen: private-data read/write geweigerd voor guest en Pi; owner kan zijn eigen compacte playbackrecord zien, geen private context; Pi kan alleen het eigen playbackrecord bijwerken; lager sequence wordt geweigerd; guest kan de tijdcode niet schrijven. Er zijn geen Home Assistant- of projectorcommando's verzonden.

## Nog noodzakelijk voor echte playback

1. App-server: `CINEMA_COMPANION_ENABLED=1`, bestaande `INSTANT_APP_ADMIN_TOKEN`, `GEMINI_API_KEY`, en optioneel `GEMINI_COMPANION_MODEL`. Het model is afzonderlijk van receptafbeeldingen configureerbaar; controleer modeltoegang en lifecycle bij productie-uitrol. `CRON_SECRET` beschermt de dagelijkse opruimroute.
2. Pi: voer de gerichte private installer uit die `node scripts/prepare-cinema-companion-install.mjs` maakt. Die vervangt alleen de twee bridge-Pythonbestanden en voegt `companion_enabled` en `owner_id` toe aan de bestaande YAML. Bestaande scherm-, lamp- en apparaatinstellingen blijven staan. Home Assistant-configuratie controleren en vervolgens herstarten. Uitgevoerd op de Pi via de bestaande Terminal & SSH-app: beide bestanden en YAML geback-upt, bestanden geïnstalleerd, `ha core check` geslaagd en beide SHA-256-hashes vergeleken met de lokale bron. Na de vervolgvraag is Core herstart en publiceert de nieuwe brug echte playbackrecords naar InstantDB. De installer gebruikt alleen shell en base64 omdat deze Terminal-app geen python3 heeft.
3. Laat een echte Stremio-stream lopen. `node scripts/export-cinema-telemetry.mjs` exporteert compacte samples naar `.cache/cinema-companion/playback-samples.json`. Vergelijk de tijd met het echte beeld. De parser is ook aangepast aan een echte XGIMI-uitlezing; doorlopende publicatie via de nieuwe Pi-code is bevestigd met oplopende sequences en afspeelposities.
4. Streamverificatie vereist een gerapporteerde streamidentifier/URI naast het media-ID. Alleen een IMDb-id of cloudvoortgang is onvoldoende. De URI wordt uitsluitend gehasht, nooit opgeslagen. Als Stremio dit niet exposeert, blijft `streamEvidence=false` en is verdere apparaat-/playerinstrumentatie nodig; er is geen browserknop die dat omzeilt.
5. Pas na de fysieke vergelijking kan de operator het kalibratiescript gebruiken:
   `node scripts/validate-cinema-companion.mjs --fixture=.cache/cinema-companion/playback-samples.json --imdb=tt… --session=… --screen-position-ms=… --confirmed-stream=yes`.
   Het script vereist drie geordende samples, een verse laatste sample, streambewijs en maximaal twee seconden afwijking. Kalibratie geldt alleen voor die stream/sessie en vervalt automatisch.
6. Upload de daadwerkelijk gebruikte SRT/VTT-track, bevestig montage en stel zo nodig de offset in. Positieve offset betekent: subtitle later in de video.
7. Voer de 15 fysieke/functionele acceptatiescenario's uit de audit uit. Verifieer ook dat een ander streambestand met hetzelfde IMDb-id een nieuwe fingerprint oplevert en dat geen resterend oud cast-/chatresultaat verschijnt.

## Bewuste grenzen van deze versie

- Geen automatische extractie van de werkelijk geselecteerde Stremio-subtitletrack; geen OpenSubtitles-koppeling zonder bewezen trackmatch/API-toegang.
- Geen vision, screenshots naar Gemini of biometrische acteuridentificatie. Cast is een expliciet geopende afleveringslijst; speakerlabels zijn `gehoord`, niet `zichtbaar`.
- Geen gevalideerde vorige-afleveringen, automatische character timeline/relatiegraaf/trivia of spraakherkenning. Die optionele uitbreidingen vereisen de eerder beschreven betrouwbare contextregistratie.
- Generatieve uitleg kan ondanks filters fouten of modelkennis bevatten. De architectuur voorkomt het doorgeven van toekomstige cues; bronverwijzingen bewijzen geen volledige semantische juistheid van iedere gegenereerde zin.
- Geen productiepublicatie of DRM-capturetest uitgevoerd. Pi-bestanden zijn geïnstalleerd, Core is herstart en echte telemetrie is ontvangen; één echte titel-/tijdvergelijking is gedaan, geen volledige synchronisatie-acceptatie. De lokale ontwikkelpreview is de reviewbare oplevering.

## Verificatie

- Definitieve TypeScript-controle en productiebuild geslaagd.
- 108 relevante Vitest-tests geslaagd in 19 bestanden; daarnaast 8 nieuwe Python-telemetrietests en 44 bestaande bridge-tests.
- Nieuwe pure tests voor tijdinterpolatie, freshness, stream-/sessievalidatie, SRT/VTT, gedeeltelijke cues, offsets en rewind.
- Nieuwe mocked modeltests voor toekomstige canary-cues, gedeelde aanvragen, ongeldige evidence, rewind tijdens inference en ongeverifieerde streams.
- Route-tests voor authenticatie, cross-origin en een vervalst clientvalidatieverzoek.
- 8 Python-telemetrietests en de bestaande 44 bridge-tests.
- Browsercontrole met duidelijk gelabelde lokale voorbeelddata: 1280px tablet en 390px mobiel zonder horizontale overflow. Geen fysieke tablet of echte playbackclaim. De `?demo=1`-preview werkt uitsluitend in development en verleent geen API-toegang.

## Echte projectorcontrole op 11 november

Via de aangemelde Chrome-sessie is uitsluitend een diagnostische `androidtv.adb_command` uitgevoerd. Geen afspeel-, lamp-, scherm- of poweropdracht verzonden. Stremio meldt `PLAYING`, titel **The Swedish Connection**, positie `4034236`, monotone update `1279354960` en projector-uptime `1279650.95` seconden. Extrapolatie geeft `4330226 ms` (**72:10**). De gebruiker bevestigde dezelfde titel en ongeveer **1:12**. Dit is een vergelijking op minuutniveau, geen bewezen afwijking van maximaal twee seconden.

Het echte `dumpsys`-formaat bevat alleen `metadata: size=4, description=…`; geen IMDb-ID, stream-URI of totale duur. Daarom blijft streamvalidatie uit en is geen validatierecord aangemaakt. Exacte stream- en ondertitelidentiteit vereisen aanvullende playerinstrumentatie; een titelmatch wordt niet als streambewijs gebruikt.

De controle bracht drie concrete parserproblemen aan het licht en verholp die: het volledige ADB-antwoord wordt afgekapt, dus de bestaande watcher leest nu alleen het eigen Stremio-blok plus uptime; titel komt zo nodig uit metadata-description; onbekende speelduur zet de beschikbare tijdcode niet meer op nul. Een titelwissel wijzigt ook de onbevestigde sessiefingerprint. De UI toont bij onbekende duur een onbepaalde voortgangsbalk.

Na deze wijzigingen: TypeScript-controle, 20 gerichte Vitest-tests, 8 telemetrietests en 44 bestaande bridge-tests geslaagd. De bestaande bridge-tests produceren ook coroutine-waarschuwingen. Installatiebewijs: `outputs/xray/pi-install-verified.png`.

## Activering en aanvullende metadata-proef

Op verzoek om verder te gaan is Core via de bestaande Terminal & SSH-app herstart. De brug publiceert nu `The Swedish Connection`, `playing`, oplopende posities/sequences en `uncertaintyMs=1500`. Eén directe databasecontrole gaf een snapshot-leeftijd van 2555 ms met 190 ms querytijd. Dit is een gemeten voorbeeld, geen garantie voor alle netwerkomstandigheden of fysieke synchronisatienauwkeurigheid.

Een aanvullende read-only Java-proef (`scripts/android/CinemaMetadataProbe.java`) is zonder APK-installatie of nieuwe rechten uitgevoerd onder de reeds geautoriseerde ADB-shell. Er zijn geen transportcontrols, screenshots of private Stremio-bestanden gebruikt. De proef is een kort proces, geen tweede pollingservice. Alleen de eigen Stremio-sessie wordt gelezen; ruwe media-URI's worden nooit afgedrukt.

Deze speler exposeert daadwerkelijk precies vier metadata-keys: `ART`, `ARTIST`, `DURATION`, `TITLE`. Titel: The Swedish Connection. Duur: **6171250 ms / 1:42:51**. Er is geen `MEDIA_ID` of `MEDIA_URI`; de metadata bevat geen geselecteerde subtitletrack. De Android-mediadiensten geven via de onderzochte dumps evenmin een bruikbare bestandsidentiteit. Exacte bestands- en trackbinding is dus nog niet opgelost. Geen validatierecord aangemaakt en geen verhaal-AI geactiveerd.

De optionele metadata-proef kan worden gebouwd met `node scripts/build-cinema-metadata-probe.mjs --jdk=… --r8=…` (bestaand JDK en Google D8/R8). Tijdens deze sessie is een officiële Adoptium JDK met gecontroleerde SHA-256 en Google D8 gebruikt, uitsluitend in de genegeerde lokale cache. Het DEX-bestand staat voor deze proef op `/data/local/tmp/shoppinglist-cinema-metadata-v5.dex` op de projector.

De bruguitbreiding kan alleen TITLE/DURATION van deze proef cachen, uitsluitend wanneer de titel exact overeenkomt. Opt-in: `companion_metadata_probe: true`; de installer neemt die uitsluitend op met `--metadata-probe-installed`. Hoogstens één extra uitlezing per nieuwe titel bij succes; bij fout maximaal één poging per minuut. De oorspronkelijke meting behoudt haar timestamp, ook als de metadataproef langer duurt. Dit display-cache verleent nooit streamverificatie. Bij ontbrekende helper blijft de tijdcode werken met onbekende duur. Negen parser-/telemetrietests en 44 bridge-tests slagen.

Browserbewijs van de echte metadata: `outputs/xray/live-metadata-verified.png`. De lokale X-Ray-pagina vraagt nog om de gewone ShoppingList-login; geen authenticatie omzeild of gebruikerssessie aangemaakt om een ingelogde demonstratie te simuleren.

De TITLE/DURATION-uitbreiding is daarna met back-up op de Pi geïnstalleerd; `ha core check` slaagde en Core is opnieuw herstart. Beide bronbestanden zijn met SHA-256 gecontroleerd op de Pi. Een directe Instant-query bevestigde na activering: `playing`, positie **5496963 ms**, duur **6171250 ms**, snapshot-leeftijd **4647 ms**, `streamEvidence=false`. De gewone appcode hoeft niet gewijzigd te worden voor deze nieuwe duur: het bestaande playbackabonnement ontvangt die in hetzelfde record. Installatiebewijs: `outputs/xray/pi-active-verified.png`.

## Ingelogde browsercontrole

Na de gewone login door de eigenaar toont de lokale X-Ray-pagina echte playback: **The Swedish Connection**, **Projector verbonden**, oplopende positie **74:57 → 75:08** en resterende tijd **27:53 → 27:42**. De browser meldde geen errors of warnings tijdens deze controle. `outputs/xray/live-owner-view.png` bevat de echte ingelogde weergave. De verhaalacties zijn terecht uitgeschakeld omdat streamidentiteit en subtitletrack nog niet zijn bevestigd. Dit is geen volledige synchronisatietest met seek/pauze/afleveringwissel.

De lokale productiepreview is na een nieuwe build herstart: het oude serverproces serveerde verouderde chunkverwijzingen (twee scriptrequests HTTP 400), waardoor de eerdere browser op de servergerenderde aanmeldmelding kon blijven staan. Na herstart beantwoorden alle dertien scripts HTTP 200. De preview draait nu vanuit de actuele productiebuild. Voer geen nieuwe build uit terwijl hetzelfde productiepreviewproces actief blijft zonder daarna het proces opnieuw te starten.

## Persoonlijke Stremio-ondertitelrelay

De app bevat nu een persoonlijke add-on met alleen de resource `subtitles`. Beheer staat onder **Bronnen en voorkeuren → Ondertitels rechtstreeks uit Stremio koppelen**. De beheerroute vereist de gewone eigenaarssessie en controleert de Origin bij aanmaken/intrekken. Een willekeurige, intrekbare 256-bit toegangssleutel geeft 30 dagen toegang tot uitsluitend de ondertitelrelay. De link staat alleen in server-private opslag en wordt uitsluitend via de geauthenticeerde beheerroute aan de eigenaar getoond. Geen Instant-admin- of Stremio-accounttoken in de manifestlink.

De accountcontrole gebruikt alleen `addonCollectionGet`, met `update:false`. Het bestaande account heeft 28 add-ons waaronder de officiële OpenSubtitles v3-bron. Er is tijdens deze controle niets geïnstalleerd of gewijzigd in Stremio. De relay gebruikt alleen die bestaande bron; geen willekeurige upstream-URL of automatisch toegevoegd nieuw abonnement. Downloads zijn beperkt tot HTTPS op `subs[nummer].strem.io`, zonder redirects. Request- en bestandsgroottes zijn begrensd, herhaalde identieke aanvragen worden kort gecachet, sessiewissels worden vóór en na downloaden gecontroleerd. Future cues komen uitsluitend in private serveropslag en in het subtitlebestand voor de speler; de gewone status-API geeft geen volledige ondertitels terug.

Een aanvraag registreert film-/aflevering-ID en optionele `videoHash`, `videoSize`, `filename`. Ontbrekende hashes worden niet verzonnen. Alleen het ophalen van een concrete track registreert een afzonderlijk `loaded-unverified`-receipt met trackhash, taal, cuetelling, actieve device-sessie en tijdsnapshot. Een HEAD-request registreert nooit een download. Een lijstaanvraag of een HTTP-bestandsdownload bewijst nog niet dat de XGIMI die track rendert: deze code maakt bewust geen `validation`-record of geverifieerde actieve track aan en schakelt geen AI in. De echte installatie-/selectie-/timingproef moet eerst gebeuren. De speler kan bestanden vooraf laden; ook een opnieuw gekozen of gecachte track vereist aandacht bij de vervolgintegratie.

Protocolbronnen: [Stremio subtitle-handler](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/requests/defineSubtitlesHandler.md) en [testinstructies en HTTPS-vereiste](https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/testing.md). Voor de XGIMI is een publiek bereikbaar HTTPS-adres noodzakelijk; een LAN-IP via HTTP is geen installeerbare oplossing. De app weigert daarom het aanmaken van een projector-koppeling zonder HTTPS. De lokale pagina toont deze publicatiestap expliciet. `CINEMA_ADDON_ORIGIN` mag na publicatie naar de online app verwijzen; zonder instelling gebruikt de beheerroute haar eigen HTTPS-origin. De eerdere lokale LAN-opt-in is verwijderd. Geen poortforwarding, tunnel of verzwakte TLS-controle ingesteld.

De officiële bron is met een publiek testfilmpje getest: een download gaf HTTP 520 en werd geweigerd; een tweede track gaf HTTP 200 en is verwerkt tot 100 cues. Dit is een provider-/parsertest, geen gekoppelde ondertitel van de actuele film. De browser toont geen errors/warnings in het koppelscherm. Nieuwe tests omvatten Origin/auth, intrekken en eigenaarsisolatie, ontbreken van hashes, SSRF-/redirectbegrenzing, onderscheid lijst/opgehaald, caching, late sessiewissels en niet-activeren van scènevalidatie. De 18 nieuwe relaytests slagen; de bredere gerichte suite slaagt met 92 tests in 16 bestanden. TypeScript-controle en de nieuwe productiebuild zijn ook na de HTTPS-aanpassing geslaagd.

Publicatie en toevoegen aan het echte Stremio-account zijn nog niet uitgevoerd. Hiervoor zijn een expliciete publicatie-/pushopdracht en bevestiging van de nieuwe persoonlijke toegang nodig. De bronwijzigingen worden afzonderlijk klaargezet; privé-cachebestanden, lokale omgevingsvariabelen en ander werk worden niet meegenomen. Rechten van de twee Instant-companion-namespaces veranderen niet.
