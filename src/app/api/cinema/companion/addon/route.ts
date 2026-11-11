import {NextRequest,NextResponse} from 'next/server';
import {verifiedUserId} from '@/lib/server/google-connection-store';
import {googleRequestOrigin} from '@/lib/google-dashboard-auth';
import {addonStatus,createAddon,revokeAddon,addonBase} from '@/lib/server/cinema-addon';
export const runtime='nodejs';export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'no-store, private','Referrer-Policy':'no-referrer'}});
export async function GET(r:NextRequest){const owner=await verifiedUserId(r);if(!owner)return reply({error:'not-signed-in'},401);try{return reply(await addonStatus(owner,r.nextUrl.origin));}catch{return reply({error:'addon-unavailable'},503);}}
export async function POST(r:NextRequest){
 if(r.headers.get('origin')!==googleRequestOrigin(r))return reply({error:'invalid-origin'},403);
 const owner=await verifiedUserId(r);if(!owner)return reply({error:'not-signed-in'},401);
 try{const config=await createAddon(owner,process.env.CINEMA_ADDON_ORIGIN??r.nextUrl.origin);return reply({manifestUrl:`${addonBase(owner,config)}/manifest.json`,expiresAt:config.expiresAt});}
 catch(e){const m=e instanceof Error?e.message:'';return reply({error:['stremio-not-connected','subtitle-provider-not-installed','invalid-addon-origin','addon-https-required'].includes(m)?m:'addon-unavailable'},400);}
}
export async function DELETE(r:NextRequest){
 if(r.headers.get('origin')!==googleRequestOrigin(r))return reply({error:'invalid-origin'},403);
 const owner=await verifiedUserId(r);if(!owner)return reply({error:'not-signed-in'},401);
 try{await revokeAddon(owner);return reply({ok:true});}catch{return reply({error:'addon-unavailable'},503);}
}
