// MAD Club site renderer: every page is built from content/*.json (edited via /admin).
addEventListener("error", e => { document.documentElement.dataset.jsError = String(e.message || e.error).slice(0, 200); });
addEventListener("unhandledrejection", e => { document.documentElement.dataset.jsError = String(e.reason && e.reason.message || e.reason).slice(0, 200); });
document.addEventListener("securitypolicyviolation", e => { document.documentElement.dataset.cspViolation = e.violatedDirective; });
// The WordPress theme ships this same file and injects window.MAD_WP = { content, urls, base }; the static site leaves it unset.
const WP = window.MAD_WP || null;
const FILES = { home: "index.html", events: "events.html", event: "event.html", about: "about.html", achievements: "achievements.html", team: "team.html", contact: "contact.html", chat: "chat.html" };
const U = (k, q) => { const b = WP ? WP.urls[k] : FILES[k], s = q ? new URLSearchParams(q).toString() : ""; return s ? b + (b.includes("?") ? "&" : "?") + s : b; };
const NAV = [["home","Home"],["events","Events"],["about","About"],["achievements","Achievements"],["team","Team"],["contact","Contact"]];
const SKINS = [["nebula","Nebula"],["ocean","Ocean"],["aurora","Aurora"],["solar","Solar"]];
const skinOk = k => SKINS.some(s => s[0] === k) ? k : "nebula";
const root = document.documentElement;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
// Drafts saved by /admin/ (testing editor) live in localStorage and override the published JSON in that browser only.
const cache = new Map();
const load = n => { if (!cache.has(n)) cache.set(n, loadRaw(n)); return cache.get(n); };
const loadRaw = n => {
  if (WP) return Promise.resolve(WP.content[n]);
  try { const d = localStorage.getItem("mad_content_" + n); if (d) return Promise.resolve(JSON.parse(d)); } catch {}
  return fetch(`content/${n}.json`).then(r => { if (!r.ok) throw new Error(n); return r.json(); });
};
const NOPHOTOS = () => "No photos yet." + (draftKeys().length ? " Add them in the admin panel under Events." : "");
const draftKeys = () => { if (WP) return []; try { return Object.keys(localStorage).filter(k => k.startsWith("mad_content_")); } catch { return []; } };
// Photo paths from the CMS may be root-absolute (/photos/x.jpg); pages live at the site root, so make them relative.
const photoSrc = p => /^(data:|https?:|\/\/)/i.test(p) ? p : (WP ? WP.base : "") + String(p).replace(/^\/+/, "");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const page = document.body.dataset.page;
const navKey = page === "event" ? "events" : page;
const idx = i => String(i + 1).padStart(2, "0");
const initials = n => String(n).trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("");
const ARROW = `<svg class="arr" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
// Orders semesters chronologically: year prefix, then Odd (1) before Even (2); unknown formats sort last.
const semKey = s => { const m = String(s).match(/^(\d\d)-(\d\d) (Odd|Even)/); return m ? +m[1] * 10 + (m[3] === "Even" ? 2 : 1) : -1; };
const semYear = s => (s.match(/^\d\d-\d\d/) || [""])[0];

root.classList.add("js");
try { root.dataset.skin = skinOk(new URLSearchParams(location.search).get("skin") || localStorage.getItem("skin")); } catch { root.dataset.skin = "nebula"; }

// Keep the browser UI colour (mobile address bar) in step with the active skin's background.
function syncTheme() {
  const c = getComputedStyle(root).getPropertyValue("--bg").trim(), m = $('meta[name="theme-color"]');
  if (c && m) m.content = c;
}
function shell(site, events) {
  const years = [...new Set(events.map(e => semYear(e.semester)).filter(Boolean))].sort().reverse();
  document.body.insertAdjacentHTML("afterbegin", `<a class="skip" href="#main">Skip to content</a><div class="progress" id="progress"></div>
<header class="nav"><div class="wrap"><a class="brand" href="${esc(U("home"))}"><i class="mark"></i>${esc(site.name)}<small>${esc(site.college_short)}</small></a>
<nav class="links" id="links" aria-label="Main">${NAV.map(([k,t])=>`<a href="${esc(U(k))}"${k===navKey?' aria-current="page"':""}>${t}</a>`).join("")}</nav>
<button class="kbtn" id="open-pal" type="button" aria-label="Open command menu">Search <kbd>Ctrl K</kbd></button>
<div class="skins" role="group" aria-label="Site style">${SKINS.map(([k,t])=>`<button type="button" data-skin="${k}" aria-pressed="${root.dataset.skin===k}" aria-label="${t} style" title="${t} style"><i></i></button>`).join("")}</div>
<button class="burger" id="burger" type="button" aria-expanded="false" aria-controls="links">Menu</button></div></header>`);
  document.body.insertAdjacentHTML("beforeend", `<footer><div class="wrap"><div class="cols"><div><p class="foot-brand">${esc(site.full_name)}</p><p>${esc(site.college)} (${esc(site.college_short)}). Est. ${esc(site.established)}.</p><p><a class="ul" href="${esc(site.instagram)}">${esc(site.instagram_handle)} on Instagram</a></p></div>
