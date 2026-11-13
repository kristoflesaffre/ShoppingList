"""Exercise the Pi worker without a Home Assistant install or physical commands."""
import asyncio
import importlib.util
from pathlib import Path
import sys
import types
import unittest
from unittest.mock import AsyncMock, patch

for name in ('homeassistant', 'homeassistant.const', 'homeassistant.core', 'homeassistant.helpers', 'homeassistant.helpers.aiohttp_client', 'homeassistant.helpers.event', 'homeassistant.util'):
    sys.modules[name] = types.ModuleType(name)
import datetime
clock = types.SimpleNamespace(hour=21)
sys.modules['homeassistant.util'].dt = types.SimpleNamespace(now=lambda: datetime.datetime(2026, 10, 30, clock.hour, 0))
def mark_callback(function):
    function.is_hass_callback = True  # HA runs unmarked sync listeners in a worker thread
    return function
sys.modules['homeassistant.core'].callback = mark_callback
contact_listeners = []
sys.modules['homeassistant.helpers.event'].async_track_state_change_event = lambda _hass, entities, listener: contact_listeners.append((entities, listener)) or (lambda: None)
sys.modules['homeassistant.const'].EVENT_HOMEASSISTANT_STOP = 'stop'
sys.modules['homeassistant.helpers.aiohttp_client'].async_get_clientsession = lambda hass: hass.session
source = Path(__file__).resolve().parents[1] / 'home-assistant/custom_components/shoppinglist_cinema/__init__.py'
spec = importlib.util.spec_from_file_location('cinema', source, submodule_search_locations=[str(source.parent)])
cinema = importlib.util.module_from_spec(spec)
sys.modules['cinema'] = cinema
spec.loader.exec_module(cinema)


