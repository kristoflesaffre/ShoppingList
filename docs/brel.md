# BREL Home Hub (rolluiken) on the Mac

The BREL Home Hub was discovered at `192.168.132.222` (hub MAC `ece33429034c`, firmware A1.1.3_B0.3.0) with two
roller shutters: `ece33429034c0001` and `ece33429034c0002`. It speaks the Motion Blinds LAN protocol (UDP 32100,
multicast 238.0.0.18:32101), controlled with the `motionblinds` library (0.6.31) in the ignored venv
`.cache/brel/venv`. Recreate it with `python3 -m venv .cache/brel/venv` and
`.cache/brel/venv/bin/python -m pip install -r scripts/brel-requirements.txt`.

## Setup

Double-click `scripts/brel-instellen.command`. It finds the hub, asks for the 16-character key from the BREL app
(Settings → About, tap the screen several times quickly), checks the key with a status query (operation 5, never a
movement) and asks a name per blind. Everything goes to the private, ignored `.cache/brel/blinds.json`, bound to the
same owner as the projection screen. Rerun it to rename blinds or change the key.

Reading positions needs no key; every command does. Without a key the app shows positions with disabled buttons.

## App controls

Dashboard panel tab **Rolluiken** (desktop) and the **Rolluiken** section on the mobile start page: per blind Open /
Stop / Dicht plus its position ("40% open"; the hub itself counts 0 = open, 100 = closed). Same-origin authenticated
POST `/api/brel` with the same Mac-only boundary as `/api/broadlink` (`src/lib/server/local-mac-guard.ts`: loopback or
the opted-in `SCREEN_LOCAL_ORIGIN`, never Netlify/Vercel, verified owner). The route accepts only `status`,
`open|stop|close` with a configured blind MAC, and `position` 0–100; the runner rechecks all of it.

Slats: the hub also reports `currentAngle` (0–180), worked out from the motor; there is no sensor on the slats. The app
reads 90 as horizontal (lamellen open, light passes) and 0/180 as vertical (lamellen dicht), shows a segmented
«lamellen open · dicht» under each blind on the start page and a round slat button under each capsule on the dashboard,
and sends `tilt` with `targetAngle` 90 or 0. The hub lists both blinds as roller shutters but still acts on a tilt:
live 2026-10-27, `targetAngle` 90 on «Blinden rechts» was acknowledged and the hub then reported angle 0 → 90 (position
51 → 52, the tilt turns the motor a little). The user confirmed the slats were then horizontal with light passing through, so 90 = horizontal holds.

Unlike the RF screen, every command is absolute, so the library's resend after a timeout can't toggle a blind the
wrong way. The hub reports positions, so after a command the app follows the status for 45 seconds.

The published site has no access: like the screen, a connection from outside the home network would need a relay
(for example Home Assistant's Motion Blinds integration on the Pi plus the existing command queue).

Tests use mocks only. Live check 2026-10-27: the user opened and stopped «Blinden links» from the app, as expected.