<ul><li><b>Explore</b></li>${NAV.map(([k,t])=>`<li><a href="${esc(U(k))}">${t}</a></li>`).join("")}</ul>
<ul><li><b>Event archives</b></li>${years.map(y => `<li><a href="${esc(U("events", { y }))}">20${y.replace("-", "-20")}</a></li>`).join("")}</ul></div>
<p class="mega" aria-hidden="true">${esc(site.name)}</p>
<p class="legal"><span>&copy; ${new Date().getFullYear()} ${esc(site.full_name)}, ${esc(site.college_short)}</span><span>${esc(site.tagline)}</span></p></div></footer>`);
  const dk = draftKeys().map(k => k.slice(12));
  if (dk.length) {
    document.body.insertAdjacentHTML("afterbegin", `<div class="draft-banner" role="status">You are viewing unpublished drafts from the admin editor in this browser: ${esc(dk.join(", "))}. <button type="button" id="discard-drafts">Discard drafts</button> <a href="admin/">Open editor</a></div>`);
    $("#discard-drafts").onclick = () => { draftKeys().forEach(k => { try { localStorage.removeItem(k); } catch {} }); location.reload(); };
  }
  const links = $("#links"), burger = $("#burger"), hdr = $("header.nav");
  const setMenu = o => { links.classList.toggle("open", o); burger.setAttribute("aria-expanded", o); burger.textContent = o ? "Close" : "Menu"; };
  burger.onclick = () => setMenu(!links.classList.contains("open"));
  links.onclick = e => e.target.closest("a") && setMenu(false);
  document.addEventListener("keydown", e => { if (e.key === "Escape") { setMenu(false); } });
  $$(".skins button").forEach(b => b.onclick = () => setSkin(b.dataset.skin));
  const bar = $("#progress");
  // Scroll: progress bar, header state, and a velocity value the marquee and photo reel lean into.
  let ly = scrollY, vel = 0, raf = 0;
  const ease = () => { vel *= .88; root.style.setProperty("--vel", vel.toFixed(2)); raf = Math.abs(vel) > .05 ? requestAnimationFrame(ease) : 0; if (!raf) root.style.setProperty("--vel", "0"); };
  addEventListener("scroll", () => {
    bar.style.transform = `scaleX(${scrollY / Math.max(1, document.body.scrollHeight - innerHeight)})`;
    hdr.classList.toggle("scrolled", scrollY > 12);
    if (!reduced) { vel = Math.max(-24, Math.min(24, scrollY - ly)); if (!raf) raf = requestAnimationFrame(ease); }
    ly = scrollY;
  }, {passive:true});
}

function activate() {
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), {threshold:.12});
  $$(".reveal").forEach(el => io.observe(el));
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    const m = e.target.textContent.match(/^(\d+)(.*)$/); if (!m || reduced) return;
    const end = +m[1], t0 = performance.now();
    const tick = t => { const p = Math.min(1, (t - t0) / 1100); e.target.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + m[2]; if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }), {threshold:.6});
  $$("[data-count]").forEach(el => cio.observe(el));
}

const setMeta = (sel, attr, key, val) => { let m = $(sel); if (!m) { m = document.createElement("meta"); m.setAttribute(attr, key); document.head.append(m); } m.setAttribute("content", val); };
const head = (eyebrow, title, lead) => `<div class="page-head wrap"><p class="eyebrow">${esc(eyebrow)}</p><h1 class="reveal">${esc(title)}</h1>${lead ? `<p class="lead reveal">${esc(lead)}</p>` : ""}</div>`;
const thumb = e => { const p = (e.photos || [])[0]; return `<span class="thumb" data-l="${esc(initials(e.name))}">${p ? `<img loading="lazy" decoding="async" src="${esc(photoSrc(p))}" alt="">` : ""}</span>`; };
const eventRow = (e, i) => `<a class="row reveal" href="${esc(U("event", { e: e.slug }))}"><span class="idx">${idx(i)}</span>${thumb(e)}<span class="row-main"><b>${esc(e.name)}</b><span>${esc(e.description)}</span></span><span class="tag">${esc(e.semester)}${(e.photos || []).length ? ` · ${(e.photos || []).length} photo${e.photos.length === 1 ? "" : "s"}` : ""}</span>${ARROW}</a>`;
const stat = s => `<div class="stat reveal"><b data-count>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`;
const card = (t, p, i) => `<div class="card reveal"><span class="idx">${idx(i)}</span><h3>${esc(t)}</h3><p>${esc(p)}</p></div>`;
const shot = (p, alt) => `<button type="button" class="shot" data-src="${esc(photoSrc(p))}"><img loading="lazy" decoding="async" src="${esc(photoSrc(p))}" alt="${esc(alt)}"></button>`;

// Hero phone: a story player (tap sides, auto-advance) over the real event photos.
function stories(site, events) {
  const withPh = events.filter(e => (e.photos || []).length);
  const evs = (withPh.length ? withPh : events).slice(0, 6);
  if (!evs.length) return "";
  window.__st = evs;
  const words = site.tagline.split(/[^A-Za-z0-9]+/).filter(Boolean).join(" \u00b7 ").toUpperCase() + " \u00b7 ";
  return `<div class="stage"><div class="phone" role="group" aria-label="Event stories"><span class="island"></span><div class="screen" id="st">
${evs.map((e, i) => `<div class="st-slide${i ? "" : " on"}">${(e.photos || []).length ? `<img alt="" data-src="${esc(photoSrc(e.photos[0]))}">` : ""}<span class="st-type">${esc(e.name)}</span></div>`).join("")}
<div class="st-bars">${evs.map(() => `<i><b></b></i>`).join("")}</div>
<p class="st-head"><span class="st-av">${esc(site.name[0] || "M")}</span><b>${esc(site.instagram_handle.replace(/^@/, ""))}</b><span id="st-sem"></span></p>
<button type="button" class="st-nav prev" aria-label="Previous event"></button><button type="button" class="st-nav next" aria-label="Next event"></button>
<div class="st-cap"><b id="st-name"></b><span id="st-desc"></span><a class="st-open" id="st-open" href="${esc(U("events"))}">Open event ${ARROW}</a></div>
</div></div>
<svg class="badge" viewBox="0 0 120 120" aria-hidden="true"><defs><path id="badge-p" d="M60 60m-45 0a45 45 0 1 1 90 0a45 45 0 1 1-90 0"/></defs><circle cx="60" cy="60" r="60"/><g class="spin"><text><textPath href="#badge-p" textLength="278">${esc(words + words)}</textPath></text></g><text class="badge-m" x="60" y="69" text-anchor="middle">${esc(site.name.split(" ")[0])}</text></svg>
<pre class="code" aria-hidden="true"><span class="c1">class</span> <span class="c2">MadClub</span> <span class="c1">extends</span> StatelessWidget {
  <span class="c3">Widget</span> build(context) =&gt;
    <span class="c2">Text</span>(<span class="c4">'Code. Fun. Repeat.'</span>);
}</pre></div>`;
}
// Two rows of real event photos drifting in opposite directions; each photo opens its event.
function reel(events) {
  const items = events.flatMap(e => { const p = e.photos || []; return (p.length > 1 ? p.slice(1, 4) : p).map(src => ({ src, e })); });
  if (items.length < 4) return "";
  const half = Math.ceil(items.length / 2), rows = [items.slice(0, half), items.slice(half)];
  const cell = (x, dup) => `<a class="reel-i" href="${esc(U("event", { e: x.e.slug }))}"${dup ? ' tabindex="-1" aria-hidden="true"' : ""}><img loading="lazy" decoding="async" src="${esc(photoSrc(x.src))}" alt="${dup ? "" : esc(x.e.name)}"><span>${esc(x.e.name)}</span></a>`;
  return `<div class="reel">${rows.map((r, n) => `<div class="reel-row${n ? " rev" : ""}"><div class="reel-track">${r.map(x => cell(x)).join("")}${r.map(x => cell(x, true)).join("")}</div></div>`).join("")}</div>`;
}

const pages = {
  async home(site) {
    const { events } = await load("events");
    const flags = events.filter(e => e.flagship);
    const hw = site.hero_title.split(" "), cutAt = hw.findIndex(w => /[.!?]$/.test(w));
    const split = cutAt >= 0 && cutAt < hw.length - 1;
    const pp = events.flatMap(e => (e.photos || []).slice(2, 3))[0] || events.flatMap(e => e.photos || [])[0];
    const pill = pp ? ` <span class="pill w" style="--i:${cutAt + 1}"><img src="${esc(photoSrc(pp))}" alt=""></span>` : "";
    const words = hw.map((w, i) => `<span class="w${split && i > cutAt ? " w2" : ""}" style="--i:${i + (split && i > cutAt ? 1 : 0)}">${esc(w)}</span>${split && i === cutAt ? pill : ""}`).join(" ");
    const marquee = [...events, ...events].map(e => `<span>${esc(e.name)}</span>`).join("");
    const an = site.announcement || {}, anText = String(an.text || "").trim(), anLink = String(an.link || "").trim();
    const anKey = WP && Object.keys(FILES).find(k => FILES[k] === anLink.split(/[?#]/)[0]);
    const anHref = anKey ? U(anKey, anLink.includes("?") ? anLink.split("?")[1].split("#")[0] : "") : anLink;
    const announce = anText ? `<div class="wrap announce-w"><p class="announce" role="note"><i aria-hidden="true"></i><span>${esc(anText)}</span>${/^(https:\/\/|[\w-]+\.html)/.test(anLink) ? ` <a href="${esc(anHref)}">${esc(an.link_label || "Details")} ${ARROW}</a>` : ""}</p></div>` : "";
    const rl = reel(events);
    return announce + `<section class="hero"><div class="wrap hero-in"><div class="hero-copy"><p class="tagline">&gt; ${esc(site.tagline)}<i class="caret">_</i></p><h1 class="split">${words}</h1><p class="lead">${esc(site.hero_lead)}</p>
