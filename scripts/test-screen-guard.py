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

    async def test_live_closed_opens_once_and_stops(self):
        async def sleep(seconds): self.now += seconds
        with patch.object(screen.asyncio, 'sleep', sleep): await self.guard.open_if_closed()
        self.assertEqual(self.calls, ['b64:UP'] + ['b64:STOP'] * screen.STOP_BURST)
        await self.guard.open_if_closed()
        self.assertEqual(len(self.calls), 1 + screen.STOP_BURST)

    async def test_open_never_moves(self):
        self.states[screen.CONTACT].state = 'on'
        await self.guard.open_if_closed()
        self.assertEqual(self.calls, [])

    async def test_unknown_unavailable_missing_never_move(self):
        for value in ('unknown', 'unavailable', None):
            self.states[screen.CONTACT] = NS(state=value) if value else None
            with self.assertRaisesRegex(RuntimeError, 'sensor-unavailable'): await self.guard.open_if_closed()
        self.assertEqual(self.calls, [])

    async def test_no_battery_or_low_battery_never_move(self):
        for value in ('0', '10', 'unknown', 'unavailable', 'nan', None):
            self.states['battery'] = NS(state=value) if value else None
            with self.assertRaises(RuntimeError): await self.guard.open_if_closed()
        self.assertEqual(self.calls, [])

    async def test_restored_closed_never_moves(self):
        self.states[screen.CONTACT] = NS(state='off', attributes={'restored': True})
        with self.assertRaisesRegex(RuntimeError, 'sensor-not-live'): await self.guard.open_if_closed()
        self.assertEqual(self.calls, [])

    async def test_remote_unavailable_never_moves(self):
        self.states['remote'].state = 'unavailable'
        with self.assertRaisesRegex(RuntimeError, 'remote-unavailable'): await self.guard.open_if_closed()
        self.assertEqual(self.calls, [])

    async def test_failed_up_not_repeated_and_stop_attempted(self):
        async def send(action):
            self.calls.append(action)
            if action == 'up': raise RuntimeError('failed')
        async def sleep(seconds): self.now += seconds
        self.guard.send = send
        with patch.object(screen.asyncio, 'sleep', sleep):
            with self.assertRaisesRegex(RuntimeError, 'failed'): await self.guard.open_if_closed()
        self.assertEqual(self.calls, ['up'] + ['stop'] * screen.STOP_BURST)

    async def test_no_contact_transition_stops(self):
        self.guard.settings['duration'] = 10
        async def send(action): self.calls.append(action)
        async def sleep(seconds): self.now += seconds
        self.guard.send = send
        with patch.object(screen.asyncio, 'sleep', sleep):
            with self.assertRaisesRegex(RuntimeError, 'opening-not-confirmed'): await self.guard.open_if_closed()
        self.assertEqual(self.calls, ['up'] + ['stop'] * screen.STOP_BURST)

    async def test_stop_is_timed_after_the_calibrated_duration(self):
        self.guard.settings['duration'] = 3
        sent_at = []
        async def send(action):
            sent_at.append((action, round(self.now - 1000, 1)))
            if action == 'up': self.states[screen.CONTACT] = NS(state='on')
        async def sleep(seconds): self.now += seconds
        self.guard.send = send
        with patch.object(screen.asyncio, 'sleep', sleep): await self.guard.open_if_closed()
        self.assertEqual(sent_at[0], ('up', 0))
        self.assertEqual(sent_at[1], ('stop', 3.0))
        self.assertFalse(self.guard.moving)

    async def test_failing_stop_is_retried_until_it_goes_out(self):
        attempts = []
        async def send(action):
            if action == 'up':
                self.states[screen.CONTACT] = NS(state='on')
                return
            attempts.append(action)
            if len(attempts) <= 2: raise OSError('broadlink-timeout')
        async def sleep(seconds): self.now += seconds
        self.guard.send = send
        with patch.object(screen.asyncio, 'sleep', sleep): await self.guard.open_if_closed()
        self.assertEqual(len(attempts), 2 + screen.STOP_BURST)
        self.assertFalse(self.guard.moving)

    async def test_stop_that_never_goes_out_is_reported(self):
        attempts = []
        async def send(action):
            if action == 'up':
                self.states[screen.CONTACT] = NS(state='on')
                return
            attempts.append(action)
            raise OSError('broadlink-offline')
        async def sleep(seconds): self.now += seconds
        self.guard.send = send
        with patch.object(screen.asyncio, 'sleep', sleep):
            with self.assertRaisesRegex(RuntimeError, 'screen-stop-not-sent'): await self.guard.open_if_closed()
        self.assertGreater(len(attempts), screen.STOP_BURST)
        self.assertLessEqual(len(attempts), screen.STOP_RETRY_WINDOW / screen.STOP_GAP + 2)
        self.assertFalse(self.guard.moving)

    async def test_cancelled_start_still_sends_every_stop(self):
        self.guard.settings['duration'] = 30
        async def send(action):
            self.calls.append(action)
            if action == 'up': self.states[screen.CONTACT] = NS(state='on')
        self.guard.send = send
        task = asyncio.ensure_future(self.guard.open_if_closed())
        await asyncio.sleep(0.05)
        task.cancel()
        with self.assertRaises(asyncio.CancelledError): await task
        for _ in range(60):
            if self.calls.count('stop') == screen.STOP_BURST: break
            await asyncio.sleep(0.05)
        self.assertEqual(self.calls, ['up'] + ['stop'] * screen.STOP_BURST)

    async def test_emergency_stop_burst(self):
        async def send(action): self.calls.append(action)
        async def sleep(seconds): self.now += seconds
        self.guard.send = send
        with patch.object(screen.asyncio, 'sleep', sleep): await self.guard.stop_burst('button')
        self.assertEqual(self.calls, ['stop'] * screen.STOP_BURST)


if __name__ == '__main__': unittest.main()
