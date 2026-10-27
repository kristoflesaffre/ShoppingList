/* Dashboard · Ambience op tv: zes plaatsen op het dashboard + het keuzescherm dat volgt (26 okt).
   Vereist window.AMB (echte YouTube-resultaten met miniaturen, ingevoegd door build-canvas). */
(() => {
  const world = document.getElementById("world");
  const A = window.AMB || {};
  const CATS = Object.keys(A);
  const all = (cat, n = 6) => (A[cat] || []).slice(0, n);
  const pick = (cat, i) => (A[cat] || [])[i] || {};
  const FIRE = pick("Haardvuur", 1);
  const W = 1180, H = 760;

  const ic = {
    flame: (s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="currentColor"><path d="M12 2.5c.6 3-1.6 4.6-2.9 6.4C7.9 10.6 7 12.1 7 14.2a5 5 0 0 0 10 0c0-1.7-.7-3-1.5-4.1-.2 1.2-.8 2.2-1.9 2.6.6-3.6-.4-7.6-1.6-10.2z"/></svg>`,
    play: (s = 15) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>`,
    tv: (s = 16) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/></svg>`,
    search: (s = 16) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>`,
    x: (s = 14) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>`,
    bulb: (s = 15) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/></svg>`,
    chev: (s = 14) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>`,
    back: (s = 16) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg>`,
    heart: (s = 14) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="currentColor"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>`,
  };
  const esc = (t = "") => t.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const dur = (v) => v.d ? `<span class="am-dur${v.d === "Live" ? " live" : ""}">${v.d === "Live" ? "● LIVE" : v.d}</span>` : "";
  const thumb = (v, cls = "") => `<div class="am-th ${cls}" style="background-image:url(${v.img || ""})">${dur(v)}</div>`;
  const card = (v, sel = false, cls = "") => `<div class="am-card ${cls}${sel ? " sel" : ""}">${thumb(v)}<div class="am-cb"><b>${esc(v.t)}</b><small>${esc(v.c)}</small></div>${sel ? `<span class="am-play">${ic.tv()} Op tv afspelen</span>` : ""}</div>`;
  const chips = (active, cls = "") => `<div class="am-chips ${cls}">${CATS.map((c) => `<span class="am-chip${c === active ? " on" : ""}">${c}</span>`).join("")}</div>`;
  const searchBar = (q = "ambience") => `<div class="am-search">${ic.search()}<span>${q}</span></div>`;

  /* ---------- Dashboard (avond, donker) als vereenvoudigde achtergrond; het nieuwe element in volle kleur ---------- */
  const posters = (n, hue) => Array.from({ length: n }, (_, i) => `<i class="dm-po" style="background:linear-gradient(160deg,hsl(${hue + i * 38} 45% 42%),hsl(${hue + i * 38 + 20} 50% 22%))"></i>`).join("");
  const lightCols = `<div class="dm-cols">${[60, 100, 0, 30, 0, 15].map((b) => `<i class="dm-col"><i style="height:${b ? Math.max(b, 18) : 0}%"></i></i>`).join("")}</div>`;
  function dash({ top = "", row2 = "", hueExtra = "", agendaCard = "", fab = "", overlay = "", dim = false } = {}) {
    return `<div class="dm">
      <div class="dm-top"><div><p>ZONDAG 26 OKTOBER</p><h3>Goedenavond, Kristof</h3></div><div class="dm-tr">${top}<span class="dm-rem">🎂 Noë over 12 dagen</span><span class="dm-seg"><b>Dashboard</b><span>Overzicht</span></span></div></div>
      <div class="dm-body">
        <div class="dm-left">
          <div class="dm-row"><div class="dm-tile grow"><span class="dm-l">AAN HET KIJKEN</span><div class="dm-pos">${posters(3, 200)}</div></div><div class="dm-tile w"><span class="dm-l">MORGEN</span><b class="dm-big">14°</b><small>Bewolkt</small></div></div>
          <div class="dm-row">${row2 || `<div class="dm-tile grow"><span class="dm-l">OP JE WATCHLIST</span><div class="dm-pos">${posters(3, 20)}</div></div><div class="dm-tile w"><span class="dm-l">ETEN MORGEN</span><b class="dm-mid">Stoofvlees</b></div>`}</div>
          <div class="dm-tile hue"><div class="dm-hh"><span class="dm-l">VERLICHTING</span><span class="dm-seg sm"><b>Licht</b><span>Klimaat</span></span></div>${hueExtra}${lightCols}</div>
        </div>
        <div class="dm-right">
          <div class="dm-tile todo"><span class="dm-l">TAKEN</span><div class="dm-notes"><i>Kado Noë bestellen</i><i>Vuilbakken buiten</i><i>Tandarts bellen</i></div></div>
          <div class="dm-tile agenda"><span class="dm-l">AGENDA VANDAAG</span>
            <div class="dm-ev"><b>19:00</b><span>Training Chloé</span></div><div class="dm-ev"><b>20:30</b><span>Bellen met mama</span></div>
            <div class="dm-ev dim"><b>Morgen</b><span>08:15 · Zwemmen school</span></div>${agendaCard}</div>
        </div>
      </div>${fab}${dim ? '<div class="dm-dim"></div>' : ""}${overlay}</div>`;
  }
  const NEW = (txt = "NIEUW") => `<span class="am-new">${txt}</span>`;

  /* ---------- A1 · Sfeertegel in de avondkolom ---------- */
  const A1d = dash({
    row2: `<div class="dm-tile grow"><span class="dm-l">OP JE WATCHLIST</span><div class="dm-pos">${posters(2, 20)}</div></div>
      <div class="am-tile focus">${NEW()}<div class="am-tile-bg" style="background-image:url(${FIRE.img})"></div><div class="am-tile-in"><span class="am-tl">${ic.flame(13)} SFEER OP TV</span><b>Haardvuur</b><span class="am-tbtn">${ic.play(13)} Opzetten</span></div></div>`,
  });
  const A1p = `<div class="am-modal full">
      <div class="am-mh"><div><p>SFEER OP TV</p><h2>Kies je sfeer</h2></div><span class="am-x">${ic.x()}</span></div>
      <div class="am-bar">${searchBar()}${chips("Haardvuur")}</div>
      <div class="am-grid g4">${all("Haardvuur", 6).concat(all("Winter", 2)).map((v, i) => card(v, i === 1)).join("")}</div>
    </div>`;

  /* ---------- A2 · Knop in de bovenbalk + zijpaneel ---------- */
  const A2d = dash({ top: `<span class="am-topbtn focus">${NEW()}${ic.flame(16)} Sfeer op tv</span>` });
  const A2p = dash({
    dim: true,
    overlay: `<div class="am-drawer">
      <div class="am-mh"><div><p>SFEER OP TV</p><h2>Ambience</h2></div><span class="am-x">${ic.x()}</span></div>
      ${searchBar()}${chips("Regen", "wrap")}
      <div class="am-list">${all("Regen", 5).map((v, i) => `<div class="am-row${i === 0 ? " sel" : ""}">${thumb(v)}<div><b>${esc(v.t)}</b><small>${esc(v.c)}</small>${i === 0 ? `<span class="am-play sm">${ic.tv(14)} Op tv afspelen</span>` : ""}</div></div>`).join("")}</div>
    </div>`,
  });

  /* ---------- A3 · In het bedieningsvenster (Film · Scherm · Projector · Sfeer) ---------- */
  const cmBar = (sfeer) => `<div class="cm-bar"><span class="cm-film">${ic.play()} Film starten</span><div class="cm-g"><span class="cm-gl">SCHERM</span><div class="cm-bs"><i>Omhoog</i><i class="stop">Stop</i><i>Omlaag</i></div></div><div class="cm-g s"><span class="cm-gl">PROJECTOR</span><div class="cm-bs"><i>Aan</i><i>Uit</i></div></div>${sfeer}</div>`;
  const A3d = dash({
    dim: true,
    overlay: `<div class="cm"><div class="am-mh"><div><p>BEDIENING</p><h2>Licht, klimaat &amp; scherm</h2></div><span class="am-x">${ic.x()}</span></div>
      ${cmBar(`<div class="cm-g sfeer focus">${NEW()}<span class="cm-gl">SFEER OP TV</span><div class="cm-sf"><span class="am-mini" style="background-image:url(${FIRE.img})"></span><span class="cm-sfb">${ic.flame(15)} Kies sfeer</span></div></div>`)}
      <div class="cm-lane">${lightCols}${lightCols}</div></div>`,
  });
  const rowOf = (cat, sel = -1) => `<div class="am-shelf"><div class="am-sh"><b>${cat}</b><span>Alles ${ic.chev(12)}</span></div><div class="am-strip">${all(cat, 5).map((v, i) => card(v, i === sel, "sm")).join("")}</div></div>`;
  const A3p = dash({
    dim: true,
    overlay: `<div class="cm"><div class="am-mh"><div class="am-back">${ic.back()}<div><p>BEDIENING · SFEER</p><h2>Sfeer op tv</h2></div></div><div class="am-hr">${searchBar()}<span class="am-x">${ic.x()}</span></div></div>
      <div class="am-shelves">${rowOf("Haardvuur", 0)}${rowOf("Regen")}${rowOf("Café")}</div></div>`,
  });

  /* ---------- A4 · Zwevende sfeerknop + onderblad met grote previews ---------- */
  const A4d = dash({ fab: `<span class="am-fab focus">${NEW()}${ic.flame(26)}<b>Sfeer</b></span>` });
  const big = all("Aquarium", 4);
  const A4p = dash({
    dim: true,
    overlay: `<div class="am-sheet"><i class="am-grab"></i>
      <div class="am-mh"><div><p>SFEER OP TV</p><h2>Wat wil je zien?</h2></div><div class="am-hr">${searchBar()}<span class="am-x">${ic.x()}</span></div></div>
      ${chips("Aquarium")}
      <div class="am-carousel">${big.map((v, i) => `<div class="am-bigc${i === 1 ? " sel" : ""}">${thumb(v, "big")}<b>${esc(v.t)}</b><small>${esc(v.c)} · ${v.d}</small></div>`).join("")}</div>
      <div class="am-sheetbar"><span class="am-sel">${ic.tv()} <b>${esc((big[1] || {}).t || "")}</b></span><span class="am-play lg">${ic.play()} Op tv afspelen</span></div>
    </div>`,
  });

  /* ---------- A5 · Lichtscène «Sfeer» in het lichtpaneel + kies eerst een stemming ---------- */
  const A5d = dash({
    hueExtra: `<div class="am-scenes"><span>Cinema</span><span>Gezellig</span><span>Lezen</span><span class="am-scene focus">${NEW()}${ic.flame(14)} Sfeer · licht 30% + tv</span></div>`,
  });
  const moodCard = (cat, on) => { const v = all(cat, 3); return `<div class="am-mood${on ? " on" : ""}"><div class="am-col3">${v.map((x) => `<i style="background-image:url(${x.img})"></i>`).join("")}</div><b>${cat}</b><small>${(A[cat] || []).length} video’s</small></div>`; };
  const A5p = `<div class="am-modal full split">
      <div class="am-moods"><div class="am-mh"><div><p>SFEER OP TV</p><h2>Kies een stemming</h2></div></div><div class="am-mgrid">${CATS.map((c) => moodCard(c, c === "Café")).join("")}</div></div>
      <div class="am-side"><div class="am-mh"><div><p>CAFÉ</p><h2>${(A["Café"] || []).length} video’s</h2></div><span class="am-x">${ic.x()}</span></div>
        <div class="am-list">${all("Café", 4).map((v, i) => `<div class="am-row${i === 0 ? " sel" : ""}">${thumb(v)}<div><b>${esc(v.t)}</b><small>${esc(v.c)}</small></div></div>`).join("")}</div>
        <div class="am-opt">${ic.bulb()} Licht woonkamer naar 30% <i class="am-sw on"></i></div>
        <span class="am-play lg">${ic.tv()} Op tv afspelen</span></div>
    </div>`;

  /* ---------- A6 · Avondkaart onderaan de agenda + groot voorbeeld met lijst ---------- */
  const favs = [pick("Haardvuur", 0), pick("Regen", 2), pick("Aquarium", 1)];
  const A6d = dash({
    agendaCard: `<div class="am-eve focus">${NEW()}<div class="am-eh"><span>${ic.flame(14)} Rustige avond? Zet sfeer op</span><span class="am-more">Meer ${ic.chev(12)}</span></div><div class="am-favs">${favs.map((v) => `<div class="am-fav">${thumb(v)}<span class="am-fp">${ic.play(12)}</span></div>`).join("")}</div></div>`,
  });
  const hero = pick("Winter", 2);
  const A6p = `<div class="am-modal full hero">
      <div class="am-heroL"><div class="am-mh"><div><p>SFEER OP TV</p><h2>Ambience</h2></div></div>
        <div class="am-th xl" style="background-image:url(${hero.img})">${dur(hero)}</div>
        <b class="am-ht">${esc(hero.t)}</b><small class="am-hc">${esc(hero.c)}</small>
        <div class="am-opt">${ic.bulb()} Licht woonkamer dimmen <i class="am-sw on"></i></div>
        <div class="am-hb"><span class="am-play lg">${ic.tv()} Op tv afspelen</span><span class="am-ghost">${ic.heart()} Favoriet</span></div></div>
      <div class="am-heroR"><div class="am-hr">${searchBar("winter cabin ambience")}<span class="am-x">${ic.x()}</span></div>${chips("Winter")}
        <div class="am-list">${all("Winter", 6).map((v, i) => `<div class="am-row${i === 2 ? " sel" : ""}">${thumb(v)}<div><b>${esc(v.t)}</b><small>${esc(v.c)} · ${v.d}</small></div></div>`).join("")}</div></div>
    </div>`;

  const OPTS = [
    ["A1", "Sfeertegel in de avondkolom", "’s Avonds staat naast de watchlist een tegel met de laatst gekozen sfeer als bewegend beeld. «Opzetten» start die meteen opnieuw; tik op de tegel voor meer.", "Volledig scherm met zoekveld, stemmingen als chips en een raster van 4 kolommen. Tik een video aan: de kaart krijgt een paarse rand en de knop «Op tv afspelen».", A1d, A1p],
    ["A2", "Knop in de bovenbalk", "Een pil «Sfeer op tv» naast de herinneringen, altijd zichtbaar, op elk moment van de dag. Neemt geen tegelruimte in.", "Een paneel schuift van rechts in over het dashboard: zoeken, stemmingen en een lijst met grote miniaturen. Het dashboard blijft zichtbaar erachter.", A2d, A2p],
    ["A3", "Vierde groep in het bedieningsvenster", "In het venster «Licht, klimaat & scherm» komt naast Film, Scherm en Projector een groep «Sfeer op tv». Alles wat de woonkamer stuurt staat op één plek.", "Hetzelfde venster schakelt naar «Sfeer»: per stemming een rij om horizontaal door te swipen, zoals bij een streamingdienst.", A3d, A3p],
    ["A4", "Zwevende sfeerknop", "Een ronde knop rechtsonder boven alles, bereikbaar met de duim op de tablet. Het meest zichtbaar, maar bedekt een stukje van de agenda.", "Een onderblad met een carrousel van grote previews (bijna tv-formaat). De gekozen video staat onderaan met één grote knop «Op tv afspelen».", A4d, A4p],
    ["A5", "Lichtscène «Sfeer» in het lichtpaneel", "Tussen de lichtscènes (Cinema, Gezellig, Lezen) staat «Sfeer»: dimt de woonkamer naar 30% en zet de tv op. Licht en beeld horen samen.", "Eerst een stemming kiezen met collage-kaarten (Haardvuur, Regen, Café …), rechts de video’s van die stemming, de schakelaar voor het licht en de afspeelknop.", A5d, A5p],
    ["A6", "Avondkaart onderaan de agenda", "Als de agenda rustig is, verschijnt ’s avonds onderaan «Rustige avond? Zet sfeer op» met je drie favorieten: één tik en het speelt. «Meer» opent alles.", "Groot voorbeeld links (titel, duur, licht dimmen, favoriet) en rechts zoeken, stemmingen en de resultatenlijst. Ideaal om rustig te kiezen.", A6d, A6p],
  ];

  const css = `
  .am-opts{display:flex;flex-direction:column;gap:80px}
  .am-pair{display:grid;grid-template-columns:repeat(2,${W}px);gap:56px}
  .am-cap{font-size:13px;font-weight:800;letter-spacing:.08em;color:var(--text-secondary);margin:0 0 10px}
  .am-cap span{font-weight:600;letter-spacing:0;margin-left:8px;color:var(--text-primary,#101130)}
  .am-stage{position:relative;width:${W}px;height:${H}px;border-radius:30px;overflow:hidden;background:linear-gradient(170deg,#b8679b,#6c4796 55%,#3f3478);font-family:"Museo Sans Rounded",Nunito,system-ui,sans-serif;color:#fff}
  .am-stage *{box-sizing:border-box}
  /* dashboard-silhouet */
  .dm{position:absolute;inset:0;padding:26px 28px;display:flex;flex-direction:column;gap:16px}
  .dm-top{display:flex;justify-content:space-between;align-items:flex-end}
  .dm-top p{margin:0;font-size:11px;font-weight:800;letter-spacing:.08em;color:rgba(255,255,255,.6)}
  .dm-top h3{margin:2px 0 0;font-size:26px;font-weight:800;letter-spacing:-.02em}
  .dm-tr{display:flex;gap:10px;align-items:center}
  .dm-rem{height:30px;padding:0 12px;border-radius:999px;background:rgba(229,97,138,.2);color:#f0a3bd;font-size:12px;font-weight:800;display:flex;align-items:center}
  .dm-seg{display:flex;padding:3px;border-radius:999px;background:rgba(255,255,255,.12);font-size:12.5px;font-weight:700}
  .dm-seg>*{padding:6px 14px;border-radius:999px}.dm-seg b{background:#fff;color:#2a2148}.dm-seg span{color:rgba(255,255,255,.7)}
  .dm-seg.sm{font-size:11px}.dm-seg.sm>*{padding:4px 10px}
  .dm-body{flex:1;min-height:0;display:flex;gap:14px}
  .dm-left{width:46%;display:flex;flex-direction:column;gap:14px}
  .dm-right{flex:1;display:flex;flex-direction:column;gap:14px;min-width:0}
  .dm-row{display:flex;gap:14px;height:170px}
  .dm-tile{position:relative;border-radius:22px;padding:14px 16px;background:rgba(22,24,48,.55);box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);display:flex;flex-direction:column;gap:8px;min-width:0;opacity:.72}
  .dm-tile.grow{flex:1}.dm-tile.w{width:150px}
  .dm-l{font-size:10.5px;font-weight:800;letter-spacing:.08em;color:rgba(200,210,255,.6)}
  .dm-big{font-size:38px;font-weight:800;line-height:1}.dm-mid{font-size:18px;font-weight:800}
  .dm-tile small{color:rgba(255,255,255,.6);font-size:12px}
  .dm-pos{flex:1;display:flex;gap:8px;min-height:0}.dm-po{flex:1;max-width:84px;border-radius:10px}
  .dm-tile.hue{flex:1}
  .dm-hh{display:flex;justify-content:space-between;align-items:center}
  .dm-cols{flex:1;display:flex;gap:10px;min-height:0}
  .dm-col{flex:1;border-radius:999px;background:rgba(255,255,255,.08);position:relative;overflow:hidden}
  .dm-col>i{position:absolute;left:0;right:0;bottom:0;background:linear-gradient(180deg,#ffe2a6,#ffb547);border-radius:999px}
  .dm-tile.todo{height:170px}
  .dm-notes{display:flex;gap:10px;flex:1}.dm-notes i{flex:1;border-radius:6px;background:#fff3a8;color:#5a4a10;font-style:normal;font-size:13px;font-weight:700;padding:12px;transform:rotate(-1.5deg)}
  .dm-notes i:nth-child(2){background:#ffd6e4;color:#6b2a40;transform:rotate(1deg)}.dm-notes i:nth-child(3){background:#cfe9ff;color:#1d4466}
  .dm-tile.agenda{flex:1;gap:10px}
  .dm-ev{display:flex;gap:12px;align-items:center;padding:10px 12px;border-radius:14px;background:rgba(255,255,255,.07);font-size:14px}
  .dm-ev b{width:64px;color:#c9b8ff}.dm-ev.dim{opacity:.6}
  .dm-dim{position:absolute;inset:0;background:rgba(14,12,32,.55);backdrop-filter:blur(3px)}
  /* nieuw element: volle kleur + label */
  .focus{position:relative;opacity:1!important;box-shadow:0 0 0 3px #ffcf6b,0 18px 40px -12px rgba(0,0,0,.6)!important}
  .am-new{position:absolute;top:-11px;left:14px;z-index:3;height:20px;padding:0 9px;border-radius:999px;background:#ffcf6b;color:#3a2a00;font-size:10.5px;font-weight:900;letter-spacing:.08em;display:flex;align-items:center}
  .am-tile{position:relative;width:200px;border-radius:22px;overflow:hidden;flex:none}
  .am-tile-bg{position:absolute;inset:0;background-size:cover;background-position:center}
  .am-tile-in{position:absolute;inset:0;padding:14px;display:flex;flex-direction:column;justify-content:flex-end;gap:6px;background:linear-gradient(180deg,rgba(0,0,0,0) 30%,rgba(20,10,30,.85))}
  .am-tl{display:flex;gap:6px;align-items:center;font-size:10.5px;font-weight:800;letter-spacing:.08em;color:#ffd8a8}
  .am-tile-in b{font-size:20px}
  .am-tbtn{align-self:flex-start;height:32px;padding:0 13px;border-radius:999px;background:#fff;color:#2a2148;font-size:12.5px;font-weight:800;display:flex;gap:6px;align-items:center}
  .am-topbtn{height:36px;padding:0 15px;border-radius:999px;background:linear-gradient(135deg,#ff9a5a,#e5618a);font-size:13.5px;font-weight:800;display:flex;gap:7px;align-items:center}
  .am-topbtn .am-new{top:-12px;left:auto;right:-6px}
  .am-tile .am-new{top:10px;left:10px}
  .am-fab{position:absolute;right:30px;bottom:30px;width:92px;height:92px;border-radius:50%;background:linear-gradient(140deg,#ffb067,#e5618a 70%);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;font-size:13px;z-index:2}
  .am-fab .am-new{left:50%;transform:translateX(-50%)}
  .am-scenes{display:flex;gap:8px;flex-wrap:wrap}
  .am-scenes span{height:32px;padding:0 13px;border-radius:999px;background:rgba(255,255,255,.1);font-size:12.5px;font-weight:700;display:flex;gap:6px;align-items:center}
  .am-scenes .am-scene{background:linear-gradient(135deg,#ff9a5a,#e5618a)}
  .am-eve{margin-top:auto;border-radius:18px;padding:14px;background:linear-gradient(150deg,rgba(255,154,90,.28),rgba(229,97,138,.28));box-shadow:inset 0 0 0 1px rgba(255,200,170,.3)}
  .am-eh{display:flex;justify-content:space-between;align-items:center;font-size:14px;font-weight:800;margin-bottom:10px}
  .am-eh span:first-child{display:flex;gap:6px;align-items:center}
  .am-more{font-size:12.5px;color:rgba(255,255,255,.8);display:flex;align-items:center;gap:2px}
  .am-favs{display:flex;gap:10px}.am-fav{flex:1;position:relative}.am-fav .am-th{border-radius:12px}
  .am-fp{position:absolute;right:8px;bottom:8px;width:30px;height:30px;border-radius:50%;background:#fff;color:#2a2148;display:flex;align-items:center;justify-content:center}
  /* gemeenschappelijke kiesbouwstenen */
  .am-th{position:relative;aspect-ratio:16/9;border-radius:14px;background-size:cover;background-position:center;background-color:#2a2148;flex:none}
  .am-dur{position:absolute;right:7px;bottom:7px;padding:2px 6px;border-radius:6px;background:rgba(10,10,20,.82);font-size:11px;font-weight:800}
  .am-dur.live{background:#e5384f}
  .am-card{border-radius:18px;padding:8px;background:rgba(255,255,255,.06);display:flex;flex-direction:column;gap:8px;min-width:0}
  .am-card.sel{background:rgba(255,255,255,.14);box-shadow:0 0 0 2.5px #b9a8ff}
  .am-cb b{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:13px;line-height:1.3}
  .am-cb small{display:block;margin-top:3px;font-size:11.5px;color:rgba(255,255,255,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .am-play{height:40px;border-radius:999px;background:#fff;color:#2a2148;font-weight:800;font-size:13.5px;display:flex;gap:8px;align-items:center;justify-content:center;padding:0 18px}
  .am-play.sm{height:32px;font-size:12px;margin-top:8px;align-self:flex-start;display:inline-flex}
  .am-play.lg{height:52px;font-size:16px;padding:0 26px;background:linear-gradient(135deg,#ffb067,#e5618a);color:#fff}
  .am-ghost{height:52px;padding:0 20px;border-radius:999px;background:rgba(255,255,255,.12);font-weight:800;font-size:14px;display:flex;gap:7px;align-items:center}
  .am-chips{display:flex;gap:8px}.am-chips.wrap{flex-wrap:wrap}
  .am-chip{height:34px;padding:0 15px;border-radius:999px;background:rgba(255,255,255,.1);font-size:13px;font-weight:700;display:flex;align-items:center;white-space:nowrap}
  .am-chip.on{background:#fff;color:#2a2148}
  .am-search{height:42px;min-width:260px;padding:0 16px;border-radius:999px;background:rgba(255,255,255,.12);display:flex;gap:9px;align-items:center;font-size:14px;color:rgba(255,255,255,.85)}
  .am-x{width:40px;height:40px;flex:none;border-radius:50%;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center}
  .am-mh{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}
  .am-mh p{margin:0;font-size:11px;font-weight:800;letter-spacing:.08em;color:rgba(255,255,255,.6)}
  .am-mh h2{margin:2px 0 0;font-size:26px;font-weight:800;letter-spacing:-.02em}
  .am-hr{display:flex;gap:10px;align-items:center}
  .am-back{display:flex;gap:12px;align-items:center}.am-back>svg{width:40px;height:40px;padding:12px;border-radius:50%;background:rgba(255,255,255,.12)}
  .am-modal{position:absolute;inset:22px;border-radius:28px;padding:24px 26px;display:flex;flex-direction:column;gap:16px;background:linear-gradient(160deg,#232b48,#1a2036 55%,#141a2c);box-shadow:inset 0 0 0 1px rgba(160,180,255,.22),0 40px 80px -30px rgba(0,0,0,.8)}
  .am-bar{display:flex;gap:12px;align-items:center}
  .am-grid{display:grid;gap:14px}.am-grid.g4{grid-template-columns:repeat(4,1fr)}
  .am-grid .am-card.sel{grid-row:span 1}
  .am-drawer{position:absolute;top:0;right:0;bottom:0;width:470px;padding:24px;display:flex;flex-direction:column;gap:14px;background:linear-gradient(160deg,#232b48,#161b30);box-shadow:-30px 0 60px -20px rgba(0,0,0,.7);border-radius:28px 0 0 28px}
  .am-list{display:flex;flex-direction:column;gap:10px;min-height:0;overflow:hidden}
  .am-row{display:flex;gap:12px;padding:8px;border-radius:16px;align-items:flex-start}
  .am-row .am-th{width:150px;border-radius:11px}
  .am-row b{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:13.5px;line-height:1.3}
  .am-row small{display:block;margin-top:4px;font-size:11.5px;color:rgba(255,255,255,.6)}
  .am-row.sel{background:rgba(255,255,255,.12);box-shadow:0 0 0 2.5px #b9a8ff}
  .am-row>div{min-width:0;display:flex;flex-direction:column}
  .cm{position:absolute;left:40px;right:40px;top:60px;bottom:40px;border-radius:28px;padding:22px 26px;display:flex;flex-direction:column;gap:18px;background:linear-gradient(160deg,#232b48,#1a2036 55%,#141a2c);box-shadow:inset 0 0 0 1px rgba(160,180,255,.22),0 40px 80px -30px rgba(0,0,0,.8)}
  .cm-bar{display:flex;gap:14px;align-items:stretch}
  .cm-film{display:flex;align-items:center;gap:8px;padding:0 18px;border-radius:16px;background:linear-gradient(135deg,#7a5cff,#b05cff);font-weight:800;font-size:14px;white-space:nowrap}
  .cm-g{flex:1;border-radius:18px;padding:10px 12px;background:rgba(255,255,255,.06);display:flex;flex-direction:column;gap:8px}
  .cm-g.s{flex:.7}
  .cm-gl{font-size:10.5px;font-weight:800;letter-spacing:.08em;color:rgba(200,210,255,.6)}
  .cm-bs{display:flex;gap:6px}.cm-bs i{flex:1;height:42px;border-radius:12px;background:rgba(255,255,255,.1);font-style:normal;font-size:12px;font-weight:700;display:flex;align-items:center;justify-content:center}
  .cm-bs i.stop{background:#f4d8cb;color:#572e38}
  .cm-g.sfeer{flex:1.1;background:linear-gradient(150deg,rgba(255,154,90,.25),rgba(229,97,138,.25))}
  .cm-sf{display:flex;gap:8px;align-items:center}
  .am-mini{width:74px;height:42px;border-radius:10px;background-size:cover;background-position:center;flex:none}
  .cm-sfb{flex:1;height:42px;border-radius:12px;background:#fff;color:#2a2148;font-size:13px;font-weight:800;display:flex;gap:6px;align-items:center;justify-content:center}
  .cm-lane{flex:1;display:flex;gap:30px;min-height:0;opacity:.6}
  .am-shelves{flex:1;display:flex;flex-direction:column;gap:14px;min-height:0;overflow:hidden}
  .am-sh{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.am-sh b{font-size:16px}.am-sh span{font-size:12.5px;color:rgba(255,255,255,.7);display:flex;align-items:center;gap:3px}
  .am-strip{display:flex;gap:12px}.am-strip .am-card{width:205px;flex:none}
  .am-card.sm{padding:6px;gap:6px}.am-card.sm .am-cb b{font-size:12px;-webkit-line-clamp:1}
  .am-card.sm .am-play{height:30px;font-size:11.5px;padding:0 10px}
  .am-sheet{position:absolute;left:0;right:0;bottom:0;height:610px;padding:14px 28px 24px;border-radius:30px 30px 0 0;display:flex;flex-direction:column;gap:14px;background:linear-gradient(170deg,#232b48,#161b30);box-shadow:0 -30px 60px -20px rgba(0,0,0,.7)}
  .am-grab{align-self:center;width:44px;height:5px;border-radius:9px;background:rgba(255,255,255,.3)}
  .am-carousel{flex:1;display:flex;gap:18px;min-height:0;overflow:hidden;align-items:flex-start}
  .am-bigc{width:410px;flex:none;display:flex;flex-direction:column;gap:8px;padding:8px;border-radius:20px}
  .am-bigc.sel{background:rgba(255,255,255,.12);box-shadow:0 0 0 3px #b9a8ff}
  .am-bigc .am-th{border-radius:16px}
  .am-bigc b{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.am-bigc small{font-size:12px;color:rgba(255,255,255,.6)}
  .am-sheetbar{display:flex;justify-content:space-between;align-items:center;padding-top:14px;border-top:1px solid rgba(255,255,255,.1)}
  .am-sel{display:flex;gap:10px;align-items:center;color:rgba(255,255,255,.75);font-size:14px;max-width:640px}.am-sel b{color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .am-modal.split{flex-direction:row;gap:22px}
  .am-moods{flex:1.35;display:flex;flex-direction:column;gap:16px}
  .am-mgrid{flex:1;display:grid;grid-template-columns:repeat(3,1fr);grid-auto-rows:1fr;gap:14px}
  .am-mood{border-radius:20px;padding:10px;background:rgba(255,255,255,.06);display:flex;flex-direction:column;gap:6px}
  .am-mood.on{background:rgba(255,255,255,.14);box-shadow:0 0 0 3px #b9a8ff}
  .am-col3{flex:1;display:grid;grid-template-columns:2fr 1fr;grid-template-rows:1fr 1fr;gap:4px;border-radius:14px;overflow:hidden;min-height:0}
  .am-col3 i{background-size:cover;background-position:center}.am-col3 i:first-child{grid-row:span 2}
  .am-mood b{font-size:17px}.am-mood small{font-size:12px;color:rgba(255,255,255,.6)}
  .am-side{flex:1;display:flex;flex-direction:column;gap:12px;padding-left:22px;border-left:1px solid rgba(255,255,255,.1);min-width:0}
  .am-side .am-row .am-th{width:132px}
  .am-opt{display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:14px;background:rgba(255,255,255,.07);font-size:13.5px;font-weight:700}
  .am-sw{margin-left:auto;width:42px;height:24px;border-radius:999px;background:rgba(255,255,255,.2);position:relative}
  .am-sw.on{background:#8d7bff}.am-sw::after{content:"";position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff}.am-sw.on::after{left:21px}
  .am-side .am-play.lg{margin-top:auto}
  .am-modal.hero{flex-direction:row;gap:26px}
  .am-heroL{width:560px;flex:none;display:flex;flex-direction:column;gap:12px}
  .am-th.xl{border-radius:20px}
  .am-ht{font-size:20px;line-height:1.25}.am-hc{font-size:13px;color:rgba(255,255,255,.6);margin-top:-6px}
  .am-hb{display:flex;gap:10px;margin-top:auto}
  .am-heroR{flex:1;display:flex;flex-direction:column;gap:12px;min-width:0}
  .am-heroR .am-search{flex:1;min-width:0}.am-heroR .am-chips{flex-wrap:wrap}
  .am-heroR .am-row .am-th{width:136px}
  .am-eq{display:inline-flex;gap:2px;align-items:flex-end;height:14px}.am-eq b{width:3px;background:#8ff0a8;border-radius:2px}.am-eq b:nth-child(1){height:60%}.am-eq b:nth-child(2){height:100%}.am-eq b:nth-child(3){height:40%}`;

  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = `left:-573px;top:0;width:${W * 2 + 56}px`;
  b.innerHTML = `<style>${css}</style><header class="bhd"><span class="bnum">AM</span><div><h2>Ambience op tv · zes plaatsen op het dashboard <span class="tag">6 richtingen · 26 okt</span></h2><p>Ambience werkt al via Profiel → «Ambience op tv» (tv aan met Wake-on-LAN, YouTube op het profiel van Chloé, video via casten). Hier zes manieren om het altijd vanaf het dashboard te bereiken, telkens met het scherm dat erna opent. Links het avond-dashboard (vereenvoudigd, het nieuwe element in volle kleur met een geel kader), rechts het keuzescherm met echte YouTube-resultaten. Overal geldt: pas na het kiezen van een video start de tv.</p><p class="uses">Bouwt op: CM2 venster licht, klimaat &amp; scherm · dashboard avond (donker).</p></div></header>
    <div class="am-opts">${OPTS.map(([k, t, d1, d2, left, right]) => `<div class="am-opt-blk"><div class="ag-opthd"><span class="ag-key">${k}</span><div><h3>${t}</h3><p><b>Op het dashboard:</b> ${d1}<br><b>Keuzescherm:</b> ${d2}</p></div></div>
      <div class="am-pair"><div><p class="am-cap">DASHBOARD<span>waar je het vindt</span></p><div class="am-stage">${left}</div></div><div><p class="am-cap">VOLGEND SCHERM<span>previews kiezen en afspelen</span></p><div class="am-stage">${right}</div></div></div></div>`).join("")}</div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  if (others.length) {
    const topY = Math.min(...others.map((el) => el.offsetTop));
    const leftX = Math.min(...others.map((el) => el.offsetLeft));
    b.style.left = `${leftX}px`;
    b.style.top = `${topY - 240 - b.offsetHeight}px`;
  }
})();
