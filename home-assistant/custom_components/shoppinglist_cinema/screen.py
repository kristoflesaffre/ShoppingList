"""Fail-closed screen movement, gated by a live closed reading of the contact sensor."""
import asyncio
import base64
import binascii
import logging
import math
import time

_LOGGER = logging.getLogger(__name__)

CONTACT = 'binary_sensor.gang_beneden_voordeur_opening'
MIN_BATTERY = 10
# The screen has no position feedback: the timed STOP is the only thing that stops it. ONE STOP per run. From
# 1.16.0 to 1.24.0 STOP went out three times (0.6 s apart) on the assumption that a STOP to a motor that already
# stands still does nothing; since then almost every start ran into the ceiling (12–16/11), consistent with this motor
# treating a second STOP while stationary as «go on / go to the favourite position». A send that fails (exception or
# timeout) is still retried within STOP_RETRY_WINDOW; a send that succeeded is never repeated.
STOP_BURST = 1
STOP_GAP = 0.6
STOP_RETRY_WINDOW = 8
STOP_SEND_TIMEOUT = 3
# Logged when Home Assistant's event loop reaches the STOP moment late (the STOP then goes out late too).
LOOP_LATE_WARNING = 0.5
# The learned DOWN code holds the button's frame only once (a very short press while learning: 182 ms), UP and STOP
# hold it six times (± 450 ms, like a normal press). The motor needs a few matching frames in a row, so DOWN alone was
# missed now and then (3 of 13 closings 10–16/11 took 41–46 s instead of 34–35 s: closed by hand; UP never failed).
# Sent with its last frame repeated until it has RF_MIN_FRAMES, as one continuous transmission like a held button.
RF_MIN_FRAMES = 6
# Closing takes 34–35 s from DOWN to the contact reading closed. Not closed after CLOSE_CONFIRM_AFTER s: the motor
# did not take the DOWN (or stopped), so DOWN goes out once more; not closed CLOSE_RETRY_TIMEOUT s after that = error.
CLOSE_CONFIRM_AFTER = 45
CLOSE_RETRY_TIMEOUT = 50
# BroadLink timing unit: one tick = 8192 / 269 µs. A pulse longer than ± 3 ms separates two frames.
FRAME_GAP_TICKS = 100
MIN_FRAME_PULSES = 40


def _pulses(body):
    pulses, i = [], 0
    while i < len(body):
        if body[i] == 0:
            if i + 2 >= len(body):
                raise ValueError('truncated pulse')
            pulses.append(int.from_bytes(body[i + 1:i + 3], 'big'))
            i += 3
        else:
            pulses.append(body[i])
            i += 1
    return pulses


def _encode(pulses):
    out = bytearray()
    for value in pulses:
        if not 0 < value <= 0xFFFF:
            raise ValueError('pulse out of range')
        out += bytes([value]) if value < 256 else b'\x00' + value.to_bytes(2, 'big')
    return bytes(out)


def rf_frames(code):
    """Number of complete frames in a learned BroadLink RF code (groups of pulses between long gaps)."""
    raw = base64.b64decode(code, validate=True)
    pulses = _pulses(raw[4:4 + int.from_bytes(raw[2:4], 'little')])
    frames = count = 0
    for value in pulses:
        count += 1
        if value > FRAME_GAP_TICKS:
            frames += count >= MIN_FRAME_PULSES
            count = 0
    return frames + (count >= MIN_FRAME_PULSES)


