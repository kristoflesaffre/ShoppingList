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

## Permanent connection and controls

The read-only probe succeeded for Leefruimte, Gastenkamer, Kamer Noë and Slaapkamer. The app now has a Node backend; Python is needed only for the initial interactive login/MFA on your Mac, not at runtime on Netlify.

1. Run `node scripts/setup-panasonic-storage.mjs` once. This preserves existing Instant permissions and adds a deny-all `panasonicConnections` namespace. A private backup of previous rules is in `.cache/panasonic-setup`. The script creates a random `PANASONIC_SESSION_SECRET` in ignored `.env.local` when absent. Keep this encryption key backed up privately.
2. Double-click `scripts/panasonic-koppelen.command`. Enter the email of your **family-app account**, then your Comfort Cloud email/password and any MFA code. This provisioner never controls devices. It stores only AES-256-GCM encrypted access/refresh tokens, bound to your app user ID, in Instant. No password is stored. Unlike the probe, it deliberately retains this session instead of logging it out.
3. Open `/profiel/panasonic` (Profiel → Klimaat) and choose Vernieuwen. The evening dashboard also links to Klimaat.
4. Use explicit power, temperature (16–30 °C, half-degree steps), mode and fan controls. Settings are disabled while a unit is off; changing temperature never implicitly turns it on. Unsupported modes reported by Panasonic are omitted. Failed writes are never automatically retried. Read status again if the outcome is uncertain.

### Hosting

Production needs the same `PANASONIC_SESSION_SECRET` as local, plus the existing `INSTANT_APP_ADMIN_TOKEN`. Set secrets only in the hosting dashboard/CLI, with server-function scope; never `NEXT_PUBLIC_` or Git. `PANASONIC_ALLOWED_ORIGINS` optionally adds comma-separated exact deployment origins. Current known Netlify/Vercel origins and local localhost:3011 HTTPS / localhost:3000 HTTP are allowed by default. These routes require a verified Instant bearer token and same-origin POSTs. No Python runtime or always-on Mac is needed after provisioning.

The existing Netlify credit-related production-deploy pause and Vercel usage block still prevent publishing new app code. A committed/pushed change does not mean it is live.

### Protocol and limitations

The Node protocol implementation follows aio-panasonic-comfort-cloud 2026.10.1 (see third-party license). Token refresh is persisted before device access. A per-user queue serializes requests inside a warm server instance, but there is no distributed cross-instance lock; avoid simultaneous requests from many devices while tokens rotate. Each new request reloads current tokens. Manual refresh avoids background polling/API traffic.

The app version captured during login is used for request signing. If Panasonic requires a newer official app version, repeat the local pairing after updating the pinned Python client, or set the validated server override `PANASONIC_APP_VERSION`. This is an unofficial integration; native authentication can change and session revocation/parallel Comfort Cloud logins may require pairing again. No legal agreements are accepted automatically.

Disconnect removes the encrypted session from this app for that user on all their devices. It does not revoke the native-app session at Panasonic. No session values or raw upstream error bodies are returned to the browser or written to logs.

### Verification

`npx vitest run src/lib/panasonic.test.ts src/lib/panasonic-routes.test.ts` covers encryption/ownership, field validation, same-origin/authentication checks, device ownership, no implicit power-on, supported modes, no write retries, and disconnect without token refresh. `npm run typecheck` and targeted lint check the integration. Tests use mocks and never send control commands to household devices. A real write still needs a deliberate test by the user after pairing.

The live database storage check also confirmed that both anonymous and signed-in browser clients cannot read or modify this namespace. Only a disposable synthetic record was used and removed. The production encryption key has been configured in Netlify function secrets; deployment itself remains paused.
