"""Exercise the Pi worker without a Home Assistant install or physical commands."""
import asyncio
import importlib.util
from pathlib import Path
import sys
import types
import unittest
from unittest.mock import AsyncMock, patch

for name in ('homeassistant', 'homeassistant.const', 'homeassistant.core', 'homeassistant.helpers', 'homeassistant.helpers.aiohttp_client', 'homeassistant.helpers.event'):
    sys.modules[name] = types.ModuleType(name)
sys.modules['homeassistant.core'].callback = lambda function: function
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
                self.assertEqual(started, ['samsung', 'lights', 'projector', 'screen'])
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
        hass = types.SimpleNamespace(session=Session(), states=types.SimpleNamespace(get=get_state), services=types.SimpleNamespace(async_call=service), bus=types.SimpleNamespace(async_listen_once=lambda *_: None, async_listen=lambda *_: lambda: None))
        captured = []
        hass.async_create_background_task = lambda coroutine, _name: captured.append(coroutine) or types.SimpleNamespace(cancel=lambda: None)
        await cinema.async_setup(hass, {'shoppinglist_cinema': {'token': 'scoped', 'bridge_id': 'bridge', 'projector_host': '192.168.1.1', 'cinema_scene': 'scene.cinema'}})
        # The last sleep ends the worker after one iteration; no real network or hardware.
        with patch.object(cinema.asyncio, 'open_connection', AsyncMock(side_effect=OSError)), patch.object(cinema.asyncio, 'sleep', AsyncMock(side_effect=asyncio.CancelledError)):
            with self.assertRaises(asyncio.CancelledError): await captured[0]
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
    """Screen opened by hand wakes the projector once; cinema commands and booting projectors are left alone."""

    async def setup_bridge(self, power='off'):
        calls, tasks = [], []
        state = {'power': power}
        async def service(domain, action, data, **_):
            calls.append(action)
            if action == 'turn_off':
                state['power'] = 'off'
            if domain == 'rest_command':
                state['power'] = 'on'
                return {'status': 200}
        def get_state(entity):
            return types.SimpleNamespace(state=state['power']) if entity == cinema.PLAYER else None
        hass = types.SimpleNamespace(session=None, states=types.SimpleNamespace(get=get_state), services=types.SimpleNamespace(async_call=service), bus=types.SimpleNamespace(async_listen_once=lambda *_: None))
        hass.async_create_background_task = lambda coroutine, _name: coroutine.close() or types.SimpleNamespace(cancel=lambda: None)
        hass.async_create_task = lambda coroutine: tasks.append(coroutine)
        contact_listeners.clear()
        await cinema.async_setup(hass, {'shoppinglist_cinema': {'token': 'scoped', 'bridge_id': 'bridge', 'projector_host': '192.168.1.1', 'cinema_scene': 'scene.cinema'}})
        entities, listener = contact_listeners[0]
        self.assertEqual(entities, ['binary_sensor.gang_beneden_voordeur_opening'])
        def change(old, new, restored=False):
            listener(types.SimpleNamespace(data={'old_state': types.SimpleNamespace(state=old), 'new_state': types.SimpleNamespace(state=new, attributes={'restored': restored})}))
        async def run_tasks():
            with patch.object(cinema.asyncio, 'open_connection', AsyncMock(side_effect=OSError)):
                while tasks: await tasks.pop(0)
        return change, run_tasks, calls

    async def test_screen_opening_wakes_projector_once(self):
        change, run_tasks, calls = await self.setup_bridge()
        change('off', 'on')
        await run_tasks()
        self.assertEqual(calls, ['xgimi_wake_atom'])
        # Closed again: one turn-off. Reopened within the cooldown: no second press while it may still be shutting down.
        change('on', 'off')
        await run_tasks()
        change('off', 'on')
        await run_tasks()
        self.assertEqual(calls, ['xgimi_wake_atom', 'turn_off'])

    async def test_projector_already_on_is_not_pressed(self):
        change, run_tasks, calls = await self.setup_bridge(power='idle')
        change('off', 'on')
        await run_tasks()
        self.assertEqual(calls, [])

    async def test_screen_closing_turns_projector_off_once(self):
        change, run_tasks, calls = await self.setup_bridge(power='playing')
        change('on', 'off')
        await run_tasks()
        self.assertEqual(calls, ['turn_off'])

    async def test_screen_closing_sends_nothing_to_an_off_or_unknown_projector(self):
        for power in ('off', 'unavailable'):
            change, run_tasks, calls = await self.setup_bridge(power=power)
            change('on', 'off')
            await run_tasks()
            self.assertEqual(calls, [])

    async def test_recovery_or_restored_state_is_not_an_opening(self):
        change, run_tasks, calls = await self.setup_bridge()
        change('unavailable', 'on'); change('off', 'on', restored=True); change('unavailable', 'off')
        await run_tasks()
        self.assertEqual(calls, [])

if __name__ == '__main__': unittest.main()