<p class="hero-cta"><a class="btn primary" href="${esc(U("contact"))}">Join the club ${ARROW}</a><a class="btn" href="${esc(U("events"))}">See our events</a></p></div>${stories(site, events)}</div></section>
<div class="marquee" aria-hidden="true"><div class="track">${marquee}</div></div>
<section class="wrap"><div class="stats">${site.stats.map(stat).join("")}</div></section>
<section class="wrap"><p class="eyebrow">What makes us tick</p><div class="big-list">${site.highlights.map((h, i) => `<div class="big reveal"><span class="idx">${idx(i)}</span><h2>${esc(h.title)}</h2><p>${esc(h.text)}</p></div>`).join("")}</div></section>
${rl ? `<section class="reel-sec"><div class="wrap sec-head"><div><p class="eyebrow">Seen at our events</p><h2>Real rooms. Real people. Real builds.</h2></div><a class="btn" href="${esc(U("events"))}">Browse events</a></div>${rl}</section>` : ""}
<section class="wrap"><div class="sec-head"><div><p class="eyebrow">Flagship events</p><h2>Open to every student, every semester.</h2></div><a class="btn" href="${esc(U("events"))}">All events</a></div><div class="rows">${flags.map(eventRow).join("")}</div></section>
<section class="wrap"><p class="eyebrow">${esc(site.why_title)}</p><h2 class="why-h">${esc(site.why_lead)}</h2><div class="grid why">${site.why.map((w, i) => card(w.title, w.text, i)).join("")}</div></section>
<section class="wrap"><div class="cta reveal"><p class="eyebrow">${esc(site.tagline)}</p><h2>${esc(site.cta_title)}</h2><p class="lead">${esc(site.cta_text)}</p><p><a class="btn primary" href="${esc(U("contact"))}">Register now ${ARROW}</a><a class="btn" href="${esc(site.instagram)}">${esc(site.instagram_handle)}</a></p></div></section>`;
  },

  async events() {
    const { events } = await load("events");
    const years = [...new Set(events.map(e => semYear(e.semester)))].sort().reverse();
    const qp = new URLSearchParams(location.search), y0 = qp.get("y");
    window.__ev = { events, y: years.includes(y0) ? y0 : "all", q: qp.get("q") || "" };
    return head("Events", "Everything we have run.", "Search every event, newest first. Open one for its photos.") +
      `<div class="wrap tools"><label class="search"><span class="sr">Search events</span><input id="q" type="search" placeholder="Search events, e.g. hack, UI, git" autocomplete="off"></label>
<div class="chips" id="chips"><button type="button" class="chip" data-y="all">All</button>${years.map(y => `<button type="button" class="chip" data-y="${y}">20${y.replace("-", "-20")}</button>`).join("")}</div><p class="count" id="count" aria-live="polite"></p></div>
<div class="wrap" id="evlist"></div>`;
  },

  async event() {
    const { events } = await load("events");
    const e = events.find(x => x.slug === new URLSearchParams(location.search).get("e"));
    if (!e) { document.title = "Event not found | MAD Club"; setMeta('meta[name=robots]', "name", "robots", "noindex"); return head("Events", "Event not found") + `<div class="wrap"><p class="back"><a class="btn" href="${esc(U("events"))}">All events</a></p></div>`; }
    document.title = `${e.name} | MAD Club`;
    setMeta('meta[name=description]', "name", "description", e.description);
    setMeta('meta[property="og:title"]', "property", "og:title", `${e.name} | MAD Club`);
    setMeta('meta[property="og:description"]', "property", "og:description", e.description);
    const ph = e.photos || [];
    const ord = [...events].sort((x, y) => semKey(y.semester) - semKey(x.semester)), i = ord.indexOf(e);
    const lk = (ev, t) => ev ? `<a class="next-ev" href="${esc(U("event", { e: ev.slug }))}"><small>${t} event</small><b>${esc(ev.name)}</b>${thumb(ev)}</a>` : "";
    const evNav = ord.length > 1 ? `<nav class="back" aria-label="More events">${lk(ord[i + 1], "Older")}${lk(ord[i - 1], "Newer")}</nav>` : "";
    return head(`${e.semester}${e.flagship ? " \u00b7 Flagship" : ""}${ph.length ? ` \u00b7 ${ph.length} photo${ph.length === 1 ? "" : "s"}` : ""}`, e.name, e.description) + `<div class="wrap">${ph.length ? `<div class="gallery">${ph.map((p, i) => shot(p, `${e.name}, photo ${i + 1}`)).join("")}</div>` : `<div class="empty">${NOPHOTOS()}</div>`}
<p class="back"><a class="btn" href="${esc(U("events"))}">All events</a> <button type="button" class="btn" id="share">Share</button> <span class="sr" id="share-msg" aria-live="polite"></span></p>${evNav}</div>`;
  },

  async about(site) {
    const a = site.about, { events } = await load("events");
    return head("About us", site.full_name, `${site.college}. Established ${site.established}.`) +
      `<div class="wrap"><div class="grid">${[["Who we are", a.who], ["Our objective", a.objective], ["Outcomes", a.outcomes]].map(([t, p], i) => card(t, p, i)).join("")}</div></div>
