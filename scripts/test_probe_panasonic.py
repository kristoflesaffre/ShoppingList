import asyncio
from contextlib import redirect_stdout
import importlib.util
import io
from pathlib import Path
from types import SimpleNamespace
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location("probe", Path(__file__).with_name("probe-panasonic.py"))
probe = importlib.util.module_from_spec(spec)
spec.loader.exec_module(probe)


class ProbeTests(unittest.TestCase):
    def test_device_control_and_legal_acceptance_are_blocked(self):
        for path in ["/deviceStatus/control", "/weeklyTimer", "/agreements/accept", "/device/control"]:
            self.assertFalse(probe.allow_request("POST", "https://accsmart.panasonic.com" + path))
        self.assertFalse(probe.allow_request("DELETE", "https://accsmart.panasonic.com/device"))

    def test_reads_and_authentication_are_allowed_over_https(self):
        self.assertTrue(probe.allow_request("GET", "https://accsmart.panasonic.com/device/group"))
        self.assertTrue(probe.allow_request("POST", "https://accsmart.panasonic.com/auth/v2/login"))
        self.assertTrue(probe.allow_request("POST", "https://accsmart.panasonic.com/auth/v2/logout"))
        self.assertTrue(probe.allow_request("POST", "https://authglb.digital.panasonic.com/oauth/token"))
        self.assertFalse(probe.allow_request("POST", "http://authglb.digital.panasonic.com/oauth/token"))
        self.assertFalse(probe.allow_request("POST", "https://attacker.example/oauth/token"))

    def test_version_lookup_does_not_allow_arbitrary_github_requests(self):
        self.assertTrue(probe.allow_request("GET", "https://api.github.com/gists/e886d56531dbcde08aa11c096ab0a219"))
        self.assertFalse(probe.allow_request("POST", "https://api.github.com/gists/e886d56531dbcde08aa11c096ab0a219"))
        self.assertFalse(probe.allow_request("GET", "https://api.github.com/repos/other/project"))

    def test_probe_reads_status_removes_tokens_and_never_reports_credentials(self):
        paths = []
        calls = []

        class Client:
            def __init__(self, email, password, session, **options):
                self_test.assertFalse(options["auto_power_on"])
                path = Path(options["token_file_name"])
                path.write_text("private-session-token")
                paths.append(path)
            async def start_session(self): calls.append("login")
            def get_devices(self): return [SimpleNamespace(name="Woonkamer")]
            async def get_device(self, info):
                calls.append("read-status")
                return SimpleNamespace(parameters=SimpleNamespace(power=SimpleNamespace(name="Off"), mode=SimpleNamespace(name="Cool"), target_temperature=22, inside_temperature=21, fan_speed=SimpleNamespace(name="Auto")))
            async def stop_session(self): calls.append("logout")

        self_test = self
        with tempfile.TemporaryDirectory() as directory:
            output = io.StringIO()
            with patch("aio_panasonic_comfort_cloud.ApiClient", Client), patch.object(probe, "ROOT", Path(directory)), redirect_stdout(output):
                result = asyncio.run(probe.probe("private-email", "private-password"))
            self.assertEqual(result, 0)
            self.assertEqual(calls, ["login", "read-status", "logout"])
            report = (Path(directory) / "outputs/panasonic-probe/report.json").read_text()
            for secret in ["private-email", "private-password", "private-session-token"]:
                self.assertNotIn(secret, report + output.getvalue())
            self.assertIn("Woonkamer", report)
        self.assertTrue(all(not path.exists() for path in paths))


if __name__ == "__main__":
    unittest.main()
