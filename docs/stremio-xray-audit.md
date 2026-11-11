# Stremio X-Ray & AI Scene Companion — technische audit

Datum: 11 november 2026. Status: eerste oplevering vóór implementatie. Dit document onderscheidt aangetroffen code, geautomatiseerde verificatie en nog uit te voeren fysieke validatie. Er is geen projector bediend, geen bridge uitgerold en geen screenshot of ondertitel naar Gemini gestuurd.

## 1. Bestaande componenten

| Onderdeel | Bewijs in broncode | Hergebruik en grens |
| --- | --- | --- |
| Pi/Home Assistant cinema bridge | `home-assistant/custom_components/shoppinglist_cinema/__init__.py` | Bestaande achtergrondtaken, vaste projector, ADB-integratie, authenticatie en Instant HTTPS-client hergebruiken. Geen tweede daemon. |
| Playback-watcher | `stremio_state`, `playback_watcher`, `stremio_playback` in die bridge | Iedere 2 seconden bij actieve playback, anders 5 seconden. Leest alleen package en PlaybackState; parser geeft alleen PLAYING/PAUSED/etc. terug. Verlichting reageert hierop. Geen gepubliceerde tijdlijn of titelidentiteit. |
| Projectorwachtrij | `src/lib/server/projector-relay.ts`, `projector-relay-routes.ts`, `src/app/api/projector/*` | Owner-authenticatie, vaste targets, heartbeat, unieke claims en afhandeling behouden. Een verzonden deep link bewijst niet welke stream wordt afgespeeld. |
| Stremio Cloud | `src/lib/server/stremio-cloud.ts`, `stremio-store.ts`, `stremio-session.ts` | Library-progress, IMDb/episodegegevens en versleutelde server-only sessies. Cache en samenvoegen van verzoeken op 30 seconden; geen betrouwbare live projectorpositie. |
| React-provider | `src/hooks/use_stremio.tsx` | Eén provider, refresh bij zichtbaarheid en iedere 30 seconden. Geschikt voor bibliotheekvoortgang; live companion krijgt een afzonderlijk klein Instant-abonnement. |
| Titelmatching | `stremio-title-mapping.ts`, `stremio-progress.ts`, `stremio-watching.ts` | Exacte identifiers en bestaande normalisatie hergebruiken. Niet matchen op titel alleen. Cloud-last-watched niet presenteren als huidige projectorsessie. |
| TMDB | `src/app/api/films/episode/route.ts`, `cast/route.ts`, `src/lib/tmdb.ts` | Afleveringsroute voegt vaste cast en gastacteurs al samen. Bestaande response bevat ook volledige synopsis en still; die response nooit integraal in AI-context stoppen. Cast kan zelf onthullingen bevatten. |
| Gemini | `src/app/api/recipes/generate-photo/route.ts`, `src/lib/image-generation/gemini-recipe.ts` | Server-side sleutel, authenticated routes en patroon voor locks/kostenregistratie herbruikbaar. Aangetroffen Gemini-integratie genereert receptfoto's; er is geen bestaande scènechat of contextmanager gevonden. Een apart configureerbaar tekstmodel is nodig. |
| Schema | `instant.schema.ts` | `projectorBridges`, `projectorCommands`, `projectorLocks`, `stremioConnections` bestaan. Geen playback-, subtitle-, scène- of companion-chatentiteiten. Productierechten staan niet in een aangetroffen `instant.perms.ts`; de setup-scripts beheren ze afzonderlijk. |
| Designomgeving | `design/canvas.src.html`, `design/canvas.html`, `design/episode-detail-boards.js`, `design/cinema-buttons-boards.js` | Bestaande canvasboards en UI-componenten behouden: navy inkt, amber accent, compacte bediening, afgeronde panelen. Geen tweede visuele stijl introduceren. |

## 2. Wat is gecontroleerd, wat niet?

