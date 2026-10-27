/* Kalender · agendategels: drie alternatieven voor beter leesbare tekst op foto's (15 okt). */
(() => {
  const world = document.getElementById("world");
  const rgba = ([r, g, b], a = 1) => `rgba(${r},${g},${b},${a})`;
  const deep = ([r, g, b], k = 0.55) => `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
  const PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/></svg>';

  const EVENTS = [
    { day: "VANDAAG", time: "17:00", title: "Tanja Holvoet Kristof", color: [214, 134, 52], photo: "ag_tanja_holvoet", next: true },
    { day: "MORGEN", time: "Hele dag", title: "Huub Bday 🎈", color: [52, 60, 168], photo: "ag_verjaardag" },
    { day: "MORGEN", time: "22:00", title: "Sjotter Y&O vs De Zwaluw", loc: "'t Klaverke, Dorp 2, 2861 Si…", color: [150, 40, 72], photo: "ag_sjotter" },
    { day: "ZA 17", time: "Hele dag", title: "Bart Machilse bday 🎈", color: [32, 120, 72], photo: "ag_verjaardag" },
  ];

  const nextPill = (e) => (e.next ? `<span class="ag-next" style="background:${rgba(e.color)}">Volgende</span>` : "");
  const ring = (e) => (e.next ? `box-shadow:0 0 0 2.5px ${rgba(e.color)},0 14px 30px -18px ${rgba(e.color, 0.7)};` : "");
  const loc = (e, color) => (e.loc ? `<span class="ag-loc" style="color:${color}">${PIN}<span>${e.loc}</span></span>` : "");

  /* A · Fotovenster: tekst op het effen getinte vlak, foto als afgerond venster ertussen. */
  const tileA = (e) => `<article class="ag-tile a" style="background:linear-gradient(170deg, ${rgba(e.color, 0.2)}, ${rgba(e.color, 0.06)} 70%), #fff;${ring(e)}">
      ${nextPill(e)}
      <span class="ag-day" style="color:${deep(e.color, 0.45)}">${e.day}</span>
      <span class="ag-time" style="color:${deep(e.color)}">${e.time}</span>
      <span class="ag-win"><img src="${IMG[e.photo]}" alt=""></span>
      <span class="ag-title" style="color:${deep(e.color, 0.35)}">${e.title}</span>
      ${loc(e, deep(e.color, 0.5))}
    </article>`;

  /* B · Volle foto + donkere scrim: witte tekst, tijd en dag bovenaan in een donkere band. */
  const tileB = (e) => `<article class="ag-tile b" style="${ring(e)}">
      ${nextPill(e)}
      <img class="ag-bg" src="${IMG[e.photo]}" alt="">
      <span class="ag-scrim" style="background:linear-gradient(180deg, ${rgba(e.color.map((c) => c * 0.25), 0.78)} 0%, rgba(10,12,24,.05) 38%, rgba(10,12,24,.1) 52%, rgba(10,12,24,.82) 100%)"></span>
      <span class="ag-day light">${e.day}</span>
      <span class="ag-time light">${e.time}</span>
      <span class="ag-bottom">
        <span class="ag-title light">${e.title}</span>
        ${loc(e, "rgba(255,255,255,.85)")}
      </span>
    </article>`;

  /* C · Glazen labels: foto blijft helder, tekst op matglazen witte vlakken. */
  const tileC = (e) => `<article class="ag-tile c" style="${ring(e)}">
      ${nextPill(e)}
      <img class="ag-bg" src="${IMG[e.photo]}" alt="">
      <span class="ag-glass top"><span class="ag-day" style="color:${deep(e.color, 0.45)}">${e.day}</span><span class="ag-time" style="color:${deep(e.color)}">${e.time}</span></span>
      <span class="ag-glass bottom"><span class="ag-title" style="color:${deep(e.color, 0.35)}">${e.title}</span>${loc(e, deep(e.color, 0.5))}</span>
    </article>`;

  const lane = (fn, size) => `<div class="ag-lane ${size}">${EVENTS.map(fn).join("")}</div>`;
  const option = (key, name, why, fn) => `<div class="ag-opt">
      <div class="ag-opthd"><span class="ag-key">${key}</span><div><h3>${name}</h3><p>${why}</p></div></div>
      <div class="ag-panel"><p class="ag-cap">DESKTOP · 220 × 230</p>${lane(fn, "lg")}<p class="ag-cap">MOBIEL · 150 × 190</p>${lane(fn, "sm")}</div>
    </div>`;

  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = "left:0;top:0;width:1100px";
  b.innerHTML = `<header class="bhd"><span class="bnum">K</span><div><h2>Kalender · agendategels leesbaar <span class="tag">3 opties · 15 okt</span></h2><p>Nu staat de tijd over het drukke midden van de foto (de witte waas is daar maar 25%). Drie richtingen waarin de tekst altijd op een rustige ondergrond staat. Zelfde gegevens als op je scherm; de «Volgende»-ring en de kleur per afspraak blijven.</p><p class="uses">Bouwt op: EventTile (kalender_agenda.tsx) · kleur per afspraak · fotobibliotheek afspraken</p></div></header>
    <div class="ag-opts">
      ${option("A", "Fotovenster", "Tekst op het effen, licht getinte vlak; de foto staat als afgerond venster tussen tijd en titel. Nooit tekst op de foto: altijd leesbaar, rustig. Foto is wel kleiner.", tileA)}
      ${option("B", "Volle foto, donkere band", "De foto vult de hele tegel; boven een band in de afspraakkleur, onder een donkere verloop. Witte tekst: sterk contrast, meest «poster». Minder licht dan de rest van de app.", tileB)}
      ${option("C", "Glazen labels", "De foto blijft helder en vol; dag + tijd en titel staan op matglazen witte vlakjes (wit 82% + blur). Leesbaar én fotografisch, lijkt het meest op nu.", tileC)}
    </div>`;
  world.appendChild(b);
  // Bovenaan: boven het bovenste bord, 240px ertussen.
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const top = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${top - 240 - b.offsetHeight}px`;
})();
