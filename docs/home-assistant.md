# Home Assistant on the Raspberry Pi

## Lange druk tijdens een ADB-hapering, bridge 1.35.3 (2026-11-22)

Tested 22/11 with 1.35.2. Short press during the ambience (09:48:45): «from ambience to cinema», screen up at 09:48:49,
Samsung off, Cinema scene, projector on its home screen: works. Long press during the ambience (09:40:40, `zha_event`
`off` seen live): it started a new random video instead of ending everything. The projector's ADB connection hiccuped
just then (`media_player.woonkamer_tv_2` briefly unavailable, Android TV reloaded at 09:40:55), the light loop stopped
on it and cleared the forced flag, so the bridge thought the ambience had ended. Now only `ambience_ended(state)` clears
it: projector off, gone, or another app in front; «unavailable» / «unknown» keeps the ambience, and the queue worker
picks the light loop up again whenever the ambience app is in front and no loop runs. Test:
`test_an_adb_hiccup_does_not_end_the_ambience`. Install in two pastes: `outputs/cinema-bridge-1.35.3-install-deel-1.txt`,
then `-deel-2.txt`.

## Lichtlus houdt het opstarten niet meer op, bridge 1.35.2 (2026-11-22)

1.35.1 checked 22/11 09:05: after the restart (08:56) the bridge found the ambience app in front and picked the lights up
again («Ambience app already in front»): Zij 1-6 at 20 % in the orange of the top of the picture, LED strip orange, the
other lights 10 %. But the light loop was a normal task created during start-up, so Home Assistant waited for it
(«Setup timed out for bootstrap waiting on … ensure_ambience_lights», start-up finished only after 5 min). It is now a
background task (`async_create_background_task`), cancelled on stop as before. Install in two pastes:
`outputs/cinema-bridge-1.35.2-install-deel-1.txt`, then `-deel-2.txt`.

## Sfeer na een herstart, bridge 1.35.1 (2026-11-22)

Checked after installing 1.35.0 (22/11 08:44): it runs (`bridge-status` version 1.35.0, no setup errors), but the
ambience was showing through the restart and the bridge lost track of it: the light loop did not run (Zij 1-6 stayed
purple at 10 %) and, with the «Ook rond de tv» switch off and the forced flag gone, a long press would have started a
new video instead of ending it. Now the ambience counts as active whenever the ambience app is in front (not
calibrating), and the queue worker picks the light loop up again once (`resume_ambience_lights`). When the loop ends
because the app left, the forced flag is cleared, so the next long press starts a new video again. Test:
`test_long_press_after_a_restart_still_ends_the_ambience_that_shows`. Install in two pastes:
`outputs/cinema-bridge-1.35.1-install-deel-1.txt`, then `-deel-2.txt`.

## Sfeer: «Zij 1-6» in de kleur van de bovenkant, lange druk = alles uit, korte druk = bioscoop, bridge 1.35.0 (2026-11-22)

- **Zij 1-6** (`light.hue_color_spot_1` … `_6`, Hue colour spots above the TV, replaced some living-room lights) are no
  longer dimmed with the others: while the ambience shows they take the main colour of the **top** of the projector
  picture (`frame_color(png, top=True)`: row weight 1 at the top -> 0.15 at the bottom, same hue grouping as the strip),
  from the same screenshot as the LED strip every 6 s, at a fixed 20 % (`AMBIENCE_SIDE_PCT`, as they were set by hand),
  3 s transition, only when the colour changes. They are in the snapshot, so they come back as they were afterwards.
- **Long press while the ambience shows** (forced long-press ambience, or «Ook rond de tv» in front): no new video but
  everything off: light loop stopped, projector off, Samsung off, living room to `BRIGHT_SCENE` =
  `scene.woonkamer_woonkamer_energie` (Hue «Energie»; the snapshot is not restored).
- **Short press while the ambience shows** does what it always does: screen closed = cinema start. Before it the bridge
  drops the ambience (no forced mode, light loop stopped, no restore) and closes the ambience app (`am force-stop`), then
  the normal cinema start runs (Samsung off, Cinema lights, screen up).
Tests: `test_top_of_the_scene_gives_the_colour_for_the_lights_above_the_tv`,
`test_long_press_while_the_ambience_shows_turns_everything_off_and_brightens`,
`test_short_press_while_the_ambience_shows_goes_straight_to_cinema`. Includes 1.34.4 and 1.34.5. Install in two pastes
(`outputs/cinema-bridge-1.35.0-install-deel-1.txt`, then `-deel-2.txt`): one paste of 82 kB was cut off by the Terminal
web UI («base64: truncated input»). The archive is now built with Python `tarfile` at gzip level 9 (69 kB of base64 for
all files, split in two halves of ± 35 kB); part 2 first checks the whole archive (`tar -tzf`) before anything is
overwritten. Not yet tested in the living room.

## Lange druk: de Samsung wordt weer wakker, bridge 1.34.5 (2026-11-22)

The long press itself arrived and started (21/11 20:02), but failed after ± 1.5 min with `tv-not-waking`: Wake-on-LAN
only went to the TV's Wi-Fi card (a4:30:7a:32:47:51), while the TV is on the wired network (ARP for 192.168.132.111 =
a4:30:7a:72:b6:3e; Home Assistant's Samsung device lists both). A wired TV only wakes on its wired MAC. Now every wake
attempt sends the magic packet to both (`DEFAULT_TV_MACS`, `tv_macs`; a `tv_mac` in the settings still goes first).
Includes 1.34.4. Install: `outputs/cinema-bridge-1.34.5-install.txt`. Not yet tested on the real TV.

## SONOFF-knop: korte druk wint van een lopende lange druk, bridge 1.34.4 (2026-11-22)

21/11 rond 20:02 «werkte de knop niet». The automation fired on every press (20:02:22 to 20:03:06, `shoppinglist_cinema.toggle`
without error), but nothing moved. Cause: just before, the button sent a long press (`zha_event` command `off`), which
started the random seasonal ambience. That held the cinema lock while it tried to wake the Samsung (WOL, 25 attempts)
and only failed at 20:03:53 with `tv-not-waking`; every short press in between was dropped with an INFO line
(«already busy»), so the log showed nothing. The press at 20:06:06 then worked (screen up), and a second press two
seconds later was the emergency STOP while the screen moved.

Now a short press always wins: a running long-press start is cancelled first (wait at most `AMBIENCE_CANCEL_WAIT` = 10 s for
it to release the lock, forced ambience switched off) and the cinema start or stop follows. A press that is still ignored
(another cinema action running) is logged as a WARNING, also for the long press. Test:
`test_short_press_cancels_a_running_long_press_ambience_and_starts_cinema`. Why the Samsung did not wake: see 1.34.5.
Install: `outputs/cinema-bridge-1.34.4-install.txt`.

