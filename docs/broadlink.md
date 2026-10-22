# BroadLink on the Mac

The RM4 Pro was discovered at 192.168.132.164, type 0x520b. Local authentication succeeded after the user disabled its lock in the BroadLink app. Discovery/authentication sent no IR/RF control commands.

The existing BroadLink mobile app backup did not offer an export file. No automatic import from the modern app has been confirmed. The user agreed to capture the three screen buttons separately, preserving their existing BroadLink setup.

## Capture

The isolated environment is installed under ignored `.cache/broadlink/venv`. Recreate it with `python3 -m venv .cache/broadlink/venv` and `.cache/broadlink/venv/bin/python -m pip install -r scripts/broadlink-requirements.txt`.

Double-click `scripts/broadlink-scherm-leren.command`. Choose RF or IR according to the original remote (RF is the initial trial if unknown). RF capture first finds the frequency using a held button, then captures a short press. Each step waits for Enter before it starts. The original remote may move the screen; the program itself never calls `send_data` or sends a control code. RF learning is cancelled on completion or failure. Each successfully captured button is written atomically with private permissions to ignored `.cache/broadlink/screen.json`; rerunning skips saved buttons. No captured code or authentication key goes into Git.

Reference: https://github.com/mjg59/python-broadlink (0.19.0). In this version `check_frequency()` returns a tuple; check its first element, not tuple truthiness.

## Local app controls

All three packets have been captured. The local configuration is bound to the owner's verified Instant user ID. `/profiel/projectiescherm` exposes Up / Stop / Down through same-origin, authenticated POST `/api/broadlink`. The backend accepts only these named actions, uses an absolute Python/script path with no shell, and never exposes packets to the browser. The runner verifies the remote MAC before sending one captured packet. Timeout errors are not retried, because the remote might already have transmitted.

This implementation runs **only on the local Mac app**, not on Netlify/Vercel. It explicitly refuses cloud/public hosts rather than assuming that a cloud function can reach the private LAN or spawn the Mac environment. The Mac must remain awake on the home network. A connection from the published site still needs a secured outbound relay or equivalent architecture. No public unauthenticated port is opened.

Status reports saved-command readiness, not a live screen position or confirmed motor movement. Actual physical command verification is pending the user's manual test in the app. Tests use mocks only.

The launcher now resumes the saved remote type and skips captured buttons automatically. The RF frequency is retained alongside captured commands and reused for later buttons. Files from the first helper version contain no frequency, so the next button needs one final scan before subsequent buttons can reuse it.

Fix: persist a discovered frequency immediately, before waiting for the button packet. Previously, a packet timeout discarded the frequency too, causing a repeat scan on restart. Successful button captures remain unchanged.

## Timed screen height

On `/profiel/projectiescherm`, choose **Hoogte instellen**, begin with the screen fully down, then use the app's **Omhoog** and **Stop** buttons. The Mac records the monotonic interval between RF send calls, saving it privately in `.cache/broadlink/screen-timing.json`. Physical-remote presses are not monitored. A saved **Naar mijn hoogte** action repeats UP, waits until that interval's deadline, and sends STOP over the same authenticated connection. Timing avoids browser scheduling, but OS scheduling, RF delivery and motor response still introduce physical variation; this is not position feedback. Always begin from the same fully lowered position.

Calibration has a detached 60-second maximum-duration STOP watchdog. Presets are limited to 0.1–60 seconds. Manual Stop or another manual movement invalidates a pending preset, so its delayed STOP cannot interrupt a later movement. Short file locks serialize RF access and state changes across Python processes. The preset request can run up to 75 seconds locally; no cloud runtime is involved. No automatic write retries are made. Keep the Mac awake; hardware/network failure cannot guarantee delivery of STOP.

Timing/cancellation tests use fake clocks and mocked remotes; no real UP/STOP was sent while implementing this feature. User calibration and physical height verification remain pending.

## Controls paused after physical malfunction

The user reported clicking, failure to retract and loss of original-remote operation after a timed preset. App controls have been paused in the private local configuration and pending run IDs invalidated without RF transmission. Both server route and Python runner enforce this pause. The cause has not been confirmed. Captured RF packets use 0xb0/0xb1 formats and need validation against this model's protocol; do not assume the legacy packet repeat-byte interpretation applies, or modify/transmit these captures speculatively. Timing calibration alone is insufficient until basic remote reliability is established. No native RM4 Pro atomic delayed sequence upload has been implemented or verified.

## Dashboard screen tab

The dashboard control panel now has **Licht / Klimaat / Scherm** segments.
Scherm provides Omhoog, Stop, Omlaag and Mijn hoogte, using the existing
same-origin authenticated `/api/broadlink` endpoint. No motor command is sent
when selecting the tab; readiness is a read-only status action. The saved-height
button uses the existing bounded timed preset and links to the profile page for
calibration. Start fully down before using the preset: there is no position sensor.

