/* Startpagina · Airco-kaarten: acht ontwerpen · enkel koelen/verwarmen, 5 ventilatorstanden, echte −/+ knoppen · 19 okt. */
(() => {
  const world = document.getElementById("world");
  const COOL = "#2f80ff";
  const HEAT = "#ff6b2c";
  const INK = "#101130";
  const SUB = "#6b6f85";

  // ── Iconen ────────────────────────────────────────────────────────────────
  /** Echte sneeuwvlok: zes armen, elk met een V-tak. */
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
  const fanI = (s = 16, c = "currentColor") =>
    `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="1.8" stroke-linejoin="round"><path d="M12 12c0-3.5 1-7 3.4-7 1.9 0 2.6 2 1.6 3.6C15.8 10.4 13.7 11.4 12 12zm0 0c3.5 0 7 1 7 3.4 0 1.9-2 2.6-3.6 1.6-1.8-1.2-2.8-3.3-3.4-5zm0 0c0 3.5-1 7-3.4 7-1.9 0-2.6-2-1.6-3.6C8.2 13.6 10.3 12.6 12 12zm0 0c-3.5 0-7-1-7-3.4 0-1.9 2-2.6 3.6-1.6 1.8 1.2 2.8 3.3 3.4 5z"/></svg>`;
  const minus = (s = 22, c = "currentColor") => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round"><path d="M6 12h12"/></svg>`;
  const plus = (s = 22, c = "currentColor") => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round"><path d="M6 12h12M12 6v12"/></svg>`;
  const chevUp = (s = 22, c = "currentColor") => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg>`;
  const chevDown = (s = 22, c = "currentColor") => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;

  const sw = (on, color) =>
    `<span style="position:relative;display:inline-block;width:52px;height:30px;border-radius:99px;flex:none;background:${on ? color : "rgba(16,17,48,.14)"};${on ? `box-shadow:0 6px 16px -8px ${color}` : ""}"><i style="position:absolute;top:3px;left:${on ? 25 : 3}px;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(16,17,48,.25)"></i></span>`;
  const accent = (d) => (d.mode === "heat" ? HEAT : COOL);
  const deg = (t) => `${String(t).replace(".", ",")}°`;
  const off = (d, html) => (d.on ? html : `<div style="opacity:.38;filter:grayscale(1);pointer-events:none">${html}</div>`);

  // Voorbeeldtoestellen: één aan (koelen of verwarmen), één uit.
  const ON_COOL = { name: "Kamer Noë", inside: 23, on: true, t: 20, mode: "cool", fan: 2 };
  const ON_HEAT = { name: "Leefruimte", inside: 18, on: true, t: 21.5, mode: "heat", fan: 3 };
  const OFF = { name: "Slaapkamer", inside: 21, on: false, t: 19, mode: "cool", fan: 1 };

  const card = (inner, extra = "") => `<div style="width:250px;box-sizing:border-box;border-radius:24px;background:#fff;padding:16px;box-shadow:0 1px 2px rgba(16,17,48,.06);display:flex;flex-direction:column;gap:14px;${extra}">${inner}</div>`;
  const head = (d, color = accent(d), sub = `Binnen ${deg(d.inside)}`) =>
    `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px"><div style="min-width:0"><div style="font-size:15px;font-weight:800;color:${INK};line-height:20px">${d.name}</div><div style="font-size:12px;font-weight:600;color:${SUB};margin-top:2px">${sub}</div></div>${sw(d.on, color)}</div>`;

  // ── A1 · Segmenten ────────────────────────────────────────────────────────
  const A1 = (d) => {
    const c = accent(d);
    const btn = (icon) => `<span style="width:52px;height:52px;border-radius:50%;background:${c};color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 16px -8px ${c},inset 0 -2px 0 rgba(0,0,0,.12)">${icon}</span>`;
    const seg = (m, icon, label) => {
      const on = d.mode === m;
      return `<span style="flex:1;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:12.5px;font-weight:800;${on ? `background:#fff;color:${m === "heat" ? HEAT : COOL};box-shadow:0 1px 3px rgba(16,17,48,.15)` : `color:${SUB}`}">${icon}${label}</span>`;
    };
    const fans = [1, 2, 3, 4, 5].map((n) => `<span style="flex:1;height:38px;border-radius:10px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:9px;${n === d.fan ? `background:#fff;box-shadow:0 1px 3px rgba(16,17,48,.15)` : ""}"><i style="width:7px;border-radius:3px;height:${6 + n * 3.6}px;background:${n <= d.fan ? c : "rgba(16,17,48,.18)"}"></i></span>`).join("");
    return card(head(d) + off(d, `<div style="display:flex;align-items:center;justify-content:space-between">${btn(minus(24))}<span style="font-size:44px;font-weight:800;letter-spacing:-.03em;color:${INK}">${deg(d.t)}</span>${btn(plus(24))}</div>
      <div style="display:flex;gap:3px;padding:3px;border-radius:15px;background:#f0f1f6">${seg("cool", snow(17), "Koelen")}${seg("heat", sun(17), "Verwarmen")}</div>
      <div style="display:flex;gap:3px;padding:3px;border-radius:13px;background:#f0f1f6">${fans}</div>`));
  };

  // ── A2 · Thermostaatring ─────────────────────────────────────────────────
  const A2 = (d) => {
    const c = accent(d);
    const frac = (d.t - 16) / 14;
    const R = 62, C = 2 * Math.PI * R, arc = C * 0.75;
    const ring = `<svg width="170" height="150" viewBox="0 0 170 150" style="display:block;margin:0 auto"><g transform="rotate(135 85 80)"><circle cx="85" cy="80" r="${R}" fill="none" stroke="#eef0f5" stroke-width="12" stroke-linecap="round" stroke-dasharray="${arc} ${C}"/><circle cx="85" cy="80" r="${R}" fill="none" stroke="${c}" stroke-width="12" stroke-linecap="round" stroke-dasharray="${arc * frac} ${C}"/></g><text x="85" y="88" text-anchor="middle" font-size="38" font-weight="800" fill="${INK}" letter-spacing="-1">${deg(d.t)}</text><text x="85" y="110" text-anchor="middle" font-size="11" font-weight="700" fill="${SUB}">binnen ${deg(d.inside)}</text></svg>`;
    const btn = (icon) => `<span style="width:50px;height:50px;border-radius:16px;background:#fff;color:${INK};display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 1px rgba(16,17,48,.1),0 6px 12px -6px rgba(16,17,48,.3)">${icon}</span>`;
    const mode = (m, icon) => `<span style="width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;${d.mode === m ? `background:${m === "heat" ? HEAT : COOL};color:#fff` : `background:#f0f1f6;color:${SUB}`}">${icon}</span>`;
    const fans = [1, 2, 3, 4, 5].map((n) => `<span style="width:36px;height:30px;border-radius:99px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;${n === d.fan ? `background:${INK};color:#fff` : `background:#f0f1f6;color:${SUB}`}">${n}</span>`).join("");
    return card(head(d, c, d.on ? (d.mode === "heat" ? "Verwarmt" : "Koelt") : "Uit") + off(d, `<div style="position:relative;margin:-6px 0 -10px">${ring}<span style="position:absolute;left:0;bottom:6px">${btn(minus(22))}</span><span style="position:absolute;right:0;bottom:6px">${btn(plus(22))}</span></div>
      <div style="display:flex;align-items:center;justify-content:space-between"><div style="display:flex;gap:8px">${mode("cool", snow(20))}${mode("heat", sun(20))}</div><span style="color:${SUB}">${fanI(18)}</span></div>
      <div style="display:flex;justify-content:space-between">${fans}</div>`));
  };

  // ── A3 · Kleur per modus ─────────────────────────────────────────────────
  const A3 = (d) => {
    const cool = d.mode === "cool";
    const bg = !d.on ? "#fff" : cool ? "linear-gradient(160deg,#5aa2ff,#2f6cf0)" : "linear-gradient(160deg,#ffa25c,#f0522c)";
    const fg = d.on ? "#fff" : INK;
    const sub = d.on ? "rgba(255,255,255,.8)" : SUB;
    const btn = (icon) => `<span style="width:54px;height:54px;border-radius:18px;background:rgba(255,255,255,.22);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35),0 8px 16px -10px rgba(0,0,0,.4)">${icon}</span>`;
    const mode = (m, icon, l) => `<span style="flex:1;height:36px;border-radius:99px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:12.5px;font-weight:800;${d.mode === m ? `background:#fff;color:${m === "heat" ? HEAT : COOL}` : `color:rgba(255,255,255,.85);box-shadow:inset 0 0 0 1px rgba(255,255,255,.35)`}">${icon}${l}</span>`;
    const fans = [1, 2, 3, 4, 5].map((n) => `<span style="flex:1;height:34px;border-radius:10px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:8px;${n === d.fan ? "background:rgba(255,255,255,.25)" : ""}"><i style="width:5px;border-radius:3px;height:${4 + n * 3.2}px;background:${n <= d.fan ? "#fff" : "rgba(255,255,255,.35)"}"></i></span>`).join("");
    const top = `<div style="display:flex;align-items:center;justify-content:space-between"><div><div style="font-size:15px;font-weight:800;color:${fg}">${d.name}</div><div style="font-size:12px;font-weight:600;color:${sub};margin-top:2px">Binnen ${deg(d.inside)}</div></div>${d.on ? sw(true, "rgba(255,255,255,.35)") : sw(false)}</div>`;
    if (!d.on) return card(top + `<div style="display:flex;align-items:center;justify-content:center;height:160px;color:${SUB};font-size:13px;font-weight:700;border-radius:18px;background:#f5f6fa">Uit · laatst ${deg(d.t)} koelen</div>`);
    return card(top + `<div style="display:flex;align-items:center;justify-content:space-between">${btn(minus(24))}<span style="font-size:46px;font-weight:800;letter-spacing:-.03em;color:#fff">${deg(d.t)}</span>${btn(plus(24))}</div>
      <div style="display:flex;gap:6px">${mode("cool", snow(16), "Koelen")}${mode("heat", sun(16), "Verwarmen")}</div>
      <div style="display:flex;gap:2px">${fans}</div>`, `background:${bg};box-shadow:0 14px 26px -16px ${cool ? COOL : HEAT}`);
  };

  // ── A4 · Wipschakelaar ───────────────────────────────────────────────────
  const A4 = (d) => {
    const c = accent(d);
    const tab = (m, icon, l) => `<span style="flex:1;padding:9px 0 8px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:12.5px;font-weight:800;border-bottom:2.5px solid ${d.mode === m ? (m === "heat" ? HEAT : COOL) : "transparent"};color:${d.mode === m ? (m === "heat" ? HEAT : COOL) : SUB}">${icon}${l}</span>`;
    const rocker = `<div style="display:flex;flex-direction:column;width:64px;border-radius:20px;overflow:hidden;background:${INK};box-shadow:0 10px 18px -10px rgba(16,17,48,.6)"><span style="height:54px;display:flex;align-items:center;justify-content:center;color:#fff">${plus(24)}</span><i style="height:1px;background:rgba(255,255,255,.18)"></i><span style="height:54px;display:flex;align-items:center;justify-content:center;color:#fff">${minus(24)}</span></div>`;
    const pos = (d.fan - 1) / 4;
    const slider = `<div style="position:relative;height:34px;margin:0 6px"><i style="position:absolute;left:0;right:0;top:15px;height:4px;border-radius:2px;background:#e8eaf0"></i><i style="position:absolute;left:0;width:${pos * 100}%;top:15px;height:4px;border-radius:2px;background:${c}"></i>${[0, 1, 2, 3, 4].map((n) => `<i style="position:absolute;left:calc(${n * 25}% - 4px);top:13px;width:8px;height:8px;border-radius:50%;background:${n / 4 <= pos ? c : "#d6d9e2"}"></i>`).join("")}<i style="position:absolute;left:calc(${pos * 100}% - 12px);top:5px;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 0 0 2px ${c},0 3px 6px rgba(16,17,48,.25)"></i></div><div style="display:flex;justify-content:space-between;font-size:10.5px;font-weight:800;color:${SUB};margin:-6px 0 0">${[1, 2, 3, 4, 5].map((n) => `<span style="width:16px;text-align:center;${n === d.fan ? `color:${c}` : ""}">${n}</span>`).join("")}</div>`;
    return card(head(d) + off(d, `<div style="display:flex;border-bottom:1px solid #eef0f5;margin-top:-6px">${tab("cool", snow(16), "Koelen")}${tab("heat", sun(16), "Verwarmen")}</div>
      <div style="display:flex;align-items:center;justify-content:space-between"><div><div style="font-size:11px;font-weight:800;letter-spacing:.08em;color:${SUB}">INGESTELD</div><div style="font-size:52px;font-weight:800;letter-spacing:-.04em;color:${INK};line-height:1.05">${deg(d.t)}</div></div>${rocker}</div>
      <div><div style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:800;letter-spacing:.08em;color:${SUB};margin-bottom:6px">${fanI(14)} VENTILATOR</div>${slider}</div>`));
  };

  // ── A5 · Afstandsbediening ───────────────────────────────────────────────
  const A5 = (d) => {
    const c = accent(d);
    const lcd = `<div style="border-radius:16px;background:linear-gradient(180deg,#1b2140,#11152b);padding:14px 16px;color:#fff;display:flex;justify-content:space-between;align-items:flex-end;box-shadow:inset 0 2px 6px rgba(0,0,0,.4)"><div><div style="display:flex;gap:8px;align-items:center;color:${c}">${d.mode === "heat" ? sun(18) : snow(18)}<span style="font-size:11px;font-weight:800;letter-spacing:.08em">${d.mode === "heat" ? "VERWARMEN" : "KOELEN"}</span></div><div style="font-size:46px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums;line-height:1.05;margin-top:4px">${deg(d.t)}</div></div><div style="display:flex;gap:3px;align-items:flex-end;padding-bottom:8px">${[1, 2, 3, 4, 5].map((n) => `<i style="width:5px;border-radius:2px;height:${5 + n * 3}px;background:${n <= d.fan ? "#fff" : "rgba(255,255,255,.2)"}"></i>`).join("")}</div></div>`;
    const key = (inner, w, active, col) => `<span style="flex:${w};height:46px;border-radius:14px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:800;background:${active ? col : "linear-gradient(180deg,#fff,#eef0f5)"};color:${active ? "#fff" : INK};box-shadow:0 0 0 1px rgba(16,17,48,.1),0 3px 0 rgba(16,17,48,.12)">${inner}</span>`;
    const fanKeys = [1, 2, 3, 4, 5].map((n) => `<span style="flex:1;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:12.5px;font-weight:800;background:${n === d.fan ? INK : "linear-gradient(180deg,#fff,#eef0f5)"};color:${n === d.fan ? "#fff" : SUB};box-shadow:0 0 0 1px rgba(16,17,48,.1),0 2px 0 rgba(16,17,48,.1)">${n}</span>`).join("");
    return card(head(d) + off(d, `${lcd}<div style="display:flex;gap:8px">${key(minus(22), 1)}${key(snow(18), 1, d.mode === "cool", COOL)}${key(sun(18), 1, d.mode === "heat", HEAT)}${key(plus(22), 1)}</div><div style="display:flex;gap:5px">${fanKeys}</div>`), "background:#f4f5f9");
  };

  // ── A6 · Brede rij (desktop) ─────────────────────────────────────────────
  const A6 = (d) => {
    const c = accent(d);
    const btn = (icon) => `<span style="width:44px;height:44px;border-radius:14px;background:${c};color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 12px -6px ${c}">${icon}</span>`;
    const m = (k, icon) => `<span style="width:40px;height:36px;border-radius:11px;display:flex;align-items:center;justify-content:center;${d.mode === k ? `background:#fff;color:${k === "heat" ? HEAT : COOL};box-shadow:0 1px 3px rgba(16,17,48,.15)` : `color:${SUB}`}">${icon}</span>`;
    const fans = [1, 2, 3, 4, 5].map((n) => `<span style="width:30px;height:36px;border-radius:10px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:9px;${n === d.fan ? "background:#fff;box-shadow:0 1px 3px rgba(16,17,48,.15)" : ""}"><i style="width:4px;border-radius:2px;height:${4 + n * 3}px;background:${n <= d.fan ? c : "rgba(16,17,48,.18)"}"></i></span>`).join("");
    return `<div style="width:720px;box-sizing:border-box;border-radius:22px;background:#fff;padding:12px 14px 12px 18px;display:flex;align-items:center;gap:14px;box-shadow:0 1px 2px rgba(16,17,48,.06)"><div style="width:120px"><div style="font-size:14.5px;font-weight:800;color:${INK}">${d.name}</div><div style="font-size:12px;font-weight:600;color:${SUB}">Binnen ${deg(d.inside)}</div></div>${off(d, `<div style="display:flex;align-items:center;gap:12px"><div style="display:flex;gap:2px;padding:2px;border-radius:13px;background:#f0f1f6">${m("cool", snow(18))}${m("heat", sun(18))}</div><div style="display:flex;align-items:center;gap:6px">${btn(minus(20))}<span style="width:62px;text-align:center;font-size:24px;font-weight:800;color:${INK}">${deg(d.t)}</span>${btn(plus(20))}</div><div style="display:flex;gap:1px;padding:2px;border-radius:12px;background:#f0f1f6">${fans}</div></div>`)}<span style="margin-left:auto">${sw(d.on, c)}</span></div>`;
  };

  // ── A7 · Waaier ──────────────────────────────────────────────────────────
  const A7 = (d) => {
    const c = accent(d);
    const btn = (icon, l) => `<span style="flex:1;height:50px;border-radius:16px;background:${INK};color:#fff;display:flex;align-items:center;justify-content:center;gap:6px;font-size:13px;font-weight:800;box-shadow:0 8px 14px -8px rgba(16,17,48,.6)">${icon}${l}</span>`;
    const mode = (m, icon) => `<span style="width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;${d.mode === m ? `background:${m === "heat" ? HEAT : COOL};color:#fff;box-shadow:0 6px 12px -6px ${m === "heat" ? HEAT : COOL}` : `background:#f0f1f6;color:${SUB}`}">${icon}</span>`;
    // Vijf aaneengesloten blokken die als een helling oplopen (zoals een volumeknop); tik een blok.
    const fan = `<div style="display:flex;align-items:center;gap:10px"><span style="color:${SUB}">${fanI(18)}</span><div style="display:flex;align-items:flex-end;gap:4px;flex:1;height:44px">${[1, 2, 3, 4, 5].map((n) => `<span style="flex:1;height:${12 + n * 6.4}px;border-radius:8px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:5px;font-size:11px;font-weight:800;${n <= d.fan ? `background:${c};color:#fff` : `background:#eef0f5;color:${SUB}`};${n === d.fan ? `box-shadow:0 0 0 2px #fff,0 0 0 3.5px ${c}` : ""}">${n}</span>`).join("")}</div></div>`;
    return card(head(d) + off(d, `<div style="display:flex;align-items:center;justify-content:space-between"><span style="font-size:48px;font-weight:800;letter-spacing:-.03em;color:${INK}">${deg(d.t)}</span><div style="display:flex;gap:8px">${mode("cool", snow(19))}${mode("heat", sun(19))}</div></div>
      <div style="display:flex;gap:8px">${btn(minus(20), "Kouder")}${btn(plus(20), "Warmer")}</div>${fan}`));
  };

  // ── A8 · Accentstrook ────────────────────────────────────────────────────
  const A8 = (d) => {
    const c = accent(d);
    const btn = (icon) => `<span style="width:56px;height:56px;border-radius:16px;background:#fff;color:${c};display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 1.5px ${c}33,0 4px 0 ${c}26">${icon}</span>`;
    const chip = (m, icon, l) => `<span style="flex:1;height:36px;border-radius:12px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;font-weight:800;${d.mode === m ? `background:${m === "heat" ? HEAT : COOL}14;color:${m === "heat" ? HEAT : COOL};box-shadow:inset 0 0 0 1.5px ${m === "heat" ? HEAT : COOL}` : `background:#f5f6fa;color:${SUB}`}">${icon}${l}</span>`;
    const blocks = [1, 2, 3, 4, 5].map((n) => `<span style="flex:1;height:30px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;${n <= d.fan ? `background:${c};color:#fff;opacity:${0.45 + n * 0.11}` : `background:#f0f1f6;color:${SUB}`}">${n}</span>`).join("");
    return card(`<div style="position:absolute;left:0;top:18px;bottom:18px;width:4px;border-radius:0 4px 4px 0;background:${d.on ? c : "#d6d9e2"}"></div>` + head(d) + off(d, `<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0">${btn(chevDown(26))}<div style="text-align:center"><div style="font-size:44px;font-weight:800;letter-spacing:-.03em;color:${INK};line-height:1">${deg(d.t)}</div><div style="font-size:11px;font-weight:700;color:${SUB};margin-top:4px">${d.mode === "heat" ? "verwarmen tot" : "koelen tot"}</div></div>${btn(chevUp(26))}</div>
      <div style="display:flex;gap:6px">${chip("cool", snow(16), "Koelen")}${chip("heat", sun(16), "Verwarmen")}</div>
      <div style="display:flex;align-items:center;gap:8px"><span style="color:${SUB}">${fanI(16)}</span><div style="display:flex;gap:4px;flex:1">${blocks}</div></div>`), "position:relative");
  };

  const pair = (fn, a = ON_COOL) => `<div style="display:flex;gap:16px;align-items:flex-start">${fn(a)}${fn(OFF)}</div>`;
  const W = [
    ["A1", "Segmenten", "Ronde gevulde −/+ knoppen in de kleur van de modus. Koelen/Verwarmen als segment met tekst, de vijf ventilatorstanden als oplopende staafjes in één segmentbalk.", pair(A1)],
    ["A2", "Thermostaatring", "De temperatuur in een boog (16–30°) zoals een thermostaat, met vierkante witte −/+ knoppen links en rechts eronder. Modus als twee ronde knoppen, ventilator als 1–5.", pair(A2, ON_HEAT)],
    ["A3", "Kleur per modus", "De hele kaart kleurt mee: ijsblauw bij koelen, warm oranje bij verwarmen. Glazen −/+ knoppen. Staat de airco uit, dan een rustige witte kaart.", pair(A3)],
    ["A4", "Wipschakelaar", "Modus als tabs bovenaan, grote ingestelde temperatuur links en een donkere wipknop (+ boven, − onder) rechts. Ventilator als schuifje met vijf vaste standen.", pair(A4, ON_HEAT)],
    ["A5", "Afstandsbediening", "Een donker display (modus, temperatuur, ventilatorstaafjes) met daaronder echte toetsen die je ziet indrukken: −, koelen, verwarmen, + en de standen 1–5.", pair(A5)],
    ["A6", "Brede rij", "Eén airco per rij, alles op één lijn: naam, modus, −/temperatuur/+, vijf standen en de schakelaar. Vier rijen onder elkaar, handig op desktop (op gsm in twee regels).", `<div style="display:flex;flex-direction:column;gap:10px">${A6(ON_COOL)}${A6(ON_HEAT)}${A6(OFF)}</div>`],
    ["A7", "Waaier", "Twee brede donkere knoppen «Kouder» en «Warmer» met tekst. De ventilator als vijf blokken die als een helling oplopen; tik een blok.", pair(A7, ON_HEAT)],
    ["A8", "Accentstrook", "Rustig wit met een gekleurde strook links. Pijl-omlaag/omhoog als grote toetsen met een dikke onderrand. Ventilator als vijf blokjes die voller worden.", pair(A8)],
  ];

  const css = `.ac-opts{display:grid;grid-template-columns:repeat(4,560px);gap:48px 30px}.ac-stage{background:#f5f6fa;border-radius:26px;padding:22px;font-family:Inter,system-ui,sans-serif;display:flex;align-items:flex-start}`;
  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = "left:0;top:0;width:2420px";
  b.innerHTML = `<style>${css}</style><header class="bhd"><span class="bnum">AC</span><div><h2>Startpagina · airco-kaarten <span class="tag">8 ontwerpen · 19 okt</span></h2><p>Enkel koelen (echte sneeuwvlok) en verwarmen; geen automatisch en geen ontvochtigen. De vijf ventilatorstanden staan meteen zichtbaar, −/+ zijn echte knoppen en de kawaii-airco per kaart is weg. Telkens een airco die aan staat naast een die uit staat.</p><p class="uses">Bouwt op: sectie «Panasonic airco’s bedienen»</p></div></header>
    <div class="ac-opts">${W.map(([k, n, why, html]) => `<div class="dk-opt"${k === "A6" ? ' style="grid-column:span 2"' : ""}><div class="ag-opthd"><span class="ag-key">${k}</span><div><h3>${n}</h3><p>${why}</p></div></div><div class="ac-stage">${html}</div></div>`).join("")}</div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const topY = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${topY - 240 - b.offsetHeight}px`;
})();
