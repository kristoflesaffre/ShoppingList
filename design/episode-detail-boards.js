/* Films · aflevering-detail «wauw»: seriebeeld op de achtergrond met verloop, echt projector-icoon · vier voorstellen · 3 nov. */
(() => {
  const world = document.getElementById("world");
  const I = window.EP_IMG;

  /* Echt projector-icoon: behuizing, grote lens links, rooster, pootjes (vervangt het presentatiebord). */
  const PROJ = (s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="7" width="20" height="10" rx="3"/><circle cx="8" cy="12" r="3"/><path d="M14.5 10.5h4M14.5 13.5h2.5"/><path d="M5.5 17v2M18.5 17v2"/></svg>`;
  const PROJ_BEAM = (s = 22) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="9" width="17" height="9" rx="2.5"/><circle cx="7.5" cy="13.5" r="2.5"/><path d="M13 12h3M13 15h2"/><path d="M19 11.5 22 9.5M19 15.5l3 2M19.5 13.5H22"/></svg>`;
  const EYE = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`;
  const CHECK = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>`;
  const BACK = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>`;
  const CHL = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 6-6 6 6 6"/></svg>`;
  const CHR = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg>`;
  const STAR = `<svg width="15" height="15" viewBox="0 0 24 24"><path fill="#f5b70a" d="m12 2.8 2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z"/></svg>`;
  const PLAY = `<svg width="22" height="22" viewBox="0 0 24 24"><path fill="currentColor" d="M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z"/></svg>`;

  const EP = {
    eyebrow: "Slow Horses · seizoen 5 · aflevering 6",
    title: "Littekens",
    meta: `${STAR}<b>8.5</b><span>· 29 okt 2025 · 52m · TV-MA</span>`,
    overview: "Om een bloedbad te voorkomen, moeten de trage paarden Farouks team zien te stoppen hun laatste stap uit te voeren.",
  };
  const EPS = [["Slechte dates", "46m"], ["Isoleren", "48m"], ["Sterke verhalen", "40m"], ["Raketten", "40m"], ["Circus", "45m"], ["Littekens", "52m"]];
  const CAST = [["Gary Oldman", "Jackson Lamb"], ["Jack Lowden", "River Cartwright"], ["Kristin Scott Thomas", "Diana Taverner"], ["Saskia Reeves", "Catherine Standish"], ["Christopher Chung", "Roddy Ho"], ["Aimee-Ffion Edwards", "Shirley Dander"]];

  const cast = (n, cls = "") => CAST.slice(0, n).map(([nm, ch], i) => `<div class="ep-cast ${cls}"><img src="${I["c" + (i + 1)]}" alt=""><b>${nm}</b><span>${ch}</span></div>`).join("");
  const progress = (dark) => `<div class="ep-prog ${dark ? "dk" : ""}"><div class="ep-bar"><i style="width:98%"></i></div><span>Stremio · nog 1 min · 50 / 51 min</span></div>`;
  const epStrip = (dark, n = 6) => `<div class="ep-strip ${dark ? "dk" : ""}">${EPS.slice(0, n).map(([t, r], i) => `<div class="ep-st ${i === 5 ? "on" : ""}"><div class="ep-st-img"><img src="${I["e" + (i + 1)]}" alt="">${i < 5 ? `<span class="ep-seen">${CHECK}</span>` : ""}${i === 5 ? `<span class="ep-now">Nu</span>` : ""}</div><b>${i + 1}. ${t}</b><span>${r}</span></div>`).join("")}</div>`;
  const nextCard = (dark) => `<div class="ep-next ${dark ? "dk" : ""}"><img src="${I.next}" alt=""><div><small>Volgende · seizoen 6</small><b>1. De levenscirkel</b></div><span class="ep-next-go">${CHR}</span></div>`;

  /* ---------- A · Cinema: donker, backdrop over de volle breedte ---------- */
  const A = {
    key: "A", name: "Cinema — donker, seriebeeld vult het scherm",
    why: "De pagina wordt een bioscoopzaal: het seriebeeld van Slow Horses staat over de volle breedte en vloeit onderaan en links weg in bijna-zwart. Titel groot op het beeld, projector als witte hoofdknop met het nieuwe icoon, voortgang van Stremio als dun balkje eronder. De still van de aflevering wordt een klein kader rechts; daaronder de afleveringen van het seizoen als strook.",
    desk: () => `<div class="ep-d ep-a">
      <div class="ep-a-bg" style="background-image:url(${I.bd})"></div><div class="ep-a-fade"></div>
      <div class="ep-top"><span class="ep-glass">${BACK}</span><span class="ep-sp"></span><span class="ep-glass">${CHL}</span><span class="ep-glass">${CHR}</span></div>
      <div class="ep-a-hero">
        <div class="ep-a-txt">
          <div class="ep-eb dk">${EP.eyebrow}</div>
          <h1 class="ep-h1 xl">${EP.title}</h1>
          <p class="ep-meta dk">${EP.meta}</p>
          <p class="ep-ov dk">${EP.overview}</p>
          <div class="ep-btns"><span class="ep-btn ep-white">${PROJ()}Kijk op projector</span><span class="ep-btn ep-glass">${EYE}Gezien</span></div>
          ${progress(true)}
        </div>
        <div class="ep-a-still"><img src="${I.still}" alt=""><span class="ep-play">${PLAY}</span><small>Aflevering 6 · 52m</small></div>
      </div>
      <div class="ep-a-low">
        <div class="ep-sec dk"><h3>Seizoen 5</h3><span>6 afleveringen</span></div>
        ${epStrip(true)}
        <div class="ep-a-row">
          <div><div class="ep-sec dk"><h3>Cast</h3><span class="ep-link dk">Alles</span></div><div class="ep-casts">${cast(6, "dk")}</div></div>
          <div style="width:380px">${nextCard(true)}</div>
        </div>
      </div>
    </div>`,
    mob: () => `<div class="ep-m ep-a">
      <div class="ep-m-bg" style="background-image:url(${I.bd})"></div><div class="ep-m-fade dk"></div>
      <div class="ep-mtop"><span class="ep-glass">${BACK}</span><span class="ep-sp"></span><span class="ep-glass">${CHR}</span></div>
      <div class="ep-m-body" style="margin-top:250px">
        <div class="ep-eb dk">${EP.eyebrow}</div>
        <h1 class="ep-h1 m dk">${EP.title}</h1>
        <p class="ep-meta dk">${EP.meta}</p>
        <div class="ep-btns col"><span class="ep-btn ep-white ep-wide">${PROJ()}Kijk op projector</span>${progress(true)}<span class="ep-btn ep-glass ep-wide">${EYE}Gezien</span></div>
        <p class="ep-ov dk sm">${EP.overview}</p>
        ${nextCard(true)}
        <div class="ep-sec dk" style="margin-top:18px"><h3>Cast</h3><span class="ep-link dk">Alles</span></div>
        <div class="ep-casts">${cast(4, "dk sm")}</div>
      </div>
    </div>`,
  };

  /* ---------- B · Licht met sfeer: backdrop vloeit uit in de app-achtergrond ---------- */
  const B = {
    key: "B", name: "Sfeer — licht, het beeld vloeit uit in de app",
    why: "Blijft in de lichte stijl van de app, maar met lucht: het seriebeeld staat bovenaan breed en vervaagt in --bg-app, met een zachte groene gloed uit het beeld. Op die overgang ligt één witte kaart met de aflevering: still links, tekst rechts, projector als blauwe hoofdknop. Voortgang en «Volgende» zitten in dezelfde kaart, zodat alles over deze aflevering op één plek staat.",
    desk: () => `<div class="ep-d ep-b">
      <div class="ep-b-bg" style="background-image:url(${I.bd})"></div><div class="ep-b-fade"></div>
      <div class="ep-top"><span class="ep-glass lt">${BACK}</span><span class="ep-sp"></span><span class="ep-glass lt">${CHL}</span><span class="ep-glass lt">${CHR}</span></div>
      <div class="ep-b-title"><div class="ep-eb dk">Slow Horses</div><div class="ep-b-series">Seizoen 5 · aflevering 6</div></div>
      <div class="ep-b-card">
        <div class="ep-b-still"><img src="${I.still}" alt=""><span class="ep-play sm">${PLAY}</span></div>
        <div class="ep-b-info">
          <h1 class="ep-h1">${EP.title}</h1>
          <p class="ep-meta">${EP.meta}</p>
          <p class="ep-ov">${EP.overview}</p>
          <div class="ep-btns"><span class="ep-btn ep-blue">${PROJ()}Kijk op projector</span><span class="ep-btn ep-soft">${EYE}Gezien</span></div>
          ${progress(false)}
        </div>
      </div>
      <div class="ep-b-low">
        <div style="flex:1;min-width:0"><div class="ep-sec"><h3>Cast</h3><span class="ep-link">Alles</span></div><div class="ep-casts">${cast(6)}</div></div>
        <div style="width:360px"><div class="ep-sec"><h3>Hierna</h3></div>${nextCard(false)}</div>
      </div>
    </div>`,
    mob: () => `<div class="ep-m ep-b">
      <div class="ep-m-bg" style="background-image:url(${I.bd});height:330px"></div><div class="ep-m-fade lt"></div>
      <div class="ep-mtop"><span class="ep-glass lt">${BACK}</span><span class="ep-sp"></span><span class="ep-glass lt">${CHR}</span></div>
      <div class="ep-m-body" style="margin-top:200px">
        <div class="ep-b-mcard">
          <div class="ep-b-still m"><img src="${I.still}" alt=""></div>
          <div class="ep-eb" style="margin-top:14px">${EP.eyebrow}</div>
          <h1 class="ep-h1 m">${EP.title}</h1>
          <p class="ep-meta">${EP.meta}</p>
          <div class="ep-btns col"><span class="ep-btn ep-blue ep-wide">${PROJ()}Kijk op projector</span>${progress(false)}<span class="ep-btn ep-soft ep-wide">${EYE}Gezien</span></div>
        </div>
        <p class="ep-ov sm" style="margin:16px 4px 14px">${EP.overview}</p>
        ${nextCard(false)}
      </div>
    </div>`,
  };

  /* ---------- C · Still op het doek: serie als wazige zaal, aflevering als filmdoek ---------- */
  const C = {
    key: "C", name: "Filmdoek — de aflevering groot, de serie als zaal",
    why: "Het seriebeeld wordt wazig en donker de hele achtergrond (de «zaal»), de still van deze aflevering staat er scherp en groot op als filmdoek, met de titel onderaan op het beeld. Rechts een glazen paneel met de projector-knop, voortgang en Gezien. Onder het doek de afleveringen van seizoen 5 met vinkjes voor wat je al zag: je ziet meteen waar je zit in het seizoen.",
    desk: () => `<div class="ep-d ep-c">
      <div class="ep-c-bg" style="background-image:url(${I.bd})"></div><div class="ep-c-dim"></div>
      <div class="ep-top"><span class="ep-glass">${BACK}</span><span class="ep-c-crumb">Slow Horses <i>›</i> Seizoen 5</span><span class="ep-sp"></span><span class="ep-glass">${CHL}</span><span class="ep-glass">${CHR}</span></div>
      <div class="ep-c-main">
        <div class="ep-c-screen"><img src="${I.still}" alt=""><div class="ep-c-shade"></div>
          <div class="ep-c-cap"><div class="ep-eb dk">Aflevering 6</div><h1 class="ep-h1 xl">${EP.title}</h1><p class="ep-meta dk">${EP.meta}</p></div>
        </div>
        <div class="ep-c-panel">
          <span class="ep-c-dev">${PROJ(16)} Projector · woonkamer</span>
          <span class="ep-btn ep-white ep-wide ep-big">${PROJ(22)}Kijk op projector</span>
          ${progress(true)}
          <span class="ep-btn ep-glass ep-wide">${EYE}Gezien</span>
          <p class="ep-ov dk sm">${EP.overview}</p>
          ${nextCard(true)}
        </div>
      </div>
      <div class="ep-c-low">${epStrip(true)}</div>
    </div>`,
    mob: () => `<div class="ep-m ep-c">
      <div class="ep-c-bg" style="background-image:url(${I.bd})"></div><div class="ep-c-dim"></div>
      <div class="ep-mtop"><span class="ep-glass">${BACK}</span><span class="ep-sp"></span><span class="ep-glass">${CHR}</span></div>
      <div class="ep-m-body" style="margin-top:72px">
        <div class="ep-c-screen m"><img src="${I.still}" alt=""><div class="ep-c-shade"></div>
          <div class="ep-c-cap m"><div class="ep-eb dk">Slow Horses · S5 · A6</div><h1 class="ep-h1 m dk">${EP.title}</h1></div>
        </div>
        <p class="ep-meta dk" style="margin-top:12px">${EP.meta}</p>
        <div class="ep-btns col"><span class="ep-btn ep-white ep-wide">${PROJ()}Kijk op projector</span>${progress(true)}<span class="ep-btn ep-glass ep-wide">${EYE}Gezien</span></div>
        <p class="ep-ov dk sm">${EP.overview}</p>
        <div class="ep-sec dk" style="margin-top:16px"><h3>Seizoen 5</h3></div>
        ${epStrip(true, 4)}
      </div>
    </div>`,
  };

  /* ---------- D · Streaming-stijl: beeld rechts, verloop van links ---------- */
  const D = {
    key: "D", name: "Streaming — beeld rechts, tekst op het verloop",
    why: "Zoals bij de grote streamingdiensten: het seriebeeld staat rechts groot en loopt naar links weg in een diep groenblauw dat uit het beeld komt. Links grote titel, de projector-knop met de status van de projector erin («Klaar · woonkamer») en een hervat-balk. Geen losse still meer bovenaan: de still komt terug als kaartje in de afleveringenrij onderaan, met cast ernaast als ronde foto's.",
    desk: () => `<div class="ep-d ep-dd">
      <div class="ep-d-bg" style="background-image:url(${I.bd})"></div><div class="ep-d-fade"></div>
      <div class="ep-top"><span class="ep-glass">${BACK}</span><span class="ep-sp"></span><span class="ep-glass">${CHL}</span><span class="ep-glass">${CHR}</span></div>
      <div class="ep-d-txt">
        <div class="ep-d-series">SLOW HORSES</div>
        <div class="ep-eb dk">Seizoen 5 · aflevering 6</div>
        <h1 class="ep-h1 xxl">${EP.title}</h1>
        <p class="ep-meta dk">${EP.meta}</p>
        <p class="ep-ov dk">${EP.overview}</p>
        <div class="ep-btns">
          <span class="ep-btn ep-white ep-big ep-two">${PROJ(24)}<span><b>Kijk op projector</b><small>Klaar · woonkamer</small></span></span>
          <span class="ep-round">${EYE}</span>
        </div>
        ${progress(true)}
      </div>
      <div class="ep-d-low">
        <div class="ep-sec dk"><h3>Seizoen 5</h3><span class="ep-pills"><i>4</i><i class="on">5</i><i>6</i></span></div>
        ${epStrip(true)}
      </div>
    </div>`,
    mob: () => `<div class="ep-m ep-dd">
      <div class="ep-m-bg" style="background-image:url(${I.bd});background-position:58% 0;height:420px"></div><div class="ep-m-fade dd"></div>
      <div class="ep-mtop"><span class="ep-glass">${BACK}</span><span class="ep-sp"></span><span class="ep-glass">${CHR}</span></div>
      <div class="ep-m-body" style="margin-top:300px;text-align:center">
        <div class="ep-d-series">SLOW HORSES</div>
        <div class="ep-eb dk">Seizoen 5 · aflevering 6</div>
        <h1 class="ep-h1 m dk">${EP.title}</h1>
        <p class="ep-meta dk" style="justify-content:center">${EP.meta}</p>
        <div class="ep-btns col"><span class="ep-btn ep-white ep-wide ep-two">${PROJ(22)}<span><b>Kijk op projector</b><small>Klaar · woonkamer</small></span></span>${progress(true)}</div>
        <div class="ep-mrow"><span class="ep-btn ep-glass">${EYE}Gezien</span><span class="ep-btn ep-glass">${CHR}Volgende</span></div>
        <p class="ep-ov dk sm" style="text-align:left">${EP.overview}</p>
      </div>
    </div>`,
  };

  const V = [A, B, C, D];
  const css = `<style>
  .ep-opts{display:flex;flex-direction:column;gap:64px}
  .ep-stage{background:#e9eaf0;border-radius:26px;padding:28px;display:flex;gap:28px;align-items:flex-start}
  .ep-stage *{box-sizing:border-box}
  .ep-cap{font-size:13px;font-weight:700;color:var(--text-tertiary);margin:0 0 8px 4px;text-transform:uppercase;letter-spacing:.06em}
  .ep-d,.ep-m{position:relative;overflow:hidden;font-family:var(--font-sans);color:#16181a;background:#f5f6fa}
  .ep-d{width:1280px;min-height:820px;border-radius:24px;padding:28px 64px 48px}
  .ep-m{width:390px;height:844px;border-radius:44px;padding:54px 18px 0;box-shadow:0 0 0 8px #16181a}
  .ep-a,.ep-c,.ep-dd{background:#0c0e12;color:#fff}
  .ep-top,.ep-mtop{position:relative;z-index:3;display:flex;gap:10px;align-items:center}
  .ep-sp{flex:1}
  .ep-glass{width:40px;height:40px;border-radius:50%;display:grid;place-items:center;color:#fff;background:rgba(255,255,255,.14);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)}
  .ep-glass.lt{background:rgba(255,255,255,.82);color:#4b4fe0;box-shadow:0 1px 2px rgba(16,17,48,.08)}
  .ep-eb{font-size:13px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:#5a5df0}
  .ep-eb.dk{color:rgba(255,255,255,.72)}
  .ep-h1{margin:8px 0 0;font-size:40px;line-height:1.05;font-weight:800;letter-spacing:-.025em}
  .ep-h1.xl{font-size:64px;letter-spacing:-.035em}
  .ep-h1.xxl{font-size:84px;letter-spacing:-.04em}
  .ep-h1.m{font-size:36px}
  .ep-h1.dk{color:#fff}
  .ep-meta{display:flex;gap:6px;align-items:center;margin:12px 0 0;font-size:15px;color:#5f6470}
  .ep-meta b{color:#16181a}
  .ep-meta.dk{color:rgba(255,255,255,.72)} .ep-meta.dk b{color:#fff}
  .ep-ov{margin:16px 0 0;font-size:16px;line-height:1.55;max-width:520px;color:#2a2d33}
  .ep-ov.dk{color:rgba(255,255,255,.82)} .ep-ov.sm{font-size:14.5px}
  .ep-btns{display:flex;gap:12px;align-items:center;margin-top:24px}
  .ep-btns.col{flex-direction:column;align-items:stretch;gap:10px;margin-top:18px}
  .ep-btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;height:50px;padding:0 24px;border-radius:999px;font-weight:800;font-size:16px;white-space:nowrap}
  .ep-btn.ep-wide{width:100%} .ep-btn.ep-big{height:58px;font-size:17px}
  .ep-btn.ep-white{background:#fff;color:#16181a;box-shadow:0 14px 30px -14px rgba(0,0,0,.6)}
  .ep-btn.ep-blue{background:#5a5df0;color:#fff;box-shadow:0 12px 24px -12px rgba(90,93,240,.7)}
  .ep-btn.ep-soft{background:#ecedfd;color:#4b4fe0}
  .ep-btn.ep-glass{background:rgba(255,255,255,.14);color:#fff;backdrop-filter:blur(14px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.2)}
  .ep-btn.ep-two{justify-content:flex-start;padding:0 26px 0 20px;height:62px;text-align:left}
  .ep-btn.ep-two span{display:flex;flex-direction:column;line-height:1.15} .ep-btn.ep-two small{font-size:12.5px;font-weight:700;color:#1f9d55;display:flex;align-items:center;gap:6px}
  .ep-btn.ep-two small::before{content:"";width:7px;height:7px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.2)}
  .ep-round{width:62px;height:62px;border-radius:50%;display:grid;place-items:center;color:#fff;background:rgba(255,255,255,.14);backdrop-filter:blur(14px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.2)}
  .ep-prog{display:flex;align-items:center;gap:12px;margin-top:14px;font-size:13px;font-weight:600;color:#5f6470}
  .ep-prog.dk{color:rgba(255,255,255,.66)}
  .ep-bar{flex:none;width:140px;height:5px;border-radius:9px;background:#e1e3ea;overflow:hidden}
  .ep-prog.dk .ep-bar{background:rgba(255,255,255,.2)}
  .ep-bar i{display:block;height:100%;background:#5a5df0;border-radius:9px}
  .ep-prog.dk .ep-bar i{background:#fff}
  .ep-btns.col .ep-prog{margin:0 4px} .ep-btns.col .ep-bar{width:96px}
  .ep-play{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:64px;height:64px;border-radius:50%;display:grid;place-items:center;color:#fff;background:rgba(255,255,255,.2);backdrop-filter:blur(12px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.35)}
  .ep-play.sm{width:52px;height:52px}
  .ep-sec{display:flex;align-items:baseline;justify-content:space-between;margin:0 0 12px}
  .ep-sec h3{margin:0;font-size:20px;font-weight:800;letter-spacing:-.01em}
  .ep-sec span{font-size:14px;color:#8a8f99;font-weight:600} .ep-sec.dk span{color:rgba(255,255,255,.55)}
  .ep-link{color:#5a5df0!important;font-weight:700!important} .ep-link.dk{color:#fff!important}
  .ep-casts{display:flex;gap:14px}
  .ep-cast{width:96px;text-align:center;font-size:13px;line-height:1.25}
  .ep-cast img{width:80px;height:80px;border-radius:50%;object-fit:cover;display:block;margin:0 auto 8px;box-shadow:0 0 0 3px #fff,0 6px 14px -8px rgba(16,17,48,.5)}
  .ep-cast b{display:block;font-weight:700} .ep-cast span{display:block;color:#8a8f99;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ep-cast.dk img{box-shadow:0 0 0 2px rgba(255,255,255,.25)} .ep-cast.dk span{color:rgba(255,255,255,.55)}
  .ep-cast.sm{width:76px} .ep-cast.sm img{width:64px;height:64px}
  .ep-next{display:flex;align-items:center;gap:14px;padding:10px 14px 10px 10px;border-radius:20px;background:#fff;box-shadow:0 1px 2px rgba(16,17,48,.04),inset 0 0 0 1px #eceef3}
  .ep-next.dk{background:rgba(255,255,255,.1);backdrop-filter:blur(16px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14)}
  .ep-next img{width:92px;height:52px;border-radius:10px;object-fit:cover}
  .ep-next div{flex:1;min-width:0} .ep-next small{display:block;font-size:11.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#8a8f99}
  .ep-next.dk small{color:rgba(255,255,255,.55)} .ep-next b{display:block;font-size:15px;margin-top:2px}
  .ep-next-go{color:#5a5df0} .ep-next.dk .ep-next-go{color:#fff}
  .ep-strip{display:grid;grid-template-columns:repeat(6,1fr);gap:14px}
  .ep-m .ep-strip{display:flex;gap:10px;overflow:hidden} .ep-m .ep-st{width:150px;flex:none}
  .ep-st-img{position:relative;aspect-ratio:16/9;border-radius:12px;overflow:hidden;background:#222}
  .ep-st-img img{width:100%;height:100%;object-fit:cover;display:block}
  .ep-st b{display:block;margin-top:8px;font-size:13.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .ep-st > span{font-size:12.5px;color:rgba(255,255,255,.5)}
  .ep-st:not(.on) .ep-st-img img{opacity:.62}
  .ep-st.on .ep-st-img{box-shadow:0 0 0 3px #fff}
  .ep-seen{position:absolute;right:7px;top:7px;width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:#5a5df0;color:#fff}
  .ep-now{position:absolute;left:8px;bottom:8px;height:22px;padding:0 9px;border-radius:999px;background:#fff;color:#16181a;font-size:11.5px;font-weight:800;display:flex;align-items:center}
  .ep-m-body{position:relative;z-index:2}
  .ep-m-bg{position:absolute;inset:0 0 auto;height:380px;background-size:cover;background-position:52% 0}
  .ep-m-fade{position:absolute;inset:0 0 auto;height:440px}
  .ep-m-fade.dk{background:linear-gradient(180deg,rgba(12,14,18,.25) 0%,rgba(12,14,18,0) 30%,rgba(12,14,18,.75) 68%,#0c0e12 86%)}
  .ep-m-fade.lt{height:340px;background:linear-gradient(180deg,rgba(245,246,250,0) 30%,rgba(245,246,250,.8) 75%,#f5f6fa 100%)}
  .ep-m-fade.dd{height:430px;background:linear-gradient(180deg,rgba(12,22,26,.2) 0%,rgba(12,22,26,0) 30%,rgba(12,22,26,.85) 74%,#0c161a 92%)}
  .ep-mrow{display:flex;gap:10px;margin-top:10px} .ep-mrow .ep-btn{flex:1;height:46px;font-size:15px}
  /* A */
  .ep-a-bg{position:absolute;inset:0 0 auto;height:640px;background-size:cover;background-position:50% 18%}
  .ep-a-fade{position:absolute;inset:0;background:linear-gradient(90deg,rgba(12,14,18,.92) 0%,rgba(12,14,18,.55) 38%,rgba(12,14,18,0) 70%),linear-gradient(180deg,rgba(12,14,18,.35) 0%,rgba(12,14,18,0) 18%,rgba(12,14,18,0) 42%,rgba(12,14,18,.85) 66%,#0c0e12 76%)}
  .ep-a-hero{position:relative;z-index:2;display:flex;justify-content:space-between;align-items:flex-end;margin-top:120px}
  .ep-a-txt{width:560px}
  .ep-a-still{position:relative;width:360px;border-radius:18px;overflow:hidden;box-shadow:0 30px 60px -24px rgba(0,0,0,.9),inset 0 0 0 1px rgba(255,255,255,.2)}
  .ep-a-still img{display:block;width:100%;aspect-ratio:16/9;object-fit:cover}
  .ep-a-still small{position:absolute;left:12px;bottom:10px;font-size:12px;font-weight:700;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.6)}
  .ep-a-low{position:relative;z-index:2;margin-top:44px}
  .ep-a-row{display:flex;gap:40px;justify-content:space-between;align-items:flex-end;margin-top:28px}
  .ep-a .ep-strip .ep-st-img{border-radius:12px}
  /* B */
  .ep-b-bg{position:absolute;inset:0 0 auto;height:420px;background-size:cover;background-position:50% 22%}
  .ep-b-fade{position:absolute;inset:0 0 auto;height:440px;background:linear-gradient(180deg,rgba(245,246,250,0) 25%,rgba(245,246,250,.7) 68%,#f5f6fa 96%),radial-gradient(80% 60% at 50% 100%,rgba(140,180,150,.25),transparent)}
  .ep-b-title{position:relative;z-index:2;margin-top:150px;color:#fff;text-shadow:0 2px 14px rgba(0,0,0,.45)}
  .ep-b-series{font-size:30px;font-weight:800;letter-spacing:-.02em;margin-top:4px}
  .ep-b-card{position:relative;z-index:2;margin-top:22px;display:flex;gap:32px;padding:22px;border-radius:28px;background:#fff;box-shadow:0 24px 50px -30px rgba(16,17,48,.45),0 1px 2px rgba(16,17,48,.04)}
  .ep-b-still{position:relative;width:500px;flex:none;border-radius:18px;overflow:hidden}
  .ep-b-still img{display:block;width:100%;height:100%;object-fit:cover;aspect-ratio:16/10}
  .ep-b-still.m{width:100%} .ep-b-still.m img{height:auto;aspect-ratio:16/9}
  .ep-b-info{padding:8px 8px 4px 0}
  .ep-b-info .ep-h1{margin-top:0}
  .ep-b-low{position:relative;z-index:2;display:flex;gap:48px;margin-top:30px;align-items:flex-start}
  .ep-b-mcard{padding:12px 12px 16px;border-radius:26px;background:#fff;box-shadow:0 24px 50px -30px rgba(16,17,48,.45)}
  .ep-b-mcard .ep-eb,.ep-b-mcard .ep-h1,.ep-b-mcard .ep-meta{padding:0 6px}
  /* C */
  .ep-c-bg{position:absolute;inset:-40px;background-size:cover;background-position:center;filter:blur(30px) saturate(1.4) brightness(1.1);transform:scale(1.1)}
  .ep-c-dim{position:absolute;inset:0;background:radial-gradient(90% 70% at 40% 35%,rgba(12,14,18,.1),rgba(12,14,18,.78))}
  .ep-c-crumb{color:rgba(255,255,255,.75);font-size:15px;font-weight:700;margin-left:6px} .ep-c-crumb i{font-style:normal;opacity:.5;margin:0 6px}
  .ep-c-main{position:relative;z-index:2;display:flex;gap:28px;margin-top:26px}
  .ep-c-screen{position:relative;flex:1;border-radius:22px;overflow:hidden;aspect-ratio:16/9;box-shadow:0 40px 80px -30px rgba(0,0,0,.95),0 0 0 1px rgba(255,255,255,.12)}
  .ep-c-screen img{width:100%;height:100%;object-fit:cover;display:block}
  .ep-c-shade{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0) 45%,rgba(0,0,0,.78))}
  .ep-c-cap{position:absolute;left:32px;bottom:28px;right:32px}
  .ep-c-cap.m{left:16px;bottom:14px}
  .ep-c-screen.m{width:100%;border-radius:20px}
  .ep-c-panel{width:330px;flex:none;display:flex;flex-direction:column;gap:12px;padding:20px;border-radius:24px;background:rgba(255,255,255,.08);backdrop-filter:blur(20px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.14)}
  .ep-c-panel .ep-prog{margin:0 2px;font-size:12.5px} .ep-c-panel .ep-bar{width:64px} .ep-c-panel .ep-ov{margin:4px 0}
  .ep-c-dev{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:rgba(255,255,255,.7)}
  .ep-c-low{position:relative;z-index:2;margin-top:28px}
  /* D */
  .ep-dd{background:#0c161a}
  .ep-d-bg{position:absolute;right:0;top:0;width:900px;height:620px;background-size:cover;background-position:50% 20%}
  .ep-d-fade{position:absolute;inset:0;background:linear-gradient(90deg,#0c161a 0%,#0c161a 30%,rgba(12,22,26,.75) 48%,rgba(12,22,26,0) 72%),linear-gradient(180deg,rgba(12,22,26,0) 50%,rgba(12,22,26,.9) 68%,#0c161a 74%),radial-gradient(60% 50% at 75% 30%,rgba(120,170,150,.18),transparent)}
  .ep-d-txt{position:relative;z-index:2;width:560px;margin-top:70px}
  .ep-d-series{font-size:15px;font-weight:900;letter-spacing:.32em;color:#c9e3d6;margin-bottom:12px}
  .ep-d-low{position:relative;z-index:2;margin-top:52px}
  .ep-pills{display:flex;gap:6px} .ep-pills i{font-style:normal;width:34px;height:30px;border-radius:999px;display:grid;place-items:center;font-size:13px;font-weight:800;color:#fff;background:rgba(255,255,255,.1)} .ep-pills i.on{background:#fff;color:#16181a}
  </style>`;

  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = "left:0;top:0;width:1820px";
  b.innerHTML = `${css}<header class="bhd"><span class="bnum">EP</span><div><h2>Films · aflevering «wauw» <span class="tag">4 voorstellen · 3 nov</span></h2><p>Nu: een still links, tekst rechts, een blauwe knop met een presentatiebord-icoon en veel lege ruimte. Vier richtingen met het seriebeeld van Slow Horses op de achtergrond en een verloop dat uitvloeit, telkens desktop en gsm. Het projector-icoon is overal een echte projector (behuizing · lens · rooster · pootjes). Stremio-voortgang wordt een dun balkje onder de knop.</p><p class="uses">Bouwt op: GlassIconButton, ActionPill, CastRound, EpisodeRow, SeasonPills, WatchOnProjector (nieuw icoon), Shimmer</p></div></header>
    <div class="ep-opts" style="margin-top:28px">${V.map((v) => `<div class="ep-opt"><div class="ag-opthd"><span class="ag-key">${v.key}</span><div><h3>${v.name}</h3><p>${v.why}</p></div></div><div class="ep-stage"><div><p class="ep-cap">Desktop</p>${v.desk()}</div><div><p class="ep-cap">Gsm</p>${v.mob()}</div></div></div>`).join("")}</div>
    <div class="ep-opt" style="margin-top:56px"><div class="ag-opthd"><span class="ag-key" style="font-size:15px">icoon</span><div><h3>Projector-icoon</h3><p>Vervangt het presentatiebord in WatchOnProjector. Links de basisversie (knop), rechts met lichtbundel voor groter gebruik.</p></div></div>
      <div class="ep-stage" style="gap:40px;align-items:center;color:#16181a">${PROJ(64)}${PROJ_BEAM(64)}<span class="ep-btn ep-blue">${PROJ()}Kijk op projector</span><span class="ep-btn ep-white" style="box-shadow:0 0 0 1px #e1e3ea">${PROJ()}Kijk op projector</span></div></div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const topY = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${topY - 240 - b.offsetHeight}px`;
})();
