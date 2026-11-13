/* Kalender · «Alles van vandaag» (KO): tussenpagina achter «Bekijk alles» op de kalender, met alle gerechten en
   ingrediënten van vandaag groot in beeld en «Bekijk recept» per recept · 13 nov. Gebruikt window.KO_IMG. */
(() => {
  const world = document.getElementById("world");
  const I = window.KO_IMG;
  const BACK = '<svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M10 3.5 5.5 8 10 12.5"/></svg>';
  const ARROW = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3.5 10.5 8 6 12.5"/></svg>';

  const RECIPE = { name: "Witloofsla", img: I.witloofsla, persons: 2, ing: [{ n: "Witloof", q: "1 pak", img: I.witloof }, { n: "Limoen", q: "1", img: I.limoen }] };
  const EXTRA = [
    { n: "Groene asperges", q: "1 bussel", img: I.groene_asperges },
    { n: "Hamburger", q: "2 stuks", img: I.hamburger },
    { n: "Kroketjes", q: "1 zak", img: I.kroketjes },
  ];
  const DATE = "VRIJDAG 13 NOVEMBER";

  const top = (ph) => `<div class="ko-top ${ph ? "ph" : ""}"><span class="ko-back">${BACK}</span>${ph ? "" : '<span class="ko-crumb">Kalender</span>'}</div>`;
  const pill = (t = "Bekijk recept", sm = false) => `<span class="ko-pill ${sm ? "sm" : ""}">${t}</span>`;
  const head = (ph, cls = "") => `<div class="ko-head ${cls}"><span class="ko-eyebrow">VANDAAG ETEN WE</span><span class="ko-date">${DATE}</span>
    <h3>Witloofsla</h3><p>met groene asperges, hamburger en kroketjes</p></div>`;

  /* ---------- A · Bord links, alles als tegels rechts ---------- */
  const tileA = (x, big) => `<div class="ko-a-tile ${big ? "big" : ""}"><span class="ko-a-ph"><img src="${x.img}" alt=""></span><b>${x.n}</b><em>${x.q}</em></div>`;
  const deskA = () => `<div class="ko-dev desk">${top()}<div class="ko-a">
      <div class="ko-a-l"><span class="ko-plate" style="width:300px;height:300px"><img src="${RECIPE.img}" alt=""></span>${head()}<div class="ko-a-acts">${pill()}</div></div>
      <div class="ko-a-r">
        <div class="ko-grp"><span class="ko-grp-h">Voor de witloofsla <i>· 2 personen</i></span><div class="ko-a-grid">${RECIPE.ing.map((x) => tileA(x)).join("")}</div></div>
        <div class="ko-grp"><span class="ko-grp-h">Erbij</span><div class="ko-a-grid">${EXTRA.map((x) => tileA(x)).join("")}</div></div>
      </div></div></div>`;
  const phoneA = () => `<div class="ko-dev phn">${top(true)}<div class="ko-a ph">
      <span class="ko-plate" style="width:190px;height:190px;margin:0 auto"><img src="${RECIPE.img}" alt=""></span>${head(true, "c")}<div class="ko-a-acts c">${pill()}</div>
      <div class="ko-grp"><span class="ko-grp-h">Voor de witloofsla <i>· 2 personen</i></span><div class="ko-a-grid ph">${RECIPE.ing.map((x) => tileA(x)).join("")}</div></div>
      <div class="ko-grp"><span class="ko-grp-h">Erbij</span><div class="ko-a-grid ph">${EXTRA.map((x) => tileA(x)).join("")}</div></div></div></div>`;

  /* ---------- B · Strook van rand tot rand ---------- */
  const cardB = (x, recipe) =>
    recipe
      ? `<div class="ko-b-card rec"><span class="ko-plate" style="width:190px;height:190px"><img src="${x.img}" alt=""></span><span class="ko-b-tag">RECEPT</span><b>${x.name}</b><em>Witloof · limoen</em>${pill("Bekijk recept", true)}</div>`
      : `<div class="ko-b-card"><span class="ko-b-ph"><img src="${x.img}" alt=""></span><b>${x.n}</b><em>${x.q}</em>${x.from ? `<span class="ko-b-from">${x.from}</span>` : ""}</div>`;
  const stripB = () => [cardB(RECIPE, true), ...RECIPE.ing.map((x) => cardB({ ...x, from: "witloofsla" })), ...EXTRA.map((x) => cardB({ ...x, from: "erbij" }))].join("");
  const deskB = () => `<div class="ko-dev desk">${top()}<div class="ko-b">${head()}<div class="ko-b-strip">${stripB()}</div>
      <p class="ko-b-count">6 dingen voor vandaag · veeg voor meer</p></div></div>`;
  const phoneB = () => `<div class="ko-dev phn">${top(true)}<div class="ko-b ph">${head(true)}<div class="ko-b-strip ph">${stripB()}</div></div></div>`;

  /* ---------- C · Een kaart per gerecht ---------- */
  const rowC = (x) => `<span class="ko-c-row"><span class="ko-c-th"><img src="${x.img}" alt=""></span><b>${x.n}</b><em>${x.q}</em></span>`;
  const extraC = (x) => `<div class="ko-c-card ex"><span class="ko-c-big"><img src="${x.img}" alt=""></span><b>${x.n}</b><em>${x.q}</em></div>`;
  const deskC = () => `<div class="ko-dev desk">${top()}<div class="ko-c">${head(false, "row")}
      <div class="ko-c-bento">
        <div class="ko-c-card rec"><span class="ko-c-hero"><img src="${RECIPE.img}" alt=""></span><div class="ko-c-body"><span class="ko-b-tag">RECEPT · 2 PERSONEN</span><b class="ko-c-t">Witloofsla</b>${RECIPE.ing.map(rowC).join("")}<div class="ko-c-acts">${pill()}</div></div></div>
        ${EXTRA.map(extraC).join("")}
      </div></div></div>`;
  const phoneC = () => `<div class="ko-dev phn">${top(true)}<div class="ko-c ph">${head(true)}
      <div class="ko-c-card rec ph"><span class="ko-c-hero"><img src="${RECIPE.img}" alt=""></span><div class="ko-c-body"><span class="ko-b-tag">RECEPT · 2 PERSONEN</span><b class="ko-c-t">Witloofsla</b>${RECIPE.ing.map(rowC).join("")}<div class="ko-c-acts">${pill()}</div></div></div>
      <div class="ko-c-ex2">${EXTRA.map(extraC).join("")}</div></div></div>`;

  /* ---------- Op de kalender ---------- */
  const calBtn = () => `<div class="ko-cal"><span class="ko-plate" style="width:150px;height:150px"><img src="${RECIPE.img}" alt=""></span>
    <div><span class="ko-eyebrow">VANDAAG ETEN WE</span><b>Witloofsla</b><p>Met groene asperges, hamburger en kroketjes</p><span class="ko-pill">Bekijk alles ${ARROW}</span></div></div>`;

  const css = `<style>
  .ko-st{margin-top:40px}.ko-row{display:flex;gap:40px;align-items:flex-start;margin-top:18px}.ko-row > div{flex:none}
  .ko-dev{position:relative;overflow:hidden;background:linear-gradient(180deg,#f6ecd2 0%,#f4f1e7 38%,#f5f6fa 70%);color:var(--text-primary,#16181a)}
  .ko-dev.desk{width:1280px;height:720px;border-radius:22px;box-shadow:0 0 0 1px rgba(16,17,48,.08),0 30px 60px -30px rgba(16,17,48,.35)}
  .ko-dev.phn{width:390px;height:844px;border-radius:44px;box-shadow:0 0 0 10px #16181a,0 30px 60px -30px rgba(16,17,48,.5)}
  .ko-top{display:flex;align-items:center;gap:14px;padding:34px 120px 0}.ko-top.ph{padding:56px 16px 0}
  .ko-back{width:40px;height:40px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;color:#4f55f1;box-shadow:0 1px 2px rgba(16,17,48,.06)}
  .ko-crumb{font-size:22px;font-weight:800}
  .ko-plate{display:block;flex:none;border-radius:50%;overflow:hidden;filter:drop-shadow(6px 9px 12px rgba(150,110,30,.38))}.ko-plate img{width:100%;height:100%;object-fit:cover;transform:scale(1.08)}
  .ko-eyebrow{display:inline-flex;height:24px;align-items:center;padding:0 10px;border-radius:999px;background:#fff;color:#4f55f1;font-size:11.5px;font-weight:800;letter-spacing:.04em;box-shadow:0 2px 8px -3px rgba(16,17,48,.25)}
  .ko-head{display:flex;flex-direction:column;align-items:flex-start}.ko-head.c{align-items:center;text-align:center}
  .ko-date{margin-top:10px;font-size:14px;font-weight:700;color:#60636e;letter-spacing:.02em}
  .ko-head h3{margin:6px 0 0;font-size:44px;line-height:1.04;font-weight:800;letter-spacing:-.03em}
  .ko-head p{margin:8px 0 0;font-size:15px;font-weight:600;color:#60636e}
  .phn .ko-head h3{font-size:30px}.phn .ko-date{font-size:13px}.phn .ko-head p{font-size:14px}
  .ko-pill{display:inline-flex;align-items:center;gap:6px;height:48px;padding:0 26px;border-radius:999px;background:#16181a;color:#fff;font-size:15px;font-weight:700}
  .ko-pill.sm{height:38px;padding:0 16px;font-size:14px}
  .ko-grp{margin-top:6px}.ko-grp + .ko-grp{margin-top:24px}
  .ko-grp-h{display:block;font-size:11.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#8a8d98;margin-bottom:12px}.ko-grp-h i{font-style:normal;text-transform:none;letter-spacing:0;font-weight:600}
  /* A */
  .ko-a{display:flex;gap:56px;padding:26px 120px 0}.ko-a-l{width:330px;flex:none;display:flex;flex-direction:column;align-items:flex-start;gap:16px}
  .ko-a-l .ko-head h3{font-size:40px}.ko-a-acts{margin-top:4px}.ko-a-acts.c{display:flex;justify-content:center;margin:16px 0 22px}
  .ko-a-r{flex:1;padding-top:6px}.ko-a-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
  .ko-a-tile{background:#fff;border-radius:20px;padding:10px 10px 14px;box-shadow:0 1px 2px rgba(16,17,48,.04)}
  .ko-a-ph{display:flex;align-items:center;justify-content:center;height:150px;border-radius:14px;background:#f8f8f9}.ko-a-ph img{width:118px;height:118px;object-fit:contain;filter:drop-shadow(0 8px 10px rgba(16,17,48,.16))}
  .ko-a-tile b{display:block;margin:10px 4px 0;font-size:16px;font-weight:800}.ko-a-tile em{display:block;margin:2px 4px 0;font-style:normal;font-size:13.5px;color:#60636e}
  .ko-a.ph{display:block;padding:18px 16px 0}.ko-a.ph .ko-head{margin-top:14px}.ko-a-grid.ph{grid-template-columns:repeat(2,1fr);gap:12px}.ko-a.ph .ko-a-ph{height:110px}.ko-a.ph .ko-a-ph img{width:86px;height:86px}
  /* B */
  .ko-b{padding:24px 0 0}.ko-b > .ko-head{padding:0 120px}.ko-b > .ko-head h3{font-size:40px}
  .ko-b-strip{display:flex;gap:18px;padding:30px 120px 0;overflow:hidden}
  .ko-b-card{flex:none;width:226px;height:330px;border-radius:26px;background:#fff;display:flex;flex-direction:column;align-items:center;padding:18px 14px;text-align:center;box-shadow:0 1px 2px rgba(16,17,48,.04),inset 0 0 0 1px rgba(16,17,48,.05)}
  .ko-b-card.rec{width:250px;background:linear-gradient(180deg,#fbeec9,#fff 72%);box-shadow:0 0 0 2px #4f55f1,0 0 0 5px #edeefe}
  .ko-b-ph{display:flex;align-items:center;justify-content:center;width:190px;height:190px;border-radius:50%;background:#f8f8f9}.ko-b-ph img{width:150px;height:150px;object-fit:contain;filter:drop-shadow(0 10px 12px rgba(16,17,48,.18))}
  .ko-b-card b{margin-top:16px;font-size:18px;font-weight:800}.ko-b-card em{margin-top:2px;font-style:normal;font-size:14px;color:#60636e}
  .ko-b-card.rec b{margin-top:6px}.ko-b-card.rec .ko-pill{margin-top:auto}
  .ko-b-tag{margin-top:12px;font-size:10.5px;font-weight:800;letter-spacing:.1em;color:#a35a12}
  .ko-b-from{margin-top:auto;display:inline-flex;height:24px;align-items:center;padding:0 10px;border-radius:999px;background:#f3f3f5;font-size:11.5px;font-weight:700;color:#60636e}
  .ko-b-count{margin:14px 120px 0;font-size:13px;font-weight:600;color:#8a8d98}
  .ko-b.ph{padding-top:16px}.ko-b.ph > .ko-head{padding:0 16px}.ko-b.ph > .ko-head h3{font-size:30px}.ko-b-strip.ph{padding:22px 16px 0;gap:12px}
  .ko-b.ph .ko-b-card{width:200px;height:300px}.ko-b.ph .ko-b-card.rec{width:220px}.ko-b.ph .ko-b-ph{width:160px;height:160px}.ko-b.ph .ko-b-ph img{width:126px;height:126px}.ko-b.ph .ko-b-card.rec .ko-plate{width:160px!important;height:160px!important}
  /* C */
  .ko-c{padding:22px 120px 0}.ko-c > .ko-head.row h3{font-size:36px}
  .ko-c-bento{display:grid;grid-template-columns:1.55fr 1fr 1fr 1fr;gap:16px;margin-top:22px;height:430px}
  .ko-c-card{background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 1px 2px rgba(16,17,48,.04)}
  .ko-c-card.rec{display:flex;flex-direction:column}.ko-c-hero{display:block;height:170px;overflow:hidden}.ko-c-hero img{width:100%;height:100%;object-fit:cover}
  .ko-c-body{display:flex;flex-direction:column;padding:12px 16px 16px;flex:1}.ko-c-body .ko-b-tag{margin-top:0}.ko-c-t{font-size:24px;font-weight:800;letter-spacing:-.02em;margin:2px 0 8px}
  .ko-c-row{display:flex;align-items:center;gap:10px;padding:6px 0}.ko-c-row + .ko-c-row{border-top:1px solid rgba(16,17,48,.07)}
  .ko-c-th{width:44px;height:44px;border-radius:12px;background:#f8f8f9;display:flex;align-items:center;justify-content:center}.ko-c-th img{width:36px;height:36px;object-fit:contain}
  .ko-c-row b{font-size:15px;font-weight:700;flex:1}.ko-c-row em{font-style:normal;font-size:13.5px;color:#60636e}
  .ko-c-acts{margin-top:auto}
  .ko-c-card.ex{display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding:18px;text-align:center;background:linear-gradient(180deg,#f8f8f9 0%,#fff 62%)}
  .ko-c-big{flex:1;display:flex;align-items:center;justify-content:center}.ko-c-big img{width:170px;height:170px;object-fit:contain;filter:drop-shadow(0 12px 14px rgba(16,17,48,.2))}
  .ko-c-card.ex b{font-size:18px;font-weight:800}.ko-c-card.ex em{font-style:normal;font-size:14px;color:#60636e;margin-top:2px}
  .ko-c.ph{padding:16px 16px 0}.ko-c-card.rec.ph{margin-top:18px}.ko-c-card.rec.ph .ko-c-hero{height:150px}
  .ko-c-ex2{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:12px}.ko-c.ph .ko-c-card.ex{padding:10px 8px 12px;height:150px}.ko-c.ph .ko-c-big img{width:78px;height:78px}.ko-c.ph .ko-c-card.ex b{font-size:13.5px}.ko-c.ph .ko-c-card.ex em{font-size:12px}
  /* kalender */
  .ko-cal{display:flex;align-items:center;gap:26px;padding:22px 30px;border-radius:24px;background:linear-gradient(180deg,#f6ecd2,#f5f6fa);width:620px}
  .ko-cal b{display:block;margin-top:8px;font-size:32px;font-weight:800;letter-spacing:-.02em}.ko-cal p{margin:4px 0 14px;font-size:14px;font-weight:600;color:#60636e}
  .ko-cap{margin:8px 0 0;font-size:13px;font-weight:700;color:var(--text-secondary)}
  .ko-notes{margin-top:34px;display:grid;grid-template-columns:repeat(3,1fr);gap:20px;max-width:1720px}
  .ko-notes div{background:#fff;border-radius:20px;padding:16px 18px;box-shadow:0 0 0 1px var(--card-hairline)}
  .ko-notes b{display:block;font-size:15px;margin-bottom:4px}.ko-notes p{margin:0;font-size:14px;line-height:1.5;color:var(--text-secondary)}
  </style>`;

  const opt = (k, title, text, desk, phone) => `<div class="ko-st"><div class="ag-opthd"><span class="ag-key">${k}</span><div><h3>${title}</h3><p>${text}</p></div></div>
    <div class="ko-row"><div>${desk}<p class="ko-cap">Tablet · 1280 × 720</p></div><div>${phone}<p class="ko-cap">Gsm · 390 px</p></div></div></div>`;

  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = "left:0;top:0;width:1760px";
  b.innerHTML = `${css}<header class="bhd"><span class="bnum">KO</span><div><h2>Kalender · «Alles van vandaag» <span class="tag">tussenpagina achter «Bekijk alles» · 13 nov</span></h2><p>Staat er vandaag meer dan één recept, of komen er losse items bij het gerecht, dan wordt «Bekijk recept» op de kalender «Bekijk alles». Die knop opent een pagina met alles voor vandaag groot in beeld: het gerecht, de ingrediënten van het recept en wat erbij komt, elk met een grote foto en de hoeveelheid. Van daaruit open je het recept. Eén recept zonder iets erbij: «Bekijk recept» blijft meteen naar het recept gaan.</p><p class="uses">Bouwt op: RoundPlate (gerechtfoto), productfoto’s (useItemPhotoUrl), PageBackButton, Button, CategoryCard-vorm (wit, radius 20)</p></div></header>
    <div class="ko-st"><div class="ag-opthd"><span class="ag-key">0</span><div><h3>Op de kalender</h3><p>Zelfde plek als nu, enkel de knop verandert: «Bekijk alles ›» zodra er meer is dan één recept.</p></div></div><div class="ko-row">${calBtn()}</div></div>
    ${opt("A", "Bord links, alles als tegels", "Het gerecht groot links met «Bekijk recept», rechts elke foto op een eigen witte tegel, in twee groepen: «Voor de witloofsla» (de ingrediënten van het recept) en «Erbij». Rustig, alles in één oogopslag, past zonder vegen op de tablet.", deskA(), phoneA())}
    ${opt("B", "Strook van rand tot rand", "Zoals de nieuwe kalender op de tablet: één rij grote kaarten die tot de schermranden loopt. Eerst het recept (blauwe ring, «Bekijk recept»), dan elk ingrediënt met een grote ronde foto, hoeveelheid en een label waar het bij hoort. Veeg voor meer.", deskB(), phoneB())}
    ${opt("C", "Eén kaart per gerecht", "Een brede receptkaart met de gerechtfoto, de ingrediënten als lijst met foto en «Bekijk recept»; daarnaast elk extra item als eigen kaart met een heel grote foto. Toont het best wat bij wat hoort als er twee recepten zijn (elk recept een eigen brede kaart).", deskC(), phoneC())}
    <div class="ko-notes">
      <div><b>Twee recepten</b><p>Elk recept zijn eigen bord / kaart met zijn eigen «Bekijk recept»; de ingrediënten blijven per recept gegroepeerd, losse items onder «Erbij».</p></div>
      <div><b>Uit de diepvries of afhalen</b><p>Een diepvriesgerecht krijgt het sneeuwvlokje en «Uit de diepvries» i.p.v. ingrediënten; afhalen enkel het bord, zonder ingrediënten.</p></div>
      <div><b>Tablet en always-on</b><p>Past in één scherm zoals de kalender (zelfde verkleinen), en valt na 3 minuten zonder aanraking terug naar de kalender.</p></div>
    </div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const topY = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${topY - 240 - b.offsetHeight}px`;
})();
