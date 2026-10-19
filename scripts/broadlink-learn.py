#!/usr/bin/env python3
"""Interactive capture only. Never transmits learned IR/RF commands."""
import base64
import json
import os
from pathlib import Path
import sys
import time

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / '.cache/broadlink/screen.json'
BUTTONS = [('up', 'OMHOOG'), ('stop', 'STOP'), ('down', 'OMLAAG')]


def wait_for(check, seconds=35):
    from broadlink.exceptions import ReadError, StorageError
    end = time.monotonic() + seconds
    while time.monotonic() < end:
        try:
            result = check()
            if result:
                return result
        except (ReadError, StorageError):
            pass  # The receiver has not captured a code yet.
        time.sleep(0.4)
    raise TimeoutError('Geen signaal ontvangen binnen de leertijd.')


def capture(device, kind, label):
    input(f'\nKlaar voor {label}? Druk hier eerst op Enter. ')
    if kind == 'rf':
        try:
            device.sweep_frequency()
            print(f'Houd nu {label} op je originele afstandsbediening ingedrukt tot hier "Frequentie gevonden" verschijnt.', flush=True)
            def found():
                value = device.check_frequency()
                # broadlink 0.19 returns (found, MHz); a nonempty tuple alone is always true.
                return value[0] if isinstance(value, tuple) else bool(value)
            wait_for(found)
            print('Frequentie gevonden. Laat de knop los.', flush=True)
            input('Druk hier op Enter om het korte signaal op te nemen. ')
            device.find_rf_packet()
            print(f'Druk nu {label} één keer kort in.', flush=True)
            return wait_for(device.check_data)
        finally:
            device.cancel_sweep_frequency()
    device.enter_learning()
    print(f'Richt de originele afstandsbediening op de RM4 Pro en druk {label} één keer in.', flush=True)
    return wait_for(device.check_data)


def save(config, path=OUTPUT):
    path.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    temporary = path.with_suffix('.tmp')
    with temporary.open('w', encoding='utf8') as file:
        os.chmod(temporary, 0o600)
        json.dump(config, file, indent=2, ensure_ascii=False)
    os.replace(temporary, path)


def main():
    if not sys.stdin.isatty():
        print('Open de leerhulp in Terminal; er zijn fysieke knoppen nodig.')
        return 1
    import broadlink
    os.umask(0o077)
    print('Projectiescherm koppelen — bestaande BroadLink-knoppen blijven behouden.')
    print('Deze leerhulp zendt zelf geen schermopdrachten. Je originele remote kan het scherm wel bewegen.')
    print('RF werkt doorgaans zonder richten; IR vereist richten op de ontvanger.')
    kind = input('Type afstandsbediening: RF of IR (Enter = RF proberen): ').strip().lower() or 'rf'
    if kind not in ('rf', 'ir'):
        print('Kies RF of IR en start opnieuw.')
        return 1
    try:
        device = broadlink.hello('192.168.132.164', timeout=4)
    except Exception:
        candidates = [d for d in broadlink.discover(timeout=6) if d.model == 'RM4 pro']
        if len(candidates) != 1:
            print('Geen unieke RM4 Pro gevonden. Controleer hetzelfde wifi-netwerk en de apparaatvergrendeling.')
            return 1
        device = candidates[0]
    if device.model != 'RM4 pro' or device.is_locked:
        print('RM4 Pro niet beschikbaar of vergrendeld. Controleer de BroadLink-app.')
        return 1
    if not device.auth():
        print('Geen lokale toegang tot de RM4 Pro.')
        return 1
    config = {'host': device.host[0], 'mac': device.mac.hex(), 'devtype': device.devtype, 'kind': kind, 'commands': {}}
    if OUTPUT.exists():
        old = json.loads(OUTPUT.read_text())
        if old.get('mac') == config['mac'] and old.get('kind') == kind:
            config['commands'] = old.get('commands', {})
    for key, label in BUTTONS:
        if config['commands'].get(key):
            print(f'{label} is al opgeslagen; overgeslagen.')
            continue
        packet = capture(device, kind, label)
        if not isinstance(packet, bytes) or not 4 <= len(packet) <= 16384:
            raise ValueError('Ongeldig ontvangen signaal.')
        config['commands'][key] = base64.b64encode(packet).decode('ascii')
        save(config)
        print(f'{label} opgeslagen.')
    print('\nAlle drie de knoppen zijn opgeslagen. Nog geen opdrachten vanuit de gezinsapp verstuurd.')
    print('Laat in de chat weten dat dit gelukt is; dan verbinden we de app met deze knoppen.')
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print('\nGeannuleerd. Eerder opgeslagen knoppen blijven bewaard.')
        raise SystemExit(1)
    except Exception:
        print('\nLeren niet voltooid. Ontvangen knoppen blijven bewaard. Meld in de chat bij welke stap het stopte; er zijn geen schermopdrachten verstuurd.')
        raise SystemExit(1)
