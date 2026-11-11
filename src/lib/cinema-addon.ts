/** Protocol validation shared by the private relay. Requests are evidence, not playback validation. */
export type AddonVideo = {type:'movie'|'series';videoId:string;imdbId:string;season:number|null;episode:number|null;videoHash:string|null;videoSize:number|null;filename:string|null};
export function parseAddonVideo(parts:string[]):AddonVideo|null {
 if(parts[0]!=='subtitles'||parts.length<3||parts.length>4||!['movie','series'].includes(parts[1]))return null;
 const type=parts[1] as 'movie'|'series';
 const last=parts.at(-1)!;if(!last.endsWith('.json'))return null;
 const videoId=parts.length===3?parts[2].slice(0,-5):parts[2];
 const id=/^(tt\d{5,12})(?::(\d{1,3}):(\d{1,4}))?$/.exec(videoId);
 if(!id||(type==='series')!==!!id[2])return null;
 const extra=parts.length===4?new URLSearchParams(parts[3].slice(0,-5)):new URLSearchParams();
 const hashes=extra.getAll('videoHash'),sizes=extra.getAll('videoSize');
 if(hashes.length>1||sizes.length>1)return null;
 const videoHash=hashes[0]&&/^[a-f0-9]{16}$/i.test(hashes[0])?hashes[0].toLowerCase():null;
 const n=Number(sizes[0]),videoSize=sizes.length&&Number.isSafeInteger(n)&&n>0?n:null;
 const filename=extra.get('filename')?.slice(0,400)??null;
 return {type,videoId,imdbId:id[1],season:id[2]?Number(id[2]):null,episode:id[3]?Number(id[3]):null,videoHash,videoSize,filename};
}
export function trustedSubtitleUrl(value:unknown):string|null {
 if(typeof value!=='string'||value.length>4096)return null;
 try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&/^subs\d*\.strem\.io$/.test(u.hostname)?u.href:null;}catch{return null;}
}
export function addonOrigin(value:string):string {
 const u=new URL(value);if(u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw Error('invalid-addon-origin');
 if(u.protocol!=='https:'&&!(u.protocol==='http:'&&/^(localhost|127\.0\.0\.1)$/.test(u.hostname)))throw Error('invalid-addon-origin');
 return u.origin;
}