## Ledkleur: hoofdkleur van de onderkant van de scène, bridge 1.34.3 (2026-11-20)

The LED strip sits under the TV, and the projection stops at the TV's lower edge, so `frame_color` weighs rows by height
(0.15 at the top -> 1 at the bottom): the band left and right of the TV, low in the picture, decides. It no longer
averages (blue sky + orange fire gave a muddy pink): lit pixels go into 12 hue groups of 30 degrees or «white/grey»
(saturation < 0.18), the strongest group with its two neighbours wins (colourful pixels get up to 2x), and the strip gets
the average of only those pixels; white stays white (saturation at most 0.12), a colour gets 0.55-1. Saved frames:
Christmas fire and autumn orange, a purple glow purple, a snowy scene with a few warm lights white, blue sky over a fire
orange. Replaces 1.34.2 (never installed). Install: `outputs/cinema-bridge-1.34.3-install.txt`.

## Ledkleur volgt witte beelden, bridge 1.34.2 (2026-11-20)

`frame_color` weighed colourful pixels up to 20x more than grey ones and then pushed the saturation up (+0.1 floor), so
a mostly white or grey scene with a few warm lights gave a pink or red strip. Now every lit pixel counts by its
brightness, colourful ones at most 2.5x more, averaged in linear light; the saturation is only raised 1.25x and a near
neutral average (< 0.06) stays white. On the saved projector frames: fires and autumn stay orange, the grey Google TV
home goes from pink (255, 178, 183) to near white (255, 231, 235).

## Sneller starten en netjes afsluiten, bridge 1.34.1 (2026-11-20)

`adb_ready` now waits until a real ADB call (`echo adb-ready`) answers, every 2 s for at most 90 s, instead of only
waiting for the Android TV entity to look available (right after waking it came and went, and the bridge even reloaded
it, so the first `am start` failed and the retry came 15 s later). The retry after `tv-play` waits 5 s instead of 15 s.
On Home Assistant stop the LED strip loop is cancelled (it warned «was still running after final writes shutdown stage»).

## SONOFF-knop lang indrukken: willekeurige seizoensambience, bridge 1.34.0 (2026-11-20)

The bridge listens to `zha_event` itself (no automation change): button `8c:73:da:ff:fe:ef:e8:89`, command `off` (long
press; single press stays the cinema automation, double press is still free). It picks a random video for today's
season (`season_keys` = the app's `seasonalShelves`: Christmas + winter in December up to 6 January, Halloween + autumn
15–31 October, otherwise the meteorological season; never the same video twice in a row) from `ambience_pool.py` and runs
`tv-play` with the projector forced on (`forced_ambience`, also for the light loop) whatever the «Ook rond de tv» switch
says: TV on, YouTube, Chloé, the video, the projector app around the TV, the other lights at 10 % and the LED strip in the
colour of the picture. Ignored while the screen moves or another cinema action runs. `ambience-hide` (switch off) ends the
forced mode and puts the lights back. The pool (10 long, embeddable, non-live videos per season, no music compilations or
games) comes from `node --env-file=.env.local scripts/build-ambience-pool.mjs` (the Pi has no YouTube key) and is not
refreshed by itself: rebuild when videos disappear. Tests: `scripts/test-cinema-ambience.py`.
Tested 20/11 17:06: the long press arrives as `zha_event` command `off` (plus an `attribute_updated` on_off = 0, ignored);
the TV played an autumn video, the projector woke (first ADB call failed while it booted, the retry 15 s later
worked), the app showed the video around the TV, the LED strip went amber (255, 114, 0) and the other lights to 10 %.

## «Ook rond de tv»: lampen dimmen en ledstrip in de kleur van het beeld, bridge 1.32.0 (2026-11-20)

When the projector app shows (`show_ambience`, also after `tv-play` and when settings change while it is in front), the
other lights of `light.woonkamer_woonkamer` go to 10 % once (transition 2 s) and `light.woonkamer_led_woonkamer_nieuw`
follows the picture: every 6 s a projector screenshot (`FRAME_COMMAND`, the same ADB capture as X-Ray), `frame_color`
(ambience.py: 48×27 pixels, weighted by saturation × brightness so the black TV mask does not count, a bit more vivid,
full value; nearly black = no change) → `light.turn_on` rgb + brightness 25–100 % with a 3 s transition, only when the
colour moved noticeably. Stops as soon as the app is no longer in front, «Ook rond de tv» is off or the projector is
off; five failed captures in a row also stop it. Since 1.33.0 the room is put back: just before dimming the bridge
snapshots every light of the group + the strip (`scene.create` → `scene.shoppinglist_ambience_before`) and turns that
scene on again (transition 2 s) when «Ook rond de tv» is switched off, the projector goes off or another app comes in
front, but not when Stremio took over (the cinema scene owns the lights then). Tested 20/11: room at 2237 K 100 % + strip
(255, 189, 86) 100 % → ambience: others 10 %, strip (255, 69, 0) 45 % → `ambience-hide`: back to exactly the same values. Tested on real screenshots:
fireplace → orange (255, 66, 0) at 46 %.

## «Sfeer op tv» + «Ook rond de tv» zonder Mac, bridge 1.31.0 (2026-11-19)

The Mac no longer has to be on. Three jobs moved:
- **TV control → the Pi** (`ambience.py`): `tv-play:<video id>` wakes the Samsung (WOL to a4:30:7a:32:47:51 when its REST
  API does not say «on»), restarts YouTube (REST `/api/v2/applications/111299001912`), presses LEFT×4 + ENTER through
  Home Assistant's Samsung remote entity (Chloé = leftmost profile) and plays the video through YouTube's Lounge API;
  `tv-pause` / `tv-resume`. With «Ook rond de tv» on, the projector app opens afterwards (a projector failure never
  fails the TV command).
- **The page → inside the projector app** (`src/projector-app/main.ts`, bundled with esbuild into `assets/page.html`
  by `scripts/build-sfeer-apk.mjs`; same `src/lib/ambience-projector.ts` rules). Served from `http://localhost:<port>`
  by the app (`LocalServer`), so YouTube accepts the embed.
