"""No real network connections or power commands; exercise explicit on/off behavior."""
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import AsyncMock, Mock

spec = importlib.util.spec_from_file_location('projector_remote', Path(__file__).with_name('projector-remote.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ProjectorTests(unittest.IsolatedAsyncioTestCase):
    def remote(self, is_on=False, mac='known'):
        return Mock(async_get_name_and_mac=AsyncMock(return_value=('Projector', mac)),
                    async_connect=AsyncMock(), is_on=is_on)

    async def test_disabled_never_connects(self):
        remote = self.remote()
        self.assertFalse((await module.wake({'enabled': False}, remote))['accepted'])
        remote.async_connect.assert_not_called()

    async def test_already_on_never_sends_power_or_home(self):
        remote = self.remote(is_on=True)
        result = await module.wake({'enabled': True, 'paired': True, 'mac': 'known'}, remote)
        self.assertTrue(result['alreadyOn'])
        remote.send_key_command.assert_not_called()
        remote.disconnect.assert_called_once()

    async def test_standby_only_sends_explicit_wakeup(self):
        remote = self.remote()
        remote.send_key_command.side_effect = lambda key: setattr(remote, 'is_on', True)
        result = await module.wake({'enabled': True, 'paired': True, 'mac': 'known'}, remote)
        self.assertTrue(result['isOn'])
        remote.send_key_command.assert_called_once_with('WAKEUP')
        remote.disconnect.assert_called_once()

    async def test_changed_device_never_gets_commands(self):
        remote = self.remote(mac='different')
        with self.assertRaises(ValueError):
            await module.wake({'enabled': True, 'paired': True, 'mac': 'known'}, remote)
        remote.async_connect.assert_not_called()
        remote.send_key_command.assert_not_called()
        remote.disconnect.assert_called_once()

    async def test_off_only_sends_sleep(self):
        remote = self.remote(is_on=True)
        remote.send_key_command.side_effect = lambda key: setattr(remote, 'is_on', False)
        result = await module.sleep({'enabled': True, 'paired': True, 'mac': 'known'}, remote)
        self.assertFalse(result['isOn'])
        remote.send_key_command.assert_called_once_with('SLEEP')
        remote.disconnect.assert_called_once()

    async def test_already_off_does_not_toggle_on(self):
        remote = self.remote(is_on=False)
        result = await module.sleep({'enabled': True, 'paired': True, 'mac': 'known'}, remote)
        self.assertTrue(result['alreadyAtTarget'])
        remote.send_key_command.assert_not_called()

    def test_only_private_lan_addresses(self):
        self.assertEqual(module.private_host('192.168.1.4'), '192.168.1.4')
        for host in ['127.0.0.1', '169.254.1.1', '8.8.8.8', 'example.com', '224.0.0.1', '0.0.0.0', '::1']:
            with self.assertRaises(ValueError):
                module.private_host(host)


if __name__ == '__main__':
    unittest.main()