Stop remains available during a pending command or timed preset. Other movement
buttons are disabled until the current operation finishes. Status refreshes while
a preset is running, including when the user returns to the tab. Commands are
never retried automatically, and an unconfirmed result asks the user to check the
screen. Existing local-Mac, owner and origin restrictions remain in place; no cloud
relay is added. Tests use mocks and do not move the physical screen.

Loopback fix: Next.js can normalize numeric loopback URLs to `localhost` in
NextURL while the browser still sends `127.0.0.1` in Origin and Host. BroadLink
now compares against the exact request Host and protocol, with a separate
loopback-only Host check. Different origins/ports, missing login and different
owners remain rejected. The dashboard includes a read-only retry button for
stale paused/unavailable status; retrying never sends a motor command.

## Projector aan bij openen, uit bij sluiten (Google TV)

De lokale route koppelt het openen en sluiten van het scherm aan de ingebouwde Google TV. Hiervoor gebruikt hij Android TV Remote v2, hetzelfde lokale protocol als
de Google TV-app, met een afzonderlijk clientcertificaat. Geen Google-wachtwoord,
ADB of ontwikkelaarsmodus nodig. **Omhoog** en **Mijn hoogte** openen het scherm en sturen `WAKEUP` naar de projector.
**Omlaag** sluit het scherm en stuurt `SLEEP`. Stop en kalibratie veranderen de projector niet.
De wisselknop `POWER` wordt nooit gebruikt. De aparte aan/uit-opdrachten worden ook verstuurd als Google TV al dezelfde toestand meldt: die status bevestigt niet noodzakelijk dat de projectorlamp aanstaat. De idempotente opdrachten kunnen het toestel niet per ongeluk omgekeerd toggelen.

Eenmalig op de Mac (op hetzelfde netwerk als de projector):

```sh
python3 -m venv .cache/projector/venv
.cache/projector/venv/bin/pip install -r scripts/projector-requirements.txt
.cache/projector/venv/bin/python scripts/projector-remote.py pair --host PROJECTOR_LAN_IP
```

Gebruik het eigen LAN-IP van de projector. De koppelcode verschijnt op de projector;
voer die in dezelfde terminal in. Na geslaagde koppeling wordt automatische projectorbediening
geactiveerd voor de eigenaar van de bestaande schermbediening. Voor handmatig testen
(zonder schermbeweging): `scripts/projector-remote.py on` via diezelfde Python.
`status` leest alleen de opgeslagen configuratie en wekt niets.

De configuratie en sleutels blijven genegeerd in `.cache/projector/` (bestanden 0600).
De bridge controleert ook de bij koppeling opgeslagen apparaatidentiteit. Geef de
projector bij voorkeur een DHCP-reservering; na een gewijzigd IP-adres opnieuw koppelen.
Zet `enabled` op `false` in `.cache/projector/projector.json` om de automatische schermkoppeling te onderbreken. Projectorfouten verhinderen de schermopdracht niet; de UI
meldt apart of het aan/uit-commando verstuurd of de gevraagde toestand bevestigd is. Geen
automatische herhalingen of inschakelen bij laden van het dashboard.

De Mac moet wakker zijn. Of de projector vanuit diepe slaap bereikbaar blijft,
hangt af van de projectorinstellingen/firmware. Test dit ook na langere stand-by.

Protocolbibliotheek: https://github.com/tronikos/androidtvremote2 (Apache-2.0).

### Projector apart testen

De lokale pagina `/profiel/projectiescherm` heeft afzonderlijke knoppen **Projector aan**, **Projector uit** en **Verbinding testen**. Deze gebruiken `/api/projector` met dezelfde lokale host/origin- en eigenaarscontrole, maar roepen BroadLink niet aan. De verbindingsknop leest alleen Google TV-status; hij verstuurt geen aan/uit-commando. De getoonde Google TV-status is geen bevestiging van de projectorlamp: controleer het beeld op het toestel.

De Python-opdracht `check` controleert verbinding en apparaatidentiteit zonder toetsen te sturen. Veilige foutcodes onderscheiden onbereikbaar, opnieuw koppelen en gewijzigd apparaat. Tijdens de lokale controle op 22 oktober 2026 was de projector niet bereikbaar; de webpagina toonde die fout en gaf de testknoppen daarna weer vrij. Er zijn geen echte aan/uit- of schermcommando's gebruikt voor deze verificatie. Screenshot: `docs/screenshots/projector-test.png`. Gerichte controles: 24 Vitest-tests, 8 Python-tests, TypeScript-typecheck geslaagd.
