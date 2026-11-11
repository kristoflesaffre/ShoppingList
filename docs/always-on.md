# Tablet-dashboard: always-on en scherm wakker houden

Het donkere dashboard na twee minuten en de schermvergrendeling van iPadOS zijn twee verschillende dingen. `useAlwaysOn` houdt het dashboard donker en gebruikt `keepScreenAwake` voor de Screen Wake Lock API zolang de dashboardweergave open, minstens 768 px breed en zichtbaar is.

## Herstel op iPad

Een aanvraag bij het laden kan worden geweigerd voordat het document volledig actief is. Daarom volgt één nieuwe poging na een seconde, ook als je de tablet gewoon laat staan. Een echte aanraking of toetsaanslag kan het daarna opnieuw proberen. De listeners staan in de capture-fase, zodat ook de eerste tik op het donkere scherm meetelt, hoewel die tik bewust geen dashboardknop opent.

Als iPadOS de lock vrijgeeft, vraagt de app hem na één seconde opnieuw aan als het dashboard nog zichtbaar is. Na `visibilitychange`, `pageshow` en focus wordt de aanvraag hersteld, met één uitgestelde poging voor Safari's overgang naar een actief document. Er wordt nooit meer dan één lock tegelijk aangevraagd of vastgehouden. Bij verbergen of verlaten van het dashboard worden locks en listeners vrijgegeven, ook wanneer een eerdere aanvraag nog bezig was. Bij blijvende weigering wordt niet eindeloos gepolld.

## Grenzen en diagnose

Apple ondersteunt wake locks in geïnstalleerde Home Screen Web Apps vanaf iPadOS 18.4: https://webkit.org/blog/16574/webkit-features-in-safari-18-4/ . Dit geldt ook voor een app die via Chrome aan het beginscherm is toegevoegd. De browser of het OS kan een aanvraag weigeren, bijvoorbeeld wegens energiebesparing; een website kan die systeemkeuze niet overrulen. Er wordt geen verborgen video of audio afgespeeld om dat te omzeilen.

`document.documentElement.dataset.aodWakeLock` meldt de huidige aanvraagstatus: `requesting`, `active`, `waiting`, `blocked` of `unsupported`. `active` wordt pas gezet na een werkelijk toegekende, niet vrijgegeven sentinel. De status verdwijnt bij verlaten van de dashboardweergave.

## Controle (11 november 2026)

Regressietests in `src/lib/screen-wake-lock.test.ts` dekken weigering bij starten plus herstel bij touch, systeem-release terwijl de app zichtbaar blijft, overlappende events, achtergrond/terugkeer met Safari-vertraging, cleanup tijdens een nog lopende aanvraag, blijvende weigering en een ontbrekende API. De volledige lokale suite (920 tests), TypeScript-controle en een productiebuild uit een geïsoleerde checkout met alleen deze wijzigingen slagen. Geen fysieke iPad getest.