- **Following the TV → the projector app** (`LoungeFollower`, Java port of the Mac's Lounge reader): binds to the
  TV's YouTube as a remote (DIAL screenId → lounge token), long-polls `nowPlaying` / `onStateChange`, refreshes every 15 s.

Settings (on/off, corners, margin, soft edge, blur, spread, calibrating) live online in `cinemaCompanionData`
«{owner}:ambience-settings» (`src/lib/server/ambience-relay.ts`) and travel with `ambience-set:<base64url JSON>` (with
`open`: show · show-if-tv · hide · push); the bridge validates every field (`parse_settings`), keeps the last ones in
`/homeassistant/shoppinglist-ambience.json` and starts the app with `am start -n be.shoppinglist.sfeer/.MainActivity
--es tv 192.168.132.111 --es settings <base64url>` (a new intent updates the running page). `/api/tv/ambience` goes
through the Pi for every account with a bridge, on Vercel and on the Mac; without a bridge the old Mac-only TV path
stays (no projector). YouTube search works on Vercel too (signed in, same origin). Removed: the Mac's projector page,
`/api/tv/ambience/projector`, the Mac's Lounge reader and the `ambience-show@<ip>:<port>` command. `ambience_url` in
`shoppinglist-cinema.yaml` is no longer used. Tests: `scripts/test-cinema-ambience.py`, `src/lib/ambience-relay.test.ts`.
Install: `outputs/cinema-bridge-1.31.0-install.txt` (installs app versionCode 3 on the next show).
Follow-ups 20/11: 1.31.1 restores `SFEER_APK` (lost in the clean-up; every app install failed with
`device-action-failed`) and retries the projector once after `tv-play`; app 4 (bridge 1.31.2) lays the page out in % / vw:
the XGIMI WebView reports a width four times the real one, so pixel geometry fell off-screen (black projector).
Tested 20/11 with the Mac's server off: `tv-play` played the fireplace on the Samsung (Chloé's profile selected through
HA's Samsung remote), app 4 followed the TV itself («Tv: playing · 9043 s» in calibrate mode) and the projector showed the
blurred video around the masked TV.

## «Ook rond de tv»: adres van de Mac meesturen, bridge 1.30.0 (2026-11-19)

A fixed DHCP lease for the Mac dropped its connection, so its address can change. The app now sends its current
address with every start: `ambience-show@<private IPv4>:<port>` (`ambienceShowAction`, the Mac's own en0 address and the
port of the server that got the request). The bridge accepts only a private IPv4 address (`AMBIENCE_SHOW_AT`) and always
takes the key from `ambience_url` in `shoppinglist-cinema.yaml`; plain `ambience-show` still uses that whole URL.

## «Ook rond de tv»: localhost-doorgeefluik in de app, bridge 1.29.0 (2026-11-19)

Test with 1.28.0: the app installed and opened, the mask was right, but YouTube showed «This video is unavailable».
YouTube refuses an embedded video when the page comes from an IP address: also on the Mac, `http://192.168.132.183:3010`
and `http://127.0.0.1:3010` fail while `http://localhost:3010` and `http://kristofs-macbook-air.local:3010` play. App
versionCode 2 (`LocalProxy`): the WebView loads the page from `http://localhost:<random port>` on the projector itself
(listens on 127.0.0.1 only) and forwards every request to the Mac in `ambience_url`. Tested on the Mac with the same Java
class: the video plays through the proxy. Bridge 1.29.0 only carries the new APK (`APK_VERSION = 2`).
Tested 19/11 on the projector with 1.29.0: app updated and opened (60 s incl. waking), screenshot shows the blurred
fireplace video with the black mask; the mask still has the default corners until «Tv afdekken» is done.

## «Ook rond de tv»: eigen app op de projector, bridge 1.28.0 (2026-11-19)

First real test with 1.27.0: the projector woke and the VIEW intent was sent, but a screenshot showed only the Google TV
home screen: the XGIMI has no browser (Stremio, Netflix, Disney+, Prime, VRT MAX, PLAY, Apple TV, YouTube). The first
attempt also failed because the ADB entity was still unavailable right after waking (`device-action-failed`).
1.28.0: own one-screen app «ShoppingList Sfeer» (`android/sfeer`, package `be.shoppinglist.sfeer`, ±13 kB): a full-screen
WebView without address bar, video may start without a tap (`setMediaPlaybackRequiresUserGesture(false)`), only the
projector page on a private IPv4 address (same rule as `AMBIENCE_URL`), «back» closes it. Built with
`node scripts/build-sfeer-apk.mjs` (JDK 17 via Homebrew `openjdk@17`, Android SDK `build-tools;34.0.0` +
`platforms;android-34` via Homebrew `android-commandlinetools`; signing key in `.cache/sfeer/`, not in Git, keep it)
into `sfeer_apk.py`. `ambience-show` now waits for the ADB entity (max 60 s), retries ADB calls, installs/updates the app
when its versionCode is lower (hash checked) and starts it with `am start -n be.shoppinglist.sfeer/.MainActivity -d <url>`.
`ambience_browser` is gone. Install: `outputs/cinema-bridge-1.28.0-install.txt` (no python3 in the Terminal add-on).

## «Ook rond de tv»: ambience ook op de projector (2026-11-19)

Bridge v1.27.0 adds two commands (`RELAY_ACTIONS`, `src/lib/server/projector-relay.ts`):
- `ambience-show`: refuses while the projection screen is down (`screen-open`, the picture belongs on the wall), wakes the
  projector (`ensure_on`) and opens exactly the page in `shoppinglist-cinema.yaml` `ambience_url` (since 1.28.0 in our own
  app, see above). Only
  `http://<private IPv4>:<port>/projector/sfeer?key=<32–64 URL-safe chars>` is accepted (`AMBIENCE_URL`). No browser on
  the projector = `no-browser`.
- `ambience-hide`: projector off, never while Stremio is in front.

The page (`src/app/projector/sfeer/page.tsx`) is served by the Mac (`http://192.168.132.183:3010`, the dev server; the
Mac needs a fixed address) and polls `/api/tv/ambience/projector?key=…` every second. The Mac follows the Samsung's
YouTube through one Lounge connection as a remote (`src/lib/server/ambience-projector.ts`: `nowPlaying` /
`onStateChange`, `getNowPlaying` every 15 s; only while the page asks, closed 30 s after). Measured 19/11 against the
real TV in a desktop browser: after the first jump the player stays within ± 0.1 s of the TV (the jump lead is learned,
`nextLead`). Settings (on/off, TV corners, margin, soft edge, blur, key) in `.cache/samsung-tv/projector.json` (not in Git).

Note 19/11: `.cache/samsung-tv/config.json` still had host `192.168.132.200`; the TV answers on `192.168.132.111`
(MAC a4:30:7a:32:47:51), so «Sfeer op tv» could not reach it. Host corrected (backup `config.json.before-111`);
a DHCP reservation for the TV avoids this.

Install: paste `outputs/cinema-bridge-1.27.0-install.txt` (not in Git: holds the page key) in the Terminal & SSH web UI
(backups `*.before-<timestamp>`, also of `shoppinglist-cinema.yaml`; `ha core check && ha core restart`).
Not yet tested on the projector itself: whether the XGIMI has a browser that opens the page full screen and plays a
muted YouTube video by itself.

## X-Ray «Nu in beeld»: screenshot on request (2026-11-11)

Bridge v1.26.0: the SONOFF button did not always close the screen. Closing (DOWN → contact closed) takes 34–35 s; on
15/11 17:03, 15/11 21:59 and 16/11 21:59 it took 46, 44 and 41 s (closed by hand), and on 12/11 a second press was needed.
Each time the bridge sent DOWN without error (lights to 20 % and projector off did happen; blinds did not move). Cause:
the learned DOWN code holds the button's frame only once (182 ms, a very short press while learning), UP and STOP hold it
six times (± 450 ms). The motor needs a few matching frames in a row, so a single frame is easily missed; UP never failed.
1.26.0 sends DOWN with its last frame repeated to six frames (`with_min_frames`, `RF_MIN_FRAMES`; 396 ms, every learned
pulse kept, one continuous transmission like a held button; UP and STOP unchanged), and checks the result: still open
45 s after DOWN → DOWN once more (logged «Screen still open 45 s after DOWN»), still open 50 s later →
`screen-closing-not-confirmed`. Never after an emergency STOP with the button during closing (`screen-closing-stopped`).
The codes on the Pi (`shoppinglist-cinema.yaml`) are not changed; the lengthening happens in the bridge.

Bridge v1.25.0: still into the ceiling on 16/11 20:16 with 1.24.0, while the log showed no delay at all (Home Assistant
on time, STOP sent quickly). So the STOP left on time and the motor still went on. Since 1.16.0 (12/11) the STOP went
out three times, 0.6 s apart, on the assumption that a STOP to a stationary motor does nothing; since then almost every
start overshot (36–38 s from opening to the blinds instead of 34.5 s). Many RF motors treat a second STOP while
stationary as «go on» or «go to the favourite position». 1.25.0 sends ONE STOP per run (`STOP_BURST = 1`), as up to
1.15.0; only a send that fails (exception/timeout) is retried within 8 s. To be confirmed at the next start.

Bridge v1.24.0 (replaces 1.23.0): the screen sometimes ran into the ceiling. The STOP is timed (30.55 s after UP); on the
runs that overshot it went out 0.5–2.5 s late (37 s from opening to the blinds instead of 34.6 s), very likely because
Home Assistant's event loop stalled at that moment while the Android TV integration reconnected to the booting projector.
1.23.0 tried to send the timed STOP from its own thread through the BroadLink object, but this Home Assistant's
python-broadlink is async (`rmmini.send_data` is a coroutine): nothing was sent and the normal STOP even waited ± 1.2 s
for it (16/11 20:02: 38 s). 1.24.0 removes that timer: STOP goes out right away again; while the screen moves the bridge
does no ADB reads or reconnects; logged: «Home Assistant was n s late at the screen STOP moment» and «First screen STOP
took n s to send» whenever either is over 0.5 s, so the next overshoot shows where the delay is.

Bridge v1.22.0: the Samsung TV sometimes stayed on during a cinema start. Home Assistant's Samsung entity marks the TV
«off» as soon as a turn_off is sent, also when the TV missed it, and the bridge trusted that state. Now the TV's own REST API
(`http://192.168.132.111:8001/api/v2/`, `device.PowerState` = on / standby) decides: a TV that reports «on» is turned off
even when Home Assistant says «off»; the turn_off is sent again (at most 3 times, 8 s apart) only while the TV itself
still reports «on», so a repeated power key can never switch it back on. No answer from the TV = fall back on Home
Assistant's state as before. A screen opened by hand also always lets this check decide.

Bridge v1.21.0 adds one command, `xray-frame` (`RELAY_ACTIONS`, `src/lib/server/projector-relay.ts`): over the existing
ADB entry it runs `screencap -p | base64`, Pillow (part of HA Core) turns the PNG into a 960 px JPEG (quality 72,
± 60–120 KB) and computes the mean brightness, and the bridge writes it to `cinemaCompanionData` «{owner}:xray-frame»
(`payload` = at · width · height · brightness · jpeg · version, expires after 10 minutes). Nothing is stored on the Pi
or the projector. Tested 11/11 by hand on the XGIMI XR16A: the screenshot shows the real picture (not black), 1920×1080,
± 4–6 s. The app asks for a frame only while X-Ray is open and something plays (every 30 s and on pause, never during
pause/rewind) or when «Gebruik AI» is pressed (`src/lib/server/xray-scene.ts`). Faces are recognised on the tablet
(`src/lib/face`, InsightFace buffalo_s via onnxruntime-web; models non-commercial only), the AI button sends the frame
+ cast to Gemini (30 per hour).
Needs, with the owner's OK: `node scripts/allow-bridge-frame.mjs --apply` (the Pi's scoped account may also
create/update exactly «{owner}:xray-frame», same narrow rule as «bridge-status»; tests the refusals, backup in
`.cache/cinema-companion/`), then paste `outputs/cinema-bridge-1.21.0-install.txt` (not in Git) in the Terminal & SSH
web UI (backups `*.before-<timestamp>`, `ha core check && ha core restart`). Tests: `scripts/test-cinema-bridge.py` (52).
Until both are done the panel says «Geen beeld van de projector» and «Gebruik AI» answers «frame-unavailable».

