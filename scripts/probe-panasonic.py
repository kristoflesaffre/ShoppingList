#!/usr/bin/env python3
"""Interactive local-only Comfort Cloud connection probe. Never controls a device."""
import asyncio
import getpass
import json
import logging
import os
from pathlib import Path
import ssl
import sys
import tempfile
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[1]


def tls_context():
    # python.org macOS installs may have no usable system CA bundle. Keep full
    # hostname/certificate verification and use Mozilla's trusted roots explicitly.
    import certifi
    return ssl.create_default_context(cafile=certifi.where())


async def check_connection():
    """No login or credentials: distinguish local TLS issues from authentication."""
    import aiohttp
    async with aiohttp.ClientSession(connector=aiohttp.TCPConnector(ssl=tls_context()), timeout=aiohttp.ClientTimeout(total=15)) as session:
        for host in ["authglb.digital.panasonic.com", "accsmart.panasonic.com"]:
            try:
                async with session.get(f"https://{host}/", allow_redirects=False) as response:
                    # 403/404 are fine here: we requested only the public root.
                    print(f"{host}: beveiligde verbinding geslaagd (HTTP {response.status}).")
            except aiohttp.ClientConnectorCertificateError:
                print(f"{host}: certificaatcontrole mislukt (TLS_CERTIFICATE).")
                return 1
            except Exception:
                print(f"{host}: netwerkverbinding mislukt (NETWORK).")
                return 1
    return 0


def allow_request(method, url):
    """Device-cloud writes are blocked even if a dependency attempts one."""
    parsed = urlsplit(str(url))
    if parsed.scheme != "https":
        return False
    host = (parsed.hostname or "").lower()
    if host == "accsmart.panasonic.com" or host.endswith(".accsmart.panasonic.com"):
        return method.upper() == "GET" or (
            method.upper() == "POST" and parsed.path in {"/auth/v2/login", "/auth/v2/logout"}
        )
    # Other requests are login/MFA or public app-version discovery. No device commands.
    if host == "authglb.digital.panasonic.com":
        return method.upper() in {"GET", "POST"}
    return method.upper() == "GET" and (
        host in {"apps.apple.com", "itunes.apple.com", "play.google.com", "www.appbrain.com"}
        or (host == "api.github.com" and parsed.path == "/gists/e886d56531dbcde08aa11c096ab0a219")
    )


def value(item):
    return getattr(item, "name", item)


