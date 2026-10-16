/* Dashboard · overdag (licht): vier kleurvoorstellen voor het agendapaneel, afgestemd op de andere tegels · 16 okt. */
(() => {
  const world = document.getElementById("world");
  const PIN = '<svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 2.5a7.2 7.2 0 0 0-7.2 7.2c0 5.1 6 11.1 6.6 11.7a.85.85 0 0 0 1.2 0c.6-.6 6.6-6.6 6.6-11.7A7.2 7.2 0 0 0 12 2.5z" fill="currentColor"/></svg>';

  /* panel: achtergrond; ring/shadow; head: kleur «Vandaag»; sep: dagscheiding; band: optionele kleurband bovenaan. */
  const P = {
    A: { panel: "linear-gradient(175deg,#cfe3ff 0%,#e6f0ff 32%,#f6f9ff 65%,#ffffff 100%)", shadow: "0 18px 40px -26px rgba(40,100,220,.55)", ring: "rgba(90,150,255,.18)", head: "#173a7a", sub: "#4f6fa8", sep: "#6f8cc0", now: "#e04848" },
    B: { panel: "linear-gradient(175deg,#ffe9d6 0%,#fff3e8 35%,#fffaf5 70%,#ffffff 100%)", shadow: "0 18px 40px -26px rgba(230,140,40,.55)", ring: "rgba(240,160,80,.2)", head: "#4a2706", sub: "#8a5a2a", sep: "#a07650", now: "#e04848" },
    C: { panel: "#ffffff", shadow: "0 18px 40px -28px rgba(16,17,48,.4)", ring: "rgba(16,17,48,.06)", head: "#14162b", sub: "#6b7084", sep: "#8a8fa3", now: "#e04848", band: "linear-gradient(90deg,#5aa0ff 0%,#8ab6ff 30%,#ffc76b 62%,#ffb48c 80%,#7ed3a8 100%)" },
    D: { panel: "linear-gradient(150deg,#d9e8ff 0%,#eef3ff 30%,#fff3ea 70%,#ffe6d3 100%)", shadow: "0 18px 40px -26px rgba(170,120,160,.5)", ring: "rgba(180,150,200,.2)", head: "#2b2350", sub: "#6b5f86", sep: "#8a7ea6", now: "#e04848" },
  };

  const tile = (title, meta, photo, top = "", tint = "#2a1f55") =>
    `<div class="dk-tile" style="background:#fff;box-shadow:0 0 0 1px rgba(16,17,48,.04),0 8px 18px -14px rgba(16,17,48,.35)">
      ${photo ? `<img src="${IMG[photo]}" alt=""><span class="dk-fade" style="background:linear-gradient(90deg,#fff 55%,rgba(255,255,255,0) 72%)"></span>` : ""}
      <span class="dk-tt">${top}<b style="color:${tint}">${title}</b>${meta ? `<em style="color:#6b6f86">${meta}</em>` : ""}</span>
    </div>`;
  const row = (t, e, body) => `<div class="dk-row"><span class="dk-time" style="color:#14162b">${t ? `<b>${t}</b><em>${e}</em>` : ""}</span>${body}</div>`;

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
            ${p.band ? `<span class="dy-band" style="background:${p.band}"></span>` : ""}
            <div class="dk-ah"><b style="color:${p.head}">Vandaag</b><em style="color:${p.sub}">1 afspraak</em></div>
            ${row("", "", tile("Huub verjaardag", "", "ag_verjaardag", '<u style="color:#4b50b8">HELE DAG</u>', "#1f2266"))}
            <div class="dk-now"><b style="color:${p.now}">17:48</b><i style="background:${p.now}"></i><span></span></div>
            ${row("22:00", "00:00", tile("Sjotter Y&O vs De Zwaluw", `${PIN} 22:00 – 00:00 · 't Klaverke`, "ag_sjotter", "", "#1f2266"))}
            <div class="dk-sep" style="color:${p.sep}">MORGEN · ZATERDAG 17</div>
            ${row("", "", tile("Bart Machilsen verjaardag", "", "ag_verjaardag", '<u style="color:#a3600e">HELE DAG</u>', "#4a2706"))}
            ${row("10:00", "11:00", tile("Fiets sofie: 110 euro CASH!", `${PIN} 10:00 – 11:00 · Meerminnenstraat 39`, null, "", "#4a2706"))}
          </div>
          <div class="dy-sc"><div class="dy-s b"><b>7</b><span><strong>Te kopen</strong><em>producten open</em></span><img src="${IMG.kopen ?? ""}" alt=""></div><div class="dy-s g"><span><strong>Lijstjes</strong><em>alle lijstjes</em></span></div></div>
        </div>
      </div>
    </div>`;

  const OPTS = [
    ["A", "Hemelsblauw", "Het paneel loopt van zacht hemelsblauw bovenaan naar wit, als vervolg op de weertegels links. Rustig, en het blauw komt terug in «Vandaag» en de dagscheidingen.", page(P.A)],
    ["B", "Warm papier", "Zacht perzik-crème verloop, in de familie van de eettegels. Warm en huiselijk; de koppen in donkerbruin. Het blauw blijft enkel bij het weer.", page(P.B)],
    ["C", "Wit met kleurband", "Een zuiver witte kaart met een dunne kleurband bovenaan die alle tegelkleuren samenvat (blauw → geel → perzik → groen). Het meest neutraal: de kleur zit in de tegels eromheen.", page(P.C)],
    ["D", "Brug blauw-perzik", "Een diagonaal verloop van het blauw van het weer (linksboven) naar het perzik van het eten (rechtsonder): het paneel verbindt de twee kleurwerelden.", page(P.D)],
  ];

  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = "left:0;top:0;width:2560px";
  b.innerHTML = `<header class="bhd"><span class="bnum">K</span><div><h2>Dashboard · agendakleur overdag <span class="tag">4 voorstellen · licht thema · 16 okt</span></h2><p>Het lila agendapaneel paste niet bij de blauwe, oranje en groene tegels. Vier kleurrichtingen voor enkel het agendapaneel; de rest van het dashboard blijft zoals het is.</p><p class="uses">Bouwt op: dashboard overdag · fototijdlijn A1</p></div></header>
    <div class="dk-opts">${OPTS.map(([k, n, why, html]) => `<div class="dk-opt"><div class="ag-opthd"><span class="ag-key">${k}</span><div><h3>${n}</h3><p>${why}</p></div></div>${html}</div>`).join("")}</div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const top = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${top - 240 - b.offsetHeight}px`;
})();