class BridgeTests(unittest.IsolatedAsyncioTestCase):
    async def test_all_start_actions_overlap_before_any_completes(self):
        started = []
        ready, finish = asyncio.Event(), asyncio.Event()
        async def action(name):
            started.append(name)
            if len(started) == 4: ready.set()
            await finish.wait()
        hass = types.SimpleNamespace(states=types.SimpleNamespace(get=lambda _: types.SimpleNamespace(state='on')))
        screen = types.SimpleNamespace(check=lambda: True, open_if_closed=lambda: action('screen'))
        with patch.object(cinema, 'turn_off_samsung', lambda _: action('samsung')), patch.object(cinema, 'ensure_cinema_lights', lambda *_: action('lights')):
            task = asyncio.create_task(cinema.start_cinema(hass, screen, 'scene.cinema', lambda: action('projector')))
            try:
                await asyncio.wait_for(ready.wait(), 1)
                self.assertEqual(started, ['screen', 'samsung', 'lights', 'projector'])
                self.assertFalse(task.done())
            finally:
                finish.set()
                await task

    async def test_failed_parallel_action_waits_for_screen_stop(self):
        moving, finish = asyncio.Event(), asyncio.Event()
        stopped = []
        async def screen_action():
            moving.set()
            try: await finish.wait()
            finally: stopped.append(True)
        async def failed(*_): raise RuntimeError('test-light-failure')
        hass = types.SimpleNamespace(states=types.SimpleNamespace(get=lambda _: types.SimpleNamespace(state='off')))
        screen = types.SimpleNamespace(check=lambda: True, open_if_closed=screen_action)
        with patch.object(cinema, 'turn_off_samsung', AsyncMock()), patch.object(cinema, 'ensure_cinema_lights', failed):
            task = asyncio.create_task(cinema.start_cinema(hass, screen, 'scene.cinema', AsyncMock()))
            await asyncio.wait_for(moving.wait(), 1)
            self.assertFalse(task.done())
            finish.set()
            with self.assertRaisesRegex(RuntimeError, 'test-light-failure'): await task
            self.assertEqual(stopped, [True])

    async def test_cancelled_parallel_start_drains_screen_cleanup(self):
        moving = asyncio.Event()
        stopped = []
        async def screen_action():
            moving.set()
            try: await asyncio.Event().wait()
            finally: stopped.append(True)
        hass = types.SimpleNamespace(states=types.SimpleNamespace(get=lambda _: types.SimpleNamespace(state='off')))
        screen = types.SimpleNamespace(check=lambda: True, open_if_closed=screen_action)
        with patch.object(cinema, 'turn_off_samsung', AsyncMock()), patch.object(cinema, 'ensure_cinema_lights', AsyncMock()):
            task = asyncio.create_task(cinema.start_cinema(hass, screen, 'scene.cinema', AsyncMock()))
            await asyncio.wait_for(moving.wait(), 1)
            task.cancel()
            with self.assertRaises(asyncio.CancelledError): await task
            self.assertEqual(stopped, [True])

    async def run_command(self, power, scene=True, wake_status=200, tv_power='off', selected_scene='Helder', lights='on', contact='on', action='watch:tv:tt0108778:2:7'):
        calls, writes = [], []
        command = {'id': 'command', 'action': action, 'createdAt': 1, 'expiresAt': 9999999999999}
        class Response:
            status = 200
            async def __aenter__(self): return self
            async def __aexit__(self, *_args): pass
            async def json(self): return self.body
        class Session:
            def post(self, url, **kwargs):
                response = Response()
                if url.endswith('/query'):
                    response.body = {'projectorBridges': [{'enabled': True}], 'projectorCommands': [command]}
                else:
                    writes.extend(kwargs['json']['steps'])
                    response.body = {}
                return response
        async def service(domain, action, data, **_kwargs):
            calls.append((domain, action, data))
            if action == 'turn_off' and data['entity_id'] == cinema.SAMSUNG_TV:
                state['tv_power'] = 'off'
            if domain == 'rest_command':
                if wake_status == 200: state['power'] = 'on'
                return {'status': wake_status}
        state = {'power': power, 'tv_power': tv_power}
        def get_state(entity):
            if entity == 'binary_sensor.gang_beneden_voordeur_opening': return types.SimpleNamespace(state=contact)
            if entity == cinema.PLAYER: return types.SimpleNamespace(state=state['power'])
            if entity == cinema.SAMSUNG_TV: return types.SimpleNamespace(state=state['tv_power'])
            if entity == cinema.CINEMA_SELECTOR: return types.SimpleNamespace(state=selected_scene)
            if entity == cinema.CINEMA_LIGHTS: return types.SimpleNamespace(state=lights)
            return object() if scene else None
        hass = types.SimpleNamespace(session=Session(), states=types.SimpleNamespace(get=get_state), services=types.SimpleNamespace(async_call=service, async_register=lambda *_: None), bus=types.SimpleNamespace(async_listen_once=lambda *_: None, async_listen=lambda *_: lambda: None))
        captured = []
        hass.async_create_background_task = lambda coroutine, _name: captured.append(coroutine) or types.SimpleNamespace(cancel=lambda: None)
        await cinema.async_setup(hass, {'shoppinglist_cinema': {'token': 'scoped', 'bridge_id': 'bridge', 'projector_host': '192.168.1.1', 'cinema_scene': 'scene.cinema'}})
        # The last sleep ends the worker after one iteration; no real network or hardware.
        with patch.object(cinema.asyncio, 'open_connection', AsyncMock(side_effect=OSError)), patch.object(cinema.asyncio, 'sleep', AsyncMock(side_effect=asyncio.CancelledError)), patch.object(cinema, 'pause', AsyncMock()):
            with self.assertRaises(asyncio.CancelledError): await captured[0]
        for coroutine in captured[1:]: coroutine.close()
        return calls, writes

    async def test_already_on_never_wakes(self):
        calls, writes = await self.run_command('on')
        self.assertFalse(any(domain == 'rest_command' for domain, *_ in calls))
        self.assertEqual([action for _, action, _ in calls], ['turn_on', 'play_media'])
        self.assertIn(':2:7?', calls[-1][2]['media_content_id'])
        self.assertEqual(writes[-1][-1]['state'], 'sent')

    async def test_unknown_contact_aborts_before_any_device_action(self):
        for contact in ('unknown', 'unavailable'):
            calls, writes = await self.run_command('off', tv_power='on', contact=contact)
            self.assertEqual(calls, [])
            self.assertEqual(writes[-1][-1], {'state': 'failed', 'error': 'screen-sensor-unavailable'})

    async def test_cinema_start_without_title_uses_guard_and_does_not_launch_media(self):
        calls, writes = await self.run_command('on', action='cinema')
        self.assertEqual([action for _, action, _ in calls], ['turn_on'])
        self.assertEqual(writes[-1][-1]['state'], 'sent')
        calls, writes = await self.run_command('off', action='cinema', contact='unavailable')
        self.assertEqual(calls, [])
        self.assertEqual(writes[-1][-1]['state'], 'failed')

    async def test_off_wakes_once_then_opens(self):
        calls, writes = await self.run_command('off')
        self.assertEqual([action for _, action, _ in calls], ['turn_on', 'xgimi_wake_atom', 'play_media'])
        self.assertEqual(writes[-1][-1]['state'], 'sent')

    async def test_failed_wake_never_launches_or_retries(self):
        calls, writes = await self.run_command('off', wake_status=503)
        self.assertEqual([action for _, action, _ in calls], ['turn_on', 'xgimi_wake_atom'])
        self.assertEqual(writes[-1][-1], {'state': 'failed', 'error': 'wake-not-confirmed'})

    async def test_missing_scene_does_not_wake(self):
        calls, writes = await self.run_command('off', scene=False)
        self.assertEqual(calls, [])
        self.assertEqual(writes[-1][-1]['state'], 'failed')

    async def test_samsung_on_turns_off_before_cinema_without_touching_projector_power(self):
        calls, writes = await self.run_command('on', tv_power='on')
        self.assertEqual(calls[0], ('media_player', 'turn_off', {'entity_id': cinema.SAMSUNG_TV}))
        self.assertEqual([action for _, action, _ in calls], ['turn_off', 'turn_on', 'play_media'])
        self.assertEqual(writes[-1][-1]['state'], 'sent')

    async def test_samsung_off_is_not_sent_another_power_command(self):
        calls, _ = await self.run_command('on', tv_power='off')
        self.assertFalse(any(action == 'turn_off' for _, action, _ in calls))

    async def test_unknown_samsung_status_does_not_send_a_power_toggle_or_claim_success(self):
        calls, writes = await self.run_command('off', tv_power='unavailable')
        self.assertEqual(calls, [])
        self.assertEqual(writes[-1][-1], {'state': 'failed', 'error': 'samsung-state-unknown'})

    async def test_samsung_shutdown_timeout_is_not_retried(self):
        call = AsyncMock()
        hass = types.SimpleNamespace(states=types.SimpleNamespace(get=lambda _entity: types.SimpleNamespace(state='on')), services=types.SimpleNamespace(async_call=call))
        with patch.object(cinema.time, 'monotonic', side_effect=[0, 16]):
            with self.assertRaisesRegex(RuntimeError, 'samsung-off-not-confirmed'):
                await cinema.turn_off_samsung(hass)
        call.assert_awaited_once_with('media_player', 'turn_off', {'entity_id': cinema.SAMSUNG_TV}, blocking=True)

    async def test_active_cinema_and_awake_projector_only_open_title(self):
        calls, writes = await self.run_command('on', selected_scene='Cinema')
        self.assertEqual([action for _, action, _ in calls], ['play_media'])
        self.assertEqual(writes[-1][-1]['state'], 'sent')

    async def test_cinema_selected_but_lights_off_must_recall_scene(self):
        calls, _ = await self.run_command('on', selected_scene='Cinema', lights='off')
        self.assertEqual([action for _, action, _ in calls], ['turn_on', 'play_media'])

    async def test_unknown_scene_status_does_not_silently_skip_cinema(self):
        calls, _ = await self.run_command('on', selected_scene='unknown')
        self.assertEqual([action for _, action, _ in calls], ['turn_on', 'play_media'])

    def test_invalid_links(self):
        for action in ('watch:movie:tt0108778:1:1', 'watch:tv:tt0108778:1:0', 'https://elsewhere'):
            self.assertIsNone(cinema.target_link(action))




