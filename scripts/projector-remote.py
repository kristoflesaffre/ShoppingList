#!/usr/bin/env python3
"""Private local Google TV bridge with guarded XGIMI short-press shutdown."""
import argparse
import asyncio
import getpass
import ipaddress
import json
import os
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
DIRECTORY = ROOT / '.cache/projector'
CONFIG = DIRECTORY / 'projector.json'
CERT = DIRECTORY / 'client.pem'
KEY = DIRECTORY / 'client.key'


def private_host(value):
    address = ipaddress.ip_address(value)
    if not address.is_private or address.is_loopback or address.is_multicast or address.is_unspecified or address.is_link_local:
        raise ValueError('A private LAN address is required')
    return str(address)


def save_config(config):
    temporary = CONFIG.with_suffix('.tmp')
    with temporary.open('w') as output:
        os.chmod(temporary, 0o600)
        json.dump(config, output)
    os.replace(temporary, CONFIG)


def remote_for(host):
    from androidtvremote2 import AndroidTVRemote
    return AndroidTVRemote('ShoppingList projector', str(CERT), str(KEY), private_host(host), enable_ime=False)


async def pair(host):
    """The pairing session must stay alive while the user reads the on-screen code."""
    from androidtvremote2 import InvalidAuth
    owner = json.loads((ROOT / '.cache/broadlink/screen.json').read_text())['ownerId']
    if CONFIG.exists():
        previous = json.loads(CONFIG.read_text())
        save_config({**previous, 'enabled': False})
    remote = remote_for(host)
    try:
        await remote.async_generate_cert_if_missing()
        name, mac = await asyncio.wait_for(remote.async_get_name_and_mac(), 5)
        await asyncio.wait_for(remote.async_start_pairing(), 10)
        print('Pairing requested. Enter the six-character code displayed on the projector.', flush=True)
        for _ in range(3):
            code = (await asyncio.to_thread(getpass.getpass, 'Pairing code: ')).strip().upper()
            if not re.fullmatch(r'[0-9A-F]{6}', code):
                print('Use the six hexadecimal characters shown on screen.', flush=True)
                continue
            try:
                await asyncio.wait_for(remote.async_finish_pairing(code), 10)
                break
            except InvalidAuth:
                print('Code not accepted. Try the code on screen again.', flush=True)
        else:
            raise ValueError('Pairing unsuccessful')
        await asyncio.wait_for(remote.async_connect(), 8)
        save_config({'host': private_host(host), 'mac': mac, 'name': name, 'ownerId': owner, 'paired': True, 'enabled': True})
        print(json.dumps({'paired': True, 'enabled': True, 'isOn': remote.is_on}), flush=True)
    finally:
        remote.disconnect()


async def set_power(config, on, remote=None):
    """Wake explicitly; shut down using the short press verified on this XGIMI."""
    if config.get('paired') is not True or config.get('enabled') is not True:
        return {'configured': False, 'accepted': False}
    remote = remote or remote_for(config['host'])
    try:
        _, mac = await asyncio.wait_for(remote.async_get_name_and_mac(), 4)
        if mac != config.get('mac'):
            raise ValueError('Device identity changed; pair again')
        await asyncio.wait_for(remote.async_connect(), 6)
        already = remote.is_on is on
        if not on:
            # POWER is a toggle: never send it to an off or unknown state.
            if remote.is_on is False:
                return {'configured': True, 'accepted': True, 'alreadyAtTarget': True, 'isOn': False}
            if remote.is_on is not True:
                return {'configured': True, 'accepted': False, 'error': 'projector-not-confirmed', 'isOn': None}
            # SHORT and SLEEP only blanked the image temporarily on this device.
            # Match the verified physical press, then close without polling/reconnecting.
            remote.send_key_command('POWER', 'START_LONG')
            await asyncio.sleep(0.12)
            remote.send_key_command('POWER', 'END_LONG')
            await asyncio.sleep(0.25)
            return {'configured': True, 'accepted': True, 'alreadyAtTarget': False, 'isOn': None}
        remote.send_key_command('WAKEUP')
        # send_key_command queues a write; allow transport and state feedback to run.
        for _ in range(10):
            await asyncio.sleep(0.1)
            if remote.is_on is on:
                return {'configured': True, 'accepted': True, 'alreadyAtTarget': already, 'isOn': remote.is_on}
        return {'configured': True, 'accepted': True, 'alreadyAtTarget': already, 'isOn': remote.is_on}
    finally:
        remote.disconnect()


