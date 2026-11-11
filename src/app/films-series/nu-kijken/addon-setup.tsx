'use client';
import * as React from 'react';
import {Button} from '@/components/ui/button';
import type {AddonReceipt} from '@/lib/server/cinema-addon';
import styles from './xray.module.css';
type Status={installReady:boolean;manifestUrl:string|null;expiresAt:number|null;request:{video:{videoId:string;videoHash:string|null;filename:string|null};trackCount:number;providerStatus:'ready'|'unavailable'}|null;receipt:AddonReceipt|null};
const labels:Record<string,string>={'stremio-not-connected':'Koppel eerst je Stremio-account via Films en series.','subtitle-provider-not-installed':'De officiële OpenSubtitles v3-add-on is niet gevonden in je gekoppelde Stremio-account. Er wordt geen nieuwe ondertitelbron automatisch toegevoegd.','addon-unavailable':'De ondertitelkoppeling is tijdelijk niet bereikbaar.','invalid-addon-origin':'De projector heeft een bereikbaar HTTPS-adres nodig. De lokale netwerklink is niet geschikt.','addon-https-required':'Publiceer eerst de HTTPS-koppeling voor de projector.'};
export function AddonSetup({token}:{token:string|null}){
 const [stateData,setState]=React.useState<Status|null>(null),[stateToken,setStateToken]=React.useState<string|null>(null),[error,setError]=React.useState(''),[busy,setBusy]=React.useState(false),[copied,setCopied]=React.useState(false),[expanded,setExpanded]=React.useState(false);
 const generation=React.useRef(0),activeToken=React.useRef(token);activeToken.current=token;
 const state=stateToken===token?stateData:null;
 const refresh=React.useCallback(async()=>{if(!token)return;const g=++generation.current;try{const r=await fetch('/api/cinema/companion/addon',{headers:{authorization:`Bearer ${token}`},cache:'no-store'});const j=await r.json();if(!r.ok)throw Error(j.error);if(g===generation.current&&activeToken.current===token){setState(j);setStateToken(token);}}catch(e){if(g===generation.current)setError(labels[e instanceof Error?e.message:'']??'De koppeling kon niet worden geladen.');}},[token]);
 React.useEffect(()=>{setError('');if(!expanded)return;void refresh();const t=setInterval(()=>{if(!document.hidden)void refresh();},10000);return()=>{generation.current++;clearInterval(t);};},[refresh,expanded]);
 async function change(method:'POST'|'DELETE'){
  if(!token)return;const g=++generation.current;setBusy(true);setError('');try{const r=await fetch('/api/cinema/companion/addon',{method,headers:{authorization:`Bearer ${token}`}});const j=await r.json();if(!r.ok)throw Error(j.error);if(g===generation.current){setCopied(false);await refresh();}}catch(e){if(g===generation.current)setError(labels[e instanceof Error?e.message:'']??'De koppeling kon niet worden gewijzigd.');}finally{setBusy(false);}
 }
 return <details className={styles.details} onToggle={e=>setExpanded(e.currentTarget.open)}><summary>Ondertitels rechtstreeks uit Stremio koppelen</summary>
  <p>Deze persoonlijke add-on stuurt film-ID, beschikbare bestandskenmerken en de opgevraagde ondertiteltrack naar je eigen dashboard. Hij gebruikt alleen de officiële OpenSubtitles v3-bron die al in je Stremio-account staat. Je projector blijft de video afspelen.</p>
  <p>De link geeft toegang tot deze ondertitelrelay en is 30 dagen geldig. Deel hem niet. De projector heeft hiervoor een bereikbaar HTTPS-adres nodig; de gewone lokale netwerklink is niet geschikt.</p>
  {error&&<p role="alert">{error}</p>}{state&&!state.installReady&&<p>De code staat klaar. Publiceer eerst de HTTPS-koppeling; daarna kan deze persoonlijke add-on op de projector worden geïnstalleerd.</p>}
  {!state?.manifestUrl?<Button size="sm" disabled={busy||!token||!state?.installReady} onClick={()=>void change('POST')}>{!state?'Koppeling controleren…':'Maak persoonlijke koppeling'}</Button>:<>
   <p>Voeg de persoonlijke manifestlink toe in Stremio via Add-ons. Kies daarna op de projector een ondertitel uit <strong>ShoppingList X-Ray</strong>.</p>
   <Button size="sm" disabled={busy} onClick={()=>{if(state.manifestUrl)void navigator.clipboard.writeText(state.manifestUrl).then(()=>setCopied(true)).catch(()=>setError('Kopiëren is niet gelukt.'));}}>{copied?'Link gekopieerd':'Kopieer persoonlijke manifestlink'}</Button>{' '}
   <Button size="sm" variant="secondary" disabled={busy} onClick={()=>void refresh()}>Controleer ontvangst</Button>{' '}
   <Button size="sm" variant="tertiary" tertiaryTone="danger" disabled={busy} onClick={()=>void change('DELETE')}>Trek koppeling in</Button>
   <p role="status">{state.receipt?`Track opgehaald: ${state.receipt.name} · ${state.receipt.cueCount} regels. Dit bewijst nog niet dat de projector deze track toont; scènesynchronisatie blijft ongevalideerd.`:state.request?.providerStatus==='unavailable'?'De aanvraag uit Stremio is ontvangen, maar de ondertitelbron is tijdelijk niet bereikbaar.':state.request?`Ondertitellijst opgevraagd voor ${state.request.video.videoId}: ${state.request.trackCount} keuzes. Er is nog geen track opgehaald.`:'Wachten op een ondertitelaanvraag uit Stremio.'}</p>
   {(state.receipt?!state.receipt.video.videoHash:state.request&&!state.request.video.videoHash)&&<p>Stremio heeft bij deze trackaanvraag geen bestands-hash meegestuurd. Een exacte bestandsmatch is daarmee nog niet aangetoond.</p>}
  </>}
 </details>;
}
