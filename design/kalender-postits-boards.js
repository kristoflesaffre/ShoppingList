/* Kalender › Agenda · to-do's als post-its (4 voorstellen) + always-on: eten en agenda op één lijn · 12 nov.
   Gebruikt window.KA_MEALS / KA_IMG (kalender-aod-meals.js: echte receptfoto's en afspraakbeelden) en IMG (canvas). */
(() => {
  const world = document.getElementById("world");
  const M = window.KA_MEALS;
  const I = { ...(window.IMG || {}), ...window.KA_IMG };
  const rgba = ([r, g, b], a = 1) => `rgba(${r},${g},${b},${a})`;
  const deep = ([r, g, b], k = 0.5) => `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
  const tint = (c, k) => rgba(c.map((v) => Math.round(255 - (255 - v) * k)));
  const lt = (c, a) => rgba(c.map((v) => Math.round(255 - (255 - v) * 0.16)), a);
  const ORANGE = [224, 140, 47], BLUE = [79, 85, 241], ROSE = [229, 97, 138], GREEN = [47, 163, 107], TEAL = [40, 150, 170], WINE = [150, 40, 72];
  const PIN = '<svg width="12" height="12" viewBox="0 0 24 24"><path d="M12 2.5a7.2 7.2 0 0 0-7.2 7.2c0 5.1 6 11.1 6.6 11.7a.85.85 0 0 0 1.2 0c.6-.6 6.6-6.6 6.6-11.7A7.2 7.2 0 0 0 12 2.5z" fill="currentColor"/><circle cx="12" cy="9.7" r="2.6" fill="#fff"/></svg>';
  const CHEV = (d = "right", s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="${d === "left" ? "M10 3.5 5.5 8l4.5 4.5" : "M6 3.5 10.5 8 6 12.5"}"/></svg>`;
  const SNOW = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 2v20M4.2 6.5l15.6 9M4.2 17.5l15.6-9M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5"/></svg>';
  const PLUS = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';

  /* ---------- data: do 12 nov, 15:10 ---------- */
  const DAYS = [
    { wd: "DO", n: 12, label: "Vandaag", long: "Donderdag 12 november", meal: M.m0 },
    { wd: "VR", n: 13, label: "Morgen", long: "Vrijdag 13 november", meal: M.m1, side: "hamburger · kroketjes" },
    { wd: "ZA", n: 14, label: "Zaterdag", long: "Zaterdag 14 november", meal: M.m3 },
    { wd: "ZO", n: 15, label: "Zondag", long: "Zondag 15 november", meal: M.m4, frozen: true },
    { wd: "MA", n: 16, label: "Maandag", long: "Maandag 16 november", meal: M.m8 },
    { wd: "DI", n: 17, label: "Dinsdag", long: "Dinsdag 17 november", meal: M.m9 },
    { wd: "WO", n: 18, label: "Woensdag", long: "Woensdag 18 november", meal: null },
  ];
  const EV = [
    { d: 0, t: "16:30", e: "17:15", title: "Kinesist Kristof", loc: "Kine Kontich", c: TEAL, ph: "ag_kinesist" },
    { d: 0, t: "20:00", e: "20:30", title: "Oudercontact Noë", loc: "Sint-Ritaschool", c: ORANGE, ph: "ag_oudercontact" },
    { d: 1, all: true, title: "Soepdag", sub: "Smartschool", c: BLUE, ph: "ag_soepdag" },
    { d: 1, t: "19:30", e: "23:00", title: "Date night", loc: "Wok Dynasty", c: ROSE, ph: "ag_datenight" },
    { d: 2, t: "10:00", e: "11:30", title: "Sjotter Noë", loc: "'t Klaverke", c: WINE, ph: "ag_sjotter" },
    { d: 3, t: "12:00", e: "16:00", title: "Bij oma en opa", c: GREEN, ph: "ag_oma_opa" },
    { d: 4, t: "08:40", e: "09:10", title: "Tandarts", loc: "Mortsel", c: BLUE, ph: "ag_tandarts" },
    { d: 5, all: true, title: "Huub verjaardag", sub: "wordt 41", c: ORANGE, ph: "ag_verjaardag" },
  ];
  // To-do's (Todoist): te laat · vandaag · ontdooien · later in de week.
  const TD = [
    { id: 1, d: -1, kind: "late", due: "Gisteren", text: "Cadeau voor Huub kopen" },
    { id: 2, d: 0, kind: "today", due: "Vandaag", text: "Zwemzak Noë klaarleggen" },
    { id: 3, d: 0, kind: "today", due: "Vandaag", text: "Cyclus-app invullen", img: "tk_cyclus_app" },
    { id: 4, d: 2, kind: "thaw", due: "Za 14", text: "Lasagne uit de diepvries halen", thaw: M.m4.img },
    { id: 5, d: 2, kind: "later", due: "Za 14", text: "Winterbanden laten steken" },
    { id: 6, d: 4, kind: "later", due: "Ma 16", text: "Juf mailen over schoolreis" },
  ];
  const nowTd = TD.filter((t) => t.d <= 0);
  const laterTd = TD.filter((t) => t.d > 0);

  /* ---------- bouwstenen ---------- */
  const TILT = [-3, 2.4, -1.4, 3.2, -2.2, 1.6];
  const TAPE = [-4, 3, -2, 5, -3, 2];
  const postit = (t, size = 150, i = 0, extra = "") => {
    const small = size < 140;
    const bg = t.kind === "late" ? "pi-late" : t.kind === "thaw" ? "pi-thaw" : "pi-yel";
    const dueCls = t.kind === "late" ? "late" : t.kind === "thaw" ? "thaw" : t.kind === "today" ? "today" : "";
    const img = t.img ? `<img class="pi-img" src="${I[t.img]}" style="width:${Math.round(size * 0.42)}px;right:${-Math.round(size * 0.08)}px;bottom:${-Math.round(size * 0.14)}px" alt="">` : "";
    const thaw = t.thaw ? `<img class="pi-thawimg" src="${t.thaw}" style="width:${Math.round(size * 0.5)}px;height:${Math.round(size * 0.5)}px;right:${-Math.round(size * 0.08)}px;bottom:${-Math.round(size * 0.13)}px" alt="">` : "";
    return `<div class="pi ${small ? "sm" : ""} ${extra}" style="width:${size}px;height:${size}px;transform:rotate(${TILT[(t.id + i) % TILT.length]}deg)">
        <div class="pi-paper ${bg}">${thaw}${img}<span class="pi-top"><i class="pi-chk"></i><b class="pi-due ${dueCls}">${t.kind === "thaw" ? SNOW : ""}${t.due}</b></span><span class="pi-tx">${t.text}</span></div>
        <span class="pi-tape" style="transform:translateX(-50%) rotate(${TAPE[(t.id + i) % TAPE.length]}deg)"></span></div>`;
  };
  const evTile = (ev, w = 220, h = 230, next = false) => {
    const d = DAYS[ev.d];
    const time = ev.all ? "Hele dag" : ev.t;
    return `<div class="tile" style="width:${w}px;height:${h}px;--c:${rgba(ev.c)}">
        <span class="tile-ph"><img src="${I[ev.ph]}" alt=""><span style="background:linear-gradient(180deg, ${lt(ev.c, 0)} 34%, ${lt(ev.c, 0.86)} 68%, ${lt(ev.c, 0.97)} 100%)"></span></span>
        ${next ? `<span class="tile-next" style="background:${rgba(ev.c)}">Volgende</span>` : ""}
        <span class="tile-time"><em style="color:${deep(ev.c, 0.55)}">${d.label === "Vandaag" || d.label === "Morgen" ? d.label.toUpperCase() : `${d.wd} ${d.n}`}</em><b style="color:${deep(ev.c, 0.6)}">${time}</b></span>
        <span class="tile-bt"><b style="color:${deep(ev.c, 0.35)}">${ev.title}</b><em style="color:${deep(ev.c, 0.5)}">${ev.loc ? PIN + ev.loc : ev.sub || (ev.e ? `tot ${ev.e}` : "")}</em></span></div>`;
  };
  const head = (phone) => `<div class="kh ${phone ? "ph" : ""}"><span class="kh-back">${CHEV("left", 18)}</span><b>Kalender</b><span class="seg"><i>Eten</i><i class="on">Agenda</i></span></div>`;
  const hero = (phone, compact = false) => {
    const ev = EV[0];
    const ill = compact ? 200 : phone ? 210 : 280;
    return `<div class="hero ${phone ? "ph" : ""} ${compact ? "compact" : ""}">
        <span class="hero-ill" style="width:${ill}px;height:${ill}px"><img src="${I.kalender}" alt=""><b>16:30</b></span>
        <span class="hero-tx"><i class="hero-pill">Volgende afspraak</i><em>Vandaag · over 1 u 20 min</em><h3>${ev.title}</h3><p>${PIN} 16:30 – 17:15 · ${ev.loc}</p></span></div>`;
  };
  const laneHd = (t = "Komende afspraken", phone = false) => `<div class="lh"><b>${t}</b>${phone ? `<em>${CHEV("left", 14)}Eerder</em>` : `<span class="lh-arr"><i>${CHEV("left")}</i><i>${CHEV("right")}</i></span>`}</div>`;
  const lane = (phone, items) => `<div class="lane ${phone ? "ph" : ""}">${items}</div>`;
  const evTiles = (phone, from = 0) => EV.slice(from).map((e, i) => evTile(e, phone ? 150 : 220, phone ? 190 : 230, i === 0 && from === 0)).join("");
  const todoHd = (phone, label = "To do") => `<div class="lh td"><b>${label} <span class="cnt">${nowTd.length}</span></b><em class="link">${phone ? "" : "Alles in Todoist "}${CHEV("right", 14)}</em></div>`;
  const desk = (inner, band = "#cfe6ea") => `<div class="dsk"><span class="band" style="background:linear-gradient(180deg, ${band} 0%, #eef1f6 55%, #f2f3f7 100%)"></span><div class="dsk-in">${head(false)}${inner}</div></div>`;
  const phone = (inner, band = "#cfe6ea") => `<div class="phn"><span class="band" style="background:linear-gradient(180deg, ${band} 0%, #eef1f6 60%, #f2f3f7 100%)"></span><span class="sb"><b>15:10</b><i></i></span><div class="phn-in">${head(true)}${inner}</div><span class="tabbar">${["Lijstjes", "Kaarten", "Kalender", "Recepten"].map((n) => `<i class="${n === "Kalender" ? "on" : ""}">${n}</i>`).join("")}</span></div>`;

  /* ---------- 1 · Prikbord naast de volgende afspraak ---------- */
  const v1d = desk(`<div class="v1-top">${hero(false, true)}<div class="v1-board">${todoHd(false)}<div class="v1-notes">${nowTd.map((t, i) => postit(t, 148, i)).join("")}</div><p class="later">+ ${laterTd.length} later deze week</p></div></div>
      ${laneHd()}${lane(false, evTiles(false))}`);
  const v1p = phone(`${hero(true)}${todoHd(true)}<div class="lane ph notes">${nowTd.map((t, i) => postit(t, 132, i)).join("")}<span class="later-tile">+ ${laterTd.length}<br>later</span></div>${laneHd("Komende afspraken", true)}${lane(true, evTiles(true))}`);

  /* ---------- 2 · Post-its tussen de afspraken (op hun dag) ---------- */
  const mixed = (ph) => {
    const out = [];
    out.push(`<span class="daysep late">Te laat</span>`, postit(TD[0], ph ? 150 : 156, 0, "inlane"));
    for (let d = 0; d < 6; d++) {
      const evs = EV.filter((e) => e.d === d), tds = TD.filter((t) => t.d === d);
      if (!evs.length && !tds.length) continue;
      out.push(`<span class="daysep">${d === 0 ? "Vandaag" : d === 1 ? "Morgen" : `${DAYS[d].wd} ${DAYS[d].n}`}</span>`);
      evs.forEach((e) => out.push(evTile(e, ph ? 150 : 190, ph ? 190 : 210, e === EV[0])));
      tds.forEach((t, i) => out.push(postit(t, ph ? 150 : 156, i, "inlane")));
    }
    return out.join("");
  };
  const v2d = desk(`${hero(false)}${laneHd("Afspraken en to do's")}<div class="lane tall">${mixed(false)}</div>`);
  const v2p = phone(`${hero(true)}${laneHd("Afspraken en to do's", true)}<div class="lane ph tall">${mixed(true)}</div>`);

  /* ---------- 3 · Kurken strook ---------- */
  const cork = (ph) => `<div class="cork ${ph ? "ph" : ""}"><span class="cork-hd"><b>To do</b><span class="cnt w">${TD.length}</span><span class="cork-add">${PLUS}${ph ? "" : "Taak"}</span></span>
      <div class="cork-row">${TD.map((t, i) => postit(t, ph ? 128 : 150, i)).join("")}</div></div>`;
  const v3d = desk(`${hero(false, true)}${cork(false)}${laneHd()}${lane(false, evTiles(false))}`);
  const v3p = phone(`${hero(true)}${cork(true)}${laneHd("Komende afspraken", true)}${lane(true, evTiles(true))}`);

  /* ---------- 4 · Week in kolommen ---------- */
  const mini = (e) => `<span class="wk-ev" style="background:${tint(e.c, 0.13)}"><img src="${I[e.ph]}" alt=""><span style="background:linear-gradient(90deg, ${tint(e.c, 0.13)} 45%, ${rgba(e.c.map((v) => Math.round(255 - (255 - v) * 0.13)), 0)} 95%)"></span><b style="color:${deep(e.c, 0.55)}">${e.all ? "Hele dag" : e.t}</b><em style="color:${deep(e.c, 0.33)}">${e.title}</em></span>`;
  const week = (ph) => `<div class="wk ${ph ? "ph" : ""}">${DAYS.map((d, i) => {
      const evs = EV.filter((e) => e.d === i), tds = TD.filter((t) => (i === 0 ? t.d <= 0 : t.d === i));
      return `<div class="wk-col ${i === 0 ? "today" : ""}"><span class="wk-hd"><em>${d.wd}</em><b>${d.n}</b>${i < 2 ? `<i>${d.label}</i>` : ""}</span>
        <span class="wk-evs">${evs.map(mini).join("") || `<span class="wk-none">Geen afspraken</span>`}</span>
        <span class="wk-notes">${tds.map((t, j) => postit(t, ph ? 88 : 120, j, "wkn")).join("")}</span></div>`;
    }).join("")}</div>`;
  const v4d = desk(`${hero(false, true)}<div class="lh"><b>Deze week</b><span class="lh-arr"><i>${CHEV("left")}</i><i>${CHEV("right")}</i></span></div>${week(false)}`);
  const v4p = phone(`<div class="v4p-sum"><b>Volgende: Kinesist Kristof</b><em>Vandaag 16:30 · over 1 u 20 min</em></div>${week(true)}`);

  const V = [
    { key: "1", name: "Prikbord naast de volgende afspraak", why: "De held wordt iets kleiner en schuift naar links; rechts ernaast hangen de to-do's van vandaag en wat te laat is, los geprikt zoals op de startpagina. Wat later moet, is één regel «+ 3 later deze week». Op de gsm een veegrij post-its tussen de held en de afspraken.", d: v1d, p: v1p },
    { key: "2", name: "Post-its tussen de afspraken", why: "Eén rij voor alles: per dag eerst de afspraken, dan de to-do's van die dag als post-it, met een klein daglabel. Wat te laat is, staat vooraan. Verder in de rij staan «Lasagne ontdooien» en «Winterbanden» bij zaterdag, naast de sjotter.", d: v2d, p: v2p },
    { key: "3", name: "Kurken strook", why: "Tussen de held en de afspraken één kurken strook over de volle breedte met alle open to-do's (ook later in de week) en een «+ Taak»-speld. Herkenbaar van het kurken bord op de startpagina; de afspraken blijven zoals nu.", d: v3d, p: v3p },
    { key: "4", name: "Week in kolommen", why: "De rij tegels wordt een week van zeven kolommen: per dag de afspraken als smalle fotostrook en onderaan de post-its die op die dag vallen (vandaag ook wat te laat is). Op de gsm onder elkaar, post-its rechts naast de afspraken.", d: v4d, p: v4p },
  ];

  window.KA = { postit, evTile, head, CHEV, PIN, SNOW, PLUS, rgba, deep, tint, lt, I, M, TD, DAYS, ORANGE, BLUE, ROSE, GREEN, TEAL, WINE };

  /* ---------- Always-on: eten en agenda op één lijn ---------- */
  const evLine = (e) => `<span class="ao-ev"><i style="background:${rgba(e.c)}"></i><b>${e.all ? "Hele dag" : e.t}</b><em>${e.title}</em></span>`;
  const aoDay = (d, i) => {
    const evs = EV.filter((e) => e.d === i), tds = TD.filter((t) => t.d === i);
    return `<div class="ao-day"><span class="ao-dhd"><em>${d.wd}</em><b>${d.n}</b>${i === 1 ? "<i>Morgen</i>" : ""}</span>
      ${d.meal ? `<span class="ao-plate tap"><img src="${d.meal.img}" alt="">${d.frozen ? `<i class="ao-frz">${SNOW}</i>` : ""}</span><b class="ao-meal">${d.meal.name.replace("Zachte Kip met Peultjes in Pittige Knoflooksaus", "Kip met peultjes")}</b>${d.side ? `<em class="ao-side">+ ${d.side}</em>` : ""}` : `<span class="ao-plate empty"></span><b class="ao-meal dim">Nog niets</b>`}
      <span class="ao-evs">${evs.map(evLine).join("")}</span>
      ${tds.length ? `<span class="ao-notes">${tds.map((t, j) => postit(t, 76, j, "aon")).join("")}</span>` : ""}</div>`;
  };
  const aoScreen = (overlay = "") => `<div class="ao ${overlay ? "has-ov" : ""}">
      <div class="ao-in">
        <div class="ao-top"><span class="ao-clock">15<i>:</i>10</span><span class="ao-date"><b>Donderdag 12 november</b><em>Kontich · 9° · bewolkt</em></span></div>
        <div class="ao-line">
          <div class="ao-today">
            <span class="ao-lbl">VANDAAG ETEN WE</span>
            <div class="ao-hero"><span class="ao-big"><img src="${DAYS[0].meal.img}" alt=""></span>
              <span class="ao-htx"><b>${DAYS[0].meal.name}</b><em>4 personen · ${DAYS[0].meal.ing.length} ingrediënten</em>
                <span class="ao-tev">${EV.filter((e) => e.d === 0).map((e) => `<span class="ao-trow"><img src="${I[e.ph]}" alt=""><span><b>${e.t}</b><em>${e.title}</em></span></span>`).join("")}</span>
              </span></div>
            <div class="ao-tnotes">${nowTd.map((t, j) => postit(t, 100, j, "aon")).join("")}</div>
          </div>
          <div class="ao-next"><span class="ao-lbl">KOMENDE DAGEN</span><div class="ao-days">${DAYS.slice(1, 6).map((d, i) => aoDay(d, i + 1)).join("")}</div></div>
        </div>
      </div>${overlay}</div>`;
  const sheet = () => {
    const d = DAYS[3], m = d.meal;
    return `<div class="ao-sheet"><span class="ao-sx">✕</span><span class="ao-sph"><img src="${m.img}" alt=""></span>
      <div class="ao-sbody"><em class="ao-slbl">${SNOW} ZONDAG 15 NOV · UIT DE DIEPVRIES</em><h3>${m.name}</h3><p>4 personen · ontdooien vanaf zaterdag</p>
        <div class="ao-ing">${m.ing.slice(0, 8).map((x) => `<span>${x}</span>`).join("")}</div>
        <div class="ao-sday"><b>Ook zondag</b>${EV.filter((e) => e.d === 3).map(evLine).join("")}</div>
        <div class="ao-sbtn"><span class="ghost">${CHEV("left", 14)}Za · Tikka masala</span><span class="pri">Open recept</span><span class="ghost">Ma · Kip met peultjes${CHEV("right", 14)}</span></div></div></div>`;
  };

  const css = `<style>
  .ka-wrap{display:grid;grid-template-columns:repeat(2,1640px);gap:80px 72px;margin-top:28px}
  .ka-opt{display:flex;flex-direction:column;gap:16px}.ka-opt .ag-opthd p{max-width:1400px}
  .ka-pair{display:flex;gap:44px;align-items:flex-start}
  .ka-cap{margin:8px 0 0;font-size:13px;font-weight:700;color:var(--text-secondary)}
  .ka-pair *{box-sizing:border-box}
  .dsk{position:relative;width:1200px;min-height:640px;padding-bottom:40px;border-radius:26px;overflow:hidden;background:#f2f3f7;box-shadow:0 30px 60px -36px rgba(16,17,48,.45),0 0 0 1px rgba(16,17,48,.06);font-family:inherit;color:#16181f}
  .dsk .band,.phn .band{position:absolute;left:0;right:0;top:0;height:620px}
  .dsk-in{position:relative;padding:36px 56px 0}
  .phn{position:relative;width:390px;height:844px;border-radius:46px;overflow:hidden;background:#f2f3f7;box-shadow:0 30px 60px -36px rgba(16,17,48,.5),0 0 0 9px #16181f,0 0 0 10px #3a3d48;color:#16181f;flex:none;margin:10px}
  .phn-in{position:relative;padding:0 16px}
  .sb{position:relative;display:flex;justify-content:space-between;align-items:center;height:48px;padding:0 30px;font-size:15px}
  .sb i{width:110px;height:30px;border-radius:20px;background:#000;position:absolute;left:50%;top:10px;transform:translateX(-50%)}
  .tabbar{position:absolute;left:14px;right:14px;bottom:22px;height:62px;border-radius:999px;background:rgba(255,255,255,.92);box-shadow:0 10px 30px -12px rgba(16,17,48,.35);display:flex;justify-content:space-around;align-items:center;z-index:5}
  .tabbar i{font-style:normal;font-size:11.5px;font-weight:700;color:#8a8f9e}.tabbar i.on{color:#4f55f1}
  .kh{display:flex;align-items:center;gap:14px}.kh.ph{height:56px;gap:10px}
  .kh-back{width:36px;height:36px;border-radius:50%;background:#fff;display:grid;place-items:center;box-shadow:0 1px 2px rgba(16,17,48,.06)}
  .kh b{flex:1;font-size:22px;font-weight:800}
  .seg{display:flex;padding:3px;border-radius:13px;background:rgba(16,17,48,.07)}.seg i{font-style:normal;height:30px;padding:0 14px;display:grid;place-items:center;font-size:13.5px;font-weight:700;color:#5b6070;border-radius:10px}.seg i.on{background:#fff;color:#16181f;box-shadow:0 1px 3px rgba(16,17,48,.14)}
  /* held */
  .hero{display:flex;align-items:center;gap:44px;padding:18px 0 0 24px}
  .hero.ph{flex-direction:column;gap:6px;padding:4px 0 0;text-align:center}
  .hero.compact:not(.ph){gap:28px;padding-left:4px}
  .hero-ill{position:relative;flex:none}.hero-ill img{width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 24px 30px rgba(120,60,0,.25))}
  .hero-ill b{position:absolute;left:50%;bottom:12%;transform:translateX(-50%);background:#fff;border-radius:999px;padding:5px 14px;font-size:22px;font-weight:800;box-shadow:0 8px 18px -10px rgba(0,0,0,.35)}
  .hero.ph .hero-ill b{font-size:17px}
  .hero-tx{display:flex;flex-direction:column;align-items:flex-start}.hero.ph .hero-tx{align-items:center}
  .hero-pill{font-style:normal;height:24px;padding:0 10px;border-radius:999px;background:#fff;color:#4f55f1;font-size:11.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;display:inline-flex;align-items:center;margin-bottom:8px;box-shadow:0 2px 8px -3px rgba(16,17,48,.25)}
  .hero-tx em{font-style:normal;font-size:14px;font-weight:700;color:#5b6070}
  .hero-tx h3{margin:8px 0 0;font-size:46px;line-height:1.04;font-weight:800;letter-spacing:-.03em}
  .hero.compact .hero-tx h3{font-size:38px}.hero.ph .hero-tx h3{font-size:28px;margin-top:6px}
  .hero-tx p{margin:10px 0 0;font-size:15px;font-weight:600;color:#5b6070;display:flex;gap:6px;align-items:center}.hero.ph .hero-tx p{font-size:13.5px;margin-top:6px}
  /* rijen */
  .lh{display:flex;align-items:center;justify-content:space-between;margin:34px 0 8px}
  .phn .lh{margin:22px 0 4px}
  .lh b{font-size:19px;font-weight:700;display:inline-flex;align-items:center;gap:8px}.lh em{font-style:normal;font-size:13px;font-weight:700;color:#4f55f1;display:inline-flex;align-items:center;gap:2px}
  .lh-arr{display:flex;gap:8px}.lh-arr i{width:36px;height:36px;border-radius:50%;background:#fff;display:grid;place-items:center;color:#16181f}
  .cnt{min-width:24px;height:24px;padding:0 7px;border-radius:999px;background:#e6e7fd;color:#4f55f1;font-size:13px;font-weight:800;display:inline-grid;place-items:center}
  .cnt.w{background:rgba(255,255,255,.85);color:#6b4a1d}
  .lane{display:flex;gap:16px;overflow:hidden;padding:14px 0 16px;margin-right:-56px;align-items:center}
  .lane.ph{gap:12px;margin-right:-16px}
  .lane.tall{align-items:center;min-height:270px}.lane.ph.tall{min-height:220px}
  .lane.notes{padding:18px 0 8px;gap:14px;align-items:center}
  .tile{position:relative;flex:none;border-radius:26px;overflow:hidden;background:#fff;box-shadow:0 1px 2px rgba(16,17,48,.05)}
  .tile-ph{position:absolute;inset:0}.tile-ph img{width:100%;height:100%;object-fit:cover;filter:brightness(1.15) contrast(.85) saturate(.85)}.tile-ph span{position:absolute;inset:0}
  .tile-time{position:absolute;left:12px;top:12px;height:30px;padding:0 11px;border-radius:999px;background:#fff;display:inline-flex;align-items:center;gap:7px;box-shadow:0 2px 8px -3px rgba(16,17,48,.3)}
  .tile-time em{font-style:normal;font-size:10.5px;font-weight:800;letter-spacing:.05em}.tile-time b{font-size:14.5px;font-weight:800}
  .phn .tile-time{height:26px;padding:0 8px;gap:5px}.phn .tile-time em{display:none}.phn .tile-time b{font-size:13px}
  .tile-next{position:absolute;right:12px;top:14px;height:22px;padding:0 9px;border-radius:999px;color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center}
  .phn .tile-next{display:none}
  .tile-bt{position:absolute;left:16px;right:16px;bottom:14px;display:flex;flex-direction:column;gap:3px}
  .tile-bt b{font-size:16px;line-height:20px;font-weight:800}.tile-bt em{font-style:normal;font-size:12.5px;font-weight:600;display:flex;gap:4px;align-items:center;white-space:nowrap;overflow:hidden}
  .phn .tile-bt{left:12px;right:12px;bottom:11px}.phn .tile-bt b{font-size:14.5px;line-height:18px}.phn .tile-bt em{font-size:11.5px}
  /* post-it */
  .pi{position:relative;flex:none}
  .pi-paper{position:absolute;inset:0;overflow:hidden;padding:16px 14px 14px;display:flex;flex-direction:column;gap:9px;box-shadow:0 1px 1.5px rgba(0,0,0,.16),0 8px 14px -6px rgba(40,25,5,.45)}
  .pi.sm .pi-paper{padding:13px 11px 11px;gap:7px}
  .pi-yel{background:linear-gradient(170deg,#f3f1b4,#eceaa6)}.pi-late{background:linear-gradient(170deg,#f9d2cb,#f2c2b9)}.pi-thaw{background:linear-gradient(170deg,#dceaff,#c6dbfa)}
  .pi-top{position:relative;display:flex;justify-content:space-between;align-items:center;min-height:21px}
  .pi-chk{width:20px;height:20px;border-radius:50%;border:2px solid rgba(43,42,16,.45);flex:none}
  .pi-late .pi-chk{border-color:rgba(74,20,16,.45)}.pi-thaw .pi-chk{border-color:rgba(16,40,79,.4)}
  .pi-due{font-size:12px;font-weight:800;color:#6f6a12;display:inline-flex;gap:3px;align-items:center}.pi-due.today{color:#1f7a34}.pi-due.late{color:#b42318}.pi-due.thaw{color:#1c4fa3}
  .pi-tx{position:relative;font-size:13.5px;line-height:18px;font-weight:700;color:#2b2a10;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
  .pi.sm .pi-tx{font-size:12.5px;line-height:16.5px}
  .pi-late .pi-tx{color:#4a1410}.pi-thaw .pi-tx{color:#10284f}
  .pi-img{position:absolute;z-index:1;transform:rotate(45deg);filter:drop-shadow(0 8px 10px rgba(16,17,48,.25))}
  .pi-thawimg{position:absolute;border-radius:50%;object-fit:cover;filter:drop-shadow(0 8px 10px rgba(16,17,48,.28))}
  .pi-tape{position:absolute;top:-10px;left:50%;width:60px;height:20px;z-index:1;background:linear-gradient(180deg,rgba(255,255,255,.66),rgba(255,255,255,.48));box-shadow:0 1px 2px rgba(0,0,0,.12)}
  .pi.sm .pi-tape{width:48px;height:17px;top:-8px}
  /* 1 */
  .v1-top{display:flex;align-items:center;justify-content:space-between;gap:20px}
  .v1-board{width:520px;flex:none}.v1-board .lh{margin:0 0 6px}
  .v1-notes{display:flex;gap:18px;padding:16px 4px 4px}
  .later{margin:14px 0 0 4px;font-size:13px;font-weight:700;color:#5b6070}
  .later-tile{flex:none;width:72px;height:120px;border-radius:20px;border:1.6px dashed rgba(16,17,48,.18);display:grid;place-items:center;text-align:center;font-size:12.5px;font-weight:800;color:#5b6070}
  .lh.td{margin-top:18px}
  /* 2 */
  .daysep{flex:none;align-self:stretch;opacity:.8;writing-mode:vertical-rl;transform:rotate(180deg);font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#5b6070;display:flex;align-items:center;justify-content:center;border-left:1.5px solid rgba(16,17,48,.12);padding-left:8px;margin-left:6px}
  .daysep.late{color:#b42318;border:0;margin-left:0}
  .pi.inlane{margin:0 6px}
  /* 3 */
  .cork{position:relative;margin-top:30px;border-radius:20px;padding:16px 20px 26px;background:#c99a63 radial-gradient(rgba(90,55,20,.28) 1px,transparent 1.6px) 0 0/7px 7px;box-shadow:inset 0 0 0 6px #b0814d,inset 0 0 0 7px rgba(0,0,0,.08),0 1px 2px rgba(16,17,48,.06)}
  .cork.ph{margin:22px -4px 0;padding:14px 14px 20px}
  .cork-hd{display:flex;align-items:center;gap:8px;color:#fff;margin-bottom:6px}.cork-hd b{font-size:18px;font-weight:800;text-shadow:0 1px 3px rgba(60,30,0,.4)}
  .cork-add{margin-left:auto;height:32px;padding:0 13px;border-radius:999px;background:rgba(255,255,255,.88);color:#6b4a1d;font-size:13px;font-weight:800;display:inline-flex;align-items:center;gap:5px}
  .cork.ph .cork-add{width:32px;padding:0;justify-content:center}
  .cork-row{display:flex;gap:22px;padding:18px 6px 0;overflow:hidden}.cork.ph .cork-row{gap:14px;margin-right:-14px}
  /* 4 */
  .wk{display:grid;grid-template-columns:repeat(7,1fr);gap:10px;padding-top:6px}
  .wk-col{background:rgba(255,255,255,.55);border-radius:20px;padding:12px 10px 14px;min-height:420px;display:flex;flex-direction:column;gap:10px;box-shadow:inset 0 0 0 1px rgba(16,17,48,.05)}
  .wk-col.today{background:#fff;box-shadow:0 0 0 2px #4f55f1}
  .wk-hd{display:flex;align-items:baseline;gap:6px}.wk-hd em{font-style:normal;font-size:11px;font-weight:800;letter-spacing:.06em;color:#5b6070}.wk-hd b{font-size:24px;font-weight:800}.wk-hd i{font-style:normal;margin-left:auto;font-size:11px;font-weight:800;color:#4f55f1}
  .wk-evs{display:flex;flex-direction:column;gap:8px}
  .wk-ev{position:relative;display:flex;flex-direction:column;justify-content:flex-end;height:78px;border-radius:14px;overflow:hidden;padding:8px 9px}
  .wk-ev img{position:absolute;right:0;top:0;height:100%;width:70%;object-fit:cover}.wk-ev span{position:absolute;inset:0}
  .wk-ev b,.wk-ev em{position:relative}.wk-ev b{font-size:12px;font-weight:800}.wk-ev em{font-style:normal;font-size:12.5px;line-height:15px;font-weight:800}
  .wk-none{font-size:12px;font-weight:600;color:#9a9eac;padding:6px 2px}
  .wk-notes{margin-top:auto;display:flex;flex-direction:column;align-items:center;gap:12px;padding-top:8px}
  .pi.wkn .pi-tx{font-size:11.5px;line-height:15px}.pi.wkn .pi-paper{padding:12px 9px 9px;gap:5px}.pi.wkn .pi-due{font-size:10.5px}.pi.wkn .pi-chk{width:16px;height:16px}.pi.wkn .pi-tape{width:40px;height:14px;top:-7px}
  .wk.ph{grid-template-columns:1fr;gap:8px;padding-bottom:120px}
  .wk.ph .wk-col{min-height:0;display:grid;grid-template-columns:44px 1fr auto;align-items:start;gap:10px;padding:10px}
  .wk.ph .wk-hd{flex-direction:column;align-items:center;gap:0}.wk.ph .wk-hd b{font-size:20px}.wk.ph .wk-hd i{display:none}
  .wk.ph .wk-ev{height:52px}
  .wk.ph .wk-col{grid-template-columns:44px 1fr}.wk.ph .wk-notes{grid-column:2/-1;margin:0;padding:10px 0 2px 4px;flex-direction:row;gap:14px}.wk.ph .wk-notes:empty{display:none}
  .wk.ph .wk-col:nth-child(n+5){display:none}
  .v4p-sum{margin:6px 0 12px;padding:12px 14px;border-radius:20px;background:#fff;display:flex;flex-direction:column}.v4p-sum b{font-size:16px;font-weight:800}.v4p-sum em{font-style:normal;font-size:13px;font-weight:600;color:#5b6070}

  /* ---------- always-on ---------- */
  .ao-wrap{display:flex;gap:56px;margin-top:28px;align-items:flex-start}
  .ao-col{display:flex;flex-direction:column;gap:14px}.ao-col .ag-opthd p{max-width:1140px}
  .ao{position:relative;width:1280px;height:860px;border-radius:30px;overflow:hidden;background:#000;color:rgba(255,255,255,.88);box-shadow:0 30px 60px -36px rgba(0,0,0,.7),0 0 0 10px #1b1c22}
  .ao *{box-sizing:border-box}
  .ao-in{position:absolute;inset:0;padding:38px 48px}
  .ao.has-ov .ao-in{filter:blur(10px) brightness(.45)}
  .ao-top{display:flex;align-items:flex-end;gap:22px}
  .ao-clock{font-size:76px;line-height:.9;font-weight:300;letter-spacing:-.03em;color:rgba(255,255,255,.92);font-variant-numeric:tabular-nums}.ao-clock i{font-style:normal;opacity:.6}
  .ao-date{display:flex;flex-direction:column;padding-bottom:6px}.ao-date b{font-size:20px;font-weight:700}.ao-date em{font-style:normal;font-size:14px;color:rgba(255,255,255,.5);font-weight:600;margin-top:2px}
  .ao-line{display:flex;gap:28px;margin-top:34px;height:650px}
  .ao-lbl{display:block;font-size:12px;font-weight:800;letter-spacing:.14em;color:rgba(242,183,120,.85);margin-bottom:16px}
  .ao-today{width:520px;flex:none;display:flex;flex-direction:column;padding-right:28px;border-right:1px solid rgba(255,255,255,.08)}
  .ao-hero{display:flex;flex-direction:column;gap:18px}
  .ao-big{width:270px;height:270px;border-radius:50%;overflow:hidden;align-self:flex-start;box-shadow:0 0 90px -10px rgba(240,170,90,.32),0 0 0 6px rgba(255,255,255,.05);animation:ao-kb 40s ease-in-out infinite alternate}
  .ao-big img{width:100%;height:100%;object-fit:cover;filter:brightness(.82) saturate(.95)}
  @keyframes ao-kb{to{transform:scale(1.03) translateX(4px)}}
  .ao-htx{display:flex;flex-direction:column}.ao-htx > b{font-size:40px;line-height:1.05;font-weight:800;letter-spacing:-.02em;color:#fff}.ao-htx > em{font-style:normal;margin-top:6px;font-size:15px;font-weight:600;color:rgba(255,255,255,.5)}
  .ao-tev{display:flex;flex-direction:column;gap:10px;margin-top:20px}
  .ao-trow{display:flex;align-items:center;gap:12px}.ao-trow img{width:40px;height:40px;border-radius:12px;object-fit:cover;filter:brightness(.7)}
  .ao-trow span{display:flex;gap:10px;align-items:baseline}.ao-trow b{font-size:17px;font-weight:800;color:#fff;font-variant-numeric:tabular-nums}.ao-trow em{font-style:normal;font-size:16px;font-weight:600;color:rgba(255,255,255,.72)}
  .ao-tnotes{display:flex;gap:16px;margin-top:auto;padding-left:4px}
  .pi.aon .pi-paper{filter:brightness(.62) saturate(.9)}.pi.aon .pi-tape{opacity:.35}
  .pi.aon .pi-paper{padding:11px 9px 9px;gap:5px}.pi.aon .pi-tx{font-size:11.5px;line-height:14.5px}.pi.aon .pi-due{font-size:10.5px}.pi.aon .pi-chk{width:15px;height:15px}
  .ao-next{flex:1;min-width:0;display:flex;flex-direction:column}
  .ao-days{display:grid;grid-template-columns:repeat(5,1fr);gap:14px;flex:1}
  .ao-day{display:flex;flex-direction:column;align-items:flex-start;min-width:0}
  .ao-dhd{display:flex;align-items:baseline;gap:6px;margin-bottom:12px}.ao-dhd em{font-style:normal;font-size:12px;font-weight:800;letter-spacing:.08em;color:rgba(255,255,255,.5)}.ao-dhd b{font-size:24px;font-weight:700;color:rgba(255,255,255,.85)}.ao-dhd i{font-style:normal;font-size:11.5px;font-weight:700;color:rgba(242,183,120,.8)}
  .ao-plate{position:relative;width:112px;height:112px;border-radius:50%;overflow:hidden;flex:none;box-shadow:0 0 0 1px rgba(255,255,255,.08)}
  .ao-plate img{width:100%;height:100%;object-fit:cover;filter:brightness(.66) saturate(.85)}
  .ao-plate.empty{border:1.6px dashed rgba(255,255,255,.2);box-shadow:none}
  .ao-plate.tap::after{content:"";position:absolute;inset:0;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}
  .ao-frz{position:absolute;right:8px;bottom:8px;width:26px;height:26px;border-radius:50%;background:rgba(120,170,255,.35);color:#cfe0ff;display:grid;place-items:center}
  .ao-meal{margin-top:12px;font-size:15.5px;line-height:19px;font-weight:800;color:rgba(255,255,255,.86);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.ao-meal.dim{color:rgba(255,255,255,.35)}
  .ao-side{font-style:normal;font-size:12.5px;font-weight:600;color:rgba(255,255,255,.45);margin-top:2px}
  .ao-evs{display:flex;flex-direction:column;gap:9px;margin-top:16px;padding-top:14px;border-top:1px solid rgba(255,255,255,.08);width:100%}
  .ao-ev{display:grid;grid-template-columns:4px auto;column-gap:8px;align-items:start}
  .ao-ev i{grid-row:1/3;width:4px;height:100%;border-radius:3px;opacity:.8}.ao-ev b{font-size:12.5px;font-weight:800;color:rgba(255,255,255,.6)}.ao-ev em{font-style:normal;font-size:13.5px;line-height:17px;font-weight:700;color:rgba(255,255,255,.8)}
  .ao-notes{margin-top:auto;padding:14px 0 6px 6px;display:flex;flex-direction:column;gap:18px}
  .ao-hint{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);height:34px;padding:0 16px;border-radius:999px;background:rgba(255,255,255,.08);color:rgba(255,255,255,.55);font-size:13px;font-weight:700;display:inline-flex;align-items:center}
  .ao-tapring{position:absolute;width:132px;height:132px;border-radius:50%;border:2px solid rgba(255,255,255,.55)}
  .ao-sheet{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:620px;border-radius:26px;overflow:hidden;background:#17181e;box-shadow:0 40px 90px -30px rgba(0,0,0,.9),inset 0 0 0 1px rgba(255,255,255,.08);color:#fff}
  .ao-sx{position:absolute;right:16px;top:16px;z-index:2;width:36px;height:36px;border-radius:50%;background:rgba(0,0,0,.45);display:grid;place-items:center;font-size:15px;font-weight:800}
  .ao-sph{display:block;height:250px;position:relative}.ao-sph img{width:100%;height:100%;object-fit:cover}.ao-sph::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(23,24,30,0) 45%,#17181e)}
  .ao-sbody{padding:0 28px 26px;margin-top:-36px;position:relative}
  .ao-slbl{font-style:normal;font-size:12px;font-weight:800;letter-spacing:.1em;color:#a9c6ff;display:inline-flex;gap:6px;align-items:center}
  .ao-sbody h3{margin:6px 0 0;font-size:34px;font-weight:800;letter-spacing:-.02em}.ao-sbody p{margin:4px 0 0;font-size:14.5px;font-weight:600;color:rgba(255,255,255,.55)}
  .ao-ing{display:flex;flex-wrap:wrap;gap:6px;margin-top:16px}.ao-ing span{height:30px;padding:0 12px;border-radius:999px;background:rgba(255,255,255,.08);font-size:13px;font-weight:600;display:inline-flex;align-items:center;color:rgba(255,255,255,.85)}
  .ao-sday{margin-top:18px;padding:12px 14px;border-radius:16px;background:rgba(255,255,255,.05);display:flex;align-items:center;gap:16px}.ao-sday > b{font-size:12px;font-weight:800;letter-spacing:.06em;color:rgba(255,255,255,.5);text-transform:uppercase}
  .ao-sbtn{display:flex;gap:10px;margin-top:22px;align-items:center}
  .ao-sbtn span{height:42px;padding:0 16px;border-radius:999px;display:inline-flex;align-items:center;gap:4px;font-size:13.5px;font-weight:700}
  .ao-sbtn .pri{background:#fff;color:#111;margin:0 auto;padding:0 22px;font-size:14.5px}.ao-sbtn .ghost{background:rgba(255,255,255,.08);color:rgba(255,255,255,.8)}
  </style>`;

  const opts = V.map((v) => `<div class="ka-opt"><div class="ag-opthd"><span class="ag-key">${v.key}</span><div><h3>${v.name}</h3><p>${v.why}</p></div></div>
      <div class="ka-pair"><div>${v.d}<p class="ka-cap">Tablet / computer · 1200 px</p></div><div>${v.p}<p class="ka-cap">Gsm · 390 px</p></div></div></div>`).join("");

  const b1 = document.createElement("section");
  b1.className = "board iter";
  b1.style.cssText = "left:0;top:0;width:3360px";
  b1.innerHTML = `${css}<header class="bhd"><span class="bnum">KA</span><div><h2>Kalender › Agenda · to-do's als post-its <span class="tag">4 voorstellen · 12 nov</span></h2><p>De open to-do's (Todoist) komen ook in de agendaweergave, als dezelfde post-its als op de startpagina: geel, rood als het te laat is, ijsblauw met het gerecht als het een ontdooitaak is. Vier manieren om ze naast de volgende afspraak en «Komende afspraken» te zetten, telkens voor tablet/computer en gsm. Voorbeeld: donderdag 12 november om 15:10, met je echte gerechten van deze week.</p><p class="uses">Bouwt op: TodoPostit, NextHero, PhotoEventTile, SegmentedControl, kurken bord (startpagina)</p></div></header>
    <div class="ka-wrap">${opts}</div>`;

  const b2 = document.createElement("section");
  b2.className = "board iter";
  b2.style.cssText = "left:0;top:0;width:2660px";
  b2.innerHTML = `${css}<header class="bhd"><span class="bnum">KB</span><div><h2>Kalender · always-on: eten en agenda op één lijn <span class="tag">voorstel · 12 nov</span></h2><p>Na twee minuten zonder aanraking wordt de kalender een always-on-scherm, zoals het dashboard (zwart, pixelbaan, ’s nachts gedimd). Eén lijn van links naar rechts: vandaag groot met het eten, de afspraken en de to-do's van vandaag; daarna elke dag als kolom met het gerecht, de afspraken eronder en eventueel een post-it. Een tik op een gerecht van later opent meteen het detail (de rest van het scherm: eerst wakker maken).</p><p class="uses">Bouwt op: useAlwaysOn, calendarDaySummary, TodoPostit, SlideInModal (dialog), CalendarDayVisual</p></div></header>
    <div class="ao-wrap">
      <div class="ao-col"><div class="ag-opthd"><span class="ag-key">A</span><div><h3>Always-on</h3><p>Klok en datum bovenaan. Links vandaag: het bord groot (270 px, zoomt traag), naam, afspraken en post-its; rechts vijf dagen met bord (112 px), naam en afspraken. Alles gedimd; enkel wit en de warme kleur van «Vandaag eten we».</p></div></div>${aoScreen()}</div>
      <div class="ao-col"><div class="ag-opthd"><span class="ag-key">B</span><div><h3>Tik op een gerecht → detail</h3><p>Zondag tikken: het scherm wordt wakker en toont het gerecht in een donker venster: foto, dag, ingrediënten, wat er die dag nog in de agenda staat, en vorige/volgende dag. «Open recept» gaat naar het recept; na 30 s zonder aanraking terug naar always-on.</p></div></div>${aoScreen(sheet())}</div>
    </div>`;
  world.appendChild(b2);
  world.appendChild(b1);

  const others = [...world.children].filter((el) => el !== b1 && el !== b2 && el.tagName === "SECTION");
  const topY = Math.min(...others.map((el) => el.offsetTop));
  b2.style.top = `${topY - 240 - b2.offsetHeight}px`;
  b1.style.top = `${topY - 480 - b2.offsetHeight - b1.offsetHeight}px`;
})();
