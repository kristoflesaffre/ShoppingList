import { NextRequest,NextResponse } from 'next/server';
import { isThawRoundAuthorized } from '@/lib/server/todoist-thaw-round';
import { getInstantAdminDb } from '@/lib/server/instant-admin';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:NextRequest){
 const reply=(value:unknown,status=200)=>NextResponse.json(value,{status,headers:{'Cache-Control':'no-store'}});
 if(!isThawRoundAuthorized(request.headers.get('authorization'),process.env.CRON_SECRET))return reply({error:'unauthorized'},401);
 const db=getInstantAdminDb();if(!db)return reply({error:'not-configured'},503);
 try{let removed=0;for(let batch=0;batch<10;batch++){
  const data=await db.query({cinemaCompanionData:{$:{where:{expiresAt:{$lt:Date.now()}},limit:100}}});
  if(!data.cinemaCompanionData.length)break;
  await db.transact(data.cinemaCompanionData.map(r=>db.tx.cinemaCompanionData[r.id].delete()));removed+=data.cinemaCompanionData.length;
 }return reply({removed});}catch{return reply({error:'cleanup-unavailable'},503);}
}