- 44 bridge-tests geslaagd via `python3 scripts/test-cinema-bridge.py`. Deze gebruiken mocks, geen fysieke projector.
- 44 tests in zes Vitest-bestanden geslaagd: stremio-progress, stremio-cloud, stremio-watching, stremio-route, projector-relay en projector-relay-routes.
- Dit bewijst de bestaande codepaden, niet dat Android een correcte positie, exacte streamidentiteit, geselecteerde ondertiteltrack of bruikbare videoframes rapporteert.
- Historische livevalidatie van starten en verlichting staat in `docs/stremio-projector.md`. Die geldt niet als validatie van de nieuwe tijdlijn.
- In deze audit zijn geen actuele Pi-status, productierechten, modeltoegang of accountquota uitgelezen.

## 3. Voorgestelde architectuur

```text
Stremio op XGIMI
  → bestaande HA/ADB-watcher: één meting, eigen Stremio-sessionblock
  → normalisatie, identiteitvalidatie en klokkalibratie op de Pi
  → compact Instant playbackrecord met bridge-scoped schrijfbevoegdheid
  → React-abonnement op alle geopende companion-clients

Gevalideerde sessie + geselecteerde ondertitelversie
  → server-only subtitleopslag en cue-index
  → server-side contextfilter op vastgelegde vraagpositie
  → gedeelde job/lease + configureerbaar Gemini-tekstmodel
  → schema- en evidencevalidatie
  → begrensd scèneresultaat/chatantwoord via owner-scoped records
```

De Pi verzamelt alleen gegevens en verwerkt geen AI. De bestaande cinemawachtrij en lichtbesturing blijven los van de companion; een AI-fout mag nooit playback, scherm, verlichting of motorbediening beïnvloeden.

### Playbackcontract

Gebruik ten minste: `ownerId`, `bridgeId`, `sessionId`, `sequence`, `mediaKey`, `streamFingerprint`, `imdbId`, `mediaType`, `season`, `episode`, `positionMs`, `durationMs`, `speed`, `playbackState`, `deviceUpdateElapsedMs`, `deviceUptimeMs`, `observedAt`, `receivedAt`, `identityStatus`, `positionStatus`, `uncertaintyMs` en `source`.

- Geen toegangstokens of volledige stream-URLs opslaan; fingerprint via een niet-omkeerbare, gescopeerde hash.
- Nieuw sessionId bij player/sessionwissel, herstart of nieuwe stream. Bij terugspoelen binnen dezelfde stream: hoger sequence en nieuwe contextrevisie, geen nieuwe aflevering raden.
- Vergelijk `(sessionId, sequence)` server-side; server-issued sessiegeneratie voorkomt dat een vertraagd record uit een oude sessie terugkeert. Alleen een timestamp is onvoldoende.
- Android PlaybackState gebruikt voor de laatste positie-update een monotone elapsed-realtimeklok, geen Unix-tijd. Kalibreer die met device-uptime, meet round-trip en houd een foutmarge bij. Een reboot maakt de kalibratie ongeldig.
- Visuele voortgang mag beperkt interpoleren op de client. De AI-grens blijft de laatste conservatief gevalideerde positie; visuele extrapolatie verleent geen toegang tot extra context.
- Pauze/buffering: geen extrapolatie. Seek: neem de nieuwe meting over en maak oudere lopende analyse ongeldig. Bij onbereikbaarheid: toon verouderd/onbekend, stop extrapolatie na een korte TTL en blokkeer nieuwe scèneanalyse.
- Schrijf alleen gewijzigde snapshots, relevante positiedelta's en noodzakelijke freshness-updates. Begin met maximaal één compact record per bestaande twee-secondenpoll tijdens playback; meet daarna een 5-secondenheartbeat met directe state-/seekupdates. Twee-secondenwrites zijn maximaal 1.800/uur, vijf-secondenwrites 720/uur; dit zijn bovengrenzen, geen gemeten verbruik.

### Eerst echte meetvalidatie

