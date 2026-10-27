# Stremio on the projector

`Kijk op projector` appears on title details, discovery/partner title decks and individual episode details.
It checks the Pi heartbeat and title identifier before enqueuing one authenticated cinema command. The Pi
turns off the paired Samsung TV if it is on, activates the living-room Cinema scene, checks power, wakes only if necessary and waits up to 65 seconds
for the Android TV integration before sending one Stremio deep link.
It never changes watched history or automatically selects a stream. The command receipt confirms dispatch,
not that Stremio rendered the requested screen.

The target is fixed to `media_player.woonkamer_tv_2` (Woonkamer TV, not Woonkamer Google TV), scene
`scene.woonkamer_woonkamer_cinema`, and the previously configured Atom wake action. The browser cannot
override the host, entity, application or URL scheme. Requests require same-origin authentication and the
configured owner's account. A 180-second command lifetime and atomic queue lock serialize submissions.

Samsung power is read from `media_player.samsung_q60_series_82_qe82q60ralxxn`, paired with the user's
on-screen approval on 2026-10-26 (QE82Q60RALXXN, MAC A4:30:7A:32:47:51). It is not inferred from
`Woonkamer Google TV` (Google Cast). Already off/standby sends no command; unknown/unavailable aborts
cinema startup. One `media_player.turn_off` is sent only for an on state, and off/standby must be observed
within 15 seconds before proceeding. Manual projector-only on/off commands do not control the Samsung.
Live validation on 2026-10-26: a full cinema command observed Samsung On -> Off and completed with a
`sent` receipt. The user confirmed that the Samsung screen actually switched off. Nine Pi-worker tests
cover already-off, unknown state, one-shot shutdown, and shutdown confirmation timeout as well as the
existing projector behavior.

Bridge v1.2.0 skips recalling Cinema when Hue's live scene selector
`select.woonkamer_woonkamer_scene` is `Cinema` and `light.woonkamer_woonkamer` is on. A scene entity's
last-activation timestamp is not treated as current status. If the room lights are off or the active scene
is different/unknown, Cinema is recalled once. Twelve Pi-worker tests cover these cases, including a
watch command with both Cinema and projector already on that only sends the Stremio title.

Bridge v1.3.0 gates screen opening on Hue contact `binary_sensor.gang_beneden_voordeur_opening`.
Version 1.4.0 validates the sensor and Samsung state first, then concurrently starts Samsung shutdown,
Cinema lights, projector readiness/wake and guarded screen opening. Samsung shutdown is scheduled first;
it no longer waits for screen travel. The Stremio link is sent only after all four actions succeed.
Failures do not retry any command, and all parallel actions are drained so screen STOP is not abandoned.
Both `Kijk op projector` and the standalone Cinema start button use this same Pi guard.
The fixed `cinema` queue action applies the same screen/Samsung/lights/projector checks without
launching a title. Cinema start never falls back to the old local unguarded BroadLink preset.
`on` means not closed: no motor command. Unknown, unavailable or missing contact aborts cinema startup.
Only a real `on` -> `off` transition observed since this HA startup, at most 120 seconds ago, authorizes
one UP command. Cached/restored closed states and availability recovery do not authorize opening.
Battery `sensor.gang_beneden_voordeur_battery` must be numeric and above 10 percent; unavailable,
missing, empty or low battery blocks opening. The user explicitly selected this strict policy.
The confirmation is consumed before dispatch; no UP retries. BroadLink `remote.broadlink_rm4_pro`
uses the saved UP/STOP codes and calibrated 30.55-second duration. STOP is attempted even on failure
or cancellation. Failure to leave the closed contact within five seconds aborts movement with STOP.
This is not continuous position measurement or a hardware safety interlock. Wireless battery failure
can be detected late, including within the freshness window; software cannot guarantee instantaneous
failure detection or motor stop during a Pi/power/network failure. Physical interlocks are required for
absolute guarantees. Manual screen controls remain manual, separate from this guarded watch flow.

`home-assistant/custom_components/shoppinglist_cinema` is installed on the Pi. It polls Instant's HTTPS
API directly with a dedicated non-admin identity. It can read only its bridge/commands, update heartbeat,
and atomically advance pending -> claimed -> sent/failed. It cannot create commands, change their targets,
enable the bridge, or access recipes/other app data. Other account permissions are preserved. Private
credentials and permission backups live under `.cache/projector-relay/`, not in source control.

