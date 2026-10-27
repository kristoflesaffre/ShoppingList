/* Kalender · hero met foto: vier richtingen voor de geselecteerde/volgende afspraak (15 okt). */
(() => {
  const world = document.getElementById("world");
  const C = [214, 134, 52]; // afspraakkleur (oranje, zoals Tanja)
  const rgba = ([r, g, b], a = 1) => `rgba(${r},${g},${b},${a})`;
  const deep = ([r, g, b], k = 0.55) => `rgb(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)})`;
  const P = IMG.ag_tanja_holvoet;

  const text = (mobile) => `<div class="hx-text${mobile ? " m" : ""}">
      <span class="hx-badge">OVER 53 MIN</span>
      <span class="hx-date">DONDERDAG 15 OKTOBER</span>
      <span class="hx-title">Tanja Holvoet Kristof</span>
      <span class="hx-time">17:00 – 18:00</span>
    </div>`;
  const pill = (cls = "") => `<span class="hx-pill ${cls}" style="color:${deep(C)}">17:00</span>`;

  /* A · Zachte cirkel */
  const artA = (s) => `<div class="hx-art a" style="width:${s}px;height:${s}px">
      <img class="hx-glow" src="${P}" alt="">
      <img class="hx-circle" src="${P}" alt="">
      ${pill()}
    </div>`;
  /* B · Organische vorm */
  const artB = (s) => `<div class="hx-art b" style="width:${s}px;height:${s}px">
      <span class="hx-blobshadow" style="background:${rgba(C, 0.35)}"></span>
      <img class="hx-blob" src="${P}" alt="">
      ${pill("sticker")}
    </div>`;
  /* D · Fotostapel */
  const artD = (s) => `<div class="hx-art d" style="width:${s}px;height:${s}px">
      <span class="hx-card back2"><img src="${IMG.ag_verjaardag}" alt=""></span>
      <span class="hx-card back1"><img src="${IMG.ag_sjotter}" alt=""></span>
      <span class="hx-card front"><img src="${P}" alt=""><b>Vandaag · 17:00</b></span>
    </div>`;

  const band = (inner, mobile, extra = "") =>
    `<div class="hx-frame${mobile ? " m" : ""}" style="background:linear-gradient(180deg, ${rgba(C, 0.28)}, ${rgba(C, 0.06)} 70%, #f5f6fa)">${extra}${inner}</div>`;

  const desk = (art) => band(`<div class="hx-row">${art}${text(false)}</div>`, false);
  const mob = (art) => band(`<div class="hx-col">${art}${text(true)}</div>`, true);

  /* C · Volle foto, uitgewassen achter de hele band */
  const deskC = band(`<div class="hx-row c">${text(false)}</div>`, false, `<span class="hx-full d" style="background-image:url(${P})"></span><span class="hx-fullfade d" style="background:linear-gradient(90deg, #fbeee0 30%, rgba(251,238,224,.75) 48%, rgba(251,238,224,0) 72%), linear-gradient(0deg, #f5f6fa 0%, rgba(245,246,250,0) 30%)"></span>`);
  const mobC = band(`<div class="hx-col c">${text(true)}</div>`, true, `<span class="hx-full m" style="background-image:url(${P})"></span><span class="hx-fullfade m" style="background:linear-gradient(180deg, rgba(251,238,224,0) 18%, rgba(251,238,224,.85) 52%, #f8efe6 66%, #f5f6fa 100%)"></span>`);

  const OPTS = [
    ["A", "Zachte cirkel", "De foto rond uitgesneden met zachte, vervagende randen; erachter een wazige gloed uit de eigen kleuren. De uur-pil overlapt onderaan, zoals nu bij de kalender-illustratie. Rustig, persoonlijk.", desk(artA(330)), mob(artA(250))],
    ["B", "Organische vorm", "Een zachte, onregelmatige vorm (licht gedraaid) met een gekleurde schaduw in de afspraakkleur; het uur als schuin «stickertje». Speels en organisch, past bij de illustraties in de app.", desk(artB(330)), mob(artB(250))],
    ["C", "Volle foto, uitgewassen", "De foto vult de hele bovenband en vloeit uit in de achtergrond; de tekst staat op het rustige, effen deel (desktop links, mobiel onderaan). Meest sfeervol en «groot», minst afgebakend.", deskC, mobC],
    ["D", "Fotostapel", "De foto als licht gekanteld kaartje met witte rand en bijschrift, met de volgende afspraken als kaartjes erachter (zoals de waaier bij Recepten). Toont meteen ook wat erna komt.", desk(artD(330)), mob(artD(250))],
  ];

  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = "left:0;top:0;width:1700px";
  b.innerHTML = `<header class="bhd"><span class="bnum">H</span><div><h2>Kalender · hero met foto <span class="tag">4 richtingen · 15 okt</span></h2><p>Als de geselecteerde of volgende afspraak een foto heeft, gebruiken we die bovenaan i.p.v. de kalender-illustratie. Zonder foto blijft de illustratie. Elk voorstel: links desktop, rechts mobiel.</p><p class="uses">Bouwt op: NextHero (kalender_agenda.tsx) · fotobibliotheek afspraken · kleur per afspraak · EmptyStateFan</p></div></header>
    <div class="hx-opts">${OPTS.map(([k, n, why, d, m]) => `<div class="hx-opt"><div class="ag-opthd"><span class="ag-key">${k}</span><div><h3>${n}</h3><p>${why}</p></div></div><div class="hx-pair">${d}${m}</div></div>`).join("")}</div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const top = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${top - 240 - b.offsetHeight}px`;
})();
