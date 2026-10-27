/* Startpagina (gsm) · «Toon alle» richting J5 (kaartstapel + cijfer), duidelijker klikbaar: zes varianten · 17 okt.
   Gebruikt de .ta-*-stijlen van het bord «Toon alle» (toon-alle-boards.js, wordt eerder geladen). */
(() => {
  const world = document.getElementById("world");
  const svg = (d, size = 15, sw = 2) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const STACK = (n = 19) => svg('<rect x="7" y="3.5" width="13.5" height="13.5" rx="2.6"/><path d="M3.5 7.5v10a3 3 0 0 0 3 3h10"/>', n);
  const CHEV = (n = 14) => svg('<path d="m9 6 6 6-6 6"/>', n, 2.6);
  const ARROW = (n = 16) => svg('<path d="M5 12h14M13 6l6 6-6 6"/>', n, 2.3);

  const lines = '<div class="ta-lines"><i></i><i></i><i></i></div>';
  const rows = {
    agenda: `<div class="ta-row"><span class="ta-card s a">${lines}</span><span class="ta-card s a" style="box-shadow:0 0 0 2px #8b8ff0">${lines}</span><span class="ta-card s y">${lines}</span></div>`,
    lijstjes: `<div class="ta-row"><span class="ta-card w y">${lines}</span><span class="ta-card s t">${lines}</span></div>`,
    kalender: `<div class="ta-row"><span class="ta-card k y"></span><span class="ta-card k p"></span><span class="ta-card k y"></span><span class="ta-card k"></span></div>`,
  };
  const SECTIONS = [
    { key: "agenda", title: "Agenda", count: 6 },
    { key: "lijstjes", title: "Lijstjes", count: 81 },
    { key: "kalender", title: "Kalender", count: 7 },
  ];
  const flex = (style, inner) => `<span style="display:inline-flex;align-items:center;${style}">${inner}</span>`;
  // Mini-kaartstapel als echt object: twee witte kaartjes achter elkaar, het cijfer op de voorste.
  const cards = (n, color = "#3a3d55") =>
    `<span style="position:relative;width:40px;height:32px;display:inline-block">
      <i style="position:absolute;right:0;top:0;width:30px;height:24px;border-radius:7px;background:#d9dbff;box-shadow:0 0 0 1px rgba(79,85,241,.18);transform:rotate(10deg)"></i>
      <i style="position:absolute;right:4px;top:2px;width:30px;height:24px;border-radius:7px;background:#ffe2c4;box-shadow:0 0 0 1px rgba(180,110,40,.18);transform:rotate(-2deg)"></i>
      <b style="position:absolute;left:0;bottom:0;width:32px;height:26px;border-radius:8px;background:#fff;color:${color};font-size:13px;font-weight:800;display:grid;place-items:center;box-shadow:0 0 0 1px rgba(16,17,48,.1),0 6px 12px -8px rgba(16,17,48,.5)">${n}</b>
    </span>`;

  const STYLES = [
    ["J5", "Vertrekpunt", "Kaartstapel-icoon en groot cijfer, los op de achtergrond. Mooi licht, maar je ziet niet meteen dat het een knop is.", (s) => flex("gap:6px;color:#3a3d55;font-weight:800;font-size:17px", `${STACK()}${s.count}`)],
    ["K1", "Met chevron", "J5 met een chevron erachter: het klassieke «hier kun je verder»-teken, verder niets toegevoegd. Kleinste stap.", (s) => flex("gap:6px;color:#3a3d55;font-weight:800;font-size:17px", `${STACK()}${s.count}<span style="color:#a3a6bd;display:flex;margin-left:-1px">${CHEV()}</span>`)],
    ["K2", "Actieblauw", "Icoon, cijfer en pijl in het blauw van alle links en knoppen in de app. Kleur zegt «tik hier», de vorm blijft vrij.", (s) => flex("gap:6px;color:#4f55f1;font-weight:800;font-size:17px", `${STACK()}${s.count}${CHEV()}`)],
    ["K3", "Zachte drukvlak-pil", "J5 in een heel lichte grijze pil (zoals de weergaveschakelaar bij Agenda), met chevron. Je ziet het tikvlak zonder dat het zwaar wordt.", (s) => flex("height:34px;padding:0 9px 0 11px;border-radius:999px;background:#e9eaf2;gap:6px;color:#3a3d55;font-weight:800;font-size:15.5px", `${STACK(17)}${s.count}<span style="color:#7a7e95;display:flex">${CHEV(13)}</span>`)],
    ["K4", "Icoon in een bolletje", "Het stapel-icoon zit in een witte ronde knop met schaduw (zoals de terugknop), het cijfer staat ernaast. De knop trekt de vinger aan.", (s) => flex("gap:8px;color:#3a3d55;font-weight:800;font-size:17px", `${s.count}<span style="width:36px;height:36px;border-radius:50%;background:#fff;color:#4f55f1;display:grid;place-items:center;box-shadow:0 1px 2px rgba(16,17,48,.12),0 6px 14px -8px rgba(16,17,48,.4)">${STACK(17)}</span>`)],
    ["K5", "Echte kaartstapel", "De stapel als tastbaar object: drie kaartjes schuin achter elkaar (lila, perzik, wit), het aantal op de voorste. Voelt als «blader verder».", (s) => cards(s.count)],
    ["K6", "Stapel + pijlknop", "Stapel-icoon en cijfer in grijs, gevolgd door een kleine blauwe ronde pijlknop. Info links, actie rechts: overduidelijk klikbaar.", (s) => flex("gap:8px;color:#3a3d55;font-weight:800;font-size:16px", `<span style="display:flex;color:#7a7e95">${STACK(17)}</span>${s.count}<span style="width:28px;height:28px;border-radius:50%;background:#4f55f1;color:#fff;display:grid;place-items:center;box-shadow:0 6px 12px -6px rgba(79,85,241,.7)">${ARROW(14)}</span>`)],
  ];

  const phone = (fn) =>
    `<div class="ta-phone">${SECTIONS.map((s) => `<div class="ta-sec"><div class="ta-hd"><h2>${s.title}</h2>${fn(s)}</div>${rows[s.key]}</div>`).join("")}</div>`;

  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = "left:0;top:0;width:1780px";
  b.innerHTML = `<header class="bhd"><span class="bnum">TK</span><div><h2>Startpagina · «Toon alle» als kaartstapel, klikbaarder <span class="tag">6 varianten op J5 · gsm · 17 okt</span></h2><p>Richting J5 (stapel-icoon + groot cijfer, zonder vorm) met meer «tik hier»-gevoel: telkens een andere manier om aan te geven dat het een knop is — chevron, kleur, drukvlak, knop, tastbare stapel of pijlknop. J5 staat links als vertrekpunt.</p><p class="uses">Bouwt op: TJ · J5 Kaartstapel, zonder vorm</p></div></header>
    <div class="ta-opts">${STYLES.map(([k, n, why, fn]) => `<div class="dk-opt"><div class="ag-opthd"><span class="ag-key">${k}</span><div><h3>${n}</h3><p>${why}</p></div></div>${phone(fn)}</div>`).join("")}</div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const top = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${top - 240 - b.offsetHeight}px`;
})();
