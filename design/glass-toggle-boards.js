/* Dashboard (avond, zonsondergang): zes glasvoorstellen voor de schakelaar Overzicht/Dashboard rechtsboven · 18 okt. */
(() => {
  const world = document.getElementById("world");
  const SKY = "linear-gradient(180deg,#ff9b5c 0%,#f2697a 55%,#d65a8e 100%)";
  const LIST = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/></svg>';
  const GRID = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/></svg>';

  const css = `
  .gt-opts{display:grid;grid-template-columns:repeat(2,1000px);gap:40px 36px}
  .gt-strip{position:relative;width:1000px;height:190px;border-radius:26px;overflow:hidden;background:${SKY};font-family:Inter,system-ui,sans-serif;color:#fff}
  .gt-strip:before{content:"";position:absolute;right:120px;top:-80px;width:300px;height:300px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,224,140,.75),rgba(255,170,90,0))}
  .gt-head{position:absolute;left:28px;top:34px;display:flex;align-items:center;gap:18px}
  .gt-ava{width:64px;height:64px;border-radius:50%;background:#1d1d24;box-shadow:0 0 0 4px #fff}
  .gt-clock{font-size:64px;font-weight:800;letter-spacing:-.04em;line-height:1}
  .gt-greet em{display:block;font-style:normal;font-size:15px;opacity:.75}.gt-greet b{font-size:28px;letter-spacing:-.02em}
  .gt-tog{position:absolute;right:26px;top:40px}
  .gt-card{position:absolute;left:28px;right:28px;bottom:-60px;height:90px;border-radius:24px;background:rgba(255,255,255,.2);box-shadow:inset 0 0 0 1px rgba(255,255,255,.42)}
  .gt-seg{display:inline-flex;align-items:center;position:relative;font-size:15px;font-weight:700}
  .gt-seg span{position:relative;z-index:1;display:inline-flex;align-items:center;gap:6px}
  `;
  // Elke stijl geeft de HTML van de schakelaar (Dashboard actief).
  const seg = (wrap, on, off, labels = ["Overzicht", "Dashboard"]) =>
    `<span class="gt-seg" style="${wrap}"><span style="${off}">${labels[0]}</span><span style="${on}">${labels[1]}</span></span>`;

  const STYLES = [
    ["0", "Nu (referentie)", "De gewone grijze schakelaar met witte pil: past op de lichte startpagina, maar valt hier als een vreemd vlak op de lucht.",
      seg("padding:3px;border-radius:13px;background:#f1f1f3;gap:2px", "padding:7px 14px;border-radius:10px;background:#fff;color:#14162b;box-shadow:0 1px 3px rgba(16,17,48,.12)", "padding:7px 14px;color:#6b7084")],
    ["G1", "Matglas met witte pil", "Hetzelfde glas als de tegels (wit 20%, witte rand), de gekozen weergave als stevige witte pil met donkere tekst. Duidelijkst leesbaar.",
      seg("padding:4px;border-radius:999px;background:rgba(255,255,255,.2);box-shadow:inset 0 0 0 1px rgba(255,255,255,.45);backdrop-filter:blur(14px);gap:2px", "padding:8px 16px;border-radius:999px;background:rgba(255,255,255,.92);color:#5a2a4a;box-shadow:0 6px 14px -8px rgba(80,20,60,.6)", "padding:8px 16px;color:rgba(255,255,255,.88)")],
    ["G2", "Glas op glas", "Alles wit: de container is licht glas, de gekozen weergave een helderder glasplaatje met witte, vette tekst. Het meest ingetogen en «één met de lucht».",
      seg("padding:4px;border-radius:999px;background:rgba(255,255,255,.14);box-shadow:inset 0 0 0 1px rgba(255,255,255,.32);backdrop-filter:blur(14px);gap:2px", "padding:8px 16px;border-radius:999px;background:rgba(255,255,255,.34);color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.6),0 6px 16px -10px rgba(80,20,60,.7)", "padding:8px 16px;color:rgba(255,255,255,.72);font-weight:600")],
    ["G3", "Rookglas", "Een donker getinte glaspil (zoals de testbalk bovenaan), met een witte pil voor de keuze. Meer contrast tegen de felle lucht.",
      seg("padding:4px;border-radius:999px;background:rgba(30,12,48,.28);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18);backdrop-filter:blur(14px);gap:2px", "padding:8px 16px;border-radius:999px;background:#fff;color:#2a1838", "padding:8px 16px;color:rgba(255,255,255,.85)")],
    ["G4", "Enkel een glazen rand", "Geen vulling: alleen een dunne witte rand rond de schakelaar, de keuze als zacht glasplaatje. Luchtig, laat de achtergrond maximaal zien.",
      seg("padding:4px;border-radius:999px;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.6);gap:2px", "padding:8px 16px;border-radius:999px;background:rgba(255,255,255,.26);color:#fff;backdrop-filter:blur(10px)", "padding:8px 16px;color:rgba(255,255,255,.8);font-weight:600")],
    ["G5", "Tabs met glazen streepje", "Geen pil: twee witte woorden naast elkaar, de keuze vet met een glanzend wit streepje eronder. Het lichtst van gewicht, als tabs in een fotoapp.",
      `<span class="gt-seg" style="gap:22px;font-size:16px"><span style="color:rgba(255,255,255,.7);font-weight:600;padding-bottom:8px">Overzicht</span><span style="color:#fff;padding-bottom:8px;box-shadow:inset 0 -3px 0 rgba(255,255,255,.95);filter:drop-shadow(0 2px 6px rgba(80,20,60,.35))">Dashboard</span></span>`],
    ["G6", "Iconen in glas, label bij keuze", "Glazen pil met twee iconen (lijst · tegels); enkel de gekozen weergave toont ook haar naam, in een witte pil. Compact en speels.",
      seg("padding:4px;border-radius:999px;background:rgba(255,255,255,.2);box-shadow:inset 0 0 0 1px rgba(255,255,255,.45);backdrop-filter:blur(14px);gap:2px", "padding:8px 14px 8px 11px;border-radius:999px;background:rgba(255,255,255,.92);color:#5a2a4a", "padding:8px 11px;color:#fff", [LIST, `${GRID}Dashboard`])],
  ];

  const strip = (tog) =>
    `<div class="gt-strip"><div class="gt-head"><span class="gt-ava"></span><span class="gt-clock">07:26</span><span class="gt-greet"><em>Zondag 18 oktober</em><b>Goedemorgen, Kristof</b></span></div><div class="gt-tog">${tog}</div><div class="gt-card"></div></div>`;

  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = "left:0;top:0;width:2040px";
  b.innerHTML = `<style>${css}</style><header class="bhd"><span class="bnum">GT</span><div><h2>Dashboard · schakelaar Overzicht/Dashboard in glas <span class="tag">6 voorstellen + huidige · avond · 18 okt</span></h2><p>Op de zonsondergang-achtergrond valt de grijze schakelaar rechtsboven uit de toon. Zes glasvarianten in de stijl van de tegels; de gewone startpagina houdt de huidige schakelaar.</p><p class="uses">Bouwt op: dashboard avond · C1 Avondrood</p></div></header>
    <div class="gt-opts">${STYLES.map(([k, n, why, tog]) => `<div class="dk-opt"><div class="ag-opthd"><span class="ag-key">${k}</span><div><h3>${n}</h3><p>${why}</p></div></div>${strip(tog)}</div>`).join("")}</div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const top = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${top - 240 - b.offsetHeight}px`;
})();