async def probe(email, password):
    import aiohttp
    from aio_panasonic_comfort_cloud import ApiClient
    from aio_panasonic_comfort_cloud.exceptions import MFARequiredError, AgreementNotAcceptedError, LoginError

    async def guard(_session, _context, params):
        if not allow_request(params.method, params.url):
            raise RuntimeError("Probe blocked an unsupported request")

    trace = aiohttp.TraceConfig()
    trace.on_request_start.append(guard)
    # Auth redirects need the same protection as initial requests.
    async def redirect_guard(_session, _context, params):
        location = params.response.headers.get("Location")
        if location:
            from urllib.parse import urljoin
            target = urljoin(str(params.url), location)
            if urlsplit(target).scheme != "panasonic-iot-cfc" and not allow_request(params.method, target):
                raise RuntimeError("Probe blocked an unsafe redirect")
    trace.on_request_redirect.append(redirect_guard)
    report = []
    with tempfile.TemporaryDirectory(prefix="shoppinglist-panasonic-") as directory:
        async with aiohttp.ClientSession(connector=aiohttp.TCPConnector(ssl=tls_context()), timeout=aiohttp.ClientTimeout(total=45), trace_configs=[trace]) as session:
            client = ApiClient(email, password, session, token_file_name=str(Path(directory) / "session.json"), auto_power_on=False)
            authenticated = False
            try:
                try:
                    await client.start_session()
                except MFARequiredError:
                    code = getpass.getpass("Verificatiecode uit sms of authenticator (afgeschermd): ").strip()
                    if not code:
                        print("Geen code ingevuld. Test afgebroken.")
                        return 1
                    await client.start_session(otp_code=code)
                authenticated = True
                devices = client.get_devices()
                print(f"\nVerbinding gelukt. {len(devices)} airco('s) gevonden.")
                for info in devices:
                    try:
                        device = await client.get_device(info)
                        params = device.parameters
                        row = {"name": info.name, "power": value(params.power), "mode": value(params.mode), "targetTemperature": params.target_temperature, "insideTemperature": params.inside_temperature, "fanSpeed": value(params.fan_speed)}
                        report.append(row)
                        print(json.dumps(row, ensure_ascii=False))
                    except Exception:
                        report.append({"name": info.name, "status": "temporarily-unavailable"})
                        print(f"{info.name}: gevonden, maar status niet beschikbaar.")
                if not devices:
                    print("Er zijn geen gewone airco's zichtbaar. Controleer of ze bij dit account horen.")
                output = ROOT / "outputs" / "panasonic-probe" / "report.json"
                output.parent.mkdir(parents=True, exist_ok=True)
                output.write_text(json.dumps({"connected": True, "devices": report}, ensure_ascii=False, indent=2), encoding="utf8")
                output.chmod(0o600)
                print(f"Resultaat zonder inloggegevens: {output}")
                print("Geen temperatuur, modus of aan/uit-stand gewijzigd.")
                return 0
            except AgreementNotAcceptedError:
                print("Open eerst de officiële Comfort Cloud-app en bekijk de nieuwe voorwaarden. Deze test accepteert ze niet automatisch.")
                return 1
            except LoginError:
                print("Aanmelden is niet gelukt. Controleer je account in Comfort Cloud. Er is niet automatisch opnieuw geprobeerd.")
                return 1
            except aiohttp.ClientConnectorCertificateError:
                print("De beveiligde verbinding faalt bij de certificaatcontrole (TLS_CERTIFICATE). Dit is geen melding over je wachtwoord.")
                return 1
            except (aiohttp.ClientConnectionError, asyncio.TimeoutError):
                print("Panasonic kon niet bereikt worden of antwoordde niet op tijd (NETWORK). Dit bevestigt geen fout wachtwoord.")
                return 1
            except Exception as error:
                # Dependency exceptions may contain credentials, tokens or login HTML.
                category = "AUTH_FLOW" if error.__class__.__name__ == "ResponseError" else "PROBE_FAILED"
                print(f"De verbindingstest is niet gelukt ({category}). Het inlogproces kon niet afgerond worden; dit bevestigt geen fout wachtwoord. Inloggegevens zijn niet gelogd.")
                return 1
            finally:
                if authenticated:
                    try:
                        await client.stop_session()
                    except Exception:
                        pass
                # Library settings may save asynchronously; closing the client happens
                # before the private temporary directory is removed by the context above.


def main():
    if "--help" in sys.argv:
        print("Lokale alleen-lezen Panasonic Comfort Cloud-test. Voer dit script uit in een interactieve terminal. E-mail, wachtwoord en eventuele verificatiecode worden daar gevraagd; gebruik geen wachtwoord als opdrachtregelargument. Met --check-connection test je de beveiligde verbinding zonder inloggen.")
        return 0
    if "--check-connection" in sys.argv:
        logging.disable(logging.CRITICAL)
        return asyncio.run(check_connection())
    if not sys.stdin.isatty():
        print("Open een interactieve terminal voor de afgeschermde inlogvragen.")
        return 1
    os.umask(0o077)
    logging.disable(logging.CRITICAL)
    print("Panasonic Comfort Cloud — alleen verbinding en status testen.")
    print("Wachtwoord en codes worden niet getoond of opgeslagen. Sessietokens worden tijdelijk lokaal bewaard en na de test verwijderd.")
    email = input("Panasonic e-mailadres: ").strip()
    password = getpass.getpass("Panasonic wachtwoord (afgeschermd): ")
    if not email or not password:
        print("Geen volledige inloggegevens ingevoerd. Test afgebroken.")
        return 1
    try:
        return asyncio.run(probe(email, password))
    except ModuleNotFoundError:
        print("Installeer eerst de probe-vereisten; zie docs/panasonic-comfort-cloud.md.")
        return 1
    except (KeyboardInterrupt, EOFError):
        print("\nTest afgebroken.")
        return 1


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (KeyboardInterrupt, EOFError):
        print("\nTest afgebroken.")
        raise SystemExit(1)
