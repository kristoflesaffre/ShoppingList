# Home Assistant on the Raspberry Pi

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
