import {afterEach,beforeEach,expect,it,vi} from 'vitest';
const f=vi.hoisted(()=>({rows:new Map<string,unknown>(),state:vi.fn(),fetch:vi.fn(),provider:vi.fn(),session:vi.fn()}));
vi.mock('./cinema-companion',()=>({current:f.state,getData:async(o:string,k:string)=>f.rows.get(o+':'+k)??null,putData:async(o:string,k:string,p:unknown)=>{f.rows.set(o+':'+k,p);}}));
vi.mock('./stremio-store',()=>({loadStremio:f.session}));vi.mock('./stremio-cloud',()=>({hasOfficialSubtitleAddon:f.provider}));
import {addonStatus,authorizeAddon,createAddon,relaySubtitles,relayTrack,revokeAddon,type AddonConfig} from './cinema-addon';
const owner='11111111-1111-4111-a111-111111111111';
const config:AddonConfig={token:'a'.repeat(43),origin:'https://home.example',source:'opensubtitles-v3',expiresAt:900000};
const state=()=>({live:true,playback:{sessionId:'device-session',streamFingerprint:'f'.repeat(64),positionMs:30000}});
const parts=['subtitles','movie','tt1234567','videoHash=0123456789abcdef&videoSize=1234.json'];
const list=()=>new Response(JSON.stringify({subtitles:[{id:'official-1',lang:'eng',url:'https://subs5.strem.io/known.srt',subtitleFileName:'known.srt'},{id:'bad',lang:'eng',url:'https://127.0.0.1/private'}]}));
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(100000);f.rows.clear();f.fetch.mockReset();f.state.mockReset().mockImplementation(async()=>state());f.provider.mockReset().mockResolvedValue(true);f.session.mockReset().mockResolvedValue({ownerId:owner,authKey:'private'});vi.stubGlobal('fetch',f.fetch);});
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals();});
it('gates setup on the existing connected provider and supports owner-scoped revocation',async()=>{
 f.session.mockResolvedValueOnce(null);await expect(createAddon(owner,config.origin)).rejects.toThrow('stremio-not-connected');f.provider.mockResolvedValueOnce(false);await expect(createAddon(owner,config.origin)).rejects.toThrow('subtitle-provider-not-installed');
 const c=await createAddon(owner,config.origin);expect(c.token).toHaveLength(43);expect(await authorizeAddon(owner,c.token)).toEqual(c);expect(await authorizeAddon(owner,'b'.repeat(43))).toBeNull();expect(await authorizeAddon('22222222-2222-4222-a222-222222222222',c.token)).toBeNull();await revokeAddon(owner);expect(await authorizeAddon(owner,c.token)).toBeNull();
});
it('a listing is never a selected track or validation; only safe URLs are rewritten',async()=>{
 f.fetch.mockResolvedValue(list());const r=await relaySubtitles(owner,config,parts);expect(r.subtitles).toHaveLength(1);expect(r.subtitles[0].url).toContain('/track/');expect(r.subtitles[0].url).not.toContain('subs5.strem.io');
 const status=await addonStatus(owner);expect(status.request?.video.videoHash).toBe('0123456789abcdef');expect(status.receipt).toBeNull();expect(Array.from(f.rows.keys()).some(k=>k.endsWith(':validation')||k.includes(':track:'))).toBe(false);
 await relaySubtitles(owner,config,parts);expect(f.fetch).toHaveBeenCalledTimes(1);
});
it('downloads the exact returned track, stores private cues and keeps it unverified',async()=>{
 f.fetch.mockResolvedValueOnce(list()).mockResolvedValueOnce(new Response('1\n00:00:01,000 --> 00:00:03,000\nALICE: Hello.'));
 const r=await relaySubtitles(owner,config,parts);const u=new URL(r.subtitles[0].url),segments=u.pathname.split('/');const text=await relayTrack(owner,segments.at(-2)!,segments.at(-1)!);expect(text).toContain('ALICE');
 const status=await addonStatus(owner);expect(status.receipt).toMatchObject({status:'loaded-unverified',cueCount:1,positionMs:30000});const candidate=f.rows.get(owner+':addon-candidate:'+status.receipt?.id);expect(candidate).toMatchObject({confirmed:false});expect(Array.from(f.rows.keys()).some(k=>k.endsWith(':validation')||k.includes(':track:'))).toBe(false);
 await relayTrack(owner,segments.at(-2)!,segments.at(-1)!);expect(f.fetch).toHaveBeenCalledTimes(2);
});
it('does not invent a file hash when the player omits one',async()=>{f.fetch.mockResolvedValue(list());await relaySubtitles(owner,config,['subtitles','movie','tt1234567.json']);expect((await addonStatus(owner)).request?.video.videoHash).toBeNull();});
it('serves subtitle choices before the first device heartbeat without inventing a session',async()=>{
 f.state.mockResolvedValue({live:false,playback:null});f.fetch.mockResolvedValue(list());
 const r=await relaySubtitles(owner,config,parts);expect(r.subtitles).toHaveLength(1);const status=await addonStatus(owner);expect(status.request?.video.videoHash).toBe('0123456789abcdef');expect(status.request?.deviceMatched).toBe(false);expect(status.receipt).toBeNull();expect(Array.from(f.rows.keys()).some(k=>k.endsWith(':validation')||k.includes(':track:'))).toBe(false);
});
it('does not attach a listing to a device session that changed during the upstream request',async()=>{
 f.fetch.mockImplementationOnce(async()=>{f.state.mockResolvedValue({live:true,playback:{...state().playback,sessionId:'different'}});return list();});const r=await relaySubtitles(owner,config,parts);expect(r.subtitles).toHaveLength(1);const status=await addonStatus(owner);expect(status.request?.deviceMatched).toBe(false);
});
it('records an unavailable provider without creating subtitle context',async()=>{f.fetch.mockResolvedValue(new Response('provider down',{status:520}));await expect(relaySubtitles(owner,config,parts)).rejects.toThrow('subtitle-provider-unavailable');expect((await addonStatus(owner)).request?.providerStatus).toBe('unavailable');expect(Array.from(f.rows.keys()).some(k=>k.includes('candidate'))).toBe(false);});
it('rejects unknown and old track links before making a download',async()=>{await expect(relayTrack(owner,'11111111-1111-4111-a111-111111111111','a'.repeat(32)+'.srt')).rejects.toThrow('scene-changed');expect(f.fetch).not.toHaveBeenCalled();});
it('serves captions after a device-session switch but leaves their timing and binding unknown',async()=>{
 f.fetch.mockResolvedValueOnce(list());const listed=await relaySubtitles(owner,config,parts);const segments=new URL(listed.subtitles[0].url).pathname.split('/');
 f.fetch.mockImplementationOnce(async()=>{f.state.mockResolvedValue({live:true,playback:{...state().playback,sessionId:'new-session'}});return new Response('1\n00:00:01,000 --> 00:00:03,000\nCaption.');});
 await expect(relayTrack(owner,segments.at(-2)!,segments.at(-1)!)).resolves.toContain('Caption.');const status=await addonStatus(owner);expect(status.receipt).toMatchObject({sessionId:null,deviceFingerprint:null,positionMs:null,status:'loaded-unverified'});expect(Array.from(f.rows.keys()).some(k=>k.endsWith(':validation')||k.includes(':track:'))).toBe(false);
});
it('serves an auto-selected track before playback starts without granting story context',async()=>{
 f.state.mockResolvedValue({live:false,playback:null});f.fetch.mockResolvedValueOnce(list()).mockResolvedValueOnce(new Response('1\n00:00:01,000 --> 00:00:03,000\nCaption.'));
 const listed=await relaySubtitles(owner,config,parts),segments=new URL(listed.subtitles[0].url).pathname.split('/');await expect(relayTrack(owner,segments.at(-2)!,segments.at(-1)!)).resolves.toContain('Caption.');expect((await addonStatus(owner)).receipt).toMatchObject({sessionId:null,positionMs:null,status:'loaded-unverified'});
});