${reel(events)}
<div class="wrap"><h2 class="sem">What we do</h2><div class="big-list">${a.functions.map((f, i) => `<div class="big reveal"><span class="idx">${idx(i)}</span><h2>${esc(f.title)}</h2><p>${esc(f.text)}</p></div>`).join("")}</div>
${(site.college_page || "").trim() ? `<p class="lead"><a class="ul" href="${esc(site.college_page.trim())}">Club page on the NHCE website</a></p>` : ""}<p class="back"><a class="btn primary" href="${esc(U("contact"))}">Join us ${ARROW}</a></p></div>`;
  },

  async achievements() {
    const a = await load("achievements"), { events } = await load("events");
    return head("Achievements", "What we have shipped.") +
      `<div class="wrap"><div class="stats">${a.stats.map(stat).join("")}</div>
<h2 class="sem">Flagship events</h2><div class="rows">${events.filter(e => e.flagship).map(eventRow).join("")}</div>
<h2 class="sem">Apps built by members</h2><div class="grid apps">${a.apps.map((p, i) => card(p.name, p.text, i)).join("")}</div></div>`;
  },

  async team() {
    const t = await load("team");
    const grp = r => /program/i.test(r) ? "Program" : /project/i.test(r) ? "Project" : /marketing/i.test(r) ? "Marketing" : /review/i.test(r) ? "Review" : "Leadership";
    const person = (p, sub, g) => `<div class="card person reveal" data-g="${g}"><div class="avatar">${esc(initials(p.name))}${p.photo ? `<img loading="lazy" decoding="async" src="${esc(photoSrc(p.photo))}" alt="">` : ""}</div><b>${esc(p.name)}</b><small>${esc(sub)}</small></div>`;
    const groups = ["Leadership", "Program", "Project", "Marketing", "Review"];
    return head("The team", "The people behind MAD.") +
      `<div class="wrap tools"><div class="chips" id="tchips"><button type="button" class="chip" data-g="all" aria-pressed="true">All</button>${groups.map(g => `<button type="button" class="chip" data-g="${g}" aria-pressed="false">${g}</button>`).join("")}</div></div>
<div class="wrap"><h2 class="sem">Core team ${esc(t.current_year)}</h2><div class="grid people" id="tgrid">${t.current.map(p => person(p, p.role, grp(p.role))).join("")}</div>
<h2 class="sem">Earlier teams</h2><div class="grid people">${t.earlier.map(p => person(p, `${p.role}, ${p.year}`, "all")).join("")}</div>
${(t.galleries || []).map(g => `<h2 class="sem">${esc(g.label)}</h2><div class="gallery faces">${g.photos.map((p, i) => shot(p, `${g.label}, photo ${i + 1}`)).join("")}</div>`).join("")}</div>`;
  },

  // Full-page assistant (ChatGPT-style). The markup is static; wireChatPage() drives it.
  async chat(site) {
    if (!String(site.chat?.endpoint || "").trim())
      return head("Assistant", "The assistant is not switched on yet.", "Until it is, the quickest way to get an answer is Instagram.") + `<div class="wrap"><a class="btn primary" href="${esc(site.instagram)}">${esc(site.instagram_handle)} on Instagram ${ARROW}</a></div>`;
    return `<div class="gpt" id="gpt"><aside class="gpt-side" id="gpt-side" aria-label="Your chats">
<button type="button" class="gpt-new" id="gpt-new"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>New chat</button>
<p class="gpt-cap">Recent</p><ul id="gpt-list"></ul><p class="gpt-foot">Chats are saved in this browser only.</p></aside>
<div class="gpt-shade" id="gpt-shade" hidden></div>
<section class="gpt-main"><div class="gpt-top"><button type="button" class="gpt-ic" id="gpt-menu" aria-expanded="false" aria-controls="gpt-side">Chats</button><h1>${esc(site.name)} assistant</h1><button type="button" class="gpt-ic" id="gpt-new2">New chat</button></div>
<div class="gpt-scroll" id="gpt-scroll"><div class="gpt-col" id="gpt-log" role="log" aria-live="polite"></div></div>
<form class="gpt-form" id="gpt-form"><div class="gpt-box"><textarea id="gpt-q" rows="1" maxlength="500" placeholder="Ask anything about ${esc(site.name)}" aria-label="Your question"></textarea>
<button type="submit" id="gpt-send" aria-label="Send" disabled><svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M12 19V5M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button></div>
<p class="gpt-note">Answers come only from this website and can still be wrong. For anything important, ask on <a href="${esc(site.instagram)}">${esc(site.instagram_handle)}</a>.</p></form></section></div>`;
  },
  async notfound() {
    return head("404", "Page not found.", "That page does not exist.") + `<div class="wrap"><p class="back"><a class="btn primary" href="${esc(U("home"))}">Home</a><a class="btn" href="${esc(U("events"))}">Events</a></p></div>`;
  },

  async contact(site) {
    const c = site.contact, ep = (c.form_endpoint || "").trim(), em = (c.email || "").trim(), ph = (c.phone || "").trim(), cp = (site.college_page || "").trim();
    const form = ep ? `<form action="${esc(ep)}" method="POST" class="form" data-ajax><input class="sr" name="_gotcha" tabindex="-1" autocomplete="off" aria-hidden="true"><label>Name<input name="name" autocomplete="name" required></label><label>Email<input name="email" type="email" autocomplete="email" required></label><label>Why do you want to join?<textarea name="message" rows="4"></textarea></label><button class="btn primary" type="submit">Send</button></form>`
      : `<div class="empty">Online registration opens soon. Message us on <a href="${esc(site.instagram)}">${esc(site.instagram_handle)}</a>${em ? ` or email <a href="mailto:${esc(em)}">${esc(em)}</a>` : ""} to join.</div>`;
    return head("Contact us", "Join MAD Club.", "New members are welcome every semester.") +
      `<div class="wrap"><div class="grid contact"><div class="card"><h3>Instagram</h3><p><a class="ul" href="${esc(site.instagram)}">${esc(site.instagram_handle)}</a></p></div><div class="card"><h3>Coordinators</h3><p>${esc(c.coordinators)}</p></div>${em ? `<div class="card"><h3>Email</h3><p><a href="mailto:${esc(em)}">${esc(em)}</a></p></div>` : ""}${ph ? `<div class="card"><h3>Phone</h3><p><a href="tel:${esc(ph.replace(/\s+/g, ""))}">${esc(ph)}</a></p></div>` : ""}<div class="card"><h3>Where</h3><p>${esc(site.college)}${cp ? `<br><a href="${esc(cp)}">Club page on the NHCE website</a>` : ""}</p></div></div>
