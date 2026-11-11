import {beforeEach,expect,it,vi} from 'vitest';import {NextRequest} from 'next/server';
const f=vi.hoisted(()=>({authorize:vi.fn(),list:vi.fn(),track:vi.fn()}));
vi.mock('@/lib/server/cinema-addon',()=>({authorizeAddon:f.authorize,relaySubtitles:f.list,relayTrack:f.track}));
import {GET,HEAD} from './route';
const params={owner:'owner',token:'private',resource:['manifest.json']};const req=()=>new NextRequest('https://home.example/api/cinema/addon/owner/private/manifest.json');
beforeEach(()=>{f.authorize.mockReset().mockResolvedValue(null);f.list.mockReset();f.track.mockReset();});
it('does not expose manifests or tracks for revoked or invalid capabilities',async()=>{expect((await GET(req(),{params})).status).toBe(404);expect((await GET(req(),{params:{...params,resource:['track','id','hash.srt']}})).status).toBe(404);expect(f.track).not.toHaveBeenCalled();});
it('serves only the subtitle resource, without account credentials or a video stream',async()=>{f.authorize.mockResolvedValue({origin:'https://home.example'});const r=await GET(req(),{params});const j=await r.json();expect(j.resources).toEqual(['subtitles']);expect(j.catalogs).toEqual([]);expect(r.headers.get('cache-control')).toContain('no-store');expect(JSON.stringify(j)).not.toContain('private');});
it('a HEAD request can never be recorded as a loaded subtitle',async()=>{expect((await HEAD()).status).toBe(405);expect(f.track).not.toHaveBeenCalled();});
