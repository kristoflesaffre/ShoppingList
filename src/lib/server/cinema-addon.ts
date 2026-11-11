import {createHash,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {addonOrigin,parseAddonVideo,trustedSubtitleUrl,type AddonVideo} from '../cinema-addon';
import {parseSubtitles} from '../cinema-companion';
import {current,getData,putData} from './cinema-companion';
import {loadStremio} from './stremio-store';
import {hasOfficialSubtitleAddon} from './stremio-cloud';
import {readBoundedText} from './read-bounded-text';
export type AddonConfig={token:string;origin:string;expiresAt:number;source:'opensubtitles-v3'};
type RelayTrack={id:string;lang:string;url:string;label:string};
export type AddonRequest={id:string;sessionId:string|null;deviceFingerprint:string|null;requestedAt:number;video:AddonVideo;tracks:RelayTrack[];providerStatus:'ready'|'unavailable'};
export type AddonReceipt={id:string;sessionId:string|null;deviceFingerprint:string|null;requestedAt:number;loadedAt:number;positionMs:number|null;video:AddonVideo;trackId:string;lang:string;name:string;hash:string;cueCount:number;status:'loaded-unverified'};
const TTL=30*86400000;
const digest=(s:string)=>createHash('sha256').update(s).digest('hex');
export function addonBase(owner:string,c:AddonConfig){return `${c.origin}/api/cinema/addon/${owner}/${c.token}`;}
export async function createAddon(owner:string,origin:string){
 const safeOrigin=addonOrigin(origin);
 if(!safeOrigin.startsWith('https://'))throw Error('addon-https-required');
 const session=await loadStremio(owner);if(!session)throw Error('stremio-not-connected');
 if(!await hasOfficialSubtitleAddon(session))throw Error('subtitle-provider-not-installed');
 const config:AddonConfig={token:randomBytes(32).toString('base64url'),origin:safeOrigin,expiresAt:Date.now()+TTL,source:'opensubtitles-v3'};
 await putData(owner,'addon',config,TTL);return config;
}
export async function authorizeAddon(owner:string,token:string){
 if(!/^[a-f0-9-]{36}$/i.test(owner)||!/^[-_a-zA-Z0-9]{43}$/.test(token))return null;
 const c=await getData<AddonConfig>(owner,'addon');
 if(!c||c.expiresAt<=Date.now()||!timingSafeEqual(Buffer.from(digest(c.token),'hex'),Buffer.from(digest(token),'hex')))return null;
 return c;
}
export async function revokeAddon(owner:string){await putData(owner,'addon',null,1);}
export async function addonStatus(owner:string,requestOrigin?:string){
 const [c,s,pending,receipt]=await Promise.all([getData<AddonConfig>(owner,'addon'),current(owner),getData<AddonRequest>(owner,'addon-pending'),getData<AddonReceipt>(owner,'addon-loaded')]);
 const belongs=(v:{sessionId:string|null;deviceFingerprint:string|null}|null)=>!!v&&s.live&&v.sessionId===s.playback?.sessionId&&v.deviceFingerprint===s.playback?.streamFingerprint;
 let installReady=false;try{installReady=addonOrigin(c?.origin??process.env.CINEMA_ADDON_ORIGIN??requestOrigin??'').startsWith('https://');}catch{}
 return {installReady,manifestUrl:c&&c.expiresAt>Date.now()?`${addonBase(owner,c)}/manifest.json`:null,expiresAt:c?.expiresAt??null,
  request:pending?{id:pending.id,video:pending.video,requestedAt:pending.requestedAt,trackCount:pending.tracks.length,providerStatus:pending.providerStatus,deviceMatched:belongs(pending)}:null,
  receipt:receipt&&(belongs(receipt)||receipt.id===pending?.id)?receipt:null};
}
export async function relaySubtitles(owner:string,c:AddonConfig,parts:string[]){
 const video=parseAddonVideo(parts);if(!video)throw Error('invalid-addon-request');
 // Stremio requests captions before its first playback heartbeat. Serving
 // captions must never depend on the asynchronous projector telemetry.
 const s=await current(owner);
 const observedSession=s.live?s.playback?.sessionId??null:null;
 const observedFingerprint=s.live?s.playback?.streamFingerprint??null:null;
 const previous=await getData<AddonRequest>(owner,'addon-pending');
 if(previous?.providerStatus==='ready'&&previous.sessionId===observedSession&&previous.deviceFingerprint===observedFingerprint&&Date.now()-previous.requestedAt<60000&&JSON.stringify(previous.video)===JSON.stringify(video))return {subtitles:previous.tracks.map(t=>({id:`shoppinglist-${previous.id}-${t.id}`,lang:t.lang,url:`${addonBase(owner,c)}/track/${previous.id}/${t.id}.srt`})),cacheMaxAge:0};
 // Only the already-installed official provider, never a caller-supplied URL.
 const extra=new URLSearchParams();if(video.videoHash)extra.set('videoHash',video.videoHash);if(video.videoSize)extra.set('videoSize',String(video.videoSize));if(video.filename)extra.set('filename',video.filename);
 const path=`/subtitles/${video.type}/${encodeURIComponent(video.videoId)}${extra.size?'/'+extra.toString():''}.json`;
 let j;
 try{const r=await fetch('https://opensubtitles-v3.strem.io'+path,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error();j=JSON.parse(await readBoundedText(r.body,500000));}
 catch{await putData(owner,'addon-pending',{id:randomUUID(),sessionId:observedSession,deviceFingerprint:observedFingerprint,requestedAt:Date.now(),video,tracks:[],providerStatus:'unavailable'},15*60000);throw Error('subtitle-provider-unavailable');}
 const tracks:RelayTrack[]=Array.isArray(j?.subtitles)?j.subtitles.slice(0,150).flatMap((v:Record<string,unknown>)=>{
  const url=trustedSubtitleUrl(v.url);if(!url||typeof v.id!=='string'||v.id.length>200||typeof v.lang!=='string'||!/^[a-z]{2,3}$/.test(v.lang))return [];
  return [{id:digest(v.id+':'+url).slice(0,32),lang:v.lang,url,label:typeof v.subtitleFileName==='string'?v.subtitleFileName.slice(0,180):`OpenSubtitles · ${v.lang}`}];
 }):[];
 const latest=await current(owner);
 const stable=latest.live&&observedSession!==null&&latest.playback?.sessionId===observedSession&&latest.playback?.streamFingerprint===observedFingerprint;
 const pending:AddonRequest={id:randomUUID(),sessionId:stable?observedSession:null,deviceFingerprint:stable?observedFingerprint:null,requestedAt:Date.now(),video,tracks,providerStatus:'ready'};
 await putData(owner,`addon-request:${pending.id}`,pending,15*60000);await putData(owner,'addon-pending',pending,15*60000);
 // This only lists choices. No validation, chat context or selected-track claim is created.
 return {subtitles:tracks.map(t=>({id:`shoppinglist-${pending.id}-${t.id}`,lang:t.lang,url:`${addonBase(owner,c)}/track/${pending.id}/${t.id}.srt`})),cacheMaxAge:0};
}
export async function relayTrack(owner:string,requestId:string,trackId:string){
 if(!/^[a-f0-9-]{36}$/i.test(requestId)||!/^([a-f0-9]{32})\.srt$/.test(trackId))throw Error('invalid-addon-request');
 const request=await getData<AddonRequest>(owner,`addon-request:${requestId}`),s=await current(owner);
 if(!request)throw Error('scene-changed');
 const track=request.tracks.find(t=>t.id===trackId.slice(0,-4)),url=trustedSubtitleUrl(track?.url);if(!track||!url)throw Error('invalid-addon-request');
 const fileKey=`addon-file:${requestId}:${track.id}`;
 const cached=await getData<{text:string}>(owner,fileKey);
 let text=cached?.text;
 if(!text){const r=await fetch(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(12000)});if(!r.ok)throw Error('subtitle-provider-unavailable');text=await readBoundedText(r.body,1000000);}
 const cues=parseSubtitles(text);
 const latest=await current(owner);
 const stable=!!s.live&&!!latest.live&&!!s.playback&&latest.playback?.sessionId===s.playback.sessionId&&latest.playback?.streamFingerprint===s.playback.streamFingerprint&&(!request.sessionId||request.sessionId===latest.playback?.sessionId)&&(!request.deviceFingerprint||request.deviceFingerprint===latest.playback?.streamFingerprint);
 const receipt:AddonReceipt={id:request.id,sessionId:stable?latest.playback!.sessionId:null,deviceFingerprint:stable?latest.playback!.streamFingerprint:null,requestedAt:request.requestedAt,loadedAt:Date.now(),positionMs:stable?latest.playback!.positionMs:null,video:request.video,trackId:track.id,lang:track.lang,name:track.label,hash:digest(text),cueCount:cues.length,status:'loaded-unverified'};
 // A server-observed fetch is stronger evidence than a catalogue lookup, but still
 // does not prove that the XGIMI rendered it. Keep it private and explicitly unverified.
 const candidate={sessionId:receipt.sessionId,fingerprint:receipt.deviceFingerprint,hash:receipt.hash,name:track.label,cues,confirmed:false};
 await putData(owner,`addon-candidate:${receipt.id}`,candidate,4*3600000);
 if(!cached)await putData(owner,fileKey,{text},15*60000);
 await putData(owner,'addon-loaded',receipt,4*3600000);
 return text;
}
