#!/usr/bin/env python3
"""Private local command runner. A fixed allowlist; at most one RF transmission."""
import base64
import ipaddress
import json
from pathlib import Path
import sys

CONFIG = Path(__file__).resolve().parents[1] / '.cache/broadlink/screen.json'

def run(action):
    if action not in ('status', 'up', 'stop', 'down'):
        raise ValueError('Invalid command')
    config = json.loads(CONFIG.read_text())
    if action == 'status':
        return {'configured': all(config.get('commands', {}).get(k) for k in ('up', 'stop', 'down'))}
    import broadlink
    host = ipaddress.ip_address(config['host'])
    if not host.is_private or host.is_loopback or host.is_multicast or host.is_unspecified:
        raise ValueError('Invalid address')
    # Verify the identity before transmitting, in case DHCP assigned this address to another remote.
    device = broadlink.hello(str(host), timeout=3)
    if device.mac.hex() != config['mac'] or device.model != 'RM4 pro' or device.is_locked:
        raise ValueError('Device changed or locked')
    if not device.auth():
        raise ValueError('Authentication failed')
    packet = base64.b64decode(config['commands'][action], validate=True)
    if not 4 <= len(packet) <= 16384:
        raise ValueError('Invalid packet')
    device.send_data(packet)
    return {'accepted': True}

if __name__ == '__main__':
    try:
        if len(sys.argv) != 2:
            raise ValueError('Invalid arguments')
        print(json.dumps(run(sys.argv[1])))
    except Exception:
        # A timeout may happen after transmission: callers must not automatically retry.
        print(json.dumps({'error': 'command-not-confirmed'}))
        raise SystemExit(1)
