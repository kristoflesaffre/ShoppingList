/* Dashboard · avond, voorstel C verder: donkerder zonsondergang + agenda ook in glas · 16 okt. */
(() => {
  const world = document.getElementById("world");
  const PIN = '<svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 2.5a7.2 7.2 0 0 0-7.2 7.2c0 5.1 6 11.1 6.6 11.7a.85.85 0 0 0 1.2 0c.6-.6 6.6-6.6 6.6-11.7A7.2 7.2 0 0 0 12 2.5z" fill="currentColor"/></svg>';

  const P = {
    C1: {
      page: "linear-gradient(180deg,#ff9b5c 0%,#f2697a 30%,#c4508f 58%,#7b4597 80%,#4a3a8c 100%)",
      sun: "radial-gradient(closest-side,rgba(255,224,140,.95),rgba(255,170,90,0))",
      glass: "rgba(255,255,255,.2)",
      glassStrong: "rgba(255,255,255,.26)",
      ring: "rgba(255,255,255,.42)",
      agenda: "rgba(255,255,255,.14)",
      sep: "rgba(255,255,255,.7)",
      now: "#ffe2a0",
    },
    C2: {
      page: "linear-gradient(180deg,#f7884e 0%,#e0566f 26%,#a6448c 52%,#5c3887 76%,#272657 100%)",
      sun: "radial-gradient(closest-side,rgba(255,206,120,.85),rgba(255,140,80,0))",
      glass: "rgba(255,255,255,.14)",
      glassStrong: "rgba(255,255,255,.2)",
      ring: "rgba(255,255,255,.3)",
      agenda: "rgba(20,12,48,.22)",
      sep: "rgba(255,255,255,.62)",
      now: "#ffcf8a",
    },
  };

  const posters = ["linear-gradient(160deg,#7a1c1c,#2a0b0b)", "linear-gradient(160deg,#a57a34,#3b2810)", "linear-gradient(160deg,#d9d9d9,#8a1d2a)", "linear-gradient(160deg,#1d2b6b,#0b0f26)", "linear-gradient(160deg,#2bb3a8,#c0432a)"];
  const poster = (g, label) => `<span class="dk-poster" style="background:${g}"><b>${label}</b></span>`;
  const lamps = [["Badkamer", 100, "1"], ["Badkamer", 0, "2"], ["Bureau", 100], ["Gang", 30, "↓"], ["Gang", 100, "↑"], ["Gastenkamer", 0]];

  const page = (p) => {
    const g = (extra = "") => `background:${p.glass};box-shadow:inset 0 0 0 1px ${p.ring};backdrop-filter:blur(14px)${extra}`;
    // Agendategel in glas: foto rechts loopt via een masker uit in het glas (geen witte vlakken meer).
    const tile = (title, meta, photo, top = "") =>
      `<div class="dk-tile" style="background:${p.glassStrong};box-shadow:inset 0 0 0 1px ${p.ring}">
        ${photo ? `<img src="${IMG[photo]}" alt="" style="-webkit-mask-image:linear-gradient(90deg,transparent 0%,#000 38%);mask-image:linear-gradient(90deg,transparent 0%,#000 38%)">` : ""}
        <span class="dk-tt">${top}<b style="color:#fff">${title}</b>${meta ? `<em style="color:rgba(255,255,255,.78)">${meta}</em>` : ""}</span>
      </div>`;
    const row = (t, e, body) => `<div class="dk-row"><span class="dk-time" style="color:#fff">${t ? `<b>${t}</b><em>${e}</em>` : ""}</span>${body}</div>`;
    return `<div class="dk-page sx-page" style="background:${p.page}">
      <span class="sx-sun" style="background:${p.sun}"></span>
      <div class="dk-head" style="position:relative"><span class="dk-ava"></span><span class="dk-clock" style="color:#fff">20:35</span><span class="dk-greet" style="color:#fff"><em>Vrijdag 16 oktober</em><b>Goedenavond, Kristof</b></span></div>
      <div class="dk-grid" style="position:relative">
        <div class="dk-left">
          <div class="dk-film" style="${g()}"><span class="dk-lbl" style="color:rgba(255,255,255,.9)">AAN HET KIJKEN</span><div class="dk-ps">${poster(posters[0], "DAREDEVIL")}${poster(posters[1], "NEAGLEY")}</div></div>
          <div class="dk-mw" style="${g()};color:#fff"><span class="dk-lbl" style="color:#fff">MORGEN</span><span class="dk-cl"></span><b>16°</b><em>9°</em><i>☂ 45%</i></div>
          <div class="dk-film" style="${g()}"><span class="dk-lbl" style="color:rgba(255,255,255,.9)">VANAVOND KIJKEN?</span><div class="dk-ps">${poster(posters[2], "FACE OFF")}${poster(posters[3], "SPIDER NOIR")}${poster(posters[4], "RICK")}</div></div>
          <div class="dk-mf" style="${g()};color:#fff"><span class="dk-lbl" style="color:#fff">MORGEN</span><span class="dk-q">?</span><b>Nog niets</b></div>
          <div class="dk-light" style="${g()};color:#fff">
            <div class="dk-lt"><span class="dk-lbl" style="color:#fff;opacity:.85">LICHT</span><span class="dk-pill" style="background:rgba(255,255,255,.24);color:#fff">Alles uit</span></div>
            <div class="dk-lamps">${lamps.map(([n, b, badge]) => `<div class="dk-lamp"><span class="dk-cap" style="background:rgba(255,255,255,.16);box-shadow:inset 0 0 0 1px ${p.ring}">${b ? `<i style="height:${b}%"></i>` : ""}<b class="${b >= 80 ? "dark" : ""}" style="${b >= 80 ? "" : `color:${b ? "#fff" : "rgba(255,255,255,.75)"}`}">${b || "–"}</b>${badge ? `<s class="${b ? "lit" : ""}">${badge}</s>` : ""}</span><em style="color:${b ? "#fff" : "rgba(255,255,255,.72)"}">${n}</em></div>`).join("")}</div>
          </div>
        </div>
        <div class="dk-agenda" style="background:${p.agenda};box-shadow:inset 0 0 0 1px ${p.ring};backdrop-filter:blur(18px);color:#fff">
          <div class="dk-ah"><b>Vandaag</b><em>1 afspraak</em></div>
          ${row("", "", tile("Huub verjaardag", "", "ag_verjaardag", '<u style="color:#ffe2a0">HELE DAG</u>'))}
          <div class="dk-now"><b style="color:${p.now}">20:35</b><i style="background:${p.now}"></i><span style="color:${p.now}">Rest van de avond vrij</span></div>
          ${row("22:00", "00:00", tile("Sjotter Y&O vs De Zwaluw", `${PIN} 22:00 – 00:00 · 't Klaverke`, "ag_sjotter"))}
          <div class="dk-sep" style="color:${p.sep}">MORGEN · ZATERDAG 17</div>
          ${row("", "", tile("Bart Machilsen verjaardag", "", "ag_verjaardag", '<u style="color:#ffe2a0">HELE DAG</u>'))}
          ${row("10:00", "11:00", tile("Fiets sofie: 110 euro CASH!", `${PIN} 10:00 – 11:00 · Meerminnenstraat 39`, null))}
          ${row("17:00", "17:15", tile("Loopband smeren", "17:00 – 17:15", "ag_tanja_holvoet"))}
        </div>
      </div>
    </div>`;
  };

  const OPTS = [
    ["C1", "Avondrood", "Voorstel C, verder in de avond: de lucht loopt van oranje via koraal en magenta naar diep violet onderaan. Alles is matglas, ook de agenda: agendategels zijn lichte glasplaten met witte tekst en de foto's vloeien uit in het glas. Warm en nog redelijk licht.", page(P.C1)],
    ["C2", "Schemering", "Nog een stap later: korter oranje bovenaan, dan karmijn en paars naar nachtblauw onderaan. Het glas is iets donkerder getint (agenda bijna rookglas), zodat de witte tekst en de gele lampjes extra uitkomen. Het meest «zon is net onder».", page(P.C2)],
  ];

  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = "left:0;top:0;width:2560px";
  b.innerHTML = `<header class="bhd"><span class="bnum">Z2</span><div><h2>Dashboard · avond, zonsondergang in glas <span class="tag">2 voorstellen op basis van C · 16 okt</span></h2><p>Donkerder zonsondergang dan C en de agenda mee in glas (agendapaneel én -tegels), zodat het hele scherm één lucht is met glazen panelen erop.</p><p class="uses">Bouwt op: Z · C Gloed met glas</p></div></header>
    <div class="dk-opts">${OPTS.map(([k, n, why, html]) => `<div class="dk-opt"><div class="ag-opthd"><span class="ag-key">${k}</span><div><h3>${n}</h3><p>${why}</p></div></div>${html}</div>`).join("")}</div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const top = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${top - 240 - b.offsetHeight}px`;
})();
