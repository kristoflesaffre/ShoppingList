"""Tests for the Pi side of «Sfeer op tv» / «Ook rond de tv» (home-assistant/custom_components/shoppinglist_cinema/ambience.py).

    python3 scripts/test-cinema-ambience.py
"""
import base64
import importlib.util
import json
import unittest
from pathlib import Path

source = Path(__file__).resolve().parent.parent / 'home-assistant/custom_components/shoppinglist_cinema/ambience.py'
spec = importlib.util.spec_from_file_location('ambience', source)
ambience = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ambience)

GOOD = {
    'enabled': True, 'calibrating': False, 'open': 'show-if-tv',
    'mask': {'corners': {'tl': [0.2, 0.4], 'tr': [0.8, 0.4], 'br': [0.8, 1], 'bl': [0.2, 1]}, 'margin': 2, 'soft': 1, 'blur': True, 'spread': 1.8},
}


def encode(value):
    return base64.urlsafe_b64encode(json.dumps(value).encode()).decode().rstrip('=')


class AmbienceTests(unittest.TestCase):
    def test_accepts_clean_settings(self):
        parsed = ambience.parse_settings(encode(GOOD))
        self.assertEqual(parsed['open'], 'show-if-tv')
        self.assertEqual(parsed['mask']['corners']['br'], [0.8, 1.0])

    def test_rejects_out_of_range_or_unknown(self):
        bad_corner = json.loads(json.dumps(GOOD))
        bad_corner['mask']['corners']['tl'] = [1.5, 0]
        self.assertIsNone(ambience.parse_settings(encode(bad_corner)))
        bad_open = {**GOOD, 'open': 'reboot'}
        self.assertIsNone(ambience.parse_settings(encode(bad_open)))
        self.assertIsNone(ambience.parse_settings("abc;rm -rf /"))
        self.assertIsNone(ambience.parse_settings('x' * 2000))

    def test_spread_defaults_for_older_masks(self):
        old = json.loads(json.dumps(GOOD))
        del old['mask']['spread']
        self.assertEqual(ambience.parse_settings(encode(old))['mask']['spread'], 1.8)

    def test_app_extra_is_shell_safe(self):
        extra = ambience.app_extra(ambience.parse_settings(encode(GOOD)))
        self.assertRegex(extra, r'^[A-Za-z0-9_-]+$')
        decoded = json.loads(base64.urlsafe_b64decode(extra + '=' * (-len(extra) % 4)))
        self.assertEqual(set(decoded), {'enabled', 'calibrating', 'mask'})

    def test_video_id(self):
        self.assertTrue(ambience.VIDEO_ID.match('uOquG6prOPY'))
        self.assertFalse(ambience.VIDEO_ID.match('uOquG6prOPY;x'))

    def test_magic_packet(self):
        packet = ambience.magic_packet('a4:30:7a:32:47:51')
        self.assertEqual(len(packet), 102)
        self.assertEqual(packet[:6], b'\xff' * 6)


class FrameColorTests(unittest.TestCase):
    @staticmethod
    def png(color, size=(96, 54), center=None):
        import io
        from PIL import Image
        image = Image.new('RGB', size, color)
        if center:
            w, h = size
            image.paste(center, (w // 4, h // 4, 3 * w // 4, 3 * h // 4))
        out = io.BytesIO()
        image.save(out, 'PNG')
        return base64.b64encode(out.getvalue()).decode()

    def test_orange_fire_stays_orange_around_a_black_tv(self):
        color, level = ambience.frame_color(self.png((200, 80, 20), center=(0, 0, 0)))
        self.assertGreater(color[0], color[1])
        self.assertGreater(color[1], color[2])
        self.assertGreater(level, 0.5)

    def test_black_picture_gives_no_colour(self):
        self.assertIsNone(ambience.frame_color(self.png((5, 5, 5))))

    def test_garbage_gives_no_colour(self):
        self.assertIsNone(ambience.frame_color('not-a-picture'))


if __name__ == '__main__':
    unittest.main()