1. Laat een bestaande Stremio-sessie actief; niets automatisch starten, pauzeren of seeken.
2. Lees op de Pi het volledige eigen Stremio-media-sessionblock en projector-uptime via de bestaande ADB-integratie. De huidige grep mist metadata en mogelijk duur/identificatievelden.
3. Vergelijk een reeks tijdmetingen met de werkelijk zichtbare Stremio-tijdcode. Leg ruwe, geredigeerde fixtures en foutmarge vast.
4. Test daarna, met de gebruiker, pauze/hervatten, seek ±10 minuten, volgende aflevering en een andere streamversie. Een verse cloud-identiteit is aanvullend bewijs, geen sluitende koppeling aan de actieve mediasessie.
5. Als IMDb/episode/stream niet voldoende aantoonbaar gekoppeld zijn: toon 'Titel nog niet bevestigd', geen automagische match op last-watched. Een expliciete gebruikersbevestiging kan als aparte, benoemde bewijsbron dienen; bevestig opnieuw bij iedere streamwissel.
6. Fase 1 kan pas 'live en gevalideerd' heten na deze metingen. Tot die tijd moet de UI demonstratie/ongeverifieerd tonen.

## 4. InstantDB-voorstel en rechten

Nog niet gemigreerd. Begin met de kleinste fase-1-wijziging en voeg de rest per fase toe.

| Entiteit | Belangrijkste gegevens | Toegang |
| --- | --- | --- |
| `cinemaPlayback` | Eén actuele snapshot per owner/bridge; session/generation/sequence en kwaliteitsvelden | Owner leest; alleen eigen bridge via strikt gevalideerde updates schrijft. Owner/clients mogen geen geverifieerde tijdcode creëren. |
| `cinemaCompanionSettings` | Default Strict, subtitle-offset per stream/track, vision-consent, bewaartermijn | Owner leest; voorkeuren via authenticated serverroute met enum/limietvalidatie. |
| `cinemaSubtitleTracks` | Media/stream/track-hash, taal, montage, provenance, matchstatus, private blobverwijzing | Server-only. Geen volledige toekomstige cues naar browsers of AI-providercache sturen. |
| `cinemaSceneEvidence` | Tijdsegment, cue-ID's, feiten, maximale dependencytijd, bronversies | Server-only basisarchief; alleen een begrensde afgeleide view naar clients. |
| `cinemaCompanionMessages` | owner/session, vraag, antwoord, requestPosition, contextgrens, cue-referenties, status | Private server-only opslag; server filtert iedere read op huidige toegestane context. Geen onbegrensd clientabonnement. |
| `cinemaCompanionJobs` | Unieke jobkey, owner, lease, status, expiresAt, usage | Server-only atomische create/claim; geen uitsluitend in-memory lock bij serverless. |

Realtime clientweergave kan via een extra begrensd status/resultaatrecord; alleen resultaten voor de actuele sessie/contextrevisie worden daarheen gepubliceerd. Een antwoord op een eerdere vraag houdt zijn snapshot, maar wordt na terugspoelen verborgen als het verder gaat dan de huidige contextgrens. Geen universeel toegankelijke scènecache: owner, media, stream, subtitleversie, offsetversie, spoilermodus, contextgrens en model/promptversie horen in de sleutel.

Voor schema-uitrol: actuele productierechten uitlezen en back-uppen, bestaande regels behouden, denial-tests uitvoeren met owner, andere gebruiker en bridge-identiteit. Bridge krijgt geen chat-, screenshot-, subtitle- of recepttoegang. Een admin-key is alleen een servergeheim en geen oplossing voor ontbrekende autorisatie.

## 5. Ondertitels: gekozen route

Eerst aantonen of de daadwerkelijk gekozen Stremio-track (identifier/URL/taal/offset) via apparaat of gebruikte streammetadata beschikbaar is. De addon-SDK biedt subtitle-id, URL en taal, maar bewijst niet welke track de speler heeft geselecteerd. Momenteel heeft deze codebase geen subtitle-ingestielaag.

Als geselecteerde track niet uitleesbaar is: expliciet een SRT/WebVTT uploaden of een matchende track kiezen en synchroniseren. De gebruiker ziet bron, taal, release/versie, duur en matchstatus. Een niet-bevestigde montage krijgt geen stellige scèneanalyse. OpenSubtitles pas toevoegen na geverifieerde API-toegang en gebruiksrechten; geen scraping of aangenomen recht op herdistributie.

Parser: BOM/encoding/CRLF, VTT identifiers/settings, SRT timestamps, overlappende cues, veilige tekstextractie en strikte grenzen aan grootte, cue-aantal en timestamps. SSML/HTML/subtitletekst is onbetrouwbare data, nooit modelinstructie. Geen onbegrensde URL-fetch: vaste providers of gevalideerde opslag, DNS/private-IP/redirectcontrole en byte-/timeoutlimiet.

