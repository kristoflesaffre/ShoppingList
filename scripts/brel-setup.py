#!/usr/bin/env python3
"""Pair the BREL Home Hub with the local app: find it, check the key with a status query, name the blinds.

Never moves a blind. The key and configuration stay in the ignored, private .cache/brel/blinds.json.
"""
from getpass import getpass
import json
import os
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
CONFIG = ROOT / '.cache/brel/blinds.json'
SCREEN = ROOT / '.cache/broadlink/screen.json'

def save(config):
    temp = CONFIG.with_suffix('.tmp')
    with temp.open('w') as file:
        os.chmod(temp, 0o600)
        json.dump(config, file, indent=2)
    os.replace(temp, CONFIG)

def main():
    from motionblinds import MotionDiscovery, MotionGateway
    old = json.loads(CONFIG.read_text()) if CONFIG.exists() else {}
    print('BREL Home Hub zoeken…')
    hubs = MotionDiscovery().discover()
    if len(hubs) != 1:
        print(f'{len(hubs)} hubs gevonden; verwacht precies één. Staat de Mac op hetzelfde wifi-netwerk?')
        return 1
    host, found = next(iter(hubs.items()))
    blinds = [row['mac'] for row in found.get('data', []) if row.get('deviceType') == '10000000']
    print(f'Hub {found["mac"]} op {host} met {len(blinds)} rolluik(en).')

    print('\nDe sleutel staat in de BREL-app: Instellingen → Over (tik een paar keer snel op het scherm).')
    key = old.get('key', '')
    entered = getpass('Sleutel (16 tekens, Enter = vorige behouden): ').strip()
    if entered:
        key = entered
    if not re.fullmatch(r'[0-9A-Za-z-]{16}', key):
        print('Dat is geen sleutel van 16 tekens.')
        return 1
    gateway = MotionGateway(ip=host, key=key, timeout=3.0)
    gateway.GetDeviceList()
    # Operation 5 only asks for the current state; a wrong key is answered with an actionResult.
    response = gateway.device_list[blinds[0]]._write({'operation': 5})
    if response.get('actionResult') is not None:
        print('De hub weigert deze sleutel. Controleer hem in de BREL-app.')
        return 1
    print('Sleutel klopt.')

    names = {blind['mac']: blind['name'] for blind in old.get('blinds', [])}
    saved = []
    for index, mac in enumerate(blinds, 1):
        blind = gateway.device_list[mac]
        blind.Update_from_cache()
        default = names.get(mac, f'Rolluik {index}')
        name = input(f'Naam voor rolluik {index} (nu {100 - blind.position}% open) [{default}]: ').strip() or default
        saved.append({'mac': mac, 'name': name[:40]})

    owner = old.get('ownerId') or (json.loads(SCREEN.read_text()).get('ownerId') if SCREEN.exists() else None)
    if not owner:
        print('Geen eigenaar gevonden (de schermkoppeling ontbreekt). Zie docs/brel.md.')
        return 1
    CONFIG.parent.mkdir(mode=0o700, exist_ok=True)
    save({'host': host, 'gatewayMac': found['mac'], 'key': key, 'blinds': saved, 'ownerId': owner})
    print('\nOpgeslagen. Open de app op je Mac: Rolluiken staat bij het bedieningspaneel.')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