class ScreenWakeTests(unittest.IsolatedAsyncioTestCase):
    """Screen moved by hand: lights, Samsung and projector follow; cinema commands and booting projectors are left alone."""

    async def setup_bridge(self, power='off', tv='off', scene='Helder'):
        calls, tasks = [], []
        state = {'power': power, 'tv': tv}
        async def service(domain, action, data, **_):
            if domain == 'scene':
                calls.append('cinema_scene')
                return
            if domain == 'light':
                calls.append(f"lights_{data['brightness_pct']}")
                return
            if data.get('entity_id') == cinema.SAMSUNG_TV:
                calls.append('samsung_off')
                state['tv'] = 'off'
                return
            calls.append(action)
            if action == 'turn_off':
                state['power'] = 'off'
            if domain == 'rest_command':
                state['power'] = 'on'
                return {'status': 200}
        def get_state(entity):
            if entity == cinema.SAMSUNG_TV: return types.SimpleNamespace(state=state['tv'])
            if entity == cinema.CINEMA_SELECTOR: return types.SimpleNamespace(state=scene)
            if entity == cinema.CINEMA_LIGHTS: return types.SimpleNamespace(state='on')
            return types.SimpleNamespace(state=state['power']) if entity == cinema.PLAYER else None
        hass = types.SimpleNamespace(session=None, states=types.SimpleNamespace(get=get_state), services=types.SimpleNamespace(async_call=service, async_register=lambda *_: None), bus=types.SimpleNamespace(async_listen_once=lambda *_: None))
        hass.async_create_background_task = lambda coroutine, _name: coroutine.close() or types.SimpleNamespace(cancel=lambda: None)
        hass.async_create_task = lambda coroutine: tasks.append(coroutine)
        contact_listeners.clear()
        await cinema.async_setup(hass, {'shoppinglist_cinema': {'token': 'scoped', 'bridge_id': 'bridge', 'projector_host': '192.168.1.1', 'cinema_scene': 'scene.cinema'}})
        entities, listener = contact_listeners[0]
        self.assertEqual(entities, ['binary_sensor.gang_beneden_voordeur_opening'])
        self.assertTrue(getattr(listener, 'is_hass_callback', False))
        def change(old, new, restored=False):
            listener(types.SimpleNamespace(data={'old_state': types.SimpleNamespace(state=old), 'new_state': types.SimpleNamespace(state=new, attributes={'restored': restored})}))
        async def run_tasks():
            # The blinds wait for the screen's run time; no real waiting in tests.
            with patch.object(cinema.asyncio, 'open_connection', AsyncMock(side_effect=OSError)), patch.object(cinema, 'pause', AsyncMock()):
                while tasks: await tasks.pop(0)
        return change, run_tasks, calls

    async def test_screen_opening_wakes_projector_once(self):
        change, run_tasks, calls = await self.setup_bridge()
        change('off', 'on')
        await run_tasks()
        self.assertEqual(sorted(calls), ['cinema_scene', 'xgimi_wake_atom'])
        calls.clear()
        # Closed again: one turn-off. Reopened within the cooldown: no second press while it may still be shutting down.
        change('on', 'off')
        await run_tasks()
        change('off', 'on')
        await run_tasks()
        self.assertEqual(sorted(calls), ['cinema_scene', 'lights_20', 'turn_off'])

    async def test_projector_already_on_is_not_pressed(self):
        change, run_tasks, calls = await self.setup_bridge(power='idle')
        change('off', 'on')
        await run_tasks()
        self.assertEqual(calls, ['cinema_scene'])

    async def test_active_cinema_scene_is_not_recalled(self):
        change, run_tasks, calls = await self.setup_bridge(power='idle', scene='Cinema')
        change('off', 'on')
        await run_tasks()
        self.assertEqual(calls, [])

    async def test_screen_opening_turns_samsung_off_and_wakes_projector(self):
        change, run_tasks, calls = await self.setup_bridge(tv='on')
        change('off', 'on')
        await run_tasks()
        self.assertEqual(sorted(calls), ['cinema_scene', 'samsung_off', 'xgimi_wake_atom'])

    async def test_samsung_turned_off_even_when_projector_already_on(self):
        change, run_tasks, calls = await self.setup_bridge(power='idle', tv='on')
        change('off', 'on')
        await run_tasks()
        self.assertEqual(sorted(calls), ['cinema_scene', 'samsung_off'])

    async def test_screen_closing_never_touches_samsung(self):
        change, run_tasks, calls = await self.setup_bridge(power='idle', tv='off')
        change('on', 'off')
        await run_tasks()
        self.assertEqual(sorted(calls), ['lights_20', 'turn_off'])

    async def test_screen_closing_turns_projector_off_once(self):
        change, run_tasks, calls = await self.setup_bridge(power='playing')
        change('on', 'off')
        await run_tasks()
        self.assertEqual(sorted(calls), ['lights_20', 'turn_off'])

    async def test_screen_closing_sends_nothing_to_an_off_or_unknown_projector(self):
        for power in ('off', 'unavailable'):
            change, run_tasks, calls = await self.setup_bridge(power=power)
            change('on', 'off')
            await run_tasks()
            self.assertEqual(calls, ['lights_20'])

    async def test_recovery_or_restored_state_is_not_an_opening(self):
        change, run_tasks, calls = await self.setup_bridge()
        change('unavailable', 'on'); change('off', 'on', restored=True); change('unavailable', 'off')
        await run_tasks()
        self.assertEqual(calls, [])

