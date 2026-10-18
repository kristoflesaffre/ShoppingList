# Panasonic Comfort Cloud — local feasibility probe

This is a **read-only, interactive local connection test**, not an installed dashboard integration. It does not require Home Assistant. Actual compatibility with this user's account/devices remains unverified until the probe is run with a successful login.

## Local test

From the ShoppingList project directory, in an interactive terminal:

```sh
.cache/panasonic-probe/venv/bin/python scripts/probe-panasonic.py
```

The isolated environment has been prepared on this machine. To recreate it:

```sh
python3 -m venv .cache/panasonic-probe/venv
.cache/panasonic-probe/venv/bin/python -m pip install -r scripts/panasonic-probe-requirements.txt
```

### Certificate troubleshooting

The first real attempt exposed a local Python CA configuration issue: even public HTTPS requests to Panasonic failed with `ClientConnectorCertificateError`, before account authentication could be evaluated. The probe now uses the explicit `certifi` CA bundle, with certificate and hostname validation enabled. No `ssl=False` workaround is used.

Check connectivity without providing any credentials:

```sh
.cache/panasonic-probe/venv/bin/python scripts/probe-panasonic.py --check-connection
```

An HTTP 403 for the bare device API root is expected here; it confirms a verified HTTPS connection, not an authenticated device request. TLS/network failures now have distinct messages instead of suggesting a wrong password. Actual account login remains a separate interactive test.

Enter the Panasonic email, then the password at the hidden prompt. If needed, enter the verification code at the hidden prompt. Do not provide passwords or OTP codes in chat, command-line arguments, or screenshots. If the account actually uses Google/Apple sign-in, stop here: the current probe is for Panasonic email/password login.

The probe signs in, lists ordinary air conditioners, reads their state, and signs its own session out. It never changes temperature, power, mode, schedules, or legal agreements. A request guard blocks device-cloud writes except login/logout. `auto_power_on=False` is also set. Dependency logging is disabled, and raw exception details are not printed because they could contain tokens or login HTML.

Session material is saved only inside a private temporary directory, which is removed after the normal probe exits. The password is never written to a file. The ignored `outputs/panasonic-probe/report.json` contains only device names and status. An abruptly killed process or machine crash may leave its private temporary directory until the operating system cleans it up. The Comfort Cloud app may require signing in again if Panasonic invalidates parallel sessions; use a separate shared Panasonic account for a permanent integration if necessary.

## Findings and implementation path

Sources checked on 18 October 2026:

- Maintained Python client, including MFA and browser-login support: https://github.com/sockless-coding/aio-panasonic-comfort-cloud
- Pinned package release used by this probe: https://pypi.org/project/aio-panasonic-comfort-cloud/2026.10.1/
- Maintained Home Assistant component uses this client, but Home Assistant itself is not required by the library: https://github.com/sockless-coding/panasonic_cc
- Older JavaScript library is archived and is not a suitable new dependency: https://github.com/bisand/panasonic-comfort-cloud-api

The client exposes devices, target/current temperatures, power, mode and fan speed. Device-specific capabilities need checking against a real unit before building controls. Panasonic's official app API and native OAuth client are used unofficially; this is not a separately registered third-party OAuth app like Hue/Todoist. Authentication, MFA and app-version requirements can change.

The current library is Python; this app's backend is Next.js/Node. A production integration would need either a small authenticated Python backend or a carefully tested Node implementation of the current protocol. Do not spawn this local Python environment from production Netlify functions and assume it will exist there.

After a successful probe, build authenticated per-user backend routes for status/devices and explicitly validated control commands. Store tokens encrypted, retain MFA, scope device IDs to the connected user's account, and expose only capabilities supported by each unit. Leave actual control commands unimplemented until device compatibility has been confirmed. No production environment settings, account registration, or deployment have been made by this investigation.
