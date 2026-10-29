"""Scoped outbound cinema queue; no app server or Mac is involved in execution."""
import asyncio
import logging
import re
import time

from homeassistant.const import EVENT_HOMEASSISTANT_STOP
from homeassistant.core import callback
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from homeassistant.helpers.event import async_track_state_change_event
from .screen import CONTACT, ScreenGuard

_LOGGER = logging.getLogger(__name__)
DOMAIN = 'shoppinglist_cinema'
APP_ID = 'c63df57f-510a-46bc-8687-912d030c9359'
PLAYER = 'media_player.woonkamer_tv_2'
SAMSUNG_TV = 'media_player.samsung_q60_series_82_qe82q60ralxxn'
CINEMA_SELECTOR = 'select.woonkamer_woonkamer_scene'
CINEMA_LIGHTS = 'light.woonkamer_woonkamer'
AWAKE = {'on', 'playing', 'paused', 'idle', 'buffering'}
WAKE_COOLDOWN = 120
CLOSED_BRIGHTNESS = 20
# ADB connection to the same projector: Android TV Remote cannot see playback, the media session can.
ADB_PLAYER = 'media_player.android_tv_192_168_132_133'
STREMIO = 'com.stremio.one'
PLAYBACK_POLL = 2


def stremio_playback(dumpsys):
    # `dumpsys media_session`: package=com.stremio.one / active=true / state=PlaybackState {state=PAUSED(2), ...}
    match = re.search(r'package=' + re.escape(STREMIO) + r'\s+active=\w+\s+state=PlaybackState \{state=([A-Z_]+)', dumpsys or '')
    return match.group(1) if match else None


def playback_lights(previous, current):
    # Only a real play <-> pause switch moves the lights; buffering, stopping or the first reading do not.
    if previous == 'PLAYING' and current == 'PAUSED':
        return 'dim'
    if previous == 'PAUSED' and current == 'PLAYING':
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


async def turn_off_samsung(hass):
    state = hass.states.get(SAMSUNG_TV)
    if state and state.state in {'off', 'standby'}:
        return
    if not state or state.state not in AWAKE:
        raise RuntimeError('samsung-state-unknown')
    # Use the paired Samsung TV, not the Cast player's playback state or a power toggle.
    await hass.services.async_call('media_player', 'turn_off', {'entity_id': SAMSUNG_TV}, blocking=True)
    deadline = time.monotonic() + 15
    while True:
        state = hass.states.get(SAMSUNG_TV)
        if state and state.state in {'off', 'standby'}:
            return
        if time.monotonic() >= deadline:
            raise RuntimeError('samsung-off-not-confirmed')
        await asyncio.sleep(1)


async def start_cinema(hass, screen, scene, ensure_on):
    # Validate before any side effect; each parallel motor action rechecks its own guard.
    screen.check()
    samsung = hass.states.get(SAMSUNG_TV)
    if not samsung or samsung.state not in AWAKE | {'off', 'standby'}:
        raise RuntimeError('samsung-state-unknown')
    tasks = [asyncio.create_task(action) for action in (
        turn_off_samsung(hass),
        ensure_cinema_lights(hass, scene),
        ensure_on(),
        screen.open_if_closed(),
    )]
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
    screen = ScreenGuard(hass, settings.get('screen', {}))

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

    async def execute(action):
        if action == 'on':
            await ensure_on()
            return
        if action == 'off':
            if power_state() in AWAKE:
                await hass.services.async_call('media_player', 'turn_off', {'entity_id': PLAYER}, blocking=True)
            elif power_state() != 'off':
                raise RuntimeError('power-state-unknown')
            return
        link = target_link(action)
        if not link and action != 'cinema':
            raise RuntimeError('invalid-title')
        scene = settings['cinema_scene']
        if hass.states.get(scene) is None:
            raise RuntimeError('cinema-scene-unavailable')
        await start_cinema(hass, screen, scene, ensure_on)
        if link:
            await hass.services.async_call('media_player', 'play_media', {
                'entity_id': PLAYER, 'media_content_type': 'url', 'media_content_id': link,
            }, blocking=True)

    async def heartbeat():
        state = power_state()
        await update('projectorBridges', bridge, {'lastSeenAt': int(time.time() * 1000), 'reportedState': 'on' if state in AWAKE else 'off' if state == 'off' else 'unknown'})

    async def worker():
        while True:
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
                    if valid and (action in ('on', 'off', 'cinema') or target_link(action)):
                        # Permission rules enforce pending -> claimed atomically. Never retry a claim or dispatch.
                        await update('projectorCommands', command['id'], {'state': 'claimed'})
                        error = ''
                        try:
                            async with busy:
                                await execute(action)
                        except Exception as failure:
                            error = str(failure) if isinstance(failure, RuntimeError) else 'device-action-failed'
                            _LOGGER.warning('Cinema command failed: %s', error)
                        await update('projectorCommands', command['id'], {'state': 'failed' if error else 'sent', 'error': error})
            except asyncio.CancelledError:
                raise
            except Exception:
                _LOGGER.warning('Cinema queue unavailable; no command retried')
            await asyncio.sleep(5)

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

    async def opened_by_hand(wake, samsung):
        async with busy:
            await asyncio.gather(lights_for_screen(True), *([samsung_off_for_screen()] if samsung else []), *([projector_on_for_screen()] if wake else []))

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
        # Screen moved by hand (remote or wall switch). Opened: Cinema lights, Samsung off if it is on, and wake the
        # projector once; a cinema command does all of that itself, and a recent wake may still be booting: never send
        # a second Atom press. Closed: living room to 20 % and one projector turn-off, only when it reports it is on.
        # The Samsung is never turned on.
        change = screen_change(event.data.get('old_state'), event.data.get('new_state'))
        if not change or busy.locked() or screen.moving:
            return
        if change == 'opened':
            samsung = hass.states.get(SAMSUNG_TV)
            samsung_on = bool(samsung and samsung.state in AWAKE)
            wake = time.monotonic() - last_wake[0] >= WAKE_COOLDOWN and power_state() not in AWAKE
            hass.async_create_task(opened_by_hand(wake, samsung_on))
        else:
            hass.async_create_task(closed_by_hand())

    async def stremio_state():
        response = await hass.services.async_call('androidtv', 'adb_command', {
            'entity_id': ADB_PLAYER, 'command': "dumpsys media_session | grep -A2 'package=" + STREMIO + "'",
        }, blocking=True, return_response=True)
        return stremio_playback(((response or {}).get(ADB_PLAYER) or {}).get('adb_response'))

    async def playback_watcher():
        # Stremio paused: living room to 20 % (a bit of light for a drink); playing again: back to Cinema.
        previous = None
        while True:
            player = hass.states.get(PLAYER)
            current = None
            if player and player.state in AWAKE and player.attributes.get('app_id') == STREMIO and hass.states.get(ADB_PLAYER):
                try:
                    current = await stremio_state()
                except asyncio.CancelledError:
                    raise
                except Exception:
                    current = None
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

    unsubscribe = async_track_state_change_event(hass, [CONTACT], on_contact)
    task = hass.async_create_background_task(worker(), 'ShoppingList cinema queue')
    watcher = hass.async_create_background_task(playback_watcher(), 'ShoppingList Stremio lights')
    async def shutdown(_event):
        unsubscribe()
        task.cancel()
        watcher.cancel()
    hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STOP, shutdown)
    return True