class StremioLightsTests(unittest.IsolatedAsyncioTestCase):
    """Stremio pause dims the living room to 20 %; play brings back Cinema."""

    SAMPLE = ("package=com.stremio.one\n      active=true\n      state=PlaybackState {state=%s(2), position=2375404, speed=1.0}\n"
              "      package=com.spotify.tv.android\n      active=true\n      state=PlaybackState {state=PLAYING(3), position=1}")

    def test_parse_reads_stremio_not_other_apps(self):
        self.assertEqual(cinema.stremio_playback(self.SAMPLE % 'PAUSED'), 'PAUSED')
        self.assertEqual(cinema.stremio_playback(self.SAMPLE % 'PLAYING'), 'PLAYING')
        self.assertIsNone(cinema.stremio_playback('package=com.spotify.tv.android\n active=true\n state=PlaybackState {state=PLAYING(3)}'))
        self.assertIsNone(cinema.stremio_playback(None))
        # Full dumpsys: other lines between the package and its state; a Stremio session without a state is skipped.
        full = ("package=com.stremio.one\n launchIntent=null\n mediaButtonReceiver=MBR {pkg=com.stremio.one}\n active=true\n"
                " state=PlaybackState {state=PLAYING(3), position=1}\npackage=com.netflix.ninja\n state=PlaybackState {state=PAUSED(2)}")
        self.assertEqual(cinema.stremio_playback(full), 'PLAYING')
        self.assertIsNone(cinema.stremio_playback('package=com.stremio.one\n launchIntent=null\npackage=x\n state=PlaybackState {state=PAUSED(2)}'))

    def test_pause_dims_and_every_playback_start_brings_cinema(self):
        self.assertEqual(cinema.playback_lights('PLAYING', 'PAUSED'), 'dim')
        for previous in ('PAUSED', None, 'STOPPED', 'NONE', 'CONNECTING'):
            self.assertEqual(cinema.playback_lights(previous, 'PLAYING'), 'cinema')
        for previous, current in ((None, 'PAUSED'), ('PLAYING', 'BUFFERING'), ('BUFFERING', 'PLAYING'), ('PLAYING', None), ('PLAYING', 'PLAYING'), ('PAUSED', 'STOPPED')):
            self.assertIsNone(cinema.playback_lights(previous, current))

    async def test_watcher_follows_pause_and_play(self):
        readings = iter(['PLAYING', 'PAUSED', 'PAUSED', 'PLAYING'])
        calls, captured = [], []
        async def service(domain, action, data, **_):
            if domain == 'androidtv':
                return {cinema.ADB_PLAYER: {'adb_response': self.SAMPLE % next(readings)}}
            calls.append('cinema_scene' if domain == 'scene' else f"lights_{data['brightness_pct']}")
        def get_state(entity):
            if entity == cinema.PLAYER: return types.SimpleNamespace(state='playing', attributes={'app_id': 'com.stremio.one'})
            if entity == cinema.CINEMA_SELECTOR: return types.SimpleNamespace(state='Helder')
            if entity == cinema.CINEMA_LIGHTS: return types.SimpleNamespace(state='on')
            return types.SimpleNamespace(state='off', attributes={})
        hass = types.SimpleNamespace(session=None, states=types.SimpleNamespace(get=get_state), services=types.SimpleNamespace(async_call=service, async_register=lambda *_: None), bus=types.SimpleNamespace(async_listen_once=lambda *_: None))
        hass.async_create_background_task = lambda coroutine, name: captured.append((name, coroutine)) or types.SimpleNamespace(cancel=lambda: None)
        hass.async_create_task = lambda coroutine: coroutine.close()
        await cinema.async_setup(hass, {'shoppinglist_cinema': {'token': 'scoped', 'bridge_id': 'bridge', 'projector_host': '192.168.1.1', 'cinema_scene': 'scene.cinema'}})
        watcher = next(c for n, c in captured if 'Stremio' in n)
        for n, c in captured:
            if c is not watcher: c.close()
        with patch.object(cinema.asyncio, 'sleep', AsyncMock(side_effect=[None, None, None, asyncio.CancelledError])):
            with self.assertRaises(asyncio.CancelledError): await watcher
        # First reading PLAYING already brings Cinema; pause dims; play again brings Cinema back.
        self.assertEqual(calls, ['cinema_scene', 'lights_20', 'cinema_scene'])

    async def watch(self, app_id, adb, sleeps):
        calls, captured, reloads = [], [], []
        async def service(domain, action, data, **_):
            if domain == 'androidtv':
                return adb()
            calls.append('cinema_scene' if domain == 'scene' else f"lights_{data['brightness_pct']}")
        def get_state(entity):
            if entity == cinema.PLAYER: return types.SimpleNamespace(state='on', attributes={'app_id': app_id})
            if entity == cinema.CINEMA_SELECTOR: return types.SimpleNamespace(state='Helder')
            if entity == cinema.CINEMA_LIGHTS: return types.SimpleNamespace(state='on')
            return types.SimpleNamespace(state='off', attributes={})
        async def reload(entry): reloads.append(entry)
        hass = types.SimpleNamespace(session=None, states=types.SimpleNamespace(get=get_state), services=types.SimpleNamespace(async_call=service, async_register=lambda *_: None), bus=types.SimpleNamespace(async_listen_once=lambda *_: None),
                                     config_entries=types.SimpleNamespace(async_reload=reload))
        hass.async_create_background_task = lambda coroutine, name: captured.append((name, coroutine)) or types.SimpleNamespace(cancel=lambda: None)
        hass.async_create_task = lambda coroutine: coroutine.close()
        await cinema.async_setup(hass, {'shoppinglist_cinema': {'token': 'scoped', 'bridge_id': 'bridge', 'projector_host': '192.168.1.1', 'cinema_scene': 'scene.cinema'}})
        watcher = next(c for n, c in captured if 'Stremio' in n)
        for n, c in captured:
            if c is not watcher: c.close()
        with patch.object(cinema.asyncio, 'sleep', AsyncMock(side_effect=[None] * sleeps + [asyncio.CancelledError])):
            with self.assertRaises(asyncio.CancelledError): await watcher
        return calls, reloads

    async def test_watcher_reads_stremio_even_when_ha_reports_another_app(self):
        # Home Assistant's app_id is unreliable (gone on pause, other id after a restart): read whenever the projector is on.
        readings = iter(['PLAYING', 'PAUSED'])
        calls, _ = await self.watch('com.google.android.tvlauncher', lambda: {cinema.ADB_PLAYER: {'adb_response': self.SAMPLE % next(readings)}}, 1)
        self.assertEqual(calls, ['cinema_scene', 'lights_20'])

    async def test_failing_adb_reloads_the_integration_once(self):
        def adb(): raise RuntimeError('adb-unavailable')
        calls, reloads = await self.watch('com.stremio.one', adb, 6)
        self.assertEqual(calls, [])
        self.assertEqual(reloads, [cinema.ADB_ENTRY])