## Dashboard showed nothing while Stremio played (2026-11-11)

Evening of 11/11: Stremio played on the projector, the tablet dashboard (always-on) showed no X-Ray. The Pi was online
(heartbeat every 20 s, projector `on`) but `cinemaPlayback` had not changed since 17:52. The watcher only read Stremio's
media session while `media_player.woonkamer_tv_2` reported `app_id` `com.stremio.one`, and an ADB failure was skipped
silently, so either cause gave nothing at all without a trace (the exact one needs the HA log of that evening).
Bridge v1.20.0:
- reads the media session whenever the projector is awake, whatever HA says about the app in front; without a Stremio
  session the companion reports `unknown` once and then stays quiet (no write every few seconds);
- with the companion on, an ADB reply without `COMPANION_UPTIME` counts as an ADB failure; after 3 failures in a row
  the Android TV (ADB) entry `01M64FE12GJ4ED6MR8PMCTGN46` is reloaded, at most every 5 minutes;
- writes `cinemaCompanionData` «{owner}:bridge-status» (`stage` projector-off · adb-failed · no-stremio-session ·
  stremio · publish-failed, `appId`, `playerState`, short `error`, `version`) on a change or every 60 s, never titles.
  The X-Ray page shows it when nothing is live («de Pi kan de projector niet uitlezen (ADB)…»), and it can be read
  back for diagnosis without the HA log.
