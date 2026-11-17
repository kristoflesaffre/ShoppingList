"""Screen safety checks without sending RF commands."""
import asyncio
import base64
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


# A learned DOWN capture like the real one: header, one partial and one clean frame, trailing gap (BroadLink 0xb0).
FRAME = [9, 20, 20, 9] * 24 + [9, 20]
HEADER = [104, 155, 5, 1030, *([12] * 101), 165]
def capture(frames):
    pulses = HEADER + [157] + (FRAME + [165, 157]) * (frames - 1) + FRAME + [1500]
    body = b''.join(bytes([v]) if v < 256 else b'\x00' + v.to_bytes(2, 'big') for v in pulses)
    return base64.b64encode(bytes([0xb0, 0xc0]) + len(body).to_bytes(2, 'little') + body).decode()


class DownCodeTests(unittest.TestCase):
    def test_short_down_capture_gets_six_frames_and_keeps_every_learned_pulse(self):
        short = capture(1)
        self.assertEqual(screen.rf_frames(short), 2)
        long = screen.with_min_frames(short)
        self.assertEqual(screen.rf_frames(long), screen.RF_MIN_FRAMES)
        old = base64.b64decode(short); new = base64.b64decode(long)
        self.assertEqual(new[:2], old[:2])
        self.assertEqual(int.from_bytes(new[2:4], 'little'), len(new) - 4)
        a, b = screen._pulses(old[4:]), screen._pulses(new[4:])
        self.assertEqual(b[:len(a) - 1], a[:-1])
        self.assertEqual(b[-1], a[-1])
        self.assertEqual(len(b) % 2, 0)
        self.assertEqual(screen.with_min_frames(long), long)

    def test_codes_with_enough_frames_or_unreadable_stay_unchanged(self):
        for code in (capture(6), 'RE9XTg==', 'not base64!', ''):
            self.assertEqual(screen.with_min_frames(code), code)

    def test_guard_sends_the_lengthened_down(self):
        guard = screen.ScreenGuard(NS(), {'down': capture(1)})
        self.assertEqual(screen.rf_frames(guard.settings['down']), screen.RF_MIN_FRAMES)


class CloseTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.now = 0
        self.calls = []
        self.states = {screen.CONTACT: NS(state='on'), 'remote': NS(state='on')}
        self.hass = NS(states=NS(get=self.states.get))
        self.guard = screen.ScreenGuard(self.hass, {'remote_entity': 'remote', 'down': 'RE9XTg==', 'stop': 'STOP'}, lambda: self.now)

    async def run_close(self, close_after=None, stop_at=None):
        async def send(action):
            self.calls.append((action, self.now))
            if action == 'down' and close_after is not None and len(self.calls) == close_after:
                self.states[screen.CONTACT] = NS(state='off')
        async def sleep(seconds):
            self.now += seconds
            if stop_at is not None and self.now >= stop_at and not any(a == 'stop' for a, _ in self.calls):
                await self.guard.stop_burst('button')
        self.guard.send = send
        with patch.object(screen.asyncio, 'sleep', sleep):
            await self.guard.close_if_open()

    async def test_screen_that_closes_gets_one_down(self):
        await self.run_close(close_after=1)
        self.assertEqual([a for a, _ in self.calls], ['down'])

    async def test_missed_down_is_sent_once_more_after_the_normal_closing_time(self):
        await self.run_close(close_after=2)
        self.assertEqual([a for a, _ in self.calls], ['down', 'down'])
        self.assertGreater(self.calls[1][1], 35)
        self.assertFalse(self.guard.moving)

    async def test_screen_that_never_closes_gets_two_downs_then_an_error(self):
        with self.assertRaisesRegex(RuntimeError, 'closing-not-confirmed'): await self.run_close()
        self.assertEqual([a for a, _ in self.calls], ['down', 'down'])

    async def test_emergency_stop_while_closing_never_sends_down_again(self):
        with self.assertRaisesRegex(RuntimeError, 'closing-stopped'): await self.run_close(stop_at=10)
        self.assertEqual([a for a, _ in self.calls], ['down', 'stop'])
        self.assertFalse(self.guard.moving)


if __name__ == '__main__': unittest.main()
