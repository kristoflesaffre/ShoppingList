import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const fixture=vi.hoisted(()=>({rows:new Map<string,Record<string,unknown>>(),fetch:vi.fn()}));
vi.mock('./projector-relay',()=>({ownerBridge:async()=>({id:'bridge',ownerId:'owner'})}));
vi.mock('./instant-admin',()=>({getInstantAdminDb:()=>({
 query:async(query:Record<string,{$?:{where?:Record<string,unknown>}}>)=>Object.fromEntries(Object.entries(query).map(([ns,q])=>[ns,Array.from(fixture.rows.entries()).filter(([key,row])=>key.startsWith(ns+':')&&Object.entries(q.$?.where??{}).every(([k,v])=>row[k]===v)).map(([,row])=>row)])),
 tx:new Proxy({},{get:(_,ns:string)=>new Proxy({},{get:(_,id:string)=>({create:(data:unknown)=>({ns,id,data,create:true}),update:(data:unknown)=>({ns,id,data}),delete:()=>({ns,id,delete:true})})})}),
 transact:async(input:unknown)=>{for(const op of (Array.isArray(input)?input:[input]) as {ns:string;id:string;data?:Record<string,unknown>;create?:boolean;delete?:boolean}[]){const key=`${op.ns}:${op.id}`;if(op.create&&fixture.rows.has(key))throw Error('exists');if(op.delete)fixture.rows.delete(key);else fixture.rows.set(key,{...fixture.rows.get(key),id:op.id,...op.data});}}
})}));
import {analyse,companionId} from './cinema-companion';
function seed(key:string,payload:unknown){const id=companionId(`owner:${key}`);fixture.rows.set(`cinemaCompanionData:${id}`,{id,ownerId:'owner',key:`owner:${key}`,payload,expiresAt:900000});}
const p={sessionId:'session12345',sequence:1,mediaKey:'tt1234567:1:1',streamFingerprint:'a'.repeat(64),streamEvidence:true,imdbId:'tt1234567',mediaType:'series',season:1,episode:1,title:'Test',positionMs:16000,durationMs:100000,speed:1,state:'playing',observedAt:100000,uncertaintyMs:500,deviceUpdateElapsedMs:1234};
beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(100000);vi.stubEnv('CINEMA_COMPANION_ENABLED','1');vi.stubEnv('GEMINI_API_KEY','test-key');fixture.rows.clear();fixture.fetch.mockReset();vi.stubGlobal('fetch',fixture.fetch);fixture.rows.set('cinemaPlayback:bridge',{id:'bridge',ownerId:'owner',payload:{...p}});seed('validation',{sessionId:p.sessionId,fingerprint:p.streamFingerprint,expiresAt:900000});seed(`track:${p.sessionId}`,{sessionId:p.sessionId,fingerprint:p.streamFingerprint,hash:'track',name:'test.srt',confirmed:true,cues:[{id:'cue-0',startMs:8000,endMs:10000,text:'ALICE: Go home.',speaker:'ALICE'},{id:'cue-future',startMs:17000,endMs:20000,text:'FUTURE_CANARY: the hero dies.',speaker:'Future'}]});});
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();vi.unstubAllGlobals();});
const response=(evidence=[{cueId:'cue-0',quote:'Go home.'}])=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({answer:'Alice asks someone to go home.',evidence})}]}}]}));
it('sends only complete allowed evidence, snapshots the question and coalesces identical requests',async()=>{
 fixture.fetch.mockResolvedValue(response());const a=await analyse('owner','What happened?','scene');
 expect(a.positionMs).toBe(16000);expect(a.contextEndMs).toBe(15000);
 const sent=fixture.fetch.mock.calls[0][1].body;expect(sent).not.toContain('FUTURE_CANARY');expect(sent).not.toContain('the hero dies');expect(sent).toContain('Go home.');
 await analyse('owner','What happened?','scene');expect(fixture.fetch).toHaveBeenCalledTimes(1);
});
it('refuses citations outside the allowed evidence instead of publishing the invented answer',async()=>{fixture.fetch.mockResolvedValue(response([{cueId:'cue-future',quote:'the hero dies'}]));const result=await analyse('owner','What happened?','scene');expect(result.answer).toBe('Dat is op dit moment nog niet duidelijk in het verhaal.');expect(result.evidence).toEqual([]);});
it('does not publish a late answer after rewinding',async()=>{fixture.fetch.mockImplementation(async()=>{fixture.rows.set('cinemaPlayback:bridge',{id:'bridge',ownerId:'owner',payload:{...p,sequence:2,positionMs:1000}});return response();});await expect(analyse('owner','What happened?','scene')).rejects.toThrow('scene-changed');expect(Array.from(fixture.rows.values()).some(r=>r.kind==='message')).toBe(false);});
it('does not call the model for an unverified stream',async()=>{fixture.rows.set('cinemaPlayback:bridge',{id:'bridge',ownerId:'owner',payload:{...p,streamEvidence:false}});await expect(analyse('owner','What happened?','scene')).rejects.toThrow('context-not-verified');expect(fixture.fetch).not.toHaveBeenCalled();});
