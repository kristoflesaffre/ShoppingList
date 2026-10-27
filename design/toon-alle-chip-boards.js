/* Startpagina (gsm) · «Toon alle» als icoonchip (richting J verder): acht uiteenlopende varianten · 17 okt.
   Gebruikt de .ta-*-stijlen van het bord «Toon alle» (toon-alle-boards.js, wordt eerder geladen). */
(() => {
  const world = document.getElementById("world");
  const svg = (d, size = 15, sw = 2) => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
  const GRID = (n = 15) => svg('<rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/>', n);
  const STACK = (n = 15) => svg('<rect x="7" y="3.5" width="13.5" height="13.5" rx="2.6"/><path d="M3.5 7.5v10a3 3 0 0 0 3 3h10"/>', n);
  const EXPAND = (n = 14) => svg('<path d="M14 4h6v6M20 4l-7 7M10 20H4v-6M4 20l7-7"/>', n);
  const CHEV = (n = 14) => svg('<path d="m9 6 6 6-6 6"/>', n, 2.4);
  // Eigen icoon per sectie (voor de varianten die per sectie verschillen).
  const ICON = {
    agenda: (n = 15) => svg('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>', n),
    lijstjes: (n = 15) => svg('<path d="M9 7h11M9 12h11M9 17h11"/><circle cx="4.75" cy="7" r=".9" fill="currentColor"/><circle cx="4.75" cy="12" r=".9" fill="currentColor"/><circle cx="4.75" cy="17" r=".9" fill="currentColor"/>', n),
    kalender: (n = 15) => svg('<circle cx="12" cy="13" r="7.5"/><circle cx="12" cy="13" r="3.5"/><path d="M5 3.5v3M19 3.5v3"/>', n),
  };
  const TINT = { agenda: ["#e8e9ff", "#4f55f1"], lijstjes: ["#fbeccd", "#9a5b0b"], kalender: ["#fbe1d6", "#b2482a"] };
  const THUMBS = { agenda: ["#ffd6a8", "#c9cbff", "#ffe3ea"], lijstjes: ["#fff1c9", "#e6f3d8", "#dfe7ff"], kalender: ["#ffd9c2", "#f6e1b3", "#e8d6ff"] };

  const lines = '<div class="ta-lines"><i></i><i></i><i></i></div>';
  const rows = {
    agenda: `<div class="ta-row"><span class="ta-card s a">${lines}</span><span class="ta-card s a" style="box-shadow:0 0 0 2px #8b8ff0">${lines}</span><span class="ta-card s y">${lines}</span></div>`,
    lijstjes: `<div class="ta-row"><span class="ta-card w y">${lines}</span><span class="ta-card s t">${lines}</span></div>`,
    kalender: `<div class="ta-row"><span class="ta-card k y"></span><span class="ta-card k p"></span><span class="ta-card k y"></span><span class="ta-card k"></span></div>`,
  };
  const SECTIONS = [
    { key: "agenda", title: "Agenda", count: 6, label: "Open agenda" },
    { key: "lijstjes", title: "Lijstjes", count: 81, label: "Toon alle" },
    { key: "kalender", title: "Kalender", count: 7, label: "Toon alle" },
  ];
  const chip = (style, inner) => `<span style="display:inline-flex;align-items:center;${style}">${inner}</span>`;

  const STYLES = [
    ["J", "Vertrekpunt", "Witte chip met raster-icoon en het aantal, dunne rand (zoals voorgesteld).", (s) => chip("height:32px;padding:0 11px;border-radius:12px;background:#fff;color:#3a3d55;font-weight:700;font-size:13.5px;gap:6px;box-shadow:0 0 0 1px rgba(16,17,48,.08)", `${GRID()}${s.count}`)],
    ["J1", "Ronde knop met teller", "Een ronde witte knop met enkel het raster-icoon; het aantal zit als blauw bolletje op de rand, zoals een melding.", (s) => `<span style="position:relative;width:38px;height:38px;border-radius:50%;background:#fff;color:#3a3d55;display:grid;place-items:center;box-shadow:0 1px 2px rgba(16,17,48,.12),0 6px 14px -8px rgba(16,17,48,.35)">${GRID(16)}<b style="position:absolute;top:-5px;right:-7px;min-width:20px;height:20px;padding:0 5px;border-radius:999px;background:#4f55f1;color:#fff;font-size:11px;font-weight:800;display:grid;place-items:center;box-shadow:0 0 0 2px #f5f6fa">${s.count}</b></span>`],
    ["J2", "Donkere chip", "Diep nachtblauw met wit icoon en wit cijfer: hetzelfde silhouet, maar contrastrijk en wat luxueuzer.", (s) => chip("height:32px;padding:0 12px;border-radius:12px;background:#1d2040;color:#fff;font-weight:700;font-size:13.5px;gap:6px;box-shadow:0 8px 16px -10px rgba(16,17,48,.7)", `${GRID()}${s.count}`)],
    ["J3", "Getint per sectie", "Elke sectie haar eigen kleur en icoon (kalender, lijst, bord), in de tint van de kaarten eronder. Geen rand, geen schaduw.", (s) => chip(`height:32px;padding:0 11px;border-radius:12px;background:${TINT[s.key][0]};color:${TINT[s.key][1]};font-weight:800;font-size:13.5px;gap:6px`, `${ICON[s.key]()}${s.count}`)],
    ["J4", "Gesplitste chip", "Twee vakjes in één chip: links het aantal, rechts het icoon, met een scheidingslijntje. Leest als een tellerknop.", (s) => chip("height:32px;border-radius:12px;background:#fff;color:#3a3d55;font-weight:700;font-size:13.5px;box-shadow:0 0 0 1px rgba(16,17,48,.1);overflow:hidden", `<span style="padding:0 10px">${s.count}</span><span style="align-self:stretch;width:1px;background:rgba(16,17,48,.1)"></span><span style="padding:0 9px;display:grid;place-items:center;color:#4f55f1">${GRID()}</span>`)],
    ["J5", "Kaartstapel, zonder vorm", "Geen chip-vorm: een icoon van gestapelde kaarten en een groot cijfer, los op de achtergrond. Licht en grafisch.", (s) => chip("gap:6px;color:#3a3d55;font-weight:800;font-size:17px", `${STACK(19)}${s.count}`)],
    ["J6", "Mini-voorbeelden", "Drie piepkleine overlappende bolletjes (de inhoud: lijstjes, gerechten, afspraken) plus het aantal. Toont wát er nog is.", (s) => chip("height:32px;padding:0 10px 0 6px;border-radius:999px;background:#fff;color:#3a3d55;font-weight:700;font-size:13.5px;gap:6px;box-shadow:0 0 0 1px rgba(16,17,48,.08)", `<span style="display:flex">${THUMBS[s.key].map((c, i) => `<i style="width:20px;height:20px;border-radius:50%;background:${c};box-shadow:0 0 0 2px #fff;${i ? "margin-left:-7px" : ""}"></i>`).join("")}</span>${s.count}${CHEV(12)}`)],
    ["J7", "Vierkant tegeltje", "Een klein vierkant (40×40) met het icoon boven en het cijfer eronder, als een mini-app-icoon. Compact en speels.", (s) => `<span style="width:42px;height:42px;border-radius:13px;background:#fff;color:#3a3d55;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1px;box-shadow:0 1px 2px rgba(16,17,48,.1),0 8px 16px -10px rgba(16,17,48,.4)"><span style="color:#4f55f1;display:flex">${GRID(14)}</span><b style="font-size:11.5px;line-height:13px">${s.count}</b></span>`],
    ["J8", "Openklap-pil", "Een wit-blauwe pil met het aantal en een «openklappen»-icoon (↗↙): duidt aan dat je naar het volledige overzicht gaat.", (s) => chip("height:32px;padding:0 6px 0 12px;border-radius:999px;background:#eef0ff;color:#3236b8;font-weight:800;font-size:13.5px;gap:7px", `${s.count}<span style="width:22px;height:22px;border-radius:50%;background:#fff;display:grid;place-items:center;box-shadow:0 1px 2px rgba(16,17,48,.15)">${EXPAND(12)}</span>`)],
    ["J9", "Tekstchip", "Zelfde witte chip als J, met dunne rand en afgeronde hoeken, maar met de tekst «Toon alle» (bij Agenda «Open agenda») in donkere tekst i.p.v. icoon en aantal.", (s) => chip("height:32px;padding:0 12px;border-radius:12px;background:#fff;color:#3a3d55;font-weight:700;font-size:13.5px;box-shadow:0 0 0 1px rgba(16,17,48,.08)", s.label)],
  ];

  const phone = (fn) =>
    `<div class="ta-phone">${SECTIONS.map((s) => `<div class="ta-sec"><div class="ta-hd"><h2>${s.title}</h2>${fn(s)}</div>${rows[s.key]}</div>`).join("")}</div>`;

  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = "left:0;top:0;width:1780px";
  b.innerHTML = `<header class="bhd"><span class="bnum">TJ</span><div><h2>Startpagina · «Toon alle» als icoonchip <span class="tag">9 varianten op J · gsm · 17 okt</span></h2><p>Richting J (icoonchip) verder uitgewerkt: acht duidelijk verschillende varianten in vorm, kleur en inhoud, telkens op dezelfde drie secties. J zelf staat links als vertrekpunt.</p><p class="uses">Bouwt op: TA · J Icoonchip</p></div></header>
    <div class="ta-opts">${STYLES.map(([k, n, why, fn]) => `<div class="dk-opt"><div class="ag-opthd"><span class="ag-key">${k}</span><div><h3>${n}</h3><p>${why}</p></div></div>${phone(fn)}</div>`).join("")}</div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const top = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${top - 240 - b.offsetHeight}px`;
})();
