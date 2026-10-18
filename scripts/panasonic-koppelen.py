#!/usr/bin/env python3
"""Interactive one-time login. Only encrypted refreshable tokens are persisted."""
import asyncio
import getpass
import json
import logging
import os
from pathlib import Path
import subprocess
import tempfile

from importlib.util import spec_from_file_location, module_from_spec
ROOT = Path(__file__).resolve().parents[1]
spec = spec_from_file_location("probe", ROOT / "scripts/probe-panasonic.py")
probe = module_from_spec(spec)
spec.loader.exec_module(probe)

async def pair(app_email, email, password):
    import aiohttp
    from aio_panasonic_comfort_cloud import ApiClient
    from aio_panasonic_comfort_cloud.exceptions import MFARequiredError
    trace = aiohttp.TraceConfig()
    async def guard(_session, _context, params):
        if not probe.allow_request(params.method, params.url):
            raise RuntimeError("Unsupported request")
    trace.on_request_start.append(guard)
    with tempfile.TemporaryDirectory(prefix="panasonic-pair-") as directory:
        async with aiohttp.ClientSession(connector=aiohttp.TCPConnector(ssl=probe.tls_context()), timeout=aiohttp.ClientTimeout(total=45), trace_configs=[trace]) as session:
            client = ApiClient(email, password, session, token_file_name=str(Path(directory) / "session.json"), auto_power_on=False)
            try:
                await client.start_session()
            except MFARequiredError:
                await client.start_session(otp_code=getpass.getpass("Verificatiecode (afgeschermd): ").strip())
            # The dependency coalesces async settings saves. Snapshot in memory; never
            # copy its unencrypted session file into the repository.
            settings = client._settings._get_save_data()
            result = subprocess.run(["node", "scripts/save-panasonic-session.mjs"], cwd=ROOT, input=json.dumps({"email": app_email, "settings": settings}), text=True, capture_output=True)
            if result.returncode:
                print("Koppelen in de gezinsapp is niet gelukt. Controleer je app-e-mailadres en de serverinstellingen.")
                return 1
            print(result.stdout.strip())
            # Do not log out: that would invalidate the session just provisioned.
            return 0

def main():
    os.umask(0o077)
    logging.disable(logging.CRITICAL)
    if not __import__('sys').stdin.isatty():
        print("Open dit bestand in een interactieve terminal.")
        return 1
    print("Panasonic koppelen — je wachtwoord wordt niet opgeslagen. Geen airco-instellingen worden gewijzigd.")
    app_email = input("E-mailadres waarmee je in de gezinsapp inlogt: ").strip()
    email = input("Panasonic-e-mailadres (Enter = hetzelfde): ").strip() or app_email
    password = getpass.getpass("Panasonic-wachtwoord (afgeschermd): ")
    try:
        return asyncio.run(pair(app_email, email, password))
    except KeyboardInterrupt:
        print("Koppelen geannuleerd.")
        return 1
    except Exception:
        print("Koppelen niet gelukt. Controleer de verbinding en je account in Comfort Cloud. Er zijn geen inloggegevens gelogd.")
        return 1
if __name__ == "__main__":
    raise SystemExit(main())
