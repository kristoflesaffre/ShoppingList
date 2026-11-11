"use client";
import * as React from "react";
import Link from "next/link";
import { db } from "@/lib/db";
import { useGoogleAuthToken } from "@/lib/google-client";
import { Button } from "@/components/ui/button";
import { PageBackButton } from "@/components/ui/page_back_button";
import { clockTime, displayPosition, freshPlayback, parsePlayback, type Cue, type Playback, type SpoilerMode } from "@/lib/cinema-companion";
import type { Answer, Settings } from "@/lib/server/cinema-companion";
import styles from "./xray.module.css";
import { AddonSetup } from "./addon-setup";

type Snapshot={playback:Playback|null;bridgeId:string|null;live:boolean;verified:boolean;contextEndMs:number|null;settings:Settings;track:{name:string;matched:boolean;cueCount:number}|null;dialogue:Cue[];history:Answer[];aiConfigured:boolean};
const actions=[['scene','Leg scène uit'],['who','Wie is dit?'],['missed','Wat miste ik?'],['recap','Tot nu toe'],['dialogue','Leg dialoog uit'],['relationships','Relaties']] as const;
const errors:Record<string,string>={"context-not-verified":"De projectorpositie en stream zijn nog niet gevalideerd. Scèneanalyse blijft uit.","companion-unavailable":"De companion is nog niet bereikbaar. Controleer of de bridge en opslag zijn ingericht.","analysis-busy":"Deze scène wordt al geanalyseerd. Probeer zo opnieuw.","scene-changed":"De kijkpositie of ondertiteltrack is veranderd. Stel de vraag opnieuw.","ai-not-configured":"De Gemini-tekstassistent is nog niet geconfigureerd.","no-dialogue":"Er is nog geen volledige dialoogregel binnen deze kijkpositie.","hourly-limit":"De limiet van 30 analyses per uur is bereikt.","no-active-session":"Er is geen actieve Stremio-sessie.","confirm-track-match":"Bevestig dat deze ondertitel bij de huidige stream hoort.","ai-unavailable":"Gemini is tijdelijk niet bereikbaar.","no-subtitles":"Dit bestand bevat geen leesbare SRT- of VTT-ondertitels."};
export default function NowWatching(){
 const token=useGoogleAuthToken(),{user}=db.useAuth();
 const [demo,setDemo]=React.useState(false);
 React.useEffect(()=>{setDemo(process.env.NODE_ENV==="development"&&new URLSearchParams(location.search).get("demo")==="1");},[]);
 // Only the compact playback projection uses client subscriptions. No future subtitles/chat in Instant's browser cache.
 const realtime=db.useQuery(user?{cinemaPlayback:{$:{where:{ownerId:user.id}}}}:null);
 const [snapshot,setData]=React.useState<Snapshot|null>(null),[dataToken,setDataToken]=React.useState<string|null>(null),[error,setError]=React.useState(''),[busy,setBusy]=React.useState(false),[loading,setLoading]=React.useState(true);
 const [question,setQuestion]=React.useState(''),[tab,setTab]=React.useState('scene'),[now,setNow]=React.useState(Date.now());
 const [file,setFile]=React.useState<File|null>(null),[confirmed,setConfirmed]=React.useState(false),[offset,setOffset]=React.useState(0);
 const [cast,setCast]=React.useState<{name:string;character:string;photo:string|null}[]|null>(null);
 const epoch=React.useRef(0),queryGeneration=React.useRef(0);
 const headers=React.useMemo(()=>({authorization:`Bearer ${token}`,"content-type":"application/json"}),[token]);
 const refresh=React.useCallback(async()=>{
  if(!token){setLoading(false);return;}
  const generation=++queryGeneration.current;
  try{const r=await fetch('/api/cinema/companion',{headers:{authorization:`Bearer ${token}`},cache:'no-store'});const value=await r.json();if(!r.ok)throw Error(value.error);if(generation!==queryGeneration.current)return;setData(value);setDataToken(token);setOffset(value.settings.offsetMs/1000);setError('');}
  catch(e){if(generation===queryGeneration.current)setError(errors[e instanceof Error?e.message:'']??'De companion kon niet worden geladen.');}
  finally{if(generation===queryGeneration.current)setLoading(false);}
 },[token]);
 const demonstration:Snapshot={playback:{sessionId:"design-example",sequence:1,mediaKey:"example",streamFingerprint:"0".repeat(64),imdbId:null,mediaType:"series",season:2,episode:4,title:"De laatste trein",positionMs:1425000,durationMs:2520000,speed:0,state:"paused",observedAt:Date.now(),uncertaintyMs:1500,deviceUpdateElapsedMs:null},bridgeId:null,live:false,verified:false,contextEndMs:null,settings:{mode:"strict",offsetMs:0,vision:false},track:null,dialogue:[],history:[],aiConfigured:false};
 const data=demo?demonstration:dataToken===token?snapshot:null;
 const liveRow=realtime.data?.cinemaPlayback?.find(row=>row.bridgeId===data?.bridgeId);
 const revision=JSON.stringify(liveRow?.payload??null);
 React.useEffect(()=>{epoch.current++;setData(null);setCast(null);setConfirmed(false);setLoading(!!token);void refresh();const timer=setInterval(()=>{if(!document.hidden)void refresh();},10000);const show=()=>{if(!document.hidden)void refresh();};document.addEventListener('visibilitychange',show);return()=>{queryGeneration.current++;clearInterval(timer);document.removeEventListener('visibilitychange',show);};},[token,refresh]);
 React.useEffect(()=>{void refresh();},[revision,refresh]);
 React.useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),500);return()=>clearInterval(timer);},[]);
 const realtimePlayback=liveRow?parsePlayback(liveRow.payload):null;
 const p=realtimePlayback??data?.playback??null,live=!!p&&freshPlayback(p,now),position=p?displayPosition(p,now):0;
 const sameSnapshot=!!p&&p.sessionId===data?.playback?.sessionId&&p.sequence===data?.playback?.sequence&&p.streamFingerprint===data?.playback?.streamFingerprint;
 const previous=React.useRef<{session:string;position:number}|null>(null);
 React.useEffect(()=>{if(!p)return;const old=previous.current;if(old&&(old.session!==p.sessionId||p.positionMs+1500<old.position)){epoch.current++;setCast(null);setConfirmed(false);}previous.current={session:p.sessionId,position:p.positionMs};},[p]);
 const allowed=live&&sameSnapshot&&data?.verified&&data.track?.matched&&data.aiConfigured;
 async function post(body:unknown){const r=await fetch('/api/cinema/companion',{method:'POST',headers,body:JSON.stringify(body),cache:'no-store'});const result=await r.json();if(!r.ok)throw Error(result.error);return result;}
 async function perform(body:unknown){if(busy||demo)return;setBusy(true);setError('');try{await post(body);await refresh();}catch(e){setError(errors[e instanceof Error?e.message:'']??'Dit lukte niet. Controleer het bestand of probeer opnieuw.');}finally{setBusy(false);}}
 async function ask(action:string){if(!allowed||busy)return;const q=question;await perform({action,...(action==='question'?{question:q}:{})});if(action==='question')setQuestion('');setTab('chat');}
 const answers=(data?.history??[]).filter(a=>p&&a.sessionId===p.sessionId&&a.contextEndMs<=Math.max(0,p.positionMs-p.uncertaintyMs)&&live);
 const latest=answers.at(-1);
 return <main className={styles.page}>
  <div className={styles.heading}><PageBackButton href="/films-series"/><div><Link href="/films-series" className={styles.back}>Films en series</Link><h1>Nu kijken</h1></div><span className={styles.spoiler}>Spoilers begrensd</span></div>
  {!user&&!demo?<section className={styles.empty}><h2>Meld je aan om mee te kijken</h2><p>Deze companion gebruikt alleen jouw projector en kijkcontext.</p><Link href="/">Naar aanmelden</Link></section>:<>
  {demo&&<p className={styles.note}>Ontwerpvoorbeeld met verzonnen gegevens. Geen verbinding met de projector.</p>}
  <section className={styles.now} aria-label="Huidige playback"><div className={styles.status}><span className={live?styles.dot:styles.offDot}/>{demo?'Ontwerpvoorbeeld':loading?'Verbinding controleren…':!p?'Wachten op Stremio':!live?'Verbinding verouderd':p.state==='paused'?'Gepauzeerd':p.state==='buffering'?'Bufferen':'Projector verbonden'}</div><h2>{p?.title??'Klaar voor je volgende film'}</h2>{p?.mediaType==='series'&&<p>Seizoen {p.season??'—'} · Aflevering {p.episode??'—'}</p>}<progress max={p?.durationMs||1} value={p?.durationMs?position:undefined} aria-label="Afspeelvoortgang"/><div className={styles.times}><span>{clockTime(position)}</span><span>{p?.durationMs?`Nog ${clockTime(p.durationMs-position)}`:'Totale speelduur onbekend'}</span></div><p className={styles.note}>{sameSnapshot&&data?.verified?'Projectortijd gevalideerd voor deze sessie.':'De tijdcode en stream zijn nog niet in een echte sessie gevalideerd. Verhaalantwoorden blijven uit.'}</p></section>
  <nav className={styles.tabs} aria-label="Companionweergave">{[['scene','Scène'],['chat','Vragen'],['history','Geschiedenis']].map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}>{label}</button>)}</nav>
  {error&&<p role="alert" className={styles.error}>{error}</p>}
  <div className={styles.columns}>
   <section className={`${styles.scene} ${tab==='scene'?styles.mobileActive:''}`}>
    <h2>In deze scène</h2><p className={styles.muted}>Dialoog geeft aanwijzingen over wie spreekt of genoemd wordt. Het bewijst niet wie in beeld is.</p>
    {latest?.characters.length?<div className={styles.people}>{latest.characters.map(c=><div key={c.name}><strong>{c.name}</strong><span>{c.status}</span></div>)}</div>:<p className={styles.placeholder}>Nog geen onderbouwde personage-informatie.</p>}
    <h2>Wat er gebeurt</h2><p className={styles.summary}>{latest?.answer??'Koppel eerst de huidige ondertiteltrack en valideer de projectorpositie. Daarna kun je deze scène laten uitleggen.'}</p>
    {!!latest?.evidence.length&&<div className={styles.evidence}>{latest.evidence.map((e,i)=><blockquote key={i}><time>{clockTime(e.timeMs)}</time> {e.quote}</blockquote>)}</div>}
    <details className={styles.details}><summary>Recente dialoog</summary>{sameSnapshot&&data?.dialogue.length?data.dialogue.map(c=><p key={c.id}><time>{clockTime(c.startMs+(data.settings.offsetMs??0))}</time> {c.text}</p>):<p>Er zijn geen geverifieerde ondertitelregels beschikbaar.</p>}</details>
    <details className={styles.details}><summary>Afleveringscast bekijken</summary><p>Deze lijst kan personages onthullen. Ze bevestigt geen aanwezigheid in de huidige scène.</p><Button size="sm" variant="secondary" disabled={!data?.verified||!sameSnapshot||!live||busy} onClick={async()=>{const requestEpoch=epoch.current;setBusy(true);try{const result=await post({action:'cast'});if(epoch.current===requestEpoch)setCast(result.cast);}catch{setError('De afleveringscast kon niet worden geladen.');}finally{setBusy(false);}}}>Toon cast</Button><div className={styles.cast}>{sameSnapshot&&cast?.map(c=><div key={c.name}>{c.photo&&<img src={c.photo} alt="" width={52} height={68}/>}<span><strong>{c.character}</strong><small>{c.name} · afleveringscast</small></span></div>)}</div></details>
   </section>
   <section className={`${styles.chat} ${tab==='chat'||tab==='history'?styles.mobileActive:''}`}>
    <h2>{tab==='history'?'Eerdere vragen':'Vraag over deze scène'}</h2><div className={styles.actions}>{actions.map(([id,label])=><Button key={id} variant="secondary" size="sm" disabled={!allowed||busy} onClick={()=>void ask(id)}>{label}</Button>)}</div>
    <div className={styles.messages} aria-live="polite">{!answers.length&&<p className={styles.placeholder}>Je vragen blijven gekoppeld aan de tijd waarop je ze stelt. Bij terugspoelen verdwijnen antwoorden die verder kijken.</p>}{answers.map(a=><article key={a.id}><div className={styles.messageMeta}>Vraag op {clockTime(a.positionMs)}</div><h3>{a.question}</h3><p>{a.answer}</p><div className={styles.citations}>{a.evidence.map(e=><span key={e.cueId}>{clockTime(e.timeMs)}</span>)}</div></article>)}{busy&&<p role="status">Even verwerken…</p>}</div>
    <form className={styles.composer} onSubmit={e=>{e.preventDefault();void ask('question');}}><label className="sr-only" htmlFor="scene-question">Vraag over de scène</label><textarea id="scene-question" maxLength={1500} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Wat bedoelt hij met die uitspraak?" rows={2} disabled={!allowed||busy}/><Button type="submit" size="sm" disabled={!allowed||busy||!question.trim()}>Verstuur</Button></form><p className={styles.note}>AI kan zich vergissen, ook met een contextgrens. De dialoogverwijzingen helpen je het antwoord controleren.</p>
   </section>
  </div>
  <section className={styles.setup}><h2>Bronnen en voorkeuren</h2><AddonSetup token={token}/><div className={styles.setupGrid}><div><h3>Ondertitels</h3><p>{data?.track?`${data.track.name} · ${data.track.cueCount} regels`:'Er is nog geen ondertiteltrack gekoppeld.'}</p><label>Upload de gebruikte SRT- of VTT-track<input type="file" accept=".srt,.vtt" onChange={e=>{setFile(e.target.files?.[0]??null);setConfirmed(false);}}/></label><label className={styles.check}><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Dit is de track en montage die nu in Stremio speelt.</label><Button size="sm" disabled={!file||!confirmed||busy||!live} onClick={()=>{if(file&&file.size<=1000000)void file.text().then(text=>perform({action:'subtitle',name:file.name,text,confirmed:true}));else setError('Kies een ondertitelbestand van maximaal 1 MB.');}}>Koppel ondertitels</Button></div><div><h3>Synchronisatie en spoilers</h3><label>Ondertitels later in de video (seconden)<input type="number" min={-120} max={120} step={0.1} value={offset} onChange={e=>setOffset(Number(e.target.value))}/></label><Button size="sm" variant="secondary" disabled={busy||!Number.isFinite(offset)} onClick={()=>void perform({action:'settings',mode:data?.settings.mode??'strict',offsetMs:Math.round(offset*1000)})}>Bewaar timing</Button><label>Spoilermodus<select value={data?.settings.mode??'strict'} onChange={e=>{const mode=e.target.value as SpoilerMode;if(mode==='unrestricted'&&!window.confirm('Je staat spoilers toe. In deze versie blijft de assistent alsnog beperkt tot de geverifieerde context. Doorgaan?'))return;void perform({action:'settings',mode,offsetMs:Math.round(offset*1000)});}}><option value="strict">Strict — tot de kijkpositie</option><option value="previously-watched">Previously Watched</option><option value="unrestricted">Unrestricted — expliciet toestaan</option></select></label><p className={styles.note}>Eerder bekeken afleveringen zijn nog niet bevestigd en worden daarom niet toegevoegd. Er worden geen screenshots verstuurd.</p></div></div><details className={styles.details}><summary>Privacy en bewaren</summary><p>Ondertitels en gesprekken worden privé op de server opgeslagen, maximaal 30 dagen beschikbaar. Gemini ontvangt alleen begrensde dialoog en relevante eerdere fragmenten wanneer je analyse aanvraagt. Geen gezichtsherkenning. Maximaal 30 analyses per uur.</p><Button variant="tertiary" tertiaryTone="danger" size="sm" onClick={async()=>{if(!window.confirm('Alle companion-ondertitels, validaties en gesprekken wissen?'))return;setBusy(true);try{const r=await fetch('/api/cinema/companion',{method:'DELETE',headers});if(!r.ok)throw Error();await refresh();setCast(null);}catch{setError('Wissen is niet gelukt. Probeer opnieuw.');}finally{setBusy(false);}}}>Wis mijn companiongegevens</Button></details></section>
  </>}
 </main>;
}
