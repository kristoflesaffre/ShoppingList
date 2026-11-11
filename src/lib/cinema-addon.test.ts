import {expect,it} from 'vitest';
import {parseAddonVideo,trustedSubtitleUrl,addonOrigin} from './cinema-addon';
it('reads file evidence only when explicitly provided, including URL encoded filenames',()=>{
 expect(parseAddonVideo(['subtitles','series','tt1234567:2:4','videoHash=0123456789ABCDEF&videoSize=1234&filename=My%20Film.mkv.json'])).toMatchObject({imdbId:'tt1234567',season:2,episode:4,videoHash:'0123456789abcdef',videoSize:1234,filename:'My Film.mkv'});
 expect(parseAddonVideo(['subtitles','movie','tt1234567.json'])).toMatchObject({videoHash:null,videoSize:null});
});
it('rejects malformed types, identities and ambiguous hashes',()=>{for(const p of [['subtitles','movie','tt1234567:1:1.json'],['subtitles','series','tt1234567.json'],['subtitles','movie','https://evil.json'],['subtitles','movie','tt1234567','videoHash=a&videoHash=b.json']])expect(parseAddonVideo(p)).toBeNull();});
it('prevents callback URLs from becoming an arbitrary download proxy',()=>{expect(trustedSubtitleUrl('https://subs5.strem.io/track.srt')).toBeTruthy();for(const u of ['http://subs5.strem.io/x','https://subs5.strem.io.evil.test/x','https://user:pass@subs5.strem.io/x','https://subs5.strem.io:444/x','https://127.0.0.1/x','file:///etc/passwd'])expect(trustedSubtitleUrl(u)).toBeNull();});
it('uses only an explicit trusted origin, without embedded credentials or a base path',()=>{expect(addonOrigin('https://home.example')).toBe('https://home.example');expect(()=>addonOrigin('http://192.168.132.183:3000')).toThrow();expect(()=>addonOrigin('http://public.example')).toThrow();expect(()=>addonOrigin('https://user:pass@public.example')).toThrow();expect(()=>addonOrigin('https://public.example/path')).toThrow();});
