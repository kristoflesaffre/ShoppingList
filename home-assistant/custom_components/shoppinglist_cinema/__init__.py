"""Scoped outbound cinema queue; no app server or Mac is involved in execution."""
import asyncio
import base64
import binascii
import hashlib
import io
import logging
import re
import time

from homeassistant.const import EVENT_HOMEASSISTANT_STOP
from homeassistant.core import callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.event import async_track_state_change_event
from homeassistant.util import dt as dt_util
from .screen import CONTACT, ScreenGuard
from .companion import Telemetry, parse_media_session, parse_probe_metadata
from .control_dex import DEX_BASE64, DEX_SHA256
from .sfeer_apk import APK_BASE64, APK_PACKAGE, APK_SHA256, APK_VERSION
from .ambience_pool import POOL as AMBIENCE_POOL
from .ambience import (
    VIDEO_ID, tv_macs, color_distance, frame_color, pick_video, SettingsStore, app_extra, lounge_send, parse_settings, remote_entity, restart_youtube, send_wol, youtube_running,
)

_LOGGER = logging.getLogger(__name__)
DOMAIN = 'shoppinglist_cinema'
APP_ID = 'c63df57f-510a-46bc-8687-912d030c9359'
PLAYER = 'media_player.woonkamer_tv_2'
SAMSUNG_TV = 'media_player.samsung_q60_series_82_qe82q60ralxxn'
# The TV's own REST API reports its real power state ('on' / 'standby'). Home Assistant's Samsung entity marks
# the TV «off» as soon as a turn_off is sent, even when the TV missed it, so that state alone is not proof.
SAMSUNG_HOST = '192.168.132.111'
SAMSUNG_OFF_ATTEMPTS = 3
CINEMA_SELECTOR = 'select.woonkamer_woonkamer_scene'
CINEMA_LIGHTS = 'light.woonkamer_woonkamer'
AWAKE = {'on', 'playing', 'paused', 'idle', 'buffering'}
WAKE_COOLDOWN = 120
CLOSED_BRIGHTNESS = 20
# ADB connection to the same projector: Android TV Remote cannot see playback, the media session can.
ADB_PLAYER = 'media_player.android_tv_192_168_132_133'
# X-Ray «1 · 2 · 5 min terug»: a one-shot helper (scripts/android/CinemaControl.java) that only seeks Stremio back.
CONTROL_DEX = '/data/local/tmp/shoppinglist-cinema-control-v2.dex'
SEEK_BACK = {'seek-back:60': 60000, 'seek-back:120': 120000, 'seek-back:300': 300000}
STREMIO = 'com.stremio.one'
PLAYBACK_POLL = 2
BRIDGE_VERSION = '1.35.5'
# «Sfeer op tv» + «Ook rond de tv» without the Mac (ambience.py): the Pi drives the Samsung's YouTube and opens the
# projector app «ShoppingList Sfeer», which shows its built-in page and follows the TV's YouTube itself.
AMBIENCE_ACTIONS = ('ambience-show', 'ambience-hide', 'tv-pause', 'tv-resume')
# The projector app is copied here over ADB before `pm install` (hash checked), then removed.
SFEER_APK = '/data/local/tmp/shoppinglist-sfeer.apk'
# Lights while «Ook rond de tv» shows: the other living-room lights at 10 %, the LED strip in the colour of the
# picture around the TV (a projector screenshot every few seconds, smooth Hue transition).
AMBIENCE_LED = 'light.woonkamer_led_woonkamer_nieuw'
AMBIENCE_DIM_PCT = 10
AMBIENCE_LIGHT_EVERY = 6
AMBIENCE_LED_TRANSITION = 3
# The colour spots above the TV («Zij 1-6»): they take the main colour of the top half of the picture, at a fixed low
# brightness (20 %, as they were set by hand), instead of being dimmed with the other lights.
AMBIENCE_SIDE = tuple(f'light.hue_color_spot_1{suffix}' for suffix in ('', '_2', '_3', '_4', '_5', '_6'))
AMBIENCE_SIDE_PCT = 20
# Long press while the ambience shows: everything off and the living room to this ordinary bright Hue scene.
BRIGHT_SCENE = 'scene.woonkamer_woonkamer_energie'
# How the living room was before «Ook rond de tv» took over, restored when it ends (not when a film takes over).
AMBIENCE_BEFORE_SCENE = 'shoppinglist_ambience_before'
# SONOFF SNZB-01P (ZHA): single press = cinema (automation), long press («off») = a random seasonal ambience video on
# the TV with the projector around it and the dimmed lights, whatever the «Ook rond de tv» switch says.
BUTTON_IEEE = '8c:73:da:ff:fe:ef:e8:89'
BUTTON_LONG = 'off'
# A short press cancels a running long-press start; wait at most this long for it to let go of the lock.
AMBIENCE_CANCEL_WAIT = 10


def ambience_command(action):
    """`ambience-set:<base64url>` or `tv-play:<video id>`, else None."""
    if action.startswith('ambience-set:'):
        settings = parse_settings(action[len('ambience-set:'):])
        return ('set', settings) if settings else None
    if action.startswith('tv-play:') and VIDEO_ID.match(action[len('tv-play:'):]):
        return ('play', action[len('tv-play:'):])
    return None
# Android TV (ADB) config entry of the projector: reloaded when ADB keeps failing (at most every ADB_RELOAD_EVERY s).
ADB_ENTRY = '01M64FE12GJ4ED6MR8PMCTGN46'
ADB_FAILS_BEFORE_RELOAD = 3
ADB_RELOAD_EVERY = 300
# Bridge status for the app (cinemaCompanionData «bridge-status»): on every change, otherwise every STATUS_EVERY s.
STATUS_EVERY = 60
# X-Ray «Nu in beeld»: one screenshot of the projector on request, as a small JPEG in cinemaCompanionData
# «{owner}:xray-frame» (expires by itself). Never stored on the Pi or the projector.
FRAME_WIDTH = 960
FRAME_QUALITY = 72
FRAME_TTL_MS = 10 * 60_000
FRAME_COMMAND = "screencap -p | base64 | tr -d '\\n'"


def encode_frame(png_base64):
    """PNG from `screencap` (base64) -> (width, height, JPEG base64, mean brightness 0-255). Runs in the executor."""
    from PIL import Image, ImageStat
    try:
        raw = base64.b64decode(png_base64, validate=True)
    except (binascii.Error, ValueError) as failure:
        raise RuntimeError('frame-unreadable') from failure
    if len(raw) < 1000:
        raise RuntimeError('frame-empty')
    image = Image.open(io.BytesIO(raw)).convert('RGB')
    image.thumbnail((FRAME_WIDTH, FRAME_WIDTH))
    brightness = sum(ImageStat.Stat(image.convert('L')).mean)
    out = io.BytesIO()
    image.save(out, 'JPEG', quality=FRAME_QUALITY, optimize=True)
    return image.width, image.height, base64.b64encode(out.getvalue()).decode(), round(brightness, 1)