def with_min_frames(code, frames=RF_MIN_FRAMES):
    """The same learned RF code with its last frame repeated until it holds `frames` frames: what the remote sends
    while its button is held a little longer. The header and every captured pulse stay exactly as learned; a code that
    already has enough frames (UP, STOP) or cannot be read is returned unchanged."""
    try:
        raw = base64.b64decode(code, validate=True)
        length = int.from_bytes(raw[2:4], 'little')
        body, tail = raw[4:4 + length], raw[4 + length:]
        if len(body) != length:
            return code
        pulses = _pulses(body)
        missing = frames - rf_frames(code)
        # Layout of the end of a capture: … gap · sync · frame (MIN_FRAME_PULSES+ short pulses) · trailing gap.
        gaps = [i for i, value in enumerate(pulses) if value > FRAME_GAP_TICKS]
        if missing <= 0 or len(pulses) % 2 or len(gaps) < 3 or gaps[-1] != len(pulses) - 1:
            return code
        sync, gap = gaps[-2], gaps[-2] - 1
        frame = pulses[sync + 1:-1]
        if gap not in gaps or sync % 2 or len(frame) < MIN_FRAME_PULSES or len(frame) % 2 or max(frame) > FRAME_GAP_TICKS:
            return code
        unit = [pulses[sync], *frame, pulses[gap]]
        extended = pulses[:-1] + [pulses[gap]] + unit * (missing - 1) + [pulses[sync], *frame, pulses[-1]]
        new_body = _encode(extended)
        if len(new_body) > 0xFFFF:
            return code
        return base64.b64encode(raw[:2] + len(new_body).to_bytes(2, 'little') + new_body + tail).decode()
    except (binascii.Error, ValueError):
        return code


