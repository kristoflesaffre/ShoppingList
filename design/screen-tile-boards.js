/* Startpagina · Woonkamer: zes alternatieven voor de tegel «Projectiescherm», telkens naast de rolluiken · 27 okt. */
(() => {
  const world = document.getElementById("world");
  const INK = "#101130";
  const SUB = "#6b6f85";
  const BLUE = "#4f55f1";
  const RED = "#d64040";
  const AMBER = "#ffb547";
  const LINE = "#e2e4e6";
  const ico = {
    up: (s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg>`,
    down: (s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
    stop: (s = 14) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor"/></svg>`,
    height: (s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4.5h14"/><path d="m7 15 5-5 5 5"/></svg>`,
    power: (s = 20, w = 2.3) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round"><path d="M12 3.5v8M6.6 6.9a7.5 7.5 0 1 0 10.8 0"/></svg>`,
    film: (s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M8 5v14M16 5v14M3 10h5M3 14h5M16 10h5M16 14h5"/></svg>`,
    sensor: (s = 12) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M8.5 15.5a5 5 0 0 1 0-7M15.5 8.5a5 5 0 0 1 0 7M5.6 18.4a9 9 0 0 1 0-12.8M18.4 5.6a9 9 0 0 1 0 12.8"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/></svg>`,
    chev: (s = 14) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>`,
    slatsUp: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M15 3.5l-6 5M15 9.5l-6 5M15 15.5l-6 5"/></svg>`,
    slatsOpen: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`,
    slatsDown: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 3.5l6 5M9 9.5l6 5M9 15.5l6 5"/></svg>`,
  };
  const CARD = "background:#fff;box-shadow:0 1px 2px rgba(16,17,48,.04),0 10px 22px -16px rgba(16,17,48,.45)";
  const SLATS = "repeating-linear-gradient(180deg,#30323e 0,#30323e 3px,#1d1e26 8px,#0b0c10 9px,#30323e 10px)";
  const SKY = "linear-gradient(180deg,#a9cdfb,#fde7c4)";
  const shadowText = "text-shadow:0 1px 3px rgba(8,9,12,.55)";

  /* Verbonden bedieningsrail (zoals bij de rolluiken). `pressed` = "up" | "down". */
  const rail = ({ h = 200, w = 52, pressed = null, horizontal = false, glass = false } = {}) => {
    const seg = (k) => {
      const on = pressed === k;
      const color = k === "stop" ? (glass ? "#ffb4a8" : RED) : on ? "#fff" : glass ? "#fff" : BLUE;
      return `<span style="flex:${k === "stop" ? 0.8 : 1};display:grid;place-items:center;color:${color};${on ? `background:${BLUE};box-shadow:inset 0 2px 6px rgba(16,17,48,.28)` : ""}">${k === "stop" ? ico.stop() : ico[k](horizontal ? 20 : 22)}</span>`;
    };
    const div = `<i style="flex:none;${horizontal ? "width:1px;margin:10px 0" : "height:1px;margin:0 10px"};background:${glass ? "rgba(255,255,255,.2)" : LINE}"></i>`;
    const order = horizontal ? ["down", "stop", "up"] : ["up", "stop", "down"];
    return `<div style="display:flex;flex-direction:${horizontal ? "row" : "column"};${horizontal ? `height:${w}px;width:${h}px` : `width:${w}px;height:${h}px`};border-radius:999px;overflow:hidden;${glass ? "background:rgba(255,255,255,.12);box-shadow:inset 0 0 0 1px rgba(255,255,255,.16);backdrop-filter:blur(6px)" : CARD}">${order.map(seg).flatMap((s, i) => (i ? [div, s] : [s])).join("")}</div>`;
  };
  const handle = (top) => `<span style="position:absolute;left:50%;top:clamp(22px,${top}%,calc(100% - 22px));transform:translate(-50%,-50%);width:40px;height:40px;border-radius:50%;background:#fff;color:${INK};display:flex;flex-direction:column;align-items:center;justify-content:center;box-shadow:0 6px 14px -4px rgba(16,17,48,.55)"><span style="margin:-3px 0">${ico.up(16)}</span><span style="margin:-3px 0">${ico.down(16)}</span></span>`;
  const battery = (pct) => `<span style="position:absolute;left:50%;top:20px;transform:translateX(-50%);display:flex;align-items:center;gap:4px;font-size:10.5px;font-weight:800;color:rgba(255,255,255,.85);${shadowText}"><svg width="22" height="11" viewBox="0 0 24 12"><rect x=".75" y=".75" width="19.5" height="10.5" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="21.5" y="3.5" width="2" height="5" rx="1" fill="currentColor"/><rect x="2.5" y="2.5" width="${(16 * pct) / 100}" height="7" rx="1.5" fill="currentColor"/></svg>${pct}%</span>`;
  const seg3 = (active = 2, w = 138) => `<div style="display:flex;width:${w}px;gap:2px;padding:3px;border-radius:13px;background:#f1f1f3">${[ico.slatsUp, ico.slatsOpen, ico.slatsDown].map((s, i) => `<span style="flex:1;height:32px;display:grid;place-items:center;border-radius:10px;color:${i === active ? INK : SUB};${i === active ? "background:#fff;box-shadow:0 1px 3px rgba(16,17,48,.12)" : ""}">${s}</span>`).join("")}</div>`;
  /* Rolluik zoals nu gebouwd: capsule + rail + lamellen. */
  const blind = (name, closed, pct) => `<div style="display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="position:relative;width:76px;height:200px;border-radius:38px;overflow:hidden;background:${SKY};box-shadow:inset 0 0 0 1px rgba(16,17,48,.06),0 10px 22px -16px rgba(16,17,48,.45)">
          <i style="position:absolute;left:0;right:0;top:0;height:${closed}%;background:${SLATS};box-shadow:0 3px 0 #08090c"></i>
          ${battery(pct)}
          <b style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;font-size:13px;color:#fff;${shadowText}">${name}</b>
          ${handle(closed)}
        </div>${rail()}
      </div>${seg3()}</div>`;
  const blinds = `<div style="display:flex;gap:24px">${blind("Links", 100, 94)}${blind("Rechts", 100, 76)}</div>`;

  /* Wit doek dat van onder uit de kast komt, met projector en bundel. Geschaald naar elke tegel. */
  const sceneScreen = ({ w, h, open = true, on = true, dark = false, casing = true, projector = true, beamTo = 0.08 } = {}) => {
    const floor = projector ? 30 : 12;
    const canvasH = open ? Math.round(h - floor - 24 - h * beamTo) : 0;
    return `<div style="position:relative;width:${w}px;height:${h}px">
      ${on && projector ? `<i style="position:absolute;left:50%;bottom:10px;width:${Math.round(w * 0.78)}px;height:${h - 16}px;transform:translateX(-50%);clip-path:polygon(47% 100%,53% 100%,100% 0,0 0);background:linear-gradient(0deg,rgba(255,190,110,${dark ? 0.55 : 0.8}),rgba(255,200,120,0))"></i>` : ""}
      <i style="position:absolute;left:12%;right:12%;bottom:${floor + 10}px;height:${canvasH}px;border-radius:5px 5px 0 0;background:linear-gradient(180deg,#fff,#f6f4ef);box-shadow:0 0 0 1px rgba(16,17,48,.08),0 0 ${on ? 28 : 0}px ${on ? 4 : 0}px rgba(255,205,140,${dark ? 0.45 : 0.25})">
        <i style="position:absolute;left:0;right:0;top:0;height:5px;border-radius:5px 5px 0 0;background:#2a2c44"></i>
        ${on && open ? `<i style="position:absolute;inset:6px;border-radius:3px;background:radial-gradient(90% 100% at 50% 100%,rgba(255,196,120,.55),rgba(255,236,200,.16) 75%)"></i>` : ""}
      </i>
      ${casing ? `<i style="position:absolute;left:9%;right:9%;bottom:${floor}px;height:11px;border-radius:6px;background:${dark ? "#0b0c18;box-shadow:inset 0 1px 0 rgba(255,255,255,.14)" : "#2a2c44"}"></i>` : ""}
      ${projector ? `<i style="position:absolute;left:50%;bottom:6px;width:44px;height:17px;margin-left:-22px;border-radius:6px;background:#3a3c52;display:grid;place-items:center;box-shadow:0 4px 8px -4px rgba(16,17,48,.6)"><i style="width:7px;height:7px;border-radius:50%;background:${on ? "#ffd28a;box-shadow:0 0 8px 2px rgba(255,200,120,.9)" : "#5d6078"}"></i></i>` : ""}
    </div>`;
  };
  const sw = (on = true, color = BLUE) => `<span style="position:relative;display:inline-block;width:46px;height:28px;border-radius:14px;background:${on ? color : "#e2e4e6"}"><i style="position:absolute;top:3px;left:${on ? 21 : 3}px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.25)"></i></span>`;
  const chip = (text, style = "") => `<span style="display:inline-flex;align-items:center;gap:6px;height:26px;padding:0 10px;border-radius:999px;font-size:12px;font-weight:700;white-space:nowrap;${style}">${text}</span>`;
  const sensorChip = (dark = false) => chip(`<i style="width:7px;height:7px;border-radius:50%;background:#35c27a;box-shadow:0 0 0 3px rgba(53,194,122,.2)"></i>Open · Hue-sensor`, dark ? "background:rgba(255,255,255,.12);color:#fff" : `background:#eaf8f0;color:#1f7a4a`);

  /* 1 · Doekcapsule: het scherm in dezelfde vorm als een rolluik, maar het doek komt van onder. */
  const one = () => `<div style="display:flex;gap:28px;align-items:flex-start">
    <div style="display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="position:relative;width:200px;height:200px;border-radius:38px;overflow:hidden;background:linear-gradient(180deg,#ece9f5,#f7f2ea);box-shadow:inset 0 0 0 1px rgba(16,17,48,.06),0 10px 22px -16px rgba(16,17,48,.45)">
          ${sceneScreen({ w: 200, h: 200, open: true, on: true, beamTo: 0.1 })}
          <i style="position:absolute;left:14px;right:14px;top:40px;border-top:2px dashed rgba(79,85,241,.55)"></i>
          ${chip(`${ico.height(13)}Mijn hoogte`, `position:absolute;right:12px;top:28px;height:24px;background:#fff;color:${BLUE};box-shadow:0 4px 10px -6px rgba(16,17,48,.4)`)}
          <b style="position:absolute;left:0;right:0;top:96px;text-align:center;font-size:13px;color:${INK}">Scherm</b>
        </div>${rail({ pressed: null })}
      </div>
      <div style="display:flex;width:262px;gap:2px;padding:3px;border-radius:13px;background:#f1f1f3">
        <span style="flex:1;height:32px;display:flex;align-items:center;justify-content:center;gap:6px;border-radius:10px;font-size:13px;font-weight:600;color:${SUB}">${ico.power(15)}Uit</span>
        <span style="flex:1;height:32px;display:flex;align-items:center;justify-content:center;gap:6px;border-radius:10px;font-size:13px;font-weight:600;color:${INK};background:#fff;box-shadow:0 1px 3px rgba(16,17,48,.12)"><i style="width:7px;height:7px;border-radius:50%;background:${AMBER};box-shadow:0 0 6px ${AMBER}"></i>Projector aan</span>
      </div>
    </div>${blinds}</div>`;

  /* 2 · Bioscoop: een donkere tegel, het doek licht op; bediening als glazen balk onderaan. */
  const two = () => `<div style="display:flex;gap:28px;align-items:flex-start">
    <div style="position:relative;width:340px;height:242px;border-radius:28px;overflow:hidden;background:radial-gradient(120% 90% at 50% 0%,#2a2f55 0%,#171a33 55%,#0f1124 100%);box-shadow:0 18px 36px -22px rgba(16,17,48,.7)">
      <div style="position:absolute;left:0;right:0;top:12px">${sceneScreen({ w: 340, h: 170, open: true, on: true, dark: true, beamTo: 0.04 })}</div>
      <div style="position:absolute;left:16px;top:14px">${sensorChip(true)}</div>
      <div style="position:absolute;left:12px;right:12px;bottom:12px;display:flex;align-items:center;gap:8px">
        ${rail({ h: 132, w: 44, horizontal: true, glass: true })}
        <span style="flex:1;height:44px;display:flex;align-items:center;justify-content:center;gap:6px;border-radius:999px;background:rgba(255,255,255,.12);box-shadow:inset 0 0 0 1px rgba(255,255,255,.16);color:#fff;font-size:13px;font-weight:800">${ico.height(15)}Mijn hoogte</span>
        <span style="width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:${AMBER};color:#3a2400;box-shadow:0 0 18px rgba(255,181,71,.6)">${ico.power(20)}</span>
      </div>
    </div>${blinds}</div>`;

  /* 3 · Twee toestellen: een kaart voor het scherm, een kaart voor de projector. */
  const three = () => `<div style="display:flex;gap:28px;align-items:flex-start">
    <div style="display:flex;gap:12px">
      <div style="width:200px;height:242px;border-radius:24px;${CARD};padding:16px;display:flex;flex-direction:column;justify-content:space-between">
        <div><p style="margin:0;font-size:12px;font-weight:700;color:${SUB}">Scherm</p><p style="margin:2px 0 0;font-size:24px;font-weight:800;color:${INK};letter-spacing:-.01em">Open</p>
          <p style="margin:4px 0 0;display:flex;align-items:center;gap:5px;font-size:11.5px;font-weight:600;color:#1f7a4a">${ico.sensor()}Hue-sensor · zonet</p></div>
        <div style="position:relative;height:62px;border-radius:12px;background:#f4f3f8;overflow:hidden">${sceneScreen({ w: 168, h: 62, open: true, on: false, projector: false })}</div>
        <div style="display:flex;flex-direction:column;gap:8px">${rail({ h: 168, w: 40, horizontal: true })}
          <span style="display:flex;align-items:center;justify-content:center;gap:6px;height:30px;border-radius:999px;background:${"#edeefe"};color:${BLUE};font-size:12.5px;font-weight:700">${ico.height(14)}Mijn hoogte</span></div>
      </div>
      <div style="width:128px;height:242px;border-radius:24px;background:linear-gradient(180deg,#2b2d44,#1b1c2e);padding:16px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;color:#fff;box-shadow:0 18px 36px -22px rgba(16,17,48,.7)">
        <p style="margin:0;align-self:flex-start;font-size:12px;font-weight:700;color:rgba(255,255,255,.6)">Projector</p>
        <span style="position:relative;width:84px;height:84px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 50% 40%,#ffe2ad,#ffb547 60%,#e88a1a);color:#3a2400;box-shadow:0 0 0 6px rgba(255,181,71,.18),0 0 36px rgba(255,181,71,.55)">${ico.power(30, 2.4)}</span>
        <div style="text-align:center"><p style="margin:0;font-size:18px;font-weight:800">Aan</p><p style="margin:2px 0 0;font-size:11.5px;color:rgba(255,255,255,.6)">tik om uit te zetten</p></div>
      </div>
    </div>${blinds}</div>`;

  /* 4 · Drie standen: het scherm kent eigenlijk maar drie plaatsen; kies er één, Stop verschijnt tijdens het bewegen. */
  const stop4 = (label, sub, active, moving = false) => `<div style="display:flex;align-items:center;gap:10px;height:54px;padding:0 12px 0 14px;border-radius:16px;${active ? `background:#edeefe;box-shadow:inset 0 0 0 2px ${BLUE}` : "background:#fff"}">
      <span style="flex:1"><b style="display:block;font-size:14px;color:${INK}">${label}</b><span style="font-size:11.5px;color:${active ? BLUE : SUB};font-weight:${active ? 700 : 500}">${sub}</span></span>
      ${moving ? `<span style="height:30px;padding:0 12px;border-radius:999px;display:flex;align-items:center;gap:6px;background:#fff6f5;color:${RED};font-size:12px;font-weight:800">${ico.stop(11)}Stop</span>` : active ? `<span style="width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:${BLUE};color:#fff"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4.5 4.5L19 7"/></svg></span>` : `<span style="width:22px;height:22px;border-radius:50%;box-shadow:inset 0 0 0 2px #d4d6e0"></span>`}
    </div>`;
  const four = () => `<div style="display:flex;gap:28px;align-items:flex-start">
    <div style="width:330px;display:flex;gap:12px">
      <div style="position:relative;width:96px;height:242px;border-radius:24px;overflow:hidden;background:linear-gradient(180deg,#ece9f5,#f7f2ea);${CARD}">${sceneScreen({ w: 96, h: 242, open: true, on: true, beamTo: 0.04 })}</div>
      <div style="flex:1;display:flex;flex-direction:column;gap:6px;padding:6px;border-radius:22px;background:#f1f1f3">
        ${stop4("Helemaal open", "omhoog tot de bovenkant", false)}
        ${stop4("Mijn hoogte", "nu · Hue-sensor", true)}
        ${stop4("Dicht", "in de kast", false)}
        <div style="display:flex;align-items:center;justify-content:space-between;height:44px;padding:0 6px 0 12px"><b style="font-size:13.5px;color:${INK}">Projector</b>${sw(true)}</div>
      </div>
    </div>${blinds}</div>`;

  /* 5 · Alles in capsules: scherm en projector krijgen dezelfde vorm als de rolluiken; één rij van gelijke toestellen. */
  const five = () => `<div style="display:flex;gap:22px;align-items:flex-start">
    <div style="display:flex;flex-direction:column;gap:10px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="position:relative;width:76px;height:200px;border-radius:38px;overflow:hidden;background:linear-gradient(180deg,#ece9f5,#f7f2ea);box-shadow:inset 0 0 0 1px rgba(16,17,48,.06),0 10px 22px -16px rgba(16,17,48,.45)">
          <i style="position:absolute;left:10px;right:10px;bottom:14px;height:150px;border-radius:6px 6px 0 0;background:linear-gradient(180deg,#fff,#f6f4ef);box-shadow:0 0 0 1px rgba(16,17,48,.08),0 0 22px 2px rgba(255,205,140,.3)"><i style="position:absolute;left:0;right:0;top:0;height:5px;border-radius:6px 6px 0 0;background:#2a2c44"></i><i style="position:absolute;inset:6px;border-radius:3px;background:radial-gradient(90% 100% at 50% 100%,rgba(255,196,120,.5),rgba(255,236,200,.14) 75%)"></i></i>
          <i style="position:absolute;left:6px;right:6px;bottom:6px;height:10px;border-radius:5px;background:#2a2c44"></i>
          <b style="position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);text-align:center;font-size:13px;color:${INK}">Scherm</b>
          <i style="position:absolute;left:10px;right:10px;top:36px;border-top:2px dashed rgba(79,85,241,.55)"></i>
        </div>${rail()}
      </div>
      <span style="display:flex;align-items:center;justify-content:center;gap:6px;height:38px;border-radius:13px;background:#f1f1f3;color:${BLUE};font-size:13px;font-weight:700">${ico.height(15)}Mijn hoogte</span>
    </div>
    <div style="display:flex;flex-direction:column;gap:10px">
      <div style="position:relative;width:76px;height:200px;border-radius:38px;overflow:hidden;background:linear-gradient(180deg,#2b2d44,#14152a);box-shadow:0 10px 22px -12px rgba(16,17,48,.6)">
        <i style="position:absolute;left:50%;bottom:44px;width:76px;height:150px;transform:translateX(-50%);clip-path:polygon(44% 100%,56% 100%,100% 0,0 0);background:linear-gradient(0deg,rgba(255,190,110,.7),rgba(255,200,120,0))"></i>
        <b style="position:absolute;left:0;right:0;top:22px;text-align:center;font-size:13px;color:#fff">Projector</b>
        <span style="position:absolute;left:50%;bottom:16px;transform:translateX(-50%);width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:${AMBER};color:#3a2400;box-shadow:0 0 18px rgba(255,181,71,.7)">${ico.power(20)}</span>
      </div>
      <span style="display:flex;align-items:center;justify-content:center;height:38px;border-radius:13px;background:#f1f1f3;font-size:13px;font-weight:700;color:${INK}">Aan</span>
    </div>${blinds}</div>`;

  /* 6 · Filmavond eerst: één grote knop voor de hele avond, de losse toestellen als statuschips eronder. */
  const six = () => `<div style="display:flex;gap:28px;align-items:flex-start">
    <div style="width:330px;height:242px;border-radius:28px;overflow:hidden;position:relative;background:linear-gradient(160deg,#272b52 0%,#1a1d38 60%,#2c1f33 100%);box-shadow:0 18px 36px -22px rgba(16,17,48,.7);color:#fff">
      <div style="position:absolute;right:-6px;top:4px;opacity:.95">${sceneScreen({ w: 170, h: 132, open: true, on: true, dark: true })}</div>
      <div style="position:absolute;left:18px;top:18px;width:150px"><p style="margin:0;font-size:11px;font-weight:800;letter-spacing:.08em;color:rgba(255,255,255,.6)">WOONKAMER</p><p style="margin:4px 0 0;font-size:22px;font-weight:800;line-height:1.1;letter-spacing:-.01em">Film loopt</p><p style="margin:6px 0 0;font-size:12px;line-height:1.35;color:rgba(255,255,255,.7)">Scherm op je hoogte, projector aan, rolluiken dicht</p></div>
      <div style="position:absolute;left:14px;right:14px;bottom:14px;display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;gap:6px">
          ${chip(`${ico.height(13)}Scherm`, "background:rgba(255,255,255,.14);color:#fff")}
          ${chip(`<i style="width:7px;height:7px;border-radius:50%;background:${AMBER}"></i>Projector`, "background:rgba(255,255,255,.14);color:#fff")}
          ${chip(`Handmatig ${ico.chev(12)}`, "background:transparent;color:rgba(255,255,255,.75)")}
        </div>
        <span style="height:46px;border-radius:999px;display:flex;align-items:center;justify-content:center;gap:8px;background:#fff;color:${INK};font-size:15px;font-weight:800">${ico.stop(13)}Film stoppen</span>
      </div>
    </div>${blinds}</div>`;

  const V = [
    { key: "1", name: "Doekcapsule", why: "Het scherm krijgt de vorm van een rolluik-capsule (breder) met dezelfde rail ernaast, en het doek komt van onder in plaats van van boven. Mijn hoogte is een stippellijn met een label dat je aantikt. De projector zit eronder in een segmentknop, net zoals de lamellen onder de rolluiken. Geen sleepgreep: het scherm kent geen hoogte, alleen open/dicht.", html: one },
    { key: "2", name: "Bioscoop", why: "Een donkere tegel waarin het doek oplicht als de projector aan is: de enige donkere plek op de pagina, en dus meteen herkenbaar als «film». De bediening ligt als glazen balk onderaan: omlaag · stop · omhoog, Mijn hoogte en een amberkleurige aan/uit-knop. Bovenaan de stand volgens de Hue-sensor.", html: two },
    { key: "3", name: "Twee toestellen", why: "Scherm en projector zijn twee apparaten, dus twee kaarten. Het scherm: grote status «Open» met de sensorbron, een klein beeld en een liggende rail. De projector: één grote gloeiende aan/uit-knop. Geen schakelaar meer die over de tekening zweeft.", html: three },
    { key: "4", name: "Drie standen", why: "Het scherm stopt in de praktijk op drie plaatsen: helemaal open, Mijn hoogte of dicht. Kies er één als een keuzerij (zoals ChoiceRow); de Hue-sensor vinkt de huidige aan. Tijdens het bewegen staat Stop op de rij die je koos. De projector is één rij met een schakelaar.", html: four },
    { key: "5", name: "Alles in capsules", why: "Scherm én projector worden capsules van dezelfde maat als de rolluiken: één rij gelijke toestellen (Scherm · Projector · Links · Rechts). Het scherm heeft de rail, de projector is zelf de knop (bundel naar boven als hij aan is). Onder elk de bijhorende keuze, zoals de lamellen.", html: five },
    { key: "6", name: "Filmavond eerst", why: "Wat je meestal wil is een film starten of stoppen, niet het scherm apart. Eén grote knop doet alles (scherm, projector, rolluiken, licht) en lokaal vanaf de Mac, zonder Pi. De toestellen staan als chips eronder; «Handmatig» klapt de losse bediening open.", html: six },
  ];
  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = "left:0;top:0;width:1760px";
  b.innerHTML = `<style>.st-opts{display:grid;grid-template-columns:repeat(2,840px);gap:56px 40px}.st-stage{background:#f4f5fa;border-radius:26px;padding:24px;min-height:300px}.st-stage *{box-sizing:border-box}.st-opt .ag-opthd p{max-width:760px}</style><header class="bhd"><span class="bnum">ST</span><div><h2>Startpagina · tegel «Projectiescherm» <span class="tag">6 voorstellen · 27 okt</span></h2><p>De huidige tegel (rail in het paneel, projectorschakelaar en Mijn hoogte die over de tekening zweven) voelt nog niet juist naast de rolluiken. Zes richtingen, telkens getoond naast de rolluiken zoals ze nu gebouwd zijn. Het scherm is open volgens de Hue-contactsensor en de projector staat aan.</p><p class="uses">Bouwt op: ControlRail, SegmentedControl, ChoiceRow, Switch · RL Rolluiken</p></div></header>
    <div class="st-opts" style="margin-top:28px">${V.map((v) => `<div class="st-opt"><div class="ag-opthd"><span class="ag-key">${v.key}</span><div><h3>${v.name}</h3><p>${v.why}</p></div></div><div class="st-stage">${v.html()}</div></div>`).join("")}</div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const topY = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${topY - 240 - b.offsetHeight}px`;
})();
