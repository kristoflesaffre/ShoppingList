/** Explicit real-session calibration. Never use cloud progress or a requested deep-link as evidence. */
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import nextEnv from '@next/env';
import { init } from '@instantdb/admin';
nextEnv.loadEnvConfig(process.cwd(),true,{info(){},error(){}});
const args=Object.fromEntries(process.argv.slice(2).map(a=>{const [k,...v]=a.replace(/^--/,'').split('=');return[k,v.join('=')];}));
if(!args.fixture||!args.imdb||!args.session||!args['screen-position-ms']||args['confirmed-stream']!=='yes')throw Error('Provide --fixture=path --imdb=tt... --session=id --screen-position-ms=N --confirmed-stream=yes after inspecting the actual Stremio screen.');
const samples=JSON.parse(await fs.readFile(args.fixture,'utf8'));
if(!Array.isArray(samples)||samples.length<3)throw Error('At least 3 real-session telemetry samples are required');
const p=samples.at(-1),screenPosition=Number(args['screen-position-ms']);
if(p.streamEvidence!==true||p.sessionId!==args.session||p.imdbId!==args.imdb||!/^tt\d{5,12}$/.test(args.imdb)||!Number.isFinite(screenPosition)||Math.abs(p.positionMs-screenPosition)>2000||Date.now()-p.observedAt>10000||p.observedAt>Date.now()+2000||p.uncertaintyMs>2000)throw Error('Position/identity is not validated by this sample');
if(samples.some((s,i)=>s.sessionId!==p.sessionId||s.streamFingerprint!==p.streamFingerprint||(i&&s.sequence<=samples[i-1].sequence)))throw Error('Samples do not belong to one ordered stream');
const bridge=JSON.parse(await fs.readFile('.cache/projector-relay/bridge.json','utf8'));const db=init({appId:'c63df57f-510a-46bc-8687-912d030c9359',adminToken:process.env.INSTANT_APP_ADMIN_TOKEN});
const key=`${bridge.ownerId}:validation`,h=crypto.createHash('sha256').update(key).digest('hex'),id=`${h.slice(0,8)}-${h.slice(8,12)}-4${h.slice(13,16)}-a${h.slice(17,20)}-${h.slice(20,32)}`;
const expiresAt=Date.now()+Math.min(4*3600000,p.durationMs-p.positionMs+600000);
await db.transact(db.tx.cinemaCompanionData[id].update({ownerId:bridge.ownerId,key,payload:{sessionId:p.sessionId,fingerprint:p.streamFingerprint,expiresAt,evidenceHash:crypto.createHash('sha256').update(JSON.stringify(samples)).digest('hex')},expiresAt}));
console.log('This exact stream/session is calibrated. A stream change or expiration invalidates this calibration. No device commands sent.');
