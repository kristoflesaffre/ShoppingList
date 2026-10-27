/* Startpagina · Airco A3 «Kleur per modus» uitgewerkt: zes varianten, oranje gloed bij verwarmen, betere uit-staat · 19 okt. */
(() => {
  const world = document.getElementById("world");
  const INK = "#101130";
  const SUB = "#6b6f85";

  const snow = (s = 18, c = "currentColor", w = 1.8) => {
    let d = "";
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      const p = (r, da = 0) => [12 + r * Math.sin(a + da), 12 - r * Math.cos(a + da)].map((v) => v.toFixed(2)).join(" ");
      d += `M12 12L${p(9.5)}M${p(6.2)}L${p(9.2, 0.42)}M${p(6.2)}L${p(9.2, -0.42)}`;
    }
    return `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  };
  const sun = (s = 18, c = "currentColor", w = 1.8) =>
    `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>`;
  const power = (s = 22, c = "currentColor", w = 2.4) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round"><path d="M12 3.5v8M6.6 6.9a7.5 7.5 0 1 0 10.8 0"/></svg>`;
  const moon = (s = 18, c = "currentColor") => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.9" stroke-linejoin="round"><path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/></svg>`;
  const minus = (s = 24) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 12h12"/></svg>`;
  const plus = (s = 24) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 12h12M12 6v12"/></svg>`;
  const deg = (t) => `${String(t).replace(".", ",")}°`;

  const sw = (on, bg, knob = "#fff") =>
    `<span style="position:relative;display:inline-block;width:52px;height:30px;border-radius:99px;flex:none;background:${bg}"><i style="position:absolute;top:3px;left:${on ? 25 : 3}px;width:24px;height:24px;border-radius:50%;background:${knob};box-shadow:0 1px 3px rgba(16,17,48,.25)"></i></span>`;

  const COOL = { name: "Kamer Noë", inside: 23, t: 20, mode: "cool", fan: 2 };
  const HEAT = { name: "Leefruimte", inside: 18, t: 21.5, mode: "heat", fan: 3 };
  const OFF = { name: "Slaapkamer", inside: 21, t: 19, mode: "cool", fan: 1 };

  /**
   * Gekleurde aan-kaart (A3). `look` bepaalt achtergrond, gloed en de stijl van de knoppen.
   * Elke look: { bg(mode), glow(mode), btn, segOn(mode), segOff, bar, barOff, fanOn, deco(mode) }.
   */
  const onCard = (d, L) => {
    const heat = d.mode === "heat";
    const btn = (icon) => `<span style="width:50px;height:50px;border-radius:16px;display:flex;align-items:center;justify-content:center;${L.btn(heat)}">${icon}</span>`;
    const seg = (m, icon, l) => `<span style="flex:1;height:36px;border-radius:99px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:12.5px;font-weight:800;${d.mode === m ? L.segOn(heat) : L.segOff}">${icon}${l}</span>`;
    const fans = [1, 2, 3, 4, 5].map((n) => `<span style="flex:1;height:34px;border-radius:10px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:8px;${n === d.fan ? L.fanOn : ""}"><i style="width:6px;border-radius:3px;height:${5 + n * 3.4}px;background:${n <= d.fan ? L.bar : L.barOff}"></i></span>`).join("");
    const fg = L.fg ? L.fg(heat) : "#fff";
    const sub = L.sub ? L.sub(heat) : "rgba(255,255,255,.8)";
    return `<div style="position:relative;overflow:hidden;width:250px;box-sizing:border-box;border-radius:24px;padding:16px;display:flex;flex-direction:column;gap:14px;background:${L.bg(heat)};box-shadow:${L.glow(heat)}">${L.deco ? L.deco(heat) : ""}
      <div style="position:relative;display:flex;align-items:center;justify-content:space-between"><div><div style="font-size:15px;font-weight:800;color:${fg}">${d.name}</div><div style="font-size:12px;font-weight:600;color:${sub};margin-top:2px">Binnen ${deg(d.inside)} · ${heat ? "verwarmt" : "koelt"}</div></div>${sw(true, L.switch(heat))}</div>
      <div style="position:relative;display:flex;align-items:center;justify-content:space-between">${btn(minus())}<span style="font-size:40px;font-weight:800;letter-spacing:-.04em;color:${fg};${L.tempGlow ? L.tempGlow(heat) : ""}">${deg(d.t)}</span>${btn(plus())}</div>
      <div style="position:relative;display:flex;gap:6px">${seg("cool", snow(16), "Koelen")}${seg("heat", sun(16), "Verwarmen")}</div>
      <div style="position:relative;display:flex;gap:2px">${fans}</div></div>`;
  };

  const shell = (inner, css = "") => `<div style="position:relative;overflow:hidden;width:250px;box-sizing:border-box;border-radius:24px;padding:16px;display:flex;flex-direction:column;gap:14px;${css}">${inner}</div>`;
  const offHead = (d, fg = INK, sub = SUB, swBg = "rgba(16,17,48,.14)", extra = "Uit") =>
    `<div style="position:relative;display:flex;align-items:center;justify-content:space-between"><div><div style="font-size:15px;font-weight:800;color:${fg}">${d.name}</div><div style="font-size:12px;font-weight:600;color:${sub};margin-top:2px">Binnen ${deg(d.inside)} · ${extra}</div></div>${sw(false, swBg)}</div>`;
  const last = (d) => `${deg(d.t)} ${d.mode === "heat" ? "verwarmen" : "koelen"} · stand ${d.fan}`;

  // Golvende «luchtstroom»-lijnen (decoratie).
  const waves = (color, op = 0.35, y = 150) =>
    `<svg width="250" height="120" viewBox="0 0 250 120" style="position:absolute;left:0;top:${y}px;opacity:${op}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round">${[0, 1, 2, 3].map((i) => `<path d="M-10 ${20 + i * 22}c30-14 50 14 80 0s50-14 80 0 50 14 80 0 50-14 60 0"/>`).join("")}</svg>`;

  // ── Looks ────────────────────────────────────────────────────────────────
  const glassBtn = () => "background:rgba(255,255,255,.22);color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.4),0 8px 16px -10px rgba(0,0,0,.45)";
  const segOn = (heat) => `background:#fff;color:${heat ? "#f0522c" : "#2f6cf0"}`;
  const segOff = "color:rgba(255,255,255,.88);box-shadow:inset 0 0 0 1px rgba(255,255,255,.38)";
  const base = { btn: glassBtn, segOn, segOff, bar: "#fff", barOff: "rgba(255,255,255,.35)", fanOn: "background:rgba(255,255,255,.25)", switch: () => "rgba(255,255,255,.38)" };

  const V = [
    // V1 · Verloop met gloed
    {
      key: "V1", name: "Verloop met gloed",
      why: "A3 strakker: ijsblauw of oranje verloop met een gloed in dezelfde kleur rond de kaart. Uit: wit met een grote ronde aan-knop en wat er laatst ingesteld stond.",
      look: { ...base, bg: (h) => (h ? "linear-gradient(160deg,#ffae5c,#f2542d)" : "linear-gradient(160deg,#62a8ff,#2f6cf0)"), glow: (h) => (h ? "0 18px 34px -14px rgba(242,84,45,.75),0 0 0 1px rgba(242,84,45,.15)" : "0 18px 34px -14px rgba(47,108,240,.7),0 0 0 1px rgba(47,108,240,.15)") },
      off: (d) => shell(offHead(d) + `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:10px 0 4px"><span style="width:76px;height:76px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:${INK};background:#fff;box-shadow:0 0 0 1px rgba(16,17,48,.1),0 10px 20px -10px rgba(16,17,48,.35)">${power(28)}</span><span style="font-size:13px;font-weight:800;color:${INK}">Aanzetten</span><span style="font-size:11.5px;font-weight:600;color:${SUB}">Laatst: ${last(d)}</span></div>`, "background:#fff;box-shadow:0 1px 2px rgba(16,17,48,.06)"),
    },
    // V2 · Aurora
    {
      key: "V2", name: "Aurora",
      why: "Zachte kleurvlekken in plaats van een vlak verloop: cyaan-blauw bij koelen, amber-rood bij verwarmen, met een gloed die uit de kaart lijkt te stralen. Uit: een stille nachtkaart met maan.",
      look: { ...base,
        bg: (h) => (h ? "radial-gradient(120% 90% at 15% 0%,#ffd36b 0%,transparent 55%),radial-gradient(90% 80% at 100% 100%,#e8344e 0%,transparent 60%),#ff7a3a" : "radial-gradient(120% 90% at 15% 0%,#7ef0ff 0%,transparent 55%),radial-gradient(90% 80% at 100% 100%,#3a3df0 0%,transparent 60%),#3b8bff"),
        glow: (h) => (h ? "0 20px 40px -14px rgba(255,110,50,.85)" : "0 20px 40px -14px rgba(60,120,255,.8)") },
      off: (d) => shell(offHead(d, "#fff", "rgba(255,255,255,.6)", "rgba(255,255,255,.18)", "slaapt") + `<span style="position:absolute;right:-30px;top:40px;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle,rgba(140,150,255,.35),transparent 70%)"></span><div style="position:relative;display:flex;align-items:center;gap:14px;padding:6px 0"><span style="color:#c8ccff">${moon(34)}</span><div><div style="font-size:30px;font-weight:800;color:rgba(255,255,255,.92);letter-spacing:-.02em">${deg(d.t)}</div><div style="font-size:11.5px;font-weight:600;color:rgba(255,255,255,.6)">laatst ${d.mode === "heat" ? "verwarmen" : "koelen"} · stand ${d.fan}</div></div></div><span style="position:relative;height:42px;border-radius:99px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:13px;font-weight:800;color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.3)">${power(18)} Aanzetten</span>`, "background:linear-gradient(170deg,#262b52,#151833);box-shadow:0 14px 28px -16px rgba(21,24,51,.8)"),
    },
    // V3 · Pastel
    {
      key: "V3", name: "Pastel met kleur in de tekst",
      why: "Lichter en rustiger: een pastel kaart (ijsblauw of perzik) met de kleur in de temperatuur en knoppen, plus een zachte gloed rechtsboven. Uit: een stippellijn-kaart met de aan-knop in het midden.",
      look: {
        bg: (h) => (h ? "linear-gradient(160deg,#fff1e6,#ffe1cc)" : "linear-gradient(160deg,#eef5ff,#dceaff)"),
        glow: (h) => (h ? "0 14px 28px -16px rgba(255,107,44,.55),inset 0 0 0 1px rgba(255,107,44,.18)" : "0 14px 28px -16px rgba(47,128,255,.5),inset 0 0 0 1px rgba(47,128,255,.16)"),
        deco: (h) => `<span style="position:absolute;right:-50px;top:-50px;width:170px;height:170px;border-radius:50%;background:radial-gradient(circle,${h ? "rgba(255,140,60,.45)" : "rgba(80,150,255,.4)"},transparent 70%)"></span>`,
        fg: (h) => (h ? "#7a2a0c" : "#0f2c66"), sub: (h) => (h ? "rgba(122,42,12,.65)" : "rgba(15,44,102,.6)"),
        tempGlow: (h) => `color:${h ? "#f0522c" : "#2f6cf0"}`,
        btn: (h) => `background:${h ? "#ff6b2c" : "#2f80ff"};color:#fff;box-shadow:0 8px 16px -8px ${h ? "#ff6b2c" : "#2f80ff"},inset 0 -2px 0 rgba(0,0,0,.12)`,
        segOn: (h) => `background:${h ? "#ff6b2c" : "#2f80ff"};color:#fff`, segOff: "background:rgba(255,255,255,.7);color:#6b6f85",
        bar: "rgba(16,17,48,.7)", barOff: "rgba(16,17,48,.15)", fanOn: "background:rgba(255,255,255,.8)",
        switch: (h) => (h ? "#ff6b2c" : "#2f80ff"),
      },
      off: (d) => shell(offHead(d) + `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;height:150px;border-radius:18px;border:1.5px dashed rgba(16,17,48,.16)"><span style="width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;background:${INK};box-shadow:0 10px 18px -10px rgba(16,17,48,.7)">${power(24)}</span><span style="font-size:12px;font-weight:700;color:${SUB}">Laatst ${last(d)}</span></div>`, "background:#fff;box-shadow:0 1px 2px rgba(16,17,48,.06)"),
    },
    // V4 · Luchtstroom
    {
      key: "V4", name: "Luchtstroom",
      why: "Verloop met golvende lijnen erover, alsof de lucht uit de airco stroomt; bij verwarmen gloeien ze warm. Uit: een witte kaart met stille grijze lijnen en een brede aan-knop.",
      look: { ...base, bg: (h) => (h ? "linear-gradient(165deg,#ff9a4d,#ef4f2b)" : "linear-gradient(165deg,#4fa0ff,#2a5fe8)"), glow: (h) => (h ? "0 18px 32px -14px rgba(239,79,43,.75)" : "0 18px 32px -14px rgba(42,95,232,.7)"), deco: (h) => waves(h ? "#ffe2b0" : "#cfe6ff", 0.45, 70) },
      off: (d) => shell(waves("#c9cdd8", 0.6, 60) + offHead(d) + `<div style="position:relative;padding:22px 0 4px;text-align:center"><div style="font-size:42px;font-weight:800;color:#c3c7d2;letter-spacing:-.03em">${deg(d.t)}</div><div style="font-size:11.5px;font-weight:600;color:${SUB};margin-top:2px">laatst ${d.mode === "heat" ? "verwarmen" : "koelen"} · stand ${d.fan}</div></div><span style="position:relative;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:13px;font-weight:800;color:#fff;background:${INK};box-shadow:0 8px 14px -8px rgba(16,17,48,.6)">${power(18)} Aanzetten</span>`, "background:#fff;box-shadow:0 1px 2px rgba(16,17,48,.06)"),
    },
    // V5 · Diep met gloed van onder
    {
      key: "V5", name: "Diep, gloed van onderen",
      why: "Donkere, diepe kaart (nachtblauw of gloeiend bruinrood) met licht dat van onderaan opkomt en een gloeiende temperatuur. Uit: dezelfde kaart zonder licht, met een zachte aan-knop die uitnodigt.",
      look: { ...base,
        bg: (h) => (h ? "radial-gradient(130% 70% at 50% 110%,#ff7a2f 0%,#c2381c 35%,#3a1410 80%)" : "radial-gradient(130% 70% at 50% 110%,#3d9bff 0%,#1f49c8 35%,#0d1636 80%)"),
        glow: (h) => (h ? "0 20px 36px -14px rgba(255,110,40,.7)" : "0 20px 36px -14px rgba(50,120,255,.65)"),
        tempGlow: (h) => `text-shadow:0 0 22px ${h ? "rgba(255,150,70,.9)" : "rgba(110,170,255,.9)"}`,
        segOn: (h) => `background:${h ? "#ff7a2f" : "#3d8bff"};color:#fff;box-shadow:0 0 16px ${h ? "rgba(255,122,47,.7)" : "rgba(61,139,255,.7)"}`,
        btn: () => "background:rgba(255,255,255,.1);color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.28)",
        bar: "#fff", switch: (h) => (h ? "#ff7a2f" : "#3d8bff") },
      off: (d) => shell(offHead(d, "rgba(255,255,255,.9)", "rgba(255,255,255,.5)", "rgba(255,255,255,.16)") + `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;padding:8px 0 2px"><span style="width:72px;height:72px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1px rgba(255,255,255,.22),0 0 0 8px rgba(255,255,255,.04)">${power(28)}</span><span style="font-size:11.5px;font-weight:600;color:rgba(255,255,255,.55)">Laatst ${last(d)}</span></div>`, "background:linear-gradient(170deg,#22263d,#15172a);box-shadow:0 14px 26px -16px rgba(16,17,48,.7)"),
    },
    // V6 · Rand die gloeit
    {
      key: "V6", name: "Witte kaart, gloeiende rand",
      why: "Een witte kaart met een gekleurde, gloeiende rand en een verloopbalk bovenaan; de bediening in de modus-kleur. Uit: een kaart met de vorige stand als vriendelijke snelkeuze «Zet aan op 19° koelen».",
      look: {
        bg: () => "#fff",
        glow: (h) => (h ? "0 0 0 2px #ff7a2f,0 0 26px -2px rgba(255,122,47,.6)" : "0 0 0 2px #3d8bff,0 0 26px -2px rgba(61,139,255,.55)"),
        deco: (h) => `<span style="position:absolute;left:0;right:0;top:0;height:5px;background:${h ? "linear-gradient(90deg,#ffc35c,#ff5a2c)" : "linear-gradient(90deg,#7ee0ff,#2f6cf0)"}"></span>`,
        fg: () => INK, sub: () => SUB,
        btn: (h) => `background:${h ? "#ff6b2c" : "#2f80ff"};color:#fff;box-shadow:0 8px 16px -8px ${h ? "#ff6b2c" : "#2f80ff"},inset 0 -2px 0 rgba(0,0,0,.12)`,
        segOn: (h) => `background:${h ? "#ff6b2c" : "#2f80ff"};color:#fff`, segOff: "background:#f0f1f6;color:#6b6f85",
        bar: "#101130", barOff: "rgba(16,17,48,.15)", fanOn: "background:#f0f1f6",
        switch: (h) => (h ? "#ff6b2c" : "#2f80ff"),
      },
      off: (d) => shell(offHead(d) + `<div style="display:flex;flex-direction:column;gap:10px;padding-top:2px"><div style="display:flex;align-items:center;gap:10px;padding:12px 14px;border-radius:16px;background:#f5f6fa"><span style="color:#2f80ff">${snow(22)}</span><div><div style="font-size:22px;font-weight:800;color:${INK};letter-spacing:-.02em">${deg(d.t)}</div><div style="font-size:11px;font-weight:600;color:${SUB}">stand ${d.fan} · vorige keer</div></div></div><span style="height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;gap:8px;font-size:13px;font-weight:800;color:#fff;background:linear-gradient(90deg,#4fa0ff,#2f6cf0);box-shadow:0 8px 16px -8px #2f6cf0">${power(18)} Zet aan op ${deg(d.t)}</span></div>`, "background:#fff;box-shadow:0 0 0 1px rgba(16,17,48,.08)"),
    },
  ];

  const css = `.a3-opts{display:grid;grid-template-columns:repeat(2,880px);gap:48px 34px}.a3-stage{background:#f5f6fa;border-radius:26px;padding:26px;font-family:Inter,system-ui,sans-serif;display:flex;gap:18px;align-items:flex-start}`;
  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = "left:0;top:0;width:1880px";
  b.innerHTML = `<style>${css}</style><header class="bhd"><span class="bnum">A3</span><div><h2>Airco · «Kleur per modus» uitgewerkt <span class="tag">6 varianten · 19 okt</span></h2><p>Telkens koelen (blauwe gloed), verwarmen (oranje gloed) en een airco die uit staat. De uit-staat is geen grijze vulling meer, maar toont wat er laatst ingesteld stond en een duidelijke aan-knop.</p><p class="uses">Bouwt op: AC · A3 Kleur per modus</p></div></header>
    <div class="a3-opts">${V.map((v) => `<div class="dk-opt"><div class="ag-opthd"><span class="ag-key">${v.key}</span><div><h3>${v.name}</h3><p>${v.why}</p></div></div><div class="a3-stage">${onCard(COOL, v.look)}${onCard(HEAT, v.look)}${v.off(OFF)}</div></div>`).join("")}</div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const topY = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${topY - 240 - b.offsetHeight}px`;
})();
