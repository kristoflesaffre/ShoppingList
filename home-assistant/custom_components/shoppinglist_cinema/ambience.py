"""«Sfeer op tv» + «Ook rond de tv» on the Pi, so the Mac can stay off.

- TV: wake the Samsung, restart YouTube (so it opens on «Wie kijkt er?»), pick Chloé (leftmost profile) and play a
  video through YouTube's Lounge API, the same route the YouTube phone app uses. Same sequence as the Mac had
  (src/lib/server/samsung-tv.ts).
- Projector: settings (on/off, TV corners, margin, soft edge, blur, spread, calibrating) come from the app as
  `ambience-set:<base64url JSON>`, are validated here, stored next to the configuration and handed to the projector
  app «ShoppingList Sfeer» as an intent extra. The app follows the TV's YouTube itself.
"""
import asyncio
import base64
import json
import re
import socket
import time
import uuid
from pathlib import Path

YOUTUBE_APP = '111299001912'
LOUNGE_BIND = 'https://www.youtube.com/api/lounge/bc/bind'
VIDEO_ID = re.compile(r'^[A-Za-z0-9_-]{11}$')
CORNERS = ('tl', 'tr', 'br', 'bl')
DEFAULT_TV_MAC = 'a4:30:7a:32:47:51'


def _number(value, low, high):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError
    if value != value or value < low or value > high:
        raise ValueError
    return float(value)


def parse_settings(payload):
    """`ambience-set:<base64url>` payload -> clean dict, or None. Only known fields, every number in range."""
    try:
        if len(payload) > 1500 or not re.fullmatch(r'[A-Za-z0-9_-]+', payload):
            return None
        raw = json.loads(base64.urlsafe_b64decode(payload + '=' * (-len(payload) % 4)).decode())
        if not isinstance(raw, dict):
            return None
        mask = raw.get('mask')
        if not isinstance(mask, dict) or not isinstance(mask.get('corners'), dict):
            return None
        corners = {}
        for key in CORNERS:
            point = mask['corners'].get(key)
            if not isinstance(point, list) or len(point) != 2:
                return None
            corners[key] = [_number(point[0], 0, 1), _number(point[1], 0, 1)]
        if not isinstance(mask.get('blur'), bool) or not isinstance(raw.get('enabled'), bool) or not isinstance(raw.get('calibrating'), bool):
            return None
        if raw.get('open') not in ('show', 'show-if-tv', 'hide', 'push'):
            return None
        return {
            'enabled': raw['enabled'],
            'calibrating': raw['calibrating'],
            'open': raw['open'],
            'mask': {
                'corners': corners,
                'margin': _number(mask.get('margin'), 0, 10),
                'soft': _number(mask.get('soft'), 0, 3),
                'blur': mask['blur'],
                'spread': _number(mask.get('spread', 1.8), 1.2, 3),
            },
        }
    except (ValueError, TypeError, KeyError, json.JSONDecodeError, UnicodeDecodeError, base64.binascii.Error):
        return None


def app_extra(settings):
    """Settings for the projector app as one shell-safe base64url string (no padding)."""
    data = json.dumps({'enabled': settings.get('enabled', False), 'calibrating': settings.get('calibrating', False), 'mask': settings.get('mask')}, separators=(',', ':'))
    return base64.urlsafe_b64encode(data.encode()).decode().rstrip('=')


class SettingsStore:
    """Last settings from the app, kept next to the configuration so a restart does not forget the TV corners."""

    def __init__(self, path):
        self.path = Path(path) if path else None
        self.value = None

    def load(self):
        if not self.path:
            return None
        try:
            data = json.loads(self.path.read_text())
            self.value = data if isinstance(data, dict) else None
        except (OSError, ValueError):
            self.value = None
        return self.value

    def save(self, value):
        self.value = value
        if not self.path:
            return
        self.path.write_text(json.dumps(value))
        self.path.chmod(0o600)


def magic_packet(mac):
    octets = bytes(int(part, 16) for part in mac.split(':'))
    if len(octets) != 6:
        raise ValueError
    return b'\xff' * 6 + octets * 16


def send_wol(host, mac):
    packet = magic_packet(mac)
    broadcast = '.'.join(host.split('.')[:3] + ['255'])
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_BROADCAST, 1)
        for target in (broadcast, host):
            sock.sendto(packet, (target, 9))


async def youtube_running(session, host):
    try:
        response = await asyncio.wait_for(session.get(f'http://{host}:8001/api/v2/applications/{YOUTUBE_APP}'), 4)
        async with response:
            data = await response.json(content_type=None)
        return bool((data or {}).get('running')) and bool((data or {}).get('visible', True))
    except Exception:
        return False


async def restart_youtube(session, host):
    url = f'http://{host}:8001/api/v2/applications/{YOUTUBE_APP}'
    try:
        response = await asyncio.wait_for(session.delete(url), 5)
        response.release()
    except Exception:
        pass
    await asyncio.sleep(2)
    response = await asyncio.wait_for(session.post(url), 8)
    async with response:
        if response.status >= 400:
            raise RuntimeError('youtube-not-started')


