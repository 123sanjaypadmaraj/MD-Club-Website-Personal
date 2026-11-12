// MAD OS: the hero phone. The builders (one per core-team role) assemble it on the stage:
// wireframe -> particle flood -> highlights -> glass body -> the club logo powers it through circuits -> it boots.
// The finished phone runs a small OS (MAD events app, Gallery, Team, About, Join, Settings) whose Settings app
// controls this website. Loaded on demand by site.js on the home page; it sets window.MADPhone = { mount }.
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const W = 300, H = 620, SX = 11, SY = 11, SW = 278, SH = 598; // phone and screen box, in phone pixels
  const CANCEL = Symbol("cancel");

  const ICON = {
    team: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9" r="2.4"/><path d="M16 14.2c2.4.2 4 1.8 4.5 4.3"/></svg>',
    about: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.2"/></svg>',
    camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="3.8"/><circle cx="17.2" cy="6.8" r=".9" fill="currentColor"/></svg>',
    chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M4.5 5.5h15v10h-8l-4.5 3.5v-3.5h-2.5z"/><path d="M8.5 10.5h7" stroke-linecap="round"/></svg>',
    gallery: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="m3.8 16 4.7-4.6 3.7 3.6 2.4-2.3 5.6 5.2"/><circle cx="15.5" cy="9" r="1.6"/></svg>',
    join: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m14.5 5-7 7 7 7"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    signal: '<svg viewBox="0 0 18 12" fill="currentColor"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>',
    wifi: '<svg viewBox="0 0 16 12" fill="currentColor"><path d="M8 11.8 5.6 9.4a3.4 3.4 0 0 1 4.8 0Z"/><path d="M3.4 7.2a6.5 6.5 0 0 1 9.2 0l-1.4 1.4a4.5 4.5 0 0 0-6.4 0Z" opacity=".95"/><path d="M1.1 4.9a9.8 9.8 0 0 1 13.8 0l-1.4 1.4a7.8 7.8 0 0 0-11 0Z" opacity=".9"/></svg>',
    battery: '<svg viewBox="0 0 27 13" fill="none"><rect x=".5" y=".5" width="23" height="12" rx="3.5" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="18" height="9" rx="2" fill="currentColor"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" fill="currentColor" opacity=".45"/></svg>',
    cursor: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 1.2 14 6.6 8.2 8.2 6.6 14z" fill="currentColor" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>'
  };
  const APPS = {
    mad: { name: "MAD Club", img: "assets/brand/mad-app-icon.svg" },
    gallery: { name: "Gallery", tint: "linear-gradient(160deg,#F4D58D,#E39B6B)", glyph: ICON.gallery },
    join: { name: "Join", tint: "linear-gradient(160deg,#2A3445,#18212F)", glyph: ICON.join },
    settings: { name: "Settings", tint: "linear-gradient(160deg,#C7D1DD,#8C98AA)", glyph: ICON.settings },
    team: { name: "Team", tint: "linear-gradient(160deg,#7F9AF0,#4561C4)", glyph: ICON.team },
    about: { name: "About", tint: "linear-gradient(160deg,#B7E3DF,#4FA59D)", glyph: ICON.about },
    instagram: { name: "Instagram", tint: "linear-gradient(160deg,#9A8CCB,#C8664A)", glyph: ICON.camera, external: true },
    ask: { name: "Ask", tint: "linear-gradient(160deg,#F7F8FA,#D9E0E8)", glyph: ICON.chat, dark: true, page: "chat" }
  };
  const clock = () => new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false });
  const dateLine = () => new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const buzz = ms => { try { navigator.userActivation?.hasBeenActive && navigator.vibrate && navigator.vibrate(ms); } catch {} };
  const rng = seed => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

  // A soft tick when a builder clicks (Settings > Builder sounds). Off by default.
  const sound = { ac: null, tick(on, f = 1700) {
    if (!on) return;
    try {
      this.ac ||= new AudioContext();
      const t = this.ac.currentTime, o = this.ac.createOscillator(), g = this.ac.createGain();
      o.type = "triangle"; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.045, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
      o.connect(g).connect(this.ac.destination); o.start(t); o.stop(t + 0.07);
    } catch {}
  } };

  function mount(ctx) {
    const { site, events, esc, photoSrc, U, asset, prefs, crew } = ctx;
    const stage = ctx.stage, rig = $(".phone-rig", stage), phone = $(".phone", stage), screen = $(".phone-screen", stage);
    const sorted = [...events].sort((a, b) => ctx.semKey(b.semester) - ctx.semKey(a.semester));
    const A = p => asset(p);
    const motion = () => prefs.motion();

    // ---------- markup ----------
    const iconHtml = (id, slot = false) => {
      const a = APPS[id];
      const tile = a.img ? `<span class="ic-tile ic-img${slot ? " ic-slot" : ""}"><img src="${A(a.img)}" alt=""></span>`
        : `<span class="ic-tile" style="background:${a.tint};color:${a.dark ? "#18212F" : "#fff"}">${a.glyph}</span>`;
      const label = `<span class="ic-label">${esc(a.name)}</span>`;
      if (a.external) return `<a class="ic" data-app="${id}" href="${esc(site.instagram)}" target="_blank" rel="noopener" aria-label="${esc(a.name)} (opens in a new tab)">${tile}${label}</a>`;
      if (a.page) return `<a class="ic" data-app="${id}" href="${esc(U(a.page))}" aria-label="Open the ${esc(a.name)} assistant">${tile}${label}</a>`;
      return `<button type="button" class="ic" data-app="${id}" aria-label="Open ${esc(a.name)}">${tile}${label}</button>`;
    };
    const flags = events.filter(e => e.flagship).length, photos = events.reduce((n, e) => n + (e.photos || []).length, 0);
    screen.insertAdjacentHTML("beforeend", `
      <svg class="ph-circuit" viewBox="0 0 ${SW} ${SH}" aria-hidden="true"></svg>
      <img class="ph-logo" src="${A("assets/brand/mad-logo.svg")}" alt="" aria-hidden="true">
      <div class="os" data-screen="off" data-app="">
        <div class="os-status" aria-hidden="true"><span class="os-time">${clock()}</span><span class="os-sys">${ICON.signal}${ICON.wifi}${ICON.battery}</span></div>
        <div class="os-wall" aria-hidden="true"></div>
        <section class="os-boot" aria-hidden="true"><img src="${A("assets/brand/mad-logo.svg")}" alt=""></section>
        <section class="os-lock" aria-label="Lock screen">
          <p class="lk-date">${dateLine()}</p><p class="lk-time">${clock()}</p>
          <div class="lk-note"><span class="lk-ic"><img src="${A("assets/brand/mad-app-icon.svg")}" alt=""></span>
            <span><b>${esc(site.name)}</b><small>${events.length} events in the archive since ${esc(site.established)}. Open the app to browse them.</small></span></div>
          <button type="button" class="lk-unlock">Swipe up or tap to open</button>
        </section>
        <section class="os-home" aria-label="Home screen">
          <div class="os-widget"><span class="w-k">${esc(site.name)} · ${esc(site.college_short)}</span>
            <span class="w-big">${events.length}<small>events since ${esc(site.established)}</small></span>
            <span class="w-row"><span><b>${flags}</b> flagships</span><span><b>${photos}</b> photos</span></span>
            <span class="w-latest">Latest: ${esc(sorted[0]?.name || "")}</span></div>
          <div class="os-grid">${["team", "about", "instagram", "ask"].map(id => iconHtml(id)).join("")}</div>
          <div class="os-dots" aria-hidden="true"><i class="on"></i><i></i></div>
          <div class="os-dock">${["mad", "gallery", "join", "settings"].map(id => iconHtml(id, id === "mad")).join("")}</div>
        </section>
        <section class="os-app" aria-live="polite"><div class="app-splash" aria-hidden="true"></div><div class="app-stack"></div></section>
        <div class="os-banner" role="status" aria-live="polite"></div>
        <button type="button" class="os-ind" aria-label="Go to home screen"><i></i></button>
      </div>`);
    const os = $(".os", screen), app = $(".os-app", os), stack = $(".app-stack", os), circuit = $(".ph-circuit", screen), logo = $(".ph-logo", screen);
    setInterval(() => $$(".os-time, .lk-time", os).forEach(t => { t.textContent = clock(); }), 15000);

    // the blueprint the committee builders lay out before the glass exists
    const wire = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    wire.setAttribute("class", "ph-wire"); wire.setAttribute("viewBox", `0 0 ${W} ${H}`); wire.setAttribute("aria-hidden", "true");
    const iconX = i => 27 + i * 61.5 + 5.75;
    const R = (x, y, w, h, r, cls, step) => `<rect class="${cls}" data-step="${step}" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>`;
    const rnd = rng(7);
    const teal = Array.from({ length: 5 }, (_, i) => { let s = "", x = 36; while (x < 262) { const len = 8 + rnd() * 34; s += `M${x.toFixed(1)} ${82 + i * 20}h${Math.min(len, 262 - x).toFixed(1)}`; x += len + 6 + rnd() * 14; } return s; }).join("");
    wire.innerHTML = `<defs><pattern id="ph-dots" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.05"/></pattern></defs>
      ${R(1, 1, W - 2, H - 2, 50, "w-out", "frame")}${R(SX, SY, SW, SH, 40, "w-in", "frame")}${R(102, 22, 96, 28, 14, "w-out", "frame")}
      <rect class="w-btn" data-step="frame" x="-2" y="132" width="3" height="52" rx="1.5"/><rect class="w-btn" data-step="frame" x="-2" y="196" width="3" height="52" rx="1.5"/><rect class="w-btn" data-step="frame" x="299" y="160" width="3" height="78" rx="1.5"/>
      <rect class="w-flood" x="${SX}" y="${SY}" width="${SW}" height="${SH}" rx="40" fill="url(#ph-dots)"/>
      ${R(27, 64, 246, 120, 22, "w-in", "hi")}<path class="w-teal" data-step="hi" d="${teal}"/>
      ${[0, 1, 2, 3].map(i => R(iconX(i), 202, 50, 50, 14, "w-in", "hi")).join("")}
      ${R(27, 516, 246, 72, 28, "w-in", "hi")}${[0, 1, 2, 3].map(i => R(iconX(i), 527, 50, 50, 14, "w-in", "hi")).join("")}
      ${R(90, 600, 120, 5, 2.5, "w-in", "hi")}`;
    rig.prepend(wire);

    // the builders: one cursor per core-team role, in that role's colour
    const crewBox = document.createElement("div");
    crewBox.className = "crew"; crewBox.setAttribute("aria-hidden", "true");
    crewBox.innerHTML = crew.map(c => `<span class="cur" style="--c:${c.hex}">${ICON.cursor}<b>${esc(c.short)}</b></span>`).join("");
    stage.append(crewBox);
    const curs = $$(".cur", crewBox);

    // ---------- panel ----------
    const btn = $("#build-btn"), label = $("#build-btn .label"), stB = $("#build-status b"), stS = $("#build-status span"), bar = $("#build-progress i");
    const panel = $("#build-panel"), tipBtn = $("#open-settings"), tipTxt = $("#build-tip .tip-txt");
    const status = (b, s, p) => { if (stB) stB.textContent = b; if (stS) stS.textContent = s; if (bar && p !== undefined) bar.style.width = Math.round(p * 100) + "%"; };
    const setState = s => {
      stage.dataset.state = s;
      const busy = !["idle", "live"].includes(s);
      if (label) label.textContent = busy ? "Skip build" : s === "live" ? "Rebuild" : "Build the phone";
      panel?.classList.toggle("done", s === "live");
      if (tipBtn) tipBtn.hidden = s !== "live";
      if (tipTxt) tipTxt.innerHTML = s === "live"
        ? "Use the phone's <b>Settings</b> app to control this website: dark mode, style, animations, lite effects and builder sounds."
        : "The phone runs this website. Build it, then open its <b>Settings</b> app to switch dark mode, style, animations, lite effects and builder sounds.";
    };

    // ---------- builders ----------
    const geo = () => {
      const s = stage.getBoundingClientRect(), r = rig.getBoundingClientRect(), k = r.width / W || 1;
      return (x, y) => [r.left - s.left + x * k, r.top - s.top + y * k];
    };
    const moveCur = (c, x, y, ms = 520) => { c.style.transitionDuration = ms + "ms"; c.style.transform = `translate(${x}px,${y}px)`; c.classList.add("on"); };
    const clickCur = c => { c.classList.remove("clk"); void c.offsetWidth; c.classList.add("clk"); sound.tick(prefs.sound(), 1500 + Math.random() * 600); };
    const crewOff = () => { const s = stage.getBoundingClientRect(); curs.forEach((c, i) => { moveCur(c, i % 2 ? s.width + 40 : -60, 60 + i * 40, 700); c.classList.remove("on"); }); };
    const crewHome = () => { const s = stage.getBoundingClientRect(); curs.forEach((c, i) => { c.style.transitionDuration = "0ms"; c.style.transform = `translate(${i % 2 ? s.width + 40 : -60}px,${s.height * 0.3 + i * 30}px)`; }); };

    let run = 0, live = false, skip = false;
    const guard = id => { if (id !== run) throw CANCEL; };
    const wait = (ms, id) => new Promise(r => setTimeout(r, skip ? 0 : ms)).then(() => guard(id));
    // send builders to these phone points, a few at a time, each clicking as it lands
    const work = async (pts, id, per = 260) => {
      for (let i = 0; i < pts.length; i++) {
        const P = geo(), c = curs[(i * 4 + run) % curs.length], [x, y] = P(...pts[i]);
        moveCur(c, x, y);
        if (skip) continue;
        setTimeout(() => clickCur(c), 520);
        await wait(per, id);
      }
      await wait(560, id);
    };
    const rectPts = sel => $$(sel, wire).map(r => [+r.getAttribute("x") + +r.getAttribute("width") * 0.5, +r.getAttribute("y") + +r.getAttribute("height")]);

    // circuits: traces leave the logo's outline like the pins of a chip, then branch towards the edges
    const drawCircuit = () => {
      const r = rng(11), cx = SW / 2, cy = SH / 2, lw = 26, lh = 40, out = [];
      for (let i = 0; i < 44; i++) {
        const side = i % 4, t = (Math.floor(i / 4) + 0.5) / 11;
        let x = side === 0 ? cx - lw + t * lw * 2 : side === 2 ? cx - lw + t * lw * 2 : side === 1 ? cx + lw : cx - lw;
        let y = side === 0 ? cy - lh : side === 2 ? cy + lh : cy - lh + t * lh * 2;
        const dx = side === 1 ? 1 : side === 3 ? -1 : 0, dy = side === 0 ? -1 : side === 2 ? 1 : 0;
        const turn = r() < 0.5 ? -1 : 1, a = 8 + r() * 22, b = 10 + r() * 40, c = 30 + r() * 140;
        let d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
        x += dx * a; y += dy * a; d += `L${x.toFixed(1)} ${y.toFixed(1)}`;
        x += dx * b + (dy ? turn * b : 0); y += dy * b + (dx ? turn * b : 0); d += `L${x.toFixed(1)} ${y.toFixed(1)}`;
        x += dx * c; y += dy * c; x = Math.max(8, Math.min(SW - 8, x)); y = Math.max(40, Math.min(SH - 20, y)); d += `L${x.toFixed(1)} ${y.toFixed(1)}`;
        const f = 6 + r() * 8;
        d += `M${x.toFixed(1)} ${y.toFixed(1)}l${(dx * f + (dy ? f : 0)).toFixed(1)} ${(dy * f + (dx ? f : 0)).toFixed(1)}M${x.toFixed(1)} ${y.toFixed(1)}l${(dx * f - (dy ? f : 0)).toFixed(1)} ${(dy * f - (dx ? f : 0)).toFixed(1)}`;
        out.push(`<path pathLength="1" style="--d:${(r() * 0.5).toFixed(2)}s" d="${d}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="1.6" style="--d:${(0.55 + r() * 0.4).toFixed(2)}s"/>`);
      }
      circuit.innerHTML = `<g class="tr">${out.join("")}</g><g class="gl">${out.join("")}</g>`;
    };
    // the logo flies in from the site's navigation to the centre of the screen
    const flyLogo = async id => {
      const from = document.querySelector(".brand .mark") || document.querySelector(".brand");
      logo.classList.remove("on");
      if (!from || skip || !motion()) { logo.classList.add("on"); return; }
      logo.classList.add("on"); logo.style.opacity = "0";
      const a = from.getBoundingClientRect(), b = logo.getBoundingClientRect();
      const f = document.createElement("img");
      f.src = A("assets/brand/mad-logo.svg"); f.alt = ""; f.className = "logo-fly";
      Object.assign(f.style, { left: b.left + "px", top: b.top + "px", width: b.width + "px", height: b.height + "px" });
      document.body.append(f);
      const k = Math.max(a.width / b.width, 0.15);
      await f.animate([{ transform: `translate(${a.left - b.left}px,${a.top - b.top}px) scale(${k})`, opacity: 0.4 }, { transform: "none", opacity: 1 }],
        { duration: 900, easing: "cubic-bezier(.6,.05,.25,1)" }).finished.catch(() => {});
      f.remove(); logo.style.opacity = "";
      guard(id);
    };

    async function build() {
      const id = ++run;
      skip = false; live = false;
      osReset();
      try {
        if (!motion()) { skip = true; }
        crewHome();
        setState("frame");
        status("Building", `Frame · ${crew.length} builders`, 0.05);
        $$("[data-step]", wire).forEach(e => e.classList.remove("in"));
        wire.classList.remove("flood", "gone");
        await wait(60, id);
        // 1. the frame: chassis, screen, island, buttons
        const frame = $$('[data-step="frame"]', wire);
        frame.forEach((e, i) => setTimeout(() => run === id && e.classList.add("in"), skip ? 0 : i * 140));
        await work([[150, 1], [150, 11], [150, 50], [0, 158], [0, 222], [300, 199]], id, 200);
        // 2. the flood: an even field of particles ripples down the screen
        status("Building", "Flooding the screen with particles", 0.25);
        wire.classList.add("flood");
        await wait(1000, id);
        // 3. the highlights: the interface is traced over the flood
        status("Building", "Tracing the interface", 0.42);
        const hi = $$('[data-step="hi"]', wire);
        hi.forEach((e, i) => setTimeout(() => run === id && e.classList.add("in"), skip ? 0 : i * 110));
        await work(rectPts('rect[data-step="hi"]').slice(0, 11), id, 150);
        // 4. the glass body materialises behind the scan line
        status("Building", "Materialising the glass body", 0.6);
        setState("materializing");
        await wait(1100, id);
        wire.classList.add("gone");
        // 5. the club logo arrives and powers the phone through circuits
        status("Powering", "The logo powers the phone", 0.72);
        setState("logo");
        drawCircuit();
        await flyLogo(id);
        const P = geo(), sides = [[-34, 150], [334, 150], [-34, 330], [334, 330], [-34, 500], [334, 500]];
        curs.forEach((c, i) => { const [x, y] = P(...sides[i % 6]); moveCur(c, x, y + (i >= 6 ? 26 : 0), 700); });
        await wait(300, id);
        setState("powering");
        await wait(1700, id);
        // 6. boot -> lock -> home; the MAD icon lands in the dock and opens itself
        status("Booting", "MAD OS", 0.86);
        setState("booting");
        await osBoot(id);
        status("Live", "Tap apps · drag beside the phone", 1);
        setState("live"); live = true;
        crewOff();
        if (!skip) { await wait(500, id); installMad(); await wait(500, id); launch("mad"); }
        else installMad();
      } catch (e) { if (e !== CANCEL) throw e; }
    }
    function finish() { // Skip build: jump to the live phone
      if (live) return;
      skip = true;
    }
    function reset() {
      run++; live = false; skip = false;
      osReset();
      wire.classList.remove("flood", "gone");
      $$("[data-step]", wire).forEach(e => e.classList.remove("in"));
      circuit.innerHTML = ""; logo.classList.remove("on");
      crewOff();
      setState("idle");
      status("Stage is empty", "Press Build to assemble the phone", 0);
    }

    // ---------- OS ----------
    const set = s => { os.dataset.screen = s; };
    let current = null, launchedFrom = null, busy = false, navBusy = false, q = null, wantHome = false, navQ = [];
    function osReset() {
      current = null; busy = false; navBusy = false; navQ = []; os.dataset.app = ""; stack.innerHTML = ""; island(false); set("off");
      $('.os-dock .ic[data-app="mad"] .ic-tile', os)?.classList.add("ic-slot");
    }
    async function osBoot(id) {
      set("boot"); logo.classList.remove("on");
      await wait(650, id);
      set("lock");
      await wait(1100, id);
      unlock();
      await wait(600, id);
    }
    function unlock() {
      if (os.dataset.screen !== "lock") return;
      set("home"); buzz(8);
      if (motion() && !skip) [$(".os-widget", os), ...$$(".os-grid .ic, .os-dock .ic", os)].forEach((el, i) =>
        el.animate([{ opacity: 0, transform: "scale(.6) translateY(14px)" }, { opacity: 1, transform: "none" }], { duration: 420, delay: 40 + i * 45, easing: "cubic-bezier(.34,1.45,.64,1)", fill: "backwards" }));
    }
    function installMad() {
      const slot = $('.os-dock .ic[data-app="mad"] .ic-tile', os);
      if (!slot) return;
      slot.classList.remove("ic-slot");
      if (motion()) slot.animate([{ transform: "scale(.82)" }, { transform: "scale(1.08)" }, { transform: "none" }], { duration: 420, easing: "cubic-bezier(.34,1.5,.64,1)" });
      buzz(12);
    }
    const rectIn = el => {
      const s = os.getBoundingClientRect(), r = el.getBoundingClientRect(), k = s.width / os.offsetWidth || 1;
      return { x: (r.left - s.left) / k, y: (r.top - s.top) / k, w: r.width / k, h: r.height / k, W: os.offsetWidth, H: os.offsetHeight };
    };
    const insetFor = (r, rad = 14) => `inset(${r.y}px ${r.W - r.x - r.w}px ${r.H - r.y - r.h}px ${r.x}px round ${rad}px)`;
    const drain = () => { if (wantHome) { wantHome = false; q = null; home(); return; } const n = q; q = null; if (n) launch(n[0], n[1]); };
    const owait = ms => new Promise(r => setTimeout(r, ms));
    async function launch(id, fromEl) {
      if (!live && os.dataset.screen !== "home" && os.dataset.screen !== "app") return;
      if (busy) { q = [id, fromEl]; wantHome = false; return; }
      if (current) await home(true);
      busy = true;
      const from = fromEl || $(`.ic[data-app="${id}"]`, os), tile = from ? $(".ic-tile", from) : null;
      launchedFrom = tile; current = id; os.dataset.app = id; stack.innerHTML = "";
      stack.append(page(id));
      const a = APPS[id], splash = $(".app-splash", app);
      splash.style.background = a.img ? "#fff" : a.tint;
      splash.innerHTML = a.img ? `<img src="${A(a.img)}" alt="">` : `<span style="color:${a.dark ? "#18212F" : "#fff"}">${a.glyph}</span>`;
      set("app"); island(true, a.name); buzz(10); sound.tick(prefs.sound(), 1200);
      if (motion() && tile) {
        splash.style.opacity = "1";
        await app.animate([{ clipPath: insetFor(rectIn(tile)) }, { clipPath: "inset(0px 0px 0px 0px round 40px)" }], { duration: 520, easing: "cubic-bezier(.2,.9,.2,1)" }).finished.catch(() => {});
        await owait(id === "mad" ? 420 : 140);
        await splash.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: "forwards" }).finished.catch(() => {});
      }
      splash.style.opacity = "0";
      island(false); busy = false;
      reveal(stack.lastElementChild);
      drain();
    }
    async function home(quick = false) {
      if (busy && !quick) { wantHome = true; return; }
      if (!current) return;
      busy = true;
      set("home");
      if (motion() && launchedFrom) await app.animate([{ clipPath: "inset(0px 0px 0px 0px round 40px)", opacity: 1 }, { clipPath: insetFor(rectIn(launchedFrom)), opacity: 0.2 }], { duration: quick ? 220 : 380, easing: "cubic-bezier(.4,0,.2,1)" }).finished.catch(() => {});
      current = null; navQ = []; navBusy = false; os.dataset.app = ""; stack.innerHTML = ""; app.style.transform = ""; busy = false;
      if (!quick) drain();
    }
    function island(on, name = "") {
      const isl = os.parentElement && os.parentElement.querySelector(":scope > .phone-island");
      if (!isl) return;
      isl.classList.toggle("live", on);
      isl.innerHTML = on ? `<img src="${A("assets/brand/mad-app-icon.svg")}" alt=""><span>${esc(name)}</span>` : "";
    }
    let bannerT = 0;
    function banner(text) {
      const b = $(".os-banner", os);
      b.innerHTML = `<img src="${A("assets/brand/mad-app-icon.svg")}" alt=""><span>${esc(text)}</span>`;
      b.classList.add("on"); clearTimeout(bannerT);
      bannerT = setTimeout(() => b.classList.remove("on"), 2600);
    }
    // the pieces of a freshly opened screen settle in one after another
    function reveal(pg) {
      if (!pg || !motion()) return;
      $$(".ap-title, .ap-sub, .ap-chips, .ap-card, .ap-row, .ap-group, .ap-banner, .ap-text, .ap-cta, .ap-grid > button, .ap-hero, .ap-strip", pg).slice(0, 16).forEach((el, i) =>
        el.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 380, delay: i * 45, easing: "cubic-bezier(.2,.9,.2,1)", fill: "backwards" }));
    }
    const navNext = () => { const n = navQ.shift(); if (n) n(); };
    function push(pg) {
      if (navBusy) { navQ.push(() => push(pg)); return; }
      const prev = stack.lastElementChild;
      stack.append(pg);
      if (!motion()) { if (prev) prev.hidden = true; return; }
      navBusy = true;
      pg.animate([{ transform: "translateX(100%)" }, { transform: "none" }], { duration: 420, easing: "cubic-bezier(.2,.9,.2,1)" }).finished.catch(() => {}).then(() => { navBusy = false; reveal(pg); navNext(); });
      prev && prev.animate([{ transform: "none" }, { transform: "translateX(-28%)", opacity: 0.6 }], { duration: 420, easing: "cubic-bezier(.2,.9,.2,1)", fill: "forwards" });
    }
    async function pop() {
      if (navBusy) { navQ.push(() => pop()); return; }
      const top = stack.lastElementChild, prev = top && top.previousElementSibling;
      if (!prev) return home();
      navBusy = true;
      if (motion()) {
        prev.getAnimations().forEach(a => a.cancel());
        prev.animate([{ transform: "translateX(-28%)", opacity: 0.6 }, { transform: "none", opacity: 1 }], { duration: 360, easing: "cubic-bezier(.2,.9,.2,1)" });
        await top.animate([{ transform: top.style.transform || "none" }, { transform: "translateX(100%)" }], { duration: 360, easing: "cubic-bezier(.2,.9,.2,1)" }).finished.catch(() => {});
      }
      prev.hidden = false; top.remove(); navBusy = false; navNext();
    }

    // ---------- app pages ----------
    function shell(title, body, { back = false, large = true, sub = "" } = {}) {
      const p = document.createElement("div");
      p.className = "app-page";
      p.innerHTML = `<header class="ap-bar">${back ? `<button type="button" class="ap-back" data-back aria-label="Back">${ICON.back}<span>Back</span></button>` : "<span></span>"}${large ? "<span></span>" : `<b class="ap-mini">${esc(title)}</b>`}<span></span></header>
        <div class="ap-scroll">${large ? `<h2 class="ap-title">${esc(title)}</h2>${sub ? `<p class="ap-sub">${sub}</p>` : ""}` : ""}${body}</div>`;
      return p;
    }
    const card = e => {
      const cover = (e.photos || [])[0] ? photoSrc(e.photos[0]) : "";
      return `<button type="button" class="ap-card" data-ev="${esc(e.slug)}" data-y="${esc(e.semester.slice(0, 5))}">
        <span class="ap-cover">${cover ? `<img src="${esc(cover)}" alt="" loading="lazy">` : `<span class="ap-ph c${e.slug.length % 4}"><img src="${A("assets/brand/mad-rays.svg")}" alt=""><b>${esc(e.name)}</b></span>`}</span>
        <span class="ap-meta"><small>${esc(e.semester)}${e.flagship ? " · Flagship" : ""}</small><b>${esc(e.name)}</b><span>${esc(e.description)}</span></span></button>`;
    };
    function page(id) {
      const s = site;
      if (id === "mad") {
        const years = [...new Set(sorted.map(e => e.semester.slice(0, 5)))];
        return shell("Events", `<div class="ap-chips" role="group" aria-label="Year">${["All", ...years].map((y, i) => `<button type="button" data-act="year" data-y="${esc(y)}" aria-pressed="${i === 0}">${y === "All" ? "All" : "20" + esc(y.replace("-", "-20"))}</button>`).join("")}</div>
          <div class="ap-feed">${sorted.map(card).join("")}</div>`, { sub: `${sorted.length} events · all completed` });
      }
      if (id === "gallery") {
        const all = sorted.flatMap(e => (e.photos || []).map(p => ({ p: photoSrc(p), e })));
        return shell("Gallery", `<div class="ap-grid">${all.map((x, i) => `<button type="button" data-photo="${i}" aria-label="${esc(x.e.name)} photo"><img src="${esc(x.p)}" alt="${esc(x.e.name)}" loading="lazy"></button>`).join("")}</div>`, { sub: `${all.length} photos from ${new Set(all.map(x => x.e.slug)).size} events` });
      }
      if (id === "team") {
        const p = shell("Team", `<div class="ap-list" id="ap-team"><p class="ap-sub">Loading...</p></div>`);
        ctx.loadTeam().then(t => {
          const box = $("#ap-team", p); if (!box) return;
          const ini = n => n.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase();
          box.innerHTML = `<p class="ap-sub">Core team ${esc(t.current_year)}</p>` + (t.current || []).map(m => `<div class="ap-row"><span class="ap-av" style="--c:${ctx.roleOf(m.role).hex}">${m.photo ? `<img src="${esc(photoSrc(m.photo))}" alt="" loading="lazy">` : esc(ini(m.name))}</span><span><b>${esc(m.name)}</b><small>${esc(m.role)}</small>${m.quote ? `<em>&ldquo;${esc(m.quote)}&rdquo;</em>` : ""}</span></div>`).join("")
            + `<a class="ap-cta ghost" href="${esc(U("team"))}">Open the team page</a>`;
          reveal(box);
        }).catch(() => {});
        return p;
      }
      if (id === "about") {
        const a = s.about || {};
        return shell("About", `<p class="ap-quote">${esc(s.tagline)}</p><p class="ap-text">${esc(a.who || "")}</p>
          <div class="ap-list">${(a.functions || []).map((x, i) => `<div class="ap-row"><span class="ap-av n">${String(i + 1).padStart(2, "0")}</span><span><b>${esc(x.title)}</b><small>${esc(x.text)}</small></span></div>`).join("")}</div>
          <a class="ap-cta ghost" href="${esc(U("about"))}">Read the full story</a>`, { sub: `${esc(s.full_name)}, est. ${esc(s.established)}` });
      }
      if (id === "join") {
        const em = (s.contact?.email || "").trim();
        return shell("Join MAD", `<div class="ap-hero"><img src="${A("assets/brand/mad-logo.svg")}" alt=""><p>${esc(s.cta_text || "")}</p></div>
          <a class="ap-cta" href="${esc(s.instagram)}" target="_blank" rel="noopener">DM ${esc(s.instagram_handle)}</a>
          <a class="ap-cta ghost" href="${esc(U("contact"))}">How to join</a>
          ${em ? `<a class="ap-cta ghost" href="mailto:${esc(em)}">${esc(em)}</a>` : ""}`);
      }
      if (id === "settings") {
        const sw = (act, on, b, sm) => `<label class="ap-set"><span><b>${b}</b><small>${sm}</small></span><input type="checkbox" role="switch" data-act="${act}"${on ? " checked" : ""}></label>`;
        return shell("Settings", `<div class="ap-group">
            ${sw("theme", prefs.isDark(), "Dark appearance", "Switches the whole website, not just this phone")}
            <div class="ap-set"><span><b>Site style</b><small>The colour scheme of every page</small></span><span class="ap-skins" role="group" aria-label="Site style">${prefs.skins.map(([k, t]) => `<button type="button" data-act="skin" data-skin="${k}" aria-pressed="${prefs.skin() === k}" aria-label="${esc(t)} style" title="${esc(t)}"><i></i></button>`).join("")}</span></div>
            ${sw("motion", prefs.motion(), "Animations", "The builders and motion across the site")}
            ${sw("lite", prefs.lite(), "Lite effects", "Lighter rendering for slower devices")}
            ${sw("sound", prefs.sound(), "Builder sounds", "A soft tick when a builder clicks")}
          </div><div class="ap-group">
            <button type="button" class="ap-set" data-act="rebuild"><span><b>Rebuild this phone</b><small>Replay the build from the empty stage</small></span><i>${ICON.arrow}</i></button>
            <button type="button" class="ap-set" data-act="full"><span><b>Full screen</b><small>Turn your screen into this phone</small></span><i>${ICON.arrow}</i></button>
          </div><p class="ap-sub">MAD OS · runs on ${esc(s.name)}'s website.</p>`);
      }
      return shell(id, "");
    }
    function eventPage(slug) {
      const e = sorted.find(x => x.slug === slug); if (!e) return null;
      const ph = e.photos || [], cover = ph[0] ? photoSrc(ph[0]) : "";
      return shell(e.name, `<div class="ap-banner">${cover ? `<img src="${esc(cover)}" alt="${esc(e.name)}">` : `<span class="ap-ph big c${e.slug.length % 4}"><img src="${A("assets/brand/mad-rays.svg")}" alt=""><b>${esc(e.name)}</b></span>`}</div>
        <h2 class="ap-title">${esc(e.name)}</h2><p class="ap-sub">${esc(e.semester)}${e.flagship ? " · Flagship" : ""} · Completed</p><p class="ap-text">${esc(e.description)}</p>
        ${ph.length > 1 ? `<h3 class="ap-h">Photos</h3><div class="ap-strip">${ph.slice(0, 8).map((p, k) => `<button type="button" data-photo="${k}" aria-label="${esc(e.name)} photo ${k + 1}"><img src="${esc(photoSrc(p))}" alt="${esc(e.name)}" loading="lazy"></button>`).join("")}</div>` : ""}
        <a class="ap-cta" href="${esc(U("event", { e: e.slug }))}">Open the full event page</a>`, { back: true, large: false });
    }
    function viewPhoto(from) {
      const img = $("img", from), v = document.createElement("div");
      v.className = "ap-viewer";
      v.innerHTML = `<img src="${esc(img.src)}" alt="${esc(img.alt)}"><button type="button" aria-label="Close photo">Done</button>`;
      app.append(v);
      if (motion()) v.animate([{ clipPath: insetFor(rectIn(from), 8), background: "rgba(0,0,0,0)" }, { clipPath: "inset(0 0 0 0 round 0px)", background: "rgba(0,0,0,1)" }], { duration: 360, easing: "cubic-bezier(.2,.9,.2,1)" });
      const close = () => v.remove();
      $("button", v).onclick = close;
      v.addEventListener("click", e => { if (e.target === v) close(); });
    }
    function action(act, el) {
      if (act === "theme") { prefs.setDark(el.checked); banner(el.checked ? "Dark appearance on, across the whole site" : "Light appearance on, across the whole site"); buzz(6); syncSkins(); }
      if (act === "skin") { prefs.setSkin(el.dataset.skin); syncSkins(); banner(`${el.title} style on, across the whole site`); }
      if (act === "motion") { prefs.setMotion(el.checked); banner(el.checked ? "Animations on" : "Animations off: the site holds still"); }
      if (act === "lite") { prefs.setLite(el.checked); banner(el.checked ? "Lite effects on: solid panels, fewer effects" : "Full effects on"); }
      if (act === "sound") { prefs.setSound(el.checked); banner(el.checked ? "Builder sounds on: you'll hear each builder click" : "Builder sounds off"); sound.tick(el.checked, 1900); }
      if (act === "rebuild") { full.close().then(() => { reset(); setTimeout(build, 200); }); }
      if (act === "full") full.open();
      if (act === "year") {
        const pg = el.closest(".app-page");
        $$("[data-act=year]", pg).forEach(b => b.setAttribute("aria-pressed", String(b === el)));
        $$(".ap-card", pg).forEach(c => { const show = el.dataset.y === "All" || c.dataset.y === el.dataset.y; if (show && c.hidden && motion()) c.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 300 }); c.hidden = !show; });
        const sc = $(".ap-scroll", pg); if (sc) sc.scrollTop = 0;
        buzz(5);
      }
    }
    // the phone's switches follow changes made elsewhere on the site (header style buttons)
    function syncSkins() {
      $$('[data-act="skin"]', os).forEach(b => b.setAttribute("aria-pressed", String(b.dataset.skin === prefs.skin())));
      const t = $('[data-act="theme"]', os); if (t) t.checked = prefs.isDark();
    }
    document.addEventListener("mad:skin", syncSkins);

    os.addEventListener("click", e => {
      const ic = e.target.closest(".ic");
      if (ic) { const a = APPS[ic.dataset.app]; if (!a.external && !a.page) { e.preventDefault(); launch(ic.dataset.app, ic); } return; }
      if (e.target.closest(".lk-unlock")) unlock();
      if (e.target.closest("[data-back]")) pop();
      const ev = e.target.closest("[data-ev]");
      if (ev) { const pg = eventPage(ev.dataset.ev); if (pg) push(pg); }
      const ph = e.target.closest("[data-photo]");
      if (ph) viewPhoto(ph);
      const act = e.target.closest("[data-act]");
      if (act && (act.tagName !== "INPUT" || e.type === "click")) { if (act.tagName === "INPUT" || act.tagName === "BUTTON") action(act.dataset.act, act); }
    });

    // gestures: tap or swipe up on the home bar to go home, swipe up on the lock screen, swipe from the left edge to go back
    const ind = $(".os-ind", os);
    let sy = 0, dragging = false;
    ind.addEventListener("click", () => (current ? home() : os.dataset.screen === "lock" && unlock()));
    ind.addEventListener("pointerdown", e => { sy = e.clientY; dragging = true; ind.setPointerCapture(e.pointerId); });
    ind.addEventListener("pointermove", e => {
      if (!dragging || !current) return;
      const dy = Math.min(0, e.clientY - sy), p = Math.min(1, -dy / 160);
      app.style.transform = `translateY(${dy * 0.5}px) scale(${1 - p * 0.18})`;
    });
    const end = e => { if (!dragging) return; dragging = false; if (current && e.clientY - sy < -40) home(); else app.style.transform = ""; };
    ind.addEventListener("pointerup", end); ind.addEventListener("pointercancel", end);
    const lock = $(".os-lock", os);
    let ly = 0;
    lock.addEventListener("pointerdown", e => { ly = e.clientY; });
    lock.addEventListener("pointerup", e => { if (ly - e.clientY > 30) unlock(); });
    let ex = 0, edge = false, swiping = false;
    stack.addEventListener("pointerdown", e => { const r = stack.getBoundingClientRect(); edge = e.clientX - r.left < 22 && stack.children.length > 1 && !navBusy && !e.target.closest("button, a, input, label"); swiping = false; ex = e.clientX; });
    stack.addEventListener("pointermove", e => { if (!edge) return; const dx = Math.max(0, e.clientX - ex); if (!swiping && dx < 10) return; swiping = true; const top = stack.lastElementChild; if (top) top.style.transform = `translateX(${dx}px)`; });
    const endSwipe = e => { if (!edge) return; edge = false; const top = stack.lastElementChild; if (swiping && e.type === "pointerup" && e.clientX - ex > 70) pop(); else if (top) top.style.transform = ""; swiping = false; };
    stack.addEventListener("pointerup", endSwipe); stack.addEventListener("pointercancel", endSwipe);

    // ---------- full screen: the OS leaves the mockup and takes over the visitor's own screen ----------
    const full = (() => {
      const d = document.createElement("dialog");
      d.className = "os-full"; d.setAttribute("aria-label", "MAD OS full screen");
      d.innerHTML = `<div class="os-full-screen"><span class="phone-island"></span></div><button type="button" class="os-full-close">Exit full screen</button>`;
      document.body.append(d);
      const host = $(".os-full-screen", d);
      const restore = () => { if (os.parentElement === host) screen.append(os); document.documentElement.style.overflow = ""; };
      const api = {
        async open() {
          if (d.open || !live) return;
          const from = screen.getBoundingClientRect();
          d.showModal(); document.documentElement.style.overflow = "hidden";
          host.append(os);
          const to = host.getBoundingClientRect();
          if (motion()) await host.animate([{ transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) translate(-50%, -50%) scale(${from.width / to.width}, ${from.height / to.height})`, transformOrigin: "0 0" }, { transform: "translate(-50%, -50%)", transformOrigin: "0 0" }], { duration: 560, easing: "cubic-bezier(.2,.9,.2,1)" }).finished.catch(() => {});
          ind.focus();
        },
        async close() {
          if (!d.open) return;
          const to = screen.getBoundingClientRect(), from = host.getBoundingClientRect();
          if (motion() && to.width) await host.animate([{ transform: "translate(-50%, -50%)" }, { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) translate(-50%, -50%) scale(${to.width / from.width}, ${to.height / from.height})`, transformOrigin: "0 0" }], { duration: 460, easing: "cubic-bezier(.4,0,.2,1)" }).finished.catch(() => {});
          restore(); d.close();
        }
      };
      $(".os-full-close", d).onclick = () => api.close();
      d.addEventListener("cancel", e => { e.preventDefault(); api.close(); });
      return api;
    })();

    // ---------- the stage: drag beside the phone to turn it ----------
    let drag = null;
    stage.addEventListener("pointerdown", e => {
      if (stage.dataset.state !== "live" || e.target.closest(".phone-screen") || e.button > 0) return;
      drag = { x: e.clientX, y: e.clientY }; stage.setPointerCapture(e.pointerId); stage.classList.add("grabbing");
    });
    stage.addEventListener("pointermove", e => {
      if (!drag) return;
      rig.style.setProperty("--dry", Math.max(-35, Math.min(35, (e.clientX - drag.x) * 0.25)) + "deg");
      rig.style.setProperty("--drx", Math.max(-20, Math.min(20, (drag.y - e.clientY) * 0.15)) + "deg");
    });
    const drop = () => { if (!drag) return; drag = null; stage.classList.remove("grabbing"); rig.style.setProperty("--dry", "0deg"); rig.style.setProperty("--drx", "0deg"); };
    stage.addEventListener("pointerup", drop); stage.addEventListener("pointercancel", drop);

    // ---------- the panel ----------
    btn?.addEventListener("click", () => { const s = stage.dataset.state; if (s === "idle" || s === "live") { full.close(); reset(); setTimeout(build, 120); } else finish(); });
    $("#build-full")?.addEventListener("click", () => full.open());
    $("#build-reset")?.addEventListener("click", () => { full.close(); reset(); });
    tipBtn?.addEventListener("click", () => {
      const r = phone.getBoundingClientRect();
      if (r.top < 0 || r.bottom > innerHeight) scrollTo({ top: scrollY + r.top - Math.max(70, (innerHeight - r.height) / 2), behavior: motion() ? "smooth" : "auto" });
      launch("settings");
    });

    reset();
    // build as soon as the stage is on screen (instantly when animations are off)
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); setTimeout(build, motion() ? 450 : 0); } }, { threshold: 0.35 });
    io.observe(stage);
    return { build, reset, launch, home, full };
  }

  window.MADPhone = { mount };
})();
