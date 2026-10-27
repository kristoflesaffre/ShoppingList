/* «Items toevoegen» — 6 alternatieve ontwerpen (mobiel + desktop), opgebouwd uit de DS-patronen van de app. */
(() => {
  const world = document.getElementById("world");
  const im = (k) => IMG[k] || IMG.recept;

  /* ---------- gedeelde bouwstenen ---------- */
  const ICON = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M7 7l10 10M17 7 7 17"/></svg>',
    plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="4" y="5.5" width="16" height="14" rx="3"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/></svg>',
    chev: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 10 5 5 5-5"/></svg>',
    right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m10 7 5 5-5 5"/></svg>',
    snow: '<span class="mask snow"></span>',
    jar: '<span class="mask jar"></span>',
    heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5v-15Z"/><path d="M5 20.5A2.5 2.5 0 0 1 7.5 18H19v3H7.5"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m6 12.5 4 4 8-9"/></svg>',
    kbd: (k) => `<span class="kbd">${k}</span>`,
  };
  const DAYS = [["MA", 19], ["DI", 20], ["WO", 14], ["DO", 15], ["VR", 16], ["ZA", 17], ["ZO", 18]];

  const pimg = (k, s = 40) => `<img src="${im(k)}" alt="" style="width:${s}px;height:${s}px" class="pimg">`;
  const BIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>';
  /* DS «CountStepper»: blauwe pil, witte bolletjes; bij 1 wordt de min een rood vuilbakje. */
  const stepper = (n) => `<span class="cstep"><b class="${n <= 1 ? "bin" : ""}">${n <= 1 ? BIN : ICON.minus}</b><i>${n}</i><b>${ICON.plus}</b></span>`;
  const plusBtn = (sz = 28) => `<span class="plusbtn" style="width:${sz}px;height:${sz}px">${ICON.plus}</span>`;
  const search = (ph, val, cls = "") => `<div class="search ${cls}">${ICON.search}<span class="${val ? "val" : "ph"}">${val || ph}</span></div>`;
  const seg = (opts, act) => `<div class="seg">${opts.map((o, i) => `<span class="${i === act ? "on" : ""}">${o}</span>`).join("")}</div>`;
  const chip = (l, on, dot) => `<span class="chip${on ? " on" : ""}">${dot ? `<i style="background:${dot}"></i>` : ""}${l}</span>`;
  const chips = (arr) => `<div class="chips">${arr.join("")}</div>`;
  const sheetHead = (title = "Items toevoegen", grab = true) =>
    `${grab ? '<span class="grab"></span>' : ""}<div class="shead"><h3>${title}</h3><span class="xbtn">${ICON.close}</span></div>`;
  const footer = (primary, sub) =>
    `<div class="sfoot"><span class="btn sec">Annuleer</span><span class="btn pri">${sub ? `<span class="cnt">${sub}</span>` : ""}${primary}</span></div>`;
  const plate = (keys, s = 96) =>
    `<span class="plate" style="width:${s}px;height:${s}px"><img class="bord" src="${IMG.bord}" alt="">${keys
      .slice(0, 3)
      .map((k, i) => `<img class="on${i}" src="${im(k)}" alt="" style="width:${s * 0.42}px;height:${s * 0.42}px">`)
      .join("")}</span>`;
  const emptyPlate = (s = 40) => `<span class="eplate" style="width:${s}px;height:${s}px"></span>`;

  /* Frames */
  const phone = (inner, cap = "Mobiel") =>
    `<figure class="fr"><figcaption>${cap}</figcaption><div class="phone"><div class="notch"></div><div class="pscreen">${inner}</div></div></figure>`;
  const desk = (inner, cap = "Desktop · venster 956px", w = 956) =>
    `<figure class="fr"><figcaption>${cap}</figcaption><div class="desk"><div class="dbar"><i></i><i></i><i></i><span>shoppinglist · 14 oktober</span></div><div class="dstage"><div class="dlg" style="width:${w}px">${inner}</div></div></div></figure>`;

  /* ---------- 1 · Weekstrook met borden ---------- */
  const weekStrip = (sel, compact) => {
    const meals = { WO: ["kipfilet", "rijst", "paprika"], DO: ["bloemkool"], VR: ["aardappelen", "komkommer", "zalm"] };
    return `<div class="wstrip${compact ? " compact" : ""}">
      <span class="wday geen${sel === "Geen" ? " on" : ""}"><span class="gfan">${["kaas", "brood", "appel"].map((k) => `<i><img src="${im(k)}" alt=""></i>`).join("")}</span><b>Geen dag</b><em>altijd nodig</em></span>
      ${DAYS.map(([d, n]) => {
        const m = meals[d];
        return `<span class="wday${sel === d ? " on" : ""}"><em>${d}</em><b>${n}</b>${m ? (m.length > 1 ? plate(m, 48) : `<img class="dish" src="${im(m[0])}" alt="">`) : emptyPlate(40)}</span>`;
      }).join("")}
    </div>`;
  };
  const favTile = (k, name, n) =>
    `<span class="ftile${n ? " sel" : ""}">${n ? "" : `<span class="fplus">${plusBtn(24)}</span>`}${pimg(k, 52)}<b>${name}</b>${n ? stepper(n, true) : `<em>1 stuk</em>`}</span>`;
  const C1m = `${sheetHead()}
    <div class="sbody">
      <p class="lbl">VOOR WELKE DAG?</p>
      <div class="hscroll">${weekStrip("VR")}</div>
      ${search("Zoek een product of recept")}
      <p class="lbl row">VAAK GEKOCHT OP VRIJDAG <span class="lnk">Alles</span></p>
      <div class="fgrid c3">
        ${favTile("aardappelen", "Aardappelen")}${favTile("komkommer", "Komkommer", 2)}${favTile("zalm", "Zalm")}
        ${favTile("brood", "Brood", 1)}${favTile("eieren", "Eieren")}${favTile("melk", "Melk")}
        ${favTile("appels", "Appels")}${favTile("bananen", "Bananen")}${favTile("yoghurt", "Yoghurt")}
      </div>
    </div>${footer("toevoegen op vrijdag", "3")}`;
  const C1d = `<div class="dhead"><h3>Items toevoegen</h3><span class="xbtn">${ICON.close}</span></div>
    <div class="dbody">
      <p class="lbl">VOOR WELKE DAG?</p>${weekStrip("VR")}
      <div class="row2">${search("Zoek een product of recept", "", "grow")}${seg(["Alles", "Producten", "Recepten", "Voorraad"], 0)}</div>
      <p class="lbl row">VAAK GEKOCHT OP VRIJDAG <span class="lnk">Alles tonen</span></p>
      <div class="fgrid c6">
        ${favTile("aardappelen", "Aardappelen")}${favTile("komkommer", "Komkommer", 2)}${favTile("zalm", "Zalm")}${favTile("brood", "Brood", 1)}${favTile("eieren", "Eieren")}${favTile("melk", "Melk")}
        ${favTile("appels", "Appels")}${favTile("bananen", "Bananen")}${favTile("yoghurt", "Yoghurt")}${favTile("tomaten", "Tomaten")}${favTile("paprika", "Paprika")}${favTile("wortelen", "Wortelen")}
      </div>
    </div>${footer("toevoegen op vrijdag", "3")}`;

  /* ---------- 2 · Mandje (tray) + bord-preview ---------- */
  const resRow = (k, name, sub, act) =>
    `<div class="rrow">${pimg(k, 40)}<span class="rtxt"><b>${name}</b>${sub ? `<em>${sub}</em>` : ""}</span>${act}</div>`;
  const C2m = `${sheetHead()}
    <div class="sbody pad-tray">
      ${search("", "kip")}
      ${chips([chip("Alles", true), chip("Producten"), chip("Recepten"), chip("Diepvries"), chip("Voorraadkast")])}
      <div class="rlist">
        ${resRow("kipfilet", "Kip<u>filet</u>", "", `<span class="ic">${ICON.snow}</span>${stepper(1, true)}`)}
        ${resRow("kipdijfilet", "Kip<u>dijfilet</u>", "", `<span class="ic">${ICON.snow}</span>${plusBtn()}`)}
        ${resRow("gehakt", "Kip<u>pengehakt</u>", "", `<span class="ic">${ICON.snow}</span>${plusBtn()}`)}
        ${resRow("bouillon", "Kip<u>penbouillon</u>", "", `<span class="ic">${ICON.jar}</span>${plusBtn()}`)}
        ${resRow("kippenkruiden", "Kip<u>penkruiden</u>", "", `<span class="ic">${ICON.jar}</span>${plusBtn()}`)}
        ${resRow("recept", "Kip curry", "Recept · 7 ingrediënten", `<span class="ic">${ICON.snow}</span>${plusBtn()}`)}
      </div>
    </div>
    <div class="tray">
      <span class="tthumbs">${pimg("kipfilet", 30)}${pimg("rijst", 30)}${pimg("broccoli", 30)}</span>
      <span class="ttxt"><b>3 items</b><em>Vrijdag 16 ${ICON.chev}</em></span>
      <span class="btn pri md">Toevoegen</span>
    </div>`;
  const C2d = `<div class="dhead"><h3>Items toevoegen</h3><span class="xbtn">${ICON.close}</span></div>
    <div class="split">
      <div class="sl">
        ${search("", "kip")}
        ${chips([chip("Alles", true), chip("Producten"), chip("Recepten"), chip("Diepvries"), chip("Voorraadkast")])}
        <div class="rlist">
          ${resRow("kipfilet", "Kip<u>filet</u>", "", `<span class="ic">${ICON.snow}</span>${stepper(1, true)}`)}
          ${resRow("kipdijfilet", "Kip<u>dijfilet</u>", "", `<span class="ic">${ICON.snow}</span>${plusBtn()}`)}
          ${resRow("gehakt", "Kip<u>pengehakt</u>", "", `<span class="ic">${ICON.snow}</span>${plusBtn()}`)}
          ${resRow("bouillon", "Kip<u>penbouillon</u>", "", `<span class="ic">${ICON.jar}</span>${plusBtn()}`)}
          ${resRow("recept", "Kip curry", "Recept · 7 ingrediënten", `<span class="ic">${ICON.snow}</span>${plusBtn()}`)}
        </div>
      </div>
      <aside class="sr">
        <div class="dayhd"><span class="datetile"><em>VR</em><b>16</b></span><span><b>Vrijdag 16 oktober</b><em class="lnk">Andere dag ${ICON.chev}</em></span></div>
        <div class="platewrap">${plate(["rijst", "broccoli", "kipfilet"], 150)}</div>
        <p class="lbl row">GEKOZEN · 3 <span class="lnk">Wissen</span></p>
        <div class="blist">
          ${resRow("kipfilet", "Kipfilet", "Lidl", stepper(1, true))}
          ${resRow("rijst", "Rijst", `<span class="jarl">${ICON.jar} Uit de voorraadkast</span>`, stepper(1, true))}
          ${resRow("broccoli", "Broccoli", "Delhaize", stepper(2, true))}
        </div>
      </aside>
    </div>${footer("toevoegen op vrijdag", "3")}`;

  /* ---------- 3 · Bord samenstellen ---------- */
  const slot = (label, key, sub) =>
    key
      ? `<span class="slot fill"><span class="sph">${pimg(key, 46)}</span><b>${label}</b><em>${sub}</em></span>`
      : `<span class="slot"><span class="sph">${ICON.plus}</span><b>${label}</b><em>${sub}</em></span>`;
  const sugg = (k, n, on) => `<span class="sugg${on ? " on" : ""}">${pimg(k, 26)}${n}${on ? `<i>${ICON.check}</i>` : ""}</span>`;
  const C3m = `${sheetHead("Wat eten we vrijdag?")}
    <div class="sbody">
      <div class="dayline">${chips(DAYS.slice(2).map(([d, n]) => chip(`${d} ${n}`, d === "VR")))}</div>
      <div class="bigplate">${plate(["aardappelen", "broccoli"], 168)}
        <div class="slots">${slot("Zetmeel", "aardappelen", "Aardappelen")}${slot("Groente", "broccoli", "Broccoli")}${slot("Vlees of vis", null, "Kies iets")}</div>
      </div>
      <p class="lbl row">VLEES OF VIS <span class="lnk">${ICON.snow} Diepvries</span></p>
      <div class="suggs">${sugg("zalm", "Zalm")}${sugg("kipfilet", "Kipfilet")}${sugg("gehakt", "Gehakt")}${sugg("kipdijfilet", "Kipdijfilet")}</div>
      ${search("Nog iets anders nodig?")}
    </div>${footer("Bord toevoegen op vrijdag", "2")}`;
  const C3d = `<div class="dhead"><h3>Wat eten we vrijdag 16 oktober?</h3><span class="xbtn">${ICON.close}</span></div>
    <div class="split even">
      <div class="sl center">
        ${plate(["aardappelen", "broccoli", "zalm"], 230)}
        <div class="slots row">${slot("Zetmeel", "aardappelen", "Aardappelen")}${slot("Groente", "broccoli", "Broccoli")}${slot("Vlees of vis", "zalm", "Zalm · diepvries")}</div>
        <p class="hint">Eén zetmeel, één groente en vlees of vis — zoals op je kalender.</p>
      </div>
      <div class="sr plain">
        <p class="lbl">ZETMEEL</p><div class="suggs wrap">${sugg("aardappelen", "Aardappelen", true)}${sugg("rijst", "Rijst")}${sugg("spaghetti", "Spaghetti")}${sugg("krieltjes", "Krieltjes")}</div>
        <p class="lbl">GROENTE</p><div class="suggs wrap">${sugg("broccoli", "Broccoli", true)}${sugg("wortelen", "Wortelen")}${sugg("paprika", "Paprika")}${sugg("bloemkool", "Bloemkool")}${sugg("komkommer", "Komkommer")}</div>
        <p class="lbl">VLEES OF VIS</p><div class="suggs wrap">${sugg("zalm", "Zalm", true)}${sugg("kipfilet", "Kipfilet")}${sugg("gehakt", "Gehakt")}</div>
        <p class="lbl">EXTRA</p>${search("Saus, kruiden, iets voor erbij…")}
      </div>
    </div>${footer("Bord toevoegen op vrijdag", "3")}`;

  /* ---------- 4 · Categorieën bladeren ---------- */
  const CATS = [
    ["Groenten & Fruit", "#3d8f55", ["broccoli", "tomaten", "appels"], 52],
    ["Vlees & Charcuterie", "#c75a62", ["kipfilet", "gehakt", "kipdijfilet"], 35],
    ["Vis & Zeevruchten", "#3a7bd5", ["zalm"], 10],
    ["Zuivel, Kaas & Eieren", "#d1a52f", ["melk", "eieren", "yoghurt"], 31],
    ["Droogwaren", "#b07a3c", ["rijst", "spaghetti"], 40],
    ["Brood", "#a8693f", ["brood"], 12],
  ];
  const catCard = ([n, c, ks, cnt]) =>
    `<span class="ccard" style="--c:${c}"><span class="cfan">${ks.map((k) => `<img src="${im(k)}" alt="">`).join("")}</span><b>${n}</b><em>${cnt} producten</em></span>`;
  const C4m = `${sheetHead()}
    <div class="sbody">
      <div class="dpill">${ICON.cal}<span>Voor <b>vrijdag 16</b></span>${ICON.chev}</div>
      ${search("Zoek een product of recept")}
      <div class="cgrid">${CATS.map(catCard).join("")}</div>
    </div>${footer("toevoegen", "2")}`;
  const ptile = (k, n, cnt) =>
    `<span class="ptile${cnt ? " sel" : ""}">${pimg(k, 54)}<b>${n}</b>${cnt ? stepper(cnt, true) : `<span class="padd">${plusBtn(26)}</span>`}</span>`;
  const C4d = `<div class="dhead"><h3>Items toevoegen</h3><div class="dpill">${ICON.cal}<span>Voor <b>vrijdag 16</b></span>${ICON.chev}</div><span class="xbtn">${ICON.close}</span></div>
    <div class="split side">
      <nav class="cnav">
        ${search("Zoek…")}
        ${["Favorieten", ...CATS.map((c) => c[0]), "Diepvries", "Voorraadkast"].map((n, i) => {
          const c = CATS.find((x) => x[0] === n);
          return `<span class="cn${i === 1 ? " on" : ""}">${c ? `<i style="background:${c[1]}"></i>` : n === "Favorieten" ? `<i class="hrt">${ICON.heart}</i>` : n === "Diepvries" ? ICON.snow : ICON.jar}${n}</span>`;
        }).join("")}
      </nav>
      <div class="cmain">
        <div class="cbanner" style="--c:#3d8f55"><b>Groenten & Fruit</b><em>52 producten · 2 gekozen</em></div>
        <div class="pgrid">
          ${ptile("broccoli", "Broccoli", 2)}${ptile("tomaten", "Tomaten")}${ptile("komkommer", "Komkommer", 1)}${ptile("paprika", "Paprika")}${ptile("wortelen", "Wortelen")}
          ${ptile("bloemkool", "Bloemkool")}${ptile("appels", "Appels")}${ptile("bananen", "Bananen")}${ptile("aardappelen", "Aardappelen")}${ptile("krieltjes", "Krieltjes")}
        </div>
      </div>
    </div>${footer("toevoegen op vrijdag", "2")}`;

  /* ---------- 5 · Bronnen eerst ---------- */
  const otile = (icon, t, s, tone) => `<span class="otile ${tone || ""}"><span class="oic">${icon}</span><b>${t}</b><em>${s}</em></span>`;
  const recent = (k, n) => `<span class="rchip">${pimg(k, 28)}${n}<i>${ICON.plus}</i></span>`;
  const C5m = `${sheetHead()}
    <div class="sbody">
      <div class="dpill">${ICON.cal}<span>Voor <b>vrijdag 16</b></span>${ICON.chev}</div>
      ${search("Zoek een product of recept")}
      <div class="ogrid">
        ${otile(ICON.heart, "Favorieten", "174 producten", "fav")}
        ${otile(ICON.book, "Recepten", "Kies een gerecht")}
        ${otile(ICON.snow, "Diepvries", "12 in voorraad", "ice")}
        ${otile(ICON.jar, "Voorraadkast", "Kruiden, sauzen…", "pan")}
      </div>
      <p class="lbl">${ICON.clock} OPNIEUW TOEVOEGEN</p>
      <div class="rchips">${recent("melk", "Melk")}${recent("brood", "Brood")}${recent("bananen", "Bananen")}${recent("eieren", "Eieren")}${recent("yoghurt", "Yoghurt")}</div>
      <div class="lastweek"><span class="lwplate">${plate(["aardappelen", "komkommer", "zalm"], 52)}</span><span class="lwt"><b>Zelfde als vorige vrijdag</b><em>Aardappelen, komkommer, zalm +7</em></span><span class="btn sec sm">Kopieer</span></div>
    </div>${footer("Items toevoegen")}`;
  const C5d = `<div class="dhead"><h3>Items toevoegen</h3><span class="xbtn">${ICON.close}</span></div>
    <div class="dbody">
      <div class="row2"><div class="dpill">${ICON.cal}<span>Voor <b>vrijdag 16</b></span>${ICON.chev}</div>${search("Zoek een product of recept", "", "grow")}</div>
      <div class="ogrid c4">
        ${otile(ICON.heart, "Favorieten", "174 producten", "fav")}
        ${otile(ICON.book, "Recepten", "Kies een gerecht")}
        ${otile(ICON.snow, "Diepvries", "12 in voorraad", "ice")}
        ${otile(ICON.jar, "Voorraadkast", "Kruiden, sauzen…", "pan")}
      </div>
      <div class="two">
        <div><p class="lbl">${ICON.clock} OPNIEUW TOEVOEGEN</p>
          <div class="rchips wrap">${recent("melk", "Melk")}${recent("brood", "Brood")}${recent("bananen", "Bananen")}${recent("eieren", "Eieren")}${recent("yoghurt", "Yoghurt")}${recent("appels", "Appels")}${recent("tomaten", "Tomaten")}</div></div>
        <div><p class="lbl">VORIGE VRIJDAG</p>
          <div class="lastweek">${plate(["aardappelen", "komkommer", "zalm"], 64)}<span class="lwt"><b>Aardappelen, komkommer, zalm</b><em>+7 items · 9 oktober</em></span><span class="btn sec sm">Kopieer</span></div></div>
      </div>
    </div>${footer("Items toevoegen")}`;

  /* ---------- 6 · Snel typen ---------- */
  const tok = (k, n, q, src) => `<span class="tok">${pimg(k, 26)}<b>${n}</b><em>${q}</em>${src ? `<span class="tsrc">${src}</span>` : ""}<i>${ICON.close}</i></span>`;
  const C6m = `${sheetHead()}
    <div class="sbody">
      <div class="dtabs">${["Geen", ...DAYS.map((d) => d[0])].map((d) => `<span class="${d === "VR" ? "on" : ""}">${d === "Geen" ? "—" : d}</span>`).join("")}</div>
      <div class="bigin"><span class="val">2 komkommers, zalm uit diepvries, rijst<span class="caret"></span></span></div>
      <p class="tiny">Typ meerdere producten met komma's. Aantallen en «uit diepvries» of «uit kast» worden herkend.</p>
      <div class="toks">${tok("komkommer", "Komkommer", "2 stuks")}${tok("zalm", "Zalm", "1 stuk", ICON.snow)}${tok("rijst", "Rijst", "1 pak")}</div>
      <p class="lbl">SUGGESTIES BIJ «RIJST»</p>
      <div class="rlist">
        ${resRow("rijst", "<u>Rijst</u>", "Droogwaren", `<span class="ic">${ICON.jar}</span>${plusBtn()}`)}
        ${resRow("recept", "Kip curry met <u>rijst</u>", "Recept · 7 ingrediënten", plusBtn())}
      </div>
    </div>${footer("toevoegen op vrijdag", "3")}`;
  const C6d = `<div class="palette">
      <div class="pin">${ICON.search}<span class="val">2 komkommers, zalm uit diepvries, rij<span class="caret"></span></span><span class="dpill sm">${ICON.cal}<b>Vr 16</b>${ICON.chev}</span></div>
      <div class="toks pad">${tok("komkommer", "Komkommer", "2 stuks")}${tok("zalm", "Zalm", "1 stuk", ICON.snow)}</div>
      <div class="pres">
        <p class="lbl">PRODUCTEN</p>
        <div class="prow hl">${pimg("rijst", 32)}<b><u>Rij</u>st</b><span class="ic">${ICON.jar}</span>${ICON.kbd("↵")}</div>
        <div class="prow">${pimg("krieltjes", 32)}<b>Krieltjes</b></div>
        <p class="lbl">RECEPTEN</p>
        <div class="prow">${pimg("recept", 32)}<b>Kip curry met <u>rij</u>st</b><em>7 ingrediënten</em></div>
      </div>
      <div class="pfoot"><span>${ICON.kbd("↵")} toevoegen</span><span>${ICON.kbd("⇥")} hoeveelheid</span><span>${ICON.kbd("⌘")}${ICON.kbd("↵")} alles toevoegen</span><span class="grow"></span><span class="btn pri md"><span class="cnt">2</span>toevoegen op vrijdag</span></div>
    </div>`;

  /* ---------- 1b · Weekstrook + lijst (iteratie) ---------- */
  const store = (s) => (s ? `<img class="slogo" src="${IMG[s]}" alt="">` : "");
  const lrow = (k, name, qty, st, right, extra = "") =>
    `<div class="lrow${right.includes("cstep") ? " sel" : ""}"><span class="lph">${pimg(k, 36)}${store(st)}</span><span class="ltxt"><b>${name}</b><em>${qty}${extra}</em></span>${right}</div>`;
  const add = plusBtn(28);
  /* Zwevend mandje uit concept 2 — zonder datum (die staat al bovenaan in de weekstrook). */
  const tray1b = (keys, n) =>
    `<div class="tray"><span class="tthumbs">${keys.map((k) => pimg(k, 30)).join("")}</span><span class="ttxt"><b>${n} items</b><em class="plain">gekozen</em></span><span class="btn pri md">Toevoegen</span></div>`;
  const listCard = (rows) => `<div class="lcard">${rows.join("")}</div>`;
  /* Mobiel start: lege staat (zelfde waaier als desktop), geen suggesties of recente items. Het mandje verschijnt pas na de eerste keuze. */
  const mCard = (k, n, q) => `<span class="fcard sm">${pimg(k, 44)}<b>${n}</b><em>${q}</em></span>`;
  const L1m = `${sheetHead()}
    <div class="sbody">
      <p class="lbl">VOOR WELKE DAG?</p>
      <div class="hscroll">${weekStrip("Geen")}</div>
      ${search("Zoek een product of recept")}
      <div class="estate m">
        <div class="efan msz">
          <span class="fslot" style="transform:translate(-50%,-50%) translate(-62px,8px) rotate(-12deg)">${mCard("aardappelen", "Aardappelen", "1 zak")}</span>
          <span class="fslot" style="transform:translate(-50%,-50%) translate(62px,6px) rotate(10deg)">${mCard("zalm", "Zalm", "1 stuk")}</span>
          <span class="fslot" style="transform:translate(-50%,-50%) translate(0,-4px) rotate(-2deg)">${mCard("komkommer", "Komkommer", "2 stuks")}</span>
        </div>
        <h4>Nog niets gekozen</h4>
        <p>Zoek een product of recept. Zonder dag komt het bij «altijd nodig»; kies bovenaan een dag voor een maaltijd.</p>
      </div>
    </div>`;
  const stockBtn = (ic) => `<span class="rib">${ic}</span>`;
  const arow = (k, name, sub, ic) =>
    `<div class="lrow">${k === "recept" ? `<img class="rimg" src="${im(k)}" alt="">` : `<span class="lph">${pimg(k, 36)}</span>`}<span class="ltxt"><b>${name}</b>${sub ? `<em>${sub}</em>` : ""}</span>${ic ? stockBtn(ic) : ""}</div>`;
  const L1s = `${sheetHead()}
    <div class="sbody">
      <p class="lbl">VOOR WELKE DAG?</p>
      <div class="hscroll">${weekStrip("VR")}</div>
      ${search("", "kip", "focus")}
      ${seg(["Alles", "Producten", "Recepten"], 0)}
      ${listCard([
        arow("kipfilet", "Kip<u>filet</u>", "", ICON.snow),
        arow("kipdijfilet", "Kip<u>dijfilet</u>", "", ICON.snow),
        arow("gehakt", "Kip<u>pengehakt</u>", "", ICON.snow),
        arow("bouillon", "Kip<u>penbouillon</u>", "", ICON.jar),
        arow("kippenkruiden", "Kip<u>penkruiden</u>", "", ICON.jar),
        arow("recept", "Kip curry", "Recept · 7 ingrediënten", ICON.snow),
      ])}
      <p class="tiny">Tik op een rij om toe te voegen · ❄ / pot = uit voorraad (niet kopen)</p>
    </div>${tray1b(["komkommer", "brood", "kipfilet"], 4)}`;
  /* Desktop: één kolom. Leeg = waaier (DS «EmptyStateFan»); daarna enkel de gekozen items. */
  const fanCard = (k, n, q) => `<span class="fcard">${pimg(k, 54)}<b>${n}</b><em>${q}</em></span>`;
  const emptyFan = `<div class="efan">
      <span class="fslot" style="transform:translate(-50%,-50%) translate(-78px,8px) rotate(-12deg)">${fanCard("aardappelen", "Aardappelen", "1 zak")}</span>
      <span class="fslot" style="transform:translate(-50%,-50%) translate(78px,6px) rotate(10deg)">${fanCard("zalm", "Zalm", "1 stuk")}</span>
      <span class="fslot" style="transform:translate(-50%,-50%) translate(0,-4px) rotate(-2deg)">${fanCard("komkommer", "Komkommer", "2 stuks")}</span>
    </div>`;
  const deskTopFor = (sel) => `<div class="dhead"><h3>Items toevoegen</h3><span class="xbtn">${ICON.close}</span></div>
    <div class="dbody">
      <p class="lbl">VOOR WELKE DAG?</p>${weekStrip(sel)}
      <div class="ctlrow"><div class="seg tall">${["Alles", "Producten", "Recepten", "Voorraad"].map((o, i) => `<span class="${i === 0 ? "on" : ""}">${o}</span>`).join("")}</div><span class="grow"></span>${search("Zoek een product of recept", "", "h44 w380")}</div>`;
  const deskTop = deskTopFor("VR");
  const L1dEmpty = `${deskTopFor("Geen")}
      <div class="estate">${emptyFan}
        <h4>Nog niets gekozen</h4>
        <p>Zoek hierboven een product of recept. Zonder dag komt het bij «altijd nodig»; kies een dag om het bij een maaltijd te zetten.</p>
        <span class="ehint">${ICON.kbd("↵")} voegt het eerste resultaat toe</span>
      </div>
    </div><div class="sfoot"><span class="btn sec">Annuleer</span><span class="btn pri off">Items toevoegen</span></div>`;
  const qrow = (k, name, qty, st, n, stock) =>
    `<div class="lrow sel"><span class="lph">${pimg(k, 36)}</span><span class="ltxt"><b>${name}</b><em>${qty}${stock ? ` · <span class="jarl">${stock === "pantry" ? ICON.jar : ICON.snow} ${stock === "pantry" ? "Uit de voorraadkast" : "Uit de diepvries"}</span>` : ""}</em></span>${st ? `<span class="schip"><img src="${IMG[st]}" alt="">${st === "lidl" ? "Lidl" : "Delhaize"}</span>` : ""}${stepper(n)}</div>`;
  const L1d = `${deskTop}
      <p class="lbl row">GEKOZEN VOOR VRIJDAG · 4 <span class="lnk">Alles wissen</span></p>
      ${listCard([
        qrow("aardappelen", "Aardappelen", "1 zak", "delhaize", 1),
        qrow("komkommer", "Komkommer", "2 stuks", "lidl", 2),
        qrow("zalm", "Zalm", "1 stuk", "", 1, "freezer"),
        qrow("brood", "Brood", "1 stuk", "delhaize", 1),
      ])}
    </div>${footer("toevoegen op vrijdag", "4")}`;

  /* 1b · desktop-variant «naast elkaar»: zoeken links, gekozen rechts. */
  const sideHeadFor = (sel) => `<div class="dhead"><h3>Items toevoegen</h3><span class="xbtn">${ICON.close}</span></div>
    <div class="dbody tight"><p class="lbl">VOOR WELKE DAG?</p>${weekStrip(sel)}</div>`;
  const sideHead = sideHeadFor("VR");
  const smallFan = `<div class="efan sm">
      <span class="fslot" style="transform:translate(-50%,-50%) translate(-58px,6px) rotate(-12deg)">${fanCard("aardappelen", "Aardappelen", "1 zak")}</span>
      <span class="fslot" style="transform:translate(-50%,-50%) translate(58px,4px) rotate(10deg)">${fanCard("zalm", "Zalm", "1 stuk")}</span>
      <span class="fslot" style="transform:translate(-50%,-50%) translate(0,-4px) rotate(-2deg)">${fanCard("komkommer", "Komkommer", "2 stuks")}</span>
    </div>`;
  const L1sideEmpty = `${sideHeadFor("Geen")}
    <div class="split side2">
      <div class="sl">
        ${search("Zoek een product of recept", "", "focus")}
        ${seg(["Alles", "Producten", "Recepten", "Voorraad"], 0)}
        <p class="tiny center">Typ om te zoeken. ${ICON.kbd("↵")} voegt het eerste resultaat toe.</p>
      </div>
      <aside class="sr">
        <p class="lbl">GEKOZEN · ALTIJD NODIG</p>
        <div class="estate">${smallFan}<h4>Nog niets gekozen</h4><p>Wat je links kiest, komt hier. Kies bovenaan een dag om het bij een maaltijd te zetten.</p></div>
      </aside>
    </div><div class="sfoot"><span class="btn sec">Annuleer</span><span class="btn pri off">Items toevoegen</span></div>`;
  const L1side = `${sideHead}
    <div class="split side2">
      <div class="sl">
        ${search("", "kip", "focus")}
        ${seg(["Alles", "Producten", "Recepten", "Voorraad"], 0)}
        ${listCard([
          arow("kipfilet", "Kip<u>filet</u>", "", ICON.snow),
          arow("kipdijfilet", "Kip<u>dijfilet</u>", "", ICON.snow),
          arow("gehakt", "Kip<u>pengehakt</u>", "", ICON.snow),
          arow("bouillon", "Kip<u>penbouillon</u>", "", ICON.jar),
          arow("recept", "Kip curry", "Recept · 7 ingrediënten", ICON.snow),
        ])}
      </div>
      <aside class="sr">
        <p class="lbl row">GEKOZEN VOOR VRIJDAG · 4 <span class="lnk">Alles wissen</span></p>
        ${listCard([
          qrow("aardappelen", "Aardappelen", "1 zak", "", 1),
          qrow("komkommer", "Komkommer", "2 stuks", "", 2),
          qrow("zalm", "Zalm", "1 stuk", "", 1, "freezer"),
        ])}
      </aside>
    </div>${footer("toevoegen op vrijdag", "4")}`;

  /* 1b · zoeken + filter op desktop: drie opties, zoekveld rechts, één hoogte. */
  const ctlHead = (row) => `<div class="dhead"><h3>Items toevoegen</h3><span class="xbtn">${ICON.close}</span></div>
    <div class="dbody"><p class="lbl">VOOR WELKE DAG?</p>${weekStrip("Geen")}${row}`;
  const ctlEmpty = `<div class="estate">${emptyFan}
        <h4>Nog niets gekozen</h4>
        <p>Zoek een product of recept. Zonder dag komt het bij «altijd nodig»; kies een dag om het bij een maaltijd te zetten.</p>
      </div>
    </div><div class="sfoot"><span class="btn sec">Annuleer</span><span class="btn pri off">Items toevoegen</span></div>`;
  const segTall = `<div class="seg tall">${["Alles", "Producten", "Recepten", "Voorraad"].map((o, i) => `<span class="${i === 0 ? "on" : ""}">${o}</span>`).join("")}</div>`;
  const OPT_A = ctlHead(`<div class="ctlrow">${segTall}<span class="grow"></span>${search("Zoek een product of recept", "", "h44 w380")}</div>`) + ctlEmpty;

  /* Desktop · zoeken: «kip» getypt, autocomplete-dropdown onder het zoekveld (over de gekozen lijst). */
  const ddRow = (k, name, sub, ic, hl) =>
    `<div class="ddrow${hl ? " hl" : ""}">${k === "recept" ? `<img class="rimg sm" src="${im(k)}" alt="">` : `<span class="lph">${pimg(k, 32)}</span>`}<span class="ltxt"><b>${name}</b>${sub ? `<em>${sub}</em>` : ""}</span>${ic ? `<span class="rib">${ic}</span>` : ""}</div>`;
  const dropdown = `<div class="ddrop">
      ${ddRow("kipfilet", "<s>Kip</s>filet", "", ICON.snow, true)}
      ${ddRow("kipdijfilet", "<s>Kip</s>dijfilet", "", ICON.snow)}
      ${ddRow("gehakt", "<s>Kip</s>pengehakt", "", ICON.snow)}
      ${ddRow("bouillon", "<s>Kip</s>penbouillon", "", ICON.jar)}
      ${ddRow("kippenkruiden", "<s>Kip</s>penkruiden", "", ICON.jar)}
      ${ddRow("recept", "<s>Kip</s> curry", "Recept · 7 ingrediënten", ICON.snow)}
      <div class="ddrow create"><span class="cplus">${ICON.plus}</span><span class="ltxt"><b><s>«kip»</s> toevoegen</b></span></div>
      <div class="ddhint">${ICON.kbd("↑")}${ICON.kbd("↓")} kiezen · ${ICON.kbd("↵")} toevoegen · ${ICON.kbd("esc")} sluiten</div>
    </div>`;
  const L1dSearch = `<div class="dhead"><h3>Items toevoegen</h3><span class="xbtn">${ICON.close}</span></div>
    <div class="dbody">
      <p class="lbl">VOOR WELKE DAG?</p>${weekStrip("VR")}
      <div class="ctlrow anchor"><div class="seg tall">${["Alles", "Producten", "Recepten", "Voorraad"].map((o, i) => `<span class="${i === 0 ? "on" : ""}">${o}</span>`).join("")}</div><span class="grow"></span>${search("", "kip", "h44 w380 focus")}${dropdown}</div>
      <p class="lbl row">GEKOZEN VOOR VRIJDAG · 3 <span class="lnk">Alles wissen</span></p>
      ${listCard([
        qrow("aardappelen", "Aardappelen", "1 zak", "delhaize", 1),
        qrow("komkommer", "Komkommer", "2 stuks", "lidl", 2),
        qrow("zalm", "Zalm", "1 stuk", "", 1, "freezer"),
      ])}
    </div>${footer("toevoegen op vrijdag", "3")}`;

  /* Mobiel · items gekozen: zelfde lijst als desktop, mandje zwevend onderaan. */
  const L1mPicked = `${sheetHead()}
    <div class="sbody">
      <p class="lbl">VOOR WELKE DAG?</p>
      <div class="hscroll">${weekStrip("VR")}</div>
      ${search("Zoek een product of recept")}
      <p class="lbl row">GEKOZEN VOOR VRIJDAG · 4 <span class="lnk">Alles wissen</span></p>
      ${listCard([
        qrow("aardappelen", "Aardappelen", "1 zak", "", 1),
        qrow("komkommer", "Komkommer", "2 stuks", "", 2),
        qrow("zalm", "Zalm", "1 stuk", "", 1, "freezer"),
        qrow("kipfilet", "Kipfilet", "1 stuk", "", 1),
      ])}
    </div>${tray1b(["aardappelen", "komkommer", "zalm"], 5)}`;

  /* ---------- boards ---------- */
  const CONCEPTS = [
    ["1", "Weekstrook met borden", "De dagkiezer toont wat er al gepland staat (zelfde borden als de kalender). Lege toestand = «Vaak gekocht op vrijdag» als tegels met +; gekozen tegels krijgen de blauwe CountStepper.", "Kalender-borden · Winkeltegel · CountStepper", C1m, C1d],
    ["2", "Mandje + bordpreview", "Zoeken met filterchips (incl. Diepvries / Voorraadkast). Wat je kiest landt in een zwevend mandje (mobiel) of een rechterpaneel dat meteen het bord van die dag toont (desktop).", "FilterChip · zwevende tabbalk · IngredientPlate · CountStepper", C2m, C2d],
    ["3", "Bord samenstellen", "Voor een maaltijddag: drie vakjes (zetmeel · groente · vlees of vis), zoals de bordregel van de kalender. Per vakje snelle keuzes; extra's via zoeken.", "Kalender-bordregel · ChoiceRow-achtige chips", C3m, C3d],
    ["4", "Categorieën bladeren", "Wie niet weet wat te typen, bladert. Mobiel: CategoryCards met productwaaier. Desktop: categorieën links (met kleurbolletje), producttegels rechts.", "CategoryCard (verloop) · FilterChip dotColor · EmptyStateFan", C4m, C4d],
    ["5", "Bronnen eerst", "Vier keuzetegels: Favorieten, Recepten, Diepvries, Voorraadkast. Daaronder «Opnieuw toevoegen» en «Zelfde als vorige vrijdag» om een hele dag te kopiëren.", "OptionTile · ListCard · dagkiezer als pil", C5m, C5d],
    ["6", "Snel typen", "Toetsenbord eerst: typ «2 komkommers, zalm uit diepvries, rijst» en het wordt meteen herkend als tokens. Desktop als command palette met sneltoetsen.", "Zoekveld · Aantalpil · sneltoetsen", C6m, C6d],
  ];

  /* Canvas teruggebracht tot het eindvoorstel (15 okt): enkel de twee mobiele schermen + desktop optie A.
     De zes richtingen, het intro en de oudere desktopschermen staan nog in deze code (CONCEPTS, L1side…) maar worden niet meer getoond. */
  const fin = document.createElement("section");
  fin.className = "board iter";
  fin.style.cssText = `left:0;top:0;width:${3 * 390 + 3 * 48 + 1180}px`;
  fin.innerHTML = `<header class="bhd"><span class="bnum">✓</span><div><h2>Items toevoegen · voorstel <span class="tag">15 okt</span></h2><p>Weekstrook bovenaan (standaard «Geen dag»). Mobiel: lege staat, zoeken als lijst met ❄ / voorraadkast in de autocomplete, zwevend mandje onderaan. Mobiel en desktop tonen na een keuze dezelfde lijst «Gekozen» met de CountStepper. Desktop: segmentknop links en zoekveld rechts op één hoogte; typen opent de autocomplete als dropdown onder het zoekveld, over de lijst heen.</p><p class="uses">Bouwt op: Kalender-borden · SegmentedControl · SearchBar · EmptyStateFan · CountStepper · StoreBadge</p></div></header>
    <div class="frames">${phone(L1m, "Mobiel · start · lege staat")}${phone(L1s, "Mobiel · zoeken «kip» (autocomplete)")}${phone(L1mPicked, "Mobiel · items gekozen")}${desk(L1dEmpty, "Desktop · lege staat (standaard)")}${desk(L1dSearch, "Desktop · zoeken «kip»")}${desk(L1d, "Desktop · items gekozen")}</div>`;
  world.appendChild(fin);
  document.getElementById("empty-hint")?.remove();
})();
