/* Dashboard · avond: één venster voor licht, klimaat en scherm (vier indelingen, 25 okt). */
(() => {
  const world = document.getElementById("world");
  const W = 1240, H = 740; // venster op een liggende tablet (zelfde stijl als «Alle lampen» / «Alle airco's»)

  const FLOORS = [
    { label: "Gelijkvloers", rooms: [
      { n: "Woonkamer", on: true, b: 60 }, { n: "Keuken", on: true, b: 100 }, { n: "Eetkamer", on: false, b: 0 }, { n: "Hal", on: true, b: 30 },
    ] },
    { label: "Verdieping", rooms: [
      { n: "Slaapkamer", on: false, b: 0 }, { n: "Badkamer", on: false, b: 0 }, { n: "Kamer Noë", on: true, b: 15 },
    ] },
  ];
  const AIRCO = [
    { n: "Leefruimte", on: false, t: 18 }, { n: "Gastenkamer", on: false, t: 20 }, { n: "Slaapkamer", on: false, t: 16 }, { n: "Kamer Noë", on: true, set: 20, t: 17 },
  ];

  const ic = {
    power: (s = 14) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 3v8"/><path d="M6.4 6.6a8 8 0 1 0 11.2 0"/></svg>`,
    up: (s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 6-6 6 6"/></svg>`,
    down: (s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 10 6 6 6-6"/></svg>`,
    stop: (s = 16) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>`,
    preset: (s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16M6 4v11h12V4M12 15v5M9 20h6"/><path d="m9 10 3-3 3 3"/></svg>`,
    moon: (s = 16) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>`,
    play: (s = 14) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>`,
    snow: (s = 13) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11"/></svg>`,
    sun: (s = 13) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></svg>`,
  };

  /* Eén verticale kolom: licht (warm gevuld volgens helderheid) of airco (blauw bij koelen, «Uit» als uit). */
  const col = (h, top, fill, fillBg, onBtn, w = 74) => `<div class="cm-col" style="width:${w}px;height:${h}px">
      ${fill ? `<i class="cm-fill" style="height:${fill}%;background:${fillBg}"></i>` : ""}
      <span class="cm-top">${top}</span>
      <span class="cm-pw${onBtn ? " on" : ""}">${ic.power(13)}</span></div>`;
  const lightCol = (r, h, w) => `<div class="cm-cell">${col(h, r.on ? `${r.b}%` : "Uit", r.on ? Math.max(r.b, 18) : 0, "linear-gradient(180deg,#ffe2a6,#ffb547)", r.on, w)}<b>${r.n}</b></div>`;
  const aircoCol = (a, h, w) => `<div class="cm-cell">${col(h, a.on ? `${a.set}°` : "Uit", a.on ? 30 : 0, "linear-gradient(180deg,#bcd8ff,#5fa6ff)", a.on, w)}<b>${a.n}</b><em>binnen ${a.t}°</em><span class="cm-mode"><span class="${a.on ? "on" : ""}">${ic.snow()}</span><span>${ic.sun()}</span></span></div>`;

  const group = (label, cells, sw = true) => `<section class="cm-grp"><div class="cm-gh"><span>${label}</span>${sw ? '<i class="cm-sw"></i>' : ""}</div><div class="cm-cells">${cells}</div></section>`;
  const lights = (h, w) => FLOORS.map((f) => group(f.label, f.rooms.map((r) => lightCol(r, h, w)).join(""))).join("");
  const climate = (h, w) => group("Klimaat", AIRCO.map((a) => aircoCol(a, h, w)).join(""), false);
  const fadeEdge = '<span class="cm-fade"></span>';

  const head = (title = "Licht, klimaat & scherm") => `<div class="cm-head"><div><p>BEDIENING</p><h2>${title}</h2></div><div class="cm-hr"><span class="cm-chip">Alles uit</span><span class="cm-x">✕</span></div></div>`;
  const shell = (inner) => `<div class="cm-modal">${head()}${inner}</div>`;

  /* Schermbediening: varianten in dezelfde stijl */
  const film = (big = false) => `<span class="cm-film${big ? " big" : ""}">${ic.play(big ? 16 : 13)} Film starten</span>`;
  const screenStack = `<div class="cm-panel">
      <div class="cm-ph">SCHERM</div>
      ${film(true)}
      <div class="cm-2x2"><span class="cm-b">${ic.up()}Omhoog</span><span class="cm-b stop">${ic.stop()}Stop</span><span class="cm-b">${ic.down()}Omlaag</span><span class="cm-b">${ic.preset()}Mijn hoogte</span></div>
      <div class="cm-ph">PROJECTOR <em><i class="cm-dot"></i>aan</em></div>
      <div class="cm-row2"><span class="cm-b h">${ic.power()}Aan</span><span class="cm-b h">${ic.moon()}Uit</span></div>
      <p class="cm-note">Mijn hoogte 30,55 s · begin volledig omlaag</p>
    </div>`;
  const screenBar = (dock = false) => `<div class="cm-bar${dock ? " dock" : ""}">
      ${film()}
      <i class="cm-sep"></i>
      <span class="cm-lbl">SCHERM</span>
      <span class="cm-b w">${ic.up()}Omhoog</span><span class="cm-b w stop">${ic.stop()}Stop</span><span class="cm-b w">${ic.down()}Omlaag</span><span class="cm-b w">${ic.preset()}Mijn hoogte</span>
      <i class="cm-sep"></i>
      <span class="cm-lbl">PROJECTOR <i class="cm-dot"></i></span>
      <span class="cm-b w">${ic.power()}Aan</span><span class="cm-b w">${ic.moon()}Uit</span>
    </div>`;
  const screenCard = `<div class="cm-panel card">
      <div class="cm-ph">SCHERM &amp; PROJECTOR <em>Mijn hoogte 30,55 s</em></div>
      <div class="cm-remote"><span class="cm-b">${ic.up()}</span><span class="cm-b stop">${ic.stop()}Stop</span><span class="cm-b">${ic.down()}</span></div>
      <div class="cm-row2"><span class="cm-b h">${ic.preset()}Mijn hoogte</span><span class="cm-b h">${ic.power()}Projector</span></div>
      ${film(true)}
    </div>`;

  /* A · Bediening links, één baan rechts */
  const A = shell(`<div class="cm-body" style="grid-template-columns:232px 1fr">${screenStack}<div class="cm-lane">${lights(360, 70)}<i class="cm-vr"></i>${climate(360, 70)}${fadeEdge}</div></div>`);
  /* B · Afstandsbediening als balk bovenaan */
  const B = shell(`<div class="cm-body" style="grid-template-rows:auto 1fr;grid-template-columns:1fr">${screenBar()}<div class="cm-lane">${lights(352, 74)}<i class="cm-vr"></i>${climate(352, 74)}${fadeEdge}</div></div>`);
  /* C · Twee banen: licht boven, klimaat + scherm onder */
  const C = shell(`<div class="cm-body" style="grid-template-rows:1fr 1fr;grid-template-columns:1fr 330px;row-gap:14px">
      <div class="cm-lane" style="grid-column:1 / -1">${lights(196, 64)}${fadeEdge}</div>
      <div class="cm-lane">${climate(150, 64)}</div>${screenCard}</div>`);
  /* D · Dock onderaan */
  const D = shell(`<div class="cm-body" style="grid-template-rows:1fr auto;grid-template-columns:1fr">
      <div class="cm-lane">${lights(386, 74)}<i class="cm-vr"></i>${climate(386, 74)}${fadeEdge}</div>${screenBar(true)}</div>`);

  const OPTS = [
    ["A", "Bediening links, één baan rechts", "Links een vaste kolom met Film starten, de vier schermknoppen (Stop opvallend) en projector aan/uit. Rechts één zijwaartse baan: eerst de lampen per verdieping, dan na een scheiding de vier airco's. De kolommen zijn een derde korter.", A],
    ["B", "Afstandsbediening als balk bovenaan", "Een brede balk onder de titel met Film starten, Omhoog · Stop · Omlaag · Mijn hoogte en de projector. Daaronder licht en klimaat in één baan die zijwaarts scrolt; de balk scrolt nooit mee.", B],
    ["C", "Twee banen", "Bovenaan alle lampen (korte kolommen), onderaan de airco's met rechts een kaart voor scherm en projector. Alles is in één oogopslag zichtbaar, de kolommen zijn wel het kortst.", C],
    ["D", "Dock onderaan", "Licht en klimaat zo hoog mogelijk in één baan; onderaan een vaste dock (zoals een afstandsbediening op tafel) met Film starten, schermknoppen en projector. Duim-vriendelijk op een tablet.", D],
  ];

  const css = `
  .cm-opts{display:grid;grid-template-columns:repeat(2,${W}px);gap:56px 40px}
  .cm-stage{width:${W}px;height:${H}px;border-radius:30px;padding:26px;background:linear-gradient(170deg,#b8679b,#6c4796 60%,#3f3478);box-sizing:border-box}
  .cm-modal{height:100%;border-radius:28px;padding:22px 26px;box-sizing:border-box;display:flex;flex-direction:column;color:#fff;font-family:"Museo Sans Rounded",Nunito,system-ui,sans-serif;
    background:linear-gradient(160deg,#232b48 0%,#1a2036 55%,#141a2c 100%);box-shadow:inset 0 0 0 1px rgba(160,180,255,.22),0 40px 80px -30px rgba(0,0,0,.8)}
  .cm-head{display:flex;justify-content:space-between;align-items:flex-start}
  .cm-head p{margin:0;font-size:11px;font-weight:800;letter-spacing:.08em;color:rgba(255,255,255,.6)}
  .cm-head h2{margin:2px 0 0;font-size:26px;font-weight:800;letter-spacing:-.02em}
  .cm-hr{display:flex;gap:8px;align-items:center}
  .cm-chip{height:36px;padding:0 14px;border-radius:999px;background:rgba(255,255,255,.1);font-size:13px;font-weight:700;display:flex;align-items:center}
  .cm-x{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;font-size:13px}
  .cm-body{flex:1;min-height:0;margin-top:16px;display:grid;gap:18px}
  .cm-lane{position:relative;display:flex;gap:20px;overflow:hidden;min-width:0;align-items:flex-start}
  .cm-fade{position:absolute;right:0;top:0;bottom:0;width:60px;background:linear-gradient(90deg,transparent,#171d31)}
  .cm-vr{flex:none;width:1px;align-self:stretch;background:rgba(255,255,255,.12)}
  .cm-grp{flex:none;display:flex;flex-direction:column;gap:10px}
  .cm-gh{display:flex;justify-content:space-between;align-items:center;gap:14px;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:rgba(200,210,255,.55)}
  .cm-sw{width:34px;height:20px;border-radius:999px;background:#ffb547;position:relative}.cm-sw:after{content:"";position:absolute;right:2px;top:2px;width:16px;height:16px;border-radius:50%;background:#fff}
  .cm-cells{display:flex;gap:8px}
  .cm-cell{display:flex;flex-direction:column;align-items:center;gap:3px}
  .cm-cell b{font-size:11.5px;margin-top:4px;white-space:nowrap}.cm-cell em{font-style:normal;font-size:10.5px;color:rgba(255,255,255,.65)}
  .cm-col{position:relative;border-radius:999px;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:12px 0}
  .cm-fill{position:absolute;left:0;right:0;bottom:0;border-radius:999px}
  .cm-top{position:relative;font-size:15px;font-weight:800;color:rgba(255,255,255,.85)}
  .cm-pw{position:relative;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.45);color:rgba(255,255,255,.85)}
  .cm-pw.on{background:#fff;color:#2a2148;box-shadow:none}
  .cm-mode{display:flex;gap:2px;padding:2px;margin-top:4px;border-radius:999px;background:rgba(255,255,255,.08)}
  .cm-mode span{width:28px;height:22px;border-radius:999px;display:flex;align-items:center;justify-content:center;color:#ffd166}
  .cm-mode span:first-child{color:#9cc6ff}.cm-mode span.on{background:#5fa6ff;color:#fff}
  .cm-panel{border-radius:22px;background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);padding:14px;display:flex;flex-direction:column;gap:9px;min-height:0}
  .cm-ph{display:flex;justify-content:space-between;font-size:10.5px;font-weight:800;letter-spacing:.08em;color:rgba(200,210,255,.6)}
  .cm-ph em{font-style:normal;letter-spacing:0;font-weight:700;color:rgba(255,255,255,.75)}
  .cm-b{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;height:58px;border-radius:14px;background:rgba(255,255,255,.1);font-size:11px;font-weight:700}
  .cm-b.stop{background:#f4d8cb;color:#572e38}
  .cm-b.h{flex-direction:row;gap:6px;height:42px;font-size:12px}
  .cm-2x2{display:grid;grid-template-columns:1fr 1fr;gap:6px}
  .cm-row2{display:grid;grid-template-columns:1fr 1fr;gap:6px}
  .cm-note{margin:auto 0 0;font-size:10.5px;color:rgba(255,255,255,.6)}
  .cm-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#8ff0a8;box-shadow:0 0 6px #8ff0a8;margin-right:4px}
  .cm-film{display:flex;align-items:center;justify-content:center;gap:7px;height:40px;padding:0 16px;border-radius:999px;font-size:13px;font-weight:800;background:linear-gradient(135deg,rgba(255,214,150,.6),rgba(255,140,170,.45));box-shadow:inset 0 0 0 1px rgba(255,255,255,.35);white-space:nowrap}
  .cm-film.big{height:52px;border-radius:16px;font-size:14.5px}
  .cm-bar{display:flex;align-items:center;gap:7px;padding:9px 12px;border-radius:20px;background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}
  .cm-bar.dock{justify-self:center;padding:10px 14px;border-radius:24px;background:rgba(255,255,255,.1);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18),0 18px 30px -18px rgba(0,0,0,.8)}
  .cm-bar .cm-b.w{width:78px;height:52px}
  .cm-sep{width:1px;height:34px;background:rgba(255,255,255,.18);margin:0 4px}
  .cm-lbl{font-size:10px;font-weight:800;letter-spacing:.08em;color:rgba(200,210,255,.6);writing-mode:vertical-rl;transform:rotate(180deg);display:flex;align-items:center;gap:4px}
  .cm-panel.card{gap:10px}
  .cm-remote{display:grid;grid-template-columns:1fr 1.4fr 1fr;gap:6px}
  .cm-remote .cm-b{flex-direction:row;gap:6px;height:48px;font-size:12px}`;

  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = `left:0;top:0;width:${W * 2 + 40 + 80}px`;
  b.innerHTML = `<style>${css}</style><header class="bhd"><span class="bnum">CM</span><div><h2>Eén venster voor licht, klimaat en scherm <span class="tag">4 indelingen · 25 okt</span></h2><p>«Alle lampen», «Alle airco's» en de schermbediening samen in één volledig venster op het avonddashboard. De airco's staan rechts van de lampen (ze werken op dezelfde manier), de kolommen zijn lager zodat de schermbediening er vast bij past, en alleen licht en klimaat scrollen zijwaarts.</p><p class="uses">Bouwt op: Dashboard · licht (Hue-venster), Airco A3, schermpaneel variant A en de filmmodus.</p></div></header>
    <div class="cm-opts">${OPTS.map(([k, t, d, html]) => `<div class="dk-opt"><div class="ag-opthd"><span class="ag-key">${k}</span><div><h3>${t}</h3><p>${d}</p></div></div><div class="cm-stage">${html}</div></div>`).join("")}</div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const topY = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${topY - 240 - b.offsetHeight}px`;
})();
