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
# Power fallback (bridge 1.37.0): the screen's mains run through a SONOFF S60ZBTPF plug (ZHA). Measured 28/11: the
# motor draws 108–114 W / 0.5 A while it runs and 0 W / 0.03 A when it stands still; the plug reported the current
# dropping ± 2.6 s after the STOP, the power only after ± 7 s. If no «stopped» reading arrives within POWER_CUT_AFTER s
# of the timed STOP (or the STOP could not be sent at all), the plug cuts the screen's power, which stops the motor
# whatever it does with RF, and switches it back on POWER_RESTORE_AFTER s later so the screen keeps working.
POWER_SWITCH = 'switch.sonoff_s60zbtpf'
POWER_SENSOR = 'sensor.sonoff_s60zbtpf_power'
CURRENT_SENSOR = 'sensor.sonoff_s60zbtpf_current'
RUNNING_WATTS = 30
RUNNING_AMPS = 0.15
POWER_CUT_AFTER = 3.5
POWER_POLL = 0.5
POWER_RESTORE_AFTER = 5
# After the power came back (cut earlier, or the plug was off): the motor's receiver needs a moment before it hears RF.
POWER_BOOT_WAIT = 3


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


def motor_reading(state, running_at):
    """True = running, False = stopped, None = no usable reading."""
    try:
        value = float(state.state)
    except (AttributeError, TypeError, ValueError):
        return None
    return value >= running_at if math.isfinite(value) else None


class ScreenGuard:
    def __init__(self, hass, settings, clock=time.monotonic):
        self.hass = hass
        self.settings = settings
        self.clock = clock
        self.moving = False
        self.last_stop = float('-inf')
        self.power_switch = settings.get('power_switch', POWER_SWITCH)
        self.power_sensors = ((settings.get('power_sensor', POWER_SENSOR), RUNNING_WATTS), (settings.get('current_sensor', CURRENT_SENSOR), RUNNING_AMPS))
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

    def motor_running(self, entities=None):
        """From the plug: True when a sensor reads the motor running, False when one reads it stopped (the current
        drops first), None without a usable reading. `entities`: only these sensors (the ones that read the motor
        running during this run, so a reading from before the run never counts as «stopped»)."""
        readings = [motor_reading(self.hass.states.get(entity), limit) for entity, limit in self.power_sensors
                    if entities is None or entity in entities]
        if False in readings:
            return False
        return True if True in readings else None

    def sensors_running(self):
        return {entity for entity, limit in self.power_sensors if motor_reading(self.hass.states.get(entity), limit)}

    async def refresh_power(self):
        # Ask the plug for fresh values instead of waiting for its own report; never longer than one poll.
        try:
            await asyncio.wait_for(self.hass.services.async_call('homeassistant', 'update_entity', {
                'entity_id': [entity for entity, _ in self.power_sensors]}, blocking=True), POWER_POLL)
        except Exception:
            pass

    async def power(self, on):
        await asyncio.wait_for(self.hass.services.async_call('switch', 'turn_on' if on else 'turn_off', {
            'entity_id': self.power_switch}, blocking=True), 5)

    async def ensure_power(self):
        # A screen without power ignores UP. Plug off (cut earlier and not restored, or switched off by hand): on, then
        # give the motor a moment. Plug unknown or missing: go on as before the plug existed (logged).
        plug = self.hass.states.get(self.power_switch)
        if plug is None or plug.state not in ('on', 'off'):
            _LOGGER.warning('Screen power plug %s is %s: no power fallback for this run', self.power_switch, getattr(plug, 'state', 'missing'))
            return
        if plug.state == 'off':
            _LOGGER.warning('Screen power plug was off: switching it on before the screen moves')
            await self.power(True)
            await asyncio.sleep(POWER_BOOT_WAIT)

    async def power_fallback(self, seen, stop_at):
        """From the STOP moment on: a sensor that read the motor running during this run (`seen`) must read «stopped»
        within POWER_CUT_AFTER s, else the screen's power is cut. Runs beside the STOP itself, so a STOP that is slow
        to go out or never goes out does not delay the cut."""
        plug = self.hass.states.get(self.power_switch)
        if plug is None or plug.state != 'on':
            return
        if not seen:
            # The plug never read this run's motor (UP failed, or no readings): it cannot judge, so it does nothing.
            _LOGGER.warning('Screen power plug never read the motor running: power fallback skipped')
            return
        while self.clock() - stop_at < POWER_CUT_AFTER:
            # Sleep first: the STOP goes out undisturbed, and the plug needs ± 2.6 s to report a stopped motor anyway.
            await asyncio.sleep(POWER_POLL)
            await self.refresh_power()
            if self.motor_running(seen) is False:
                return
        if self.motor_running(seen) is False:
            return
        _LOGGER.error('Screen still running %.1f s after its STOP moment: cutting its power', self.clock() - stop_at)
        try:
            await self.power(False)
        except Exception as failure:
            _LOGGER.error('Screen power could not be cut: %s', type(failure).__name__)
            return
        await asyncio.sleep(POWER_RESTORE_AFTER)
        try:
            await self.power(True)
            _LOGGER.warning('Screen power back on after the cut')
        except Exception as failure:
            _LOGGER.error('Screen power could not be switched back on: %s', type(failure).__name__)

    async def finish_run(self, seen):
        # STOP and the power check side by side, as one shielded step: a cancelled start (HA restart, failure
        # elsewhere) still sends the STOP and still checks the motor. Raises screen-stop-not-sent afterwards.
        async def run():
            stop_at = self.clock()
            stop, check = await asyncio.gather(self.stop_burst(), self.power_fallback(seen, stop_at), return_exceptions=True)
            if isinstance(check, BaseException):
                _LOGGER.error('Screen power check failed: %s', type(check).__name__)
            if isinstance(stop, BaseException):
                raise stop
        await asyncio.shield(asyncio.ensure_future(run()))

    async def open_if_closed(self):
        if not self.check():
            return
        duration = self.settings.get('duration')
        if isinstance(duration, bool) or not isinstance(duration, (float, int)) or not math.isfinite(duration) or not 0.1 <= duration <= 60:
            raise RuntimeError('screen-duration-invalid')
        remote = self.hass.states.get(self.settings['remote_entity'])
        if not remote or remote.state in ('unknown', 'unavailable'):
            raise RuntimeError('screen-remote-unavailable')
        await self.ensure_power()
        # Recheck after all preparation. Nothing is awaited between this check and dispatch.
        if not self.check():
            return
        self.moving = True
        started = self.clock()
        left_closed = False
        seen = set()
        try:
            await asyncio.wait_for(self.send('up'), 5)
            while self.clock() - started < duration:
                seen |= self.sensors_running()
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
            # An uncertain UP is never repeated; STOP always goes out, right away (a burst, retried on failure). Then
            # the plug checks that the motor really stopped, and cuts its power if not.
            try:
                await self.finish_run(seen)
            finally:
                self.moving = False