Tests: `scripts/test-cinema-bridge.py` (50), `scripts/test-cinema-companion.py` (11). Installed 11/11 ±19:55: playback
was published again within seconds. The status record was not: the Pi's scoped token may only write its heartbeat,
playback and command states (`scripts/setup-cinema-companion.mjs`, `setup-cinema-direct.mjs`), and `cinemaCompanionData`
is server-only. 1.20.0 then retried that write every round; v1.20.1 waits 60 s after a failed status write too
(`outputs/cinema-bridge-1.20.1-install.txt`). Permissions (11/11, with the owner's OK): `scripts/allow-bridge-status.mjs
--apply` lets the Pi's scoped account create/update exactly that one record (fixed id and key, only payload/expiresAt;
no read, no delete, no other record; backup of the previous rules in `.cache/cinema-companion/`), and tests the
refusals. Right after: `{"stage":"stremio","appId":"com.stremio.one","playerState":"on","error":null,"version":"1.20.0"}`.

## X-Ray: rate limit, play after pause (2026-11-11)

Evening of 11/11 («The Swedish Connection»): X-Ray answered «niet bereikbaar» and play after a pause did nothing.
- X-Ray: the server got «Your request exceeded the rate limit» from InstantDB. Since bridge 1.18.0 the Pi read the
  command queue every 2 s and wrote its heartbeat on every round, and the companion wrote the playback position every
  2 s; on top of that each question reserved its hourly budget with up to 40 separate writes, and a refused write
  counted as «budget full». Now: the admin client (`src/lib/server/instant-admin.ts`) retries a rate-limited query or
  transact twice (0.4 s, 1.2 s), the budget is one counter per hour, a rate limit that remains becomes `database-busy`
  («X-Ray heeft het even te druk»), and unknown errors are logged by `/api/cinema/xray` instead of swallowed.
  Bridge v1.19.0: heartbeat only on a change or every 20 s; telemetry publishes state, title and seek changes at once
  but steady playback only every 6 s (the app extrapolates the position; stale after 12 s).
- Play after pause: the Pi refused it with `stremio-not-playing` (16:46:52, 16:47:07; the pause at 16:46:38 was
  `sent`): paused, Home Assistant no longer reports Stremio as the app in front. Bridge v1.19.0 sends play-pause to
  Stremio's own media session through the helper (`scripts/android/CinemaControl.java` `play-pause`: playing or
  buffering → pause, else play; dex v2, `control_dex.py`), and keeps reading the session after a pause.
Install: paste `outputs/cinema-bridge-1.19.0-install.txt` (not in Git) in the Terminal & SSH web UI; it backs up
`__init__.py`, `companion.py`, `control_dex.py`, `manifest.json` and `screen.py` and restarts Core.

## Screen STOP made robust (2026-11-11)

11/11 around noon: a cinema start with the SONOFF button and the screen did not stop at its height. The screen has
no position feedback, so the only thing that stops it is the timed STOP (30.55 s after UP). Up to 1.15.0 that STOP
went out once: a failing send (BroadLink busy or a Wi-Fi hiccup, `wait_for` 5 s) or an RF STOP drowned out on the
shared 433 MHz band (BREL blinds) was never repeated, so the motor ran on to its end stop. Bridge v1.16.0
(`screen.py`, `stop_burst`): after the run the STOP goes out `STOP_BURST` (3) times, `STOP_GAP` (0.6 s) apart, and a
failing send is retried until `STOP_RETRY_WINDOW` (8 s) has passed; only when not a single STOP went out does the
start fail with `screen-stop-not-sent` (logged as an error). The burst is shielded, so a cancelled start (HA restart,
failure elsewhere) still sends every STOP. The learned codes are fixed codes, not a rolling code, so a STOP to a
motor that already stands still does nothing. Pressing the button while the screen moves is now an emergency STOP
(it used to be ignored). Every STOP is logged (`Screen STOP sent 3× …`), so the next incident can be read back in the
system log. The cause of the 11/11 run itself depends on the HA log of that moment. Install: paste
`outputs/cinema-bridge-1.16.0-install.txt` (not in Git) in the Terminal & SSH web UI; it backs up `__init__.py`,
`screen.py`, `manifest.json` and `companion.py`, installs the same `__init__.py` and `companion.py` as the companion
installer of that morning plus this change, and restarts Core.

## «Film stoppen» through the Pi (2026-11-10)

The dashboard's stop sent the screen DOWN through the Mac-only BroadLink route (`/api/broadlink`), which the
dashboard cannot reach, so the screen stayed up (9/11 21:57: projector off and lights 20 % did happen, contact stayed
Bridge v1.15.0 adds the service `shoppinglist_cinema.toggle` (`services.yaml`): screen closed (contact `off`) → the
same flow as «cinema» (screen up with its timed STOP, Samsung off if on, Cinema, projector on, blinds after the
STOP); screen open → the same flow as «cinema-stop» (screen down, projector off, living room 20 %). A press while the
screen moves or another cinema action runs is ignored. The SONOFF SNZB-01P button (ZHA, ieee
`8c:73:da:ff:fe:ef:e8:89`) calls it on a single press via the automation `knop_bioscoop_snzb01p` («Knop: bioscoop aan
of uit»); double press (`on`) and long press (`off`) are still free. Install: paste
`outputs/cinema-bridge-1.15.0-install.txt` (not in Git) in the Terminal & SSH web UI.

open). Bridge v1.14.0 adds the relay action `cinema-stop` (also allowed in `RELAY_ACTIONS`, 120 s): screen DOWN once
when the contact reads open (motor runs to its end stop, no STOP; done when the contact reads closed, else
`screen-closing-not-confirmed` after 90 s, never repeated), projector `turn_off` when awake, and
`light.woonkamer_woonkamer` to 20 %, side by side. The DOWN code lives as `screen_down:` in
`shoppinglist-cinema.yaml` (added by the 1.14.0 installer, `outputs/cinema-bridge-1.14.0-install.txt`, not in Git).
`runFilmMode(false)` now sends only this command; a `screen-…` error keeps projector and light confirmed.

## Blinds wait for the screen (2026-11-09)

After 1.12.0 the screen no longer stopped at its height on «Start film» (8/11 and 9/11, both commands «sent», no
errors). History showed the left blind starting 2 s after the screen's UP and the right one moving until 35 s later,
right over the timed STOP (±10.5 s). The BroadLink screen and the BREL hub share 433 MHz, so the STOP got drowned out.
Bridge v1.13.0: on a cinema start the blinds only start after the screen task ended (its STOP sent, also when opening
failed) plus `RF_GAP` (1.5 s); opened by hand they wait the calibrated screen duration + 1.5 s. The Samsung did turn
off on both evenings according to HA (on since 16:37, off at 20:14:16, stayed off); that path is unchanged.
Install: paste `outputs/cinema-bridge-1.13.0-install.txt` (not in Git) in the Terminal & SSH web UI; it backs up both
files, prints the hash and version, then `ha core check && ha core restart`.

## Blinds on screen open (2026-10-30)

The BREL hub (192.168.132.222) was added to HA through the official Motion Blinds integration (key entered by the
user). `cover.rollershutter_0001` = Blinden rechts, `cover.rollershutter_0002` = Blinden links (HA position 0 = closed,
100 = open). Bridge v1.12.0, when the screen opens (by hand or with a cinema start): from 19:00 both to 0; before
19:00 left 0 and right 50 (cat door). A blind already at its target or with unknown position gets no command; hub
failures are logged and never stop the cinema. Closing the screen leaves the blinds as they are (user's choice).
The Mac's own BREL route (`docs/brel.md`) is unchanged.

## Remote access via Tailscale (2026-10-29)

Community add-on `a0d7b954_tailscale` (0.30.4) runs on the Pi, tailnet of lesaffrekristof@gmail.com
(MagicDNS `tail99cbcc.ts.net`). Home Assistant away from home: **`http://homeassistant.tail99cbcc.ts.net`** (port 80, forwarded to
192.168.132.211). Not the bare IP `100.92.235.112`: HA's login rejects it with "Invalid client id" (CGNAT
addresses are not accepted as an IndieAuth client id); the API answers on it, the login page does not. The Mac is
`kristofs-macbook-air` (100.116.237.89), standalone Tailscale app. Its "Sign in" button did nothing during
onboarding; `/Applications/Tailscale.app/Contents/MacOS/Tailscale login` prints the auth URL instead.
Verified: HA answered (401 before login) over Tailscale. No router ports opened, no HA Cloud.
Note: ADB to the projector (192.168.132.133) is only reachable from the Pi, not from the Mac remotely.

