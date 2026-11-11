import {NextRequest,NextResponse} from 'next/server';
import {authorizeAddon,relaySubtitles,relayTrack} from '@/lib/server/cinema-addon';
export const runtime='nodejs';export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store, private','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'};
export async function OPTIONS(){return new NextResponse(null,{status:204,headers});}
export async function HEAD(){return new NextResponse(null,{status:405,headers});}
export async function GET(_r:NextRequest,{params}:{params:{owner:string;token:string;resource:string[]}}){
 try{
  const c=await authorizeAddon(params.owner,params.token);if(!c)return NextResponse.json({error:'not-found'},{status:404,headers});
  const parts=params.resource;
  if(parts.length===1&&parts[0]==='manifest.json')return NextResponse.json({id:'com.shoppinglist.xray',version:'0.1.0',name:'ShoppingList X-Ray',description:'Persoonlijke ondertitelrelay naar je eigen X-Ray-dashboard. Een opgehaalde track is nog geen gevalideerde scènesynchronisatie.',resources:['subtitles'],types:['movie','series'],idPrefixes:['tt'],catalogs:[],behaviorHints:{configurable:false}},{headers});
  if(parts[0]==='subtitles')return NextResponse.json(await relaySubtitles(params.owner,c,parts),{headers});
  if(parts[0]==='track'&&parts.length===3)return new NextResponse(await relayTrack(params.owner,parts[1],parts[2]),{headers:{...headers,'Content-Type':'application/x-subrip; charset=utf-8'}});
  return NextResponse.json({error:'not-found'},{status:404,headers});
 }catch{return NextResponse.json({error:'subtitle-relay-unavailable'},{status:409,headers});}
}