def companion_id(key):
    # Same record id as companionId() in the app (src/lib/server/cinema-companion.ts).
    h = hashlib.sha256(key.encode()).hexdigest()
    return f'{h[0:8]}-{h[8:12]}-4{h[13:16]}-a{h[17:20]}-{h[20:32]}'


# Bridge heartbeat in the database (projectorBridges.lastSeenAt); the app treats the bridge as online for 60 s.
HEARTBEAT_EVERY = 20
# BREL blinds via Motion Blinds (HA position: 0 = closed, 100 = open). Before 19:00 the right one stays half open
# so the cat can use the door.
BLIND_LEFT = 'cover.rollershutter_0002'
BLIND_RIGHT = 'cover.rollershutter_0001'
EVENING_HOUR = 19
CAT_DOOR_POSITION = 50
# The BREL hub and the BroadLink screen share the 433 MHz band: a blind moving while the screen gets its timed STOP
# drowned that STOP out (screen kept going up). Blinds only start once the screen has stopped, plus a short gap.
RF_GAP = 1.5


def blind_targets(hour):
    return {BLIND_LEFT: 0, BLIND_RIGHT: 0 if hour >= EVENING_HOUR else CAT_DOOR_POSITION}


def stremio_playback(dumpsys):
    # `dumpsys media_session`: each session starts with package=…; its state=PlaybackState {state=PAUSED(2), …}
    # follows a few lines later. Read the first Stremio session's own block only.
    for block in (dumpsys or '').split('package=')[1:]:
        if block.startswith(STREMIO):
            match = re.search(r'state=PlaybackState \{state=([A-Z_]+)', block)
            if match:
                return match.group(1)
    return None


def playback_lights(previous, current):
    # Playback starting (from pause, stop, a new title or Stremio's first reading) always brings Cinema, whatever
    # the lights were. Recovering from buffering mid-play is not a start, so lights changed by hand stay put.
    if previous == 'PLAYING' and current == 'PAUSED':
        return 'dim'
    if current == 'PLAYING' and previous not in ('PLAYING', 'BUFFERING'):
        return 'cinema'
    return None


def screen_change(old, new):
    # Only a live closed <-> open change counts: availability recovery or a restored state is not the screen moving.
    if not old or not new or getattr(new, 'attributes', {}).get('restored'):
        return None
    if old.state == 'off' and new.state == 'on':
        return 'opened'
    if old.state == 'on' and new.state == 'off':
        return 'closed'
    return None


async def ensure_cinema_lights(hass, scene):
    selected = hass.states.get(CINEMA_SELECTOR)
    lights = hass.states.get(CINEMA_LIGHTS)
    # Scene timestamps only indicate a previous recall. Use Hue's current scene tracker instead.
    if selected and selected.state == 'Cinema' and lights and lights.state == 'on':
        return
    await hass.services.async_call('scene', 'turn_on', {'entity_id': scene}, blocking=True)


async def samsung_power(hass):
    """'on', 'standby' (or another reported state), or None when the TV does not answer."""
    try:
        session = async_get_clientsession(hass)
        response = await asyncio.wait_for(session.get(f'http://{SAMSUNG_HOST}:8001/api/v2/'), 3)
        async with response:
            data = await response.json(content_type=None)
        power = ((data or {}).get('device') or {}).get('PowerState')
        return power if isinstance(power, str) else None
    except Exception:
        return None


async def turn_off_samsung(hass):
    # Ask the TV itself first: Home Assistant may still say «off» from an earlier, missed turn_off.
    power = await samsung_power(hass)
    state = hass.states.get(SAMSUNG_TV)
    if power is None:
        if state and state.state in {'off', 'standby'}:
            return
        if not state or state.state not in AWAKE:
            raise RuntimeError('samsung-state-unknown')
    elif power != 'on':
        return
    for attempt in range(SAMSUNG_OFF_ATTEMPTS):
        # Use the paired Samsung TV, not the Cast player's playback state. Only resent while the TV itself
        # still reports «on», so a repeated power key can never switch it back on.
        await hass.services.async_call('media_player', 'turn_off', {'entity_id': SAMSUNG_TV}, blocking=True)
        deadline = time.monotonic() + 8
        while True:
            power = await samsung_power(hass)
            if power is not None and power != 'on':
                return
            if power is None:
                state = hass.states.get(SAMSUNG_TV)
                if state and state.state in {'off', 'standby'}:
                    return
            if time.monotonic() >= deadline:
                break
            await asyncio.sleep(1)
        if power is None:
            break
        _LOGGER.warning('Samsung still on after turn_off (attempt %s): sending it again', attempt + 1)
    raise RuntimeError('samsung-off-not-confirmed')


async def set_blinds_for_screen(hass):
    # Best effort: a blind already at its target gets no command, and a failing blind never stops the cinema.
    for entity, target in blind_targets(dt_util.now().hour).items():
        state = hass.states.get(entity)
        position = getattr(state, 'attributes', {}).get('current_position')
        if position is None or position == target:
            continue
        try:
            await hass.services.async_call('cover', 'set_cover_position', {'entity_id': entity, 'position': target}, blocking=True)
        except Exception:
            _LOGGER.warning('Blind %s could not be positioned after the screen opened', entity)


async def pause(seconds):
    # A plain timer, separate from the worker loop's polling sleep.
    loop = asyncio.get_running_loop()
    done = loop.create_future()
    handle = loop.call_later(seconds, lambda: done.done() or done.set_result(None))
    try:
        await done
    finally:
        handle.cancel()


async def blinds_after(screen_task, blinds):
    # Wait for the screen's STOP (also when opening failed), then move the blinds on a quiet radio band.
    try:
        await asyncio.wait({screen_task})
        await pause(RF_GAP)
    except BaseException:
        blinds.close()
        raise
    await blinds