Normaliseer naar `cueId,startMs,endMs,text,speaker?,speakerEvidence?`. Expliciete speakerlabels zijn een bewijsbron; naamvermelding is slechts 'genoemd', en spraak is geen zichtbaarheid.

Offsetconventie: `mediaTime = subtitleTime + offsetMs`; positief betekent dat de ondertitel later in de video hoort. Voor context moet de volledige cue eindigen vóór de conservatieve grens: `endMs + offsetMs <= allowedContextEndMs`. Een al gestarte maar nog niet volledig uitgesproken regel gaat niet integraal naar het model. Offset-/trackwijzigingen maken samenvattingen en jobs ongeldig. Montages met meerdere verschuivingen vragen segmentmapping, niet één globale offset.

## 6. Spoilerarchitectuur en AI

- Standaard Strict. De server berekent `allowedContextEndMs` vanuit de gevalideerde playback-snapshot, nooit een clientparameter. Zonder gevalideerde positie/identiteit: geen verhaalantwoord.
- Geen huidige afleveringssynopsis, volledige seizoenscast, wikitekst, trailers, toekomstige stills of zoekgrounding in Strict. Ook toekomstige gastrollen niet automatisch tonen als 'in deze scène'.
- Bewaar feiten met cue-/tijdreferenties. Recente dialoog: circa 2–5 minuten. Oudere context: kleine checkpoints waarvan álle dependencies vóór de grens liggen. Bij rewind alleen eerdere geldige checkpoints gebruiken; geen samenvatting terugknippen die toekomstfeiten bevat.
- Eerdere afleveringen alleen met aantoonbare kijkregistratie en expliciet gekozen Previously Watched. Een afgeronde Stremio-librarypositie is niet vanzelf bewijs dat alle scènes bekeken zijn. Strikte modus blijft beperkt tot de huidige geautoriseerde sessie/context.
- Beperk chatgeschiedenis op dezelfde manier. Eerdere antwoorden en vragen kunnen zelf toekomstfeiten bevatten en mogen niet blind in een nieuwe prompt na rewind worden opgenomen. Een vraag over een latere onthulling verleent geen extra rechten.
- Laat het model feiten koppelen aan server-uitgegeven cue/evidence-ID's. Valideer IDs, tijden, enums en bronversies, en verwerp niet-onderbouwde claims. Bij twijfel: 'Dat is op dit moment nog niet duidelijk in het verhaal.'
- Gestructureerde output bevat summary, characters met evidence/status, importantContext, references en confidence. `spoilerSafe:true` wordt genegeerd als bewijs. Geen biometrische acteuridentificatie.
- Ook met deze maatregelen blijft generatieve aanvulling uit modelkennis mogelijk. Communiceer dit eerlijk. Een optionele uitsluitend extractieve modus met letterlijke, tijdgebonden bewijstekst biedt een strengere fallback dan vrije AI-uitleg.
- Eén scenejob per relevante afgeronde contextgrens, niet iedere poll. Ondertitelwissel/scènewisseling kan werk klaarzetten; de eerste fase analyseert op aanvraag. Maximaal één scenejob tegelijk per owner/session, met korte lease en gedeelde cache voor meerdere clients.

Vraag-snapshot: session, stream, subtitleHash, offsetRevision, sequence, questionPosition en maximale contexttijd bij submit vastleggen. Het antwoord blijft gelabeld 'Vraag op 23:45'. Bij vertraagde afronding wordt de actualiteit opnieuw gecontroleerd; bij gewijzigde aflevering verschijnt het niet in de nieuwe scène.

## 7. Schermvoorstel in de bestaande designtaal

Beoogde route: `/films-series/nu-kijken`. Eerste ontwerpboard in het bestaande `design/`-canvas vóór productie-UI. Operate/Read: rustige context naast de projector, geen autoplay, geen automatisch geluid en geen projectorbediening bij openen.