class BlindsTests(unittest.IsolatedAsyncioTestCase):
    """Screen opened: blinds closed; before 19:00 the right one half open for the cat."""

    def test_targets_by_time(self):
        self.assertEqual(cinema.blind_targets(19), {cinema.BLIND_LEFT: 0, cinema.BLIND_RIGHT: 0})
        self.assertEqual(cinema.blind_targets(18), {cinema.BLIND_LEFT: 0, cinema.BLIND_RIGHT: 50})

    async def run_blinds(self, hour, left, right, fail=False):
        calls = []
        async def service(domain, action, data, **_):
            if fail: raise OSError('hub')
            calls.append((data['entity_id'], data['position']))
        positions = {cinema.BLIND_LEFT: left, cinema.BLIND_RIGHT: right}
        def get_state(entity):
            return types.SimpleNamespace(state='open', attributes={'current_position': positions[entity]}) if entity in positions and positions[entity] is not None else None
        hass = types.SimpleNamespace(states=types.SimpleNamespace(get=get_state), services=types.SimpleNamespace(async_call=service))
        clock.hour = hour
        try:
            await cinema.set_blinds_for_screen(hass)
        finally:
            clock.hour = 21
        return calls

    async def test_evening_closes_both(self):
        self.assertEqual(await self.run_blinds(20, 30, 9), [(cinema.BLIND_LEFT, 0), (cinema.BLIND_RIGHT, 0)])

    async def test_daytime_left_closed_right_cat_door(self):
        self.assertEqual(await self.run_blinds(15, 30, 0), [(cinema.BLIND_LEFT, 0), (cinema.BLIND_RIGHT, 50)])

    async def test_blinds_already_in_place_or_unknown_get_nothing(self):
        self.assertEqual(await self.run_blinds(20, 0, 0), [])
        self.assertEqual(await self.run_blinds(15, None, 50), [])

    async def test_failing_hub_never_raises(self):
        self.assertEqual(await self.run_blinds(20, 30, 30, fail=True), [])

    async def test_blinds_wait_for_the_screen_stop(self):
        # Same 433 MHz band: no blind may move before the screen got its STOP.
        events = []
        release = asyncio.Event()
        async def screen_action():
            events.append('screen-up')
            await release.wait()
            events.append('screen-stop')
        async def blinds():
            events.append('blinds')
        hass = types.SimpleNamespace(states=types.SimpleNamespace(get=lambda _: types.SimpleNamespace(state='off')))
        screen = types.SimpleNamespace(check=lambda: True, open_if_closed=screen_action)
        with patch.object(cinema, 'RF_GAP', 0), patch.object(cinema, 'turn_off_samsung', AsyncMock()), patch.object(cinema, 'ensure_cinema_lights', AsyncMock()):
            task = asyncio.create_task(cinema.start_cinema(hass, screen, 'scene.cinema', AsyncMock(), blinds()))
            await asyncio.sleep(0.05)
            self.assertEqual(events, ['screen-up'])
            release.set()
            await task
        self.assertEqual(events, ['screen-up', 'screen-stop', 'blinds'])

    async def test_blinds_still_move_when_the_screen_failed(self):
        moved = []
        async def failed_screen(): raise RuntimeError('screen-opening-not-confirmed')
        async def blinds(): moved.append(True)
        hass = types.SimpleNamespace(states=types.SimpleNamespace(get=lambda _: types.SimpleNamespace(state='off')))
        screen = types.SimpleNamespace(check=lambda: True, open_if_closed=failed_screen)
        with patch.object(cinema, 'RF_GAP', 0), patch.object(cinema, 'turn_off_samsung', AsyncMock()), patch.object(cinema, 'ensure_cinema_lights', AsyncMock()):
            with self.assertRaisesRegex(RuntimeError, 'screen-opening-not-confirmed'):
                await cinema.start_cinema(hass, screen, 'scene.cinema', AsyncMock(), blinds())
        self.assertEqual(moved, [True])

