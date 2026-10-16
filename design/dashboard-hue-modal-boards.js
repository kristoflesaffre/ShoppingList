/* Dashboard · licht-venster: twee ontwerpen voor het (bijna) volledig scherm met alle lampen · 16 okt. */
(() => {
  const world = document.getElementById("world");
  const ROOMS = [
    { n: "Badkamer", f: "1", b: 100, g: "Eerste verdieping" },
    { n: "Slaapkamer", b: 0, g: "Eerste verdieping" },
    { n: "Gang", f: "↑", b: 0, g: "Eerste verdieping" },
    { n: "Badkamer", f: "2", b: 0, g: "Tweede verdieping" },
    { n: "Hobbykamer", b: 35, g: "Tweede verdieping" },
    { n: "Gastenkamer", b: 100, g: "Tweede verdieping" },
    { n: "Woonkamer", b: 45, g: "Gelijkvloers" },
    { n: "Keuken", b: 80, g: "Gelijkvloers" },
    { n: "Gang", f: "↓", b: 60, g: "Gelijkvloers" },
    { n: "Bureau", b: 0, g: "Gelijkvloers" },
  ];
  const close = '<span class="lm-x">✕</span>';
  const capsule = (r, h) => `<div class="lm-col"><span class="lm-cap" style="height:${h}px">${r.b ? `<i style="height:${Math.max(r.b, 8)}%"></i>` : ""}<b class="${r.b >= 85 ? "dark" : ""}">${r.b ? `${r.b}%` : "Uit"}</b>${r.f ? `<s class="${r.b >= 15 ? "lit" : ""}">${r.f}</s>` : ""}</span><em class="${r.b ? "on" : ""}">${r.n}</em><span class="lm-sw${r.b ? " on" : ""}"><i></i></span></div>`;
  const groups = [...new Set(ROOMS.map((r) => r.g))];
  const backdrop = (inner) => `<div class="lm-frame"><div class="lm-dash"></div>${inner}</div>`;

  /* A · Hoge kolommen per verdieping */
  const A = backdrop(`<div class="lm-modal">
      <div class="lm-top"><div><span class="lm-k">LICHT</span><h4>Alle lampen</h4></div><div class="lm-acts"><span class="lm-btn">Alles aan</span><span class="lm-btn">Alles uit</span>${close}</div></div>
      <div class="lm-a">${groups
        .map((g) => `<section class="lm-g"><span class="lm-gh">${g.toUpperCase()}</span><div class="lm-gr">${ROOMS.filter((r) => r.g === g).map((r) => capsule(r, 360)).join("")}</div></section>`)
        .join("")}</div>
      <p class="lm-hint">Veeg een kolom omhoog of omlaag om te dimmen · tik op het schakelaartje om aan/uit te zetten</p>
    </div>`);

  /* B · Kamerlijst + grote regelaar met lampen en kleur */
  const sel = ROOMS[6];
  const LAMPS = [
    { n: "Plafondlamp", b: 60 },
    { n: "Staande lamp", b: 45 },
    { n: "Ledstrip tv", b: 25 },
    { n: "Leeslamp", b: 0 },
  ];
  const SW = ["#ffb547", "#ffd27a", "#fff1cf", "#dbe8ff", "#ff7aa8", "#9b7bff", "#4fd1c5"];
  const B = backdrop(`<div class="lm-modal">
      <div class="lm-top"><div><span class="lm-k">LICHT</span><h4>${sel.n}</h4></div><div class="lm-acts"><span class="lm-btn">Alles uit</span>${close}</div></div>
      <div class="lm-b">
        <div class="lm-list">${groups
          .map(
            (g) => `<span class="lm-gh">${g.toUpperCase()}</span>${ROOMS.filter((r) => r.g === g)
              .map((r) => `<span class="lm-li${r === sel ? " sel" : ""}"><i class="${r.b ? "on" : ""}"></i><b>${r.n}${r.f ? ` <s>${r.f}</s>` : ""}</b><em>${r.b ? `${r.b}%` : "Uit"}</em></span>`)
              .join("")}`,
          )
          .join("")}</div>
        <div class="lm-big">${capsule(sel, 470)}</div>
        <div class="lm-detail">
          <span class="lm-gh">LAMPEN IN DEZE KAMER</span>
          ${LAMPS.map((l) => `<div class="lm-lamp"><span class="lm-ln"><b>${l.n}</b><em>${l.b ? `${l.b}%` : "Uit"}</em></span><span class="lm-track">${l.b ? `<i style="width:${l.b}%"></i><u style="left:${l.b}%"></u>` : ""}</span></div>`).join("")}
          <span class="lm-gh" style="margin-top:18px">KLEUR</span>
          <div class="lm-sws">${SW.map((c, i) => `<span class="lm-swc${i === 0 ? " sel" : ""}" style="background:${c}"></span>`).join("")}</div>
          <span class="lm-gh" style="margin-top:18px">SCÈNES</span>
          <div class="lm-sc"><span style="background:linear-gradient(150deg,#ffb36b,#e9667f)">Ontspannen</span><span style="background:linear-gradient(150deg,#5b4bd6,#2a1f6e)">Film kijken</span><span class="dark" style="background:linear-gradient(150deg,#fff7d6,#ffd36b)">Helder</span></div>
        </div>
      </div>
    </div>`);

  const OPTS = [
    ["A", "Hoge kolommen per verdieping", "Alle kamers in één overzicht als hoge capsules (360px: veel fijner dimmen), gegroepeerd per verdieping zodat de twee badkamers en gangen meteen duidelijk zijn. Onder elke capsule een aan/uit-schakelaartje; bovenaan Alles aan / Alles uit. Scrolt horizontaal als er meer kamers zijn.", A],
    ["B", "Kamer kiezen + alles instellen", "Links de kamers per verdieping, in het midden één extra hoge capsule (470px) voor de gekozen kamer, rechts de afzonderlijke lampen met schuifjes, kleur en scènes. Meer instellingen per kamer; vraagt wel dat we ook de losse lampen uit Hue ophalen.", B],
  ];

  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = "left:0;top:0;width:2560px";
  b.innerHTML = `<header class="bhd"><span class="bnum">M</span><div><h2>Dashboard · licht-venster <span class="tag">2 ontwerpen · 16 okt</span></h2><p>Tik op het lichtpaneel → bijna schermvullend venster (tablet 1180 × 820) met al je lampen en langere regelaars. In het donkere thema (Nachtblauw glas); voorbeeldkamers op basis van jouw namen.</p><p class="uses">Bouwt op: lampkolommen (F) · /api/hue/rooms + /api/hue/light · palet B</p></div></header>
    <div class="dk-opts">${OPTS.map(([k, n, why, html]) => `<div class="dk-opt"><div class="ag-opthd"><span class="ag-key">${k}</span><div><h3>${n}</h3><p>${why}</p></div></div>${html}</div>`).join("")}</div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const top = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${top - 240 - b.offsetHeight}px`;
})();