<h2 class="sem">Register interest</h2>${form}</div>`;
  }
};

// ---------- interactivity ----------
function wireContactForm(site) {
  const f = $("form[data-ajax]"); if (!f) return;
  const btn = f.querySelector("button[type=submit]"), label = btn.textContent;
  f.addEventListener("submit", async e => {
    e.preventDefault();
    f.querySelector(".form-err")?.remove();
    btn.disabled = true; btn.textContent = "Sending...";
    try {
      const res = await fetch(f.action, { method: "POST", body: new FormData(f), headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(res.status);
      const em = esc(f.elements.email.value);
      f.outerHTML = `<div class="empty" role="status">Thanks, we will get back to you on ${em}.</div>`;
    } catch {
      btn.disabled = false; btn.textContent = label;
      f.insertAdjacentHTML("beforeend", `<p class="form-err" role="alert">Could not send. Try again or message us on <a href="${esc(site.instagram)}">${esc(site.instagram_handle)}</a>.</p>`);
    }
  });
}
function setSkin(k) {
  root.dataset.skin = k;
  try { localStorage.setItem("skin", k); } catch {}
  $$(".skins button").forEach(x => x.setAttribute("aria-pressed", x.dataset.skin === k));
  syncTheme();
}
function wirePalette(site, events) {
  const d = document.createElement("dialog");
  d.className = "pal"; d.setAttribute("aria-label", "Command menu");
  d.innerHTML = `<input id="pal-q" type="text" role="combobox" aria-expanded="true" aria-controls="pal-l" aria-autocomplete="list" placeholder="Jump to a page, event or style..." aria-label="Command menu" autocomplete="off"><ul id="pal-l" role="listbox"></ul><p class="pal-hint"><kbd>Up</kbd> <kbd>Down</kbd> to move, <kbd>Enter</kbd> to go, <kbd>Esc</kbd> to close</p>`;
  document.body.append(d);
  const items = [
    ...NAV.map(([k, t]) => ({ g: "Page", t, run: () => { location.href = U(k); } })),
    ...[...events].sort((a, b) => semKey(b.semester) - semKey(a.semester)).map(e => ({ g: "Event", t: e.name, s: e.semester, run: () => { location.href = U("event", { e: e.slug }); } })),
    ...SKINS.map(([k, t]) => ({ g: "Style", t: t + " style", run: () => setSkin(k) })),
    { g: "Link", t: "Instagram " + site.instagram_handle, run: () => open(site.instagram, "_blank", "noopener") }
  ];
  const q = $("#pal-q", d), l = $("#pal-l", d);
  let sel = 0, shown = [];
  const draw = () => {
    const v = q.value.trim().toLowerCase();
    shown = items.filter(i => !v || (i.t + " " + (i.s || "") + " " + i.g).toLowerCase().includes(v)).slice(0, 9);
    sel = Math.min(sel, Math.max(0, shown.length - 1));
    l.innerHTML = shown.map((i, n) => `<li role="option" id="pal-o${n}" aria-selected="${n === sel}" data-n="${n}"><span>${esc(i.t)}${i.s ? ` <em>${esc(i.s)}</em>` : ""}</span><kbd>${i.g}</kbd></li>`).join("") || `<li class="none">No matches</li>`;
    q.setAttribute("aria-activedescendant", shown.length ? "pal-o" + sel : "");
  };
  const go = n => { const it = shown[n]; if (!it) return; d.close(); it.run(); };
  q.oninput = () => { sel = 0; draw(); };
  q.onkeydown = e => {
    if (e.key === "ArrowDown") { sel = (sel + 1) % Math.max(1, shown.length); draw(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { sel = (sel - 1 + shown.length) % Math.max(1, shown.length); draw(); e.preventDefault(); }
    else if (e.key === "Enter") go(sel);
  };
  l.onclick = e => { const li = e.target.closest("li[data-n]"); if (li) go(+li.dataset.n); };
  d.addEventListener("click", e => { if (e.target === d) d.close(); });
  let opener = null;
  d.addEventListener("close", () => { if (opener?.isConnected) opener.focus(); });
  const openP = () => { opener = document.activeElement; q.value = ""; sel = 0; draw(); d.showModal(); q.focus(); };
  $("#open-pal").onclick = openP;
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); if (d.open) d.close(); else openP(); }
    else if (e.key === "/" && !/input|textarea/i.test(document.activeElement.tagName) && !d.open) { e.preventDefault(); const eq = $("#q"); if (eq) eq.focus(); else openP(); }
  });
}
function wireMotion() {
  if (reduced || !matchMedia("(pointer: fine)").matches) return;
  // card tilt, magnetic buttons, phone parallax
  document.addEventListener("pointermove", e => {
    const c = e.target.closest?.(".card:not(.person)");
    if (c) { const r = c.getBoundingClientRect(); c.style.setProperty("--ry", ((e.clientX - r.left) / r.width - .5) * 8 + "deg"); c.style.setProperty("--rx", (.5 - (e.clientY - r.top) / r.height) * 8 + "deg"); }
    const b = e.target.closest?.(".btn");
    if (b) { const r = b.getBoundingClientRect(); b.style.setProperty("--tx", (e.clientX - r.left - r.width / 2) * .18 + "px"); b.style.setProperty("--ty", (e.clientY - r.top - r.height / 2) * .28 + "px"); }
    const st = $(".stage");
    if (st) { const r = st.getBoundingClientRect(); st.style.setProperty("--px", ((e.clientX - r.left) / r.width - .5).toFixed(3)); st.style.setProperty("--py", ((e.clientY - r.top) / r.height - .5).toFixed(3)); }
  }, {passive:true});
  document.addEventListener("pointerout", e => {
    const c = e.target.closest?.(".card, .stat, .btn");
    if (c && !c.contains(e.relatedTarget)) ["--rx", "--ry", "--tx", "--ty"].forEach(v => c.style.removeProperty(v));
  });
}
// Floating dock: quick nav, search and style, always reachable (important on phones).
function wireDock() {
  const quick = [["home", "Home"], ["events", "Events"], ["team", "Team"], ["contact", "Join"]];
  const d = document.createElement("nav");
  d.className = "dock"; d.setAttribute("aria-label", "Quick navigation");
  d.innerHTML = quick.map(([k, t]) => `<a href="${esc(U(k))}"${k === navKey ? ' aria-current="page"' : ""}>${t}</a>`).join("") +
    `<span class="sep"></span><button type="button" id="dock-s" aria-label="Open command menu">Search</button><button type="button" id="dock-k" aria-label="Change site style">Style</button>`;
  document.body.append(d);
  $("#dock-s").onclick = () => $("#open-pal").click();
  $("#dock-k").onclick = () => { const k = SKINS.map(s => s[0]); setSkin(k[(k.indexOf(root.dataset.skin) + 1) % k.length]); };
  let last = scrollY;
  addEventListener("scroll", () => { const y = scrollY; d.classList.toggle("tuck", y > last + 6 && y > 400); if (Math.abs(y - last) > 6) last = y; }, {passive:true});
}
// Chat assistant. Both parts appear only when site.json chat.endpoint is set (the /ask URL of the backend in chatbot/).
// Every page gets a floating link to the assistant; chat.html is the full-page chat.
function wireChatFab(site) {
  if (page === "chat" || !String(site.chat?.endpoint || "").trim() || (WP && !WP.urls.chat)) return;
  document.body.insertAdjacentHTML("beforeend", `<a class="chat-fab" id="chat-open" href="${esc(U("chat"))}">Ask ${esc(site.name)}</a>`);
}
function wireChatPage(site) {
  const g = $("#gpt");
  if (!g) return;
  const ep = site.chat.endpoint.trim(), KEY = "mad_chats", MAX = 500;
  const log = $("#gpt-log"), scroll = $("#gpt-scroll"), q = $("#gpt-q"), send = $("#gpt-send"), list = $("#gpt-list"), menu = $("#gpt-menu"), shade = $("#gpt-shade");
  const SUGGEST = ["Who is on the core team?", "What events has the club run?", "How do I join?", "What apps have members built?"];
  let chats = [], cur = null, busy = false;
  try { chats = (JSON.parse(localStorage.getItem(KEY)) || []).filter(c => c && typeof c.id === "string" && Array.isArray(c.msgs)); } catch {}
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(chats.slice(0, 20))); } catch {} };
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text !== undefined) n.textContent = text; return n; };
  const toEnd = () => { scroll.scrollTop = scroll.scrollHeight; };
  const setSend = () => { send.disabled = busy || !q.value.trim(); };
  const grow = () => { q.style.height = "auto"; q.style.height = Math.min(200, q.scrollHeight) + "px"; };

  // Answers are plain text. Only bullets, **bold** and https links are turned into elements; nothing is ever set as HTML.
  const inline = (to, s) => {
    for (const part of s.split(/(\*\*[^*]+\*\*|https:\/\/[^\s<>"')]*[^\s<>"').,;:!?])/)) {
      if (/^\*\*[^*]+\*\*$/.test(part)) to.append(el("strong", "", part.slice(2, -2)));
      else if (/^https:\/\//.test(part)) { const a = el("a", "", part.replace(/^https:\/\/(www\.)?/, "")); a.href = part; a.rel = "noopener"; to.append(a); }
      else if (part) to.append(part);
    }
  };
  const rich = (to, text) => {
    to.textContent = "";
    let ul = null;
    for (const line of String(text).split("\n")) {
      const m = line.match(/^\s*(?:[-*•]|\d+[.)])\s+(.*)$/);
      if (m) { if (!ul) { ul = el("ul"); to.append(ul); } const li = el("li"); inline(li, m[1]); ul.append(li); }
      else { ul = null; if (line.trim()) { const p = el("p"); inline(p, line.trim()); to.append(p); } }
    }
  };
  const okPage = p => typeof p === "string" && /^[a-z0-9-]+\.html(\?e=[a-z0-9-]+)?$/.test(p);
  const fillBot = (row, m) => {
    const body = $(".gpt-body", row);
    body.textContent = "";
    const text = el("div", "gpt-text"); rich(text, m.content); body.append(text);
    const src = WP ? [] : (m.sources || []).filter(s => s && okPage(s.page) && typeof s.title === "string");
    if (src.length) {
      const p = el("p", "gpt-src", "From the site: ");
      for (const s of src) { const a = el("a", "", s.title.slice(0, 60)); a.href = s.page; p.append(a); }
      body.append(p);
    }
    const acts = el("div", "gpt-acts"), copy = el("button", "", "Copy");
    copy.type = "button";
    copy.onclick = async () => { try { await navigator.clipboard.writeText(m.content); copy.textContent = "Copied"; } catch { copy.textContent = "Copy failed"; } setTimeout(() => { copy.textContent = "Copy"; }, 1600); };
    acts.append(copy); body.append(acts);
    row.dataset.done = "1";
  };
  const addMsg = m => {
    const row = el("div", "gpt-msg " + (m.role === "user" ? "user" : "bot"));
    if (m.role === "user") row.append(el("div", "gpt-bubble", m.content));
    else { row.append(el("span", "gpt-av", String(site.name || "M")[0]), el("div", "gpt-body")); $(".gpt-av", row).setAttribute("aria-hidden", "true"); if (m.content) fillBot(row, m); }
    log.append(row); toEnd();
    return row;
  };
  const drawList = () => {
    list.textContent = "";
    if (!chats.length) { list.append(el("li", "gpt-none", "No chats yet")); return; }
    for (const c of chats) {
      const li = el("li"), open = el("button", "gpt-chat", c.title || "Chat"), del = el("button", "gpt-del", "×");
      li.setAttribute("aria-current", c === cur);
      open.type = del.type = "button"; open.title = c.title || "Chat";
      open.onclick = () => openChat(c);
      del.setAttribute("aria-label", "Delete chat: " + (c.title || "Chat"));
      del.onclick = () => { chats = chats.filter(x => x !== c); save(); if (cur === c) newChat(); else drawList(); };
      li.append(open, del); list.append(li);
    }
  };
  const setSide = o => { g.classList.toggle("side-open", o); menu.setAttribute("aria-expanded", o); shade.hidden = !o; };
  const empty = () => {
    log.textContent = "";
    const box = el("div", "gpt-empty"), chips = el("div", "gpt-chips");
    box.append(el("span", "gpt-av lg", String(site.name || "M")[0]), el("h2", "", `What would you like to know about ${site.name}?`), el("p", "", "I answer from this website: events, the team, what the club does and how to join."));
    for (const s of SUGGEST) { const b = el("button", "", s); b.type = "button"; b.onclick = () => ask(s); chips.append(b); }
    box.append(chips); log.append(box);
  };
  function newChat() { cur = null; empty(); drawList(); setSide(false); q.focus(); }
  function openChat(c) { cur = c; log.textContent = ""; c.msgs.forEach(addMsg); drawList(); setSide(false); toEnd(); q.focus(); }
  // Reveals the answer a few words at a time, then swaps in the formatted version.
  const type = (row, m) => new Promise(done => {
    const words = m.content.split(/(\s+)/), body = $(".gpt-body", row), t = el("div", "gpt-text typing");
    if (reduced || words.length < 4) { fillBot(row, m); done(); return; }
    body.textContent = ""; body.append(t);
    let n = 0;
    const tick = () => {
      n = Math.min(words.length, n + 6);
      t.textContent = words.slice(0, n).join("");
      toEnd();
      if (n < words.length) setTimeout(tick, 28); else { fillBot(row, m); toEnd(); done(); }
    };
    tick();
  });
  async function ask(text) {
    text = String(text).trim().slice(0, MAX);
    if (!text || busy) return;
    busy = true; q.value = ""; grow(); setSend();
    if (!cur) { cur = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), title: text.slice(0, 60), at: Date.now(), msgs: [] }; chats.unshift(cur); log.textContent = ""; }
    const history = cur.msgs.slice(-8).map(({ role, content }) => ({ role, content }));
    const userMsg = { role: "user", content: text }, chat = cur;
    chat.msgs.push(userMsg);
    const userRow = addMsg(userMsg), row = addMsg({ role: "assistant", content: "" });
    $(".gpt-body", row).innerHTML = `<span class="gpt-dots" role="status" aria-label="Thinking"><i></i><i></i><i></i></span>`;
    drawList(); save(); toEnd();
    try {
      const r = await fetch(ep, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: text, history }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || typeof d.answer !== "string" || !d.answer.trim()) throw new Error(typeof d.error === "string" ? d.error : "");
      const m = { role: "assistant", content: d.answer.trim(), sources: Array.isArray(d.sources) ? d.sources.filter(s => s && okPage(s.page) && typeof s.title === "string").slice(0, 3) : [] };
      chat.msgs.push(m); save();
      if (cur === chat && row.isConnected) await type(row, m);
    } catch (err) {
      chat.msgs = chat.msgs.filter(x => x !== userMsg); save();
      if (row.isConnected) {
        const body = $(".gpt-body", row), retry = el("button", "btn", "Try again");
        body.textContent = "";
        const p = el("p", "gpt-err", err.message || "Could not reach the assistant. Check your connection and try again."); p.setAttribute("role", "alert");
        retry.type = "button"; retry.onclick = () => { userRow.remove(); row.remove(); ask(text); };
        body.append(p, retry); row.dataset.done = "1"; toEnd();
      }
    }
    busy = false; setSend(); q.focus();
  }
  $("#gpt-form").onsubmit = e => { e.preventDefault(); ask(q.value); };
  q.addEventListener("input", () => { grow(); setSend(); });
  q.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(q.value); } });
  $("#gpt-new").onclick = $("#gpt-new2").onclick = newChat;
  menu.onclick = () => setSide(!g.classList.contains("side-open"));
  shade.onclick = () => setSide(false);
  document.addEventListener("keydown", e => { if (e.key === "Escape") setSide(false); });
  empty(); drawList(); setSend();
}
function wireStories() {
  const st = $("#st"), data = window.__st;
  if (!st || !data) return;
  const slides = $$(".st-slide", st), bars = $$(".st-bars i", st);
  let n = 0;
  const need = i => { const im = $("img[data-src]", slides[i]); if (im) { im.src = im.dataset.src; im.removeAttribute("data-src"); } };
  const show = i => {
    n = (i + slides.length) % slides.length;
    slides.forEach((s, k) => s.classList.toggle("on", k === n));
    bars.forEach((b, k) => { b.className = k < n ? "done" : k === n ? "on" : ""; });
    need(n); need((n + 1) % slides.length);
    const e = data[n];
    $("#st-sem").textContent = e.semester; $("#st-name").textContent = e.name; $("#st-desc").textContent = e.description;
    $("#st-open").href = U("event", { e: e.slug });
  };
  st.addEventListener("animationend", e => { if (e.target.matches(".st-bars i.on b") && slides.length > 1) show(n + 1); });
  st.addEventListener("error", e => { if (e.target.tagName === "IMG") e.target.remove(); }, true);
  $(".st-nav.prev", st).onclick = () => show(n - 1);
  $(".st-nav.next", st).onclick = () => show(n + 1);
  st.addEventListener("keydown", e => { if (e.key === "ArrowRight") show(n + 1); else if (e.key === "ArrowLeft") show(n - 1); });
  show(0);
}
function wireEvents() {
  const st = window.__ev;
  if (!st) return;
  const list = $("#evlist"), count = $("#count"), q = $("#q");
  const draw = () => {
    const v = st.q.trim().toLowerCase();
    const f = st.events.filter(e => (st.y === "all" || semYear(e.semester) === st.y) && (!v || (e.name + " " + e.description + " " + e.semester).toLowerCase().includes(v)));
    const sems = [...new Set(f.map(e => e.semester))].sort((a, b) => semKey(b) - semKey(a) || (a < b ? 1 : -1));
    list.innerHTML = sems.map(s => `<h2 class="sem">${esc(s)}</h2><div class="rows">${f.filter(e => e.semester === s).map(eventRow).join("")}</div>`).join("") || `<div class="empty">No events match. Try a different word or year.</div>`;
    $$(".reveal", list).forEach(el => el.classList.add("in"));
    count.textContent = `${f.length} of ${st.events.length} events`;
    $$("#chips .chip").forEach(c => c.setAttribute("aria-pressed", c.dataset.y === st.y));
    const p = new URLSearchParams(), sk = new URLSearchParams(location.search).get("skin");
    if (st.y !== "all") p.set("y", st.y);
    if (st.q.trim()) p.set("q", st.q.trim());
    if (sk) p.set("skin", sk);
    const keep = new URLSearchParams(WP ? new URL(U("events"), location.href).search : "");
    p.forEach((v, k) => keep.set(k, v));
    history.replaceState(null, "", location.pathname + (keep.toString() ? "?" + keep : ""));
  };
  q.value = st.q;
  q.oninput = () => { st.q = q.value; draw(); };
  $("#chips").onclick = e => { const c = e.target.closest(".chip"); if (c) { st.y = c.dataset.y; draw(); } };
  draw();
}
function wireTeam() {
  const ch = $("#tchips");
  if (!ch) return;
  ch.onclick = e => {
    const c = e.target.closest(".chip");
    if (!c) return;
    $$("#tchips .chip").forEach(x => x.setAttribute("aria-pressed", x === c));
    $$("#tgrid .card").forEach(card => { card.hidden = c.dataset.g !== "all" && card.dataset.g !== c.dataset.g; });
  };
}

(async () => {
  const main = $("#main");
  try {
    const site = await load("site"), evs = (await load("events")).events;
    shell(site, evs); syncTheme();
    main.innerHTML = await pages[page](site);
    if (page !== "event" && page !== "events") document.title = (page === "home" ? "" : $("h1", main)?.textContent.replace(/\.$/, "") + " | ") + site.name + " | " + site.college_short;
    if ($(".gallery", main) && !$("#lb")) main.insertAdjacentHTML("beforeend", `<dialog id="lb" aria-label="Photo viewer"><img alt=""><p class="lb-err" role="alert" hidden>Could not load this photo.</p><div class="lb-bar"><button type="button" class="btn" data-lb="-1">Previous</button><span class="lb-count" aria-live="polite"></span><button type="button" class="btn" data-lb="1">Next</button><form method="dialog"><button class="btn">Close</button></form></div></dialog>`);
    const shotsOf = b => $$(".shot:not([hidden])", b.closest(".gallery") || main);
    const photoUrl = b => location.pathname + location.search + "#photo-" + ($$(".shot:not([hidden])", main).indexOf(b) + 1);
    const showShot = (d, b) => {
      try { history.replaceState(history.state, "", photoUrl(b)); } catch {}
      const shots = shotsOf(b), n = shots.indexOf(b);
      const im = $("img", d), er = $(".lb-err", d);
      d._from = b; d.dataset.i = n; er.hidden = true;
      if (im.getAttribute("src") !== b.dataset.src) { d.classList.add("loading"); d.setAttribute("aria-busy", "true"); d._want = b.dataset.src; im.src = b.dataset.src; }
      im.alt = $("img", b)?.alt || "";
      $(".lb-count", d).textContent = shots.length > 1 ? `${n + 1} / ${shots.length}` : "";
      $$("[data-lb]", d).forEach(x => { x.hidden = shots.length < 2; });
    };
    const stepShot = (d, delta) => { const shots = shotsOf(d._from); if (shots.length > 1) showShot(d, shots[(shots.indexOf(d._from) + delta + shots.length) % shots.length]); };
    document.addEventListener("keydown", e => {
      const d = $("#lb"); if (!d?.open || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
      stepShot(d, e.key === "ArrowRight" ? 1 : -1);
    });
    const lb = $("#lb");
    if (lb) {
      lb.addEventListener("click", e => { const s = e.target.closest("[data-lb]"); if (s) stepShot(lb, +s.dataset.lb); else if (e.target === lb) lb.close(); });
      let viaPop = false;
      addEventListener("popstate", () => { if (lb.open) { viaPop = true; lb.close(); } });
      lb.addEventListener("close", () => {
        if (viaPop) { viaPop = false; return; }
        try { if (history.state?.lb) history.back(); else history.replaceState(history.state, "", location.pathname + location.search); } catch {}
      });
      const lim = $("img", lb), done = bad => { if (lim.getAttribute("src") !== lb._want) return; lb.classList.remove("loading"); lb.removeAttribute("aria-busy"); $(".lb-err", lb).hidden = !bad; };
      lim.addEventListener("load", () => done(false));
      lim.addEventListener("error", () => done(true));
      let x0 = null;
      lb.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; }, { passive: true });
      lb.addEventListener("touchend", e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 50) stepShot(lb, dx < 0 ? 1 : -1); }, { passive: true });
    }
    // Gallery tiles follow each photo's shape: posters stand tall, panoramas go wide.
    main.addEventListener("load", e => {
      const b = e.target.tagName === "IMG" && e.target.closest(".gallery .shot"); if (!b) return;
      const r = e.target.naturalWidth / Math.max(1, e.target.naturalHeight);
      if (b.closest(".faces")) { if (r > 1.25) b.dataset.r = "land"; }
      else if (r < .85) b.dataset.r = "tall"; else if (r > 1.9) b.dataset.r = "wide";
    }, true);
    main.addEventListener("error", e => {
      if (e.target.tagName === "IMG" && e.target.closest(".thumb, .pill, .reel-i, .avatar")) { const k = e.target.closest(".pill, .reel-i"); (k || e.target).remove(); return; }
      const b = e.target.closest?.(".shot"); if (!b || e.target.tagName !== "IMG") return;
      const g = b.closest(".gallery"); b.remove();
      if (g && !$(".shot", g)) {
        if (page === "event") g.outerHTML = `<div class="empty">${NOPHOTOS()}</div>`;
        else { const h = g.previousElementSibling; if (h?.matches("h2.sem")) h.remove(); g.remove(); }
      }
    }, true);
    main.addEventListener("click", async e => {
      const sh = e.target.closest("#share");
      if (sh) {
        const ev = evs.find(x => x.slug === new URLSearchParams(location.search).get("e")), msg = $("#share-msg", main), old = sh.textContent;
        const say = t => { sh.textContent = t; if (msg) msg.textContent = t; setTimeout(() => { sh.textContent = old; if (msg) msg.textContent = ""; }, 2000); };
        try {
          if (navigator.share) await navigator.share({ title: ev?.name, text: ev?.description, url: location.href });
          else { await navigator.clipboard.writeText(location.href); say("Link copied"); }
        } catch (err) { if (err?.name !== "AbortError") say("Copy failed"); }
        return;
      }
      const b = e.target.closest(".shot"); if (!b) return;
      const d = $("#lb"); try { history.pushState({ lb: 1 }, "", photoUrl(b)); } catch {}
      showShot(d, b); d.showModal();
    });
    const dl = lb && /^#photo-(\d+)$/.exec(location.hash);
    if (dl) { const b = $$(".shot:not([hidden])", main)[+dl[1] - 1]; if (b) { b.scrollIntoView({ block: "center" }); showShot(lb, b); lb.showModal(); } }
    wirePalette(site, evs); wireMotion(); wireStories(); wireEvents(); wireContactForm(site); wireTeam(); wireDock(); wireChatFab(site); wireChatPage(site);
    activate();
    document.documentElement.dataset.ready = "1";
  } catch (err) {
    const local = location.protocol === "file:", dk = draftKeys().length;
    main.innerHTML = `<div class="wrap page-head"><h1>Could not load content</h1><p class="lead">${local ? "Open the site through a web server (not by double-clicking the file) so it can read the content folder." : "Something went wrong while loading the site content."}</p>${local ? "" : `<p><button class="btn primary" type="button" id="retry">Retry</button>${dk ? ` <button class="btn" type="button" id="discard-drafts">Discard drafts</button>` : ""}</p>`}</div>`;
    $("#retry")?.addEventListener("click", () => location.reload());
    $("#discard-drafts")?.addEventListener("click", () => { draftKeys().forEach(k => { try { localStorage.removeItem(k); } catch {} }); location.reload(); });
  }
})();
