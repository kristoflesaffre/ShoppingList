/* Dashboard · donker paneel «Woonkamer»: vier voorstellen met zwarte rolluik-capsules en het witte scherm dat van onder komt · 27 okt. */
(() => {
  const world = document.getElementById("world");
  const LEFT = { name: "Blinden links", open: 0 };
  const RIGHT = { name: "Blinden rechts", open: 49 };
  const W = "rgba(255,255,255,";
  const ico = {
    up: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></svg>`,
    down: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
    stop: (s = 12) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4" fill="currentColor"/></svg>`,
    height: (s = 15) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4.5h14"/><path d="m7 15 5-5 5 5"/></svg>`,
    film: (s = 15) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M8 5v14M16 5v14M3 10h5M3 14h5M16 10h5M16 14h5"/></svg>`,
    sun: (s = 15) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/></svg>`,
    moon: (s = 15) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z"/></svg>`,
  };
  const SLATS = "repeating-linear-gradient(180deg,#30323e 0,#30323e 3px,#1d1e26 8px,#0b0c10 9px,#30323e 10px)";
  const NIGHT = "linear-gradient(180deg,#1d2350 0%,#3a3270 55%,#b8707a 88%,#f0a47a 100%)";

  /* Zwart rolluik in een capsule, met avondlucht erachter. */
  const capsule = (b, { w = 64, h = 150, label = true } = {}) => `<div style="position:relative;width:${w}px;height:${h}px;border-radius:${w / 2}px;overflow:hidden;background:${NIGHT};box-shadow:inset 0 0 0 1px ${W}.14)">
      <i style="position:absolute;right:30%;top:22%;width:12px;height:12px;border-radius:50%;box-shadow:-4px 2px 0 0 #ffe9b8"></i>
      <i style="position:absolute;left:0;right:0;top:0;height:${100 - b.open}%;background:${SLATS};box-shadow:0 3px 0 #08090c,0 8px 14px -6px rgba(0,0,0,.6)"></i>
      ${label && b.open > 2 ? `<b style="position:absolute;left:0;right:0;bottom:12px;text-align:center;font-size:13px;font-weight:800;color:#fff">${b.open}%</b>` : ""}
    </div>`;
  /* Wit scherm uit de vloerkast, kleine projector met bundel. */
  const screen = ({ w = 200, h = 150, open = true, on = true, r = 22, bg = `${W}.06)` } = {}) => `<div style="position:relative;width:${w}px;height:${h}px;border-radius:${r}px;overflow:hidden;background:${bg};box-shadow:inset 0 0 0 1px ${W}.12)">
      ${on ? `<i style="position:absolute;left:50%;bottom:10px;width:84%;height:${h - 18}px;transform:translateX(-50%);clip-path:polygon(47% 100%,53% 100%,100% 0,0 0);background:linear-gradient(0deg,rgba(255,200,120,.85),rgba(255,200,120,.06))"></i>` : ""}
      <i style="position:absolute;left:13%;right:13%;bottom:${Math.round(h * 0.24)}px;height:${open ? Math.round(h * 0.58) : 0}px;border-radius:5px 5px 0 0;background:linear-gradient(180deg,#fff,#f4f1ec);box-shadow:0 0 18px -2px rgba(255,210,150,${on ? 0.55 : 0})">
        <i style="position:absolute;left:0;right:0;top:0;height:4px;border-radius:5px 5px 0 0;background:#2a2c44"></i>
        ${on && open ? `<i style="position:absolute;inset:5px;border-radius:3px;background:radial-gradient(90% 100% at 50% 100%,rgba(255,196,120,.55),rgba(255,236,200,.15) 75%)"></i>` : ""}</i>
      <i style="position:absolute;left:10%;right:10%;bottom:${Math.round(h * 0.24) - 9}px;height:10px;border-radius:5px;background:#0d0e1c;box-shadow:inset 0 1px 0 ${W}.12)"></i>
      <i style="position:absolute;left:50%;bottom:4px;width:38px;height:14px;margin-left:-19px;border-radius:5px;background:#3a3c52;display:grid;place-items:center"><i style="width:6px;height:6px;border-radius:50%;background:${on ? "#ffd28a;box-shadow:0 0 8px 2px rgba(255,200,120,.9)" : "#5d6078"}"></i></i>
    </div>`;
  /* Gestapelde glazen knoppen. */
  const stack = (size = 38) => `<div style="display:flex;flex-direction:column;gap:7px">${["up", "stop", "down"].map((k) => `<span style="display:grid;place-items:center;width:${size}px;height:${size}px;border-radius:50%;${k === "stop" ? "background:rgba(255,160,140,.22);color:#ffd6cc" : `background:${W}.10);color:#fff;box-shadow:inset 0 0 0 1px ${W}.14)`}">${k === "stop" ? ico.stop() : ico[k]()}</span>`).join("")}</div>`;
  const sw = (on = true) => `<span style="position:relative;display:inline-block;width:42px;height:26px;border-radius:99px;background:${on ? "#ffb547" : `${W}.16)`}"><i style="position:absolute;top:3px;left:${on ? 19 : 3}px;width:20px;height:20px;border-radius:50%;background:#fff"></i></span>`;
  const pill = (content, extra = "") => `<span style="display:inline-flex;align-items:center;gap:6px;height:28px;padding:0 11px;border-radius:99px;background:${W}.12);font-size:11.5px;font-weight:800;color:#fff;${extra}">${content}</span>`;
  const name = (t, sub, align = "center") => `<span style="font-size:11.5px;font-weight:700;line-height:14px;color:${W}.9);text-align:${align}">${t}${sub ? `<br><span style="color:${W}.6);font-weight:600">${sub}</span>` : ""}</span>`;
  const panel = (body, tab = "Woonkamer") => `<div style="width:660px;border-radius:24px;padding:14px 18px 18px;color:#fff;font-family:Inter,system-ui,sans-serif;background:radial-gradient(120% 140% at 0% 0%,#3a2f1c 0%,#1c1a2c 45%,#11101e 100%);box-shadow:0 18px 40px -26px rgba(255,190,80,.45)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px"><span style="font-size:11.5px;font-weight:800;letter-spacing:.08em;color:${W}.75)">WOONKAMER</span>
        <span style="display:flex;padding:3px;border-radius:99px;background:${W}.14);font-size:12px;font-weight:800">${["Licht", "Klimaat", tab].map((t, i) => `<span style="height:28px;padding:0 12px;display:flex;align-items:center;border-radius:99px;${i === 2 ? "background:#fff;color:#3a2f5a" : `color:${W}.85)`}">${t}</span>`).join("")}</span></div>
      ${body}</div>`;

  /* 1 · Drie capsules op een rij */
  const one = () => panel(`<div style="display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;gap:12px;align-items:center">${stack()}<div style="display:flex;flex-direction:column;gap:7px;align-items:center">${capsule(LEFT)}${name("Links")}</div></div>
      <div style="display:flex;gap:12px;align-items:center">${stack()}<div style="display:flex;flex-direction:column;gap:7px">${screen()}<div style="display:flex;justify-content:space-between;align-items:center">${pill(`${ico.height()} Mijn hoogte`)}<span style="display:flex;align-items:center;gap:7px;font-size:11.5px;font-weight:800">Projector ${sw()}</span></div></div></div>
      <div style="display:flex;gap:12px;align-items:center;flex-direction:row-reverse">${stack()}<div style="display:flex;flex-direction:column;gap:7px;align-items:center">${capsule(RIGHT)}${name("Rechts")}</div></div>
    </div>`);

  /* 2 · De capsule ís de knop: bovenste helft omhoog, onderste omlaag, stop in het midden */
  const split = (inner, w) => `<div style="position:relative">${inner}
      <span style="position:absolute;left:50%;top:10px;margin-left:-14px;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:${W}.88);color:#1b1c2b">${ico.up(16)}</span>
      <span style="position:absolute;left:50%;top:50%;margin:-15px 0 0 -15px;width:30px;height:30px;border-radius:50%;display:grid;place-items:center;background:#f4c9bd;color:#5b2a22;box-shadow:0 4px 10px -4px rgba(0,0,0,.6)">${ico.stop(11)}</span>
      <span style="position:absolute;left:50%;bottom:10px;margin-left:-14px;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;background:${W}.88);color:#1b1c2b">${ico.down(16)}</span></div>`;
  const two = () => panel(`<div style="display:flex;justify-content:space-between;align-items:flex-end">
      <div style="display:flex;flex-direction:column;gap:8px;align-items:center">${split(capsule(LEFT, { w: 84, h: 176, label: false }))}${name("Links")}</div>
      <div style="display:flex;flex-direction:column;gap:8px;align-items:center">${split(screen({ w: 250, h: 176 }))}<div style="display:flex;gap:8px;align-items:center">${pill(`${ico.height()} Mijn hoogte`)}${pill(`Projector ${sw()}`, "padding-right:4px")}</div></div>
      <div style="display:flex;flex-direction:column;gap:8px;align-items:center">${split(capsule(RIGHT, { w: 84, h: 176, label: false }))}${name("Rechts", "49% open")}</div>
    </div>`);

  /* 3 · De muur, met de knoppen erop */
  const three = () => panel(`<div style="position:relative;height:208px;border-radius:20px;overflow:hidden;background:linear-gradient(180deg,#2a2440,#1b1830);box-shadow:inset 0 0 0 1px ${W}.10)">
      <i style="position:absolute;left:0;right:0;bottom:0;height:22px;background:linear-gradient(180deg,#2d2537,#231d2c)"></i>
      <i style="position:absolute;right:40px;bottom:0;width:150px;height:22px;clip-path:polygon(16% 0,84% 0,100% 100%,0 100%);background:linear-gradient(180deg,rgba(255,170,120,.55),rgba(255,170,120,.12))"></i>
      <div style="position:absolute;left:58px;top:22px;border-radius:10px;overflow:hidden;box-shadow:0 0 0 5px #3a3350">${capsule(LEFT, { w: 96, h: 140, label: false }).replace(/border-radius:48px/, "border-radius:6px")}</div>
      <div style="position:absolute;left:50%;top:6px;margin-left:-110px">${screen({ w: 220, h: 196, r: 0, bg: "transparent" }).replace("box-shadow:inset 0 0 0 1px rgba(255,255,255,.12)", "box-shadow:none")}</div>
      <div style="position:absolute;right:58px;top:22px;border-radius:10px;overflow:hidden;box-shadow:0 0 0 5px #3a3350">${capsule(RIGHT, { w: 96, h: 140, label: false }).replace(/border-radius:48px/, "border-radius:6px")}</div>
      <div style="position:absolute;left:12px;top:40px">${stack(34)}</div>
      <div style="position:absolute;right:12px;top:40px">${stack(34)}</div>
      <div style="position:absolute;left:50%;margin-left:-150px;top:40px">${stack(34)}</div>
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px">${name("Links", "", "left")}<span style="display:flex;gap:8px;align-items:center">${pill(`${ico.height()} Mijn hoogte`)}<span style="display:flex;align-items:center;gap:7px;font-size:11.5px;font-weight:800">Projector ${sw()}</span></span>${name("Rechts · 49% open", "", "right")}</div>`);

  /* 4 · Snelkeuzes boven de capsules */
  const four = () => panel(`<div style="display:flex;gap:8px;margin-bottom:14px">
      ${pill(`${ico.film()} Filmavond`, "background:#ffb547;color:#3a2400;height:34px;padding:0 14px")}
      ${pill(`${ico.sun()} Alles open`, "height:34px;padding:0 14px")}
      ${pill(`${ico.moon()} Alles dicht`, "height:34px;padding:0 14px")}
    </div>
    <div style="display:flex;justify-content:space-between;align-items:center">
      <div style="display:flex;gap:10px;align-items:center">${stack(34)}<div style="display:flex;flex-direction:column;gap:6px;align-items:center">${capsule(LEFT, { w: 56, h: 128 })}${name("Links")}</div></div>
      <div style="display:flex;gap:10px;align-items:center">${stack(34)}<div style="display:flex;flex-direction:column;gap:6px">${screen({ w: 210, h: 128 })}<div style="display:flex;justify-content:space-between;align-items:center">${pill(`${ico.height()} Mijn hoogte`, "height:24px;font-size:11px")}<span style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:800">Projector ${sw()}</span></div></div></div>
      <div style="display:flex;gap:10px;align-items:center;flex-direction:row-reverse">${stack(34)}<div style="display:flex;flex-direction:column;gap:6px;align-items:center">${capsule(RIGHT, { w: 56, h: 128 })}${name("Rechts")}</div></div>
    </div>`);

  const V = [
    { key: "1", name: "Drie capsules", why: "Dezelfde opbouw als op de startpagina, maar in het donkere paneel: links, scherm, rechts, telkens met glazen knoppen ernaast. Eén tab «Woonkamer» vervangt «Scherm» en «Rolluiken».", html: one },
    { key: "2", name: "De capsule is de knop", why: "Geen aparte knoppenrij: tik boven in een capsule om te openen, onderaan om te sluiten, in het midden staat Stop. Zo is er plaats voor grotere capsules en een groter scherm.", html: two },
    { key: "3", name: "De muur", why: "Een kleine avondscène van de woonkamer: ramen met zwarte rolluiken, het scherm uit de vloerkast, zonlicht op de vloer. De knoppen zweven aan de buitenkant van elk toestel.", html: three },
    { key: "4", name: "Snelkeuzes", why: "Bovenaan één tik voor een hele situatie: «Filmavond» (rolluiken dicht, scherm naar mijn hoogte, projector aan), «Alles open», «Alles dicht». Eronder de losse bediening, wat compacter.", html: four },
  ];
  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = "left:0;top:0;width:1500px";
  b.innerHTML = `<style>.wd-opts{display:grid;grid-template-columns:repeat(2,700px);gap:48px 40px}.wd-stage{background:#e9eaf2;border-radius:26px;padding:20px}.wd-stage *{box-sizing:border-box}</style><header class="bhd"><span class="bnum">WD</span><div><h2>Dashboard · paneel «Woonkamer» <span class="tag">4 varianten · 27 okt</span></h2><p>Het donkere bedieningspaneel krijgt dezelfde taal als de startpagina: zwarte rolluiken in capsules (stand van de BREL-hub), het witte scherm dat van onder uit de vloerkast komt, de kleine projector met lichtbundel, Mijn hoogte en een projectorschakelaar. Links staat links, rechts staat rechts.</p><p class="uses">Bouwt op: RL · B Capsules en de Woonkamer-bediening op de startpagina</p></div></header>
    <div class="wd-opts" style="margin-top:28px">${V.map((v) => `<div class="dk-opt"><div class="ag-opthd"><span class="ag-key">${v.key}</span><div><h3>${v.name}</h3><p>${v.why}</p></div></div><div class="wd-stage">${v.html()}</div></div>`).join("")}</div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const topY = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${topY - 240 - b.offsetHeight}px`;
})();