## Stremio pause → 20 %, play → Cinema (2026-10-29)

v1.11.0: every playback start recalls Cinema (from pause, stop, a new title or the first reading), whatever the
lights were; BUFFERING → PLAYING is not a start. v1.10.1 fixed the dump query (`grep -E 'package=|state=PlaybackState'`).

Android TV Remote and Cast cannot see playback in Stremio's own player. The projector's media session can:
USB debugging was enabled on the XGIMI and the official Android TV (ADB) integration added for
`192.168.132.133` (entry `01M64FE12GJ4ED6MR8PMCTGN46`, `media_player.android_tv_192_168_132_133`). Its own state
stays `off` (XGIMI's `Display Power` line has no `state=ON`), so do not use that entity's state.
Bridge v1.10.0 polls `dumpsys media_session` via `androidtv.adb_command` every 2 s, only while
`media_player.woonkamer_tv_2` is awake with `app_id` `com.stremio.one`. PLAYING → PAUSED sets the living room
to 20 %; PAUSED → PLAYING recalls Cinema (skipped when already active). First readings, buffering and stop
change nothing; nothing happens while a cinema command runs.

## Screen opens/closes by hand → projector on/off (2026-10-29)

v1.9.0: opening also recalls `scene.woonkamer_woonkamer_cinema` via `ensure_cinema_lights` (skipped when Hue
reports Cinema active and the room on); closing sets `light.woonkamer_woonkamer` to 20 % (`light.turn_on`,
`brightness_pct: 20`), which also switches the room on when it was off.

v1.8.0: opening also turns the Samsung off when it reports an awake state (same `turn_off_samsung` as cinema
start, one command, confirmed within 15 s); closing never touches the Samsung. Also fixes 1.7.0, where the
`@callback` marker sat on the wrong function, so HA would have run the contact listener in a worker thread.

Cinema bridge v1.7.0 listens to `binary_sensor.gang_beneden_voordeur_opening` (the Hue contact on the
screen). A live closed → open change wakes the projector once through the bridge's guarded `ensure_on`
(Atom); a live open → closed change sends one `media_player.turn_off` to `media_player.woonkamer_tv_2`, only
when it reports an awake state. Nothing is sent while a queued cinema command runs, while the bridge moves
the screen itself, within 120 s of an Atom wake (projector may still be booting), or for availability
recovery / restored states. No retries. Tests: `scripts/test-cinema-bridge.py` (22).

Installed via the Terminal & SSH add-on, which on the Pi 5 has **no python3**: use a shell-only installer
(`base64 -d` per file, backups `*.before-<timestamp>`, then `ha core check && ha core restart`).
Verified: `manifest/get` reports 1.7.0 after restart, no bridge errors in the system log. The File editor
add-on is not installed on the Pi 5.

## Move to Raspberry Pi 5 (2026-10-28)

The Pi 3 failed (HA had reported under-voltage). Its card held `haos_rpi3-64`, which cannot boot a Pi 5.
No Supervisor backups existed on the card, so the `/supervisor/homeassistant` config folder was read
read-only with `debugfs` and packed into a Supervisor backup (format 2, unencrypted, database included),
kept on the Mac in `~/Downloads/ha-oude-pi/`. The same card was then flashed with HA OS 18.4 (`rpi5-64`)
and the backup restored through the onboarding API. Accounts, integrations and devices came back intact;
add-ons were not in the backup. «Terminal & SSH» (web terminal only, no SSH key) was installed afterwards.

The Pi 5 is at `192.168.132.211` and serves HA on port 80 (`http://homeassistant.local`); `:8123` no
longer answers. Nothing in the app calls the Pi directly: the cinema integration polls Instant itself.

Cinema bridge v1.5.0 relaxes the screen pre-check at the user's request: a live (not restored) closed
reading of the contact sensor is enough. The earlier rule required an observed open→closed transition
within 120 s, which made every start after a restart fail with `screen-closed-confirmation-stale`.
All motion guards are unchanged (open seen within 5 s, sensor present, battery > 10 %, one bounded STOP).
A live «Start film» from the app then completed: projector on, screen to height, living room on Cinema.

## Cinema Bridge Update (2026-10-26)

Bridge v1.2.0 additionally uses verified Hue entities `select.woonkamer_woonkamer_scene` and
`light.woonkamer_woonkamer` to skip Cinema recall when that scene is active and the group is on. The scene
entity's activation timestamp is deliberately not used as live state. Projector wake remains guarded by
power state and a boot-time connectivity probe. Twelve worker tests include the fully already-on case.
Screen position remains unknown: BroadLink RF commands and calibrated timing do not provide feedback.
No screen motion or inferred open/closed state was added for this request.

Samsung Q60 (82-inch QE82Q60RALXXN, MAC A4:30:7A:32:47:51) was subsequently paired through the official
Samsung Smart TV integration with the user's on-screen approval. Device ID `91c3bfe47727aa015fce023d5911f049`;
player `media_player.samsung_q60_series_82_qe82q60ralxxn`. Bridge v1.1.0 checks this actual TV before a watch
command: already off skips power, on sends one turn-off and waits for confirmation, unknown status aborts.
Google Cast's `Woonkamer Google TV` is not used as a proxy for Samsung screen power. Projector-only on/off
actions are unchanged. The updated configuration passed HA validation before restart.
A full cinema test subsequently completed successfully; HA observed Samsung On -> Off, and the user
confirmed the actual Samsung screen switched off. No Google Cast power toggle was used.

The Pi now runs the custom `shoppinglist_cinema` integration from this repository. It consumes its own
Instant command queue over outbound HTTPS using a dedicated permission-limited non-admin identity.
The earlier HTTP polling package pointing at the Mac is disabled and backed up. See
`docs/stremio-projector.md` for the installed configuration, permissions and validation details.

`Kijk op projector` now queues the whole lighting/power/Stremio sequence rather than controlling devices
from the browser. The fixed scene is `scene.woonkamer_woonkamer_cinema`; the fixed player remains
`media_player.woonkamer_tv_2`. It skips wake for an already-on player; a reachable Android TV endpoint
is allowed to finish booting without sending another wake. No screen movement is included.

A live Daredevil S2 E7 request completed on the Pi and the user confirmed lighting, projector and the
correct episode. This supersedes the earlier notes about the outbound bridge being inactive. The local
website itself still requires the Mac until its frontend/backend can be published; Pi execution does not.

Home Assistant OS runs on the Raspberry Pi 3 Model B at `192.168.132.130`.
The XGIMI projector is paired through Android TV Remote as **Woonkamer TV**,
model **XR16A**, MAC `9C:12:21:F0:F7:9F`. **Woonkamer Google TV** is a different
device and must not be used for projector commands.

## Atom wake action

The existing Atom firmware is unchanged. It retains the learned BLE payload and
is reachable at `192.168.132.177`. Its LED being dark is normal.

The official File editor app was installed on Home Assistant to add this block
to `/config/configuration.yaml`, preserving the default configuration:

```yaml
rest_command:
  xgimi_wake_atom:
    url: "http://192.168.132.177/button/Wake%20projector/press"
    method: POST
    payload: ""
    content_type: "application/x-www-form-urlencoded"
    timeout: 10
```

`/config/scripts.yaml` contains:

```yaml
xgimi_projector_aan:
  alias: "Projector aan via Atom"
  icon: mdi:projector
  mode: single
  sequence:
    - action: rest_command.xgimi_wake_atom
      response_variable: atom_response
    - condition: template
      value_template: "{{ atom_response.status == 200 }}"
```

The script checks HTTP acceptance, not the projector lamp. Do not automatically
retry commands after a timeout. Prior physical tests confirmed Atom wake from
**Power off**, but not from **Sleep**. Reserve both Pi and Atom IPs in DHCP before
depending on fixed URLs long term.

Verification on 2026-10-25: Home Assistant configuration validation passed and
Core restarted successfully. `rest_command.xgimi_wake_atom` executed from Home
Assistant returned HTTP 200 from the Atom. The script appears in the Scripts
list as **Projector aan via Atom**. The user confirmed that waking from power off
worked. The user also confirmed that the picture went off using Home Assistant's
Android TV Remote media player. Its exact entity is `media_player.woonkamer_tv_2`.

## Outbound App Integration: Prepared, Not Published

The user selected an outbound connection without a Home Assistant Cloud
subscription and explicitly authorized the persistent scoped Pi credential.
The implementation is in `projector-relay.ts`, `projector-relay-routes.ts`, and
`projector-client.ts`. It reuses the app's Instant authentication and existing
projector buttons. Accounts with no bridge retain the old local-only path.

The Pi polls an HTTPS endpoint every 10 seconds. The server accepts only on/off
for the paired owner's projector. Commands expire after 30 seconds. An atomic
unique active lock prevents simultaneous commands; a unique claim receipt must
commit before dispatch. Neither browser nor Pi retries physical commands.
Missing completion is reported as uncertain, never as confirmed lamp status.

`scripts/setup-projector-relay.mjs` provisioned only the three projector
namespaces, with deny-all client permissions. An anonymous read returned zero
rows. Only a SHA-256 hash of the scoped Pi token is stored in the database. No
Home Assistant administrator credential is needed by the app. Local generated
credentials and the HA package are ignored under `.cache/projector-relay/` and
have private file permissions. Never commit or print them.

The generated `shoppinglist-projector.yaml` was uploaded to `/config` using the
official File editor. Its package configuration passed Home Assistant validation.
It is deliberately **not included/activated**, and the database bridge is
**disabled**, pending publication. The existing standalone wake script remains
active and unchanged.

Production publication to `https://shoppinglist-lesaffre.netlify.app` was blocked
with HTTP 403: "Account credit usage exceeded - new deploys are blocked until
credits are added". The user chose to wait for the credit reset. No credits were
purchased, no subscription changed, and no production deploy succeeded. One empty
draft deploy was created while diagnosing the restriction; it was not published.

Verification: 25 focused tests passed; TypeScript and lint passed (existing
unrelated lint warnings remain). A production build in an isolated HEAD-based
copy with only projector changes passed. Other local edits were not deployed.
The end-to-end online app-to-Pi test remains pending.

To resume after hosting credits reset: publish the projector changes, enable the
bridge, add the following to `configuration.yaml`, validate, restart Core, and
verify a fresh Pi heartbeat before testing the app's on/off buttons:

```yaml
homeassistant:
  packages:
    shoppinglist_projector: !include shoppinglist-projector.yaml
```

Polling uses the existing app hosting/database quotas (about 8,640 polls/day),
so it is not a guarantee of unlimited free hosting. The existing app already
depends on InstantDB; its official documentation currently announces service
sunsetting on August 31, 2027. Plan migration of the app and queue before then.

### Local test mode (active since 2026-10-25, evening)

At the user's request the outbound bridge was activated against the **local Mac
server** before any Netlify deploy, so it can be tested on home Wi-Fi:

- Database bridge `enabled: true` (same bridge ID/token as generated before).
- On the Pi, `/config/shoppinglist-projector.yaml` now polls
  `http://192.168.132.183:3000/api/projector/bridge` (the two Netlify URLs were
  replaced; the token was not changed or re-entered). The Netlify version is kept
  as `/config/shoppinglist-projector-netlify.yaml.bak`, and the previous
  configuration as `/config/configuration.yaml.bak-20261025`.
- `configuration.yaml` now includes the package (`homeassistant: packages:`).
  Config check returned valid; Core restarted; `sensor.shoppinglist_projector_queue`
  is `idle`, `automation.shoppinglist_projectoropdrachten` is on, and the bridge
  heartbeat in the database is fresh (Pi polls every 10 s).
- The launchd job `com.shoppinglist.local-projector` runs **without**
  `PROJECTOR_LOCAL_ORIGIN`, so `/api/projector` uses the Pi relay instead of the
  Mac-only temporary path. It runs with `PROJECTOR_ATOM_HOST=192.168.132.177`
  (screen Up/Mijn hoogte still wake the projector via the Atom) and
  `SCREEN_LOCAL_ORIGIN=http://192.168.132.183:3000`, an explicit opt-in that lets
  the BroadLink screen controls work from that exact home-network origin
  (iPad/iPhone) as well as loopback. Owner login and same-origin checks still
  apply; it is refused on hosted runtimes and for public addresses.
- `media_player.woonkamer_tv_2` is `unavailable` while the projector is off, so
  the Pi reports state `unknown`. "On" (Atom wake) does not depend on it; "Off" is
  only dispatched once that entity is available again, otherwise the command
  ends as uncertain (no retry, by design).
- The bridge token travels over plain HTTP on the home LAN in this mode. Accepted
  for local testing only.

To go back to the Mac-only temporary path: `launchctl remove
com.shoppinglist.local-projector`, then submit it again with
`/usr/bin/env PROJECTOR_LOCAL_ORIGIN=http://192.168.132.183:3000
PROJECTOR_ATOM_HOST=192.168.132.177` before the node command.
To go live after the Netlify deploy: restore the `.bak` package (Netlify URL),
validate, restart Core, and verify a fresh heartbeat. If the Mac's LAN IP changes,
local test mode stops until the package URL is updated.

The BroadLink screen controls remain paused following the reported physical
malfunction. This projector setup must not unpause or move the screen.

## BroadLink Pairing

On 2026-10-25 the user authorized adding the RM4 Pro to Home Assistant without
sending screen commands. Pairing succeeded at `192.168.132.164`, named
**BroadLink RM4 Pro**, firmware 62093, MAC `34:8E:89:B1:66:A7`. The MAC matches the
existing local configuration. HA device ID: `c8285a0106ec55906f2093b0596c328b`.
No IR/RF learning, command transmission, screen automation, or screen packet
import was performed. HA's IR emitter/RF transmitter last-command states are
Unknown, which is not a screen position or a connection failure.

Safety-state discrepancy discovered during this read-only identity check:
`.cache/broadlink/screen.json` currently has `paused: false`, unlike the older
pause notes above. This was not changed as part of pairing and must not be
silently reverted. Do not send screen commands until the user clarifies that
local state and the earlier malfunction is reviewed. Home Assistant has no
screen commands configured by this pairing.

## Panasonic Comfort Cloud Installation

The user explicitly approved installing the community integration
`sockless-coding/panasonic_cc` and its handling of Comfort Cloud credentials.
On 2026-10-25 version 2026.10.0 was copied into
`/config/custom_components/panasonic_cc` (the File editor mount is
`/homeassistant/custom_components/panasonic_cc`). No existing integration was
overwritten. Source commit: `cdf914e8b0add61d10f3035c6b93f33b33e53046`.
The GitHub archive SHA-256 was checked before extraction:
`8040c53c4d06cf0f7058cde02054821199ee56b19b0f668c7dc204aa4ce9dd25`.
The manifest requires `aio-panasonic-comfort-cloud==2026.10.1`.
Installation used the official File editor's shell-command UI; the result
reported installation success. Core restarted successfully and the integration
loaded its setup form. The Panasonic ID/password form is open in Chrome for the
user. "Automatically power on device when changing settings" was unchecked
before submission, to prevent incidental power-on; other defaults are unchanged.
The user completed login. Setup was finalized and discovered four devices:
Leefruimte, Gastenkamer (CS-Z20XKEW), Kamer Noe (CS-MZ16XKE), and Slaapkamer
(CS-Z20XKEW), totaling 64 entities. The HA entry ID is
`01M5SX2GJAPRQYTNQ6M3X060DJ`. All four climate entities were visible in the
entity registry with state Off. The Leefruimte diagnostic sensors showed
Connected / LIVE, indoor 18 C and outdoor 13 C at verification time.
No air-conditioning control, timer change, or temperature change was sent.
This confirms Home Assistant setup only; the ShoppingList app's existing
Panasonic routes have not been migrated to this integration.

## Philips Hue Pairing

On 2026-10-25 the Hue Bridge Pro (model BSB003, bridge ID `C42996FFFEC62587`,
MAC `c4:29:96:b6:25:87`) at `192.168.132.198` was added to Home Assistant
(Core 2026.10.4) through the official Philips Hue integration. The first
attempt failed with "Unexpected error" / "Unknown error connecting with Hue
bridge" after the link button was pressed.

Cause: the Bridge Pro redirects all HTTP requests to HTTPS (301). aiohue's
`create_app_key` tries HTTPS first and falls back to HTTP on *any* failure, so
an HTTPS "link button not pressed" (error 101) is hidden behind the HTTP error
"method, GET, not available for resource" (the POST becomes a GET after the
redirect), as in home-assistant/core#186038. A direct HTTPS POST to `/api`
returned a correct error 101, so the HTTPS path works; the failed attempt was
most likely a timing issue (Submit clicked more than 30 seconds after the press).

Fix: open the "Link Hub" dialog first, press the round link button once, then
click Submit within 30 seconds. The user did this and confirmed the lights are
visible in Home Assistant. No light states, scenes or bridge settings were
changed. The ShoppingList app's own Hue OAuth connection is unchanged and has
not been migrated to Home Assistant. Reserve the bridge IP in DHCP before
depending on it long term.

## Temporary Local Website

At the user's request, the website is temporarily running from the Mac on
`http://192.168.132.183:3000` (also `http://localhost:3000` on the Mac). It is an
HTTP development instance for trusted home Wi-Fi, not an internet deployment.
The Mac must stay awake. Its LAN address may change with DHCP. The normal app
account login is still required; the live unauthenticated projector request
returned `not-signed-in` and did not send a command.

The explicit process-only `PROJECTOR_LOCAL_ORIGIN` opt-in allows projector
requests from this exact LAN origin and loopback, still requiring same Origin
and the paired owner's verified account. It is always refused on hosted
runtimes. This temporary path bypasses the inactive outbound bridge.
`PROJECTOR_ATOM_HOST=192.168.132.177` sends wake directly to the existing Atom
endpoint once; off/status use the existing paired Python Android TV client.
No BroadLink pause or screen control policy was changed.

The server is managed as the user launchd job `com.shoppinglist.local-projector`.
Logs: `/tmp/shoppinglist-local-projector.log` and
`/tmp/shoppinglist-local-projector.err`. Stop it with
`launchctl remove com.shoppinglist.local-projector`. It is not installed as an
automatic login service. The launch command uses Next's development server,
the workspace directory, host `0.0.0.0`, port `3000`, and the two environment
variables above. Nothing was purchased or published to Netlify.

Startup fix: launchd originally started Next with the wrong working directory,
so Tailwind could not find its content/configuration and the dashboard displayed
only a stretched background. The job now starts
`scripts/local-projector-server.mjs`, which explicitly spawns Next with the
workspace as `cwd`. The stale generated webpack cache was moved to
`/tmp/shoppinglist-webpack-before-cwd-fix-20261025`. A browser screenshot verified
the styled dashboard, agenda, lists, and navigation after restart and reload.

Verification: 32 focused tests passed, including temporary-origin restrictions,
Atom owner checks, no retry after a timeout, and refusal on hosted runtimes.
The local projector page returned HTTP 200 and redirected to the normal login
screen. Physical testing through this temporary website awaits user login.
