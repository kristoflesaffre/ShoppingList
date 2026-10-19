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
