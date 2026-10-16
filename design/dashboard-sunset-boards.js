/* Dashboard · avond (licht thema) met zonsondergang: vier kleurvoorstellen · 16 okt. Hergebruikt de dk-*-opbouw. */
(() => {
  const world = document.getElementById("world");
  const PIN = '<svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 2.5a7.2 7.2 0 0 0-7.2 7.2c0 5.1 6 11.1 6.6 11.7a.85.85 0 0 0 1.2 0c.6-.6 6.6-6.6 6.6-11.7A7.2 7.2 0 0 0 12 2.5z" fill="currentColor"/></svg>';

  /*
   * page: paginaverloop (de lucht bij zonsondergang); ink: tekst op de pagina; agenda: agendapaneel;
   * watch/list: filmtegels; light: lichtpaneel (+ lightInk, cap = lege capsule, capRing);
   * wTom/fTom: morgen-tegels; sun: kleine zon/gloed achter de klok.
   */
  const P = {
    A: {
      page: "linear-gradient(180deg,#fde3c8 0%,#f9cfc4 38%,#ecd3ec 72%,#e2ddf6 100%)",
      sun: "radial-gradient(closest-side,#ffd27a,rgba(255,180,90,0))",
      ink: "#3a2132",
      agenda: "linear-gradient(170deg,#fff6ef 0%,#ffffff 55%,#fbf3fb 100%)",
      agendaRing: "rgba(200,120,110,.18)",
      sep: "#b07a7a",
      watch: "linear-gradient(150deg,#f6a972 0%,#e9788a 60%,#cf6a97 100%)",
      list: "linear-gradient(150deg,#e9819c 0%,#b977c9 60%,#8f73d8 100%)",
      light: "linear-gradient(150deg,#ffd38f 0%,#f7ad6c 55%,#ee9270 100%)",
      lightInk: "#5a2a12",
      cap: "rgba(255,255,255,.35)",
      capRing: "rgba(255,255,255,.65)",
      offInk: "rgba(90,42,18,.55)",
      wTom: "linear-gradient(165deg,#a9b4f3,#c9cdf6 60%,#e3e2f8)",
      wText: "#2c2f6e",
      fTom: "linear-gradient(165deg,#ffb48c,#ffcfae 60%,#ffe2cc)",
      fText: "#5a2a12",
    },
    B: {
      page: "linear-gradient(180deg,#ffd7bd 0%,#f6b7c2 40%,#cfb3ea 75%,#b9b3ef 100%)",
      sun: "radial-gradient(closest-side,#ffe3a1,rgba(255,200,120,0))",
      ink: "#2e1b3c",
      agenda: "linear-gradient(170deg,#fff3f6 0%,#ffffff 50%,#f6f1ff 100%)",
      agendaRing: "rgba(170,110,190,.2)",
      sep: "#9a6f9f",
      watch: "linear-gradient(150deg,#c25f93 0%,#8e57bf 60%,#6a52c4 100%)",
      list: "linear-gradient(150deg,#ef7f86 0%,#d0608f 55%,#a65498 100%)",
      light: "linear-gradient(150deg,#9b6fd9 0%,#7a5fd0 55%,#5f55c5 100%)",
      lightInk: "#ffffff",
      cap: "rgba(255,255,255,.16)",
      capRing: "rgba(255,255,255,.35)",
      offInk: "rgba(255,255,255,.65)",
      wTom: "linear-gradient(165deg,#8d9ef0,#b0bbf4 60%,#d2d8f8)",
      wText: "#ffffff",
      fTom: "linear-gradient(165deg,#ff9e86,#ffbea4 60%,#ffd9c6)",
      fText: "#5a1f1a",
    },
    C: {
      page: "linear-gradient(180deg,#ffb27a 0%,#ff9483 30%,#e083a9 62%,#a689d8 100%)",
      sun: "radial-gradient(closest-side,#fff0a8,rgba(255,220,120,0))",
      ink: "#ffffff",
      agenda: "linear-gradient(170deg,rgba(255,255,255,.9) 0%,rgba(255,255,255,.82) 100%)",
      agendaRing: "rgba(255,255,255,.6)",
      sep: "#a8628a",
      watch: "linear-gradient(150deg,rgba(255,255,255,.34),rgba(255,255,255,.18))",
      list: "linear-gradient(150deg,rgba(255,255,255,.3),rgba(255,255,255,.14))",
      light: "linear-gradient(150deg,rgba(255,255,255,.34),rgba(255,255,255,.18))",
      glass: true,
      lightInk: "#ffffff",
      cap: "rgba(255,255,255,.22)",
      capRing: "rgba(255,255,255,.55)",
      offInk: "rgba(255,255,255,.8)",
      wTom: "linear-gradient(165deg,rgba(255,255,255,.4),rgba(255,255,255,.2))",
      wText: "#ffffff",
      fTom: "linear-gradient(165deg,rgba(255,255,255,.4),rgba(255,255,255,.2))",
      fText: "#ffffff",
    },
    D: {
      page: "linear-gradient(180deg,#ffd29c 0%,#f8b39b 32%,#c99bd8 66%,#8f86d8 100%)",
      sun: "radial-gradient(closest-side,#ffe08a,rgba(255,190,90,0))",
      ink: "#2a1d44",
      agenda: "linear-gradient(170deg,#ffffff 0%,#fbf7ff 100%)",
      agendaRing: "rgba(120,100,200,.18)",
      sep: "#8b78b8",
      watch: "linear-gradient(150deg,#7a6be0 0%,#9a63c9 55%,#c06aa8 100%)",
      list: "linear-gradient(150deg,#d9718f 0%,#ef8f74 60%,#f7ad6a 100%)",
      light: "linear-gradient(150deg,#ff9f6e 0%,#ee7f84 50%,#c26bab 100%)",
      lightInk: "#ffffff",
      cap: "rgba(255,255,255,.2)",
      capRing: "rgba(255,255,255,.45)",
      offInk: "rgba(255,255,255,.7)",
      wTom: "linear-gradient(165deg,#7f90e6,#a3b0f0 60%,#c8cff7)",
      wText: "#ffffff",
      fTom: "linear-gradient(165deg,#ffad7f,#ffc69f 60%,#ffdcc0)",
      fText: "#5a2a12",
    },
  };

  const posters = ["linear-gradient(160deg,#7a1c1c,#2a0b0b)", "linear-gradient(160deg,#a57a34,#3b2810)", "linear-gradient(160deg,#d9d9d9,#8a1d2a)", "linear-gradient(160deg,#1d2b6b,#0b0f26)", "linear-gradient(160deg,#2bb3a8,#c0432a)"];
  const poster = (g, label) => `<span class="dk-poster" style="background:${g}"><b>${label}</b></span>`;
  const tile = (title, meta, photo, top = "") =>
    `<div class="dk-tile" style="background:#fff;box-shadow:0 8px 18px -14px rgba(60,20,40,.35)">
      ${photo ? `<img src="${IMG[photo]}" alt=""><span class="dk-fade" style="background:linear-gradient(90deg,#fff 55%,rgba(255,255,255,0) 72%)"></span>` : ""}
      <span class="dk-tt">${top}<b style="color:#3a1f2c">${title}</b>${meta ? `<em style="color:#7a5866">${meta}</em>` : ""}</span>
    </div>`;
  const row = (t, e, body) => `<div class="dk-row"><span class="dk-time" style="color:#3a2132">${t ? `<b>${t}</b><em>${e}</em>` : ""}</span>${body}</div>`;
  const lamps = [["Badkamer", 100, "1"], ["Badkamer", 0, "2"], ["Bureau", 100], ["Gang", 30, "↓"], ["Gang", 100, "↑"], ["Gastenkamer", 0]];

  const page = (p) => `<div class="dk-page sx-page" style="background:${p.page}">
      <span class="sx-sun" style="background:${p.sun}"></span>
      <div class="dk-head" style="position:relative"><span class="dk-ava"></span><span class="dk-clock" style="color:${p.ink}">20:35</span><span class="dk-greet" style="color:${p.ink}"><em>Vrijdag 16 oktober</em><b>Goedenavond, Kristof</b></span></div>
      <div class="dk-grid" style="position:relative">
        <div class="dk-left">
          <div class="dk-film" style="background:${p.watch}${p.glass ? ";box-shadow:inset 0 0 0 1px rgba(255,255,255,.45);backdrop-filter:blur(12px)" : ";box-shadow:0 18px 36px -24px rgba(120,40,80,.6)"}"><span class="dk-lbl" style="color:rgba(255,255,255,.9)">AAN HET KIJKEN</span><div class="dk-ps">${poster(posters[0], "DAREDEVIL")}${poster(posters[1], "NEAGLEY")}</div></div>
          <div class="dk-mw" style="background:${p.wTom};color:${p.wText}${p.glass ? ";box-shadow:inset 0 0 0 1px rgba(255,255,255,.45)" : ""}"><span class="dk-lbl" style="color:${p.wText}">MORGEN</span><span class="dk-cl"></span><b>16°</b><em>9°</em><i>☂ 45%</i></div>
          <div class="dk-film" style="background:${p.list}${p.glass ? ";box-shadow:inset 0 0 0 1px rgba(255,255,255,.45)" : ";box-shadow:0 18px 36px -24px rgba(120,40,80,.6)"}"><span class="dk-lbl" style="color:rgba(255,255,255,.9)">VANAVOND KIJKEN?</span><div class="dk-ps">${poster(posters[2], "FACE OFF")}${poster(posters[3], "SPIDER NOIR")}${poster(posters[4], "RICK")}</div></div>
          <div class="dk-mf" style="background:${p.fTom};color:${p.fText}${p.glass ? ";box-shadow:inset 0 0 0 1px rgba(255,255,255,.45)" : ""}"><span class="dk-lbl" style="color:${p.fText}">MORGEN</span><span class="dk-q">?</span><b>Nog niets</b></div>
          <div class="dk-light" style="background:${p.light};${p.glass ? "box-shadow:inset 0 0 0 1px rgba(255,255,255,.45)" : "box-shadow:0 18px 36px -24px rgba(160,70,60,.6)"};color:${p.lightInk}">
            <div class="dk-lt"><span class="dk-lbl" style="color:${p.lightInk};opacity:.85">LICHT</span><span class="dk-pill" style="background:rgba(255,255,255,.28);color:${p.lightInk}">Alles uit</span></div>
            <div class="dk-lamps">${lamps.map(([n, b, badge]) => `<div class="dk-lamp"><span class="dk-cap" style="background:${p.cap};box-shadow:inset 0 0 0 1px ${p.capRing}">${b ? `<i style="height:${b}%"></i>` : ""}<b class="${b >= 80 ? "dark" : ""}" style="${b >= 80 ? "" : `color:${b ? "#fff" : p.offInk}`}">${b || "–"}</b>${badge ? `<s class="${b ? "lit" : ""}">${badge}</s>` : ""}</span><em style="color:${b ? p.lightInk : p.offInk}">${n}</em></div>`).join("")}</div>
          </div>
        </div>
        <div class="dk-agenda" style="background:${p.agenda};box-shadow:0 0 0 1px ${p.agendaRing},0 24px 48px -30px rgba(120,40,80,.5);color:#2a1730">
          <div class="dk-ah"><b>Vandaag</b><em>1 afspraak</em></div>
          ${row("", "", tile("Huub verjaardag", "", "ag_verjaardag", '<u style="color:#4b50b8">HELE DAG</u>'))}
          <div class="dk-now"><b>20:35</b><i></i><span>Rest van de avond vrij</span></div>
          ${row("22:00", "00:00", tile("Sjotter Y&O vs De Zwaluw", `${PIN} 22:00 – 00:00 · 't Klaverke`, "ag_sjotter"))}
          <div class="dk-sep" style="color:${p.sep}">MORGEN · ZATERDAG 17</div>
          ${row("", "", tile("Bart Machilsen verjaardag", "", "ag_verjaardag", '<u style="color:#a3600e">HELE DAG</u>'))}
          ${row("10:00", "11:00", tile("Fiets sofie: 110 euro CASH!", `${PIN} 10:00 – 11:00 · Meerminnenstraat 39`, null))}
          ${row("17:00", "17:15", tile("Loopband smeren", "17:00 – 17:15", "ag_tanja_holvoet"))}
        </div>
      </div>
    </div>`;

  const OPTS = [
    ["A", "Gouden uur", "Zachte lucht van perzik naar roze naar lavendel. Filmtegels in warme zonsondergangtinten (oranje→roze en roze→violet), het lichtpaneel honinggeel als lamplicht. Licht en vriendelijk; agenda wit met een vleugje perzik.", page(P.A)],
    ["B", "Roze schemering", "Iets later op de avond: perzik → roze → lila lucht. Filmtegels in kersenroze en paars (middentonen, niet meer zwart), lichtpaneel violet zodat de gele lampjes er goed uit springen. Rijker van kleur, nog steeds licht.", page(P.B)],
    ["C", "Gloed met glas", "De hele achtergrond is een felle zonsondergang (oranje → koraal → paars) en de tegels zijn matglas met witte tekst, zodat de lucht erdoor schijnt. Agenda als bijna witte glasplaat. Het meest «wow», het sterkst sfeer.", page(P.C)],
    ["D", "Zon & nacht", "Van warme zon bovenaan naar paarse avond onderaan. «Aan het kijken» koel (indigo → paars), «Vanavond kijken» en het lichtpaneel warm (roze → oranje): de twee kanten van de zonsondergang. Speels contrast.", page(P.D)],
  ];

  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = "left:0;top:0;width:2560px";
  b.innerHTML = `<header class="bhd"><span class="bnum">Z</span><div><h2>Dashboard · avond met zonsondergang <span class="tag">4 kleurvoorstellen · licht thema · 16 okt</span></h2><p>In de avond (20 – 23 u, licht thema) een achtergrondverloop als zonsondergang; filmtegels en lichtpaneel lichter en afgestemd op die lucht. Opbouw blijft gelijk; posters zijn hier kleurvlakken.</p><p class="uses">Bouwt op: avonddashboard · lampkolommen · agendategels</p></div></header>
    <div class="dk-opts">${OPTS.map(([k, n, why, html]) => `<div class="dk-opt"><div class="ag-opthd"><span class="ag-key">${k}</span><div><h3>${n}</h3><p>${why}</p></div></div>${html}</div>`).join("")}</div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const top = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${top - 240 - b.offsetHeight}px`;
})();