class ScreenGuard:
    def __init__(self, hass, settings, clock=time.monotonic):
        self.hass = hass
        self.settings = settings
        self.clock = clock
        self.moving = False
        self.last_stop = float('-inf')
        # DOWN with enough frames for the motor to take it reliably (see RF_MIN_FRAMES).
        if settings.get('down'):
            down = with_min_frames(settings['down'])
            if down == settings['down'] and rf_frames(down) < RF_MIN_FRAMES:
                _LOGGER.warning('Screen DOWN code could not be lengthened (%s frames)', rf_frames(down))
            self.settings = {**settings, 'down': down}

    def check(self):
        contact = self.hass.states.get(CONTACT)
        if not contact or contact.state not in ('on', 'off'):
            raise RuntimeError('screen-sensor-unavailable')
        if contact.state == 'on':
            return False
        # A state restored from before a restart is not a live reading of the screen.
        if getattr(contact, 'attributes', {}).get('restored'):
            raise RuntimeError('screen-sensor-not-live')
        battery = self.hass.states.get(self.settings['battery_entity'])
        try:
            level = float(battery.state)
        except (AttributeError, TypeError, ValueError):
            raise RuntimeError('screen-battery-unknown') from None
        if not math.isfinite(level) or not MIN_BATTERY < level <= 100:
            raise RuntimeError('screen-battery-low')
        if self.moving:
            raise RuntimeError('screen-already-moving')
        return True

    async def send(self, action):
        await self.hass.services.async_call('remote', 'send_command', {
            'entity_id': self.settings['remote_entity'],
            'command': 'b64:' + self.settings[action],
            'num_repeats': 1,
        }, blocking=True)

    async def stop_burst(self, reason='run-ended'):
        """STOP_BURST successful STOPs, STOP_GAP apart; failures are retried until STOP_RETRY_WINDOW has passed.
        Never cancelled half-way by the caller (shielded) and never raises before it tried: raises only when not
        a single STOP could be sent, so the failure is reported instead of swallowed."""
        async def run():
            started = self.clock()
            self.last_stop = started
            sent = failed = 0
            while sent < STOP_BURST:
                try:
                    await asyncio.wait_for(self.send('stop'), STOP_SEND_TIMEOUT)
                    sent += 1
                    took = self.clock() - started
                    if sent == 1 and took > LOOP_LATE_WARNING:
                        _LOGGER.warning('First screen STOP took %.1f s to send (%s)', took, reason)
                except Exception as failure:
                    failed += 1
                    _LOGGER.warning('Screen STOP attempt %s failed (%s): %s', sent + failed, reason, type(failure).__name__)
                if sent >= STOP_BURST or self.clock() - started > STOP_RETRY_WINDOW:
                    break
                await asyncio.sleep(STOP_GAP)
            if sent:
                _LOGGER.info('Screen STOP sent %s× (%s, %s failed)', sent, reason, failed)
            else:
                _LOGGER.error('Screen STOP could not be sent (%s): the screen may still be moving', reason)
                raise RuntimeError('screen-stop-not-sent')
        await asyncio.shield(asyncio.ensure_future(run()))

    async def close_if_open(self, timeout=CLOSE_CONFIRM_AFTER, retry_timeout=CLOSE_RETRY_TIMEOUT):
        # «Film stoppen»: DOWN, the motor runs to its own end stop (no STOP needed). Done when the contact reads closed.
        # Still open after `timeout` s (closing normally takes 34–35 s): the motor did not take the DOWN, so it goes out
        # once more; never after a STOP (emergency STOP with the button during closing).
        contact = self.hass.states.get(CONTACT)
        if not contact or contact.state not in ('on', 'off'):
            raise RuntimeError('screen-sensor-unavailable')
        if contact.state == 'off':
            return
        if not self.settings.get('down'):
            raise RuntimeError('screen-down-not-configured')
        if self.moving:
            raise RuntimeError('screen-already-moving')
        remote = self.hass.states.get(self.settings['remote_entity'])
        if not remote or remote.state in ('unknown', 'unavailable'):
            raise RuntimeError('screen-remote-unavailable')
        self.moving = True
        try:
            for attempt, wait in enumerate((timeout, retry_timeout)):
                if attempt:
                    _LOGGER.warning('Screen still open %s s after DOWN: sending DOWN once more', timeout)
                await asyncio.wait_for(self.send('down'), 5)
                started = self.clock()
                while True:
                    contact = self.hass.states.get(CONTACT)
                    if contact and contact.state == 'off':
                        if attempt:
                            _LOGGER.warning('Screen closed after the second DOWN')
                        return
                    if self.last_stop >= started:
                        raise RuntimeError('screen-closing-stopped')
                    if self.clock() - started > wait:
                        break
                    await asyncio.sleep(0.5)
            raise RuntimeError('screen-closing-not-confirmed')
        finally:
            self.moving = False

    async def open_if_closed(self):
        if not self.check():
            return
        duration = self.settings.get('duration')
        if isinstance(duration, bool) or not isinstance(duration, (float, int)) or not math.isfinite(duration) or not 0.1 <= duration <= 60:
            raise RuntimeError('screen-duration-invalid')
        remote = self.hass.states.get(self.settings['remote_entity'])
        if not remote or remote.state in ('unknown', 'unavailable'):
            raise RuntimeError('screen-remote-unavailable')
        # Recheck after all preparation. Nothing is awaited between this check and dispatch.
        if not self.check():
            return
        self.moving = True
        started = self.clock()
        left_closed = False
        try:
            await asyncio.wait_for(self.send('up'), 5)
            while self.clock() - started < duration:
                contact = self.hass.states.get(CONTACT)
                if not contact or contact.state not in ('on', 'off'):
                    raise RuntimeError('screen-sensor-lost-during-motion')
                if contact.state == 'on':
                    left_closed = True
                elif left_closed:
                    raise RuntimeError('screen-returned-closed-during-motion')
                if not left_closed and self.clock() - started > 5:
                    raise RuntimeError('screen-opening-not-confirmed')
                await asyncio.sleep(min(0.1, max(0, duration - (self.clock() - started))))
            late = self.clock() - started - duration
            if late > LOOP_LATE_WARNING:
                _LOGGER.warning('Home Assistant was %.1f s late at the screen STOP moment', late)
            if not left_closed:
                raise RuntimeError('screen-opening-not-confirmed')
        finally:
            # An uncertain UP is never repeated; STOP always goes out, right away (a burst, retried on failure).
            try:
                await self.stop_burst()
            finally:
                self.moving = False