async def start_cinema(hass, screen, scene, ensure_on, blinds=None):
    # Validate before any side effect; each parallel motor action rechecks its own guard.
    try:
        screen.check()
        samsung = hass.states.get(SAMSUNG_TV)
        if not samsung or samsung.state not in AWAKE | {'off', 'standby'}:
            raise RuntimeError('samsung-state-unknown')
    except BaseException:
        if blinds:
            blinds.close()
        raise
    screen_task = asyncio.create_task(screen.open_if_closed())
    tasks = [screen_task, *(asyncio.create_task(action) for action in (
        turn_off_samsung(hass),
        ensure_cinema_lights(hass, scene),
        ensure_on(),
        *([blinds_after(screen_task, blinds)] if blinds else []),
    ))]
    try:
        # Drain all actions even on failure: never abandon a moving screen before its STOP.
        results = await asyncio.gather(*tasks, return_exceptions=True)
    except asyncio.CancelledError:
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        raise
    for result in results:
        if isinstance(result, BaseException):
            raise result


async def stop_cinema(hass, screen, projector_off):
    # «Film stoppen»: screen down, projector off and the living room to 20 %, side by side. Each step runs to the
    # end (a moving screen is never abandoned); the first failure is reported afterwards.
    async def lights():
        await hass.services.async_call('light', 'turn_on', {'entity_id': CINEMA_LIGHTS, 'brightness_pct': CLOSED_BRIGHTNESS}, blocking=True)
    results = await asyncio.gather(screen.close_if_open(), projector_off(), lights(), return_exceptions=True)
    for result in results:
        if isinstance(result, BaseException):
            raise result


def screen_lets_ambience_run(contact, moving):
    # The ambience lights belong to a closed, still screen. While the screen moves its STOP is timed, so nothing heavy
    # may run (a projector screenshot is megabytes over ADB and into Home Assistant's state); an open screen is the
    # cinema. 22/11 18:13: the projector was briefly unreachable at the press, so the ambience app stayed in front, and
    # the light loop picked it up again during the screen run (screenshots every 6 s right up to the STOP).
    return not moving and not (contact is not None and contact.state == 'on')


def ambience_ended(state):
    """The projector really left the ambience: off, gone, or another app in front. «unavailable» / «unknown» is the ADB
    connection hiccuping (it reloads several times an evening) and does not end the ambience."""
    if state is None or state.state == 'off':
        return True
    return state.state in AWAKE and state.attributes.get('app_id') not in (None, APK_PACKAGE)


def target_link(action):
    match = re.fullmatch(r'watch:(movie|tv):(tt\d{7,10})(?::(\d{1,3}):(\d{1,4}))?', action)
    if not match:
        return None
    kind, imdb, season, episode = match.groups()
    if season is not None and (kind != 'tv' or int(episode) < 1):
        return None
    video = imdb if kind == 'movie' else f'{imdb}:{int(season)}:{int(episode)}' if season is not None else ''
    return f'stremio:///detail/{"series" if kind == "tv" else "movie"}/{imdb}/{video}?autoPlay=false'