class StopTests(unittest.IsolatedAsyncioTestCase):
    """«Film stoppen»: screen down, projector off, living room 20 %."""

    def make(self, contact='on', down='RE9XTg==', closes=True):
        calls = []
        state = {'contact': contact}
        async def service(domain, action, data, **_):
            calls.append((domain, action, data.get('command') or data.get('brightness_pct') or data.get('entity_id')))
            if domain == 'remote' and closes:
                state['contact'] = 'off'
        def get_state(entity):
            if entity == cinema.CONTACT: return types.SimpleNamespace(state=state['contact'], attributes={})
            if entity == 'remote.rm4': return types.SimpleNamespace(state='on')
            return None
        hass = types.SimpleNamespace(states=types.SimpleNamespace(get=get_state), services=types.SimpleNamespace(async_call=service))
        settings = {'remote_entity': 'remote.rm4', 'battery_entity': 'sensor.battery', 'up': 'VVA=', 'stop': 'U1RPUA=='}
        if down: settings['down'] = down
        return hass, cinema.ScreenGuard(hass, settings), calls

    async def test_stop_closes_screen_turns_projector_off_and_dims(self):
        hass, screen, calls = self.make()
        off = AsyncMock()
        await cinema.stop_cinema(hass, screen, off)
        off.assert_awaited_once()
        self.assertIn(('remote', 'send_command', 'b64:RE9XTg=='), calls)
        self.assertIn(('light', 'turn_on', 20), calls)
        self.assertEqual(sum(1 for c in calls if c[0] == 'remote'), 1)

    async def test_closed_screen_gets_no_command_but_lights_and_projector_still_go(self):
        hass, screen, calls = self.make(contact='off')
        off = AsyncMock()
        await cinema.stop_cinema(hass, screen, off)
        off.assert_awaited_once()
        self.assertEqual([c for c in calls if c[0] == 'remote'], [])
        self.assertIn(('light', 'turn_on', 20), calls)

    async def test_missing_down_code_still_dims_and_turns_off_then_reports(self):
        hass, screen, calls = self.make(down=None)
        off = AsyncMock()
        with self.assertRaisesRegex(RuntimeError, 'screen-down-not-configured'):
            await cinema.stop_cinema(hass, screen, off)
        off.assert_awaited_once()
        self.assertIn(('light', 'turn_on', 20), calls)

    async def test_screen_that_never_closes_is_reported_without_a_second_down(self):
        hass, screen, calls = self.make(closes=False)
        with patch.object(cinema.asyncio, 'sleep', AsyncMock()):
            with self.assertRaisesRegex(RuntimeError, 'screen-closing-not-confirmed'):
                await screen.close_if_open(timeout=-1)
        self.assertEqual(sum(1 for c in calls if c[0] == 'remote'), 1)
        self.assertFalse(screen.moving)


