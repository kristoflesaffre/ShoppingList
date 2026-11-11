/* X-Ray · wie is er in beeld: cast op de X-Ray-pagina, «Nu in beeld» (gratis, automatisch) + «Wie is er in deze scène?»
   (Gemini, op vraag), «Alle acteurs» en de acteurpagina · 11 nov. Echte TMDB-beelden in window.XC_IMG / XC_DATA. */
(() => {
  const world = document.getElementById("world");
  const I = window.XC_IMG;
  const D = window.XC_DATA;
  const cast = D.cast;
  const A = D.actor;

  const ICON = {
    back: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg>`,
    chev: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>`,
    spark: `<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5c.5 3.9 2.6 6 6.5 6.5-3.9.5-6 2.6-6.5 6.5-.5-3.9-2.6-6-6.5-6.5 3.9-.5 6-2.6 6.5-6.5zM19 14.5c.25 1.9 1.1 2.75 3 3-1.9.25-2.75 1.1-3 3-.25-1.9-1.1-2.75-3-3 1.9-.25 2.75-1.1 3-3z"/></svg>`,
    check: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>`,
    eye: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`,
    pause: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>`,
    info: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.1"/></svg>`,
  };

  const inScene = [cast[0], cast[1]]; // Lamb & River: wat de gratis herkenning in het beeld vond
  const ep = `${D.episode.series} · S${D.episode.s} · Aflevering ${D.episode.e}`;
  const avatar = (c, size, extra = "") => `<span class="xc-av ${extra}" style="width:${size}px;height:${size}px"><img src="${I[c.img]}" alt=""></span>`;
  const person = (c, opts = {}) => `<div class="xc-person ${opts.cls || ""}">
      <div class="xc-pwrap">${avatar(c, opts.size || 64, opts.live ? "live" : "")}${opts.live ? `<i class="xc-livedot"></i>` : ""}</div>
      <b>${c.name}</b><span>${c.character}</span></div>`;
  const allPill = (n, light) => `<span class="xc-all ${light ? "lt" : ""}">Alle ${n} ${ICON.chev}</span>`;
  const premiumBtn = (big) => `<span class="xc-prem ${big ? "big" : ""}">${ICON.spark}Wie is er in deze scène?</span>`;
  const sceneHead = (sub) => `<div class="xc-shd"><div><h4>Nu in beeld</h4><p>${sub}</p></div><span class="xc-free">Gratis · automatisch</span></div>`;

  /* ---------- Tablet: X-Ray-dashboard met de nieuwe panelen ---------- */
  const titlePanel = `<div class="xc-glass xc-title">
      <span class="xc-eyebrow">${ep}</span>
      <h3>${D.episode.title}</h3>
      <div class="xc-prog"><i style="width:47%"></i></div>
      <div class="xc-time"><span>21:14</span><span>-24:31</span></div>
      <div class="xc-ctrl"><span class="xc-play">${ICON.pause}</span><span class="xc-chip">↺ 1 min</span><span class="xc-chip">2</span><span class="xc-chip">5</span></div>
    </div>`;
  const castPanel = `<div class="xc-glass xc-castp">
      <div class="xc-shd"><div><h4>Cast</h4><p>Hoofdrollen van deze aflevering</p></div>${allPill(D.castTotal)}</div>
      <div class="xc-row">${cast.slice(0, 6).map((c) => person(c, { size: 62, live: inScene.includes(c) })).join("")}</div>
    </div>`;
  const sceneRow = `<div class="xc-glass xc-scene">
      ${sceneHead("Herkend op het beeld van 12 s geleden")}
      <div class="xc-row">${inScene.map((c) => person(c, { size: 78, live: true, cls: "big" })).join("")}</div>
      <div class="xc-foot"><span class="xc-hint">${ICON.info}Klopt het niet of mist er iemand?</span>${premiumBtn()}</div>
    </div>`;
  const frameTags = `<div class="xc-glass xc-scene b">
      ${sceneHead("Beeld van 12 s geleden, gezichten herkend")}
      <div class="xc-frame"><img src="${I.frame}" alt="">
        <span class="xc-tag" style="left:27%;top:58%">${avatar(cast[0], 26)}<b>Jackson Lamb</b><em>Gary Oldman</em></span>
        <span class="xc-tag" style="left:67%;top:42%">${avatar(cast[1], 26)}<b>River Cartwright</b><em>Jack Lowden</em></span>
        <i class="xc-face" style="left:21%;top:28%;width:12%;height:30%"></i>
        <i class="xc-face" style="left:61%;top:10%;width:12%;height:32%"></i>
      </div>
      <div class="xc-foot"><span class="xc-hint">${ICON.info}Tik op een naam voor meer</span>${premiumBtn()}</div>
    </div>`;
  const tablet = (scene) => `<div class="xc-tab"><img class="xc-cover" src="${I.backdrop}" alt=""><div class="xc-shade"></div>
      <div class="xc-tabtop"><span class="xc-back">${ICON.back}Terug</span></div>
      <div class="xc-tabgrid"><div class="xc-col">${titlePanel}${scene}</div><div class="xc-col">${castPanel}
        <div class="xc-glass xc-ask"><div class="xc-shd"><div><h4>Snelle vragen</h4><p>Bestaand X-Ray-paneel (ongewijzigd)</p></div></div><div class="xc-qs"><span>Net gebeurd</span><span>Deze aflevering</span><span>Dit seizoen</span><span>Vorige afleveringen</span></div></div>
      </div></div></div>`;

  /* ---------- Toestanden van «Nu in beeld» ---------- */
  const stateCard = (key, title, why, body) => `<div class="xc-state"><div class="xc-sthd"><span class="xc-k">${key}</span><div><h5>${title}</h5><p>${why}</p></div></div><div class="xc-glass xc-stbody">${body}</div></div>`;
  const states = [
    stateCard("1", "Gevonden (gratis)", "Elke 15–20 s een screenshot van de projector; het model op de iPad vergelijkt de gezichten met de cast van deze aflevering. Enkel wie zeker herkend is.",
      `${sceneHead("Herkend op het beeld van 12 s geleden")}<div class="xc-row">${inScene.map((c) => person(c, { size: 64, live: true })).join("")}</div>`),
    stateCard("2", "Niet zeker", "Donker beeld, iemand van opzij of niemand in beeld: geen gok tonen. De Gemini-knop wordt de hoofdactie.",
      `${sceneHead("Niemand met zekerheid herkend")}<div class="xc-empty"><img src="${I.frameDark}" alt=""><p>Het beeld is te donker of niemand kijkt in de camera.</p></div><div class="xc-foot end">${premiumBtn(true)}</div>`),
    stateCard("3", "Gemini bezig", "Na een tik: het huidige beeld + castlijst naar Gemini. ± 1,5 s, shimmer in de vorm van het resultaat.",
      `<div class="xc-shd"><div><h4>Wie is er in deze scène?</h4><p>Gemini bekijkt het beeld…</p></div><span class="xc-gem">${ICON.spark}Gemini</span></div><div class="xc-row">${[0, 1, 2].map(() => `<div class="xc-person"><span class="xc-sh" style="width:64px;height:64px;border-radius:50%"></span><span class="xc-sh" style="width:86px;height:12px;margin-top:10px"></span><span class="xc-sh" style="width:64px;height:10px;margin-top:6px"></span></div>`).join("")}</div>`),
    stateCard("4", "Resultaat van Gemini", "Met waar ze staan in het beeld. Label «Gemini» zodat je weet dat het niet de gratis herkenning was; ± € 0,0005 per keer.",
      `<div class="xc-shd"><div><h4>In deze scène</h4><p>Volgens Gemini · zonet</p></div><span class="xc-gem">${ICON.spark}Gemini</span></div><div class="xc-row">${[[cast[0], "links"], [cast[1], "rechts"], [cast[12], "achtergrond"]].map(([c, w]) => `<div class="xc-person">${avatar(c, 64)}<b>${c.name}</b><span>${c.character}</span><em class="xc-where">${w}</em></div>`).join("")}</div>`),
    stateCard("5", "Niet beschikbaar", "Geen screenshot (projector-ADB weg, of een app die het beeld afschermt): de rij verdwijnt niet maar legt uit en houdt de Gemini-knop.",
      `${sceneHead("Herkennen staat stil")}<div class="xc-off">${ICON.info}<p>Geen beeld van de projector. De cast hieronder klopt wel; vraag Gemini wie er nu in beeld is.</p></div><div class="xc-foot end">${premiumBtn()}</div>`),
  ].join("");

  /* ---------- Gsm: X-Ray «Nu kijken» ---------- */
  const phone = `<div class="xc-phone">
      <div class="xc-pcov"><img src="${I.backdrop}" alt=""><span class="xc-back sm">${ICON.back}Terug</span></div>
      <div class="xc-pbody">
        <span class="xc-eyebrow">${ep}</span><h3 class="sm">${D.episode.title}</h3>
        <div class="xc-prog"><i style="width:47%"></i></div>
        <div class="xc-pcard">${sceneHead("12 s geleden")}<div class="xc-row">${inScene.map((c) => person(c, { size: 60, live: true })).join("")}</div>${premiumBtn(false)}</div>
        <div class="xc-pcard"><div class="xc-shd"><div><h4>Cast</h4></div>${allPill(D.castTotal)}</div><div class="xc-row scroll">${cast.slice(0, 6).map((c) => person(c, { size: 56, live: inScene.includes(c) })).join("")}</div></div>
        <div class="xc-pcard"><div class="xc-shd"><div><h4>Snelle vragen</h4></div></div><div class="xc-qs"><span>Net gebeurd</span><span>Deze aflevering</span></div></div>
      </div></div>`;

  /* ---------- Alle acteurs ---------- */
  const tile = (c, live) => `<div class="xc-tile">${avatar(c, 92, live ? "live" : "")}${live ? `<span class="xc-badge">${ICON.eye}In beeld</span>` : ""}<b>${c.name}</b><span>${c.character}</span></div>`;
  const allDesk = `<div class="xc-page">
      <div class="xc-pghd"><span class="xc-rbtn">${ICON.back}</span><div><span class="xc-eyebrow">${ep}</span><h3>Alle acteurs <em>${D.castTotal}</em></h3></div><span class="xc-flt"><i class="on">Alles</i><i>Hoofdrollen</i><i>Gastrollen</i></span></div>
      <h6>Nu in beeld</h6><div class="xc-grid">${inScene.map((c) => tile(c, true)).join("")}</div>
      <h6>Hoofdrollen</h6><div class="xc-grid">${cast.filter((c) => c.main && !inScene.includes(c)).map((c) => tile(c)).join("")}</div>
      <h6>In deze aflevering</h6><div class="xc-grid">${cast.filter((c) => !c.main).slice(0, 12).map((c) => tile(c)).join("")}</div>
    </div>`;
  const allPhone = `<div class="xc-phone">
      <div class="xc-phd"><span class="xc-rbtn sm">${ICON.back}</span><b>Alle acteurs</b><span></span></div>
      <div class="xc-pbody" style="padding-top:8px">
        <span class="xc-flt"><i class="on">Alles</i><i>Hoofdrollen</i><i>Gastrollen</i></span>
        <h6>Nu in beeld</h6>${inScene.map((c) => `<div class="xc-li">${avatar(c, 52, "live")}<div><b>${c.name}</b><span>${c.character}</span></div><span class="xc-badge in">${ICON.eye}In beeld</span>${ICON.chev}</div>`).join("")}
        <h6>Hoofdrollen</h6>${cast.filter((c) => c.main && !inScene.includes(c)).concat(cast.slice(3, 6)).map((c) => `<div class="xc-li">${avatar(c, 52)}<div><b>${c.name}</b><span>${c.character}</span></div>${ICON.chev}</div>`).join("")}
      </div></div>`;

  /* ---------- Acteurpagina ---------- */
  const age = new Date(2026, 10, 11).getFullYear() - Number(A.birthday.slice(0, 4));
  const poster = (c, seen) => `<div class="xc-post"><div class="xc-pimg"><img src="${I["m" + c.id]}" alt="">${seen ? `<i class="xc-seen">${ICON.check}</i>` : ""}<span class="xc-type">${c.type === "tv" ? "SERIE" : "FILM"}</span></div><b>${c.title}</b><span>${c.character} · ${c.year}</span></div>`;
  const watchedIds = new Set(A.watched.map((c) => c.id));
  const known = A.knownFor.filter((c) => !watchedIds.has(c.id)).slice(0, 6);
  const actorDesk = `<div class="xc-page actor">
      <div class="xc-ahero"><img class="xc-abg" src="${I.actor}" alt=""><div class="xc-afade"></div>
        <span class="xc-rbtn glass">${ICON.back}</span>
        <div class="xc-aphoto"><img src="${I.actor}" alt=""></div>
        <div class="xc-ainfo"><span class="xc-eyebrow">Speelt Jackson Lamb in Slow Horses</span><h2>${A.name}</h2>
          <div class="xc-facts"><span>${age} jaar</span><span>Londen, Engeland</span><span>${A.total} films en series</span></div>
          <p>Sir Gary Oldman (21 maart 1958) is een Engelse acteur en filmmaker, bekend om zijn verdwijningen in zijn rollen — van Sid Vicious tot Winston Churchill, waarvoor hij een Oscar won.</p>
          <span class="xc-more">Meer lezen</span></div></div>
      <div class="xc-sec"><div class="xc-sechd"><h4>Gezien door jou <em>${A.watched.length}</em></h4><p>Staat in je app op gezien of je kijkt het nu</p></div><div class="xc-posts">${A.watched.map((c) => poster(c, true)).join("")}</div></div>
      <div class="xc-sec"><div class="xc-sechd"><h4>Bekend van</h4><p>Zijn bekendste werk · één per filmreeks</p>${allPill(A.total, true)}</div><div class="xc-posts">${known.map((c) => poster(c, false)).join("")}</div></div>
    </div>`;
  const actorPhone = `<div class="xc-phone">
      <div class="xc-pahero"><img src="${I.actor}" alt=""><div class="xc-afade m"></div><span class="xc-rbtn glass sm" style="position:absolute;left:14px;top:14px">${ICON.back}</span>
        <div class="xc-pai"><span class="xc-eyebrow">Jackson Lamb · Slow Horses</span><h3 class="sm">${A.name}</h3><div class="xc-facts sm"><span>${age} jaar</span><span>Londen</span></div></div></div>
      <div class="xc-pbody">
        <p class="xc-bio">Engelse acteur en filmmaker, bekend om zijn verdwijningen in zijn rollen — van Sid Vicious tot Winston Churchill. <b>Meer</b></p>
        <div class="xc-sechd"><h4>Gezien door jou <em>${A.watched.length}</em></h4></div><div class="xc-posts scroll">${A.watched.map((c) => poster(c, true)).join("")}</div>
        <div class="xc-sechd"><h4>Bekend van</h4>${allPill(A.total, true)}</div><div class="xc-posts scroll">${known.map((c) => poster(c, false)).join("")}</div>
      </div></div>`;

  const css = `<style>
  .xc-wrap{display:flex;flex-direction:column;gap:64px;margin-top:28px}
  .xc-opt{display:flex;flex-direction:column;gap:18px}
  .xc-stage{display:flex;gap:44px;align-items:flex-start;flex-wrap:wrap}
  .xc-cap{margin:0 0 10px;font-size:13px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--text-secondary)}
  .xc-tab,.xc-phone,.xc-page{position:relative;overflow:hidden;color:#fff;font-family:inherit;background:#0b0c10;box-shadow:0 40px 80px -40px rgba(16,17,48,.7)}
  .xc-tab{width:1180px;height:820px;border-radius:28px}
  .xc-cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .xc-shade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(11,12,16,.55),rgba(11,12,16,.25) 60%,rgba(11,12,16,.55)),linear-gradient(180deg,rgba(11,12,16,.1),rgba(11,12,16,.5))}
  .xc-tabtop{position:relative;z-index:2;padding:22px 24px 0}
  .xc-back{display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 16px 0 12px;border-radius:999px;background:rgba(18,19,24,.55);backdrop-filter:blur(18px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.16);font-size:14px;font-weight:700}
  .xc-back.sm{position:absolute;left:14px;top:14px;height:32px;font-size:13px}
  .xc-tabgrid{position:relative;z-index:2;display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px 24px 24px}
  .xc-col{display:flex;flex-direction:column;gap:16px}
  .xc-glass{border-radius:24px;padding:18px 20px;background:rgba(18,19,24,.76);backdrop-filter:blur(22px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}
  .xc-eyebrow{display:block;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#f3a5c0}
  .xc-title h3,.xc-phone h3{margin:6px 0 12px;font-size:34px;letter-spacing:-.02em;font-weight:800}
  h3.sm{font-size:26px;margin:4px 0 10px}
  .xc-prog{height:5px;border-radius:9px;background:rgba(255,255,255,.18);overflow:hidden} .xc-prog i{display:block;height:100%;background:#e50914;border-radius:9px}
  .xc-time{display:flex;justify-content:space-between;margin-top:6px;font-size:12px;font-weight:700;color:rgba(255,255,255,.6)}
  .xc-ctrl{display:flex;align-items:center;gap:8px;margin-top:14px}
  .xc-play{width:52px;height:52px;border-radius:50%;background:#fff;color:#111;display:grid;place-items:center}
  .xc-chip{height:34px;padding:0 13px;border-radius:999px;background:rgba(255,255,255,.12);display:inline-flex;align-items:center;font-size:13px;font-weight:700}
  .xc-shd{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:14px}
  .xc-shd h4,.xc-sechd h4{margin:0;font-size:17px;font-weight:800;letter-spacing:-.01em}
  .xc-shd p{margin:3px 0 0;font-size:12.5px;color:rgba(255,255,255,.6);font-weight:600}
  .xc-free{flex:none;height:24px;padding:0 10px;border-radius:999px;background:rgba(118,214,170,.16);color:#8fe3bd;font-size:11.5px;font-weight:800;display:inline-flex;align-items:center}
  .xc-gem{flex:none;height:26px;padding:0 11px;border-radius:999px;background:rgba(169,173,244,.2);color:#c9cbff;font-size:12px;font-weight:800;display:inline-flex;align-items:center;gap:5px}
  .xc-row{display:flex;gap:14px}
  .xc-row.scroll{overflow:hidden}
  .xc-person{display:flex;flex-direction:column;align-items:center;width:92px;text-align:center}
  .xc-person.big{width:120px}
  .xc-person b{margin-top:8px;font-size:13px;line-height:16px;font-weight:800}
  .xc-person span{font-size:12px;line-height:15px;color:rgba(255,255,255,.62);font-weight:600}
  .xc-pwrap{position:relative}
  .xc-av{display:block;border-radius:50%;overflow:hidden;flex:none;background:#2a2c33}
  .xc-av img{width:100%;height:100%;object-fit:cover;display:block}
  .xc-av.live{box-shadow:0 0 0 3px #0b0c10,0 0 0 5px #8fe3bd}
  .xc-livedot{position:absolute;right:2px;bottom:2px;width:13px;height:13px;border-radius:50%;background:#8fe3bd;box-shadow:0 0 0 3px #15161b}
  .xc-all{flex:none;height:30px;padding:0 8px 0 13px;border-radius:999px;background:rgba(255,255,255,.12);display:inline-flex;align-items:center;gap:2px;font-size:13px;font-weight:800;color:#fff}
  .xc-all.lt{margin-left:auto}
  .xc-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.1)}
  .xc-foot.end{justify-content:flex-end}
  .xc-hint{display:inline-flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;color:rgba(255,255,255,.62)}
  .xc-prem{display:inline-flex;align-items:center;gap:7px;height:36px;padding:0 15px;border-radius:999px;background:rgba(169,173,244,.2);color:#e3e4ff;font-size:13.5px;font-weight:800;box-shadow:inset 0 0 0 1px rgba(169,173,244,.35);white-space:nowrap}
  .xc-prem.big{height:42px;padding:0 18px;background:#5b5ff0;color:#fff;box-shadow:none;font-size:14.5px}
  .xc-phone .xc-prem{margin-top:14px;width:100%;justify-content:center;box-sizing:border-box}
  .xc-frame{position:relative;border-radius:16px;overflow:hidden;aspect-ratio:16/9}
  .xc-frame img{width:100%;height:100%;object-fit:cover;display:block}
  .xc-face{position:absolute;border-radius:12px;box-shadow:inset 0 0 0 2px rgba(143,227,189,.85)}
  .xc-tag{position:absolute;transform:translateX(-50%);display:flex;align-items:center;gap:7px;padding:4px 11px 4px 4px;border-radius:999px;background:rgba(11,12,16,.78);backdrop-filter:blur(10px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18);white-space:nowrap}
  .xc-tag b{font-size:12.5px;font-weight:800} .xc-tag em{font-style:normal;font-size:11.5px;color:rgba(255,255,255,.6);font-weight:600}
  .xc-qs{display:flex;flex-wrap:wrap;gap:8px} .xc-qs span{height:34px;padding:0 13px;border-radius:999px;background:rgba(255,255,255,.1);display:inline-flex;align-items:center;font-size:13px;font-weight:700}
  .xc-states{display:grid;grid-template-columns:repeat(5,1fr);gap:20px}
  .xc-state{display:flex;flex-direction:column;gap:12px}
  .xc-sthd{display:flex;gap:10px;min-height:118px}
  .xc-k{flex:none;width:30px;height:30px;border-radius:10px;background:var(--action-primary);color:#fff;font-weight:800;display:grid;place-items:center}
  .xc-sthd h5{margin:2px 0 4px;font-size:16px} .xc-sthd p{margin:0;font-size:13px;line-height:1.45;color:var(--text-secondary)}
  .xc-stbody{background:#15161b;min-height:250px;color:#fff;box-sizing:border-box}
  .xc-stbody .xc-row{gap:8px} .xc-stbody .xc-person{width:96px}
  .xc-empty{display:flex;gap:12px;align-items:center} .xc-empty img{width:110px;height:62px;object-fit:cover;border-radius:10px;opacity:.75} .xc-empty p{margin:0;font-size:12.5px;line-height:1.45;color:rgba(255,255,255,.7)}
  .xc-off{display:flex;gap:9px;align-items:flex-start;color:rgba(255,255,255,.72)} .xc-off p{margin:0;font-size:12.5px;line-height:1.45}
  .xc-where{font-style:normal;margin-top:5px;font-size:11px;font-weight:800;color:#c9cbff;text-transform:uppercase;letter-spacing:.06em}
  .xc-sh{display:block;border-radius:8px;background:linear-gradient(90deg,rgba(255,255,255,.08) 25%,rgba(255,255,255,.18) 50%,rgba(255,255,255,.08) 75%);background-size:200% 100%}
  .xc-phone{width:390px;border-radius:40px;padding-bottom:22px}
  .xc-pcov{position:relative;aspect-ratio:16/9} .xc-pcov img{width:100%;height:100%;object-fit:cover;display:block}
  .xc-pbody{padding:16px 16px 0;display:flex;flex-direction:column}
  .xc-pcard{margin-top:14px;padding:16px;border-radius:22px;background:#17181d;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)}
  .xc-pcard .xc-person{width:84px}
  .xc-page{width:1180px;border-radius:28px;padding:28px 32px 36px;box-sizing:border-box;background:#0b0c10}
  .xc-pghd{display:flex;align-items:center;gap:16px;margin-bottom:10px}
  .xc-pghd h3{margin:4px 0 0;font-size:34px;font-weight:800;letter-spacing:-.02em} .xc-pghd h3 em,.xc-sechd h4 em{font-style:normal;margin-left:8px;font-size:15px;padding:3px 10px;border-radius:999px;background:rgba(255,255,255,.12);vertical-align:middle;font-weight:800}
  .xc-rbtn{flex:none;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.12);display:grid;place-items:center;color:#fff}
  .xc-rbtn.sm{width:32px;height:32px} .xc-rbtn.glass{background:rgba(18,19,24,.5);backdrop-filter:blur(14px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.16)}
  .xc-flt{margin-left:auto;display:flex;gap:8px} .xc-flt i{font-style:normal;height:30px;padding:0 13px;border-radius:999px;background:rgba(255,255,255,.1);display:inline-flex;align-items:center;font-size:13px;font-weight:700} .xc-flt i.on{background:#5b5ff0}
  .xc-phone .xc-flt{margin:0 0 4px}
  .xc-page h6,.xc-phone h6{margin:26px 0 14px;font-size:12px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.55)}
  .xc-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:22px 16px}
  .xc-tile{position:relative;display:flex;flex-direction:column;align-items:center;text-align:center;padding:16px 8px;border-radius:20px;background:rgba(255,255,255,.05)}
  .xc-tile b{margin-top:10px;font-size:14px;font-weight:800} .xc-tile span{font-size:12.5px;color:rgba(255,255,255,.6);font-weight:600}
  .xc-badge{position:absolute;top:10px;right:10px;display:inline-flex;align-items:center;gap:4px;height:22px;padding:0 8px;border-radius:999px;background:rgba(118,214,170,.18);color:#8fe3bd;font-size:11px;font-weight:800}
  .xc-badge.in{position:static;margin-left:auto}
  .xc-phd{display:flex;align-items:center;justify-content:space-between;padding:52px 16px 6px} .xc-phd b{font-size:17px}
  .xc-li{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.07);color:rgba(255,255,255,.5)}
  .xc-li div{display:flex;flex-direction:column;color:#fff} .xc-li div b{font-size:15px} .xc-li div span{font-size:13px;color:rgba(255,255,255,.6);font-weight:600}
  .xc-li > svg{margin-left:auto} .xc-li .xc-badge.in + svg{margin-left:6px}
  .xc-page.actor{padding:0 0 36px}
  .xc-ahero{position:relative;height:430px;overflow:hidden}
  .xc-abg{position:absolute;inset:-60px;width:calc(100% + 120px);height:calc(100% + 120px);object-fit:cover;filter:blur(40px) saturate(1.2) brightness(.55)}
  .xc-afade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,12,16,0) 40%,#0b0c10)}
  .xc-afade.m{background:linear-gradient(180deg,rgba(11,12,16,0) 45%,#0b0c10 98%)}
  .xc-ahero .xc-rbtn{position:absolute;left:32px;top:28px}
  .xc-aphoto{position:absolute;left:32px;bottom:34px;width:220px;height:300px;border-radius:24px;overflow:hidden;box-shadow:0 30px 60px -20px rgba(0,0,0,.8)} .xc-aphoto img{width:100%;height:100%;object-fit:cover}
  .xc-ainfo{position:absolute;left:286px;right:40px;bottom:38px}
  .xc-ainfo h2{margin:6px 0 10px;font-size:52px;letter-spacing:-.03em;font-weight:800}
  .xc-ainfo p{margin:14px 0 6px;max-width:640px;font-size:15px;line-height:1.55;color:rgba(255,255,255,.8)}
  .xc-more{font-size:14px;font-weight:800;color:#c9cbff}
  .xc-facts{display:flex;gap:8px;flex-wrap:wrap} .xc-facts span{height:30px;padding:0 12px;border-radius:999px;background:rgba(255,255,255,.12);backdrop-filter:blur(10px);display:inline-flex;align-items:center;font-size:13px;font-weight:700}
  .xc-facts.sm span{height:26px;font-size:12px}
  .xc-sec{padding:0 32px;margin-top:30px}
  .xc-sechd{display:flex;align-items:baseline;gap:12px;margin:22px 0 14px} .xc-sechd p{margin:0;font-size:13px;color:rgba(255,255,255,.55);font-weight:600}
  .xc-sec .xc-sechd{margin-top:0}
  .xc-posts{display:grid;grid-template-columns:repeat(6,1fr);gap:16px} .xc-posts.scroll{display:flex;gap:12px;overflow:hidden}
  .xc-posts.scroll .xc-post{width:118px;flex:none}
  .xc-post b{display:block;margin-top:8px;font-size:13.5px;font-weight:800;line-height:17px} .xc-post span{font-size:12px;color:rgba(255,255,255,.58);font-weight:600}
  .xc-pimg{position:relative;aspect-ratio:2/3;border-radius:14px;overflow:hidden;background:#1d1f25} .xc-pimg img{width:100%;height:100%;object-fit:cover;display:block}
  .xc-seen{position:absolute;right:8px;top:8px;width:24px;height:24px;border-radius:50%;background:#5b5ff0;color:#fff;display:grid;place-items:center;box-shadow:0 0 0 2px rgba(11,12,16,.5)}
  .xc-type{position:absolute;left:8px;top:8px;height:20px;padding:0 7px;border-radius:6px;background:rgba(11,12,16,.7);font-size:10px;font-weight:800;letter-spacing:.06em;display:inline-flex;align-items:center}
  .xc-pahero{position:relative;height:420px} .xc-pahero > img{width:100%;height:100%;object-fit:cover;object-position:50% 20%;display:block}
  .xc-pai{position:absolute;left:16px;right:16px;bottom:10px}
  .xc-bio{margin:4px 0 0;font-size:14px;line-height:1.5;color:rgba(255,255,255,.78)} .xc-bio b{color:#c9cbff}
  .xc-flow{display:flex;align-items:center;gap:14px;flex-wrap:wrap;font-size:14px;font-weight:700;color:var(--text-secondary)}
  .xc-flow span{padding:8px 14px;border-radius:999px;background:#fff;box-shadow:inset 0 0 0 1px #e1e3ea;color:var(--text-primary)}
  .xc-flow span.p{background:#edeefe;color:var(--action-primary);box-shadow:none}
  </style>`;

  const opt = (key, name, why, body) => `<div class="xc-opt"><div class="ag-opthd"><span class="ag-key">${key}</span><div><h3>${name}</h3><p>${why}</p></div></div>${body}</div>`;
  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = "left:0;top:0;width:2440px";
  b.innerHTML = `${css}<header class="bhd"><span class="bnum">XC</span><div><h2>X-Ray · wie is er in beeld <span class="tag">voorstel · 11 nov</span></h2><p>Zoals X-Ray bij Prime: wie er nu in beeld is, met foto, en doortikken naar de acteur. Gratis en automatisch: elke 15–20 s een screenshot van de projector (Home Assistant, ADB), een klein gezichtsmodel op de iPad vergelijkt de gezichten met de cast van deze aflevering (getest: juist op TMDB-stills en op een echt projectorbeeld). Toont enkel wie zeker herkend is. Op vraag: «Wie is er in deze scène?» stuurt het beeld + de castlijst naar Gemini (± € 0,0005 per keer). Cast, «Alle acteurs» en de acteurpagina komen gratis van TMDB; op de acteurpagina eerst wat je zelf al zag.</p><p class="uses">Bouwt op: XrayTablet / XrayPhone (glazen panelen, --cinema-screen), CastRound tone="cinema", OverviewPill («Alle n»), FilterChip, PosterTile, Shimmer, SubpageHeader, setForcedDark · nieuw: SceneFaces, SceneFrameTags, AskGeminiScene, ActorPage</p></div></header>
    <div class="xc-wrap">
      ${opt("A", "Tablet · «Nu in beeld» als gezichtenrij", "Nieuw paneel onder de titel: wie er nu in beeld is, groot en met een groen ringetje. Rechts het nieuwe Cast-paneel (hoofdrollen + «Alle 29»); wie in beeld is, krijgt daar ook het ringetje. De Gemini-knop staat zacht onderaan: niet nodig zolang de gratis herkenning het weet.", `<div class="xc-stage"><div><p class="xc-cap">Tablet · liggend</p>${tablet(sceneRow)}</div></div>`)}
      ${opt("B", "Tablet · «Nu in beeld» als beeld met labels", "Zelfde plek, maar het herkende beeld zelf met naamlabels op de gezichten, zoals Prime bij pauze. Duidelijker wie wie is, maar het beeld is tot 20 s oud en dubbelt wat al op het scherm staat.", `<div class="xc-stage"><div><p class="xc-cap">Tablet · liggend</p>${tablet(frameTags)}</div></div>`)}
      ${opt("St", "Toestanden van «Nu in beeld»", "Gratis waar het kan, Gemini enkel als jij erom vraagt. Nooit een gok tonen: liever «niet zeker» en de knop.", `<div class="xc-states">${states}</div>`)}
      ${opt("G", "Gsm · Nu kijken", "Zelfde blokken onder elkaar onder de cover: «Nu in beeld» met de Gemini-knop over de volle breedte, dan de cast als veegrij met «Alle 29».", `<div class="xc-stage"><div><p class="xc-cap">Gsm</p>${phone}</div></div>`)}
      ${opt("AA", "Alle acteurs", "Via «Alle 29»: eerst wie nu in beeld is, dan de hoofdrollen, dan wie in deze aflevering meespeelt. Filter Alles · Hoofdrollen · Gastrollen. Tik = acteurpagina.", `<div class="xc-stage"><div><p class="xc-cap">Tablet</p>${allDesk}</div><div><p class="xc-cap">Gsm</p>${allPhone}</div></div>`)}
      ${opt("AP", "Acteurpagina", `Foto, rol in wat je nu kijkt, leeftijd en geboorteplaats, korte bio. Eerst «Gezien door jou» (blauw vinkje: op gezien in de app of je kijkt het nu), dan «Bekend van» (meeste stemmen op TMDB, één titel per filmreeks, geen gastrollen in een serie) met «Alle ${A.total}». Tik op een poster = de bestaande detailpagina.`, `<div class="xc-stage"><div><p class="xc-cap">Tablet</p>${actorDesk}</div><div><p class="xc-cap">Gsm</p>${actorPhone}</div></div>`)}
      ${opt("→", "Flow", "", `<div class="xc-flow"><span>X-Ray</span>→<span class="p">Nu in beeld · gratis, elke 15–20 s</span>→<span>tik op een gezicht</span>→<span>Acteurpagina</span>→<span>tik op een titel</span>→<span>Film- of seriedetail</span></div><div class="xc-flow" style="margin-top:12px"><span>Niet zeker / klopt niet</span>→<span class="p">Wie is er in deze scène? · Gemini</span>→<span>resultaat met plaats in beeld</span></div>`)}
    </div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const topY = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${topY - 240 - b.offsetHeight}px`;
})();
