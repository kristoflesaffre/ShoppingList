/* Startpagina · Philips Hue: vier voorstellen voor de cinemaknoppen (2 lichtstanden + Start/Stop film) in de stijl van de verdiepingspanelen · 28 okt. */
(() => {
  const world = document.getElementById("world");
  const INK = "#101130";
  const SUB = "#6b6f85";
  const AMBER = "#ffb547";
  const LINE = "#e2e4e6";
  const GRAY50 = "#f1f1f3";
  const NAVY = "#1d2350";
  const ico = {
    clapper: (s = 20) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 10h16v9a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z"/><path d="m4 10-.6-3.2a1.5 1.5 0 0 1 1.2-1.7l12.6-2.4a1.5 1.5 0 0 1 1.7 1.2L19.5 7 4 10z"/><path d="m8.5 4.5 2 4M13.5 3.6l2 4"/></svg>`,
    dim: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21"/></svg>`,
    moon: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>`,
    play: (s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.4-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z" fill="currentColor"/></svg>`,
    stop: (s = 14) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="3.5" fill="currentColor"/></svg>`,
    check: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4.5 4.5L19 7"/></svg>`,
  };
  const PEACH = "linear-gradient(180deg,#ffd2a8,#ff9f63)";
  const WARM = "linear-gradient(180deg,#ffeab5,#ffc65a)";

  /* Hue-schakelaar zoals in de kop van een verdieping (52×30, amber). */
  const sw = (on = true) => `<span style="position:relative;display:inline-block;flex:none;width:52px;height:30px;border-radius:15px;background:${on ? AMBER : "rgba(16,17,48,.14)"};${on ? "box-shadow:0 6px 16px -8px rgba(255,181,71,.9)" : ""}"><i style="position:absolute;top:3px;left:${on ? 25 : 3}px;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(16,17,48,.25)"></i></span>`;
  const cap = "font:800 11px/1 Inter,system-ui,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:" + SUB;
  /* Paneel met lichte rand, kop = label + optionele schakelaar. */
  const panel = (label, right, body, width) => `<section style="flex:none;width:${width}px;height:286px;display:flex;flex-direction:column;gap:12px;border:1px solid ${LINE};border-radius:24px;padding:14px 16px 16px"><div style="display:flex;align-items:center;justify-content:space-between;height:30px"><span style="${cap}">${label}</span>${right || ""}</div><div style="flex:1;min-height:0;display:flex;justify-content:space-around">${body}</div></section>`;
  /* Lampkolom: capsule 44 breed, waarde bovenaan, naam eronder. */
  const lamp = (name, level, fill = WARM) => `<div style="width:72px;display:flex;flex-direction:column;align-items:center;gap:6px"><span style="position:relative;flex:1;width:44px;border-radius:22px;overflow:hidden;background:#fff;box-shadow:0 1px 2px rgba(16,17,48,.05),inset 0 0 0 1px rgba(16,17,48,.04)">${level ? `<i style="position:absolute;left:0;right:0;bottom:0;height:${level}%;background:${fill}"></i>` : ""}<b style="position:relative;display:block;text-align:center;padding-top:14px;font:800 13px/1 Inter,system-ui,sans-serif;color:${INK}">${level || "–"}</b></span><span style="font:700 13px/16px Inter,system-ui,sans-serif;color:${INK};white-space:nowrap">${name}</span></div>`;
  /* Cinemakolom in dezelfde vorm: icoon bovenaan i.p.v. een getal. */
  const scene = (name, { icon, fill, dark = false, active = false, sub = "" }) => `<div style="width:72px;display:flex;flex-direction:column;align-items:center;gap:6px"><span style="position:relative;flex:1;width:44px;border-radius:22px;overflow:hidden;background:${dark ? NAVY : "#fff"};box-shadow:0 1px 2px rgba(16,17,48,.05),inset 0 0 0 1px rgba(16,17,48,.04)${active ? `,0 0 0 2px #fff,0 0 0 4px ${AMBER}` : ""}">${fill ? `<i style="position:absolute;left:0;right:0;bottom:0;${fill}"></i>` : ""}<span style="position:relative;display:grid;place-items:center;padding-top:11px;color:${dark ? "#fff" : INK}">${icon}</span></span><span style="font:700 13px/16px Inter,system-ui,sans-serif;color:${INK};white-space:nowrap;text-align:center">${name}${sub ? `<br><span style="font-weight:500;font-size:11.5px;color:${SUB}">${sub}</span>` : ""}</span></div>`;
  const floor = () => panel("Tweede verdieping", sw(true), lamp("Badkamer", 100) + lamp("Gang", 0) + lamp("Kamer Noë", 30, PEACH), 290);
  const row = (cinema) => `<div style="display:flex;gap:16px;align-items:flex-start">${floor()}${cinema}</div>`;
  const note = (t) => `<p style="margin:14px 2px 0;font:500 12.5px/18px Inter,system-ui,sans-serif;color:${SUB}">${t}</p>`;

  /* 1 · Film = de schakelaar van het paneel, de twee lichtstanden = capsules. */
  const one = () => row(panel("Cinema", sw(true), scene("Gedimd", { icon: ico.dim(), fill: `height:34%;background:${WARM}`, active: true }) + scene("Rest uit", { icon: ico.moon(), dark: true, fill: `height:34%;background:linear-gradient(180deg,rgba(255,198,90,.5),${AMBER})` }), 196))
    + note("Schakelaar aan = film loopt (projector, scherm, Cinema-licht). Uit = film stoppen.");

  /* 2 · Drie capsules, de derde is de film zelf. */
  const filmCap = (on) => `<div style="width:72px;display:flex;flex-direction:column;align-items:center;gap:6px"><span style="position:relative;flex:1;width:44px;border-radius:22px;overflow:hidden;background:${on ? NAVY : "#fff"};box-shadow:0 1px 2px rgba(16,17,48,.05),inset 0 0 0 1px rgba(16,17,48,.04)">${on ? `<i style="position:absolute;left:50%;top:44px;width:80px;height:140px;transform:translateX(-50%);background:radial-gradient(ellipse at 50% 0,rgba(255,181,71,.55),rgba(255,181,71,0) 70%)"></i>` : ""}<span style="position:absolute;left:50%;bottom:8px;transform:translateX(-50%);display:grid;place-items:center;width:32px;height:32px;border-radius:50%;background:${on ? AMBER : GRAY50};color:${on ? "#3a2400" : INK}">${on ? ico.stop(12) : ico.play(15)}</span><span style="position:relative;display:grid;place-items:center;padding-top:11px;color:${on ? "#fff" : INK}">${ico.clapper(19)}</span></span><span style="font:700 13px/16px Inter,system-ui,sans-serif;color:${INK};white-space:nowrap">${on ? "Stop film" : "Film"}</span></div>`;
  const two = () => row(panel("Cinema", "", scene("Gedimd", { icon: ico.dim(), fill: `height:34%;background:${WARM}` }) + scene("Rest uit", { icon: ico.moon(), dark: true, fill: `height:34%;background:linear-gradient(180deg,rgba(255,198,90,.5),${AMBER})` }) + filmCap(true), 262))
    + note("Elke capsule is één tik. De filmcapsule wordt donker met een lichtbundel zolang de film loopt; dan stopt dezelfde knop hem.");

  /* 3 · Rijen: twee lichtstanden als keuzerijen, film als knop onderaan. */
  const choice = (title, sub, icon, on) => `<div style="display:flex;align-items:center;gap:10px;padding:8px 10px 8px 8px;border-radius:16px;background:${on ? "#fff4e0" : GRAY50};${on ? `box-shadow:inset 0 0 0 1.5px ${AMBER}` : ""}"><span style="flex:none;display:grid;place-items:center;width:34px;height:34px;border-radius:12px;background:#fff;color:${INK}">${icon}</span><span style="flex:1;min-width:0"><b style="display:block;font:700 13.5px/17px Inter,system-ui,sans-serif;color:${INK}">${title}</b><span style="display:block;font:500 11.5px/14px Inter,system-ui,sans-serif;color:${SUB}">${sub}</span></span>${on ? `<span style="flex:none;display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:${AMBER};color:#3a2400">${ico.check}</span>` : ""}</div>`;
  const three = () => row(`<section style="flex:none;width:262px;height:286px;display:flex;flex-direction:column;gap:8px;border:1px solid ${LINE};border-radius:24px;padding:14px 14px 14px"><div style="display:flex;align-items:center;height:30px;padding:0 2px"><span style="${cap}">Cinema</span></div>${choice("Gedimd", "Woonkamer op Cinema", ico.dim(17), true)}${choice("Rest uit", "Andere kamers uit", ico.moon(17), false)}<span style="flex:1"></span><span style="display:flex;align-items:center;justify-content:center;gap:8px;height:42px;border-radius:999px;background:${INK};color:#fff;font:700 14px/1 Inter,system-ui,sans-serif">${ico.play(14)} Start film</span></section>`)
    + note("De lichtstanden lezen als twee keuzes (één tegelijk). De filmknop is de enige grote actie; tijdens de film wordt hij «■ Stop film».");

  /* 4 · Eén filmcapsule met schakelaar, de lichtstand als segmentknop. */
  const four = () => row(`<section style="flex:none;width:196px;height:286px;display:flex;flex-direction:column;gap:12px;border:1px solid ${LINE};border-radius:24px;padding:14px 16px 16px"><div style="display:flex;align-items:center;justify-content:space-between;height:30px"><span style="${cap}">Film</span>${sw(false)}</div><span style="position:relative;flex:1;border-radius:22px;overflow:hidden;background:#fff;box-shadow:0 1px 2px rgba(16,17,48,.05),inset 0 0 0 1px rgba(16,17,48,.04);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:${SUB}">${ico.clapper(26)}<b style="font:700 13px/16px Inter,system-ui,sans-serif;color:${INK}">Klaar om te starten</b><span style="font:500 11.5px/14px Inter,system-ui,sans-serif">Projector · scherm · licht</span></span><span style="display:flex;height:36px;padding:3px;border-radius:13px;background:${GRAY50}"><span style="flex:1;display:flex;align-items:center;justify-content:center;gap:5px;border-radius:10px;background:#fff;box-shadow:0 1px 2px rgba(16,17,48,.08);font:700 12.5px/1 Inter,system-ui,sans-serif;color:${INK}">${ico.dim(14)}Gedimd</span><span style="flex:1;display:flex;align-items:center;justify-content:center;gap:5px;font:600 12.5px/1 Inter,system-ui,sans-serif;color:${SUB}">${ico.moon(14)}Rest uit</span></span></section>`)
    + note("Eén toestel «Film» met een schakelaar zoals de verdiepingen. De segmentknop kiest de lichtstand: werkt meteen op het licht, en wordt ook gebruikt als je de film start.");

  const V = [
    { key: "1", name: "Film als schakelaar", why: "Een vijfde paneel «Cinema» in dezelfde vorm als de verdiepingen. De schakelaar in de kop is de film (aan = starten, uit = stoppen), de twee lichtstanden zijn capsules zoals de lampen, met een icoon in plaats van een getal. De gekozen stand krijgt een amber ring.", html: one },
    { key: "2", name: "Drie capsules", why: "Geen schakelaar: drie capsules naast elkaar, Gedimd · Rest uit · Film. De filmcapsule heeft een rond play-knopje onderaan; zolang de film loopt is ze donker met een zachte lichtbundel en wordt het knopje een stop.", html: two },
    { key: "3", name: "Keuzerijen en één knop", why: "Hetzelfde paneel, maar met twee rijen voor de lichtstanden (icoon · titel · uitleg · vinkje) en één brede pil «Start film» onderaan. Het duidelijkste over wat elke knop doet; minder gelijk aan de lampkolommen.", html: three },
    { key: "4", name: "Eén filmtoestel", why: "Alles rond de film: een smaller paneel «Film» met de schakelaar in de kop, één brede capsule die toont wat er gebeurt (klaar · bezig · loopt) en een segmentknop Gedimd · Rest uit voor het licht.", html: four },
  ];
  const b = document.createElement("section");
  b.className = "board iter";
  b.style.cssText = "left:0;top:0;width:1760px";
  b.innerHTML = `<style>.cn-opts{display:grid;grid-template-columns:repeat(2,840px);gap:56px 40px}.cn-stage{background:#f4f5fa;border-radius:26px;padding:28px;min-height:340px}.cn-stage *{box-sizing:border-box}.cn-opt .ag-opthd p{max-width:760px}</style><header class="bhd"><span class="bnum">CB</span><div><h2>Startpagina · cinemaknoppen naast de lampen <span class="tag">4 voorstellen · 28 okt</span></h2><p>Rechts van de verdiepingen staan nu vier losse knoppen in een andere stijl: «Cinema · Woonkamer gedimd», «Cinema · Alle andere lampen uit», «Start film» en «Stop film». De eerste twee zetten alleen het licht; Start film doet projector, scherm en licht samen. Vier voorstellen die de vorm van de verdiepingspanelen overnemen (lichte rand, kop met label, capsules), telkens naast «Tweede verdieping».</p><p class="uses">Bouwt op: verdiepingspaneel, lampcapsule, Hue-schakelaar, SegmentedControl, ChoiceRow</p></div></header>
    <div class="cn-opts" style="margin-top:28px">${V.map((v) => `<div class="cn-opt"><div class="ag-opthd"><span class="ag-key">${v.key}</span><div><h3>${v.name}</h3><p>${v.why}</p></div></div><div class="cn-stage">${v.html()}</div></div>`).join("")}</div>`;
  world.appendChild(b);
  const others = [...world.children].filter((el) => el !== b && el.tagName === "SECTION");
  const topY = Math.min(...others.map((el) => el.offsetTop));
  b.style.top = `${topY - 240 - b.offsetHeight}px`;
})();
