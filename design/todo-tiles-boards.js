/* Startpagina (gsm) · To-do-tegels: acht uiteenlopende ontwerpvoorstellen · 18 okt. */
(() => {
  const world = document.getElementById("world");
  const STACK = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#707784" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="3.5" width="13.5" height="13.5" rx="2.6"/><path d="M3.5 7.5v10a3 3 0 0 0 3 3h10"/></svg>';
  const CHEV = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#9aa0b4" stroke-width="2.6" stroke-linecap="round"><path d="m9 6 6 6-6 6"/></svg>';
  const FLAG = (c) => `<svg viewBox="0 0 24 24" width="13" height="13" fill="${c}"><path d="M5 21V4h11.5l-1.6 3.8L16.5 12H7v9z"/></svg>`;
  const REPEAT = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/></svg>';
  const check = (c, size = 22, fill = false) => `<span class="tt-check" style="width:${size}px;height:${size}px;border-color:${c};background:${fill ? c : c + "14"}"></span>`;

  // Voorbeeldtaken (zoals in de echte lijst): te laat, vandaag, morgen.
  const T = [
    { t: "Diagnose: Perimenopause PMDD invullen", due: "11 okt", dd: "11", mm: "OKT", wd: "za", late: true, p: "Checklist Chloé", pc: "#6accbc", prio: "#d1453b", rep: true, emoji: "🩺" },
    { t: "Take medication: concerta 36mg", due: "16 okt", dd: "16", mm: "OKT", wd: "do", late: true, p: "Checklist Chloé", pc: "#6accbc", prio: "#eb8909", rep: true, emoji: "💊" },
    { t: "Fiets Sofie ophalen — 110 euro cash", due: "Vandaag · 10:00", dd: "18", mm: "OKT", wd: "zo", today: true, p: "Persoonlijk", pc: "#b8256f", prio: "#246fe0", emoji: "🚲" },
    { t: "Cadeau kopen voor Huub", due: "Morgen", dd: "19", mm: "OKT", wd: "ma", p: "Persoonlijk", pc: "#b8256f", prio: null, emoji: "🎁" },
  ];
  const dueColor = (x) => (x.late ? "#d1453b" : x.today ? "#058527" : "#6b7084");

  const css = `
  .tt-opts{display:grid;grid-template-columns:repeat(4,420px);gap:44px 34px}
  .tt-phone{width:375px;background:#f5f6fa;border-radius:28px;padding:18px 0 24px;box-shadow:0 0 0 1px rgba(16,17,48,.06),0 24px 50px -30px rgba(16,17,48,.35);font-family:Inter,system-ui,sans-serif;color:#14162b;overflow:hidden}
  .tt-hd{display:flex;align-items:center;justify-content:space-between;padding:0 16px}
  .tt-hd h2{margin:0;font-size:22px;line-height:28px;font-weight:800;letter-spacing:-.01em}
  .tt-pill{display:inline-flex;align-items:center;gap:6px;height:34px;padding:0 9px 0 11px;border-radius:999px;background:#fff;box-shadow:0 0 0 1px rgba(16,17,48,.08);font-weight:800;font-size:15.5px}
  .tt-lane{display:flex;gap:12px;padding:14px 16px 4px;overflow:hidden}
  .tt-check{display:inline-block;flex:none;border:2px solid;border-radius:50%}
  .tt-t{font-weight:700;font-size:15px;line-height:20px;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
  .tt-meta{font-size:12px;line-height:16px;color:#6b7084;display:flex;align-items:center;gap:6px}
  .tt-dot{width:8px;height:8px;border-radius:50%;display:inline-block;flex:none}
  .tt-due{font-size:12px;font-weight:800;display:inline-flex;align-items:center;gap:4px}
  `;
  const shell = (cards) => `<div class="tt-phone"><div class="tt-hd"><h2>To-do</h2><span class="tt-pill">${STACK}23${CHEV}</span></div><div class="tt-lane">${cards}</div></div>`;
  const proj = (x) => `<span class="tt-meta"><span class="tt-dot" style="background:${x.pc}"></span>${x.p}</span>`;

  const STYLES = [
    ["0", "Nu (referentie)", "Witte kaart, rondje + datum bovenaan, titel, project onderaan.", T.slice(0, 3).map((x) =>
      `<div style="width:220px;flex:none;background:#fff;border-radius:20px;padding:16px;box-shadow:0 0 0 1px rgba(16,17,48,.05),0 6px 16px -12px rgba(16,17,48,.4);display:flex;flex-direction:column;gap:8px;min-height:132px">
        <span style="display:flex;align-items:center;gap:8px">${check(x.prio ?? "#c4c8d4")}<span class="tt-due" style="color:${dueColor(x)}">${x.due}</span></span>
        <span class="tt-t" style="font-weight:600">${x.t}</span><span style="margin-top:auto">${proj(x)}</span></div>`).join("")],

    ["A", "Projectkleur", "Elke kaart krijgt een zacht verloop in de kleur van haar Todoist-project; het rondje en de datum in een witte chip. Je ziet in één oogopslag waar een taak bij hoort.", T.slice(0, 3).map((x) =>
      `<div style="width:220px;flex:none;border-radius:22px;padding:16px;background:linear-gradient(160deg,${x.pc}33,${x.pc}12 70%,#fff);box-shadow:inset 0 0 0 1px ${x.pc}40;display:flex;flex-direction:column;gap:10px;min-height:140px">
        <span style="display:flex;align-items:center;justify-content:space-between">${check(x.prio ?? "#9aa0b4", 24)}<span style="background:#fff;border-radius:999px;padding:4px 9px" class="tt-due"><span style="color:${dueColor(x)}">${x.due}</span></span></span>
        <span class="tt-t">${x.t}</span><span class="tt-meta" style="margin-top:auto;color:#3a3d55;font-weight:600"><span class="tt-dot" style="background:${x.pc}"></span>${x.p}</span></div>`).join("")],

    ["B", "Scheurkalender", "Links een groot datumblokje (dag + maand) zoals een scheurkalender, rood als het te laat is; rechts de taak. Datum wordt het anker.", T.slice(0, 3).map((x) =>
      `<div style="width:250px;flex:none;background:#fff;border-radius:20px;padding:12px;box-shadow:0 0 0 1px rgba(16,17,48,.05),0 6px 16px -12px rgba(16,17,48,.4);display:flex;gap:12px;min-height:118px">
        <span style="width:54px;flex:none;border-radius:14px;overflow:hidden;text-align:center;box-shadow:0 0 0 1px rgba(16,17,48,.08)"><span style="display:block;background:${x.late ? "#e5484d" : x.today ? "#16a34a" : "#4f55f1"};color:#fff;font-size:10px;font-weight:800;letter-spacing:.08em;padding:3px 0">${x.mm}</span><span style="display:block;font-size:24px;font-weight:800;line-height:30px">${x.dd}</span><span style="display:block;font-size:10px;color:#8a8fa3;font-weight:700;padding-bottom:4px">${x.wd}</span></span>
        <span style="display:flex;flex-direction:column;gap:8px;min-width:0"><span class="tt-t" style="font-size:14px;line-height:18px">${x.t}</span><span style="margin-top:auto;display:flex;align-items:center;gap:8px">${check(x.prio ?? "#c4c8d4", 20)}${proj(x)}</span></span></div>`).join("")],

    ["C", "Prioriteitsband", "Een stevige gekleurde band links in de prioriteitskleur, groot rondje, titel in zwaarder gewicht. Belangrijk springt eruit, de rest blijft rustig.", T.slice(0, 3).map((x) => {
      const c = x.prio ?? "#d6d9e2";
      return `<div style="width:220px;flex:none;background:#fff;border-radius:20px;padding:16px 16px 16px 22px;position:relative;overflow:hidden;box-shadow:0 0 0 1px rgba(16,17,48,.05),0 6px 16px -12px rgba(16,17,48,.4);display:flex;flex-direction:column;gap:10px;min-height:140px">
        <span style="position:absolute;left:0;top:0;bottom:0;width:6px;background:${c}"></span>
        <span style="display:flex;align-items:center;justify-content:space-between"><span class="tt-due" style="color:${dueColor(x)}">${x.rep ? REPEAT : ""}${x.due}</span>${x.prio ? `<span class="tt-due" style="color:${c}">${FLAG(c)}${c === "#d1453b" ? "P1" : c === "#eb8909" ? "P2" : "P3"}</span>` : ""}</span>
        <span class="tt-t" style="font-weight:800;font-size:16px;line-height:21px">${x.t}</span>
        <span style="margin-top:auto;display:flex;align-items:center;justify-content:space-between">${proj(x)}${check(c, 26)}</span></div>`;
    }).join("")],

    ["D", "Urgentie als sfeer", "De achtergrond vertelt de urgentie: te laat = warm rood-oranje verloop, vandaag = fris groen, later = zacht lila. Witte tekst op de felle kaarten.", T.slice(0, 4).map((x) => {
      const bg = x.late ? "linear-gradient(150deg,#ff7a6b,#e5484d)" : x.today ? "linear-gradient(150deg,#4ade80,#16a34a)" : "linear-gradient(150deg,#ece9ff,#dcd8ff)";
      const fg = x.late || x.today ? "#fff" : "#2a2470";
      return `<div style="width:200px;flex:none;border-radius:22px;padding:16px;background:${bg};color:${fg};box-shadow:0 12px 24px -16px ${x.late ? "rgba(229,72,77,.8)" : x.today ? "rgba(22,163,74,.8)" : "rgba(79,85,241,.4)"};display:flex;flex-direction:column;gap:10px;min-height:150px">
        <span style="display:flex;align-items:center;gap:8px"><span class="tt-check" style="width:24px;height:24px;border-color:${fg};background:transparent;opacity:.9"></span><span style="font-size:11px;font-weight:800;letter-spacing:.08em;opacity:.9">${x.late ? "TE LAAT" : x.today ? "VANDAAG" : "MORGEN"}</span></span>
        <span class="tt-t" style="font-weight:800">${x.t}</span><span style="margin-top:auto;font-size:12px;font-weight:600;opacity:.85">${x.due} · ${x.p}</span></div>`;
    }).join("")],

    ["E", "Post-its", "Taken als zachte papieren notes in pastelkleuren, telkens een tikje gedraaid, met een vouwhoekje. Speels en huiselijk, past bij de illustraties in de app.", T.slice(0, 3).map((x, i) => {
      const paper = ["#fff4b8", "#ffe1ec", "#dff5e6"][i % 3];
      const rot = [-2, 1.5, -1][i % 3];
      return `<div style="width:196px;flex:none;margin-top:6px;border-radius:6px 6px 22px 6px;padding:16px;background:${paper};transform:rotate(${rot}deg);box-shadow:0 14px 22px -16px rgba(80,60,20,.55),0 1px 0 rgba(0,0,0,.04);display:flex;flex-direction:column;gap:10px;min-height:150px;position:relative">
        <span style="position:absolute;right:0;bottom:0;width:26px;height:26px;background:linear-gradient(135deg,transparent 50%,rgba(0,0,0,.08) 50%);border-radius:0 0 22px 0"></span>
        <span style="display:flex;align-items:center;justify-content:space-between">${check(x.prio ?? "#8a7b4a", 22)}<span class="tt-due" style="color:${dueColor(x)}">${x.due}</span></span>
        <span class="tt-t" style="font-weight:700;font-size:16px;line-height:21px;color:#2b2510">${x.t}</span><span class="tt-meta" style="margin-top:auto;color:#6b5f3a">${x.p}</span></div>`;
    }).join("")],

    ["F", "Groot icoon", "Elke taak krijgt een groot, zacht icoon dat bij het onderwerp past (💊 medicatie, 🩺 dokter, 🎁 cadeau), zoals de foto's in de agendategels. Herkenbaar zonder te lezen.", T.slice(0, 3).map((x) =>
      `<div style="width:210px;flex:none;background:#fff;border-radius:22px;padding:16px;position:relative;overflow:hidden;box-shadow:0 0 0 1px rgba(16,17,48,.05),0 6px 16px -12px rgba(16,17,48,.4);display:flex;flex-direction:column;gap:10px;min-height:150px">
        <span style="position:absolute;right:-10px;bottom:-14px;font-size:84px;line-height:1;opacity:.9;filter:drop-shadow(0 8px 10px rgba(16,17,48,.18))">${x.emoji}</span>
        <span style="display:flex;align-items:center;gap:8px">${check(x.prio ?? "#c4c8d4")}<span class="tt-due" style="color:${dueColor(x)}">${x.due}</span></span>
        <span class="tt-t" style="max-width:150px">${x.t}</span></div>`).join("")],

    ["G", "Dagkaarten met checklist", "Geen kaart per taak, maar één kaart per dag («Te laat», «Vandaag», «Morgen») met een korte checklist erin. Minder kaarten, meer overzicht; afvinken per regel.", [
      ["Te laat", "#d1453b", T.slice(0, 2)], ["Vandaag", "#058527", [T[2]]], ["Morgen", "#6b7084", [T[3]]],
    ].map(([lab, c, items]) =>
      `<div style="width:236px;flex:none;background:#fff;border-radius:22px;padding:14px 14px 10px;box-shadow:0 0 0 1px rgba(16,17,48,.05),0 6px 16px -12px rgba(16,17,48,.4);min-height:150px">
        <span style="display:flex;align-items:baseline;justify-content:space-between"><b style="font-size:15px;color:${c}">${lab}</b><span style="font-size:12px;font-weight:700;color:#9aa0b4">${items.length}</span></span>
        ${items.map((x) => `<span style="display:flex;gap:10px;align-items:flex-start;padding:10px 0;border-top:1px solid rgba(16,17,48,.06);margin-top:8px">${check(x.prio ?? "#c4c8d4", 20)}<span style="min-width:0"><span class="tt-t" style="font-size:13.5px;line-height:18px;font-weight:600;-webkit-line-clamp:2">${x.t}</span><span class="tt-meta" style="margin-top:3px"><span class="tt-dot" style="background:${x.pc}"></span>${x.p}</span></span></span>`).join("")}
      </div>`).join("")],

    ["H", "Groot rondje, grote letters", "Minimalistisch: een groot afvinkrondje bovenaan als hoofdrol, de taak in grote letters, datum als klein label onderaan. Uitnodigend om af te vinken.", T.slice(0, 3).map((x) =>
      `<div style="width:186px;flex:none;background:#fff;border-radius:26px;padding:18px;box-shadow:0 0 0 1px rgba(16,17,48,.05),0 10px 22px -16px rgba(16,17,48,.45);display:flex;flex-direction:column;gap:12px;min-height:170px">
        <span class="tt-check" style="width:40px;height:40px;border-width:2.5px;border-color:${x.prio ?? "#c4c8d4"};background:${(x.prio ?? "#c4c8d4") + "12"}"></span>
        <span class="tt-t" style="font-size:17px;line-height:22px;font-weight:800;letter-spacing:-.01em">${x.t}</span>
        <span style="margin-top:auto;display:inline-flex;align-self:flex-start;align-items:center;gap:4px;border-radius:999px;padding:4px 9px;background:${x.late ? "#fdecec" : x.today ? "#e7f6ec" : "#f1f1f3"}" class="tt-due"><span style="color:${dueColor(x)}">${x.due}</span></span></div>`).join("")],
  ];

  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = "left:0;top:0;width:1900px";
  b.innerHTML = `<style>${css}</style><header class="bhd"><span class="bnum">TD</span><div><h2>Startpagina · To-do-tegels <span class="tag">8 voorstellen + huidige · gsm · 18 okt</span></h2><p>Acht uiteenlopende richtingen voor de taken in de To-do-swimlane, met de echte soort taken (te laat, vandaag, morgen). Het afvinkrondje blijft overal; enkel vorm, kleur en hiërarchie verschillen.</p><p class="uses">Bouwt op: To-do-sectie · Todoist-koppeling</p></div></header>
    <div class="tt-opts">${STYLES.map(([k, n, why, cards]) => `<div class="dk-opt"><div class="ag-opthd"><span class="ag-key">${k}</span><div><h3>${n}</h3><p>${why}</p></div></div>${shell(cards)}</div>`).join("")}</div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const top = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${top - 240 - b.offsetHeight}px`;
})();
