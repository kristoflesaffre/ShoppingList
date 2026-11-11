import importlib.util
from pathlib import Path
import unittest
spec=importlib.util.spec_from_file_location('companion',Path(__file__).resolve().parents[1]/'home-assistant/custom_components/shoppinglist_cinema/companion.py')
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
RAW='''package=other.player
state=PlaybackState {state=PLAYING(3), position=99999, speed=1.0, updated=9000}
package=com.stremio.one
state=PlaybackState {state=PLAYING(3), position=10000, speed=1.0, updated=9000}
metadata: mediaId=tt1234567:2:4, title=Test, duration=600000
COMPANION_UPTIME
10.0 3.0'''
class Tests(unittest.TestCase):
 def test_probe_display_metadata_does_not_grant_stream_identity(self):
  metadata=m.parse_probe_metadata('{"stremio":true,"TITLE":"Test","DURATION":"6171250","MEDIA_ID":"tt9999999","MEDIA_URI_SHA256":"abc"}')
  p=m.parse_media_session(RAW.replace(', duration=600000',''),metadata)
  self.assertEqual(p['durationMs'],6171250)
  self.assertEqual(p['imdbId'],'tt1234567')
  self.assertFalse(p['streamEvidence'])
  self.assertEqual(m.parse_media_session(RAW.replace(', duration=600000',''),{**metadata,'title':'Other'})['durationMs'],0)
  for raw in ['{}','null','{"stremio":true,"TITLE":"Test","DURATION":-1}','{"stremio":true,"TITLE":"Test","DURATION":86400001}']:
   self.assertIsNone(m.parse_probe_metadata(raw))
 def test_real_xgimi_description_without_duration(self):
  raw='''package=com.stremio.one
state=PlaybackState {state=PLAYING(3), position=4034236, buffered position=0, speed=1.0, updated=1279354960, actions=770}
metadata: size=4, description=The Swedish Connection, null, null
queueTitle=null, size=0
COMPANION_UPTIME
1279650.95 146622.18'''
  p=m.parse_media_session(raw)
  self.assertEqual(p['title'],'The Swedish Connection')
  self.assertEqual(p['positionMs'],4330226)
  self.assertEqual(p['durationMs'],0)
  self.assertFalse(p['streamEvidence'])
  self.assertIsNone(p['imdbId'])
  self.assertEqual(p['uncertaintyMs'],1500)
  t=m.Telemetry();a=t.snapshot(raw,1000);b=t.snapshot(raw.replace('The Swedish Connection','Another Film'),2000)
  self.assertNotEqual(a['sessionId'],b['sessionId'])
 def test_projector_clock(self):
  p=m.parse_media_session(RAW);self.assertEqual(p['positionMs'],11000);self.assertEqual(p['episode'],4);self.assertEqual(p['imdbId'],'tt1234567')
 def test_unknown_identity(self):
  self.assertIsNone(m.parse_media_session(RAW.replace('tt1234567:2:4','addon:custom'))['imdbId'])
 def test_no_stremio(self):self.assertIsNone(m.parse_media_session('package=other\nstate=PlaybackState {state=PLAYING}'))
 def test_no_substring_package(self):self.assertIsNone(m.parse_media_session(RAW.replace('com.stremio.one','com.stremio.one.fake')))
 def test_session_change(self):
  t=m.Telemetry();a=t.snapshot(RAW,1000);b=t.snapshot(RAW.replace(':2:4',':2:5'),2000);self.assertNotEqual(a['sessionId'],b['sessionId']);self.assertGreater(b['sequence'],a['sequence'])
 def test_paused_heartbeat(self):
  t=m.Telemetry();raw=RAW.replace('PLAYING','PAUSED');self.assertIsNotNone(t.snapshot(raw,1000));self.assertIsNone(t.snapshot(raw,2000));self.assertIsNotNone(t.snapshot(raw,7000))
 def test_steady_playback_only_heartbeats_but_seek_and_pause_publish_at_once(self):
  orig=m.parse_media_session
  pos={'v':10000,'state':'playing'}
  m.parse_media_session=lambda raw,metadata=None:{**orig(RAW),'positionMs':pos['v'],'state':pos['state'],'speed':1.0 if pos['state']=='playing' else 0}
  try:
   t=m.Telemetry();self.assertIsNotNone(t.snapshot(RAW,1000))
   published=0
   for now in range(3000,13000,2000):
    pos['v']=10000+(now-1000)
    published+=t.snapshot(RAW,now) is not None
   self.assertEqual(published,1)
   pos['v']=1000;self.assertIsNotNone(t.snapshot(RAW,13500))
   pos['state']='paused';self.assertIsNotNone(t.snapshot(RAW,14000))
  finally:m.parse_media_session=orig
 def test_no_false_verification(self):self.assertNotIn('verified',m.parse_media_session(RAW))
if __name__=='__main__':unittest.main()
