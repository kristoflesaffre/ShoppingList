import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import MagicMock, patch
spec = importlib.util.spec_from_file_location('blinds', Path(__file__).with_name('brel-blinds.py'))
blinds = importlib.util.module_from_spec(spec)
spec.loader.exec_module(blinds)
MAC = 'ece33429034c0001'

class BlindsTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.path = Path(self.directory.name) / 'blinds.json'
        self.path.write_text(json.dumps({'host': '192.168.132.222', 'gatewayMac': 'ece33429034c', 'key': '12ab345c-d67e-8f', 'blinds': [{'mac': MAC, 'name': 'Woonkamer'}], 'ownerId': 'owner'}))
        self.config = patch.object(blinds, 'CONFIG', self.path)
        self.config.start()
        self.blind = MagicMock(position=60, status='Stopped', available=True, battery_level=75)
        self.blind._write.return_value = {'msgType': 'WriteDeviceAck', 'data': {}}
        self.gateway = MagicMock(mac='ece33429034c', device_list={MAC: self.blind})
        self.connect = patch.object(blinds, 'connect', return_value=self.gateway)
        self.connect.start()
    def tearDown(self):
        self.connect.stop()
        self.config.stop()
        self.directory.cleanup()
    def test_status_never_writes(self):
        result = blinds.run('status')
        self.assertEqual(result['blinds'][0]['position'], 60)
        self.blind._write.assert_not_called()
    def test_each_command_is_one_absolute_write(self):
        for action, data in (('open', {'operation': 1}), ('close', {'operation': 0}), ('stop', {'operation': 2})):
            self.blind._write.reset_mock()
            self.assertEqual(blinds.run(action, MAC), {'accepted': True})
            self.blind._write.assert_called_once_with(data)
        self.blind._write.reset_mock()
        blinds.run('position', MAC, 30)
        self.blind._write.assert_called_once_with({'targetPosition': 30})
    def test_rejected_key_is_not_reported_as_success(self):
        self.blind._write.return_value = {'msgType': 'WriteDeviceAck', 'actionResult': 'AccessToken error'}
        with self.assertRaises(ValueError):
            blinds.run('open', MAC)
    def test_only_configured_blinds_and_valid_positions(self):
        for args in (('open', 'ece33429034c0009'), ('position', MAC, 101), ('reset', MAC)):
            with self.assertRaises(ValueError):
                blinds.run(*args)
        self.blind._write.assert_not_called()
    def test_public_address_refused(self):
        self.path.write_text(json.dumps({'host': '8.8.8.8', 'gatewayMac': 'ece33429034c', 'key': 'x' * 16, 'blinds': [{'mac': MAC, 'name': 'x'}]}))
        with self.assertRaises(ValueError):
            blinds.run('open', MAC)

if __name__ == '__main__':
    unittest.main()
