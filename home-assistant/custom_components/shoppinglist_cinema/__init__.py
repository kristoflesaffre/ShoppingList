"""Scoped outbound cinema queue; no app server or Mac is involved in execution."""
import asyncio
import logging
import re
import time

from homeassistant.const import EVENT_HOMEASSISTANT_STOP
from homeassistant.helpers.aiohttp_client import async_get_clientsession
from .screen import ScreenGuard

_LOGGER = logging.getLogger(__name__)
DOMAIN = 'shoppinglist_cinema'
APP_ID = 'c63df57f-510a-46bc-8687-912d030c9359'
PLAYER = 'media_player.woonkamer_tv_2'
SAMSUNG_TV = 'media_player.samsung_q60_series_82_qe82q60ralxxn'
CINEMA_SELECTOR = 'select.woonkamer_woonkamer_scene'
CINEMA_LIGHTS = 'light.woonkamer_woonkamer'
AWAKE = {'on', 'playing', 'paused', 'idle', 'buffering'}


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

    task = hass.async_create_background_task(worker(), 'ShoppingList cinema queue')
    async def shutdown(_event):
        task.cancel()
    hass.bus.async_listen_once(EVENT_HOMEASSISTANT_STOP, shutdown)
    return True
