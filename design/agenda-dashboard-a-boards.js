/* Dashboard · fototijdlijn (A) uitgewerkt: vier varianten + betere «Hele dag»-tegels (15 okt). */
(() => {
  const world = document.getElementById("world");
  const rgba = ([r, g, b], a = 1) => `rgba(${r},${g},${b},${a})`;
  const deep = ([r, g, b], k = 0.5) => `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
  const tint = (c, k) => rgba(c.map((v) => Math.round(255 - (255 - v) * k)));
  const PIN = '<svg viewBox="0 0 24 24"><path d="M12 2.5a7.2 7.2 0 0 0-7.2 7.2c0 5.1 6 11.1 6.6 11.7a.85.85 0 0 0 1.2 0c.6-.6 6.6-6.6 6.6-11.7A7.2 7.2 0 0 0 12 2.5z" fill="currentColor"/><circle cx="12" cy="9.7" r="2.6" fill="#fff"/></svg>';

  const BLUE = [92, 98, 220], ORANGE = [214, 134, 52], WINE = [150, 40, 72], GREEN = [32, 120, 72], ROSE = [196, 92, 120], TEAL = [30, 130, 150];
  const WINSOL = { t: "08:00", e: "09:00", title: "Winsol techniekers", c: BLUE, past: true };
  const NAILS = { t: "12:00", e: "13:00", title: "12U Gel nagels", loc: "Het nagelatelier", c: ROSE, photo: "ag_gelnagels", past: true };
  const TANJA = { t: "17:00", e: "18:00", title: "Tanja Holvoet Kristof", c: ORANGE, photo: "ag_tanja_holvoet", past: true };
  const SWIM = { t: "16:30", e: "17:30", title: "Zwemles Noë", loc: "Sportoase", c: TEAL };
  const SJOT = { t: "22:00", e: "00:00", title: "Sjotter Y&O vs De Zwaluw", loc: "'t Klaverke, Dorp 2", c: WINE, photo: "ag_sjotter" };
  const SOEP = { emoji: "🍲", title: "Soepdag", sub: "Smartschool", c: BLUE };
  const HUUB = { emoji: "🎂", title: "Huub verjaardag", sub: "wordt 41", c: ORANGE, photo: "ag_verjaardag" };
  const BART = { emoji: "🎂", title: "Bart Machilsen", sub: "verjaardag", c: GREEN, photo: "ag_verjaardag" };

  /* ---------- gedeelde pagina (zelfde als het bord hieronder) ---------- */
  const head = `<div class="db-head"><span class="db-ava"></span><span class="db-clock">19:37</span>
      <span class="db-greet"><em>Donderdag 15 oktober</em><b>Goedenavond, Kristof</b></span>
      <span class="db-seg"><i>Overzicht</i><i class="on">Dashboard</i></span></div>`;
  const left = `<div class="db-left">
      <div class="db-tile weather"><span class="db-lbl light">VANDAAG · KONTICH</span><span class="db-temp">18°<small>11°</small></span><span class="db-sub light">Bewolkt</span><span class="db-cloud"></span>
        <span class="db-hours">${["Nu 19°", "20u 18°", "21u 17°", "22u 16°", "23u 16°"].map((h) => `<i><b>${h.split(" ")[0]}</b><s></s>${h.split(" ")[1]}</i>`).join("")}</span></div>
      <div class="db-tile tw"><span class="db-lbl">MORGEN</span><span class="db-cloud sm"></span><b>17°</b><em>13°</em></div>
      <div class="db-tile food"><span class="db-lbl brown">VANDAAG ETEN WE</span><span class="db-plate"><img class="bord" src="${IMG.bord}" alt=""><img class="b1" src="${IMG.bloemkool}" alt=""><img class="b2" src="${IMG.aardappelen}" alt=""></span><span class="db-dish"><b>Bloemkoolpuree</b><em>❄ Uit de diepvries</em></span></div>
      <div class="db-tile tf"><span class="db-lbl brown">MORGEN</span><span class="db-mini"><img src="${IMG.aardappelen}" alt=""></span><b>Aardappelen, komkommer…</b></div>
    </div>`;
  const shop = `<div class="db-shop"><span class="db-pill y"><b>7</b> Te kopen</span><span class="db-pill l"><b>Lijstjes</b> · alle lijstjes</span></div>`;
  const nav = `<div class="db-nav">${["Lijstjes", "Kaarten", "Kalender", "Recepten"].map((n, i) => `<i class="${i === 0 ? "on" : ""}">${n}</i>`).join("")}</div>`;
  const page = (cal) => `<div class="db-page">${head}<div class="db-grid">${left}<div class="db-cal va-cal">${cal}${shop}</div></div>${nav}</div>`;

  /* ---------- bouwstenen ---------- */
  const when = (ev) => `${ev.t} – ${ev.e}${ev.loc ? ` · ${ev.loc}` : ""}`;
  // Hele dag: emoji-vierkant + label + titel; met foto rechts die uitvloeit in de tint.
  const allDay = (a, label = "HELE DAG") => `<div class="va-ad" style="background:${tint(a.c, 0.13)}">
      ${a.photo ? `<img class="va-ad-ph" src="${IMG[a.photo]}" alt=""><span class="va-ad-fade" style="background:linear-gradient(90deg, ${tint(a.c, 0.13)} 40%, ${rgba(a.c.map((v) => Math.round(255 - (255 - v) * 0.13)), 0)} 80%)"></span>` : ""}
      <span class="va-ad-em">${a.emoji}</span>
      <span class="va-ad-tx"><em style="color:${deep(a.c, 0.6)}">${label}</em><b style="color:${deep(a.c, 0.35)}">${a.title}</b>${a.sub ? `<i style="color:${deep(a.c, 0.55)}">${a.sub}</i>` : ""}</span>
    </div>`;
  // Brede fotostrook (A).
  const strip = (ev, h = 104) => `<div class="va-strip" style="height:${h}px;background:${tint(ev.c, 0.12)};--c:${rgba(ev.c)}">
      ${ev.photo ? `<img src="${IMG[ev.photo]}" alt=""><span class="va-fade" style="background:linear-gradient(90deg, ${tint(ev.c, 0.12)} 34%, ${rgba(ev.c.map((v) => Math.round(255 - (255 - v) * 0.12)), 0)} 78%)"></span>` : ""}
      <span class="va-st"><b style="color:${deep(ev.c, 0.38)}">${ev.title}</b><em style="color:${deep(ev.c, 0.55)}">${ev.loc ? PIN : ""}${when(ev)}</em></span>
    </div>`;
  // Compacte voorbije afspraak.
  const mini = (ev) => `<div class="va-mini"><span class="va-dot" style="background:${rgba(ev.c)}"></span><b>${ev.title}</b>${ev.photo ? `<img src="${IMG[ev.photo]}" alt="">` : ""}</div>`;
  const row = (time, body, cls = "") => `<div class="va-row ${cls}"><span class="va-time">${time}</span>${body}</div>`;
  const tm = (ev) => `<b>${ev.t}</b><em>${ev.e}</em>`;
  const HD = `<b class="va-hd-ic">☀︎</b><em>hele dag</em>`;
  const now = (txt = "") => `<div class="va-now"><b>19:37</b><i></i>${txt ? `<span>${txt}</span>` : ""}</div>`;
  const sep = (t) => `<div class="va-sep">${t}</div>`;

  /* A1 · Verfijnd */
  const a1 = `<div class="va">
      <div class="cal-hd"><b>Vandaag</b><em>Donderdag 15 oktober</em></div>
      <div class="va-tl">
        ${row(HD, allDay(SOEP))}
        ${[WINSOL, NAILS, TANJA].map((e) => row(tm(e), mini(e), "past")).join("")}
        ${now("Rest van de avond vrij")}
        ${sep("MORGEN · VRIJDAG 16")}
        ${row(HD, allDay(HUUB))}
        ${row(tm(SWIM), strip(SWIM, 72))}
        ${row(tm(SJOT), strip(SJOT, 104))}
      </div>
    </div>`;

  /* A2 · Vandaag | Morgen */
  const dayHead = (k, d, n) => `<div class="va-dh"><em>${k}</em><b>${d}</b><span>${n}</span></div>`;
  const a2 = `<div class="va va-two">
      <div class="va-col">
        ${dayHead("VANDAAG", "do 15", "3 afspraken")}
        ${allDay(SOEP)}
        ${[WINSOL, NAILS, TANJA].map((e) => `<div class="va-crow past"><span class="va-ct">${e.t}</span>${mini(e)}</div>`).join("")}
        <div class="va-free"><span class="va-free-now"><b>19:37</b><i></i></span><span class="va-free-c"><i>🌙</i><b>Rest van de avond vrij</b><em>Geen afspraken meer vandaag</em></span></div>
      </div>
      <div class="va-col">
        ${dayHead("MORGEN", "vr 16", "2 afspraken")}
        ${allDay(HUUB)}
        <div class="va-crow"><span class="va-ct">${SWIM.t}</span>${strip(SWIM, 72)}</div>
        <div class="va-crow grow"><span class="va-ct">${SJOT.t}</span>${strip(SJOT, 0)}</div>
      </div>
    </div>`;

  /* A3 · Dagdelen-subgrid */
  const part = (ic, name, tiles) => `<div class="va-part"><span class="va-pl"><i>${ic}</i><b>${name}</b></span><div class="va-pt">${tiles}</div></div>`;
  const tile = (ev, label) => `<div class="va-tile${ev.past ? " past" : ""}" style="background:${tint(ev.c, 0.14)}">
      ${ev.photo ? `<img src="${IMG[ev.photo]}" alt=""><span class="va-tfade" style="background:linear-gradient(180deg, ${rgba(ev.c.map((v) => Math.round(255 - (255 - v) * 0.14)), 0)} 25%, ${tint(ev.c, 0.14)} 72%)"></span>` : ""}
      <span class="va-tp" style="color:${deep(ev.c, 0.5)}">${label || ev.t}</span>
      <span class="va-tt"><b style="color:${deep(ev.c, 0.35)}">${ev.title}</b><em style="color:${deep(ev.c, 0.55)}">${ev.t} – ${ev.e}</em></span>
    </div>`;
  const a3 = `<div class="va">
      <div class="cal-hd"><b>Vandaag</b><em>Donderdag 15 oktober</em></div>
      ${allDay(SOEP)}
      ${part("🌅", "Ochtend", tile(WINSOL))}
      ${part("☀️", "Middag", tile(NAILS) + tile(TANJA))}
      ${part("🌙", "Avond", `<div class="va-tile now"><span class="nowdot"></span><b>Nu 19:37</b><em>Rest van de avond vrij</em></div>`)}
      ${part("➜", "Morgen", `<div class="va-adv">${allDay(HUUB)}</div>${tile(SWIM)}${tile(SJOT)}`)}
    </div>`;

  /* A4 · Volgende in de kijker */
  const bubble = (a, label) => `<div class="va-bub"><span class="va-ring" style="--c:${rgba(a.c)}">${a.photo ? `<img src="${IMG[a.photo]}" alt="">` : `<i style="background:${tint(a.c, 0.16)}">${a.emoji}</i>`}${a.photo ? `<s>${a.emoji}</s>` : ""}</span><b>${a.title}</b><em>${label}</em></div>`;
  const earlier = (ev) => `<span class="va-ear">${ev.photo ? `<img src="${IMG[ev.photo]}" alt="">` : `<i style="background:${rgba(ev.c)}"></i>`}<b>${ev.t}</b><em>${ev.title}</em></span>`;
  const a4 = `<div class="va">
      <div class="cal-hd"><b>Agenda</b><em>Donderdag 15 oktober</em></div>
      <div class="va-bubs">${bubble(SOEP, "vandaag")}${bubble({ ...HUUB, title: "Huub" }, "morgen")}${bubble({ ...BART, title: "Bart" }, "za 17")}</div>
      <div class="va-earlier"><span class="va-elbl">EERDER VANDAAG</span>${[WINSOL, NAILS, TANJA].map(earlier).join("")}</div>
      ${now("Rest van de avond vrij")}
      <div class="va-hero" style="--c:${rgba(SJOT.c)}">
        <img src="${IMG[SJOT.photo]}" alt=""><span class="bn-scrim"></span>
        <span class="bn-pill">MORGEN <b>22:00</b></span><span class="bn-route">${PIN}</span>
        <span class="bn-txt"><em>VOLGENDE</em><b>${SJOT.title}</b><i>22:00 – 00:00 · ${SJOT.loc}</i></span>
      </div>
      <div class="va-after"><span class="va-elbl">DAARNA · ZATERDAG 17</span>${strip({ ...SWIM, t: "10:00", e: "11:00" }, 64)}</div>
    </div>`;

  const OPTS = [
    ["A1", "Verfijnd", "Concept A, strakker: één tijdkolom, vaste maten en 12px-ritme. Voorbije afspraken worden compacte regels met een fotoduimpje; wat nog komt blijft een brede fotostrook. «Hele dag» krijgt een eigen tegel (emoji-vierkant + foto als die er is) op de plaats van het uur.", page(a1)],
    ["A2", "Vandaag | Morgen", "Twee kolommen naast elkaar. Elke dag begint met zijn «Hele dag»-tegel, daaronder de afspraken. Vandaag toont na de laatste afspraak «Rest van de avond vrij»; de laatste afspraak van morgen vult de kolom als grote fotostrook.", page(a2)],
    ["A3", "Dagdelen-subgrid", "Vandaag opgedeeld in ochtend / middag / avond; elk dagdeel is een rij fototegels (subgrid). «Hele dag» staat als brede tegel bovenaan, morgen sluit aan als laatste rij. Leest als «wat gebeurt er wanneer» in één oogopslag.", page(a3)],
    ["A4", "Volgende in de kijker", "Hele-dag-dingen als ronde «stories» (foto of emoji, ring in de afspraakkleur). Wat voorbij is krimpt tot één rij duimpjes; de volgende afspraak is groot met volle foto en routeknop.", page(a4)],
  ];

  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = "left:0;top:0;width:1480px";
  b.innerHTML = `<header class="bhd"><span class="bnum">A</span><div><h2>Dashboard · fototijdlijn uitgewerkt <span class="tag">4 varianten van A · 15 okt</span></h2><p>Verder op concept A (fototijdlijn). Gedeeld in alle vier: nieuwe «Hele dag»-tegel (emoji-vierkant, label, eventueel foto die uitvloeit), vaste spacing (12px tussen rijen, 16px tussen blokken, tijdkolom 56px) en de tijdlijn vult de hoogte tot de lijstjes-knoppen.</p><p class="uses">Bouwt op: concept A hieronder · agendategels (zachte foto) · bento-hero · kleur per afspraak</p></div></header>
    <div class="db-opts">${OPTS.map(([k, n, why, html]) => `<div class="db-opt"><div class="ag-opthd"><span class="ag-key">${k}</span><div><h3>${n}</h3><p>${why}</p></div></div>${html}</div>`).join("")}</div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const top = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${top - 240 - b.offsetHeight}px`;
  /* ---------- A1 · iteratie 2: alles even hoog, foto 45%, meerdere hele-dag-items ---------- */
  {
    const OUDER = { emoji: "🎒", title: "Oudercontact", sub: "Klas Noë", c: GREEN };
    const FRUIT = { emoji: "🍎", title: "Fruitdag", sub: "Smartschool", c: GREEN };
    const KBC = { emoji: "🚙", title: "KBC Leuven", sub: "Kantoor", c: BLUE };
    const BOS = { emoji: "🌳", title: "Bosklassen", sub: "Lore · t/m zondag", c: TEAL };
    const fade = (c, k) => `linear-gradient(90deg, ${tint(c, k)} 55%, ${rgba(c.map((v) => Math.round(255 - (255 - v) * k)), 0)} 72%)`;
    const ad2 = (a, narrow) => `<div class="vb-ad" style="background:${tint(a.c, 0.13)}">
        ${a.photo ? `<img class="vb-ph" src="${IMG[a.photo]}" alt=""><span class="vb-fade" style="background:${narrow ? `linear-gradient(90deg, ${tint(a.c, 0.13)} 66%, ${rgba(a.c.map((v) => Math.round(255 - (255 - v) * 0.13)), 0)} 80%)` : fade(a.c, 0.13)}"></span>` : ""}
        <span class="va-ad-em">${a.emoji}</span>
        <span class="vb-tx"><em style="color:${deep(a.c, 0.6)}">HELE DAG</em><b style="color:${deep(a.c, 0.35)}">${a.title}</b>${a.sub ? `<i style="color:${deep(a.c, 0.55)}">${a.sub}</i>` : ""}</span>
      </div>`;
    // 1 → volle breedte, 2 → naast elkaar, 3+ → twee tegels + «+n meer».
    const adRow = (list) => {
      if (list.length <= 2) return `<div class="vb-adrow n${list.length}">${list.map((a) => ad2(a, list.length > 1)).join("")}</div>`;
      const rest = list.slice(2);
      return `<div class="vb-adrow more">${list.slice(0, 2).map((a) => ad2(a, true)).join("")}<div class="vb-more"><span>${rest.map((a) => a.emoji).join("")}</span><b>+${rest.length} meer</b></div></div>`;
    };
    const strip2 = (ev) => `<div class="vb-ad" style="background:${tint(ev.c, 0.13)}">
        ${ev.photo ? `<img class="vb-ph" src="${IMG[ev.photo]}" alt=""><span class="vb-fade" style="background:${fade(ev.c, 0.13)}"></span>` : ""}
        <span class="vb-tx"><b style="color:${deep(ev.c, 0.35)}">${ev.title}</b><i style="color:${deep(ev.c, 0.55)}">${ev.loc ? PIN : ""}${when(ev)}</i></span>
      </div>`;
    const mini2 = (ev) => `<div class="vb-mini"><span class="va-dot" style="background:${rgba(ev.c)}"></span><b>${ev.title}</b>${ev.photo ? `<img src="${IMG[ev.photo]}" alt="">` : ""}</div>`;
    const tl = (todayAd, tomorrowAd) => `<div class="va vb">
        <div class="cal-hd"><b>Vandaag</b><em>Donderdag 15 oktober</em></div>
        <div class="va-tl">
          ${row("", adRow(todayAd))}
          ${[WINSOL, NAILS, TANJA].map((e) => row(tm(e), mini2(e), "past")).join("")}
          ${now("Rest van de avond vrij")}
          ${sep("MORGEN · VRIJDAG 16")}
          ${row("", adRow(tomorrowAd))}
          ${row(tm(SWIM), strip2(SWIM))}
          ${row(tm(SJOT), strip2(SJOT))}
        </div>
      </div>`;
    // Morgen eten: bord met drie ingrediënten.
    const tf3 = `<div class="db-tile tf"><span class="db-lbl brown">MORGEN</span><span class="vb-plate"><img class="bord" src="${IMG.bord}" alt=""><img class="i1" src="${IMG.aardappelen}" alt=""><img class="i2" src="${IMG.komkommer}" alt=""><img class="i3" src="${IMG.kipfilet}" alt=""></span><b>Aardappelen, komkommer, kip</b></div>`;
    const left2 = left.replace(/<div class="db-tile tf">[\s\S]*?<\/div>/, tf3);
    const page2 = (cal) => `<div class="db-page">${head}<div class="db-grid">${left2}<div class="db-cal va-cal">${cal}${shop}</div></div>${nav}</div>`;

    const OPTS2 = [
      ["1", "Twee hele-dag-items", "Alle tegels 72px hoog (hele dag én afspraken), voorbije afspraken 40px. Foto neemt 45% rechts, de kleurzone links is breed genoeg voor de tekst. Geen zon/«hele dag» meer in de tijdkolom: het label staat al in de tegel. Twee hele-dag-items staan naast elkaar.", page2(tl([SOEP, OUDER], [HUUB, BOS]))],
      ["2", "Veel hele-dag-items", "Bij drie of meer: de eerste twee als tegel, de rest samen in een «+n meer»-tegel met hun emoji's (tikken klapt open). Eén item vult de volle breedte. De rij blijft altijd 72px, dus de tijdlijn verspringt niet.", page2(tl([SOEP, OUDER, FRUIT, KBC], [HUUB]))],
    ];
    const b2 = document.createElement("section");
    b2.className = "board iter";
    b2.style.cssText = "left:0;top:0;width:1480px";
    b2.innerHTML = `<header class="bhd"><span class="bnum">A1</span><div><h2>Dashboard · A1 iteratie <span class="tag">gelijke hoogtes · 15 okt</span></h2><p>Alles even hoog (72px), voorbije afspraken lager (40px), foto 45% van de breedte, geen herhaalde «hele dag» in de tijdkolom, meerdere hele-dag-items, en het bord voor morgen met drie ingrediënten.</p><p class="uses">Bouwt op: A1 Verfijnd hieronder</p></div></header>
      <div class="db-opts">${OPTS2.map(([k, n, why, html]) => `<div class="db-opt"><div class="ag-opthd"><span class="ag-key">${k}</span><div><h3>${n}</h3><p>${why}</p></div></div>${html}</div>`).join("")}</div>`;
    world.appendChild(b2);
    const others2 = [...world.children].filter((el) => el !== b2 && el.tagName === "SECTION");
    b2.style.top = `${Math.min(...others2.map((el) => el.offsetTop)) - 240 - b2.offsetHeight}px`;
  }
})();
