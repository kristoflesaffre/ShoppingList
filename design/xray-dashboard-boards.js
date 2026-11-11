/* X-Ray-dashboard · rustiger: enkel «Nu in beeld» (met «Alle 29»), betere bediening (pauze + stop rechtsboven, 1 · 2 · 5 min),
   meteen een invoerveld met microfoon, en meer glas zodat de cover zichtbaar blijft · vier voorstellen · 11 nov.
   Gebruikt window.XC_IMG / XC_DATA (xray-cast-imgs.js). */
(() => {
  const world = document.getElementById("world");
  const I = window.XC_IMG;
  const D = window.XC_DATA;
  const cast = D.cast;
  const inScene = [cast[0], cast[1]];
  const ep = `${D.episode.series} · S${D.episode.s} · A${D.episode.e}`;

  const ICON = {
    back: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg>`,
    chev: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>`,
    spark: `<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5c.5 3.9 2.6 6 6.5 6.5-3.9.5-6 2.6-6.5 6.5-.5-3.9-2.6-6-6.5-6.5 3.9-.5 6-2.6 6.5-6.5zM19 14.5c.25 1.9 1.1 2.75 3 3-1.9.25-2.75 1.1-3 3-.25-1.9-1.1-2.75-3-3 1.9-.25 2.75-1.1 3-3z"/></svg>`,
    pause: `<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1.2"/><rect x="14" y="5" width="4" height="14" rx="1.2"/></svg>`,
    stop: `<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><rect x="5.5" y="5.5" width="13" height="13" rx="2.6"/></svg>`,
    rew: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 12a8.5 8.5 0 1 0 2.6-6.1"/><path d="M3.5 4v4.4h4.4"/></svg>`,
    mic: `<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>`,
    send: `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"/></svg>`,
    info: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.6v.1"/></svg>`,
  };

  /* ---------- Bouwstenen ---------- */
  const control = (opts = {}) => `<div class="xd-p xd-ctl ${opts.cls || ""}" style="${opts.style || ""}">
      <div class="xd-ctlhd"><div class="xd-ttl"><span class="xd-eb">${ep}</span><h3>${D.episode.title}</h3></div>
        <div class="xd-rbtns"><span class="xd-rb play" title="Pauze">${ICON.pause}</span><span class="xd-rb" title="Stop">${ICON.stop}</span></div></div>
      <div class="xd-bar"><i style="width:47%"></i><b style="left:47%"></b></div>
      <div class="xd-times"><span>21:14</span><span>nog 24:31</span></div>
      <div class="xd-rew">${["1 min", "2 min", "5 min"].map((t) => `<span>${ICON.rew}${t}</span>`).join("")}</div>
    </div>`;
  const face = (c, size) => `<div class="xd-face"><span class="xd-av" style="width:${size}px;height:${size}px"><img src="${I[c.img]}" alt=""></span><b>${c.name}</b><span>${c.character}</span></div>`;
  const scene = (opts = {}) => `<div class="xd-p xd-scene ${opts.cls || ""}" style="${opts.style || ""}">
      <div class="xd-shd"><h4>Nu in beeld</h4><span class="xd-all">Alle ${D.castTotal} ${ICON.chev}</span></div>
      <div class="xd-faces ${opts.row ? "row" : ""}">${inScene.map((c) => face(c, opts.size || 64)).join("")}</div>
      <div class="xd-foot"><span class="xd-hint">Klopt het niet of mist er iemand?</span><span class="xd-ai">${ICON.spark}Gebruik AI</span></div>
    </div>`;
  const ask = (opts = {}) => `<div class="xd-p xd-ask ${opts.cls || ""}" style="${opts.style || ""}">
      ${opts.title ? `<div class="xd-shd"><h4>${opts.title}</h4><span class="xd-sub">Typ of spreek je vraag in</span></div>` : ""}
      ${opts.noChips ? "" : `<div class="xd-qs">${(opts.chips || ["Net gebeurd", "Deze aflevering", "Dit seizoen", "Vorige afleveringen"]).map((q) => `<span>${q}</span>`).join("")}</div>`}
      <div class="xd-input"><span class="xd-ph">Vraag iets over wat je kijkt…</span><span class="xd-lang">NL</span><span class="xd-mic">${ICON.mic}</span></div>
    </div>`;

  const screen = (glass, inner, note) => `<div class="xd-tab ${glass}" data-cover><img class="xd-cover" src="${I.backdrop}" alt=""><div class="xd-vig"></div>
      <span class="xd-p xd-back">${ICON.back}Terug</span>${inner}</div><p class="xd-note">${note} · <b class="xd-pct"></b></p>`;

  /* ---------- Vier voorstellen ---------- */
  const V = [
    {
      key: "1", name: "Zijkolom · matglas",
      why: "Eén smalle kolom links (380 px), drie losse glazen kaarten. Rechts blijft het beeld vrij. Matglas: veel vervaging, weinig tint, een lichte rand bovenaan zoals een glasplaat.",
      html: screen("g-frost", `<div class="xd-colL">${control()}${scene()}${ask({ chips: ["Net gebeurd", "Deze aflevering", "Dit seizoen"] })}</div>`, "Matglas · blur 28 · tint 22 %"),
    },
    {
      key: "2", name: "Dok onderaan · vloeibaar glas",
      why: "Alles in één lage strook onderaan (240 px): bediening · nu in beeld · vragen naast elkaar. De bovenste twee derde is helemaal beeld. «Vloeibaar glas»: bijna doorzichtig, sterke verzadiging en een glanslijn langs de rand.",
      html: screen("g-liquid", `<div class="xd-dock">${control()}${scene({ row: true, size: 52 })}${ask({ title: "Vraag X-Ray", chips: ["Net gebeurd", "Deze aflevering"] })}</div>`, "Vloeibaar glas · blur 22 · tint 8 % · glansrand"),
    },
    {
      key: "3", name: "Hoeken · zwevend",
      why: "Elk blok in zijn eigen hoek, zo klein mogelijk: bediening linksboven, nu in beeld linksonder, het invoerveld als zwevende pil rechtsonder met de snelle vragen erboven. Het midden blijft leeg. Rookglas met zachte schaduw.",
      html: screen("g-smoke", `${control({ cls: "xd-tl" })}${scene({ cls: "xd-bl" })}${ask({ cls: "xd-br", chips: ["Net gebeurd", "Deze aflevering", "Dit seizoen"] })}`, "Rookglas · blur 18 · tint 35 % · schaduw"),
    },
    {
      key: "4", name: "Eén glazen blad rechts",
      why: "Eén doorlopend blad rechts (400 px) in plaats van losse kaarten; de blokken worden gescheiden door een fijne lijn. Voelt het rustigst. Helder glas met een verloop: bovenaan bijna doorzichtig, onderaan iets dichter waar je typt.",
      html: screen("g-sheet", `<div class="xd-sheet">${control({ cls: "flat" })}<i class="xd-hr"></i>${scene({ cls: "flat" })}<i class="xd-hr"></i>${ask({ cls: "flat" })}</div>`, "Helder glas met verloop · blur 30 · tint 10–30 %"),
    },
  ];

  const css = `<style>
  .xd-wrap{display:grid;grid-template-columns:repeat(2,1180px);gap:72px 64px;margin-top:28px}
  .xd-opt{display:flex;flex-direction:column;gap:14px}
  .xd-opt .ag-opthd p{max-width:1040px}
  .xd-note{margin:10px 0 0;font-size:13px;font-weight:700;color:var(--text-secondary)} .xd-note b{color:var(--action-primary)}
  .xd-tab{position:relative;width:1180px;height:820px;border-radius:28px;overflow:hidden;color:#fff;background:#0b0c10;box-shadow:0 40px 80px -40px rgba(16,17,48,.7)}
  .xd-cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
  .xd-vig{position:absolute;inset:0;background:radial-gradient(120% 90% at 60% 40%,rgba(0,0,0,0) 40%,rgba(0,0,0,.35))}
  .xd-p{position:relative;box-sizing:border-box}
  .xd-back{position:absolute;left:22px;top:22px;z-index:3;display:inline-flex;align-items:center;gap:6px;height:36px;padding:0 16px 0 12px;border-radius:999px;font-size:14px;font-weight:700}
  /* glasstijlen */
  .g-frost .xd-p{background:rgba(22,23,30,.22);backdrop-filter:blur(28px) saturate(1.4);-webkit-backdrop-filter:blur(28px) saturate(1.4);box-shadow:inset 0 1px 0 rgba(255,255,255,.28),inset 0 0 0 1px rgba(255,255,255,.12)}
  .g-liquid .xd-p{background:linear-gradient(135deg,rgba(255,255,255,.14),rgba(255,255,255,.04) 45%,rgba(255,255,255,.08));backdrop-filter:blur(22px) saturate(1.9) brightness(1.05);-webkit-backdrop-filter:blur(22px) saturate(1.9);box-shadow:inset 0 1px 1px rgba(255,255,255,.55),inset 0 -1px 1px rgba(255,255,255,.12),inset 0 0 0 1px rgba(255,255,255,.18),0 18px 40px -24px rgba(0,0,0,.6)}
  .g-smoke .xd-p{background:rgba(10,11,15,.35);backdrop-filter:blur(18px) saturate(1.2);-webkit-backdrop-filter:blur(18px) saturate(1.2);box-shadow:inset 0 0 0 1px rgba(255,255,255,.1),0 24px 50px -20px rgba(0,0,0,.65)}
  .g-sheet .xd-back{background:rgba(22,23,30,.25);backdrop-filter:blur(20px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.16)}
  .g-sheet .xd-sheet{background:linear-gradient(180deg,rgba(16,17,22,.10),rgba(16,17,22,.18) 45%,rgba(16,17,22,.34));backdrop-filter:blur(30px) saturate(1.5);-webkit-backdrop-filter:blur(30px) saturate(1.5);box-shadow:inset 1px 0 0 rgba(255,255,255,.2)}
  .g-sheet .xd-sheet .xd-p{background:none;box-shadow:none;backdrop-filter:none}
  /* kaarten */
  .xd-ctl,.xd-scene,.xd-ask{border-radius:22px;padding:16px 18px}
  .xd-ctlhd{display:flex;align-items:flex-start;gap:12px}
  .xd-ttl{flex:1;min-width:0}
  .xd-eb{display:block;font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#f6b7cc}
  .xd-ttl h3{margin:4px 0 0;font-size:28px;line-height:32px;font-weight:800;letter-spacing:-.02em;text-shadow:0 1px 12px rgba(0,0,0,.35)}
  .xd-rbtns{display:flex;gap:8px;flex:none}
  .xd-rb{width:44px;height:44px;border-radius:50%;display:grid;place-items:center;background:rgba(255,255,255,.16);box-shadow:inset 0 0 0 1px rgba(255,255,255,.22);color:#fff}
  .xd-rb.play{background:#fff;color:#111;box-shadow:none}
  .xd-bar{position:relative;height:6px;margin-top:16px;border-radius:9px;background:rgba(255,255,255,.22)}
  .xd-bar i{position:absolute;left:0;top:0;bottom:0;border-radius:9px;background:#ff3b4f}
  .xd-bar b{position:absolute;top:50%;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;background:#fff;box-shadow:0 1px 6px rgba(0,0,0,.4)}
  .xd-times{display:flex;justify-content:space-between;margin-top:8px;font-size:12px;font-weight:700;color:rgba(255,255,255,.72);font-variant-numeric:tabular-nums}
  .xd-rew{display:flex;gap:8px;margin-top:12px}
  .xd-rew span{flex:1;height:36px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;gap:6px;background:rgba(255,255,255,.12);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);font-size:13.5px;font-weight:800}
  .xd-shd{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
  .xd-shd h4{margin:0;font-size:16px;font-weight:800}
  .xd-all{height:28px;padding:0 7px 0 12px;border-radius:999px;background:rgba(255,255,255,.14);box-shadow:inset 0 0 0 1px rgba(255,255,255,.16);display:inline-flex;align-items:center;gap:2px;font-size:12.5px;font-weight:800}
  .xd-faces{display:flex;gap:12px}
  .xd-face{display:flex;flex-direction:column;align-items:center;text-align:center;width:104px}
  .xd-faces.row .xd-face{flex-direction:row;text-align:left;width:auto;gap:10px;align-items:center}
  .xd-faces.row{flex-direction:column;gap:8px}
  .xd-faces.row .xd-face b{margin:0} .xd-faces.row .xd-face > b,.xd-faces.row .xd-face > span:last-child{display:block}
  .xd-av{display:block;border-radius:50%;overflow:hidden;flex:none;box-shadow:0 0 0 2px rgba(143,227,189,.9)}
  .xd-av img{width:100%;height:100%;object-fit:cover;display:block}
  .xd-face b{margin-top:8px;font-size:13px;line-height:16px;font-weight:800}
  .xd-face span:last-child{font-size:12px;line-height:15px;color:rgba(255,255,255,.7);font-weight:600}
  .xd-faces.row .xd-face{display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;column-gap:10px}
  .xd-faces.row .xd-av{grid-row:1/3} .xd-faces.row .xd-face b{align-self:end} .xd-faces.row .xd-face span:last-child{align-self:start}
  .xd-foot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px}
  .xd-hint{font-size:12px;font-weight:600;color:rgba(255,255,255,.7);line-height:15px}
  .xd-ai{flex:none;display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 14px;border-radius:999px;background:rgba(169,173,244,.28);box-shadow:inset 0 0 0 1px rgba(201,203,255,.45);color:#fff;font-size:13px;font-weight:800}
  .xd-qs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px}
  .xd-qs span{height:30px;padding:0 12px;border-radius:999px;display:inline-flex;align-items:center;background:rgba(255,255,255,.12);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);font-size:12.5px;font-weight:700}
  .xd-input{display:flex;align-items:center;gap:8px;height:50px;padding:0 6px 0 16px;border-radius:999px;background:rgba(255,255,255,.92);color:#16181f}
  .xd-ph{flex:1;font-size:14.5px;font-weight:600;color:#6b6f80}
  .xd-lang{height:24px;padding:0 8px;border-radius:999px;background:#eceef5;font-size:11px;font-weight:800;display:inline-flex;align-items:center;color:#4a4f60}
  .xd-mic{width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:#5b5ff0;color:#fff}
  /* 1 · zijkolom */
  .xd-colL{position:absolute;left:22px;top:74px;bottom:22px;width:380px;display:flex;flex-direction:column;gap:12px;z-index:2}
  .xd-colL .xd-ask{margin-top:auto}
  /* 2 · dok */
  .xd-dock{position:absolute;left:22px;right:22px;bottom:22px;display:grid;grid-template-columns:380px 1fr 400px;gap:12px;z-index:2;align-items:stretch}
  .xd-dock .xd-ask{display:flex;flex-direction:column;justify-content:space-between}
  .xd-sub{font-size:12px;font-weight:600;color:rgba(255,255,255,.65)}
  .xd-dock .xd-scene .xd-foot{margin-top:10px}
  /* 3 · hoeken */
  .xd-tl{position:absolute;left:22px;top:74px;width:400px;z-index:2}
  .xd-bl{position:absolute;left:22px;bottom:22px;width:300px;z-index:2}
  .xd-bl .xd-foot{flex-direction:column;align-items:flex-start}
  .xd-br{position:absolute;right:22px;bottom:22px;width:440px;z-index:2;background:none !important;box-shadow:none !important;backdrop-filter:none !important;padding:0}
  .xd-br .xd-qs{justify-content:flex-end}
  .xd-br .xd-qs span{background:rgba(10,11,15,.4);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
  .xd-br .xd-input{box-shadow:0 20px 40px -18px rgba(0,0,0,.7)}
  /* 4 · blad */
  .xd-sheet{position:absolute;right:0;top:0;bottom:0;width:400px;z-index:2;display:flex;flex-direction:column;padding:22px 4px 20px}
  .xd-sheet .xd-p{border-radius:0}
  .xd-sheet .xd-ask{margin-top:auto}
  .xd-hr{display:block;height:1px;margin:4px 18px;background:rgba(255,255,255,.16)}
  </style>`;

  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = "left:0;top:0;width:2424px";
  b.innerHTML = `${css}<header class="bhd"><span class="bnum">XD</span><div><h2>X-Ray-dashboard · rustiger <span class="tag">4 voorstellen · 11 nov</span></h2><p>Na «XC · A»: te druk en te veel scherm bedekt. Nu enkel «Nu in beeld» (de cast zit achter «Alle ${D.castTotal}» in dat paneel), de AI-knop korter («Gebruik AI», met de sterretjes) en de hint «Klopt het niet of mist er iemand?». Bediening opnieuw: pauze en stop als twee even grote ronde knoppen rechtsboven, een dikkere voortgangsbalk met knop, en «1 min · 2 min · 5 min» voluit. Vragen: meteen een invoerveld met microfoon (en NL/EN), de snelle vragen erboven. Telkens een andere glasstijl zodat de cover meer doorschijnt; onder elk scherm hoeveel ervan bedekt is.</p><p class="uses">Bouwt op: XrayTablet, glassPanelClass (nieuwe varianten), CastRound tone="cinema", OverviewPill, useDictation (microfoon) · vervangt in XC: het Cast-paneel en de losse Gemini-knop</p></div></header>
    <div class="xd-wrap">${V.map((v) => `<div class="xd-opt"><div class="ag-opthd"><span class="ag-key">${v.key}</span><div><h3>${v.name}</h3><p>${v.why}</p></div></div>${v.html}</div>`).join("")}</div>`;
  world.appendChild(b);

  // Hoeveel van het scherm is bedekt door panelen (de terugknop telt niet mee).
  for (const tab of b.querySelectorAll(".xd-tab")) {
    const area = tab.offsetWidth * tab.offsetHeight;
    const panels = [...tab.querySelectorAll(".xd-ctl,.xd-scene,.xd-ask,.xd-sheet")].filter((el) => !el.closest(".xd-sheet") || el.classList.contains("xd-sheet"));
    const covered = panels.reduce((n, el) => {
      if (el.classList.contains("xd-br")) return n + [...el.children].reduce((m, c) => m + c.offsetWidth * c.offsetHeight, 0);
      return n + el.offsetWidth * el.offsetHeight;
    }, 0);
    tab.parentElement.querySelector(".xd-pct").textContent = `± ${Math.round((100 * covered) / area)} % van het scherm bedekt`;
  }

  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const topY = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${topY - 240 - b.offsetHeight}px`;
})();
