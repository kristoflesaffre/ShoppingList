"""Screen safety checks without sending RF commands."""
import asyncio
import importlib.util
from pathlib import Path
from types import SimpleNamespace as NS
import unittest
from unittest.mock import patch

source = Path(__file__).resolve().parents[1] / 'home-assistant/custom_components/shoppinglist_cinema/screen.py'
spec = importlib.util.spec_from_file_location('screen', source)
screen = importlib.util.module_from_spec(spec)
spec.loader.exec_module(screen)


class GuardTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.now = 1000
        self.calls = []
        self.states = {screen.CONTACT: NS(state='off'), 'battery': NS(state='100'), 'remote': NS(state='on')}
        async def send(domain, action, data, **kwargs):
            self.calls.append(data['command'])
            self.assertEqual(data['num_repeats'], 1)
            if data['command'] == 'b64:UP': self.states[screen.CONTACT] = NS(state='on')
        self.hass = NS(states=NS(get=self.states.get), services=NS(async_call=send))
        self.guard = screen.ScreenGuard(self.hass, {'battery_entity': 'battery', 'remote_entity': 'remote', 'duration': 1, 'up': 'UP', 'stop': 'STOP'}, lambda: self.now)

    def transition(self, old='on', new='off'):
        self.guard.observe(NS(data={'old_state': NS(state=old) if old else None, 'new_state': NS(entity_id=screen.CONTACT, state=new)}))

    async def test_fresh_closed_opens_once_and_stops(self):
        self.transition()
        async def sleep(seconds): self.now += seconds
        with patch.object(screen.asyncio, 'sleep', sleep): await self.guard.open_if_closed()
        self.assertEqual(self.calls, ['b64:UP', 'b64:STOP'])
        self.assertIsNone(self.guard.confirmed_closed_at)
        await self.guard.open_if_closed()
        self.assertEqual(len(self.calls), 2)

    async def test_open_never_moves(self):
        self.states[screen.CONTACT].state = 'on'
        await self.guard.open_if_closed()
        self.assertEqual(self.calls, [])

    async def test_unknown_unavailable_missing_never_move(self):
        for value in ('unknown', 'unavailable', None):
            self.transition()
            self.states[screen.CONTACT] = NS(state=value) if value else None
            with self.assertRaisesRegex(RuntimeError, 'sensor-unavailable'): await self.guard.open_if_closed()
        self.assertEqual(self.calls, [])

    async def test_no_battery_or_low_battery_never_move(self):
        for value in ('0', '10', 'unknown', 'unavailable', 'nan', None):
            self.transition()
            self.states['battery'] = NS(state=value) if value else None
            with self.assertRaises(RuntimeError): await self.guard.open_if_closed()
        self.assertEqual(self.calls, [])

    async def test_cached_recovered_or_stale_closed_never_move(self):
        for previous in (None, 'unknown', 'unavailable', 'off'):
            self.transition(previous)
            with self.assertRaisesRegex(RuntimeError, 'confirmation-stale'): await self.guard.open_if_closed()
        self.transition()
        self.now += 121
        with self.assertRaisesRegex(RuntimeError, 'confirmation-stale'): await self.guard.open_if_closed()
        self.assertEqual(self.calls, [])

    async def test_remote_unavailable_never_moves(self):
        self.transition()
        self.states['remote'].state = 'unavailable'
        with self.assertRaisesRegex(RuntimeError, 'remote-unavailable'): await self.guard.open_if_closed()
        self.assertEqual(self.calls, [])

    async def test_failed_up_not_repeated_and_stop_attempted(self):
        self.transition()
        async def send(action):
            self.calls.append(action)
            if action == 'up': raise RuntimeError('failed')
        self.guard.send = send
        with self.assertRaisesRegex(RuntimeError, 'failed'): await self.guard.open_if_closed()
        self.assertEqual(self.calls, ['up', 'stop'])

    async def test_no_contact_transition_stops(self):
        self.transition()
        self.guard.settings['duration'] = 10
        async def send(action): self.calls.append(action)
        async def sleep(seconds): self.now += seconds
        self.guard.send = send
        with patch.object(screen.asyncio, 'sleep', sleep):
            with self.assertRaisesRegex(RuntimeError, 'opening-not-confirmed'): await self.guard.open_if_closed()
        self.assertEqual(self.calls, ['up', 'stop'])


if __name__ == '__main__': unittest.main()