class ButtonToggleTests(unittest.IsolatedAsyncioTestCase):
    async def setup_toggle(self, contact):
        registered, tasks = {}, []
        def get_state(entity):
            if entity == cinema.CONTACT: return types.SimpleNamespace(state=contact, attributes={})
            if entity == 'scene.cinema': return types.SimpleNamespace(state='scening')
            return None
        hass = types.SimpleNamespace(session=None, states=types.SimpleNamespace(get=get_state),
            services=types.SimpleNamespace(async_call=AsyncMock(), async_register=lambda domain, name, handler: registered.__setitem__(f'{domain}.{name}', handler)),
            bus=types.SimpleNamespace(async_listen_once=lambda *_: None))
        hass.async_create_background_task = lambda coroutine, _name: coroutine.close() or types.SimpleNamespace(cancel=lambda: None)
        hass.async_create_task = lambda coroutine: tasks.append(coroutine)
        contact_listeners.clear()
        await cinema.async_setup(hass, {'shoppinglist_cinema': {'token': 'scoped', 'bridge_id': 'bridge', 'projector_host': '192.168.1.1', 'cinema_scene': 'scene.cinema'}})
        return registered['shoppinglist_cinema.toggle'], tasks

    async def test_closed_screen_starts_cinema(self):
        press, tasks = await self.setup_toggle('off')
        with patch.object(cinema, 'start_cinema', AsyncMock()) as start, patch.object(cinema, 'stop_cinema', AsyncMock()) as stop:
            await press(None)
            while tasks: await tasks.pop(0)
        start.assert_awaited_once()
        stop.assert_not_awaited()

    async def test_open_screen_stops_cinema(self):
        press, tasks = await self.setup_toggle('on')
        with patch.object(cinema, 'start_cinema', AsyncMock()) as start, patch.object(cinema, 'stop_cinema', AsyncMock()) as stop:
            await press(None)
            while tasks: await tasks.pop(0)
        stop.assert_awaited_once()
        start.assert_not_awaited()

    async def test_second_press_while_running_is_ignored(self):
        press, tasks = await self.setup_toggle('off')
        with patch.object(cinema, 'start_cinema', AsyncMock()) as start:
            await press(None)
            await press(None)
            self.assertEqual(len(tasks), 1)
            while tasks: await tasks.pop(0)
            await press(None)
            while tasks: await tasks.pop(0)
        self.assertEqual(start.await_count, 2)

    async def test_press_while_the_screen_moves_is_an_emergency_stop(self):
        guards = []
        class Captured(cinema.ScreenGuard):
            def __init__(self, *args, **kwargs):
                super().__init__(*args, **kwargs)
                guards.append(self)
        with patch.object(cinema, 'ScreenGuard', Captured):
            press, tasks = await self.setup_toggle('on')
        guards[0].moving = True
        with patch.object(Captured, 'stop_burst', AsyncMock()) as burst, patch.object(cinema, 'start_cinema', AsyncMock()) as start, patch.object(cinema, 'stop_cinema', AsyncMock()) as stop:
            await press(None)
            while tasks: await tasks.pop(0)
        burst.assert_awaited_once_with('button')
        start.assert_not_awaited()
        stop.assert_not_awaited()

    async def test_unknown_screen_sensor_does_nothing(self):
        press, tasks = await self.setup_toggle('unavailable')
        with patch.object(cinema, 'start_cinema', AsyncMock()) as start, patch.object(cinema, 'stop_cinema', AsyncMock()) as stop:
            await press(None)
            while tasks: await tasks.pop(0)
        start.assert_not_awaited()
        stop.assert_not_awaited()


