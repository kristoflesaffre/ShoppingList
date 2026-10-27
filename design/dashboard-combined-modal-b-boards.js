/* Dashboard · avond: venster licht/klimaat/scherm, concept B uitgewerkt in drie varianten (volle breedte, 25 okt). */
(() => {
  const world = document.getElementById("world");
  const W = 1240, H = 740;

  const FLOORS = [
    { label: "Gelijkvloers", rooms: [{ n: "Woonkamer", on: true, b: 60 }, { n: "Keuken", on: true, b: 100 }, { n: "Eetkamer", on: false, b: 0 }, { n: "Hal", on: true, b: 30 }] },
    { label: "Verdieping", rooms: [{ n: "Slaapkamer", on: false, b: 0 }, { n: "Badkamer", on: false, b: 0 }, { n: "Kamer Noë", on: true, b: 15 }] },
  ];
  const AIRCO = [{ n: "Leefruimte", on: false, t: 18 }, { n: "Gastenkamer", on: false, t: 20 }, { n: "Slaapkamer", on: false, t: 16 }, { n: "Kamer Noë", on: true, set: 20, t: 17 }];

  const ic = {
    power: (s = 15) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 3v8"/><path d="M6.4 6.6a8 8 0 1 0 11.2 0"/></svg>`,
    up: (s = 20) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 6-6 6 6"/></svg>`,
    down: (s = 20) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 10 6 6 6-6"/></svg>`,
    stop: (s = 17) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>`,
    preset: (s = 20) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16M6 4v11h12V4M12 15v5M9 20h6"/><path d="m9 10 3-3 3 3"/></svg>`,
    moon: (s = 17) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>`,
    play: (s = 15) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>`,
    snow: (s = 13) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11"/></svg>`,
    sun: (s = 13) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></svg>`,
  };

  /* Kolommen rekken mee met de breedte: elke groep krijgt ruimte volgens het aantal kamers/airco's. */
  const col = (top, fill, bg, on) => `<div class="cb-col">${fill ? `<i class="cb-fill" style="height:${fill}%;background:${bg}"></i>` : ""}<span class="cb-top">${top}</span><span class="cb-pw${on ? " on" : ""}">${ic.power(14)}</span></div>`;
  const lightCell = (r) => `<div class="cb-cell">${col(r.on ? `${r.b}%` : "Uit", r.on ? Math.max(r.b, 18) : 0, "linear-gradient(180deg,#ffe2a6,#ffb547)", r.on)}<b>${r.n}</b></div>`;
  const aircoCell = (a) => `<div class="cb-cell">${col(a.on ? `${a.set}°` : "Uit", a.on ? 30 : 0, "linear-gradient(180deg,#bcd8ff,#5fa6ff)", a.on)}<b>${a.n}</b><em>binnen ${a.t}°</em><span class="cb-mode"><span class="${a.on ? "on" : ""}">${ic.snow()}</span><span>${ic.sun()}</span></span></div>`;
  const group = (label, cells, n, sw) => `<section class="cb-grp" style="flex:${n} 1 0"><div class="cb-gh"><span>${label}</span>${sw ? '<i class="cb-sw"></i>' : ""}</div><div class="cb-cells">${cells}</div></section>`;
  const lane = (extra = "") => `<div class="cb-lane ${extra}">${FLOORS.map((f) => group(f.label, f.rooms.map(lightCell).join(""), f.rooms.length, true)).join('<i class="cb-vr"></i>')}<i class="cb-vr strong"></i>${group("Klimaat", AIRCO.map(aircoCell).join(""), AIRCO.length, false)}</div>`;
  const head = `<div class="cb-head"><div><p>BEDIENING</p><h2>Licht, klimaat &amp; scherm</h2></div><div class="cb-hr"><span class="cb-chip">Alles uit</span><span class="cb-x">✕</span></div></div>`;
  const shell = (inner, cls = "") => `<div class="cb-modal ${cls}">${head}${inner}</div>`;

  /* B1 · Balk over de volle breedte, drie groepen in verhouding */
  const B1 = shell(`<div class="cb-bar b1">
      <div class="cb-g" style="flex:1.3 1 0"><span class="cb-gl">FILM</span><span class="cb-film">${ic.play()} Film starten</span></div>
      <i class="cb-sep"></i>
      <div class="cb-g" style="flex:4 1 0"><span class="cb-gl">SCHERM <em>Mijn hoogte 30,55 s</em></span><div class="cb-btns"><span class="cb-b">${ic.up()}Omhoog</span><span class="cb-b stop">${ic.stop()}Stop</span><span class="cb-b">${ic.down()}Omlaag</span><span class="cb-b">${ic.preset()}Mijn hoogte</span></div></div>
      <i class="cb-sep"></i>
      <div class="cb-g" style="flex:2 1 0"><span class="cb-gl">PROJECTOR <em><i class="cb-dot"></i>aan</em></span><div class="cb-btns"><span class="cb-b">${ic.power()}Aan</span><span class="cb-b">${ic.moon()}Uit</span></div></div>
    </div>${lane()}`);

  /* B2 · Drie kaarten boven die met de groepen eronder uitlijnen */
  const B2 = shell(`<div class="cb-cards">
      <div class="cb-card film" style="flex:4 1 0"><div><span class="cb-gl">FILMAVOND</span><b>Klaar voor een film?</b><small>Projector aan · scherm naar je hoogte · woonkamer op Cinema</small></div><span class="cb-film big">${ic.play(17)} Film starten</span></div>
      <div class="cb-card" style="flex:3 1 0"><span class="cb-gl">SCHERM <em>30,55 s</em></span><div class="cb-btns"><span class="cb-b">${ic.up()}Omhoog</span><span class="cb-b stop">${ic.stop()}Stop</span><span class="cb-b">${ic.down()}Omlaag</span><span class="cb-b">${ic.preset()}Hoogte</span></div></div>
      <div class="cb-card" style="flex:4 1 0"><span class="cb-gl">PROJECTOR <em><i class="cb-dot"></i>staat aan</em></span><div class="cb-btns"><span class="cb-b wide">${ic.power()}Projector aan</span><span class="cb-b wide">${ic.moon()}Projector uit</span></div></div>
    </div>${lane()}`, "b2");

  /* B3 · Slanke pillenbalk, meer hoogte voor de kolommen */
  const B3 = shell(`<div class="cb-bar b3">
      <span class="cb-film">${ic.play()} Film starten</span>
      <div class="cb-pill"><span class="cb-pl">Scherm</span><span class="cb-p">${ic.up(18)}Omhoog</span><span class="cb-p stop">${ic.stop(15)}Stop</span><span class="cb-p">${ic.down(18)}Omlaag</span><span class="cb-p">${ic.preset(18)}Mijn hoogte</span></div>
      <div class="cb-pill"><span class="cb-pl"><i class="cb-dot"></i>Projector</span><span class="cb-p">${ic.power(15)}Aan</span><span class="cb-p">${ic.moon(15)}Uit</span></div>
    </div>${lane("tall")}`, "b3");

  const OPTS = [
    ["B1", "Balk over de volle breedte", "De balk loopt van rand tot rand; Film, Scherm en Projector krijgen ruimte in verhouding tot hun knoppen, met kopjes en status erin. Eronder rekken de kolommen mee zodat lampen en airco's samen de hele breedte vullen, zonder lege strook rechts.", B1],
    ["B2", "Drie kaarten, uitgelijnd met de groepen", "Bovenaan drie kaarten die exact boven Gelijkvloers, Verdieping en Klimaat staan: Filmavond (met wat de knop doet), Scherm en Projector. Een rustig raster: alles staat in dezelfde kolommen.", B2],
    ["B3", "Slanke pillenbalk", "Eén lage balk met drie groepen gelijk verdeeld over de breedte (Film, Scherm, Projector als pillen). Zo houden de kolommen de meeste hoogte en is dimmen met de duim het makkelijkst.", B3],
  ];

  const css = `
  .cb-opts{display:grid;grid-template-columns:repeat(2,${W}px);gap:56px 40px}
  .cb-stage{width:${W}px;height:${H}px;border-radius:30px;padding:26px;background:linear-gradient(170deg,#b8679b,#6c4796 60%,#3f3478);box-sizing:border-box}
  .cb-modal{height:100%;border-radius:28px;padding:22px 26px 24px;box-sizing:border-box;display:flex;flex-direction:column;gap:18px;color:#fff;font-family:"Museo Sans Rounded",Nunito,system-ui,sans-serif;
    background:linear-gradient(160deg,#232b48 0%,#1a2036 55%,#141a2c 100%);box-shadow:inset 0 0 0 1px rgba(160,180,255,.22),0 40px 80px -30px rgba(0,0,0,.8)}
  .cb-head{display:flex;justify-content:space-between;align-items:flex-start}
  .cb-head p{margin:0;font-size:11px;font-weight:800;letter-spacing:.08em;color:rgba(255,255,255,.6)}
  .cb-head h2{margin:2px 0 0;font-size:26px;font-weight:800;letter-spacing:-.02em}
  .cb-hr{display:flex;gap:8px;align-items:center}
  .cb-chip{height:36px;padding:0 14px;border-radius:999px;background:rgba(255,255,255,.1);font-size:13px;font-weight:700;display:flex;align-items:center}
  .cb-x{width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.12);display:flex;align-items:center;justify-content:center;font-size:13px}
  .cb-gl{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:10.5px;font-weight:800;letter-spacing:.08em;color:rgba(200,210,255,.6)}
  .cb-gl em{font-style:normal;letter-spacing:0;font-weight:700;font-size:11px;color:rgba(255,255,255,.72)}
  .cb-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:#8ff0a8;box-shadow:0 0 6px #8ff0a8;margin-right:5px}
  .cb-b{flex:1 1 0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;height:58px;border-radius:15px;background:rgba(255,255,255,.1);font-size:11.5px;font-weight:700;min-width:0}
  .cb-b.stop{background:#f4d8cb;color:#572e38}
  .cb-b.wide{flex-direction:row;gap:8px;font-size:12.5px}
  .cb-btns{display:flex;gap:8px}
  .cb-film{display:flex;align-items:center;justify-content:center;gap:8px;height:58px;padding:0 18px;border-radius:16px;font-size:14px;font-weight:800;white-space:nowrap;
    background:linear-gradient(135deg,rgba(255,214,150,.62),rgba(255,140,170,.46));box-shadow:inset 0 0 0 1px rgba(255,255,255,.35)}
  .cb-film.big{height:52px;padding:0 22px;border-radius:999px;font-size:15px}
  /* B1 */
  .cb-bar.b1{display:flex;align-items:stretch;gap:18px;padding:12px 16px;border-radius:22px;background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1)}
  .cb-g{display:flex;flex-direction:column;gap:8px;min-width:0}
  .cb-sep{width:1px;background:rgba(255,255,255,.14)}
  /* B2 */
  .cb-cards{display:flex;gap:45px} /* = 22 + 1 (scheiding) + 22 in de baan, zodat de kaarten boven hun groep staan */
  .cb-card{border-radius:22px;background:rgba(255,255,255,.06);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);padding:12px 14px;display:flex;flex-direction:column;gap:8px;min-width:0}
  .cb-card.film{flex-direction:row;align-items:center;justify-content:space-between;gap:14px;background:linear-gradient(120deg,rgba(255,190,140,.16),rgba(255,120,170,.1));box-shadow:inset 0 0 0 1px rgba(255,200,170,.25)}
  .cb-card.film b{display:block;font-size:17px;margin-top:6px}.cb-card.film small{display:block;font-size:11px;color:rgba(255,255,255,.7);margin-top:3px;line-height:1.35}
  /* B3 */
  .cb-bar.b3{display:flex;align-items:center;justify-content:space-between;gap:14px}
  .cb-bar.b3 .cb-film{height:48px;border-radius:999px}
  .cb-pill{display:flex;align-items:center;gap:4px;padding:4px;border-radius:999px;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)}
  .cb-pl{padding:0 12px 0 14px;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:rgba(200,210,255,.65);display:flex;align-items:center;white-space:nowrap}
  .cb-p{height:40px;padding:0 15px;border-radius:999px;display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:700;background:rgba(255,255,255,.08);white-space:nowrap}
  .cb-p.stop{background:#f4d8cb;color:#572e38}
  /* baan: groepen vullen samen de hele breedte */
  .cb-lane{flex:1;min-height:0;display:flex;gap:22px}
  .cb-vr{flex:none;width:1px;background:rgba(255,255,255,.08)}.cb-vr.strong{background:rgba(255,255,255,.18)}
  .cb-grp{display:flex;flex-direction:column;gap:10px;min-width:0}
  .cb-gh{display:flex;justify-content:space-between;align-items:center;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:rgba(200,210,255,.55);min-height:20px}
  .cb-sw{width:34px;height:20px;border-radius:999px;background:#ffb547;position:relative}.cb-sw:after{content:"";position:absolute;right:2px;top:2px;width:16px;height:16px;border-radius:50%;background:#fff}
  .cb-cells{flex:1;min-height:0;display:flex;gap:10px}
  .cb-cell{flex:1 1 0;min-width:0;display:flex;flex-direction:column;align-items:center;gap:3px}
  .cb-cell b{font-size:12px;margin-top:5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
  .cb-cell em{font-style:normal;font-size:10.5px;color:rgba(255,255,255,.65)}
  .cb-col{position:relative;flex:1;min-height:0;width:100%;max-width:92px;border-radius:999px;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1);overflow:hidden;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:13px 0}
  .cb-fill{position:absolute;left:0;right:0;bottom:0;border-radius:999px}
  .cb-top{position:relative;font-size:16px;font-weight:800;color:rgba(255,255,255,.88)}
  .cb-pw{position:relative;width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.45);color:rgba(255,255,255,.85)}
  .cb-pw.on{background:#fff;color:#2a2148;box-shadow:none}
  .cb-mode{display:flex;gap:2px;padding:2px;margin-top:4px;border-radius:999px;background:rgba(255,255,255,.08)}
  .cb-mode span{width:30px;height:22px;border-radius:999px;display:flex;align-items:center;justify-content:center;color:#ffd166}
  .cb-mode span:first-child{color:#9cc6ff}.cb-mode span.on{background:#5fa6ff;color:#fff}
  /* licht-cellen krijgen even veel onderruimte als de airco-cellen, zodat de kolommen gelijk eindigen */
  .cb-grp:not(:last-child) .cb-cell{padding-bottom:46px}`;

  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = `left:0;top:0;width:${W * 2 + 40 + 80}px`;
  b.innerHTML = `<style>${css}</style><header class="bhd"><span class="bnum">CM2</span><div><h2>Venster licht, klimaat &amp; scherm · concept B uitgewerkt <span class="tag">3 varianten · 25 okt</span></h2><p>Zelfde opbouw als CM · B (bediening bovenaan, licht en klimaat eronder), maar nu over de volle breedte: de balk is niet langer dan zijn inhoud vraagt, de kolommen rekken mee tot de rechterrand en alle groepen zijn gelijkmatig verdeeld. Geen lege strook meer rechts.</p><p class="uses">Bouwt op: CM · B Afstandsbediening als balk bovenaan.</p></div></header>
    <div class="cb-opts">${OPTS.map(([k, t, d, html]) => `<div class="dk-opt"><div class="ag-opthd"><span class="ag-key">${k}</span><div><h3>${t}</h3><p>${d}</p></div></div><div class="cb-stage">${html}</div></div>`).join("")}</div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const topY = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${topY - 240 - b.offsetHeight}px`;
})();