The former Mac/Netlify-polling HA package is disabled (its configuration is backed up). No incoming ports,
Home Assistant administrator tokens or subscriptions are involved in this cinema command.
The app server queues authenticated requests; execution after enqueue is independent of the Mac. The local
website on localhost still needs its web server. Use a deployed frontend/backend to submit new requests
with the Mac shut down; Netlify publication was previously blocked by account credits.

On 2026-10-26 Home Assistant configuration validation passed, the Pi was restarted and its fresh heartbeat
was verified. A live `watch:tv:tt18923754:2:7` command completed. The user confirmed the projector, Cinema
lighting and correct Stremio episode all worked. No automatic source selection or watched-history updates.

Validation: `npx vitest run src/lib/stremio.test.ts src/lib/stremio-route.test.ts src/lib/projector-client.test.ts src/lib/projector-relay.test.ts src/lib/projector-relay-routes.test.ts`.
Pi worker tests: `.cache/projector/venv/bin/python scripts/test-cinema-bridge.py` (including no wake when on).
Physical testing changes TV/projector power and Hue lighting; it is separate from these tests and never moves the screen.

## Read-only Stremio progress sync

Stremio core's LibraryItemState includes `video_id`, `time_offset`, `duration`, `last_watched`
and watched-video information. Its authenticated datastore API can fetch library items. A separately
authorized Stremio account connection supplies last-played episode and playback progress;
the current deep link cannot. This relies on Stremio's internal sync protocol, not a guaranteed
public integration contract or instantaneous local player telemetry. Actual device/account sync must
be tested before claiming live episode detection. Keep account credentials/session keys server-side,
never put them in Instant records readable by clients, and do not call datastorePut for a read-only sync.
Do not mark a requested title as watched merely because the cinema command was sent.

`/films-series/instellingen` provides connect, reconnect, refresh and disconnect. `/api/stremio`
verifies the Instant user on every request and requires same-origin writes. Email/password are sent
only to Stremio login and never persisted; the session key is encrypted with owner-bound AES-GCM in
`stremioConnections`. The domain-separated key uses `STREMIO_SESSION_SECRET` or the existing
`GOOGLE_OAUTH_COOKIE_SECRET` (at least 32 characters). Run `node scripts/setup-stremio.mjs` before use:
it backs up and preserves existing permissions, installs deny-all client access and tests read/write denial.
Only fixed HTTPS login/datastoreGet endpoints are available; no datastorePut or global logout is used.

The app root has one authenticated provider. It refreshes on entry, return to the visible tab,
and every 30 seconds while visible. The server coalesces reads and caches snapshots for 30 seconds.
It does not require a Pi background task: opening the app fetches the account's current synced state.
`Aan het kijken` merges unfinished Stremio episodes for watchlisted series into the existing cards,
including a partially watched first episode with no manual marks. Cached public TMDB metadata maps
watchlist titles to exact IMDb IDs; titles are never joined by name. One card per series displays the
actual Stremio playback percentage and resume episode. Explicit manual marks at or ahead of that
episode take priority, preventing stale Stremio playback from moving the user backwards. Unstarted,
fully played and unknown-duration episodes are not inferred as in progress. A manual Seen action
marks the displayed resume episode, not an episode guessed from a synthetic previous position.
This applies to the films landing page, full watching list and home widgets. Series and episode
details display their imported position with a link to the last Stremio episode. No manual watched
mark, shared watchlist, or Stremio library item is changed by synchronization. Disconnect removes
only this app's stored connection. User-approved watchlist additions remain separate explicit actions.
Upstream failures retain visible data with a stale/error warning; missing title progress is explicit.
IMDb-based movies/episodes are supported; addon-specific non-IMDb identifiers are ignored safely.
Selecting an episode opens that episode, but does not promise seeking to the saved timestamp.

Validation: `npx vitest run src/lib/stremio*.test.ts src/lib/projector-client.test.ts src/lib/projector-relay.test.ts src/lib/projector-relay-routes.test.ts src/lib/film-mode.test.ts`.

Primary sources:
- https://stremio.github.io/stremio-core/src/stremio_core/types/library/library_item.rs.html
- https://stremio.github.io/stremio-core/src/stremio_core/types/api/request.rs.html
