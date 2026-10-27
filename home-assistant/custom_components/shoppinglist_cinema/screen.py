"""Fail-closed screen movement, gated by a recent actual contact transition."""
import asyncio
import math
import time

CONTACT = 'binary_sensor.gang_beneden_voordeur_opening'
FRESH_SECONDS = 120
MIN_BATTERY = 10


class ScreenGuard:
    def __init__(self, hass, settings, clock=time.monotonic):
        self.hass = hass
        self.settings = settings
        self.clock = clock
        self.confirmed_closed_at = None
        self.moving = False

    def observe(self, event):
        old = event.data.get('old_state')
        new = event.data.get('new_state')
        if not new or new.entity_id != CONTACT:
            return
        if new.state != 'off':
            self.confirmed_closed_at = None
        elif old and old.state == 'on' and not getattr(new, 'attributes', {}).get('restored'):
            # Initial/restored/cached states and availability recovery cannot arm movement.
            self.confirmed_closed_at = self.clock()

    def check(self):
        contact = self.hass.states.get(CONTACT)
        if not contact or contact.state not in ('on', 'off'):
            raise RuntimeError('screen-sensor-unavailable')
        if contact.state == 'on':
            return False
        battery = self.hass.states.get(self.settings['battery_entity'])
        try:
            level = float(battery.state)
        except (AttributeError, TypeError, ValueError):
            raise RuntimeError('screen-battery-unknown') from None
        if not math.isfinite(level) or not MIN_BATTERY < level <= 100:
            raise RuntimeError('screen-battery-low')
        if self.confirmed_closed_at is None or not 0 <= self.clock() - self.confirmed_closed_at <= FRESH_SECONDS:
            raise RuntimeError('screen-closed-confirmation-stale')
        if self.moving:
            raise RuntimeError('screen-already-moving')
        return True

    async def send(self, action):
        await self.hass.services.async_call('remote', 'send_command', {
            'entity_id': self.settings['remote_entity'],
            'command': 'b64:' + self.settings[action],
            'num_repeats': 1,
        }, blocking=True)

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
        self.confirmed_closed_at = None
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
            # An uncertain UP is never repeated; still attempt one bounded STOP.
            try:
                await asyncio.shield(asyncio.wait_for(self.send('stop'), 5))
            finally:
                self.moving = False
