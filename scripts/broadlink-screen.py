#!/usr/bin/env python3
"""Local screen controls and bounded, cancellable timed presets. Never retries RF writes."""
import base64
import fcntl
import ipaddress
import json
import math
import os
from pathlib import Path
import subprocess
import sys
import time
import uuid
from contextlib import contextmanager
CONFIG = Path(__file__).resolve().parents[1] / '.cache/broadlink/screen.json'
STATE = CONFIG.with_name('screen-timing.json')
MAX_SECONDS = 60

@contextmanager
def locked():
    with STATE.with_suffix('.lock').open('a') as file:
        os.chmod(file.name, 0o600)
        fcntl.flock(file, fcntl.LOCK_EX)
        yield

def state():
    return json.loads(STATE.read_text()) if STATE.exists() else {}

def save(value):
    temp = STATE.with_suffix('.tmp')
    with temp.open('w') as file:
        os.chmod(temp, 0o600)
        json.dump(value, file)
    os.replace(temp, STATE)

def valid_duration(value):
    return isinstance(value, (float, int)) and not isinstance(value, bool) and math.isfinite(value) and 0.1 <= value <= MAX_SECONDS

def connect(config):
    import broadlink
    host = ipaddress.ip_address(config['host'])
    if not host.is_private or host.is_loopback or host.is_multicast or host.is_unspecified:
        raise ValueError('Invalid address')
    device = broadlink.hello(str(host), timeout=3)
    if device.mac.hex() != config['mac'] or device.model != 'RM4 pro' or device.is_locked or not device.auth():
        raise ValueError('Device unavailable')
    return device

def send(device, config, action):
    packet = base64.b64decode(config['commands'][action], validate=True)
    if not 4 <= len(packet) <= 16384:
        raise ValueError('Invalid packet')
    device.send_data(packet)

def public_status(config, current):
    return {'configured': all(config.get('commands', {}).get(k) for k in ('up','stop','down')), 'durationSeconds': current.get('duration') if valid_duration(current.get('duration')) else None, 'calibrating': current.get('kind') == 'calibrating', 'running': current.get('kind') == 'preset'}

def wait_and_stop(config, run_id, seconds, device=None):
    # The deadline uses the same monotonic clock as the original UP transmission.
    while True:
        with locked():
            current = state()
            if current.get('runId') != run_id or current.get('kind') not in ('calibrating','preset'):
                return  # Manual Stop, another movement, or cancellation superseded this run.
            remaining = current['started'] + seconds - time.monotonic()
            if remaining <= 0:
                # Invalidate before sending: an uncertain STOP is not retried automatically.
                current['kind'] = 'idle'
                save(current)
                send(device if device is not None else connect(config), config, 'stop')
                return
        time.sleep(min(0.05, remaining))

def launch_watchdog(run_id):
    subprocess.Popen([sys.executable, str(Path(__file__).resolve()), 'watchdog', run_id], stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True, close_fds=True)

def run(action):
    if action not in ('status','up','stop','down','calibrate','preset'):
        raise ValueError('Invalid command')
    config = json.loads(CONFIG.read_text())
    with locked():
        current = state()
        if action == 'status':
            return public_status(config, current)
        if action in ('preset','calibrate') and current.get('kind') in ('preset','calibrating'):
            raise ValueError('Already moving')
        duration = current.get('duration')
        if action == 'preset' and not valid_duration(duration):
            raise ValueError('No calibrated duration')
        device = connect(config)
        previous = dict(current)
        current['kind'] = 'idle'
        current['runId'] = str(uuid.uuid4())
        save(current)  # Cancel any pending automatic STOP before a new manual movement.
        if action in ('preset','calibrate'):
            current.update(kind='preset' if action == 'preset' else 'calibrating', started=time.monotonic())
            save(current)
            current['started'] = time.monotonic()
            try:
                send(device, config, 'up')
            finally:
                save(current)
                # An uncertain UP still gets a bounded STOP. No UP retry is sent.
                if action == 'calibrate':
                    launch_watchdog(current['runId'])
                elif sys.exc_info()[0] is not None:
                    launch_watchdog(current['runId'])
        else:
            stopped_at = time.monotonic()
            send(device, config, action)
            if action == 'stop' and previous.get('kind') == 'calibrating':
                measured = stopped_at - previous['started']
                if valid_duration(measured):
                    current['duration'] = round(measured, 3)
                    save(current)
    if action == 'preset':
        wait_and_stop(config, current['runId'], duration, device)
    return {'accepted': True, **public_status(config, state())}

if __name__ == '__main__':
    try:
        os.umask(0o077)
        if len(sys.argv) == 3 and sys.argv[1] == 'watchdog':
            config = json.loads(CONFIG.read_text())
            current = state()
            wait_and_stop(config, sys.argv[2], current.get('duration', MAX_SECONDS) if current.get('kind') == 'preset' else MAX_SECONDS)
        elif len(sys.argv) == 2:
            print(json.dumps(run(sys.argv[1])))
        else:
            raise ValueError('Invalid arguments')
    except Exception:
        print(json.dumps({'error':'command-not-confirmed'}))
        raise SystemExit(1)
