/* Dashboard · overdag (licht): vier vollere agendakleuren met glastegels (geen wit) · 16 okt. */
(() => {
  const world = document.getElementById("world");
  const PIN = '<svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 2.5a7.2 7.2 0 0 0-7.2 7.2c0 5.1 6 11.1 6.6 11.7a.85.85 0 0 0 1.2 0c.6-.6 6.6-6.6 6.6-11.7A7.2 7.2 0 0 0 12 2.5z" fill="currentColor"/></svg>';

  /* panel: achtergrond; ring/shadow; head: kleur «Vandaag»; sep: dagscheiding; band: optionele kleurband bovenaan. */
  const P = {
    A: { panel: "linear-gradient(160deg,#4f55f1 0%,#6c63f0 50%,#8c7df3 100%)", shadow: "0 18px 40px -22px rgba(79,85,241,.85)", ring: "rgba(255,255,255,.18)", now: "#ffe08a" },
    B: { panel: "linear-gradient(160deg,#2f6fd9 0%,#3f86ea 50%,#5aa0ff 100%)", shadow: "0 18px 40px -22px rgba(40,100,220,.85)", ring: "rgba(255,255,255,.18)", now: "#ffe08a" },
    C: { panel: "linear-gradient(160deg,#e9606a 0%,#f07a68 50%,#f59a6c 100%)", shadow: "0 18px 40px -22px rgba(230,96,90,.8)", ring: "rgba(255,255,255,.2)", now: "#fff3b0" },
    D: { panel: "linear-gradient(160deg,#178f86 0%,#24a796 50%,#3cc0a6 100%)", shadow: "0 18px 40px -22px rgba(23,143,134,.8)", ring: "rgba(255,255,255,.18)", now: "#ffe08a" },
  };

  // Glastegel op het gekleurde paneel: witte tekst, foto vloeit via een masker uit in het glas.
  const tile = (title, meta, photo, top = "") =>
    `<div class="dk-tile" style="background:rgba(255,255,255,.18);box-shadow:inset 0 0 0 1px rgba(255,255,255,.32)">
      ${photo ? `<img src="${IMG[photo]}" alt="" style="-webkit-mask-image:linear-gradient(90deg,transparent 0%,#000 40%);mask-image:linear-gradient(90deg,transparent 0%,#000 40%)">` : ""}
      <span class="dk-tt">${top}<b style="color:#fff">${title}</b>${meta ? `<em style="color:rgba(255,255,255,.82)">${meta}</em>` : ""}</span>
    </div>`;
  const row = (t, e, body) => `<div class="dk-row"><span class="dk-time" style="color:#fff">${t ? `<b>${t}</b><em>${e}</em>` : ""}</span>${body}</div>`;

  const page = (p) => `<div class="dk-page" style="background:#f5f6fa;color:#14162b">
      <div class="dk-head"><span class="dk-ava"></span><span class="dk-clock" style="color:#14162b">17:48</span><span class="dk-greet" style="color:#14162b"><em>Vrijdag 16 oktober</em><b>Goedemiddag, Kristof</b></span></div>
      <div class="dk-grid">
        <div class="dy-left">
          <div class="dy-w"><span class="dk-lbl" style="color:#fff">VANDAAG · KONTICH</span><b>17°<small>12°</small></b><em>Regen</em><span class="dy-chip">☂ 96% kans op regen · nu</span><span class="dy-cl"></span>
            <div class="dy-hours">${["Nu 18°", "18u 17°", "19u 16°", "20u 14°", "21u 14°", "22u 14°"].map((h) => `<i><u>${h.split(" ")[0]}</u><s></s>${h.split(" ")[1]}</i>`).join("")}</div></div>
          <div class="dy-mw"><span class="dk-lbl" style="color:#fff">MORGEN</span><span class="dk-cl"></span><b>15°</b><em>9°</em><i>☂ 45%</i></div>
          <div class="dy-f"><span class="dk-lbl" style="color:#8a5418">VANDAAG ETEN WE</span><b>Aardappelen,<br>Komkommer +8</b><em>10 items</em><span class="dy-ing"><img src="${IMG.aardappelen}" alt=""><img src="${IMG.komkommer}" alt=""><img src="${IMG.zalm}" alt=""></span></div>
          <div class="dy-mf"><span class="dk-lbl" style="color:#8a5418">MORGEN</span><span class="dk-q" style="color:#8a5418">?</span><b>Nog niets</b></div>
        </div>
        <div class="dy-right">
          <div class="dk-agenda dy-agenda" style="background:${p.panel};box-shadow:0 0 0 1px ${p.ring},${p.shadow}">
            <div class="dk-ah"><b style="color:#fff">Vandaag</b><em style="color:rgba(255,255,255,.8)">1 afspraak</em></div>
            ${row("", "", tile("Huub verjaardag", "", "ag_verjaardag", '<u style="color:rgba(255,255,255,.75)">HELE DAG</u>'))}
            <div class="dk-now"><b style="color:${p.now}">17:48</b><i style="background:${p.now}"></i><span></span></div>
            ${row("22:00", "00:00", tile("Sjotter Y&O vs De Zwaluw", `${PIN} 22:00 – 00:00 · 't Klaverke`, "ag_sjotter"))}
            <div class="dk-sep" style="color:rgba(255,255,255,.75)">MORGEN · ZATERDAG 17</div>
            ${row("", "", tile("Bart Machilsen verjaardag", "", "ag_verjaardag", '<u style="color:rgba(255,255,255,.75)">HELE DAG</u>'))}
            ${row("10:00", "11:00", tile("Fiets sofie: 110 euro CASH!", `${PIN} 10:00 – 11:00 · Meerminnenstraat 39`, null))}
          </div>
          <div class="dy-sc"><div class="dy-s b"><b>7</b><span><strong>Te kopen</strong><em>producten open</em></span><img src="${IMG.kopen ?? ""}" alt=""></div><div class="dy-s g"><span><strong>Lijstjes</strong><em>alle lijstjes</em></span></div></div>
        </div>
      </div>
    </div>`;

  const OPTS = [
    ["A", "Indigo", "Het paneel in het indigo van de app (dezelfde familie als «Te kopen»), van diep naar iets lichter paars. Agendategels als glas met witte tekst, foto's lopen uit in het glas.", page(P.A)],
    ["B", "Diep hemelsblauw", "Een vollere, diepere versie van het weerblauw. Sluit naadloos aan bij de weertegels links; witte tekst op glastegels.", page(P.B)],
    ["C", "Koraal", "Warm koraal tussen het oranje van het eten en het perzik van morgen. Het meest uitgesproken; glastegels met witte tekst en een lichtgele nu-lijn.", page(P.C)],
    ["D", "Petrol", "Diep groenblauw dat aansluit bij het groen van «Lijstjes» en contrasteert met het blauw en oranje links. Rustig maar duidelijk gekleurd.", page(P.D)],
  ];

  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = "left:0;top:0;width:2560px";
  b.innerHTML = `<header class="bhd"><span class="bnum">K2</span><div><h2>Dashboard · agendakleur overdag, voller <span class="tag">4 voorstellen · glastegels · 16 okt</span></h2><p>Donkerder en voller, zonder witte tegels: het agendapaneel krijgt een echte kleur zoals de andere tegels, en de afspraken staan erop als glastegels met witte tekst.</p><p class="uses">Bouwt op: dashboard overdag · fototijdlijn A1</p></div></header>
    <div class="dk-opts">${OPTS.map(([k, n, why, html]) => `<div class="dk-opt"><div class="ag-opthd"><span class="ag-key">${k}</span><div><h3>${n}</h3><p>${why}</p></div></div>${html}</div>`).join("")}</div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const top = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${top - 240 - b.offsetHeight}px`;
})();
