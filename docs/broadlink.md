# BroadLink on the Mac

The RM4 Pro was discovered at 192.168.132.164, type 0x520b. Local authentication succeeded after the user disabled its lock in the BroadLink app. Discovery/authentication sent no IR/RF control commands.

The existing BroadLink mobile app backup did not offer an export file. No automatic import from the modern app has been confirmed. The user agreed to capture the three screen buttons separately, preserving their existing BroadLink setup.

## Capture

The isolated environment is installed under ignored `.cache/broadlink/venv`. Recreate it with `python3 -m venv .cache/broadlink/venv` and `.cache/broadlink/venv/bin/python -m pip install -r scripts/broadlink-requirements.txt`.

Double-click `scripts/broadlink-scherm-leren.command`. Choose RF or IR according to the original remote (RF is the initial trial if unknown). RF capture first finds the frequency using a held button, then captures a short press. Each step waits for Enter before it starts. The original remote may move the screen; the program itself never calls `send_data` or sends a control code. RF learning is cancelled on completion or failure. Each successfully captured button is written atomically with private permissions to ignored `.cache/broadlink/screen.json`; rerunning skips saved buttons. No captured code or authentication key goes into Git.

Reference: https://github.com/mjg59/python-broadlink (0.19.0). In this version `check_frequency()` returns a tuple; check its first element, not tuple truthiness.

## Pending

After capture, implement and test the authenticated Mac bridge and app buttons. The app is not yet connected to these commands. The Mac must remain awake and on the home network for a local bridge. Netlify cannot directly access the RM4 Pro's private LAN address. A deployed-site connection needs a secured outbound relay or equivalent architecture, not an unauthenticated public port.
