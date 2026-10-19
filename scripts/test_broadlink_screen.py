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
        self.timing = patch.object(screen, 'STATE', Path(self.directory.name) / 'timing.json')
        self.timing.start()
        self.device = Mock(model='RM4 pro', is_locked=False)
        self.device.mac.hex.return_value = '1234567890ab'
        self.device.auth.return_value = True
    def tearDown(self):
        self.config.stop()
        self.timing.stop()
        self.directory.cleanup()
    def test_status_never_contacts_device(self):
        with patch('broadlink.hello') as hello:
            self.assertTrue(screen.run('status')['configured'])
            hello.assert_not_called()
    def test_only_one_send(self):
        with patch('broadlink.hello', return_value=self.device):
            self.assertTrue(screen.run('stop')['accepted'])
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
    def test_paused_controls_never_contact_remote(self):
        config = json.loads(self.path.read_text())
        config['paused'] = True
        self.path.write_text(json.dumps(config))
        with patch('broadlink.hello') as hello:
            self.assertTrue(screen.run('status')['paused'])
            for action in ('up','stop','down','calibrate','preset'):
                with self.assertRaises(ValueError): screen.run(action)
            hello.assert_not_called()

    def test_unknown_command_is_rejected(self):
        with patch('broadlink.hello') as hello:
            with self.assertRaises(ValueError): screen.run('reset')
            hello.assert_not_called()

class TimingTest(ScreenTest):
    def test_calibration_records_actual_command_interval(self):
        with patch('broadlink.hello', return_value=self.device), patch.object(screen, 'launch_watchdog') as watchdog, patch.object(screen.time, 'monotonic', return_value=100):
            screen.run('calibrate')
        with patch('broadlink.hello', return_value=self.device), patch.object(screen.time, 'monotonic', return_value=105.125):
            result = screen.run('stop')
        self.assertEqual(result['durationSeconds'], 5.125)
        self.assertFalse(result['calibrating'])
        watchdog.assert_called_once()
    def test_preset_uses_saved_interval_and_same_connection(self):
        screen.save({'kind':'idle','duration':3.25})
        with patch('broadlink.hello', return_value=self.device), patch.object(screen, 'wait_and_stop') as wait:
            screen.run('preset')
        self.assertEqual(wait.call_args.args[2], 3.25)
        self.assertIs(wait.call_args.args[3], self.device)
    def test_manual_stop_cancels_scheduled_stop(self):
        screen.save({'kind':'idle','runId':'cancelled','duration':2})
        screen.wait_and_stop({}, 'old-run', 2, self.device)
        self.device.send_data.assert_not_called()
    def test_deadline_sends_stop_once(self):
        screen.save({'kind':'preset','runId':'run','started':100,'duration':2})
        config = json.loads(self.path.read_text())
        with patch.object(screen.time,'monotonic',return_value=102):
            screen.wait_and_stop(config, 'run', 2, self.device)
        self.device.send_data.assert_called_once_with(b'packet')
        self.assertEqual(screen.state()['kind'],'idle')
    def test_no_preset_without_valid_saved_time(self):
        for value in [None, -1, 0, 61, float('nan')]:
            screen.save({'kind':'idle','duration':value})
            with self.assertRaises(ValueError): screen.run('preset')
        self.device.send_data.assert_not_called()

if __name__ == '__main__': unittest.main()
