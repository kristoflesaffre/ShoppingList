"""Fail-closed screen movement, gated by a live closed reading of the contact sensor."""
import asyncio
import logging
import math
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
            if not left_closed:
                raise RuntimeError('screen-opening-not-confirmed')
        finally:
            # An uncertain UP is never repeated; STOP always goes out (a burst, retried on failure).
            try:
                await self.stop_burst()
            finally:
                self.moving = False
