import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { verifiedUserId } from "@/lib/server/google-connection-store";
import { googleRequestOrigin } from "@/lib/google-dashboard-auth";
import { analyse, current, episodeCast, getData, putData, readMessages, visibleAnswers, type Answer, type Settings } from "@/lib/server/cinema-companion";
import { allowedCues, parseSubtitles } from "@/lib/cinema-companion";
import { readBoundedText } from "@/lib/server/read-bounded-text";
import { getInstantAdminDb } from "@/lib/server/instant-admin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{"Cache-Control":"no-store, private"}});
const questions:Record<string,string>={scene:"Leg uit wat er in deze scène gebeurt.",missed:"Wat heb ik de laatste vijf minuten gemist?",recap:"Vat de beschikbare gebeurtenissen tot nu toe samen.",dialogue:"Leg de recente dialoog uit.",relationships:"Welke relaties blijken uit deze dialoog?",who:"Welke personen worden in deze dialoog gehoord of genoemd?"};
export async function GET(request:NextRequest) {
 const owner=await verifiedUserId(request);if(!owner)return reply({error:"not-signed-in"},401);
 try {
  const s=await current(owner);
  const history=s.playback?visibleAnswers(await readMessages(owner,s.playback.sessionId),s.playback,s.end,s.track,s.settings):[];
  const cues=s.end!==null&&s.matched&&s.track?allowedCues(s.track.cues,s.end,s.settings.offsetMs,120000):[];
  return reply({playback:s.playback,bridgeId:s.bridge?.id??null,live:s.live,verified:s.end!==null,contextEndMs:s.end,settings:s.settings,track:s.track?{name:s.track.name,matched:s.matched,cueCount:s.track.cues.length}:null,dialogue:cues.slice(-8),history,aiConfigured:!!process.env.GEMINI_API_KEY,limitations:["Scène-aanwezigheid kan niet worden afgeleid uit de afleveringscast.","Eerdere afleveringen zijn nog niet gevalideerd.","Vision staat uit; er worden geen screenshots verstuurd."]});
 }catch{return reply({error:"companion-unavailable"},503);}
}
export async function POST(request:NextRequest) {
 if(request.headers.get("origin")!==googleRequestOrigin(request))return reply({error:"invalid-origin"},403);
 const owner=await verifiedUserId(request);if(!owner)return reply({error:"not-signed-in"},401);
 try {
  const body=JSON.parse(await readBoundedText(request.body,1_100_000));
  if(!body||typeof body!=="object"||Array.isArray(body))return reply({error:"invalid-request"},400);
  if(body.action==="settings"){
   if(!["strict","previously-watched","unrestricted"].includes(body.mode)||!Number.isInteger(body.offsetMs)||Math.abs(body.offsetMs)>120000)return reply({error:"invalid-settings"},400);
   const settings:Settings={mode:body.mode,offsetMs:body.offsetMs,vision:false};await putData(owner,"settings",settings);return reply({ok:true});
  }
  const s=await current(owner);
  if(body.action==="subtitle"){
   if(!s.playback||!s.live)return reply({error:"no-active-session"},409);
   if(typeof body.text!=="string"||typeof body.name!=="string"||body.name.length>180||body.confirmed!==true)return reply({error:"confirm-track-match"},400);
   const cues=parseSubtitles(body.text);
   await putData(owner,`track:${s.playback.sessionId}`,{sessionId:s.playback.sessionId,fingerprint:s.playback.streamFingerprint,hash:createHash("sha256").update(body.text).digest("hex"),name:body.name,cues,confirmed:true});return reply({ok:true,cues:cues.length});
  }
  if(body.action==="cast"){
   if(!s.playback||s.end===null)return reply({error:"context-not-verified"},409);
   // Explicit reveal, labelled episode cast, not current-scene visibility.
   return reply(await episodeCast(s.playback));
  }
  const question=body.action==="question"?body.question:questions[body.action];
  if(typeof question!=="string"||!question.trim()||question.length>1500)return reply({error:"invalid-question"},400);
  return reply(await analyse(owner,question.trim(),String(body.action)));
 }catch(e){const error=e instanceof Error?e.message:"companion-unavailable";const safe=["context-not-verified","ai-not-configured","no-dialogue","analysis-busy","hourly-limit","ai-unavailable","invalid-ai-output","scene-changed","subtitle-too-large","invalid-subtitle-time","no-subtitles","context-limit","too-many-cues","subtitle-line-too-long"].includes(error)?error:"companion-unavailable";return reply({error:safe},safe==="hourly-limit"?429:safe==="analysis-busy"||safe==="scene-changed"||safe==="context-not-verified"?409:400);}
}
export async function DELETE(request:NextRequest){
 if(request.headers.get("origin")!==googleRequestOrigin(request))return reply({error:"invalid-origin"},403);
 const owner=await verifiedUserId(request);if(!owner)return reply({error:"not-signed-in"},401);
 try{const db=getInstantAdminDb();if(!db)throw Error();const data=await db.query({cinemaCompanionData:{$:{where:{ownerId:owner}}}});for(let i=0;i<data.cinemaCompanionData.length;i+=50)await db.transact(data.cinemaCompanionData.slice(i,i+50).map(row=>db.tx.cinemaCompanionData[row.id].delete()));return reply({ok:true});}catch{return reply({error:"companion-unavailable"},503);}
}
