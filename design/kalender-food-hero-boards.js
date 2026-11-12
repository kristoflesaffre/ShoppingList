/* Kalender › Agenda · KA 1 verder (v2): linksboven enkel het eten van vandaag; het eten staat ook als eerste
   tegel in de rij; een tik op een afspraak toont ze linksboven; hele dag zoals nu (AllDayTile) · 12 nov.
   Gebruikt window.KA. */
(() => {
  const world = document.getElementById("world");
  const K = window.KA;
  const { postit, CHEV, PIN, rgba, deep, I, M, ORANGE, BLUE, ROSE, GREEN, TEAL, WINE } = K;
  const lt = (c, k = 0.16, a = 1) => rgba(c.map((v) => Math.round(255 - (255 - v) * k)), a);
  const ROUTE = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11 21 3l-8 18-2-8-8-2z"/></svg>';

  /* ---------- data: do 12 nov, 15:10 (zoals KA) ---------- */
  const DL = ["VANDAAG", "MORGEN", "ZA 14", "ZO 15", "MA 16", "DI 17"];
  const EV = [
    { d: 0, t: "16:30", e: "17:15", title: "Kinesist Kristof", loc: "Kine Kontich", c: TEAL, ph: "ag_kinesist", cal: "Kristof" },
    { d: 0, t: "20:00", e: "20:30", title: "Oudercontact Noë", loc: "Sint-Ritaschool", c: ORANGE, ph: "ag_oudercontact", cal: "Gezin" },
    { d: 1, all: true, title: "Soepdag", sub: "Smartschool", c: BLUE, ph: "ag_soepdag", cal: "School" },
    { d: 1, t: "19:30", e: "23:00", title: "Date night", loc: "Wok Dynasty, Kontich", c: ROSE, ph: "ag_datenight", cal: "Gezin" },
    { d: 2, t: "10:00", e: "11:30", title: "Sjotter Noë", loc: "'t Klaverke", c: WINE, ph: "ag_sjotter", cal: "Gezin" },
    { d: 3, t: "12:00", e: "16:00", title: "Bij oma en opa", c: GREEN, ph: "ag_oma_opa", cal: "Gezin" },
    { d: 4, t: "08:40", e: "09:10", title: "Tandarts", loc: "Mortsel", c: BLUE, ph: "ag_tandarts", cal: "Kristof" },
    { d: 5, all: true, title: "Huub verjaardag", sub: "wordt 41", c: ORANGE, ph: "ag_verjaardag", cal: "Verjaardagen" },
  ];
  const TD = K.TD.filter((t) => t.d <= 0);
  const later = K.TD.length - TD.length;
  const meal = M.m0;
  const DATE = EV[3];

  /* ---------- tegels ---------- */
  const sz = (ph) => (ph ? { w: 150, h: 190 } : { w: 206, h: 222 });
  const foodTile = (ph, sel) => {
    const { w, h } = sz(ph);
    return `<div class="tile kc-food ${sel ? "sel" : ""}" style="width:${w}px;height:${h}px">
      <span class="kc-food-pl" style="width:${ph ? 84 : 112}px;height:${ph ? 84 : 112}px"><img src="${meal.img}" alt=""></span>
      <span class="tile-time"><em style="color:#a35a12">VANDAAG</em><b style="color:#7a4210">Eten</b></span>
      <span class="tile-bt"><b style="color:#4a2706">${meal.name}</b><em style="color:#8a5418">4 personen</em></span></div>`;
  };
  const evTile = (ev, ph, sel, next) => {
    const { w, h } = sz(ph);
    return `<div class="tile ${sel ? "sel" : ""}" style="width:${w}px;height:${h}px;--c:${rgba(ev.c)}">
      <span class="tile-ph"><img src="${I[ev.ph]}" alt=""><span style="background:linear-gradient(180deg, ${lt(ev.c, 0.16, 0)} 34%, ${lt(ev.c, 0.16, 0.86)} 68%, ${lt(ev.c, 0.16, 0.97)} 100%)"></span></span>
      ${next ? `<span class="kc-nextb" style="background:${rgba(ev.c)}">Volgende</span>` : ""}
      <span class="tile-time"><em style="color:${deep(ev.c, 0.55)}">${DL[ev.d]}</em><b style="color:${deep(ev.c, 0.6)}">${ev.t}</b></span>
      <span class="tile-bt"><b style="color:${deep(ev.c, 0.35)}">${ev.title}</b><em style="color:${deep(ev.c, 0.5)}">${ev.loc ? PIN + ev.loc : `tot ${ev.e}`}</em></span></div>`;
  };
  // Zoals AllDayTile in de app: daglabel, «Hele dag» groot, afspraken met kleurstreepje.
  const allDayTile = (evs, ph) => {
    const { w, h } = sz(ph), c = evs[0].c;
    return `<div class="tile kc-ad" style="width:${w}px;height:${h}px;background:linear-gradient(170deg, ${lt(c, 0.16)} 0%, #fff 62%)">
      <span class="kc-ad-l" style="color:${deep(c, 0.55)}">${DL[evs[0].d]}</span>
      <b class="kc-ad-t" style="color:${deep(c, 0.5)}">Hele dag</b>
      <span class="kc-ad-rows">${evs.map((e) => `<span><i style="background:${rgba(e.c)}"></i><b>${e.title}</b></span>`).join("")}</span></div>`;
  };
  const lane = (ph, selKey) => {
    const out = [foodTile(ph, selKey === "food")];
    for (let d = 0; d < 6; d++) {
      const all = EV.filter((e) => e.d === d && e.all);
      if (all.length) out.push(allDayTile(all, ph));
      EV.filter((e) => e.d === d && !e.all).forEach((e) => out.push(evTile(e, ph, selKey === e.title, e === EV[0])));
    }
    return `<div class="kc-lane ${ph ? "ph" : ""}">${out.join("")}</div>`;
  };

  /* ---------- linksboven ---------- */
  const foodHero = (ph) => `<div class="kc-hero ${ph ? "ph" : ""}">
      <span class="kc-plate"><img src="${meal.img}" alt=""></span>
      <span class="kc-htx"><i class="kc-pill">Vandaag eten we</i><em class="kc-date">Donderdag 12 november</em><h3>${meal.name}</h3>
        <span class="kc-meta">4 personen · ${meal.ing.length} ingrediënten</span>
        <span class="kc-acts"><span class="kc-btn pri">Recept bekijken</span></span></span></div>`;
  const eventHero = (ph, ev) => `<div class="kc-hero ev ${ph ? "ph" : ""}">
      <span class="kc-plate ev" style="box-shadow:0 0 0 7px rgba(255,255,255,.75),0 26px 40px -18px ${rgba(ev.c, 0.55)}"><img src="${I[ev.ph]}" alt=""></span>
      <span class="kc-htx"><i class="kc-pill" style="color:${deep(ev.c, 0.6)}">Morgen · ${ev.t}</i><em class="kc-date">Vrijdag 13 november · agenda ${ev.cal}</em><h3>${ev.title}</h3>
        <span class="kc-meta">${ev.t} – ${ev.e}<span class="kc-dot"></span>${PIN} ${ev.loc}</span>
        <span class="kc-acts"><span class="kc-btn pri">${ROUTE}Route</span><span class="kc-btn back"><img src="${meal.img}" alt="">Eten van vandaag</span></span></span></div>`;
  const todo = (ph) => `<div class="kc-board ${ph ? "ph" : ""}"><div class="lh td"><b>To do <span class="cnt">${TD.length}</span></b><em class="link">${ph ? "" : "Alles in Todoist "}${CHEV("right", 14)}</em></div>
      <div class="kc-notes">${TD.map((t, i) => postit(t, ph ? 128 : 130, i)).join("")}${ph ? `<span class="later-tile">+ ${later}<br>later</span>` : ""}</div>${ph ? "" : `<p class="later">+ ${later} later deze week</p>`}</div>`;
  const laneHd = (ph) => `<div class="lh"><b>Komende afspraken</b>${ph ? `<em>${CHEV("left", 14)}Eerder</em>` : `<span class="lh-arr"><i>${CHEV("left")}</i><i>${CHEV("right")}</i></span>`}</div>`;

  const FOOD_BAND = "#f1d9c2", ROSE_BAND = lt(ROSE, 0.26);
  const desk = (state) => {
    const band = state === "food" ? FOOD_BAND : ROSE_BAND;
    return `<div class="dsk"><span class="band" style="background:linear-gradient(180deg, ${band} 0%, #f3eff0 50%, #f2f3f7 100%)"></span><div class="dsk-in">${K.head(false)}
      <div class="kc-top">${state === "food" ? foodHero(false) : eventHero(false, DATE)}${todo(false)}</div>${laneHd(false)}${lane(false, state === "food" ? "food" : DATE.title)}</div></div>`;
  };
  const phone = (state) => {
    const band = state === "food" ? FOOD_BAND : ROSE_BAND;
    return `<div class="phn"><span class="band" style="background:linear-gradient(180deg, ${band} 0%, #f3eff0 55%, #f2f3f7 100%)"></span><span class="sb"><b>15:10</b><i></i></span>
      <div class="phn-in">${K.head(true)}${state === "food" ? foodHero(true) : eventHero(true, DATE)}${laneHd(true)}${lane(true, state === "food" ? "food" : DATE.title)}${todo(true)}</div>
      <span class="tabbar">${["Lijstjes", "Kaarten", "Kalender", "Recepten"].map((n) => `<i class="${n === "Kalender" ? "on" : ""}">${n}</i>`).join("")}</span></div>`;
  };

  const css = `<style>
  .kc-row{display:flex;gap:44px;align-items:flex-start}.kc-row *{box-sizing:border-box}
  .kc-st{display:flex;flex-direction:column;gap:14px;margin-top:30px}.kc-st .ag-opthd p{max-width:1500px}
  .kc-top{display:flex;align-items:center;justify-content:space-between;gap:28px;margin-top:18px;min-height:250px}
  .kc-hero{display:flex;align-items:center;gap:30px;flex:1;min-width:0;padding-left:8px}
  .kc-plate{width:236px;height:236px;flex:none;border-radius:50%;overflow:hidden;box-shadow:0 0 0 7px rgba(255,255,255,.75),0 26px 40px -18px rgba(120,60,0,.45)}
  .kc-plate img{width:100%;height:100%;object-fit:cover}
  .kc-plate.ev{border-radius:44px}
  .kc-htx{display:flex;flex-direction:column;align-items:flex-start;min-width:0}
  .kc-pill{font-style:normal;height:24px;padding:0 10px;border-radius:999px;background:#fff;color:#a35a12;font-size:11.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;display:inline-flex;align-items:center;box-shadow:0 2px 8px -3px rgba(16,17,48,.25)}
  .kc-date{font-style:normal;margin-top:8px;font-size:14px;font-weight:700;color:#5b6070}
  .kc-htx h3{margin:6px 0 0;font-size:44px;line-height:1.04;font-weight:800;letter-spacing:-.03em}
  .kc-meta{margin-top:10px;font-size:15px;font-weight:600;color:#5b6070;display:flex;align-items:center;gap:6px}
  .kc-dot{width:4px;height:4px;border-radius:50%;background:#a0a4af;margin:0 4px}
  .kc-acts{display:flex;gap:10px;margin-top:18px}
  .kc-btn{height:42px;padding:0 18px;border-radius:999px;display:inline-flex;align-items:center;gap:8px;font-size:15px;font-weight:700}
  .kc-btn.pri{background:#4f55f1;color:#fff}
  .kc-btn.back{background:rgba(255,255,255,.85);color:#16181f;padding-left:5px}.kc-btn.back img{width:32px;height:32px;border-radius:50%;object-fit:cover}
  .kc-board{width:440px;flex:none;align-self:flex-start}.kc-board .lh{margin:0 0 6px}
  .kc-notes{display:flex;gap:16px;padding:16px 4px 4px}
  .kc-board.ph{width:auto}.kc-board.ph .lh{margin:18px 0 0}.kc-board.ph .kc-notes{gap:14px;padding:18px 0 8px;margin-right:-16px;overflow:hidden;align-items:center}
  .kc-lane{display:flex;gap:16px;padding:14px 0 16px;margin-right:-56px;overflow:hidden;align-items:center}
  .kc-lane.ph{gap:12px;margin-right:-16px}
  .tile.sel{box-shadow:0 0 0 3px #4f55f1,0 14px 30px -16px rgba(79,85,241,.7)}
  .kc-food{background:linear-gradient(170deg,#fbe1c6 0%,#fff3e6 70%)}
  .kc-food-pl{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);border-radius:50%;overflow:hidden;box-shadow:0 0 0 4px rgba(255,255,255,.8),0 14px 22px -12px rgba(120,60,0,.5)}
  .kc-food-pl img{width:100%;height:100%;object-fit:cover}
  .kc-food .tile-bt b{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .phn .kc-food .tile-time em{display:inline}
  .kc-nextb{position:absolute;left:50%;top:-11px;transform:translateX(-50%);z-index:3;height:22px;padding:0 9px;border-radius:999px;color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center}
  .tile:has(.kc-nextb){overflow:visible}.tile:has(.kc-nextb) .tile-ph{border-radius:26px;overflow:hidden}
  .kc-ad{padding:16px;display:flex;flex-direction:column;box-shadow:inset 0 0 0 1px rgba(16,17,48,.07)}
  .kc-ad-l{font-size:11px;font-weight:800;letter-spacing:.06em}.kc-ad-t{margin-top:2px;font-size:28px;font-weight:800;letter-spacing:-.02em}
  .phn .kc-ad{padding:14px}.phn .kc-ad-t{font-size:24px}
  .kc-ad-rows{display:flex;flex-direction:column;margin-top:6px}.kc-ad-rows span{display:flex;gap:8px;padding:7px 0}.kc-ad-rows span + span{border-top:1px solid rgba(16,17,48,.08)}
  .kc-ad-rows i{width:4px;border-radius:2px;flex:none}.kc-ad-rows b{font-size:14px;line-height:18px;font-weight:700}
  /* gsm */
  .kc-hero.ph{flex-direction:column;align-items:center;gap:14px;padding:6px 0 0;text-align:center}
  .kc-hero.ph .kc-plate{width:180px;height:180px;box-shadow:0 0 0 6px rgba(255,255,255,.75),0 20px 30px -16px rgba(120,60,0,.45)}
  .kc-hero.ph .kc-plate.ev{border-radius:36px}
  .kc-hero.ph .kc-htx{align-items:center}.kc-hero.ph h3{font-size:28px}.kc-hero.ph .kc-date{font-size:13px}
  .kc-hero.ph .kc-meta{font-size:13px;flex-wrap:wrap;justify-content:center}.kc-hero.ph .kc-acts{margin-top:14px}
  .kc-hero.ph .kc-btn{height:38px;font-size:14px;padding:0 14px}.kc-hero.ph .kc-btn.back{padding-left:4px}.kc-hero.ph .kc-btn.back img{width:28px;height:28px}
  .kc-cap{margin:8px 0 0;font-size:13px;font-weight:700;color:var(--text-secondary)}
  .kc-notes-r{margin-top:34px;display:grid;grid-template-columns:repeat(3,1fr);gap:20px;max-width:1700px}
  .kc-notes-r div{background:#fff;border-radius:20px;padding:16px 18px;box-shadow:0 0 0 1px var(--card-hairline)}
  .kc-notes-r b{display:block;font-size:15px;margin-bottom:4px}.kc-notes-r p{margin:0;font-size:14px;line-height:1.5;color:var(--text-secondary)}
  </style>`;

  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = "left:0;top:0;width:1700px";
  b.innerHTML = `${css}<header class="bhd"><span class="bnum">KC</span><div><h2>Kalender › Agenda · eten linksboven, afspraak tikken <span class="tag">uitwerking van KA · 1 · v2 · 12 nov</span></h2><p>Linksboven staat enkel het eten van vandaag, niets uit de agenda. Het eten staat ook als eerste tegel in «Komende afspraken» (gekozen = blauwe ring). Tik je op een afspraak, dan komt die linksboven groot in beeld; de eetegel of «Eten van vandaag» zet het eten terug. Hele dag zoals nu: één tegel per dag met «Hele dag» en de afspraken eronder.</p><p class="uses">Bouwt op: CalendarDayVisual (gerechtfoto), TodoPostit, PhotoEventTile, AllDayTile, RouteButton, Button</p></div></header>
    <div class="kc-st"><div class="ag-opthd"><span class="ag-key">A</span><div><h3>Standaard · het eten van vandaag</h3><p>Bij openen is de eetegel gekozen en staat het gerecht linksboven met «Recept bekijken». De band bovenaan kleurt mee met het gerecht. Op de gsm komt de rij afspraken meteen onder het eten, de post-its daaronder.</p></div></div>
      <div class="kc-row"><div>${desk("food")}<p class="kc-cap">Tablet / computer · 1200 px</p></div><div>${phone("food")}<p class="kc-cap">Gsm · 390 px</p></div></div></div>
    <div class="kc-st"><div class="ag-opthd"><span class="ag-key">B</span><div><h3>Getikt op «Date night»</h3><p>De afspraak schuift linksboven in de plaats van het eten: foto (afgeronde hoeken i.p.v. rond, zodat je ziet dat het geen gerecht is), dag en uur, titel, tijd en plaats, «Route» en «Eten van vandaag» om terug te gaan. De tegel krijgt de blauwe ring en de band kleurt mee met de agendakleur. Op de gsm schuift de pagina naar boven zodat je het detail ziet.</p></div></div>
      <div class="kc-row"><div>${desk("event")}<p class="kc-cap">Tablet / computer · 1200 px</p></div><div>${phone("event")}<p class="kc-cap">Gsm · 390 px</p></div></div></div>
    <div class="kc-notes-r">
      <div><b>Hele dag</b><p>Zoals nu (AllDayTile): één tegel per dag, op de plaats van die dag in de rij, met het daglabel, «Hele dag» en elke afspraak met haar kleurstreepje. Tik = de afspraken van die dag linksboven.</p></div>
      <div><b>Geen gerecht vandaag</b><p>Linksboven een gestippeld leeg bord met «Nog niets gepland» en «Kies een gerecht»; de eetegel toont hetzelfde lege bord.</p></div>
      <div><b>Terug naar het eten</b><p>Tik op de eetegel of op «Eten van vandaag». Na een paar minuten zonder aanraking (en bij always-on) springt de pagina vanzelf terug naar het eten.</p></div>
    </div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const topY = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${topY - 240 - b.offsetHeight}px`;
})();