13-inch tablet/desktop: bovenaan één compacte kijkheader, daaronder twee kolommen (ongeveer 60/40). Links scenecontext, rechts een blijvend zichtbare chat. iPhone: één kolom met tabs 'Scène', 'Vragen', 'Geschiedenis'; invoerveld blijft boven het toetsenbord. Permanent dashboard: compacte header en handmatige analyse, activiteit reduceren wanneer verborgen.

```text
← Films en series                           Spoilers: Strict ▾
[kleine poster] Titel · S2 A4 · Afleveringtitel
Gepauzeerd · Projector gekoppeld / Tijd nog niet bevestigd
23:45 ━━━━━━━━━━━━━━━──────────  nog 18:12

IN DEZE SCÈNE                         VRAAG OVER DEZE SCÈNE
Bewijs: dialoog t/m 23:43              [Leg scène uit] [Wat miste ik?]
[acteurfoto] Personage                [Dialoog uitleggen] [Relaties]
Acteur · Gehoord / Genoemd             Antwoord · Vraag op 23:45
Geen visueel bewijs beschikbaar       Verwijzingen: 21:10 / 23:20

WAT ER GEBEURT                        [Stel een vraag…           ↑]
Korte onderbouwde uitleg              Bron-/privacy-informatie
of 'Nog onvoldoende context'

Ondertitels: gekozen track · +2,0 s    Analyse vernieuwen
```

Componenten: bestaande `Button`, `tab_element`, `select_field`, snackbar en filmkaart-/posterpatronen hergebruiken; bestaande navy/amber, focusringen en typografie volgen. Status niet alleen met kleur aangeven, bediening minimaal 44px waar aanraking nodig is, timestamps aanklikbaar voor context in de companion (niet stilzwijgend seeken op projector).

De castsectie splitst 'Afleveringscast' en 'Aanwijzingen uit deze scène'. Kaarten hebben afzonderlijk `zichtbaar`, `waarschijnlijk`, `gehoord`, `genoemd` of `onbekend` met bewijs. Zonder visueel/contextueel bewijs geen kaart 'bevestigd zichtbaar'. Relatiebeschrijvingen uitsluitend uit toegestane evidence. Geen portretvergelijking als identificatiemethode.

Noodzakelijke ontwerpstates: geen sessie, identiteit ongeverifieerd, live/paused, stale/offline, subtitle ontbreekt, track mismatch, AI bezig, limiet bereikt, onvoldoende bewijs en vision uitgeschakeld. Geen gefingeerde recap als lege-state-invulling. Een demonstratieboard gebruikt duidelijk gelabelde synthetische inhoud.

## 8. Vision, privacy, opslag en kosten

Screencap eerst op aanvraag bij pauze valideren: sessie/tijd en pre-/postcapture-snapshot, zwarte/uniforme frames, resolutie, afwijkende scene en beschermde content detecteren. Een niet-zwart frame is geen bewijs dat de video zelf is vastgelegd. Geen capturepolling iedere 2 seconden. Alleen na expliciete vision-instelling met providerinformatie naar Gemini; geen face matching. Screenshotmetadata buiten de toegestane grens maakt het resultaat ongeldig.

Voorgesteld bewaarbeleid: screenshots standaard niet bewaren, verwerkte tijdelijke capture direct verwijderen (opruimdeadline 15 minuten bij fouten), debug-fixtures alleen expliciet en geredigeerd; chat en scène-evidence optioneel maximaal 30 dagen met wissen per titel/sessie, subtitlebestanden private en verwijderbaar. Authenticated responses `no-store`; serviceworker mag chat, screenshots en private cues niet cachen. Rate-, token- en bedraglimieten server-side. Kostenrapport met werkelijk gerapporteerde usage, inclusief reasoningtokens.

Budgetvoorbeeld, geen offerte: 12 sceneanalyses + 6 vragen + 6 checkpoints = 24 calls/uur, gemiddeld 4.000 input- en 500 outputtokens per call → 96.000 input en 12.000 outputtokens. Bij een rekentarief van $0,10/$0,40 per miljoen tokens is dat circa $0,0144/uur exclusief vision, opslag, zoektools, retries en andere diensten. Google vermeldt dit tarief voor Gemini 2.5 Flash-Lite; modelkeuze/toegang/lifecycle moet bij implementatie opnieuw worden gecontroleerd. Gebruik configureerbare tarieven, geen hardgecodeerde belofte. Geen calls bij een ongeopende companion; kosten niet vermenigvuldigen per client. Dertig seconden automatische analyse betekent al 120 calls/uur vóór chat en is daarom niet de standaard.

