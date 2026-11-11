/** Export only compact playback samples, never tokens/stream URLs. Run while the Pi telemetry is enabled. */
import fs from 'node:fs/promises';
import nextEnv from '@next/env';
import {init} from '@instantdb/admin';
nextEnv.loadEnvConfig(process.cwd(),true,{info(){},error(){}});
const bridge=JSON.parse(await fs.readFile('.cache/projector-relay/bridge.json','utf8'));
const db=init({appId:'c63df57f-510a-46bc-8687-912d030c9359',adminToken:process.env.INSTANT_APP_ADMIN_TOKEN});
const samples=[];let previous=-1;
for(let i=0;i<8;i++){
 const row=(await db.query({cinemaPlayback:{$:{where:{id:bridge.bridgeId}}}})).cinemaPlayback[0];
 if(row?.payload?.sequence>previous){samples.push(row.payload);previous=row.payload.sequence;}
 if(i<7)await new Promise(r=>setTimeout(r,2000));
}
await fs.mkdir('.cache/cinema-companion',{recursive:true,mode:0o700});
await fs.writeFile('.cache/cinema-companion/playback-samples.json',JSON.stringify(samples,null,2),{mode:0o600});
console.log(`${samples.length} samples saved privately. No screenshots, no device commands. Compare with the real screen before validation.`);
