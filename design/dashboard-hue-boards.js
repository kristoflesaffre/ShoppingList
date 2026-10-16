/* Dashboard · licht (Philips Hue): zes richtingen voor het lichtpaneel onder de filmtegels (avond, 16 okt). */
(() => {
  const world = document.getElementById("world");
  const ROOMS = [
    { n: "Woonkamer", on: true, b: 60, c: "#ffb547", c2: "#ffe0a3" },
    { n: "Keuken", on: true, b: 100, c: "#ffd27a", c2: "#fff2cc" },
    { n: "Eetkamer", on: false, b: 0 },
    { n: "Slaapkamer", on: false, b: 0 },
    { n: "Badkamer", on: false, b: 0 },
    { n: "Hal", on: true, b: 30, c: "#ff9e5e", c2: "#ffd0a8" },
  ];
  const bulb = (on, size = 18) =>
    `<svg viewBox="0 0 24 24" width="${size}" height="${size}" aria-hidden="true">${on ? '<circle cx="12" cy="10" r="9" fill="#ffd466" opacity=".35"/>' : ""}<path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V17h5.2v-1.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" fill="${on ? "#ffcf4a" : "none"}" stroke="${on ? "#ffcf4a" : "rgba(255,255,255,.55)"}" stroke-width="1.8" stroke-linejoin="round"/><path d="M9.6 19.5h4.8M10.4 21.5h3.2" stroke="${on ? "#ffcf4a" : "rgba(255,255,255,.55)"}" stroke-width="1.8" stroke-linecap="round"/></svg>`;
  const head = (right = '<span class="hl-pill">Alles uit</span>') => `<div class="hl-top"><span class="hl-lbl">LICHT</span>${right}</div>`;
  const panel = (inner, cls = "") => `<div class="hl-panel ${cls}">${inner}</div>`;

  /* A · Kamertegels */
  const A = panel(
    head() +
      `<div class="hl-a">${ROOMS.map(
        (r) => `<div class="hl-at${r.on ? " on" : ""}">${bulb(r.on)}<span><b>${r.n}</b><em>${r.on ? `${r.b}%` : "Uit"}</em></span>${r.on ? `<i class="hl-abar" style="width:${r.b}%"></i>` : ""}</div>`,
      ).join("")}</div>`,
  );

  /* B · Dimschuiven */
  const B = panel(
    head() +
      `<div class="hl-b">${ROOMS.map(
        (r) => `<div class="hl-bs${r.on ? " on" : ""}${r.b >= 80 ? " full" : ""}">${r.on ? `<i class="hl-bfill" style="width:${Math.max(r.b, 14)}%;background:linear-gradient(90deg, ${r.c}, ${r.c2})"></i>` : ""}<span class="hl-bt">${bulb(r.on, 16)}<b>${r.n}</b></span><em>${r.on ? `${r.b}%` : "Uit"}</em></div>`,
      ).join("")}</div>`,
  );

  /* C · Scènes eerst */
  const SCENES = [
    { n: "Ontspannen", g: "linear-gradient(150deg,#ffb36b,#e9667f)", on: true },
    { n: "Film kijken", g: "linear-gradient(150deg,#5b4bd6,#2a1f6e)" },
    { n: "Helder", g: "linear-gradient(150deg,#fff7d6,#ffd36b)", dark: true },
    { n: "Alles uit", g: "linear-gradient(150deg,#2b2a3c,#17161f)" },
  ];
  const C = panel(
    head('<span class="hl-pill">3 van 6 aan</span>') +
      `<div class="hl-c">${SCENES.map((s) => `<div class="hl-cs${s.on ? " on" : ""}${s.dark ? " dark" : ""}" style="background:${s.g}"><span>${s.on ? "✓ " : ""}${s.n}</span></div>`).join("")}</div>
      <div class="hl-cr">${ROOMS.map((r) => `<span class="hl-cc${r.on ? " on" : ""}"><i></i>${r.n}</span>`).join("")}</div>`,
  );

  /* D · Plattegrond */
  const plan = [
    { r: ROOMS[0], x: 0, y: 0, w: 176, h: 140 },
    { r: ROOMS[1], x: 182, y: 0, w: 120, h: 67 },
    { r: ROOMS[2], x: 182, y: 73, w: 120, h: 67 },
    { r: ROOMS[5], x: 308, y: 0, w: 46, h: 140 },
    { r: ROOMS[3], x: 360, y: 0, w: 101, h: 67 },
    { r: ROOMS[4], x: 360, y: 73, w: 101, h: 67 },
  ];
  const D = panel(
    head() +
      `<svg class="hl-d" viewBox="0 0 461 140" width="461" height="140">
        <defs>${plan.filter((p) => p.r.on).map((p, i) => `<radialGradient id="hlg${i}" cx="50%" cy="45%" r="70%"><stop offset="0" stop-color="${p.r.c2}"/><stop offset=".55" stop-color="${p.r.c}" stop-opacity=".85"/><stop offset="1" stop-color="${p.r.c}" stop-opacity=".25"/></radialGradient>`).join("")}</defs>
        ${(() => {
          let k = 0;
          return plan
            .map((p) => {
              const fill = p.r.on ? `url(#hlg${k++})` : "rgba(255,255,255,.05)";
              const tall = p.w < 60;
              return `<g><rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="12" fill="${fill}" stroke="${p.r.on ? "rgba(255,214,120,.7)" : "rgba(255,255,255,.14)"}" stroke-width="1.2"/>
                <text x="${p.x + (tall ? p.w / 2 : 12)}" y="${p.y + (tall ? p.h / 2 : 22)}" ${tall ? `text-anchor="middle" transform="rotate(-90 ${p.x + p.w / 2} ${p.y + p.h / 2})"` : ""} class="hl-dt${p.r.on ? " on" : ""}">${p.r.n}</text>
                ${tall ? "" : `<text x="${p.x + 12}" y="${p.y + 38}" class="hl-ds${p.r.on ? " on" : ""}">${p.r.on ? `${p.r.b}%` : "Uit"}</text>`}</g>`;
            })
            .join("");
        })()}
      </svg>`,
  );

  /* E · Grote dimmer */
  const sel = ROOMS[0];
  const R = 56, CIRC = 2 * Math.PI * R;
  const E = panel(
    head() +
      `<div class="hl-e">
        <div class="hl-ed">
          <svg viewBox="0 0 140 140" width="140" height="140">
            <circle cx="70" cy="70" r="${R}" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="12"/>
            <circle cx="70" cy="70" r="${R}" fill="none" stroke="url(#hlring)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${(CIRC * sel.b) / 100} ${CIRC}" transform="rotate(-90 70 70)"/>
            <defs><linearGradient id="hlring" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffe08a"/><stop offset="1" stop-color="#ff9e3d"/></linearGradient></defs>
          </svg>
          <span class="hl-ec"><b>${sel.b}%</b><em>${sel.n}</em></span>
          <i class="hl-eglow"></i>
        </div>
        <div class="hl-el">${ROOMS.map((r, i) => `<span class="hl-ei${i === 0 ? " sel" : ""}${r.on ? " on" : ""}"><i></i>${r.n}</span>`).join("")}</div>
      </div>`,
  );

  /* F · Lampkolommen */
  const F = panel(
    head() +
      `<div class="hl-f">${ROOMS.map(
        (r) => `<div class="hl-fc${r.on ? " on" : ""}${r.b >= 80 ? " full" : ""}"><span class="hl-fp">${r.on ? `<i style="height:${Math.max(r.b, 12)}%;background:linear-gradient(0deg, ${r.c}, ${r.c2});box-shadow:0 0 22px 2px ${r.c}88"></i>` : ""}<b>${r.on ? `${r.b}` : "–"}</b></span><em>${r.n}</em></div>`,
      ).join("")}</div>`,
  );

  const OPTS = [
    ["A", "Kamertegels", "Een raster van zes kamertegels. Aan = warme gloed met brandend lampje en een dun balkje onderaan voor de helderheid; uit = donker glas. Tik = aan/uit. Rustig en meteen leesbaar.", A],
    ["B", "Dimschuiven", "Elke kamer is een brede schuif zoals in de Hue-app: de vulling in de lichtkleur toont de helderheid. Tik = aan/uit, slepen = dimmen. Het meest «bediening», in één oogopslag hoeveel licht er brandt.", B],
    ["C", "Scènes eerst", "Bovenaan grote scèneknoppen (Ontspannen, Film kijken, Helder, Alles uit) met hun eigen kleurverloop; eronder de kamers als kleine bolletjes. Past bij de avond: één tik voor de hele sfeer.", C],
    ["D", "Plattegrond", "Een eenvoudige plattegrond van het huis: kamers die branden gloeien op in hun lichtkleur. Tik op een kamer om ze te schakelen. Speels en ruimtelijk, vraagt eenmalig een indeling.", D],
    ["E", "Grote dimmer", "Eén grote ronde dimmer voor de gekozen kamer (draaien = dimmen, tik in het midden = aan/uit) met de kamers ernaast om te kiezen. Fijne bediening, één kamer tegelijk.", E],
    ["F", "Lampkolommen", "Elke kamer als staande capsule die van onder opvult in haar lichtkleur, met een zachte gloed: samen een equalizer van het huis. Omhoog/omlaag vegen = dimmen, tik = aan/uit.", F],
  ];

  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = "left:0;top:0;width:1700px";
  b.innerHTML = `<header class="bhd"><span class="bnum">L</span><div><h2>Dashboard · licht (Philips Hue) <span class="tag">6 richtingen · avond · 16 okt</span></h2><p>Het lichtpaneel onder de filmtegels op het avonddashboard, op ware grootte (497 × 210). Voorbeeldkamers; in de app komen ze uit Hue. Alle zes gebruiken dezelfde donkere avondtegel met warme gloed.</p><p class="uses">Bouwt op: DashboardHuePanel · /api/hue/rooms + /api/hue/light · avondtegels</p></div></header>
    <div class="hl-grid">${OPTS.map(([k, n, why, html]) => `<div class="hl-opt"><div class="ag-opthd"><span class="ag-key">${k}</span><div><h3>${n}</h3><p>${why}</p></div></div>${html}</div>`).join("")}</div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const top = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${top - 240 - b.offsetHeight}px`;
})();
