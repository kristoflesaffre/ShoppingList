/* Startpagina · Woonkamer: zes lichtere alternatieven voor de tegel «Projectiescherm» (de Bioscoop-tegel weegt te zwaar) · 28 okt. */
(() => {
  const world = document.getElementById("world");
  const INK = "#101130";
  const SUB = "#6b6f85";
  const BLUE = "#4f55f1";
  const BLUE50 = "#edeefe";
  const RED = "#d64040";
  const AMBER = "#ffb547";
  const LINE = "#e2e4e6";
  const GRAY50 = "#f1f1f3";
  const ico = {
    up: (s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg>`,
    down: (s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
    stop: (s = 13) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor"/></svg>`,
    height: (s = 15) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4.5h14"/><path d="m7 15 5-5 5 5"/></svg>`,
    power: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M12 3.5v8M6.6 6.9a7.5 7.5 0 1 0 10.8 0"/></svg>`,
    screen: (s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="11" rx="1.5"/><path d="M3 18.5h18"/></svg>`,
    projector: (s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="9" width="18" height="8" rx="2.5"/><circle cx="15.5" cy="13" r="2"/><path d="M6.5 13h3M7 17v2M17 17v2"/></svg>`,
    sensor: (s = 12) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7M5.6 18.4a9 9 0 0 1 0-12.8M18.4 5.6a9 9 0 0 1 0 12.8"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></svg>`,
    check: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4.5 4.5L19 7"/></svg>`,
    slatsUp: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M15 3.5l-6 5M15 9.5l-6 5M15 15.5l-6 5"/></svg>`,
    slatsOpen: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`,
    slatsDown: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 3.5l6 5M9 9.5l6 5M9 15.5l6 5"/></svg>`,
  };
  const CARD = "background:#fff;box-shadow:0 1px 2px rgba(16,17,48,.04)";
  const FLOAT = "background:#fff;box-shadow:0 1px 2px rgba(16,17,48,.04),0 10px 22px -16px rgba(16,17,48,.45)";
  const SLATS = "repeating-linear-gradient(180deg,#30323e 0,#30323e 3px,#1d1e26 8px,#0b0c10 9px,#30323e 10px)";
  const shadowText = "text-shadow:0 1px 3px rgba(8,9,12,.55)";

  /* Verbonden rail; `horizontal` = omlaag · stop · omhoog. `quiet` = grijze trog zonder schaduw (lichter). */
  const rail = ({ len = 200, thick = 52, horizontal = false, quiet = false, pressed = null } = {}) => {
    const seg = (k) => {
      const on = pressed === k;
      return `<span style="flex:${k === "stop" ? 0.8 : 1};display:grid;place-items:center;color:${k === "stop" ? RED : on ? "#fff" : BLUE};${on ? `background:${BLUE}` : ""}">${k === "stop" ? ico.stop() : ico[k]()}</span>`;
    };
    const div = `<i style="flex:none;${horizontal ? "width:1px;margin:9px 0" : "height:1px;margin:0 10px"};background:${quiet ? "#dcdee6" : LINE}"></i>`;
    const order = horizontal ? ["down", "stop", "up"] : ["up", "stop", "down"];
    return `<div style="display:flex;flex-direction:${horizontal ? "row" : "column"};${horizontal ? `height:${thick}px;width:${len}px` : `width:${thick}px;height:${len}px`};flex:none;border-radius:999px;overflow:hidden;${quiet ? `background:${GRAY50}` : FLOAT}">${order.map(seg).flatMap((s, i) => (i ? [div, s] : [s])).join("")}</div>`;
  };
  const sw = (on = true) => `<span style="position:relative;display:inline-block;flex:none;width:46px;height:28px;border-radius:14px;background:${on ? BLUE : "#e2e4e6"}"><i style="position:absolute;top:3px;left:${on ? 21 : 3}px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25)"></i></span>`;
  const mini = (html, style = "") => `<span style="display:inline-flex;align-items:center;justify-content:center;gap:6px;height:34px;padding:0 14px;border-radius:999px;background:${BLUE50};color:${BLUE};font-size:13px;font-weight:700;white-space:nowrap;${style}">${html}</span>`;
  const status = (text = "Open", style = "") => `<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:${SUB};white-space:nowrap;${style}"><i style="width:7px;height:7px;border-radius:50%;background:#35c27a"></i><b style="color:${INK};font-weight:700">${text}</b>· Hue-sensor</span>`;

  /* Rolluiken zoals ze nu gebouwd zijn (ter vergelijking). */
  const handle = (top) => `<span style="position:absolute;left:50%;top:clamp(22px,${top}%,calc(100% - 22px));transform:translate(-50%,-50%);width:40px;height:40px;border-radius:50%;background:#fff;color:${INK};display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 6px 14px -4px rgba(16,17,48,.55)"><span style="margin:-3px 0">${ico.up(16)}</span><span style="margin:-3px 0">${ico.down(16)}</span></span>`;
  const seg3 = `<div style="display:flex;width:138px;gap:2px;padding:3px;border-radius:13px;background:${GRAY50}">${[ico.slatsUp, ico.slatsOpen, ico.slatsDown].map((s, i) => `<span style="flex:1;height:32px;display:grid;place-items:center;border-radius:10px;color:${i === 2 ? INK : SUB};${i === 2 ? "background:#fff;box-shadow:0 1px 3px rgba(16,17,48,.12)" : ""}">${s}</span>`).join("")}</div>`;
  const blind = (name, pct) => `<div style="display:flex;flex-direction:column;gap:10px"><div style="display:flex;align-items:center;gap:10px">
      <div style="position:relative;width:76px;height:200px;border-radius:38px;overflow:hidden;background:${SLATS}">
        <span style="position:absolute;left:50%;top:20px;transform:translateX(-50%);font-size:10.5px;font-weight:800;white-space:nowrap;color:rgba(255,255,255,.85);${shadowText}">▭ ${pct}%</span>
        <b style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;font-size:13px;color:#fff;${shadowText}">${name}</b>${handle(100)}
      </div>${rail()}</div>${seg3}</div>`;
  const blinds = `<div style="display:flex;gap:24px;flex:none">${blind("Links", 94)}${blind("Rechts", 76)}</div>`;
  const row = (tile) => `<div style="display:flex;gap:28px;align-items:flex-start">${tile}${blinds}</div>`;

  /* Lijntekening van het scherm: dunne lijnen, wit doek, zachte bundel. */
  const lineScreen = ({ w, h, open = true, on = true, stroke = "#c9ccd8", fill = "#fff" } = {}) => {
    const canvasTop = open ? 6 : h - 26;
    return `<div style="position:relative;width:${w}px;height:${h}px">
      ${on ? `<i style="position:absolute;left:50%;bottom:6px;width:${Math.round(w * 0.7)}px;height:${h - 14}px;transform:translateX(-50%);clip-path:polygon(47% 100%,53% 100%,100% 0,0 0);background:linear-gradient(0deg,rgba(255,190,110,.45),rgba(255,200,120,0))"></i>` : ""}
      <i style="position:absolute;left:12%;right:12%;top:${canvasTop}px;bottom:24px;border:1.5px solid ${stroke};border-top:4px solid ${INK};border-radius:4px 4px 0 0;background:${fill};${on && open ? "box-shadow:inset 0 -20px 30px -12px rgba(255,196,120,.45)" : ""}"></i>
      <i style="position:absolute;left:8%;right:8%;bottom:17px;height:7px;border-radius:4px;background:${INK}"></i>
      <i style="position:absolute;left:50%;bottom:2px;width:30px;height:11px;margin-left:-15px;border-radius:4px;border:1.5px solid ${INK};background:#fff;display:grid;place-items:center"><i style="width:4px;height:4px;border-radius:50%;background:${on ? AMBER : "#c9ccd8"}"></i></i>
    </div>`;
  };

  /* 1 · Lijntekening: witte kaart, dunne lijnen, rail liggend in een grijze trog onderaan. */
  const one = () => row(`<div style="width:360px;height:248px;border-radius:20px;${CARD};padding:16px;display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;justify-content:space-between;align-items:center"><b style="font-size:15px;color:${INK}">Scherm</b>${status()}</div>
      <div style="flex:1;display:grid;place-items:center">${lineScreen({ w: 220, h: 110 })}</div>
      <div style="display:flex;align-items:center;gap:8px">${rail({ len: 132, thick: 40, horizontal: true, quiet: true })}${mini(`${ico.height()}Mijn hoogte`, "height:40px;flex:1")}<span style="width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:${GRAY50};color:${INK}">${ico.power()}</span></div>
    </div>`);

  /* 2 · Twee rijen: geen tekening, enkel wat je bedient (zoals een instellingenlijst). */
  const two = () => row(`<div style="width:360px;border-radius:20px;${CARD};padding:6px 14px">
      <div style="display:flex;align-items:center;gap:12px;height:84px;border-bottom:1px solid ${LINE}">
        <span style="width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:${BLUE50};color:${BLUE}">${ico.screen(20)}</span>
        <span style="flex:1;min-width:0"><b style="display:block;font-size:15px;color:${INK}">Scherm</b>${status("Open", "font-size:11.5px")}</span>
        ${rail({ len: 126, thick: 40, horizontal: true, quiet: true })}
      </div>
      <div style="display:flex;align-items:center;gap:12px;height:64px;border-bottom:1px solid ${LINE}">
        <span style="width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:${GRAY50};color:${SUB}">${ico.height(18)}</span>
        <span style="flex:1"><b style="display:block;font-size:15px;color:${INK}">Mijn hoogte</b><span style="font-size:11.5px;color:${SUB}">je opgeslagen hoogte</span></span>
        ${mini("Ga", "height:32px;padding:0 16px")}
      </div>
      <div style="display:flex;align-items:center;gap:12px;height:64px">
        <span style="width:40px;height:40px;border-radius:12px;display:grid;place-items:center;background:#fff4e2;color:#b26b00">${ico.projector(20)}</span>
        <span style="flex:1"><b style="display:block;font-size:15px;color:${INK}">Projector</b><span style="font-size:11.5px;color:${SUB}">Aan</span></span>${sw(true)}
      </div>
    </div>`);

  /* 3 · Los op de pagina: zoals de rolluiken geen kaart, de tekening staat op de achtergrond met de rail ernaast. */
  const three = () => row(`<div style="display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;align-items:center;gap:10px">${rail()}<div style="position:relative;width:250px;height:200px">${lineScreen({ w: 250, h: 200, stroke: "#d4d6e0" })}</div></div>
      <div style="display:flex;align-items:center;gap:8px;padding-left:62px">${status()}</div>
      <div style="display:flex;gap:8px;padding-left:62px">${mini(`${ico.height()}Mijn hoogte`)}${mini(`<i style="width:7px;height:7px;border-radius:50%;background:${AMBER}"></i>Projector aan`, `background:${GRAY50};color:${INK}`)}</div>
    </div>`);

  /* 4 · Lavendel: dezelfde opbouw als nu, maar op een zacht lavendel vlak met witte knoppen. */
  const four = () => row(`<div style="position:relative;width:360px;height:248px;border-radius:24px;overflow:hidden;background:linear-gradient(180deg,#f3f3ff 0%,#e9eafe 100%)">
      <div style="position:absolute;left:16px;top:14px">${status()}</div>
      <div style="position:absolute;left:0;right:0;top:40px;display:grid;place-items:center">${lineScreen({ w: 260, h: 132, stroke: "#cfd1f6" })}</div>
      <div style="position:absolute;left:12px;right:12px;bottom:12px;display:flex;align-items:center;gap:8px">${rail({ len: 132, thick: 44, horizontal: true })}
        <span style="flex:1;height:44px;display:flex;align-items:center;justify-content:center;gap:6px;border-radius:999px;${FLOAT};color:${BLUE};font-size:13px;font-weight:700">${ico.height()}Mijn hoogte</span>
        <span style="width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:${AMBER};color:#3a2400">${ico.power()}</span></div>
    </div>`);

  /* 5 · Drie standen als segmentknop: klein icoon, de stand is de keuze; Stop alleen tijdens het bewegen. */
  const five = () => row(`<div style="width:360px;border-radius:20px;${CARD};padding:16px;display:flex;flex-direction:column;gap:14px">
      <div style="display:flex;align-items:center;gap:12px"><span style="width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:${BLUE50};color:${BLUE}">${ico.screen(22)}</span>
        <span style="flex:1"><b style="display:block;font-size:15px;color:${INK}">Projectiescherm</b>${status("Mijn hoogte", "font-size:11.5px")}</span></div>
      <div style="display:flex;gap:2px;padding:3px;border-radius:13px;background:${GRAY50}">${["Dicht", "Mijn hoogte", "Open"].map((t, i) => `<span style="flex:1;height:38px;display:grid;place-items:center;border-radius:10px;font-size:13.5px;font-weight:600;color:${i === 1 ? INK : SUB};${i === 1 ? "background:#fff;box-shadow:0 1px 3px rgba(16,17,48,.12)" : ""}">${t}</span>`).join("")}</div>
      <p style="margin:-6px 0 0;font-size:11.5px;color:${SUB}">Tijdens het bewegen wordt de gekozen optie <b style="color:${RED}">■ Stop</b>.</p>
      <div style="display:flex;align-items:center;justify-content:space-between;border-top:1px solid ${LINE};padding-top:12px"><span style="display:flex;align-items:center;gap:10px;font-size:14px;font-weight:700;color:${INK}"><span style="color:#b26b00">${ico.projector(20)}</span>Projector</span>${sw(true)}</div>
    </div>`);

  /* 6 · Even hoog als de rolluiken: een smalle capsule met het doek, rail ernaast, en de projector als pil eronder. */
  const six = () => row(`<div style="display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="position:relative;width:150px;height:200px;border-radius:30px;overflow:hidden;background:${GRAY50}">
          <div style="position:absolute;left:0;right:0;top:12px;display:grid;place-items:center">${lineScreen({ w: 136, h: 176, stroke: "#d4d6e0" })}</div>
          <span style="position:absolute;left:50%;top:18px;transform:translateX(-50%);display:flex;align-items:center;gap:4px;height:22px;padding:0 8px;border-radius:999px;background:#fff;font-size:11px;font-weight:700;color:${INK};white-space:nowrap"><i style="width:6px;height:6px;border-radius:50%;background:#35c27a"></i>Open</span>
        </div>${rail()}
      </div>
      <div style="display:flex;width:212px;gap:2px;padding:3px;border-radius:13px;background:${GRAY50}">
        <span style="flex:1;height:32px;display:flex;align-items:center;justify-content:center;gap:5px;border-radius:10px;font-size:12.5px;font-weight:600;color:${SUB}">${ico.height(14)}Hoogte</span>
        <span style="flex:1;height:32px;display:flex;align-items:center;justify-content:center;gap:5px;border-radius:10px;font-size:12.5px;font-weight:600;color:${INK};background:#fff;box-shadow:0 1px 3px rgba(16,17,48,.12)"><i style="width:7px;height:7px;border-radius:50%;background:${AMBER}"></i>Projector</span>
      </div>
    </div>`);

  const V = [
    { key: "1", name: "Lijntekening", why: "Een witte kaart zoals de andere kaarten op de pagina. Het scherm is een dunne lijntekening met een witte doek en een zachte bundel. De bediening ligt als een lichte grijze trog onderaan: omlaag · stop · omhoog, Mijn hoogte en een rond aan/uit-knopje.", html: one },
    { key: "2", name: "Drie rijen", why: "Geen tekening, enkel wat je bedient: een rij per functie, zoals een instellingenlijst. Scherm met de liggende rail, Mijn hoogte met één knop, Projector met de gewone schakelaar. Het lichtste en het rustigst naast de rolluiken.", html: two },
    { key: "3", name: "Los op de pagina", why: "Net als de rolluiken staat het scherm zonder kaart op de achtergrond: rail links (dezelfde als bij de rolluiken), de lijntekening ernaast, en twee kleine pillen eronder voor Mijn hoogte en de projector.", html: three },
    { key: "4", name: "Lavendel", why: "De opbouw van de Bioscoop-tegel die je nu hebt, maar op een zacht lavendel vlak met witte knoppen en de lijntekening. Herkenbaar als «scherm», zonder het zware donkere blok.", html: four },
    { key: "5", name: "Drie standen", why: "Het scherm stopt in de praktijk op drie plaatsen. Een segmentknop Dicht · Mijn hoogte · Open toont de stand (Hue-sensor) en is meteen de bediening; tijdens het bewegen wordt de gekozen optie een Stop-knop. De projector is een rij met een schakelaar.", html: five },
    { key: "6", name: "Zelfde ritme als de rolluiken", why: "Een smallere lichtgrijze capsule (even hoog als de rolluiken) met de lijntekening, de witte rail ernaast en een segmentknop eronder (Mijn hoogte · Projector), op de plaats van de lamellenknop. De hele rij leest als vier gelijke toestellen.", html: six },
  ];
  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = "left:0;top:0;width:1760px";
  b.innerHTML = `<style>.sl-opts{display:grid;grid-template-columns:repeat(2,840px);gap:56px 40px}.sl-stage{background:#f4f5fa;border-radius:26px;padding:24px;min-height:300px}.sl-stage *{box-sizing:border-box}.sl-opt .ag-opthd p{max-width:760px}</style><header class="bhd"><span class="bnum">SL</span><div><h2>Startpagina · tegel «Projectiescherm», lichter <span class="tag">6 voorstellen · 28 okt</span></h2><p>De donkere Bioscoop-tegel (ST · 2) weegt te zwaar naast de rolluiken. Zes lichtere richtingen: witte of zachte vlakken, een lijntekening in plaats van een donker blok, en de bediening uit dezelfde bouwstenen. Het scherm is open volgens de Hue-sensor, de projector staat aan. De rolluiken staan erbij zoals ze nu gebouwd zijn.</p><p class="uses">Bouwt op: ControlRail, SegmentedControl, Switch, MiniButton · ST Projectiescherm</p></div></header>
    <div class="sl-opts" style="margin-top:28px">${V.map((v) => `<div class="sl-opt"><div class="ag-opthd"><span class="ag-key">${v.key}</span><div><h3>${v.name}</h3><p>${v.why}</p></div></div><div class="sl-stage">${v.html()}</div></div>`).join("")}</div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const topY = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${topY - 240 - b.offsetHeight}px`;
})();
