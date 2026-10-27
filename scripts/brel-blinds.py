#!/usr/bin/env python3
"""Local BREL Home Hub controls (Motion Blinds LAN protocol). Status needs no key; every command is one write.

Usage: brel-blinds.py status | brel-blinds.py open|close|stop <blind-mac> | brel-blinds.py position <blind-mac> <0-100>
       | brel-blinds.py tilt <blind-mac> <0-180>
Positions follow the hub: 0 = open, 100 = closed. Tilt is the slat angle (0-180, 90 = horizontal). Every command is
absolute, so the library's timeout resend cannot toggle a blind the wrong way (unlike the RF screen).
"""
import ipaddress
import json
from pathlib import Path
import re
import sys

CONFIG = Path(__file__).resolve().parents[1] / '.cache/brel/blinds.json'
COMMANDS = ('open', 'close', 'stop', 'position', 'tilt')
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
            blinds.append({'mac': saved['mac'], 'name': saved['name'], 'available': False, 'position': None, 'angle': None, 'moving': False, 'battery': None})
            continue
        blind.Update_from_cache()
        position = blind.position if isinstance(blind.position, int) and 0 <= blind.position <= 100 else None
        # The library scales the raw angle to degrees; the hub derives it from the motor, there is no slat sensor.
        angle = round(blind.angle) if isinstance(blind.angle, (int, float)) and 0 <= blind.angle <= 180 else None
        blinds.append({'mac': saved['mac'], 'name': saved['name'], 'available': bool(blind.available), 'position': position, 'angle': angle,
                       'moving': blind.status in ('Closing', 'Opening'), 'battery': blind.battery_level})
    return blinds

def run(action, mac=None, position=None, angle=None):
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
    if action == 'tilt' and not (isinstance(angle, int) and 0 <= angle <= 180):
        raise ValueError('Invalid angle')
    blind = connect(config, config['key']).device_list.get(mac)
    if blind is None:
        raise ValueError('Blind unavailable')
    data = {'open': {'operation': 1}, 'close': {'operation': 0}, 'stop': {'operation': 2}, 'position': {'targetPosition': position},
            'tilt': {'targetAngle': angle}}[action]
    response = blind._write(data)
    # A wrong key still gets a WriteDeviceAck, but with an actionResult instead of the new state.
    if response.get('msgType') != 'WriteDeviceAck' or response.get('actionResult') is not None:
        raise ValueError('Command rejected')
    return {'accepted': True}

def main(argv):
    try:
        action = argv[0] if argv else ''
        number = int(argv[2]) if action in ('position', 'tilt') and len(argv) == 3 and argv[2].isdigit() else None
        expected = {'status': 1, 'position': 3, 'tilt': 3}.get(action, 2)
        if len(argv) != expected:
            raise ValueError('Invalid arguments')
        mac = argv[1] if len(argv) > 1 else None
        print(json.dumps(run(action, mac, number if action == 'position' else None, number if action == 'tilt' else None)))
        return 0
    except Exception:
        print(json.dumps({'accepted': False}))
        return 1

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
