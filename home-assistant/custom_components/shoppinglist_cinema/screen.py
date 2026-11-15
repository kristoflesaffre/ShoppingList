"""Fail-closed screen movement, gated by a live closed reading of the contact sensor."""
import asyncio
import base64
import logging
import math
import threading
import time

_LOGGER = logging.getLogger(__name__)

CONTACT = 'binary_sensor.gang_beneden_voordeur_opening'
MIN_BATTERY = 10
# The screen has no position feedback: a STOP that never reaches the motor lets it run to its end stop. «Sent» from
# the BroadLink does not mean received (433 MHz is shared with the BREL blinds) and a single failing call used to
# end the attempt. So STOP goes out several times, and a failing send keeps being retried for a short window.
# The learned codes are fixed (no rolling code): a STOP to a motor that already stands still does nothing.
STOP_BURST = 3
STOP_GAP = 0.6
STOP_RETRY_WINDOW = 8
STOP_SEND_TIMEOUT = 3
# The STOP after an UP is timed: 0.5–2.5 s late was enough for the screen to hit the ceiling. Home Assistant's event loop
# can stall for seconds (e.g. while the Android TV integration reconnects to a booting projector), so the timed STOP is
# sent from its own thread straight through the BroadLink device, independent of the loop. The usual burst through
# Home Assistant follows as a backup (a STOP to a motor that stands still does nothing).
LOOP_LATE_WARNING = 0.5


class _StopTimer:
    """Sends STOP_BURST STOPs at `deadline` (same monotonic clock) from a daemon thread; `now()` fires them at once."""

    def __init__(self, api, packet, deadline, clock):
        self.api, self.packet, self.deadline, self.clock = api, packet, deadline, clock
        self.fire = threading.Event()
        self.done = threading.Event()
        self.sent = 0
        self.first_sent_at = None
        self.error = None
        self.thread = threading.Thread(target=self._run, name='shoppinglist-screen-stop', daemon=True)

    def start(self):
        self.thread.start()
        return self

    def now(self):
        self.fire.set()

    def _run(self):
        try:
            while not self.fire.is_set():
                left = self.deadline - self.clock()
                if left <= 0:
                    break
                self.fire.wait(min(left, 0.05))
            for attempt in range(STOP_BURST):
                try:
                    self.api.send_data(self.packet)
                    self.sent += 1
                    if self.first_sent_at is None:
                        self.first_sent_at = self.clock()
                except Exception as failure:
                    self.error = type(failure).__name__
                if attempt < STOP_BURST - 1:
                    time.sleep(STOP_GAP)
        finally:
            self.done.set()


class ScreenGuard:
    def __init__(self, hass, settings, clock=time.monotonic):
        self.hass = hass
        self.settings = settings
        self.clock = clock
        self.moving = False

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

    def _broadlink_api(self):
        """The python-broadlink device behind the remote entity, or None (then only the Home Assistant path is used)."""
        try:
            from homeassistant.helpers import entity_registry as er
            entry = er.async_get(self.hass).async_get(self.settings['remote_entity'])
            entry_id = entry.config_entry_id if entry else None
            config_entry = self.hass.config_entries.async_get_entry(entry_id) if entry_id else None
            device = getattr(config_entry, 'runtime_data', None)
            if getattr(device, 'api', None) is None:
                data = self.hass.data.get('broadlink')
                device = getattr(data, 'devices', {}).get(entry_id) if data is not None else None
            api = getattr(device, 'api', None)
            return api if callable(getattr(api, 'send_data', None)) else None
        except Exception:
            return None

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
            sent = failed = 0
            while sent < STOP_BURST:
                try:
                    await asyncio.wait_for(self.send('stop'), STOP_SEND_TIMEOUT)
                    sent += 1
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

    async def close_if_open(self, timeout=90):
        # «Film stoppen»: one DOWN, the motor runs to its own end stop (no STOP needed). Done when the contact
        # reads closed again; an uncertain DOWN is never repeated.
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
            await asyncio.wait_for(self.send('down'), 5)
            started = self.clock()
            while True:
                contact = self.hass.states.get(CONTACT)
                if contact and contact.state == 'off':
                    return
                if self.clock() - started > timeout:
                    raise RuntimeError('screen-closing-not-confirmed')
                await asyncio.sleep(0.5)
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
        timer = None
        try:
            stop_code = self.settings.get('stop')
            api = self._broadlink_api() if stop_code else None
            if api is None:
                _LOGGER.warning('Screen STOP timer unavailable (no BroadLink device found): STOP goes through Home Assistant only')
            if api is not None:
                try:
                    timer = _StopTimer(api, base64.b64decode(stop_code), started + duration, self.clock).start()
                except Exception:
                    timer = None
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
                _LOGGER.warning('Home Assistant was %.1f s late at the screen STOP moment%s', late,
                                '' if timer else ' (no BroadLink timer: STOP was late too)')
            if not left_closed:
                raise RuntimeError('screen-opening-not-confirmed')
        finally:
            # An uncertain UP is never repeated; STOP always goes out: the timed one from its own thread (fired at once
            # when the run is cut short), then the usual burst through Home Assistant as a backup.
            try:
                if timer is not None:
                    timer.now()
                    for _ in range(int((STOP_BURST * (STOP_GAP + STOP_SEND_TIMEOUT)) / 0.05)):
                        if timer.done.is_set():
                            break
                        await asyncio.sleep(0.05)
                    if timer.first_sent_at is not None:
                        _LOGGER.info('Timed screen STOP sent %s× by the BroadLink timer, %.2f s after the deadline',
                                     timer.sent, timer.first_sent_at - started - duration)
                    else:
                        _LOGGER.warning('BroadLink STOP timer failed (%s): Home Assistant STOP only', timer.error)
                await self.stop_burst()
            finally:
                self.moving = False
