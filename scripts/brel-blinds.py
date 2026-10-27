#!/usr/bin/env python3
"""Local BREL Home Hub controls (Motion Blinds LAN protocol). Status needs no key; every command is one write.

Usage: brel-blinds.py status | brel-blinds.py open|close|stop <blind-mac> | brel-blinds.py position <blind-mac> <0-100>
Positions follow the hub: 0 = open, 100 = closed. Open/close/stop/position are absolute, so the library's
timeout resend cannot toggle a blind the wrong way (unlike the RF screen).
"""
import ipaddress
import json
from pathlib import Path
import re
import sys

CONFIG = Path(__file__).resolve().parents[1] / '.cache/brel/blinds.json'
COMMANDS = ('open', 'close', 'stop', 'position')
MAC = re.compile(r'[0-9a-f]{16}')

def load():
    config = json.loads(CONFIG.read_text())
    host = ipaddress.ip_address(config['host'])
    if not host.is_private or host.is_loopback or host.is_multicast or host.is_unspecified:
        raise ValueError('Invalid address')
    if not re.fullmatch(r'[0-9a-f]{12}', config['gatewayMac']) or not config.get('blinds'):
        raise ValueError('Invalid configuration')
    return config

def connect(config, key):
    from motionblinds import MotionGateway
    gateway = MotionGateway(ip=config['host'], key=key, timeout=3.0)
    gateway.GetDeviceList()
    if gateway.mac != config['gatewayMac']:
        raise ValueError('Different hub at this address')
    return gateway

def blind_status(config, gateway):
    blinds = []
    for saved in config['blinds']:
        blind = gateway.device_list.get(saved['mac'])
        if blind is None:
            blinds.append({'mac': saved['mac'], 'name': saved['name'], 'available': False, 'position': None, 'moving': False, 'battery': None})
            continue
        blind.Update_from_cache()
        position = blind.position if isinstance(blind.position, int) and 0 <= blind.position <= 100 else None
        blinds.append({'mac': saved['mac'], 'name': saved['name'], 'available': bool(blind.available), 'position': position,
                       'moving': blind.status in ('Closing', 'Opening'), 'battery': blind.battery_level})
    return blinds

def run(action, mac=None, position=None):
    config = load()
    if action == 'status':
        # The 16-character key only signs writes; reading positions works without it.
        return {'configured': bool(config.get('key')), 'blinds': blind_status(config, connect(config, '0' * 16))}
    if action not in COMMANDS or not MAC.fullmatch(mac or '') or mac not in {blind['mac'] for blind in config['blinds']}:
        raise ValueError('Invalid command')
    if not re.fullmatch(r'[0-9A-Za-z-]{16}', config.get('key', '')):
        raise ValueError('Key missing')
    if action == 'position' and not (isinstance(position, int) and 0 <= position <= 100):
        raise ValueError('Invalid position')
    blind = connect(config, config['key']).device_list.get(mac)
    if blind is None:
        raise ValueError('Blind unavailable')
    data = {'open': {'operation': 1}, 'close': {'operation': 0}, 'stop': {'operation': 2}, 'position': {'targetPosition': position}}[action]
    response = blind._write(data)
    # A wrong key still gets a WriteDeviceAck, but with an actionResult instead of the new state.
    if response.get('msgType') != 'WriteDeviceAck' or response.get('actionResult') is not None:
        raise ValueError('Command rejected')
    return {'accepted': True}

def main(argv):
    try:
        action = argv[0] if argv else ''
        position = int(argv[2]) if action == 'position' and len(argv) == 3 and argv[2].isdigit() else None
        expected = {'status': 1, 'position': 3}.get(action, 2)
        if len(argv) != expected:
            raise ValueError('Invalid arguments')
        print(json.dumps(run(action, argv[1] if len(argv) > 1 else None, position)))
        return 0
    except Exception:
        print(json.dumps({'accepted': False}))
        return 1

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
