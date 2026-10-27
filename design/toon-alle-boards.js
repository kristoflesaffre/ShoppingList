/* Startpagina (gsm) · elf stijlen voor «Toon alle» / «Open agenda» naast de sectietitels · 17 okt. */
(() => {
  const world = document.getElementById("world");
  const CHEV = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>';
  const ARROW = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  const GRID = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/></svg>';

  const css = `
  .ta-opts{display:grid;grid-template-columns:repeat(4,400px);gap:44px 36px}
  .ta-phone{width:375px;background:#f5f6fa;border-radius:28px;padding:18px 16px 22px;box-shadow:0 0 0 1px rgba(16,17,48,.06),0 24px 50px -30px rgba(16,17,48,.35);font-family:Inter,system-ui,sans-serif;color:#14162b;overflow:hidden}
  .ta-sec{margin-top:18px}.ta-sec:first-child{margin-top:0}
  .ta-hd{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:34px}
  .ta-hd h2{margin:0;font-size:22px;line-height:28px;font-weight:800;letter-spacing:-.01em;display:flex;align-items:center;gap:8px}
  .ta-row{display:flex;gap:10px;margin-top:12px;overflow:hidden}
  .ta-card{flex:none;height:92px;border-radius:20px;background:#fff;box-shadow:0 0 0 1px rgba(16,17,48,.06)}
  .ta-card.w{width:250px}.ta-card.s{width:110px}.ta-card.k{width:96px;height:118px}
  .ta-card.a{background:linear-gradient(180deg,#eef0ff,#fff)}.ta-card.t{background:linear-gradient(180deg,#dcdcff,#ececff)}
  .ta-card.y{background:linear-gradient(180deg,#fdf3df,#fff)}.ta-card.p{background:linear-gradient(180deg,#f7dde6,#fbeef2)}
  .ta-lines{padding:14px}.ta-lines i{display:block;height:9px;border-radius:5px;background:rgba(16,17,48,.1);margin-bottom:8px}.ta-lines i:first-child{width:60%;height:12px;background:rgba(16,17,48,.16)}.ta-lines i:last-child{width:40%}
  .ta-ref{outline:2px dashed #c9cbe6;outline-offset:6px}
  `;
  const lines = '<div class="ta-lines"><i></i><i></i><i></i></div>';
  const rows = {
    agenda: `<div class="ta-row"><span class="ta-card s a">${lines}</span><span class="ta-card s a" style="box-shadow:0 0 0 2px #8b8ff0">${lines}</span><span class="ta-card s y">${lines}</span></div>`,
    lijstjes: `<div class="ta-row"><span class="ta-card w y">${lines}</span><span class="ta-card s t">${lines}</span></div>`,
    kalender: `<div class="ta-row"><span class="ta-card k y"></span><span class="ta-card k p"></span><span class="ta-card k y"></span><span class="ta-card k"></span></div>`,
  };
  // Voor H: de rij gescrold tot aan het eind, zodat de afsluitende tegel zichtbaar is.
  const rowsShort = {
    agenda: `<div class="ta-row" style="margin-left:-60px"><span class="ta-card s a">${lines}</span><span class="ta-card s y">${lines}</span><span class="ta-card s y">${lines}</span></div>`,
    lijstjes: `<div class="ta-row" style="margin-left:-150px"><span class="ta-card w y">${lines}</span><span class="ta-card s t">${lines}</span></div>`,
    kalender: `<div class="ta-row" style="margin-left:-40px"><span class="ta-card k y"></span><span class="ta-card k p"></span></div>`,
  };
  const SECTIONS = [
    { key: "agenda", title: "Agenda", label: "Open agenda", short: "Agenda", count: 6 },
    { key: "lijstjes", title: "Lijstjes", label: "Toon alle", short: "Alle", count: 81 },
    { key: "kalender", title: "Kalender", label: "Toon alle", short: "Week", count: 7 },
  ];
  // Elke stijl: (sectie) → { title: extra HTML in de titel, right: rechterkant, row: optioneel aangepaste rij }
  const STYLES = [
    ["0", "Nu (referentie)", "Blauwe tekstlink rechts, zoals vandaag.", (s) => ({ right: `<span style="color:#4f55f1;font-weight:600;font-size:16px">${s.label}</span>` })],
    ["A", "Ronde pijlknop", "Enkel een witte ronde knop met een pijltje, zoals de terug- en profielknoppen bovenaan. Rustig, geen tekst die concurreert met de titel.", () => ({ right: `<span style="width:36px;height:36px;border-radius:50%;background:#fff;color:#4f55f1;display:grid;place-items:center;box-shadow:0 1px 2px rgba(16,17,48,.12),0 6px 14px -8px rgba(16,17,48,.35)">${CHEV}</span>` })],
    ["B", "Grijze pil met aantal", "Een zachte grijze pil «81 ›» in donkere tekst: je ziet meteen hoeveel er zijn, zonder schreeuwerig blauw.", (s) => ({ right: `<span style="display:inline-flex;align-items:center;gap:2px;height:30px;padding:0 8px 0 12px;border-radius:999px;background:#e9eaf2;color:#3a3d55;font-weight:700;font-size:14px">${s.count}${CHEV}</span>` })],
    ["C", "Titel is de link", "Geen knop rechts: de titel zelf krijgt een chevron en is tikbaar («Lijstjes ›»). Het minimalistische iOS-patroon.", () => ({ title: `<span style="color:#a3a6bd;display:flex">${CHEV.replace('width="16" height="16"', 'width="22" height="22"')}</span>` })],
    ["D", "Kleine kapitalen", "«ALLES» in kleine, gespatieerde hoofdletters, donkergrijs met een dunne onderlijn. Redactioneel, als een tijdschrift.", () => ({ right: `<span style="font-size:11.5px;font-weight:800;letter-spacing:.12em;color:#3a3d55;border-bottom:1.5px solid #3a3d55;padding-bottom:2px">ALLES</span>` })],
    ["E", "Omlijnde pil", "Een pil met een blauwe rand en blauwe tekst «Toon alle». Duidelijk een knop, licht van gewicht.", (s) => ({ right: `<span style="height:32px;padding:0 14px;border-radius:999px;border:1.5px solid #c9cbf7;color:#4f55f1;font-weight:700;font-size:14px;display:inline-flex;align-items:center">${s.label}</span>` })],
    ["F", "Gevulde kleurpil", "Een volle blauwe pil met witte tekst en pijl: de sterkste call-to-action, voor wie het echt wil laten opvallen.", (s) => ({ right: `<span style="height:32px;padding:0 10px 0 14px;border-radius:999px;background:#4f55f1;color:#fff;font-weight:700;font-size:14px;display:inline-flex;align-items:center;gap:4px;box-shadow:0 6px 14px -6px rgba(79,85,241,.6)">${s.short}${ARROW.replace('width="18" height="18"', 'width="15" height="15"')}</span>` })],
    ["G", "Teller naast de titel", "Het aantal staat als bolletje naast de titel («Lijstjes 81»), rechts alleen een grijze pijl. Info en navigatie gescheiden.", (s) => ({ title: `<span style="min-width:26px;height:22px;padding:0 7px;border-radius:999px;background:#e4e5fb;color:#4f55f1;font-size:12.5px;font-weight:800;display:inline-grid;place-items:center">${s.count}</span>`, right: `<span style="color:#a3a6bd">${ARROW}</span>` })],
    ["H", "Laatste tegel in de rij", "Geen link in de kop: aan het eind van elke rij staat een tegel «Alles bekijken» met een pijl in een bolletje. Je scrolt er vanzelf naartoe.", (s) => ({ row: rowsShort[s.key].replace(/<\/div>$/, `<span class="ta-card s" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;height:auto;min-height:92px;background:#fff"><span style="width:34px;height:34px;border-radius:50%;background:#eef0ff;color:#4f55f1;display:grid;place-items:center">${ARROW}</span><b style="font-size:13px;color:#4f55f1">Alles bekijken</b></span></div>`) })],
    ["I", "Ondertitel met link", "Onder de titel een grijze regel «81 lijstjes · bekijk alle ›». De kop wordt een tikje hoger, maar leest als één zin.", (s) => ({ title: "", sub: `<p style="margin:2px 0 0;font-size:13.5px;color:#7a7e95;display:flex;align-items:center;gap:4px">${s.count} ${s.key === "agenda" ? "afspraken" : s.key === "kalender" ? "dagen" : "lijstjes"} · <span style="color:#4f55f1;font-weight:600;display:inline-flex;align-items:center">bekijk alle${CHEV.replace('width="16" height="16"', 'width="13" height="13"')}</span></p>` })],
    ["J", "Icoonchip", "Een witte chip met een raster-icoon en het aantal, als een mini-knop uit de toolbar. Past bij de weergaveschakelaar naast «Agenda».", (s) => ({ right: `<span style="height:32px;padding:0 11px;border-radius:12px;background:#fff;color:#3a3d55;font-weight:700;font-size:13.5px;display:inline-flex;align-items:center;gap:6px;box-shadow:0 0 0 1px rgba(16,17,48,.08)">${GRID}${s.count}</span>` })],
    ["K", "Grote pijl in de hoek", "Een lange, dunne pijl (→) in titelkleur, zonder tekst of vorm. Speels en grafisch, het gewicht van de titel zelf.", () => ({ right: `<span style="color:#14162b;display:flex">${ARROW.replace('width="18" height="18"', 'width="28" height="28"').replace('stroke-width="2.2"', 'stroke-width="1.8"')}</span>` })],
  ];

  const phone = (fn) =>
    `<div class="ta-phone">${SECTIONS.map((s) => {
      const o = fn(s);
      return `<div class="ta-sec"><div class="ta-hd"><div><h2>${s.title}${o.title ?? ""}</h2>${o.sub ?? ""}</div>${o.right ?? ""}</div>${o.row ?? rows[s.key]}</div>`;
    }).join("")}</div>`;

  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = "left:0;top:0;width:1780px";
  b.innerHTML = `<style>${css}</style><header class="bhd"><span class="bnum">TA</span><div><h2>Startpagina · «Toon alle»-knoppen <span class="tag">11 stijlen + huidige · gsm · 17 okt</span></h2><p>De blauwe tekstlinks naast «Agenda», «Lijstjes» en «Kalender» vallen weg of concurreren met de titel. Elf uiteenlopende richtingen, telkens op dezelfde drie secties; kies er één (of combineer, bv. G + A).</p><p class="uses">Bouwt op: startpagina gsm · ListSectionHeader</p></div></header>
    <div class="ta-opts">${STYLES.map(([k, n, why, fn]) => `<div class="dk-opt"><div class="ag-opthd"><span class="ag-key">${k}</span><div><h3>${n}</h3><p>${why}</p></div></div>${phone(fn)}</div>`).join("")}</div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const top = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${top - 240 - b.offsetHeight}px`;
})();