async def async_setup(hass, config):
    settings = config.get(DOMAIN)
    if not settings:
        return True
    session = async_get_clientsession(hass)
    headers = {'App-Id': APP_ID, 'As-Token': settings['token']}
    bridge = settings['bridge_id']
    # The DOWN code came later than the rest of the screen config, as its own key in shoppinglist-cinema.yaml.
    screen = ScreenGuard(hass, {**settings.get('screen', {}), **({'down': settings['screen_down']} if settings.get('screen_down') else {})})

    async def database(endpoint, body):
        async with session.post(f'https://api.instantdb.com/admin/{endpoint}', headers=headers, json=body, timeout=12) as response:
            if response.status != 200:
                raise RuntimeError('queue-request-failed')
            return await response.json()

    async def update(namespace, record, fields):
        return await database('transact', {'steps': [['update', namespace, record, fields]]})

    busy = asyncio.Lock()
    last_wake = [float('-inf')]

    def power_state():
        state = hass.states.get(PLAYER)
        return state.state if state else 'unknown'

    async def ensure_on():
        # A reachable Android TV endpoint can mean booting: never send a second wake.
        if power_state() not in AWAKE:
            reachable = False
            try:
                _, writer = await asyncio.wait_for(asyncio.open_connection(settings['projector_host'], 6466), 2)
                writer.close()
                await writer.wait_closed()
                reachable = True
            except (OSError, asyncio.TimeoutError):
                pass
            if not reachable:
                last_wake[0] = time.monotonic()
                result = await hass.services.async_call('rest_command', 'xgimi_wake_atom', {}, blocking=True, return_response=True)
                if not result or result.get('status') != 200:
                    raise RuntimeError('wake-not-confirmed')
        deadline = time.monotonic() + 65
        while power_state() not in AWAKE:
            if time.monotonic() >= deadline:
                raise RuntimeError('projector-not-ready')
            await asyncio.sleep(2)

    async def adb(command):
        response = await hass.services.async_call('androidtv', 'adb_command', {'entity_id': ADB_PLAYER, 'command': command},
                                                  blocking=True, return_response=True)
        return str(((response or {}).get(ADB_PLAYER) or {}).get('adb_response') or '')

    async def control(args, error):
        # Install the helper once (or after a projector reset); verify its hash before every use.
        check = f"sha256sum {CONTROL_DEX} 2>/dev/null | cut -c1-64"
        if (await adb(check)).strip() != DEX_SHA256:
            await adb(f"echo {DEX_BASE64} | base64 -d > {CONTROL_DEX} && chmod 644 {CONTROL_DEX}")
            if (await adb(check)).strip() != DEX_SHA256:
                raise RuntimeError('control-helper-install-failed')
        output = await adb(f"CLASSPATH={CONTROL_DEX} app_process /system/bin CinemaControl {args}")
        if '"ok":true' not in output:
            raise RuntimeError(error)

    async def seek_back(delta_ms):
        await control(f"seek-back {int(delta_ms)}", 'seek-failed')

    async def capture_frame():
        # X-Ray «Nu in beeld»: what the projector shows now, for face recognition on the tablet or the AI button.
        owner = settings.get('owner_id')
        if not owner:
            raise RuntimeError('frame-owner-missing')
        if screen.moving:
            # A screenshot is megabytes over ADB: never while the screen's STOP is timed.
            raise RuntimeError('screen-moving')
        width, height, jpeg, brightness = await hass.async_add_executor_job(encode_frame, await adb(FRAME_COMMAND))
        now = int(time.time() * 1000)
        record = f'{owner}:xray-frame'
        await update('cinemaCompanionData', companion_id(record), {'ownerId': owner, 'key': record, 'expiresAt': now + FRAME_TTL_MS,
                                                                 'payload': {'at': now, 'width': width, 'height': height, 'brightness': brightness, 'jpeg': jpeg, 'version': BRIDGE_VERSION}})

    async def adb_ready():
        # Just after waking, the projector boots and Home Assistant's Android TV (ADB) entity comes and goes (it may even
        # be reloaded). Wait until a real ADB call answers (max 90 s, every 2 s) instead of trying once and waiting 15 s.
        deadline = time.monotonic() + 90
        while True:
            state = hass.states.get(ADB_PLAYER)
            if state and state.state not in ('unavailable', 'unknown'):
                try:
                    if 'adb-ready' in await adb('echo adb-ready'):
                        return
                except Exception:
                    pass
            if time.monotonic() >= deadline:
                raise RuntimeError('adb-not-ready')
            await asyncio.sleep(2)

    async def adb_retry(command, attempts=4):
        for attempt in range(attempts):
            try:
                return await adb(command)
            except Exception:
                if attempt == attempts - 1:
                    raise RuntimeError('adb-failed')
                await asyncio.sleep(3)

    async def ensure_sfeer():
        dump = await adb_retry(f"dumpsys package {APK_PACKAGE} | grep -o 'versionCode=[0-9]*' | head -1")
        found = re.search(r'versionCode=(\d+)', dump)
        if found and int(found.group(1)) >= APK_VERSION:
            return
        check = f"sha256sum {SFEER_APK} 2>/dev/null | cut -c1-64"
        await adb_retry(f"echo {APK_BASE64} | base64 -d > {SFEER_APK}")
        if (await adb_retry(check)).strip() != APK_SHA256:
            raise RuntimeError('sfeer-copy-failed')
        result = await adb_retry(f"pm install -r {SFEER_APK}; rm -f {SFEER_APK}")
        if 'Success' not in result:
            _LOGGER.warning('ShoppingList Sfeer install: %s', result.strip()[:200])
            raise RuntimeError('sfeer-install-failed')

    config_dir = getattr(hass, 'config', None)
    ambience_store = SettingsStore(config_dir.path('shoppinglist-ambience.json') if config_dir else None)
    if config_dir:
        await hass.async_add_executor_job(ambience_store.load)

    def ambience_settings():
        return ambience_store.value or {'enabled': False, 'calibrating': False, 'mask': None}

    async def start_sfeer():
        await adb_ready()
        await ensure_sfeer()
        current = ambience_settings()
        extra = app_extra({**current, 'enabled': bool(current.get('enabled') or forced_ambience[0])})
        output = await adb_retry(f"am start -n {APK_PACKAGE}/.MainActivity --es tv {SAMSUNG_HOST} --es settings {extra}")
        if 'Error' in output:
            _LOGGER.warning('ShoppingList Sfeer start: %s', output.strip()[:200])
            raise RuntimeError('sfeer-start-failed')

    light_task = [None]
    # Long button press: ambience around the TV now, even with the switch off (until it is hidden again).
    forced_ambience = [False]

    def ambience_in_front():
        state = hass.states.get(PLAYER)
        current = ambience_settings()
        return (power_state() in AWAKE and state is not None and state.attributes.get('app_id') == APK_PACKAGE
                and (current.get('enabled') or forced_ambience[0]) and not current.get('calibrating')
                and screen_lets_ambience_run(hass.states.get(CONTACT), screen.moving))

    lights_saved = [False]

    async def restore_lights():
        # Back to how the living room was before «Ook rond de tv» (a snapshot scene made just before dimming).
        if not lights_saved[0]:
            return
        lights_saved[0] = False
        await hass.services.async_call('scene', 'turn_on', {'entity_id': f'scene.{AMBIENCE_BEFORE_SCENE}', 'transition': 2}, blocking=True)

    async def ambience_lights():
        # Other living-room lights to 10 % once; then the LED strip follows the picture until the app leaves.
        if not ambience_in_front():
            return
        group = hass.states.get(CINEMA_LIGHTS)
        members = list((group.attributes.get('entity_id') if group else None) or [])
        side = [e for e in AMBIENCE_SIDE if hass.states.get(e) is not None]
        others = [e for e in members if e != AMBIENCE_LED and e not in side]
        if not lights_saved[0] and members:
            await hass.services.async_call('scene', 'create', {'scene_id': AMBIENCE_BEFORE_SCENE, 'snapshot_entities': list(dict.fromkeys([*members, AMBIENCE_LED, *side]))}, blocking=True)
            lights_saved[0] = True
        if others:
            await hass.services.async_call('light', 'turn_on', {'entity_id': others, 'brightness_pct': AMBIENCE_DIM_PCT, 'transition': 2}, blocking=True)
        last = None
        last_top = None
        misses = 0
        while ambience_in_front():
            try:
                png = await adb(FRAME_COMMAND)
                found = await hass.async_add_executor_job(frame_color, png)
                found_top = await hass.async_add_executor_job(frame_color, png, True) if side else None
                misses = 0
            except Exception:
                found = found_top = None
                misses += 1
                if misses >= 5:
                    break
            if found_top:
                color_top = found_top[0]
                if last_top is None or color_distance(color_top, last_top) > 18:
                    await hass.services.async_call('light', 'turn_on', {
                        'entity_id': side, 'rgb_color': list(color_top), 'brightness_pct': AMBIENCE_SIDE_PCT,
                        'transition': AMBIENCE_LED_TRANSITION,
                    }, blocking=True)
                    last_top = color_top
            if found:
                color, level = found
                if last is None or color_distance(color, last) > 18:
                    await hass.services.async_call('light', 'turn_on', {
                        'entity_id': AMBIENCE_LED, 'rgb_color': list(color),
                        'brightness_pct': max(25, min(100, round(25 + level * 90))), 'transition': AMBIENCE_LED_TRANSITION,
                    }, blocking=True)
                    last = color
            await asyncio.sleep(AMBIENCE_LIGHT_EVERY)

    def ensure_ambience_lights():
        if light_task[0] and not light_task[0].done():
            return
        async def run():
            # Give the app a moment to start the video before the first screenshot.
            await asyncio.sleep(8)
            try:
                await ambience_lights()
                # Ended by itself (switched off, projector off, other app): put the room back, unless a film took over
                # (the cinema scene owns the lights then) or the app is just restarting.
                await asyncio.sleep(3)
                if not screen_lets_ambience_run(hass.states.get(CONTACT), screen.moving):
                    # The cinema took over (screen moving or open): its lights stay, nothing is restored.
                    forced_ambience[0] = False
                    lights_saved[0] = False
                    return
                state = hass.states.get(PLAYER)
                if ambience_ended(hass.states.get(PLAYER)):
                    # The ambience ended (projector off or another app): the next long press starts a new one. A
                    # projector that is only «unavailable» for a moment keeps it: a long press then still ends it.
                    forced_ambience[0] = False
                if not ambience_in_front() and not (state and state.attributes.get('app_id') == STREMIO):
                    await restore_lights()
            except Exception as failure:
                _LOGGER.warning('Ambience lights stopped: %s', failure if isinstance(failure, RuntimeError) else repr(failure)[:200])
        light_task[0] = hass.async_create_background_task(run(), 'ShoppingList ambience lights')

    async def show_ambience():
        contact = hass.states.get(CONTACT)
        # Projection screen down: the picture would land on the screen, not on the wall around the TV.
        if contact and contact.state == 'on':
            raise RuntimeError('screen-open')
        await ensure_on()
        await start_sfeer()
        ensure_ambience_lights()

    async def push_ambience():
        # New settings while the app is in front: hand them over without waking anything.
        state = hass.states.get(PLAYER)
        if power_state() in AWAKE and state and state.attributes.get('app_id') == APK_PACKAGE:
            await start_sfeer()
            ensure_ambience_lights()

    def sfeer_app_in_front():
        state = hass.states.get(PLAYER)
        return power_state() in AWAKE and state is not None and state.attributes.get('app_id') == APK_PACKAGE

    def ambience_active():
        # The long-press ambience (until it is ended) or the ambience app in front on the projector, also when Home
        # Assistant restarted meanwhile (the forced flag is gone then) or the switch is off.
        return forced_ambience[0] or (sfeer_app_in_front() and not ambience_settings().get('calibrating'))

    def resume_ambience_lights():
        # After a restart, or after the loop stopped on an ADB hiccup, the ambience may still be showing: pick the light
        # loop up again (it runs as long as the app stays in front).
        if light_task[0] and not light_task[0].done():
            return
        if not sfeer_app_in_front() or ambience_settings().get('calibrating'):
            return
        # Never during a cinema action or a screen run, and never with the screen open (the cinema).
        if busy.locked() or not screen_lets_ambience_run(hass.states.get(CONTACT), screen.moving):
            return
        _LOGGER.warning('Ambience app already in front: lights follow the picture again')
        forced_ambience[0] = True
        ensure_ambience_lights()

    def drop_ambience():
        # A film or «everything off» takes over: no forced ambience, no light loop, no restore of the room afterwards.
        forced_ambience[0] = False
        lights_saved[0] = False
        if light_task[0] and not light_task[0].done():
            light_task[0].cancel()

    async def leave_sfeer_app():
        # Best effort: the projector shows its home screen again instead of the ambience page.
        try:
            if power_state() in AWAKE:
                await adb(f'am force-stop {APK_PACKAGE}')
        except Exception as failure:
            _LOGGER.warning('Leaving the ambience app failed: %s', failure if isinstance(failure, RuntimeError) else repr(failure)[:200])

    async def ambience_all_off():
        # Long press while the ambience shows: projector off, Samsung off, living room to the bright scene.
        drop_ambience()
        async def projector_off():
            if power_state() in AWAKE:
                await hass.services.async_call('media_player', 'turn_off', {'entity_id': PLAYER}, blocking=True)
        async def lights():
            await hass.services.async_call('scene', 'turn_on', {'entity_id': BRIGHT_SCENE, 'transition': 2}, blocking=True)
        results = await asyncio.gather(projector_off(), turn_off_samsung(hass), lights(), return_exceptions=True)
        for result in results:
            if isinstance(result, BaseException):
                raise result

    async def hide_ambience():
        forced_ambience[0] = False
        # Never switch the projector off under a film: only when it shows the ambience page (or nothing at all).
        state = hass.states.get(PLAYER)
        app = (state.attributes.get('app_id') if state else None) or ''
        if app == STREMIO:
            return
        if power_state() in AWAKE:
            await hass.services.async_call('media_player', 'turn_off', {'entity_id': PLAYER}, blocking=True)
        try:
            await restore_lights()
        except Exception as failure:
            _LOGGER.warning('Restoring the living room after ambience failed: %s', repr(failure)[:200])

    async def tv_play(video_id, projector=False):
        session = async_get_clientsession(hass)
        was_on = await samsung_power(hass) == 'on'
        if not was_on:
            macs = tv_macs(settings.get('tv_mac'))
            for attempt in range(25):
                if attempt % 3 == 0:
                    for mac in macs:
                        await hass.async_add_executor_job(send_wol, SAMSUNG_HOST, mac)
                await asyncio.sleep(1)
                if await samsung_power(hass) == 'on':
                    break
            else:
                raise RuntimeError('tv-not-waking')
            await asyncio.sleep(3)  # Tizen answers before its app framework is ready.
        await restart_youtube(session, SAMSUNG_HOST)
        await asyncio.sleep(7)  # Until «Wie kijkt er?» is on screen.
        remote = remote_entity(hass, SAMSUNG_TV)
        if not remote:
            raise RuntimeError('tv-remote-missing')
        await hass.services.async_call('remote', 'send_command', {
            'entity_id': remote, 'command': ['KEY_LEFT', 'KEY_LEFT', 'KEY_LEFT', 'KEY_LEFT', 'KEY_ENTER'], 'delay_secs': 0.4,
        }, blocking=True)  # Chloé = first (leftmost) profile.
        await asyncio.sleep(4)
        await lounge_send(session, SAMSUNG_HOST, {'_sc': 'setPlaylist', 'videoId': video_id, 'currentTime': '0', 'currentIndex': '0', 'listId': '',
                                                   'videoIds': video_id, 'audioOnly': 'false', 'params': '', 'playerParams': ''})
        if projector or ambience_settings().get('enabled'):
            # The TV plays; the projector around it is a bonus and never fails the command. Just after waking, ADB
            # may still be reloading: one more try 15 s later.
            for attempt in range(2):
                try:
                    await show_ambience()
                    break
                except Exception as failure:
                    _LOGGER.warning('Ambience projector after TV play failed (attempt %s): %s', attempt + 1, failure if isinstance(failure, RuntimeError) else repr(failure)[:200])
                    await asyncio.sleep(5)

    async def tv_playback(action):
        if await samsung_power(hass) != 'on':
            raise RuntimeError('tv-off')
        await lounge_send(async_get_clientsession(hass), SAMSUNG_HOST, {'_sc': 'pause' if action == 'tv-pause' else 'play'})

    async def set_ambience(new):
        await hass.async_add_executor_job(ambience_store.save, {key: new[key] for key in ('enabled', 'calibrating', 'mask')})
        how = new['open']
        if how == 'show':
            await show_ambience()
        elif how == 'show-if-tv':
            if await samsung_power(hass) == 'on' and await youtube_running(async_get_clientsession(hass), SAMSUNG_HOST):
                await show_ambience()
            else:
                await push_ambience()
        elif how == 'hide':
            await hide_ambience()
        else:
            await push_ambience()

    async def execute(action):
        if action == 'ambience-show':
            await show_ambience()
            return
        if action == 'ambience-hide':
            await hide_ambience()
            return
        if action in ('tv-pause', 'tv-resume'):
            await tv_playback(action)
            return
        command = ambience_command(action)
        if command and command[0] == 'set':
            await set_ambience(command[1])
            return
        if command and command[0] == 'play':
            await tv_play(command[1])
            return
        if action == 'xray-frame':
            await capture_frame()
            return
        if action == 'play-pause':
            # X-Ray: pauze / verder spelen op Stremio's eigen mediasessie (speelt = pauze, anders play); nooit de projector
            # aan- of uitzetten. Niet via de toestand van Home Assistant: een gepauzeerde Stremio meldde daar geen
            # Stremio-app meer, waardoor verder spelen geweigerd werd.
            await control('play-pause', 'play-pause-failed')
            return
        if action in SEEK_BACK:
            await seek_back(SEEK_BACK[action])
            return
        if action == 'on':
            await ensure_on()
            return
        if action == 'off':
            if power_state() in AWAKE:
                await hass.services.async_call('media_player', 'turn_off', {'entity_id': PLAYER}, blocking=True)
            elif power_state() != 'off':
                raise RuntimeError('power-state-unknown')
            return
        if action == 'cinema-stop':
            async def projector_off():
                # Unreachable (unavailable) after a film means the projector already went to sleep: nothing to send.
                if power_state() in AWAKE:
                    await hass.services.async_call('media_player', 'turn_off', {'entity_id': PLAYER}, blocking=True)
            await stop_cinema(hass, screen, projector_off)
            return
        link = target_link(action)
        if not link and action != 'cinema':
            raise RuntimeError('invalid-title')
        scene = settings['cinema_scene']
        if hass.states.get(scene) is None:
            raise RuntimeError('cinema-scene-unavailable')
        await start_cinema(hass, screen, scene, ensure_on, set_blinds_for_screen(hass))
        if link:
            await hass.services.async_call('media_player', 'play_media', {
                'entity_id': PLAYER, 'media_content_type': 'url', 'media_content_id': link,
            }, blocking=True)

    last_beat = [0.0, None]

    async def heartbeat():
        # Only when the state changes or every HEARTBEAT_EVERY s (the app calls the bridge offline after 60 s): the
        # queue is read every 2 s, and a write on every round on top of that hit InstantDB's rate limit.
        state = power_state()
        reported = 'on' if state in AWAKE else 'off' if state == 'off' else 'unknown'
        if reported == last_beat[1] and time.monotonic() - last_beat[0] < HEARTBEAT_EVERY:
            return
        await update('projectorBridges', bridge, {'lastSeenAt': int(time.time() * 1000), 'reportedState': reported})
        last_beat[:] = [time.monotonic(), reported]

    async def worker():
        while True:
            try:
                resume_ambience_lights()
            except Exception as failure:
                _LOGGER.debug('Resuming the ambience lights skipped: %r', failure)
            try:
                await heartbeat()
                response = await database('query', {'query': {
                    'projectorBridges': {'$': {'where': {'id': bridge}}},
                    'projectorCommands': {'$': {'where': {'bridgeId': bridge, 'state': 'pending'}, 'order': {'createdAt': 'desc'}, 'limit': 100}},
                }})
                rows = response.get('projectorBridges', [])
                commands = sorted((row for row in response.get('projectorCommands', []) if row['expiresAt'] > time.time() * 1000), key=lambda row: row['createdAt'])
                if rows and rows[0].get('enabled') and commands:
                    command = commands[0]
                    valid = command['expiresAt'] > time.time() * 1000 and command['createdAt'] <= time.time() * 1000
                    action = command.get('action', '')
                    if valid and (action in ('on', 'off', 'cinema', 'cinema-stop', 'play-pause', 'xray-frame') or action in AMBIENCE_ACTIONS or ambience_command(action) or action in SEEK_BACK or target_link(action)):
                        # Permission rules enforce pending -> claimed atomically. Never retry a claim or dispatch.
                        await update('projectorCommands', command['id'], {'state': 'claimed'})
                        error = ''
                        try:
                            async with busy:
                                await execute(action)
                        except Exception as failure:
                            error = str(failure) if isinstance(failure, RuntimeError) else 'device-action-failed'
                            _LOGGER.warning('Cinema command failed: %s', error if isinstance(failure, RuntimeError) else repr(failure)[:300])
                        await update('projectorCommands', command['id'], {'state': 'failed' if error else 'sent', 'error': error})
            except asyncio.CancelledError:
                raise
            except Exception:
                _LOGGER.warning('Cinema queue unavailable; no command retried')
            # Projector aan: elke 2 s kijken, zodat X-Ray-knoppen (pauze, terugspoelen) snel reageren; anders elke 5 s.
            await asyncio.sleep(2 if power_state() in AWAKE else 5)

    async def samsung_off_for_screen():
        # Same paired Samsung as cinema start; only an awake TV gets one turn-off, never a power toggle.
        try:
            await turn_off_samsung(hass)
        except Exception as failure:
            _LOGGER.warning('Samsung off after screen opened failed: %s', failure if isinstance(failure, RuntimeError) else 'device-action-failed')

    async def projector_on_for_screen():
        try:
            await ensure_on()
        except Exception as failure:
            _LOGGER.warning('Projector wake after screen opened failed: %s', failure if isinstance(failure, RuntimeError) else 'device-action-failed')

    async def lights_for_screen(opened):
        # Opened: the same Cinema recall as a cinema start (skipped when Cinema is already active).
        # Closed: the living room to 20 %, also when it was off.
        try:
            if opened:
                await ensure_cinema_lights(hass, settings['cinema_scene'])
            else:
                await hass.services.async_call('light', 'turn_on', {'entity_id': CINEMA_LIGHTS, 'brightness_pct': CLOSED_BRIGHTNESS}, blocking=True)
        except Exception as failure:
            _LOGGER.warning('Living room lights after screen %s failed: %s', 'opened' if opened else 'closed', failure if isinstance(failure, RuntimeError) else 'device-action-failed')

    async def blinds_after_hand_open():
        # Opened with the remote or wall switch: its STOP comes during the run, so stay off the radio band until the
        # screen's own run time has passed.
        duration = settings.get('screen', {}).get('duration')
        wait = duration if isinstance(duration, (int, float)) and not isinstance(duration, bool) and 0 < duration <= 60 else 15
        await pause(wait + RF_GAP)
        await set_blinds_for_screen(hass)

    async def opened_by_hand(wake, samsung):
        async with busy:
            await asyncio.gather(lights_for_screen(True), blinds_after_hand_open(), *([samsung_off_for_screen()] if samsung else []), *([projector_on_for_screen()] if wake else []))

    async def projector_off_for_screen():
        try:
            if power_state() in AWAKE:
                await hass.services.async_call('media_player', 'turn_off', {'entity_id': PLAYER}, blocking=True)
        except Exception as failure:
            _LOGGER.warning('Projector off after screen closed failed: %s', failure if isinstance(failure, RuntimeError) else 'device-action-failed')

    async def closed_by_hand():
        async with busy:
            await asyncio.gather(lights_for_screen(False), projector_off_for_screen())

    @callback
    def on_contact(event):
        # Screen moved by hand (remote or wall switch). Opened: Cinema lights, blinds, Samsung off if it is on, and wake the
        # projector once; a cinema command does all of that itself, and a recent wake may still be booting: never send
        # a second Atom press. Closed: living room to 20 % and one projector turn-off, only when it reports it is on.
        # The Samsung is never turned on.
        change = screen_change(event.data.get('old_state'), event.data.get('new_state'))
        if not change or busy.locked() or screen.moving:
            return
        if change == 'opened':
            # turn_off_samsung asks the TV itself; Home Assistant's state can be a stale «off».
            samsung_on = True
            wake = time.monotonic() - last_wake[0] >= WAKE_COOLDOWN and power_state() not in AWAKE
            hass.async_create_task(opened_by_hand(wake, samsung_on))
        else:
            hass.async_create_task(closed_by_hand())

    telemetry = Telemetry()
    display_metadata = [None]
    metadata_attempt = [None, 0]
    publish_error = [None]
    status_sent = [None, float('-inf')]
    adb_failures = [0, float('-inf')]

    async def report_status(stage, player=None, error=None):
        # What the Pi sees, for the app (X-Ray explains why nothing shows) and for diagnosis without the HA log:
        # projector-off · adb-failed · no-stremio-session · stremio · publish-failed. Never titles or positions.
        owner = settings.get('owner_id')
        if not owner:
            return
        fields = {'stage': stage, 'appId': (player.attributes.get('app_id') if player else None), 'playerState': (player.state if player else None), 'error': error}
        key = tuple(fields.values())
        if key == status_sent[0] and time.monotonic() - status_sent[1] < STATUS_EVERY:
            return
        now = int(time.time() * 1000)
        record = f'{owner}:bridge-status'
        # Also after a failed write (e.g. no permission for this record): wait STATUS_EVERY s, never retry every round.
        status_sent[:] = [key, time.monotonic()]
        try:
            await update('cinemaCompanionData', companion_id(record), {'ownerId': owner, 'key': record, 'expiresAt': now + 7 * 86400_000,
                                                                     'payload': {**fields, 'at': now, 'version': BRIDGE_VERSION}})
        except Exception:
            pass

    async def stremio_state():
        response = await hass.services.async_call('androidtv', 'adb_command', {
            'entity_id': ADB_PLAYER, 'command': ("dumpsys media_session | sed -n '/package=com.stremio.one/,/queueTitle=/p'; echo COMPANION_UPTIME; cat /proc/uptime" if settings.get('companion_enabled') else "dumpsys media_session | grep -E 'package=|state=PlaybackState'"),
        }, blocking=True, return_response=True)
        raw = ((response or {}).get(ADB_PLAYER) or {}).get('adb_response')
        # With the companion the command always prints COMPANION_UPTIME: no output at all = ADB did not run.
        if settings.get('companion_enabled') and 'COMPANION_UPTIME' not in str(raw or ''):
            raise RuntimeError('adb-no-output')
        if settings.get('companion_enabled') and settings.get('owner_id'):
            measured_at = int(time.time() * 1000)
            reading = parse_media_session(raw)
            # Optional one-shot helper installed separately. Only TITLE/DURATION are
            # cached; these never establish exact-file or subtitle verification.
            title = reading['title'] if reading else None
            if settings.get('companion_metadata_probe') and title and (not display_metadata[0] or display_metadata[0]['title'] != title) and (metadata_attempt[0] != title or time.monotonic() - metadata_attempt[1] > 60):
                metadata_attempt[:] = [title, time.monotonic()]
                try:
                    result = await hass.services.async_call('androidtv', 'adb_command', {
                        'entity_id': ADB_PLAYER,
                        'command': 'CLASSPATH=/data/local/tmp/shoppinglist-cinema-metadata-v5.dex app_process /system/bin CinemaMetadataProbe',
                    }, blocking=True, return_response=True)
                    display_metadata[0] = parse_probe_metadata(((result or {}).get(ADB_PLAYER) or {}).get('adb_response'))
                except Exception:
                    display_metadata[0] = None
            payload = telemetry.snapshot(raw, now=measured_at, metadata=display_metadata[0])
            if payload:
                try:
                    await update('cinemaPlayback', bridge, {'ownerId': settings['owner_id'], 'bridgeId': bridge, 'payload': payload})
                    publish_error[0] = None
                except Exception as failure:
                    publish_error[0] = str(failure)[:80] or 'publish-failed'
                    _LOGGER.warning('Companion telemetry unavailable; lighting watcher continues')
        return stremio_playback(raw)

    async def playback_watcher():
        # Stremio paused: living room to 20 % (a bit of light for a drink); playing (again): Cinema.
        previous = None
        while True:
            # While the screen moves, leave the projector alone: no ADB reads or reconnects. Connecting to a booting
            # projector can stall Home Assistant for seconds, and the screen's STOP is timed.
            if screen.moving:
                await asyncio.sleep(1)
                continue
            player = hass.states.get(PLAYER)
            current = None
            # Read Stremio's media session whenever the projector is awake. Not only when Home Assistant reports Stremio as
            # the app in front: that attribute is unreliable (gone on pause, or another app id after a restart), and then
            # nothing reached the app (no X-Ray, no dashboard). The ADB dump is local and cheap; without a Stremio session
            # it simply finds nothing.
            if player and player.state in AWAKE and hass.states.get(ADB_PLAYER):
                try:
                    current = await stremio_state()
                    adb_failures[0] = 0
                    stage = 'publish-failed' if publish_error[0] else 'stremio' if current else 'no-stremio-session'
                    await report_status(stage, player, publish_error[0])
                except asyncio.CancelledError:
                    raise
                except Exception as failure:
                    current = None
                    adb_failures[0] += 1
                    await report_status('adb-failed', player, str(failure)[:80] or type(failure).__name__)
                    # ADB to the projector keeps failing (often after a Home Assistant restart or a projector reboot):
                    # reload the Android TV (ADB) integration, at most every ADB_RELOAD_EVERY s.
                    if adb_failures[0] >= ADB_FAILS_BEFORE_RELOAD and time.monotonic() - adb_failures[1] >= ADB_RELOAD_EVERY:
                        adb_failures[1] = time.monotonic()
                        _LOGGER.warning('ADB to the projector failed %s times in a row: reloading the Android TV integration', adb_failures[0])
                        try:
                            await hass.config_entries.async_reload(ADB_ENTRY)
                        except Exception as reload_failure:
                            _LOGGER.warning('Reloading the Android TV integration failed: %s', type(reload_failure).__name__)
            else:
                await report_status('projector-off', player)
            action = playback_lights(previous, current)
            if action and not busy.locked():
                try:
                    if action == 'dim':
                        await hass.services.async_call('light', 'turn_on', {'entity_id': CINEMA_LIGHTS, 'brightness_pct': CLOSED_BRIGHTNESS}, blocking=True)
                    else:
                        await ensure_cinema_lights(hass, settings['cinema_scene'])
                except Exception as failure:
                    _LOGGER.warning('Living room lights after Stremio %s failed: %s', 'pause' if action == 'dim' else 'play', failure if isinstance(failure, RuntimeError) else 'device-action-failed')
            previous = current
            await asyncio.sleep(PLAYBACK_POLL if current else 5)

    button_running = [False]

    async def toggle_cinema():
        # Button (SNZB-01P, single press): screen closed → the full cinema start (screen up with its timed STOP,
        # Samsung off if on, Cinema lights, projector on, blinds after the STOP); open → «Film stoppen» (screen
        # down, projector off, living room 20 %). Exactly the same flows as the app's film buttons.
        try:
            contact = hass.states.get(CONTACT)
            if not contact or contact.state not in ('on', 'off'):
                _LOGGER.warning('Cinema button ignored: screen-sensor-unavailable')
                return
            action = 'cinema-stop' if contact.state == 'on' else 'cinema'
            try:
                async with busy:
                    if action == 'cinema' and ambience_active():
                        # Straight from the ambience to the cinema: the film's lights take over, nothing restored.
                        _LOGGER.warning('Cinema button: from ambience to cinema')
                        drop_ambience()
                        await leave_sfeer_app()
                        try:
                            await execute(action)
                        finally:
                            # Unreachable at the press (ADB hiccup): the ambience app is still in front. Close it
                            # now that the screen has stopped and the projector is awake.
                            if sfeer_app_in_front():
                                _LOGGER.warning('Ambience app still in front after the cinema start: closing it')
                                await leave_sfeer_app()
                    else:
                        await execute(action)
            except Exception as failure:
                _LOGGER.warning('Cinema button %s failed: %s', action, failure if isinstance(failure, RuntimeError) else 'device-action-failed')
        finally:
            button_running[0] = False

    ambience_task = [None]

    async def handle_toggle(_call):
        # A press while the screen moves is an emergency STOP. A short press always wins over a running long-press
        # ambience start (that one can spend minutes waking the TV): it is cancelled first. A press while another
        # cinema action runs is ignored, never queued, and logged so a «dead» button can be explained.
        if screen.moving:
            _LOGGER.warning('Cinema button pressed while the screen moves: STOP')
            hass.async_create_task(screen.stop_burst('button'))
            return
        running = ambience_task[0]
        if running is not None and not running.done():
            _LOGGER.warning('Cinema button: cancelling the running ambience start (long press) first')
            running.cancel()
            await asyncio.wait({running}, timeout=AMBIENCE_CANCEL_WAIT)
        if button_running[0] or busy.locked():
            _LOGGER.warning('Cinema button ignored: another cinema action is still running')
            return
        button_running[0] = True
        hass.async_create_task(toggle_cinema())

    hass.services.async_register(DOMAIN, 'toggle', handle_toggle)

    last_random = [None]

    async def end_ambience():
        try:
            async with busy:
                await ambience_all_off()
        except Exception as failure:
            _LOGGER.warning('Ambience off (long press) failed: %s', failure if isinstance(failure, RuntimeError) else repr(failure)[:200])
        finally:
            button_running[0] = False

    async def random_ambience():
        try:
            async with busy:
                now = dt_util.now()
                video = pick_video(AMBIENCE_POOL, now.month, now.day, last_random[0])
                if not video:
                    _LOGGER.warning('Ambience button: no videos for this season')
                    return
                last_random[0] = video
                forced_ambience[0] = True
                await tv_play(video, projector=True)
        except asyncio.CancelledError:
            # A short press took over (cinema start or stop): no forced ambience left behind.
            forced_ambience[0] = False
            _LOGGER.warning('Ambience button cancelled by a short press')
            raise
        except Exception as failure:
            _LOGGER.warning('Ambience button failed: %s', failure if isinstance(failure, RuntimeError) else repr(failure)[:200])
        finally:
            button_running[0] = False

    @callback
    def on_button(event):
        data = event.data or {}
        if data.get('device_ieee') != BUTTON_IEEE or data.get('command') != BUTTON_LONG:
            return
        if button_running[0] or busy.locked() or screen.moving:
            _LOGGER.warning('Ambience button ignored: another cinema action is still running')
            return
        button_running[0] = True
        if ambience_active():
            _LOGGER.warning('Ambience button: ambience is on, so everything off and the bright scene')
            hass.async_create_task(end_ambience())
            return
        ambience_task[0] = hass.async_create_task(random_ambience())

    unsubscribe_button = hass.bus.async_listen('zha_event', on_button)

    unsubscribe = async_track_state_change_event(hass, [CONTACT], on_contact)
    task = hass.async_create_background_task(worker(), 'ShoppingList cinema queue')
    watcher = hass.async_create_background_task(playback_watcher(), 'ShoppingList Stremio lights')
    async def shutdown(_event):
        unsubscribe()
        unsubscribe_button()
        # The LED strip loop is not needed while Home Assistant stops (it warned about delaying the shutdown).
        if light_task[0] and not light_task[0].done():
            light_task[0].cancel()
        task.cancel()
        watcher.cancel()
    hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STOP, shutdown)
    return True