## 9. Fasering en acceptatie

1. Meetmodule en geschoonde echte fixtures; daarna playbackrecord/rechten, live React-provider en Now Watching met afzonderlijke afleveringscast. Pas na echte validatie live-label aanzetten.
2. SRT/VTT-ingestie, track-/montagebevestiging, offsets, cue-index en server-side contextgrens. Alleen valide segmenten beschikbaar.
3. Evidencegebonden Gemini-route, gedeelde joblease, chat-snapshots, Explain Scene, Recap So Far, What Did I Miss en dialoogvragen. Geen nieuwe AI-call voor iedere playbackwrite.
4. Lokaal capturebewijs en expliciete vision-consent, daarna optionele analyse/caching. Zonder bruikbaar videoframe blijft subtitle-only werken.
5. Character Timeline, evidence-relatielijst/netwerk, begrensde Scene History, trivia en spraak via featuredetectie. Browser-spraakherkenning kan externe verwerking gebruiken en krijgt daarom een zichtbare toestemmings-/provideruitleg; geen nieuwe microfoonstream standaard.

| Vereist scenario | Verificatie |
| --- | --- |
| 1–2 Start via app en rechtstreeks Stremio | Zelfde actieve streamidentiteit en tijdlijn, geen aanname vanuit queue of cloud. Fysiek testen. |
| 3 Pauze/hervatten | Geen drift tijdens pauze, speed/update-clock correct; parser-/provider-tests plus fysiek. |
| 4–5 Seek vooruit en terug | Hoger sequence, snapshotgrens, verborgen toekomst-antwoorden/checkpoints; fake clocks en vertraagde jobresponses. |
| 6 Volgende aflevering | Nieuwe sessiegeneratie; oude chat-/subtitle-/AI-jobs kunnen niets publiceren. |
| 7–8 Projector uit / Pi-verbinding weg | Afzonderlijke stale/offline-status, herstel zonder ingebeelde playback of devicecommando's. |
| 9 Twee apparaten | Eén gedeelde job en consistente snapshots; concurrerende lease-claim test, fysiek op twee clients. |
| 10 Vraag over latere onthulling | Ontbrekende evidence → fallback; geen toekomstige prompts, checkpoints, metadata of chat history. Test met canary-spoilers. |
| 11 Geen ondertitels | Eerlijke lege-state; geen modelkennis als vervanging. |
| 12 Verschoven ondertitels | Geteste offsets in beide richtingen en montage-mismatch; gedeeltelijk uitgesproken cue uitgesloten. |
| 13 Zwart/onbruikbaar screenshot | Geen visionrequest of stellige herkenning; capturefixture-tests en fysiek. |
| 14 Onvoldoende bewijs | Onbekend/confidence en bewijslabels; geen ingevulde relaties. |
| 15 Laat gelezen antwoord | Ongewijzigde vraag-snapshot met timestamp; na rewind strenger filter, na episodewissel geen cross-sessionpublicatie. |

Aanvullend: denial-tests tussen owners/bridge, ongeldige volgorde/timestamps, device reboot, race op afleveringwissel, SSFR/oversized subtitlefetch, promptinjectie in cues, enum/schemafouten en kostenlimieten. Model-evaluaties aanvullend; groen op mocks is geen bewijs van fysieke synchronisatie of absolute spoilerveiligheid.

## Bronnen

- Android PlaybackState (monotone updateklok): https://developer.android.com/reference/android/media/session/PlaybackState#getLastPositionUpdateTime()
- Stremio subtitle-object (id/url/lang; geen geselecteerde-trackbewijs): https://stremio.github.io/stremio-addon-sdk/api/responses/subtitles.html
- Gemini tarieven en verwerkingsvoorwaarden per tier: https://aistudio.google.com/docs/pricing
- OpenSubtitles API-toegang: https://opensubtitles.tawk.help/article/getting-started
- Bestaande lokale integratiedocumentatie: `docs/stremio-projector.md`.
