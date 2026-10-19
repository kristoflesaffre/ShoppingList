import base64
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import Mock, patch
spec = importlib.util.spec_from_file_location('screen', Path(__file__).with_name('broadlink-screen.py'))
screen = importlib.util.module_from_spec(spec)
spec.loader.exec_module(screen)

class ScreenTest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.path = Path(self.directory.name) / 'screen.json'
        self.path.write_text(json.dumps({'host':'192.168.132.164','mac':'1234567890ab','commands':{key:base64.b64encode(b'packet').decode() for key in ('up','stop','down')}}))
        self.config = patch.object(screen, 'CONFIG', self.path)
        self.config.start()
        self.device = Mock(model='RM4 pro', is_locked=False)
        self.device.mac.hex.return_value = '1234567890ab'
        self.device.auth.return_value = True
    def tearDown(self):
        self.config.stop()
        self.directory.cleanup()
    def test_status_never_contacts_device(self):
        with patch('broadlink.hello') as hello:
            self.assertEqual(screen.run('status'), {'configured':True})
            hello.assert_not_called()
    def test_only_one_send(self):
        with patch('broadlink.hello', return_value=self.device):
            self.assertEqual(screen.run('stop'), {'accepted':True})
        self.device.send_data.assert_called_once_with(b'packet')
    def test_no_send_after_identity_change(self):
        self.device.mac.hex.return_value = 'different'
        with patch('broadlink.hello', return_value=self.device):
            with self.assertRaises(ValueError): screen.run('down')
        self.device.send_data.assert_not_called()
    def test_timeout_does_not_retry(self):
        self.device.send_data.side_effect = TimeoutError()
        with patch('broadlink.hello', return_value=self.device):
            with self.assertRaises(TimeoutError): screen.run('up')
        self.device.send_data.assert_called_once()
    def test_unknown_command_is_rejected(self):
        with patch('broadlink.hello') as hello:
            with self.assertRaises(ValueError): screen.run('reset')
            hello.assert_not_called()

if __name__ == '__main__': unittest.main()