async def lounge_send(session, host, command):
    """One command to the TV's YouTube app as a remote (`setPlaylist`, `pause`, `play`)."""
    response = await asyncio.wait_for(session.get(f'http://{host}:8080/ws/apps/YouTube'), 5)
    async with response:
        xml = await response.text()
    found = re.search(r'<screenId>([^<]+)</screenId>', xml)
    if not found:
        raise RuntimeError('youtube-no-screen')
    response = await asyncio.wait_for(session.post('https://www.youtube.com/api/lounge/pairing/get_lounge_token_batch', data={'screen_ids': found.group(1)}), 8)
    async with response:
        tokens = await response.json(content_type=None)
    token = (((tokens or {}).get('screens') or [{}])[0]).get('loungeToken')
    if not isinstance(token, str):
        raise RuntimeError('youtube-no-lounge-token')
    common = {'device': 'REMOTE_CONTROL', 'id': str(uuid.uuid4()), 'name': 'ShoppingList', 'app': 'youtube-desktop', 'mdx-version': '3',
              'loungeIdToken': token, 'VER': '8', 'v': '2', 'CVER': '1', 'theme': 'cl', 'capabilities': '', 'ui': '', 't': '1'}
    rid = 10000 + int(time.time()) % 80000
    response = await asyncio.wait_for(session.post(LOUNGE_BIND, params={**common, 'RID': str(rid)}, data='count=0', headers={'Content-Type': 'application/x-www-form-urlencoded'}), 10)
    async with response:
        text = await response.text()
    sid = re.search(r'\["c","([^"]+)"', text)
    gsession = re.search(r'\["S","([^"]+)"', text)
    if response.status >= 400 or not sid or not gsession:
        raise RuntimeError('youtube-bind-failed')
    body = {'count': '1', 'ofs': '0'}
    for key, value in command.items():
        body['req0__sc' if key == '_sc' else f'req0_{key}'] = value
    response = await asyncio.wait_for(session.post(LOUNGE_BIND, params={**common, 'SID': sid.group(1), 'gsessionid': gsession.group(1), 'RID': str(rid + 1), 'AID': '5'}, data=body), 10)
    async with response:
        if response.status >= 400:
            raise RuntimeError('youtube-command-failed')


def remote_entity(hass, media_player):
    """The Samsung integration's remote (`remote.<same name>`), for key presses with the paired token."""
    guess = 'remote.' + media_player.split('.', 1)[1]
    if hass.states.get(guess):
        return guess
    for entity in hass.states.async_entity_ids('remote'):
        if 'samsung' in entity:
            return entity
    return None


HUE_BINS = 12
NEUTRAL_SAT = 0.18


def frame_color(png_base64):
    """Screenshot of the projector (PNG, base64) -> ((r, g, b), brightness 0-1), or None when the picture is (nearly)
    black. Runs in the executor.

    The LED strip sits under the TV, so the bottom of the scene counts most: the projection stops at the TV's lower edge,
    so that is the band left and right of the TV, low in the picture (row weight 0.15 at the top -> 1 at the bottom).
    Instead of an average (blue sky + orange fire = a muddy pink that is nowhere in the picture) it picks the main
    colour: lit pixels go into 12 hue groups of 30 degrees or a «white/grey» group, the strongest group (with its two
    neighbours, so a colour on a boundary is not split) wins, and the strip gets the average of just those pixels. A
    colourful group gets a small bonus over white; the black TV mask and dark corners are skipped."""
    import colorsys
    import io
    from PIL import Image
    try:
        raw = base64.b64decode(png_base64, validate=True)
        image = Image.open(io.BytesIO(raw)).convert('RGB').resize((48, 27))
    except Exception:
        return None
    width, height = image.size
    groups = {}  # hue bin (or 'white') -> [weight, r, g, b] in linear light
    level_sum = 0.0
    level_weight = 0.0
    lit = 0
    for index, (r, g, b) in enumerate(image.getdata()):
        high = max(r, g, b)
        if high < 30:
            continue
        lit += 1
        y = (index // width + 0.5) / height
        row = 0.15 + 0.85 * y * y
        h, sat, val = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        level_sum += val * row
        level_weight += row
        key = 'white' if sat < NEUTRAL_SAT else int(h * HUE_BINS) % HUE_BINS
        weight = row * val * (1.0 if key == 'white' else 1.0 + sat)
        group = groups.setdefault(key, [0.0, 0.0, 0.0, 0.0])
        group[0] += weight
        group[1] += (r / 255) ** 2.2 * weight
        group[2] += (g / 255) ** 2.2 * weight
        group[3] += (b / 255) ** 2.2 * weight
    if lit < 20 or not groups:
        return None

    def members(key):
        if key == 'white':
            return ['white']
        return [(key + step) % HUE_BINS for step in (-1, 0, 1)]

    def strength(key):
        return sum(groups[k][0] for k in members(key) if k in groups)

    best = max(groups, key=strength)
    chosen = [groups[k] for k in members(best) if k in groups]
    total = sum(c[0] for c in chosen)
    r, g, b = ((sum(c[i] for c in chosen) / total) ** (1 / 2.2) for i in (1, 2, 3))
    h, s, v = colorsys.rgb_to_hsv(r, g, b)
    # White stays white (with its faint tint); a colour gets a clear but not neon saturation.
    s = min(s, 0.12) if best == 'white' else min(1.0, max(0.55, s * 1.3))
    r, g, b = colorsys.hsv_to_rgb(h, s, 1.0)
    return (round(r * 255), round(g * 255), round(b * 255)), level_sum / level_weight


def color_distance(a, b):
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


def season_keys(month, day):
    """Seasons for the long button press, same rules as the app (src/lib/ambience-seasons.ts `seasonalShelves`)."""
    if month == 12 or (month == 1 and day <= 6):
        return ['kerst', 'winter']
    if month == 10 and day >= 15:
        return ['halloween', 'herfst']
    if month <= 2:
        return ['winter']
    if month <= 5:
        return ['lente']
    if month <= 8:
        return ['zomer']
    return ['herfst']


def pick_video(pool, month, day, last=None, rng=None):
    """A random fitting video for today (never the same as the last one when there is a choice)."""
    import random
    rng = rng or random
    choices = [v for key in season_keys(month, day) for v in pool.get(key, [])]
    if len(choices) > 1 and last in choices:
        choices = [v for v in choices if v != last]
    return rng.choice(choices) if choices else None