class SeekHelperTests(unittest.TestCase):
    def test_only_three_rewind_steps_are_allowed(self):
        self.assertEqual(cinema.SEEK_BACK, {'seek-back:60': 60000, 'seek-back:120': 120000, 'seek-back:300': 300000})

    def test_play_pause_is_a_bridge_action(self):
        import inspect
        self.assertIn("'play-pause'", inspect.getsource(cinema.async_setup))
        # Resume after pause: the Stremio media session decides, not Home Assistant's foreground-app state.
        self.assertIn("await control('play-pause', 'play-pause-failed')", inspect.getsource(cinema.async_setup))
        self.assertNotIn('stremio-not-playing', inspect.getsource(cinema.async_setup))

    def test_xray_frame_is_a_bridge_action(self):
        import inspect
        source = inspect.getsource(cinema.async_setup)
        self.assertIn("'xray-frame'", source)
        self.assertIn("f'{owner}:xray-frame'", source)
        self.assertIn('FRAME_TTL_MS', source)

    def test_frame_is_a_small_jpeg_with_brightness(self):
        import base64, io
        from PIL import Image
        png = io.BytesIO()
        Image.new('RGB', (1920, 1080), (200, 30, 40)).save(png, 'PNG')
        width, height, jpeg, brightness = cinema.encode_frame(base64.b64encode(png.getvalue()).decode())
        self.assertEqual((width, height), (960, 540))
        self.assertTrue(base64.b64decode(jpeg).startswith(b'\xff\xd8'))
        self.assertLess(len(jpeg), 60_000)
        self.assertGreater(brightness, 50)
        with self.assertRaises(RuntimeError):
            cinema.encode_frame('not base64!')
        with self.assertRaises(RuntimeError):
            cinema.encode_frame(base64.b64encode(b'tiny').decode())

    def test_embedded_helper_matches_its_hash(self):
        import base64, hashlib
        self.assertEqual(hashlib.sha256(base64.b64decode(cinema.DEX_BASE64)).hexdigest(), cinema.DEX_SHA256)

if __name__ == '__main__': unittest.main()
