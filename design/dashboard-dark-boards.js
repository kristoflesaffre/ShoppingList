/* Dashboard · avond in donker thema: vier kleurvoorstellen (enkel kleuren, zelfde opbouw) · 16 okt. */
(() => {
  const world = document.getElementById("world");
  const PIN = '<svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 2.5a7.2 7.2 0 0 0-7.2 7.2c0 5.1 6 11.1 6.6 11.7a.85.85 0 0 0 1.2 0c.6-.6 6.6-6.6 6.6-11.7A7.2 7.2 0 0 0 12 2.5z" fill="currentColor"/></svg>';

  /*
   * Per voorstel: pagina, agendapaneel, agendategel (achtergrond, titel, meta, foto-dim), morgen-tegels,
   * filmtegels en lichtpaneel. Lamp «aan» blijft warm geel in alle vier.
   */
  const P = {
    A: {
      page: "#0d0e18",
      clock: "#e9e9f2",
      agenda: "linear-gradient(170deg,#2b1f4d 0%,#1a1331 45%,#100b1e 100%)",
      agendaRing: "#33275a",
      tile: "#d8d4e6",
      tileTitle: "#2a1f55",
      tileMeta: "#5b5280",
      tileFade: "216,212,230",
      photo: "brightness(.72) saturate(.85)",
      past: "rgba(255,255,255,.06)",
      sep: "#8d86b0",
      time: "#d9d6ee",
      wTom: "linear-gradient(165deg,#3a5ea8,#2c4680 60%,#223563)",
      wText: "#e8eeff",
      fTom: "linear-gradient(165deg,#8a4f33,#6a3a25 60%,#4f2b1c)",
      fText: "#ffe3cf",
      watch: "radial-gradient(120% 90% at 85% 100%, #4a3285 0%, #261c52 45%, #14112e 100%)",
      list: "radial-gradient(120% 90% at 85% 100%, #87344f 0%, #4b1a33 45%, #240d1d 100%)",
      light: "radial-gradient(120% 140% at 0% 0%, #6b4f22 0%, #3b2d1a 45%, #241c12 100%)",
      lightRing: "rgba(255,200,110,.28)",
      off: "rgba(255,255,255,.1)",
    },
    B: {
      page: "#0b0d17",
      clock: "#e6e8f4",
      agenda: "linear-gradient(170deg,#1c2238 0%,#151a2c 50%,#10131f 100%)",
      agendaRing: "#262d48",
      tile: "rgba(255,255,255,.08)",
      tileTitle: "#eef0fb",
      tileMeta: "#a9afcc",
      tileFade: "36,41,62",
      photo: "brightness(.8)",
      past: "rgba(255,255,255,.04)",
      sep: "#7c84a6",
      time: "#d5d9ee",
      wTom: "linear-gradient(165deg,#22345e,#1a2848 60%,#141e36)",
      wText: "#cfe0ff",
      fTom: "linear-gradient(165deg,#3a2a24,#2c201b 60%,#211814)",
      fText: "#ffd7b8",
      watch: "radial-gradient(120% 90% at 85% 100%, #35296a 0%, #1d1840 45%, #121029 100%)",
      list: "radial-gradient(120% 90% at 85% 100%, #5b2540 0%, #33152a 45%, #1c0c18 100%)",
      light: "linear-gradient(160deg,#2a3352 0%,#1e2640 55%,#171d32 100%)",
      lightRing: "rgba(160,180,255,.25)",
      off: "rgba(255,255,255,.1)",
      glassTile: true,
    },
    C: {
      page: "#120c1c",
      clock: "#efe7fb",
      agenda: "linear-gradient(170deg,#352458 0%,#24183d 50%,#170f28 100%)",
      agendaRing: "#3f2d66",
      tile: "#2f2449",
      tileTitle: "#f3ecff",
      tileMeta: "#bfb2dd",
      tileFade: "47,36,73",
      photo: "brightness(.78) saturate(.9)",
      past: "rgba(255,255,255,.05)",
      sep: "#a596c9",
      time: "#e4dcf7",
      wTom: "linear-gradient(165deg,#3b3a7a,#2d2b60 60%,#21204a)",
      wText: "#e6e4ff",
      fTom: "linear-gradient(165deg,#6b3a3a,#522b2d 60%,#3c2023)",
      fText: "#ffdcd0",
      watch: "radial-gradient(120% 90% at 85% 100%, #4e3592 0%, #2a1d58 45%, #170f33 100%)",
      list: "radial-gradient(120% 90% at 85% 100%, #8e3a5c 0%, #511c3a 45%, #280d20 100%)",
      light: "linear-gradient(160deg,#5a3d17 0%,#3c2a12 55%,#2a1d0d 100%)",
      lightRing: "rgba(255,190,90,.35)",
      off: "rgba(255,255,255,.12)",
      glassTile: true,
    },
    D: {
      page: "#0f0d0b",
      clock: "#f3ead9",
      agenda: "linear-gradient(170deg,#2a2219 0%,#1e1913 50%,#15120e 100%)",
      agendaRing: "#3a3024",
      tile: "#e8dcc6",
      tileTitle: "#3a2a14",
      tileMeta: "#7a6440",
      tileFade: "232,220,198",
      photo: "brightness(.7) sepia(.15)",
      past: "rgba(255,240,215,.06)",
      sep: "#a8977a",
      time: "#efe3cc",
      wTom: "linear-gradient(165deg,#2f4a63,#243a4f 60%,#1b2c3d)",
      wText: "#dbeaf7",
      fTom: "linear-gradient(165deg,#7a4a26,#5e381c 60%,#462a15)",
      fText: "#ffe6c9",
      watch: "radial-gradient(120% 90% at 85% 100%, #43316f 0%, #241b45 45%, #15102a 100%)",
      list: "radial-gradient(120% 90% at 85% 100%, #7d3445 0%, #461a29 45%, #230d16 100%)",
      light: "linear-gradient(160deg,#14404a 0%,#0f313a 55%,#0b252c 100%)",
      lightRing: "rgba(120,220,230,.25)",
      off: "rgba(255,255,255,.12)",
    },
  };

  const posters = [
    "linear-gradient(160deg,#7a1c1c,#2a0b0b)",
    "linear-gradient(160deg,#a57a34,#3b2810)",
    "linear-gradient(160deg,#d9d9d9,#8a1d2a)",
    "linear-gradient(160deg,#1d2b6b,#0b0f26)",
    "linear-gradient(160deg,#2bb3a8,#c0432a)",
  ];
  const poster = (g, label) => `<span class="dk-poster" style="background:${g}"><b>${label}</b></span>`;

  const page = (k, p) => {
    const tile = (title, meta, photo, extraTop = "") =>
      `<div class="dk-tile" style="background:${p.tile}${p.glassTile ? ";box-shadow:inset 0 0 0 1px rgba(255,255,255,.08)" : ""}">
        ${photo ? `<img src="${IMG[photo]}" alt="" style="filter:${p.photo}"><span class="dk-fade" style="background:linear-gradient(90deg, rgb(${p.tileFade}) 55%, rgba(${p.tileFade},0) 72%)"></span>` : ""}
        <span class="dk-tt">${extraTop}<b style="color:${p.tileTitle}">${title}</b>${meta ? `<em style="color:${p.tileMeta}">${meta}</em>` : ""}</span>
      </div>`;
    const row = (t, e, body) => `<div class="dk-row"><span class="dk-time" style="color:${p.time}">${t ? `<b>${t}</b><em>${e}</em>` : ""}</span>${body}</div>`;
    const lamps = [["Badkamer", 100, "1"], ["Badkamer", 0, "2"], ["Bureau", 0], ["Gang", 60, "↓"], ["Gang", 0, "↑"], ["Gastenkamer", 100]];
    return `<div class="dk-page" style="background:${p.page}">
      <div class="dk-head"><span class="dk-ava"></span><span class="dk-clock" style="color:${p.clock}">21:16</span><span class="dk-greet" style="color:${p.clock}"><em>Vrijdag 16 oktober</em><b>Goedenavond, Kristof</b></span></div>
      <div class="dk-grid">
        <div class="dk-left">
          <div class="dk-film" style="background:${p.watch}"><span class="dk-lbl">AAN HET KIJKEN</span><div class="dk-ps">${poster(posters[0], "DAREDEVIL")}${poster(posters[1], "NEAGLEY")}</div></div>
          <div class="dk-mw" style="background:${p.wTom};color:${p.wText}"><span class="dk-lbl" style="color:${p.wText}">MORGEN</span><span class="dk-cl"></span><b>15°</b><em>9°</em><i>☂ 45%</i></div>
          <div class="dk-film" style="background:${p.list}"><span class="dk-lbl">VANAVOND KIJKEN?</span><div class="dk-ps">${poster(posters[2], "FACE OFF")}${poster(posters[3], "SPIDER NOIR")}${poster(posters[4], "RICK")}</div></div>
          <div class="dk-mf" style="background:${p.fTom};color:${p.fText}"><span class="dk-lbl" style="color:${p.fText}">MORGEN</span><span class="dk-q">?</span><b>Nog niets</b></div>
          <div class="dk-light" style="background:${p.light};box-shadow:inset 0 0 0 1px ${p.lightRing}">
            <div class="dk-lt"><span class="dk-lbl">LICHT</span><span class="dk-pill">Alles uit</span></div>
            <div class="dk-lamps">${lamps.map(([n, b, badge]) => `<div class="dk-lamp"><span class="dk-cap" style="background:${p.off}">${b ? `<i style="height:${b}%"></i>` : ""}<b class="${b >= 80 ? "dark" : ""}">${b || "–"}</b>${badge ? `<s class="${b ? "lit" : ""}">${badge}</s>` : ""}</span><em class="${b ? "on" : ""}">${n}</em></div>`).join("")}</div>
          </div>
        </div>
        <div class="dk-agenda" style="background:${p.agenda};box-shadow:0 0 0 1px ${p.agendaRing}">
          <div class="dk-ah"><b>Vandaag</b><em>1 afspraak</em></div>
          ${row("", "", tile("Huub verjaardag", "", "ag_verjaardag", '<u style="color:' + p.tileMeta + '">HELE DAG</u>'))}
          <div class="dk-now"><b>21:16</b><i></i><span>Rest van de avond vrij</span></div>
          ${row("22:00", "00:00", tile("Sjotter Y&O vs De Zwaluw", `${PIN} 22:00 – 00:00 · 't Klaverke`, "ag_sjotter"))}
          <div class="dk-sep" style="color:${p.sep}">MORGEN · ZATERDAG 17</div>
          ${row("", "", tile("Bart Machilsen verjaardag", "", "ag_verjaardag", '<u style="color:' + p.tileMeta + '">HELE DAG</u>'))}
          ${row("10:00", "11:00", tile("Fiets sofie: 110 euro CASH!", `${PIN} 10:00 – 11:00 · Meerminnenstraat 39`, null))}
          ${row("17:00", "17:15", tile("Tanja Holvoet Kristof", "17:00 – 18:00", "ag_tanja_holvoet"))}
        </div>
      </div>
    </div>`;
  };

  const OPTS = [
    ["A", "Gedimd (huidige kleuren, zachter)", "Zelfde paars agendapaneel, maar de agendategels zijn gedimd lila-grijs i.p.v. fel wit en de foto's zijn wat donkerder. Morgen-tegels in diepere tinten van blauw en oranje. Lichtpaneel warm amber-bruin, duidelijk lichter dan de achtergrond.", page("A", P.A)],
    ["B", "Nachtblauw glas", "Agendategels als donker glas met lichte tekst (geen witte vlakken meer), rustig nachtblauw paneel. Morgen-tegels heel diep blauw en bruin. Lichtpaneel leiblauw met een koele rand: past bij de rest en steekt toch af.", page("B", P.B)],
    ["C", "Pruim & amber", "Alles in pruim: paneel, tegels (paarse glastegels met lichte tekst) en een indigo morgen-weer. Het lichtpaneel is warm amber, als een lamp die brandt; het meest sfeervol voor de avond.", page("C", P.C)],
    ["D", "Kaarslicht", "Warme, bijna bruine basis met crèmekleurige agendategels (zacht, niet fel wit) en sepia-getinte foto's. Het lichtpaneel diep petrol als contrast, zodat de warme lampjes er extra uit springen.", page("D", P.D)],
  ];

  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = "left:0;top:0;width:2560px";
  b.innerHTML = `<header class="bhd"><span class="bnum">N</span><div><h2>Dashboard · avond in donker <span class="tag">4 kleurvoorstellen · 16 okt</span></h2><p>Enkel kleuren, opbouw blijft gelijk. Doel: minder fel (agendategels en morgen-tegels gedimd) en een lichtpaneel dat niet donker-op-donker is. Posters zijn hier kleurvlakken; in de app de echte covers.</p><p class="uses">Bouwt op: avonddashboard · donker thema (data-theme=dark) · always-on</p></div></header>
    <div class="dk-opts">${OPTS.map(([k, n, why, html]) => `<div class="dk-opt"><div class="ag-opthd"><span class="ag-key">${k}</span><div><h3>${n}</h3><p>${why}</p></div></div>${html}</div>`).join("")}</div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const top = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${top - 240 - b.offsetHeight}px`;
})();
