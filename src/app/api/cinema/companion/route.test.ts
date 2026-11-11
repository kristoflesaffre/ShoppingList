import {beforeEach,it,expect,vi} from 'vitest';
import {NextRequest} from 'next/server';
const auth=vi.hoisted(()=>({user:vi.fn()}));
vi.mock('@/lib/server/google-connection-store',()=>({verifiedUserId:auth.user}));
vi.mock('@/lib/google-dashboard-auth',()=>({googleRequestOrigin:()=> 'https://home.example'}));
const current=vi.hoisted(()=>vi.fn());
vi.mock('@/lib/server/cinema-companion',()=>({current,analyse:vi.fn(),episodeCast:vi.fn(),getData:vi.fn(),putData:vi.fn(),readMessages:vi.fn(),visibleAnswers:vi.fn()}));
import {GET,POST,DELETE} from './route';
beforeEach(()=>{auth.user.mockResolvedValue(null);current.mockReset();});
it('requires authentication on reads and every mutation',async()=>{
 expect((await GET(new NextRequest('https://home.example/api/cinema/companion'))).status).toBe(401);
 for(const fn of [POST,DELETE])expect((await fn(new NextRequest('https://home.example/api/cinema/companion',{method:fn===POST?'POST':'DELETE',headers:{origin:'https://home.example'}}))).status).toBe(401);
 expect(current).not.toHaveBeenCalled();
});
it('rejects cross-origin requests even with an authenticated owner',async()=>{auth.user.mockResolvedValue('owner');expect((await POST(new NextRequest('https://home.example/api/cinema/companion',{method:'POST',headers:{origin:'https://evil.example'}}))).status).toBe(403);expect(current).not.toHaveBeenCalled();});
it('never accepts a client supplied playback validation operation',async()=>{auth.user.mockResolvedValue('owner');current.mockResolvedValue({playback:null});const response=await POST(new NextRequest('https://home.example/api/cinema/companion',{method:'POST',headers:{origin:'https://home.example','content-type':'application/json'},body:JSON.stringify({action:'validate',verified:true,positionMs:999999})}));expect(response.status).toBe(400);});
