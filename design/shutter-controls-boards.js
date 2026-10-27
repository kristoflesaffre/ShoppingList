/* Startpagina · Rolluiken + projectiescherm: zes voorstellen. Links/rechts zoals in de kamer, Open · Stop · Dicht gestapeld · 27 okt. */
(() => {
  const world = document.getElementById("world");
  const INK = "#101130";
  const SUB = "#6b6f85";
  const LEFT = { name: "Blinden links", open: 0 };
  const RIGHT = { name: "Blinden rechts", open: 49 };
  const label = (o) => (o >= 98 ? "Open" : o <= 2 ? "Dicht" : `${o}% open`);

  const ico = {
    up: (s = 20, w = 2.4) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg>`,
    down: (s = 20, w = 2.4) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
    stop: (s = 14) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor"/></svg>`,
    power: (s = 18, w = 2.3) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round"><path d="M12 3.5v8M6.6 6.9a7.5 7.5 0 1 0 10.8 0"/></svg>`,
    height: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16M6 4v10h12V4"/><path d="M12 14v6M9 20h6"/></svg>`,
    sun: (s = 16) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>`,
  };

  /* Een raam met rolluik: lucht erachter, lamellen zakken van boven tot de stand. */
  const windowPane = (open, { w = 150, h = 180, r = 14, sky = "linear-gradient(180deg,#8fc2ff 0%,#cfe6ff 55%,#fff1d6 100%)", slat = ["#f8f9fc", "#dfe2ec"], rail = "#b9bdd0", frame = "#fff", frameW = 6, sun = true, cross = "rgba(255,255,255,.85)" } = {}) => {
    const shut = 100 - open;
    return `<div style="position:relative;width:${w}px;height:${h}px;border-radius:${r}px;overflow:hidden;background:${sky};box-shadow:inset 0 0 0 ${frameW}px ${frame},0 1px 2px rgba(16,17,48,.06)">
      ${sun ? `<i style="position:absolute;right:22%;top:30%;width:26px;height:26px;border-radius:50%;background:radial-gradient(circle,#fff6d8 0 40%,#ffd78a 41% 100%);box-shadow:0 0 24px 8px rgba(255,214,130,.55)"></i>` : ""}
      <i style="position:absolute;left:50%;top:0;bottom:0;width:4px;margin-left:-2px;background:${cross}"></i>
      <i style="position:absolute;left:0;right:0;top:46%;height:4px;background:${cross}"></i>
      <div style="position:absolute;left:0;right:0;top:0;height:${shut}%;background:repeating-linear-gradient(180deg,${slat[0]} 0,${slat[0]} 3px,${slat[1]} 8px,rgba(16,17,48,.28) 9px,${slat[0]} 10px);box-shadow:0 3px 0 ${rail},0 8px 14px -6px rgba(16,17,48,.35);transition:height .6s"></div>
      <i style="position:absolute;inset:0;border-radius:${r}px;box-shadow:inset 0 0 0 ${frameW}px ${frame};pointer-events:none"></i>
    </div>`;
  };

  /* Projectiescherm: kast bovenaan, doek eronder. Het scherm meldt geen stand: het doek is een schets, de tekst zegt wat er laatst gebeurde. */
  const screenPane = ({ w = 220, h = 150, beam = true, wall = "#eef0f7", casing = "#2a2c44", canvas = "#fff", ghost = false, r = 16 } = {}) => `
    <div style="position:relative;width:${w}px;height:${h}px;border-radius:${r}px;overflow:hidden;background:${wall}">
      <i style="position:absolute;left:8%;right:8%;top:10px;height:12px;border-radius:6px;background:${casing}"></i>
      <div style="position:absolute;left:12%;right:12%;top:20px;height:62%;background:${ghost ? "transparent" : canvas};border:${ghost ? "2px dashed rgba(16,17,48,.22)" : "0"};border-radius:0 0 6px 6px;box-shadow:${ghost ? "none" : "0 10px 18px -12px rgba(16,17,48,.35)"};overflow:hidden">
        ${beam ? `<i style="position:absolute;inset:0;background:radial-gradient(80% 90% at 50% 100%,rgba(255,196,120,.55),rgba(255,255,255,0) 70%)"></i>` : ""}
        <i style="position:absolute;left:0;right:0;bottom:0;height:5px;background:${casing}"></i>
      </div>
      ${beam ? `<i style="position:absolute;left:50%;bottom:0;width:70%;height:42%;transform:translateX(-50%);clip-path:polygon(46% 100%,54% 100%,100% 0,0 0);background:linear-gradient(0deg,rgba(255,200,120,.65),rgba(255,200,120,0))"></i>` : ""}
    </div>`;

  /* Gestapelde knoppen Open · Stop · Dicht (of Omhoog · Stop · Omlaag) in één verticale pil. */
  const stack = ({ labels = ["Open", "Stop", "Dicht"], w = 64, row = 50, bg = "#fff", ink = INK, line = "rgba(16,17,48,.07)", stopBg = "#f4d8cb", stopInk = "#572e38", shadow = "0 1px 2px rgba(16,17,48,.04),0 0 0 1px rgba(16,17,48,.06)", r = 20, text = true, radiusInner = 0, gap = 0 } = {}) => {
    const cell = (i, kind) => `<span style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;height:${row}px;${kind === "stop" ? `background:${stopBg};color:${stopInk};` : `color:${ink};`}${gap ? `border-radius:${radiusInner}px;background:${kind === "stop" ? stopBg : bg};box-shadow:${shadow}` : i ? `border-top:1px solid ${line}` : ""}">${kind === "stop" ? ico.stop(13) : ico[kind](20)}${text ? `<b style="font-size:10.5px;font-weight:700">${labels[i]}</b>` : ""}</span>`;
    return `<div style="display:flex;flex-direction:column;gap:${gap}px;width:${w}px;flex:none;border-radius:${r}px;overflow:hidden;${gap ? "" : `background:${bg};box-shadow:${shadow}`}">${cell(0, "up")}${cell(1, "stop")}${cell(2, "down")}</div>`;
  };
  const h2 = (t, c = INK) => `<h4 style="margin:0;font-size:22px;font-weight:800;letter-spacing:-.01em;color:${c}">${t}</h4>`;
  const cap = (name, state, c = INK, s = SUB) => `<div style="display:flex;flex-direction:column;gap:2px"><b style="font-size:15px;color:${c}">${name}</b><span style="font-size:13px;font-weight:600;color:${s}">${state}</span></div>`;
  const card = (inner, extra = "") => `<div style="background:#fff;border-radius:20px;padding:18px;box-shadow:0 1px 2px rgba(16,17,48,.04);${extra}">${inner}</div>`;
  const chip = (t, on = false, extra = "") => `<span style="display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border-radius:99px;font-size:12.5px;font-weight:700;${on ? "background:#5154e7;color:#fff" : "background:#eef0f7;color:#33354f"};${extra}">${t}</span>`;
  const projSwitch = (on = true) => `<span style="display:inline-flex;align-items:center;gap:10px;font-size:13px;font-weight:700;color:${INK}">${ico.power(16)} Projector <span style="position:relative;width:46px;height:28px;border-radius:99px;background:${on ? "#5154e7" : "#d9dbe6"}"><i style="position:absolute;top:3px;left:${on ? 21 : 3}px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(16,17,48,.25)"></i></span></span>`;

  /* ── A · Raam ─────────────────────────────────────────────── */
  const A = () => {
    const blind = (b, side) => card(`<div style="display:flex;gap:16px;align-items:center;${side === "right" ? "flex-direction:row-reverse" : ""}">
        ${stack()}
        <div style="display:flex;flex-direction:column;gap:12px;flex:1;align-items:${side === "right" ? "flex-end" : "flex-start"}">
          <div style="position:relative">${windowPane(b.open, { w: 250, h: 178 })}${b.open > 2 ? `<i style="position:absolute;left:8%;right:8%;bottom:-18px;height:22px;border-radius:50%;background:radial-gradient(closest-side,rgba(255,206,120,${(b.open / 100) * 0.9}),rgba(255,206,120,0))"></i>` : ""}</div>
          <div style="display:flex;align-items:baseline;gap:10px;${side === "right" ? "flex-direction:row-reverse" : ""}"><b style="font-size:30px;font-weight:800;letter-spacing:-.02em;color:${INK}">${b.open <= 2 ? "Dicht" : `${b.open}%`}</b><span style="font-size:14px;font-weight:700;color:${SUB}">${b.name}${b.open > 2 && b.open < 98 ? " · open" : ""}</span></div></div>
      </div>`, "flex:1");
    return `<div style="display:flex;flex-direction:column;gap:14px">
      ${h2("Projectiescherm")}
      ${card(`<div style="display:flex;gap:18px;align-items:center">${screenPane({ w: 250, h: 150 })}${stack({ labels: ["Omhoog", "Stop", "Omlaag"], w: 70 })}
        <div style="display:flex;flex-direction:column;gap:12px;flex:1">${cap("Laatst: omlaag · 20:41", "Geen sensor: kijk even naar het doek")}${chip(`${ico.height(15)} Naar mijn hoogte · 30,6 s`)}${projSwitch(true)}</div></div>`)}
      ${h2("Rolluiken")}
      <div style="display:flex;gap:14px">${blind(LEFT, "left")}${blind(RIGHT, "right")}</div>
    </div>`;
  };

  /* ── B · Capsules (familie van de Hue-kolommen) ───────────── */
  const B = () => {
    const capsule = (b) => `<div style="position:relative;width:84px;height:210px;border-radius:42px;overflow:hidden;background:linear-gradient(180deg,#a9cdfb,#fde7c4);box-shadow:inset 0 0 0 1px rgba(16,17,48,.05),0 10px 22px -16px rgba(16,17,48,.45)">
        <div style="position:absolute;left:0;right:0;top:0;height:${100 - b.open}%;background:repeating-linear-gradient(180deg,#f3f4fa 0 9px,#dfe2ee 9px 11px);box-shadow:0 3px 0 #b8bdd2"></div>
        <b style="position:absolute;left:0;right:0;bottom:16px;text-align:center;font-size:15px;font-weight:800;color:${b.open > 20 ? "#5a3300" : INK}">${b.open <= 2 ? "Dicht" : `${b.open}%`}</b>
      </div>`;
    const pill = (side) => `<div style="display:flex;flex-direction:column;gap:8px">${["up", "stop", "down"].map((k) => `<span style="display:grid;place-items:center;width:48px;height:48px;border-radius:50%;${k === "stop" ? "background:#f4d8cb;color:#572e38" : "background:#fff;color:#5154e7;box-shadow:0 0 0 1px rgba(16,17,48,.06),0 4px 10px -6px rgba(16,17,48,.3)"}">${k === "stop" ? ico.stop(13) : ico[k](22)}</span>`).join("")}</div>`;
    const blind = (b, side) => `<div style="display:flex;gap:14px;align-items:center;${side === "right" ? "flex-direction:row-reverse" : ""}">${pill(side)}<div style="display:flex;flex-direction:column;align-items:center;gap:8px">${capsule(b)}<b style="font-size:13px;color:${INK}">${b.name}</b></div></div>`;
    const screenCap = `<div style="position:relative;width:150px;height:210px;border-radius:42px;overflow:hidden;background:#2a2c44;box-shadow:0 10px 22px -16px rgba(16,17,48,.6)">
        <i style="position:absolute;left:16px;right:16px;top:18px;height:62%;border-radius:4px 4px 10px 10px;background:linear-gradient(180deg,#fff,#fff3e2)"></i>
        <i style="position:absolute;left:50%;bottom:0;width:120px;height:46%;transform:translateX(-50%);clip-path:polygon(44% 100%,56% 100%,100% 0,0 0);background:linear-gradient(0deg,rgba(255,190,110,.9),rgba(255,190,110,0))"></i>
        <b style="position:absolute;left:0;right:0;bottom:14px;text-align:center;font-size:12px;font-weight:800;color:#fff">Projector aan</b></div>`;
    return `<div style="display:flex;flex-direction:column;gap:14px">
      <div style="display:flex;justify-content:space-between;align-items:center">${h2("Woonkamer")}<span style="display:flex;gap:8px">${chip("Alles open")}${chip("Filmavond", true)}</span></div>
      ${card(`<div style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px">
        ${blind(LEFT, "left")}
        <div style="display:flex;gap:14px;align-items:center">${pill()}<div style="display:flex;flex-direction:column;align-items:center;gap:8px">${screenCap}<b style="font-size:13px;color:${INK}">Scherm · ${ico.height(13)} 30,6 s</b></div></div>
        ${blind(RIGHT, "right")}
      </div>`)}
      <p style="margin:0;font-size:12.5px;color:${SUB}">Sleep een capsule om de stand te kiezen, zoals bij de Hue-lampen. Het scherm heeft geen capsule-vulling: er is geen positiesensor.</p>
    </div>`;
  };

  /* ── C · Wandschakelaar ──────────────────────────────────── */
  const C = () => {
    const key = (kind, txt, led = false, h = 54) => `<span style="position:relative;display:flex;align-items:center;justify-content:center;gap:8px;height:${h}px;border-radius:12px;background:linear-gradient(180deg,#ffffff,#f1f2f7);box-shadow:0 1px 0 #fff inset,0 2px 0 #d9dbe6,0 6px 12px -8px rgba(16,17,48,.35);color:${kind === "stop" ? "#a24b3a" : INK};font-size:13px;font-weight:700">${kind === "stop" ? ico.stop(12) : kind === "height" ? ico.height(16) : kind === "power" ? ico.power(16) : ico[kind](18)}${txt}${led ? `<i style="position:absolute;right:12px;width:7px;height:7px;border-radius:50%;background:#7be08f;box-shadow:0 0 8px #7be08f"></i>` : ""}</span>`;
    const plate = (title, state, keys, meter, glyph = "") => `<div style="flex:1;display:flex;flex-direction:column;gap:10px">
        <div style="display:flex;justify-content:space-between;align-items:center"><span style="display:flex;align-items:center;gap:8px">${glyph}<b style="font-size:14px;color:${INK}">${title}</b></span><span style="font-size:12.5px;font-weight:700;color:${SUB}">${state}</span></div>
        <div style="padding:12px;border-radius:22px;background:#e9ebf3;box-shadow:inset 0 1px 2px rgba(16,17,48,.08)"><div style="display:flex;flex-direction:column;gap:8px">${keys}</div></div>
        ${meter ?? ""}</div>`;
    const meter = (o) => `<div style="height:8px;border-radius:99px;background:#e3e5ee;overflow:hidden"><i style="display:block;height:100%;width:${o}%;border-radius:99px;background:linear-gradient(90deg,#ffcf7a,#ffb547)"></i></div>`;
    return `<div style="display:flex;flex-direction:column;gap:14px">
      ${h2("Bediening woonkamer")}
      ${card(`<div style="display:flex;gap:18px">
        ${plate(LEFT.name, label(LEFT.open), key("up", "Open") + key("stop", "Stop") + key("down", "Dicht", true), meter(LEFT.open), windowPane(LEFT.open, { w: 28, h: 28, r: 6, frameW: 2, sun: false, cross: "rgba(255,255,255,.7)" }))}
        ${plate("Projectiescherm", "laatst omlaag", key("up", "Omhoog") + key("stop", "Stop") + key("down", "Omlaag") + key("height", "Mijn hoogte"), `<div style="display:flex;gap:8px">${key("power", "Projector", true, 40).replace("display:flex", "display:flex;flex:1")}</div>`)}
        ${plate(RIGHT.name, label(RIGHT.open), key("up", "Open") + key("stop", "Stop") + key("down", "Dicht"), meter(RIGHT.open), windowPane(RIGHT.open, { w: 28, h: 28, r: 6, frameW: 2, sun: false, cross: "rgba(255,255,255,.7)" }))}
      </div>`)}
      <p style="margin:0;font-size:12.5px;color:${SUB}">Voelt als de schakelaars aan de muur: drie toetsen onder elkaar, een groen lampje bij de laatste opdracht, een amberkleurige balk voor hoeveel licht er binnenvalt.</p>
    </div>`;
  };

  /* ── D · De muur van de woonkamer ─────────────────────────── */
  const D = () => {
    const under = (labels) => stack({ labels, w: 150, row: 40, r: 16, text: true }).replace("flex-direction:column", "flex-direction:column");
    return `<div style="display:flex;flex-direction:column;gap:14px">
      ${h2("Woonkamer")}
      <div style="border-radius:24px;overflow:hidden;background:#fff;box-shadow:0 1px 2px rgba(16,17,48,.04)">
        <div style="position:relative;height:250px;background:linear-gradient(180deg,#f3ede4,#ebe3d6);display:flex;align-items:flex-end;justify-content:space-between;padding:0 36px 26px">
          <i style="position:absolute;left:0;right:0;bottom:0;height:26px;background:linear-gradient(180deg,#d8c9b2,#cdbb9f)"></i>
          <i style="position:absolute;right:10px;bottom:0;width:230px;height:26px;clip-path:polygon(18% 0,82% 0,100% 100%,0 100%);background:linear-gradient(180deg,rgba(255,226,160,.9),rgba(255,214,130,.4))"></i>
          <div style="position:relative">${windowPane(LEFT.open, { w: 150, h: 190, r: 8, frame: "#fbfaf7", frameW: 7 })}</div>
          <div style="position:relative;align-self:flex-start;margin-top:16px">${screenPane({ w: 300, h: 180, wall: "transparent", r: 0 })}</div>
          <div style="position:relative">${windowPane(RIGHT.open, { w: 150, h: 190, r: 8, frame: "#fbfaf7", frameW: 7 })}</div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:flex-start;padding:18px 36px 22px;gap:18px">
          <div style="display:flex;flex-direction:column;gap:10px;width:150px">${cap(LEFT.name, label(LEFT.open))}${under(["Open", "Stop", "Dicht"])}</div>
          <div style="display:flex;flex-direction:column;gap:10px;align-items:center">${cap("Projectiescherm", "Laatst omlaag · projector aan").replace("flex-direction:column", "flex-direction:column;align-items:center")}
            <div style="display:flex;gap:10px">${under(["Omhoog", "Stop", "Omlaag"])}<div style="display:flex;flex-direction:column;gap:8px;width:130px">${chip(`${ico.height(14)} Mijn hoogte`, false, "height:40px;justify-content:center")}${chip(`${ico.power(14)} Projector aan`, true, "height:40px;justify-content:center")}</div></div></div>
          <div style="display:flex;flex-direction:column;gap:10px;width:150px;align-items:flex-end">${cap(RIGHT.name, label(RIGHT.open)).replace("flex-direction:column", "flex-direction:column;align-items:flex-end")}${under(["Open", "Stop", "Dicht"])}</div>
        </div>
      </div>
    </div>`;
  };

  /* ── E · Nachtglas (donker dashboardpaneel) ───────────────── */
  const E = () => {
    const night = "linear-gradient(180deg,#141a3d 0%,#2c2a63 55%,#7a4a7a 85%,#d98a6b 100%)";
    const glassStack = (labels) => stack({ labels, w: 66, row: 48, bg: "rgba(255,255,255,.10)", ink: "#fff", line: "rgba(255,255,255,.12)", stopBg: "rgba(255,170,140,.28)", stopInk: "#ffe2d6", shadow: "inset 0 0 0 1px rgba(255,255,255,.16)", r: 20 });
    const stars = `<i style="position:absolute;right:24%;top:22%;width:16px;height:16px;border-radius:50%;box-shadow:-5px 3px 0 0 #ffe9b8"></i><i style="position:absolute;inset:0;background-image:radial-gradient(1.4px 1.4px at 20% 20%,#fff,transparent),radial-gradient(1px 1px at 70% 12%,#fff,transparent),radial-gradient(1.2px 1.2px at 40% 34%,#fff,transparent),radial-gradient(1px 1px at 82% 40%,#fff,transparent);opacity:.8"></i>`;
    const win = (b) => windowPane(b.open, { w: 132, h: 150, sky: night, slat: ["#3d4266", "#2c3052"], rail: "#1b1e38", frame: "rgba(255,255,255,.14)", frameW: 2, sun: false, cross: "rgba(255,255,255,.18)" }).replace("<i style=\"position:absolute;left:50%", `${stars}<i style="position:absolute;left:50%`);
    const blind = (b, side) => `<div style="display:flex;gap:12px;align-items:center;${side === "right" ? "flex-direction:row-reverse" : ""}">${glassStack(["Open", "Stop", "Dicht"])}<div style="display:flex;flex-direction:column;gap:8px;align-items:${side === "right" ? "flex-end" : "flex-start"}">${win(b)}<span style="font-size:12px;font-weight:700;color:rgba(255,255,255,.85)">${b.name} · <span style="color:#ffcf7a">${label(b.open)}</span></span></div></div>`;
    return `<div style="border-radius:24px;padding:16px 18px 18px;color:#fff;background:radial-gradient(120% 140% at 0% 0%,#3a2f1c 0%,#1c1a2c 45%,#11101e 100%);box-shadow:0 18px 40px -26px rgba(255,190,80,.45)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><span style="font-size:11.5px;font-weight:800;letter-spacing:.08em;color:rgba(255,255,255,.75)">WOONKAMER</span>
        <span style="display:flex;padding:3px;border-radius:99px;background:rgba(255,255,255,.14);font-size:12px;font-weight:800">${["Licht", "Klimaat", "Scherm & luiken"].map((t, i) => `<span style="height:28px;padding:0 12px;display:flex;align-items:center;border-radius:99px;${i === 2 ? "background:#fff;color:#3a2f5a" : "color:rgba(255,255,255,.85)"}">${t}</span>`).join("")}</span></div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        ${blind(LEFT, "left")}
        <div style="display:flex;gap:12px;align-items:center">${glassStack(["Omhoog", "Stop", "Omlaag"])}<div style="display:flex;flex-direction:column;gap:8px">${screenPane({ w: 190, h: 150, wall: "rgba(255,255,255,.06)", casing: "#0d0e1c", canvas: "#f6f1ea" })}
          <div style="display:flex;gap:6px"><span style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;height:30px;border-radius:99px;background:rgba(255,255,255,.12);font-size:11.5px;font-weight:800">${ico.height(14)} Mijn hoogte</span><span style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;height:30px;border-radius:99px;background:#ffb547;color:#3a2400;font-size:11.5px;font-weight:800">${ico.power(14)} Aan</span></div></div></div>
        ${blind(RIGHT, "right")}
      </div></div>`;
  };

  /* ── F · Rail met presets ────────────────────────────────── */
  const F = () => {
    const rail = (b) => `<div style="position:relative;width:46px;height:200px;border-radius:14px;background:repeating-linear-gradient(180deg,#eef0f7 0 18px,#e4e6f0 18px 20px)">
        <i style="position:absolute;left:0;right:0;top:0;height:${100 - b.open}%;border-radius:14px 14px 4px 4px;background:repeating-linear-gradient(180deg,#c9cde0 0 8px,#b4b9d1 8px 10px)"></i>
        <span style="position:absolute;left:-6px;right:-6px;top:calc(${100 - b.open}% - 9px);height:18px;border-radius:9px;background:#5154e7;box-shadow:0 4px 10px -4px rgba(81,84,231,.8)"></span>
      </div>`;
    const ticks = `<div style="display:flex;flex-direction:column;justify-content:space-between;height:200px;font-size:10.5px;font-weight:700;color:${SUB}"><span>open</span><span>¼</span><span>½</span><span>¾</span><span>dicht</span></div>`;
    const mini = (labels) => stack({ labels, w: 46, row: 44, r: 14, text: false });
    const blind = (b, side) => card(`<div style="display:flex;flex-direction:column;gap:14px;align-items:${side === "right" ? "flex-end" : "flex-start"}">
        ${cap(b.name, label(b.open)).replace("flex-direction:column", `flex-direction:column;align-items:${side === "right" ? "flex-end" : "flex-start"}`)}
        <div style="display:flex;gap:12px;align-items:center;${side === "right" ? "flex-direction:row-reverse" : ""}">${mini()}${rail(b)}${ticks}</div>
        <div style="display:flex;gap:6px">${chip("Open")}${chip("½")}${chip("Dicht", b.open <= 2)}</div></div>`, "flex:1");
    const ring = `<svg width="132" height="132" viewBox="0 0 132 132"><circle cx="66" cy="66" r="56" fill="none" stroke="#eef0f7" stroke-width="10"/><circle cx="66" cy="66" r="56" fill="none" stroke="#5154e7" stroke-width="10" stroke-linecap="round" stroke-dasharray="${2 * Math.PI * 56}" stroke-dashoffset="${2 * Math.PI * 56 * 0.38}" transform="rotate(-90 66 66)"/></svg>`;
    return `<div style="display:flex;flex-direction:column;gap:14px">
      ${h2("Rolluiken & scherm")}
      <div style="display:flex;gap:14px;align-items:stretch">
        ${blind(LEFT, "left")}
        ${card(`<div style="display:flex;flex-direction:column;gap:12px;align-items:center">${cap("Projectiescherm", "Naar mijn hoogte… 19 / 30,6 s").replace("flex-direction:column", "flex-direction:column;align-items:center")}
          <div style="position:relative;display:grid;place-items:center">${ring}<span style="position:absolute;display:grid;place-items:center;width:64px;height:64px;border-radius:50%;background:#f4d8cb;color:#572e38">${ico.stop(20)}</span></div>
          <div style="display:flex;gap:6px">${chip(`${ico.up(14)} Omhoog`)}${chip(`${ico.down(14)} Omlaag`)}</div>${projSwitch(true)}</div>`, "flex:1.1")}
        ${blind(RIGHT, "right")}
      </div>
      <p style="margin:0;font-size:12.5px;color:${SUB}">Rolluik: sleep de blauwe greep of kies een preset. Scherm: tijdens «Mijn hoogte» telt een ring de seconden af en wordt het midden één grote Stop.</p>
    </div>`;
  };

  const V = [
    { key: "A", name: "Raam", why: "Elk rolluik is een raam met de echte stand: lamellen zakken over de lucht. De knoppen staan gestapeld aan de buitenkant, zodat links echt links staat en rechts rechts. Het scherm krijgt dezelfde taal, met lichtbundel als de projector aan staat.", html: A },
    { key: "B", name: "Capsules", why: "Familie van de Hue-kolommen: hoge capsules die je kunt verslepen, met lamellen die van boven vollopen. Scherm in het midden tussen de twee rolluiken, plus snelkeuzes «Alles open» en «Filmavond».", html: B },
    { key: "C", name: "Wandschakelaar", why: "Tactiele toetsen zoals de schakelaars aan de muur, drie onder elkaar per toestel, met een groen lampje voor de laatste opdracht. Een amberbalk toont hoeveel licht er binnenvalt.", html: C },
    { key: "D", name: "De muur", why: "Eén illustratie van de woonkamermuur: links raam, scherm in het midden, rechts raam, telkens met de bediening er recht onder. Je ziet in één oogopslag wat er open of dicht is.", html: D },
    { key: "E", name: "Nachtglas", why: "Voor het donkere dashboardpaneel: ramen met avondlucht, glazen gestapelde knoppen en amberkleurige accenten zoals het lichtpaneel. Rolluiken en scherm delen één tab.", html: E },
    { key: "F", name: "Rail met presets", why: "Precies: een rail met greep en schaal per rolluik, presets Open · ½ · Dicht. Het scherm toont eerlijk wat het weet: tijdens «Mijn hoogte» een aftelring met een grote Stop in het midden.", html: F },
  ];

  const css = `.rl-opts{display:grid;grid-template-columns:repeat(2,920px);gap:56px 40px}.rl-stage{background:#f5f6fa;border-radius:26px;padding:26px;font-family:Inter,system-ui,sans-serif}.rl-stage *{box-sizing:border-box}`;
  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = "left:0;top:0;width:1960px";
  b.innerHTML = `<style>${css}</style><header class="bhd"><span class="bnum">RL</span><div><h2>Rolluiken & projectiescherm · zes voorstellen <span class="tag">6 varianten · 27 okt</span></h2><p>Blinden links staan links en blinden rechts rechts, Open · Stop · Dicht staan telkens onder elkaar. De rolluiken melden hun echte stand (BREL-hub). Het scherm heeft geen sensor, dus de ontwerpen tonen daar de laatste opdracht in plaats van een stand. Voorbeeldstand: links dicht, rechts 49% open, projector aan.</p><p class="uses">Vervangt: de huidige rijen met tegels voor Projectiescherm en Rolluiken op de startpagina</p></div></header>
    <div class="rl-opts" style="margin-top:28px">${V.map((v) => `<div class="dk-opt"><div class="ag-opthd"><span class="ag-key">${v.key}</span><div><h3>${v.name}</h3><p>${v.why}</p></div></div><div class="rl-stage">${v.html()}</div></div>`).join("")}</div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const topY = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${topY - 240 - b.offsetHeight}px`;
})();
