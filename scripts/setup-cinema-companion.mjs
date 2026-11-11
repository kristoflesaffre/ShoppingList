/** Install scoped companion permissions without changing cinema/device permissions. No device commands. */
import fs from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import nextEnv from '@next/env';
import { init } from '@instantdb/admin';
nextEnv.loadEnvConfig(process.cwd(),true,{info(){},error(){}});
const appId='c63df57f-510a-46bc-8687-912d030c9359',adminToken=process.env.INSTANT_APP_ADMIN_TOKEN;
if(!adminToken)throw Error('Instant admin configuration missing');
const identity=JSON.parse(await fs.readFile('.cache/projector-relay/cinema-direct.json','utf8'));
const bridge=JSON.parse(await fs.readFile('.cache/projector-relay/bridge.json','utf8'));
if(identity.bridgeId!==bridge.bridgeId||!bridge.ownerId)throw Error('Bridge identity mismatch');
const headers={authorization:`Bearer ${adminToken}`,'content-type':'application/json'};
const url=`https://api.instantdb.com/superadmin/apps/${appId}/perms`;
const response=await fetch(url,{headers});const previous=await response.json();
if(!response.ok||!previous.perms)throw Error('Cannot read existing permissions');
const uuid=/^[a-f0-9-]{36}$/i;for(const id of [identity.userId,identity.bridgeId,bridge.ownerId])if(!uuid.test(id))throw Error('Invalid identity');
const worker=`auth.id == '${identity.userId}'`;
const binding=`data.id == '${bridge.bridgeId}' && data.bridgeId == '${bridge.bridgeId}' && data.ownerId == '${bridge.ownerId}'`;
const rules={...previous.perms,
 cinemaPlayback:{allow:{$default:'false',view:`auth.id == data.ownerId && auth.id != '${identity.userId}'`,create:`${worker} && ${binding}`,update:`${worker} && ${binding} && request.modifiedFields.all(field, field in ['payload', 'ownerId', 'bridgeId']) && newData.ownerId == '${bridge.ownerId}' && newData.bridgeId == '${bridge.bridgeId}' && newData.payload.observedAt >= data.payload.observedAt && newData.payload.sequence > data.payload.sequence`,delete:'false'}},
 cinemaCompanionData:{allow:{$default:'false',view:'false',create:'false',update:'false',delete:'false'}}};
if(!process.argv.includes('--apply')){console.log('Dry run: scoped cinemaPlayback and server-only cinemaCompanionData. Existing rules preserved. Run with --apply to install.');process.exit(0);}
await fs.mkdir('.cache/cinema-companion',{recursive:true,mode:0o700});
await fs.writeFile(`.cache/cinema-companion/permissions-before-${Date.now()}.json`,JSON.stringify(previous.perms),{mode:0o600});
const save=await fetch(url,{method:'POST',headers,body:JSON.stringify({code:rules})});if(!save.ok)throw Error('Cannot install companion permissions');
const db=init({appId,adminToken}),guest=init({appId}).asUser({guest:true}),workerDb=init({appId}).asUser({token:identity.token});
const id=randomUUID(),key=`companion-probe:${id}`;
const existingPlayback=(await db.query({cinemaPlayback:{$:{where:{id:bridge.bridgeId}}}})).cinemaPlayback[0];
const initial={sessionId:'provisioned-no-session',sequence:0,mediaKey:'unidentified',streamFingerprint:'0'.repeat(64),imdbId:null,mediaType:'movie',season:null,episode:null,title:'Stremio',positionMs:0,durationMs:0,speed:0,state:'unknown',observedAt:0,uncertaintyMs:60000,deviceUpdateElapsedMs:null};
if(!existingPlayback)await db.transact(db.tx.cinemaPlayback[bridge.bridgeId].create({ownerId:bridge.ownerId,bridgeId:bridge.bridgeId,payload:initial}));
async function denied(fn){try{await fn();}catch{return;}throw Error('Forbidden write succeeded');}
try{
 await db.transact(db.tx.cinemaCompanionData[id].create({ownerId:bridge.ownerId,key,payload:{probe:true},expiresAt:Date.now()+60000}));
 for(const client of [guest,workerDb]){
  if((await client.query({cinemaCompanionData:{}})).cinemaCompanionData.length)throw Error('Private data was readable');
  await denied(()=>client.transact(client.tx.cinemaCompanionData[id].update({payload:{forbidden:true}})));
  await denied(()=>client.transact(client.tx.cinemaPlayback[randomUUID()].create({ownerId:bridge.ownerId,bridgeId:bridge.bridgeId,payload:{}})));
 }
 if(!existingPlayback){
  await workerDb.transact(workerDb.tx.cinemaPlayback[bridge.bridgeId].update({payload:{...initial,sequence:1}}));
  await denied(()=>workerDb.transact(workerDb.tx.cinemaPlayback[bridge.bridgeId].update({payload:initial})));
  await denied(()=>guest.transact(guest.tx.cinemaPlayback[bridge.bridgeId].update({payload:{...initial,sequence:2}})));
  await db.transact(db.tx.cinemaPlayback[bridge.bridgeId].update({payload:initial}));
 }
 const owner=await db.auth.getUser({id:bridge.ownerId});
 if(owner?.email){const ownerDb=db.asUser({email:owner.email});const visible=await ownerDb.query({cinemaPlayback:{$:{where:{id:bridge.bridgeId}}},cinemaCompanionData:{}});if(visible.cinemaPlayback.length!==1||visible.cinemaCompanionData.length)throw Error('Owner projection/private-data check failed');}
 console.log('Companion privacy tests passed. No devices controlled. Enable CINEMA_COMPANION_ENABLED=1 on the app server only after schema and bridge provisioning.');
}finally{await db.transact(db.tx.cinemaCompanionData[id].delete());}