async def wake(config, remote=None):
    result = await set_power(config, True, remote)
    if 'alreadyAtTarget' in result:
        result['alreadyOn'] = result['alreadyAtTarget']
    return result


async def sleep(config, remote=None):
    return await set_power(config, False, remote)


async def inspect_power(config, remote=None):
    if config.get('paired') is not True or config.get('enabled') is not True:
        return {'configured': False, 'accepted': False, 'error': 'not-configured'}
    remote = remote or remote_for(config['host'])
    try:
        _, mac = await asyncio.wait_for(remote.async_get_name_and_mac(), 4)
        if mac != config.get('mac'):
            raise ValueError('Device identity changed; pair again')
        await asyncio.wait_for(remote.async_connect(), 6)
        return {'configured': True, 'accepted': True, 'isOn': remote.is_on}
    finally:
        remote.disconnect()


async def open_stremio(config, link):
    if not re.fullmatch(r'stremio:///detail/(?:movie|series)/tt\d{7,10}/(?:tt\d{7,10}(?::\d{1,3}:\d{1,4})?)?\?autoPlay=false', link or ''):
        raise ValueError('Invalid Stremio link')
    if config.get('paired') is not True or config.get('enabled') is not True:
        return {'accepted': False}
    # Only connection attempts are repeated while the projector boots; launch is sent once.
    deadline = asyncio.get_running_loop().time() + 50
    while asyncio.get_running_loop().time() < deadline:
        remote = remote_for(config['host'])
        try:
            _, mac = await asyncio.wait_for(remote.async_get_name_and_mac(), 3)
            if mac != config.get('mac'):
                raise ValueError('Device identity changed; pair again')
            await asyncio.wait_for(remote.async_connect(), 5)
        except (OSError, asyncio.TimeoutError):
            remote.disconnect()
            await asyncio.sleep(2)
            continue
        except Exception as error:
            remote.disconnect()
            if type(error).__name__ == 'CannotConnect':
                await asyncio.sleep(2)
                continue
            raise
        try:
            if remote.is_on is not True:
                await asyncio.sleep(2)
                continue
            remote.send_launch_app_command(link)
            await asyncio.sleep(0.5)
            return {'accepted': True}
        finally:
            remote.disconnect()
    return {'accepted': False}


async def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['pair', 'on', 'off', 'status', 'check', 'stremio'])
    parser.add_argument('--link')
    parser.add_argument('--host', type=private_host)
    args = parser.parse_args()
    os.umask(0o077)
    DIRECTORY.mkdir(parents=True, exist_ok=True, mode=0o700)
    if args.action == 'pair':
        if not args.host:
            parser.error('pair requires --host with the projector LAN IP address')
        await pair(args.host)
        return
    config = json.loads(CONFIG.read_text()) if CONFIG.exists() else {}
    if args.action == 'stremio':
        print(json.dumps(await open_stremio(config, args.link)))
    elif args.action == 'status':
        print(json.dumps({'configured': config.get('paired') is True and config.get('enabled') is True}))
    elif args.action == 'check':
        print(json.dumps(await inspect_power(config)))
    else:
        print(json.dumps(await (wake(config) if args.action == 'on' else sleep(config))))


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except (Exception, KeyboardInterrupt) as error:
        # No certificates, pairing codes or network details in API error output.
        kind = type(error).__name__
        code = 'identity-changed' if isinstance(error, ValueError) else 'pairing-required' if kind in ('InvalidAuth', 'ConnectionClosed') else 'unreachable' if isinstance(error, (TimeoutError, OSError)) or kind == 'CannotConnect' else 'projector-not-confirmed'
        print(json.dumps({'error': code}), flush=True)
        sys.exit(1)
