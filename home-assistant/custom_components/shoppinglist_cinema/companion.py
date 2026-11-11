"""Read-only media telemetry. Never declares timing or stream identity verified."""
import hashlib
import json
import re
import time
import uuid

PACKAGE = 'com.stremio.one'


def parse_probe_metadata(raw):
    """Accept only display metadata, never infer stream identity from this cache."""
    try:
        data = json.loads(raw or '')
        duration = int(data.get('DURATION', 0))
        title = data.get('TITLE')
        if data.get('stremio') is True and isinstance(title, str) and 0 < len(title) <= 300 and 0 < duration <= 86400000:
            return {'title': title, 'durationMs': duration}
    except (ValueError, TypeError, AttributeError):
        pass
    return None


def parse_media_session(raw, metadata=None):
    for block in (raw or '').split('package=')[1:]:
        if not re.match(r'com\.stremio\.one(?:\s|$)', block):
            continue
        state = re.search(r'state=PlaybackState\s*\{([^}]+)', block)
        if not state:
            continue
        fields = state.group(1)
        def number(name, default=0):
            match = re.search(r'(?:^|[,\s])' + name + r'\s*=\s*(-?[\d.]+)', fields)
            try:
                return float(match.group(1)) if match else default
            except ValueError:
                return default
        status = re.search(r'state=([A-Z_]+)', fields)
        status = {'PLAYING': 'playing', 'PAUSED': 'paused', 'BUFFERING': 'buffering', 'STOPPED': 'stopped'}.get(status.group(1) if status else '', 'unknown')
        media = re.search(r'(?:android\.media\.metadata\.MEDIA_ID|mediaId|media_id)\s*[=:]\s*([^,\n}\]]+)', block)
        media_id = media.group(1).strip()[:200] if media else ''
        stream = re.search(r'(?:android\.media\.metadata\.MEDIA_URI|mediaUri|streamId)\s*[=:]\s*([^,\n}\]]+)', block)
        stream_key = stream.group(1).strip() if stream else ''
        identity = re.fullmatch(r'(tt\d{5,12})(?::(\d+):(\d+))?', media_id)
        description = re.search(r'metadata:.*?description=([^\n]+)', block)
        description_title = description.group(1).split(', null')[0].strip()[:300] if description else ''
        title_match = re.search(r'(?:android\.media\.metadata\.TITLE|title)\s*[=:]\s*([^,\n}\]]+)', block)
        duration = re.search(r'(?:android\.media\.metadata\.DURATION|duration)\s*[=:]\s*(\d+)', block)
        uptime = re.search(r'COMPANION_UPTIME\s*\n([\d.]+)', raw)
        device_now = float(uptime.group(1)) * 1000 if uptime else None
        updated = number('updated', None)
        position = max(0, number('position'))
        speed = max(0, min(4, number('speed', 1)))
        age = device_now - updated if device_now is not None and updated is not None else None
        # Android update timestamps are monotone, not wall-clock timestamps.
        reliable_clock = age is not None and 0 <= age <= 86400000
        if status == 'playing' and reliable_clock:
            position += age * speed
        duration_ms = min(86400000, int(duration.group(1))) if duration else 0
        title = title_match.group(1).strip()[:300] if title_match else description_title or 'Stremio'
        if not duration_ms and metadata and metadata.get('title') == title:
            duration_ms = metadata['durationMs']
        return {
            'mediaKey': media_id or 'unidentified',
            'streamFingerprint': hashlib.sha256((media_id + ':' + description_title + ':' + str(duration_ms) + ':' + stream_key).encode()).hexdigest(),
            'streamEvidence': bool(stream_key),
            'imdbId': identity.group(1) if identity else None,
            'mediaType': 'series' if identity and identity.group(2) else 'movie',
            'season': int(identity.group(2)) if identity and identity.group(2) else None,
            'episode': int(identity.group(3)) if identity and identity.group(3) else None,
            'title': title,
            'positionMs': int(min(position, duration_ms if duration_ms else 86400000)), 'durationMs': duration_ms,
            'speed': speed, 'state': status,
            'deviceUpdateElapsedMs': updated,
            'uncertaintyMs': 1500 if reliable_clock else 60000,
        }
    return None


class Telemetry:
    def __init__(self):
        self.session = uuid.uuid4().hex
        self.identity = None
        self.sequence = int(time.time() * 1000)
        self.last = None
        self.sent_at = 0
        self.boot_uptime = None

    def snapshot(self, raw, now=None, metadata=None):
        now = int(time.time() * 1000) if now is None else now
        p = parse_media_session(raw, metadata)
        if p is None:
            if not self.last:
                return None
            p = {**self.last, 'state': 'unknown', 'speed': 0}
        identity = (p['mediaKey'], p['streamFingerprint'])
        if identity != self.identity or (self.last and self.last['state'] in ('stopped', 'unknown') and p['state'] == 'playing'):
            self.session = uuid.uuid4().hex
            self.identity = identity
        self.sequence += 1
        p.update(sessionId=self.session, sequence=self.sequence, observedAt=now)
        # State/seek changes publish immediately; paused heartbeats at most every 5 seconds.
        changed = not self.last or p['state'] != self.last['state'] or abs(p['positionMs'] - self.last['positionMs']) >= 1000 or p['sessionId'] != self.last.get('sessionId')
        self.last = p
        if not changed and now - self.sent_at < 5000:
            return None
        self.sent_at = now
        return p
