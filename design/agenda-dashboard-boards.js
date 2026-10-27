/* Dashboard · agenda met foto's: vier volledige pagina-voorstellen (15 okt). */
(() => {
  const world = document.getElementById("world");
  const rgba = ([r, g, b], a = 1) => `rgba(${r},${g},${b},${a})`;
  const deep = ([r, g, b], k = 0.5) => `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
  const PIN = '<svg viewBox="0 0 24 24"><path d="M12 2.5a7.2 7.2 0 0 0-7.2 7.2c0 5.1 6 11.1 6.6 11.7a.85.85 0 0 0 1.2 0c.6-.6 6.6-6.6 6.6-11.7A7.2 7.2 0 0 0 12 2.5z" fill="currentColor"/><circle cx="12" cy="9.7" r="2.6" fill="#fff"/></svg>';

  /* Afspraken (zelfde als in de app, 15 okt om 19:37). */
  const BLUE = [92, 98, 220], ORANGE = [214, 134, 52], WINE = [150, 40, 72], GREEN = [32, 120, 72], ROSE = [196, 92, 120];
  const TODAY = [
    { t: "08:00", e: "09:00", title: "Winsol techniekers", c: BLUE, photo: null, past: true },
    { t: "12:00", e: "13:00", title: "12U Gel nagels", loc: "Het nagelatelier, Bonheiden", c: ROSE, photo: "ag_gelnagels", past: true },
    { t: "17:00", e: "18:00", title: "Tanja Holvoet Kristof", c: ORANGE, photo: "ag_tanja_holvoet", past: true },
  ];
  const NEXT = { day: "Morgen", t: "22:00", e: "00:00", title: "Sjotter Y&O vs De Zwaluw", loc: "'t Klaverke, Dorp 2", c: WINE, photo: "ag_sjotter" };
  const LATER = [
    { day: "Morgen", allDay: true, title: "🎂 Huub verjaardag", c: ORANGE, photo: "ag_verjaardag" },
    { day: "Za 17", allDay: true, title: "🎂 Bart Machilsen verjaardag", c: GREEN, photo: "ag_verjaardag" },
  ];

  /* ---------- gedeelde pagina-onderdelen ---------- */
  const head = `<div class="db-head">
      <span class="db-ava"></span><span class="db-clock">19:37</span>
      <span class="db-greet"><em>Donderdag 15 oktober</em><b>Goedenavond, Kristof</b></span>
      <span class="db-seg"><i>Overzicht</i><i class="on">Dashboard</i></span>
    </div>`;
  const weather = (cls = "") => `<div class="db-tile weather ${cls}">
      <span class="db-lbl light">VANDAAG · KONTICH</span>
      <span class="db-temp">18°<small>11°</small></span><span class="db-sub light">Bewolkt</span>
      <span class="db-cloud"></span>
      <span class="db-hours">${["Nu 19°", "20u 18°", "21u 17°", "22u 16°", "23u 16°"].map((h) => `<i><b>${h.split(" ")[0]}</b><s></s>${h.split(" ")[1]}</i>`).join("")}</span>
    </div>`;
  const tomorrowWeather = `<div class="db-tile tw"><span class="db-lbl">MORGEN</span><span class="db-cloud sm"></span><b>17°</b><em>13°</em></div>`;
  const food = (cls = "") => `<div class="db-tile food ${cls}">
      <span class="db-lbl brown">VANDAAG ETEN WE</span>
      <span class="db-plate"><img class="bord" src="${IMG.bord}" alt=""><img class="b1" src="${IMG.bloemkool}" alt=""><img class="b2" src="${IMG.aardappelen}" alt=""></span>
      <span class="db-dish"><b>Bloemkoolpuree</b><em>❄ Uit de diepvries</em></span>
    </div>`;
  const tomorrowFood = `<div class="db-tile tf"><span class="db-lbl brown">MORGEN</span><span class="db-mini"><img src="${IMG.aardappelen}" alt=""></span><b>Aardappelen, komkommer…</b></div>`;
  const shop = `<div class="db-shop"><span class="db-pill y"><b>7</b> Te kopen</span><span class="db-pill l"><b>Lijstjes</b> · alle lijstjes</span></div>`;
  const nav = `<div class="db-nav">${["Lijstjes", "Kaarten", "Kalender", "Recepten"].map((n, i) => `<i class="${i === 0 ? "on" : ""}">${n}</i>`).join("")}</div>`;
  const left = `<div class="db-left">${weather()}${tomorrowWeather}${food()}${tomorrowFood}</div>`;
  const page = (cal, layout = "std") => `<div class="db-page ${layout}">${head}${layout === "std" ? `<div class="db-grid">${left}<div class="db-cal">${cal}${shop}</div></div>` : cal}${nav}</div>`;

  /* Zachte fototegel (zoals de agendategels op de startpagina). */
  const softPhoto = (ev, cls = "") =>
    `<span class="soft ${cls}" style="--l:${rgba(ev.c.map((v) => Math.round(255 - (255 - v) * 0.2)))}"><img class="ph" src="${IMG[ev.photo]}" alt=""><img class="bl" src="${IMG[ev.photo]}" alt=""><span class="tn"></span></span>`;

  /* ---------- A · Fototijdlijn ---------- */
  const strip = (ev) => `<div class="tl-row${ev.past ? " past" : ""}">
      <span class="tl-time"><b>${ev.t}</b><em>${ev.e}</em></span>
      <span class="tl-card" style="--c:${rgba(ev.c)}">
        ${ev.photo ? `<img src="${IMG[ev.photo]}" alt=""><span class="tl-fade" style="background:linear-gradient(90deg, ${rgba(ev.c.map((v) => Math.round(255 - (255 - v) * 0.12)))} 30%, transparent 75%)"></span>` : `<span class="tl-fade" style="background:${rgba(ev.c, 0.12)}"></span>`}
        <span class="tl-txt"><b style="color:${deep(ev.c, 0.4)}">${ev.title}</b>${ev.loc ? `<em style="color:${deep(ev.c, 0.55)}">${PIN}${ev.loc}</em>` : ""}</span>
      </span>
    </div>`;
  const calA = `<div class="cal-a">
      <div class="cal-hd"><b>Vandaag</b><em>3 afspraken · morgen 2</em></div>
      <span class="chip" style="--c:${rgba(BLUE)}">Hele dag · 🍲 [Smartschool] Soepdag</span>
      <div class="tl">${TODAY.map(strip).join("")}
        <div class="tl-now"><b>19:37</b><i></i></div>
        <div class="tl-sep">MORGEN · VR 16</div>
        ${strip({ ...NEXT, t: "22:00", e: "00:00" })}
      </div>
    </div>`;

  /* ---------- B · Bento-subgrid ---------- */
  const bentoBig = `<div class="bn big" style="--c:${rgba(NEXT.c)}">
      <img src="${IMG[NEXT.photo]}" alt=""><span class="bn-scrim"></span>
      <span class="bn-pill">MORGEN <b>22:00</b></span><span class="bn-route">${PIN}</span>
      <span class="bn-txt"><em>VOLGENDE</em><b>${NEXT.title}</b><i>22:00 – 00:00 · ${NEXT.loc}</i></span>
    </div>`;
  const bentoSmall = (ev, label) => `<div class="bn sm${ev.past ? " past" : ""}">${ev.photo ? softPhoto(ev) : `<span class="soft" style="background:${rgba(ev.c, 0.14)}"></span>`}
      <span class="bn-pill sm" style="color:${deep(ev.c, 0.55)}">${label}</span>
      <span class="bn-st"><b style="color:${deep(ev.c, 0.35)}">${ev.title}</b><em style="color:${deep(ev.c, 0.5)}">${ev.allDay ? "Hele dag" : `${ev.t} – ${ev.e}`}</em></span>
    </div>`;
  const calB = `<div class="cal-b">
      <div class="cal-hd"><b>Agenda</b><em>vandaag · morgen · za</em></div>
      <div class="bento">
        ${bentoBig}
        <div class="bn allday" style="--c:${rgba(BLUE)}"><span class="bn-lbl">HELE DAG · VANDAAG</span><b>🍲 Soepdag</b><span class="bn-lbl o">HELE DAG · MORGEN</span><b>🎂 Huub verjaardag</b></div>
        ${bentoSmall(TODAY[2], "17:00")}
        ${bentoSmall(TODAY[1], "12:00")}
        ${bentoSmall(LATER[1], "ZA 17")}
        <div class="bn now"><span class="nowdot"></span><b>Nu 19:37</b><em>Rest van de avond vrij</em></div>
      </div>
    </div>`;

  /* ---------- C · Tijd-as + focus ---------- */
  const hours = [7, 10, 13, 16, 19, 22];
  const pos = (h) => ((h - 7) / 17) * 100;
  const bubble = (ev, h) => `<span class="ax-b${ev.past ? " past" : ""}" style="left:${pos(h)}%;--c:${rgba(ev.c)}">${ev.photo ? `<img src="${IMG[ev.photo]}" alt="">` : `<i>${ev.title.split(" ")[0].slice(0, 1)}</i>`}<em>${ev.t}</em></span>`;
  const calC = `<div class="cal-c">
      <div class="cal-hd"><b>Vandaag</b><em>Hele dag · 🍲 Soepdag</em></div>
      <div class="axis">
        <span class="ax-line"></span><span class="ax-done" style="width:${pos(19.6)}%"></span>
        ${hours.map((h) => `<span class="ax-h" style="left:${pos(h)}%">${h}u</span>`).join("")}
        ${bubble(TODAY[0], 8)}${bubble(TODAY[1], 12)}${bubble(TODAY[2], 17)}
        <span class="ax-now" style="left:${pos(19.6)}%"><b>19:37</b></span>
      </div>
      <div class="focus" style="--c:${rgba(NEXT.c)}">
        <img src="${IMG[NEXT.photo]}" alt="">
        <span class="fc-fade"></span>
        <span class="fc-txt"><span class="fc-badge">OVER 2U 23</span><em>MORGEN · VRIJDAG 16 OKTOBER</em><b>${NEXT.title}</b><i>22:00 – 00:00 · ${NEXT.loc}</i>
          <span class="fc-next"><span class="fc-n"><img src="${IMG.ag_verjaardag}" alt=""><span><b>🎂 Huub verjaardag</b><em>Morgen · hele dag</em></span></span><span class="fc-n"><img src="${IMG.ag_verjaardag}" alt=""><span><b>🎂 Bart Machilsen</b><em>Za 17 · hele dag</em></span></span></span>
        </span>
      </div>
    </div>`;

  /* ---------- D · Week-mozaïek (andere paginaschikking: agenda over de volle breedte) ---------- */
  const DAYS = [
    { d: "DO", n: 15, today: true, items: [{ ...TODAY[1], h: 1 }, { ...TODAY[2], h: 2 }, { title: "🍲 Soepdag", allDay: true, c: BLUE, h: 0 }] },
    { d: "VR", n: 16, items: [{ ...LATER[0], h: 1 }, { ...NEXT, h: 2 }] },
    { d: "ZA", n: 17, items: [{ ...LATER[1], h: 2 }, { title: "Bolderkar lenen Karen", t: "09:00", c: GREEN, h: 0 }, { title: "Loopband smeren", t: "17:00", c: ORANGE, h: 0 }] },
    { d: "ZO", n: 18, items: [{ title: "✝️ Mama gestorven", allDay: true, c: [120, 120, 140], h: 0 }] },
    { d: "MA", n: 19, items: [{ title: "🎂 Tante Chantale Roosen", allDay: true, c: ROSE, h: 0 }, { title: "🚙 KBC Leuven", allDay: true, c: BLUE, h: 0 }] },
    { d: "WO", n: 21, items: [{ title: "🍎 Fruitschildag", allDay: true, c: GREEN, h: 0 }] },
  ];
  const mo = (it) => it.photo
    ? `<span class="mo ph h${it.h}${it.past ? " past" : ""}">${softPhoto(it)}<span class="mo-t"><b style="color:${deep(it.c, 0.35)}">${it.title}</b><em style="color:${deep(it.c, 0.5)}">${it.allDay ? "Hele dag" : it.t}</em></span></span>`
    : `<span class="mo tx" style="--c:${rgba(it.c)}"><i></i><span><b>${it.title}</b><em>${it.allDay ? "Hele dag" : it.t}</em></span></span>`;
  const calD = `<div class="db-grid d">
      <div class="db-dtop">${weather("wide")}${food("wide")}</div>
      <div class="db-cal week">
        <div class="cal-hd"><b>Deze week</b><em>15 – 21 oktober</em></div>
        <div class="mosaic">${DAYS.map((day) => `<div class="mcol${day.today ? " today" : ""}"><span class="mday"><em>${day.d}</em><b>${day.n}</b></span>${day.items.map(mo).join("")}</div>`).join("")}</div>
        ${shop}
      </div>
    </div>`;

  const OPTS = [
    ["A", "Fototijdlijn", "Vandaag als verticale tijdlijn waarin elke afspraak een brede fotostrook is (foto rechts, vloeit links uit in de afspraakkleur). De nu-lijn loopt er dwars door; voorbij = gedimd. Morgen sluit aan onder een scheiding.", page(calA)],
    ["B", "Bento-subgrid", "De agenda als eigen tegelraster: de volgende afspraak groot met volle foto, eromheen kleinere zachte fototegels (vandaag, za), een tegel met alle «Hele dag»-dingen en een «Nu»-tegel. Speelt het meest met de beelden.", page(calB)],
    ["C", "Tijd-as + focus", "Bovenaan een horizontale dag-as (7–24u) met ronde fotobolletjes op hun uur en de nu-lijn; daaronder een grote focuskaart met de volgende afspraak (volle foto) en wat erna komt als mini-kaartjes.", page(calC)],
    ["D", "Week-mozaïek", "Andere schikking: weer en eten als brede banden bovenaan, eronder de hele week als mozaïek — per dag een kolom met fototegels in verschillende hoogtes (belangrijk = groot), vandaag uitgelicht.", page(calD, "wk")],
  ];

  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = "left:0;top:0;width:1480px";
  b.innerHTML = `<header class="bhd"><span class="bnum">D</span><div><h2>Dashboard · agenda met foto's <span class="tag">4 richtingen · 15 okt</span></h2><p>Volledige dashboardpagina (tablet/desktop, 19:37), telkens met dezelfde onderdelen; de agenda gebruikt de fotobibliotheek van afspraken veel sterker. Afspraken zonder foto krijgen een effen tegel in hun kleur.</p><p class="uses">Bouwt op: home_tablet_dashboard · agendategels (zachte foto) · hero-foto C · Hele dag-tegel · kleur per afspraak</p></div></header>
    <div class="db-opts">${OPTS.map(([k, n, why, html]) => `<div class="db-opt"><div class="ag-opthd"><span class="ag-key">${k}</span><div><h3>${n}</h3><p>${why}</p></div></div>${html}</div>`).join("")}</div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const top = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${top - 240 - b.offsetHeight}px`;
})();
