// Headless-Chrome smoke test of every page. Plain Node 20, no dependencies.
// Run: node scripts/smoke.mjs   (set CHROME to the browser path if needed)
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, extname, normalize, sep, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";

// SMOKE_ROOT lets CI test the staged _site folder instead of the repo root.
const root = join(resolve(process.env.SMOKE_ROOT || fileURLToPath(new URL("..", import.meta.url))), sep);
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".xml": "application/xml", ".txt": "text/plain" };

const chrome = [process.env.CHROME, "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "/usr/bin/chromium", "/usr/bin/chromium-browser", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe", "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"]
  .find(p => p && existsSync(p));
if (!chrome) {
  console.log("smoke: Chrome/Chromium/Edge not found, skipped (set CHROME=<path>)");
  process.exit(process.env.CI ? 1 : 0);
}

// Virtual pages served from memory (no repo file): they drive the admin editor inside an iframe.
const VIRTUAL = {};
let missing404 = new Set();
const server = createServer((req, res) => {
  const p = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^[/\\]+/, "") || "index.html";
  const vp = p.split(sep).join("/");
  if (vp === "__smoke/chat" && req.method === "POST") {
    let b = ""; req.on("data", c => b += c); req.on("end", () => {
      let last = ""; try { last = JSON.parse(b).question; } catch {}
      res.writeHead(200, { "Content-Type": "application/json" }); res.end(JSON.stringify({ answer: "Smoke reply to: " + last + "\n- first point\n- second point", sources: [{ title: "Core team", page: "team.html" }, { title: "Bad", page: "javascript:alert(1)" }] }));
    });
    return;
  }
  if (vp === "health") { res.writeHead(200, { "Content-Type": "application/json" }); res.end('{"status":"ok"}'); return; }
  if (vp === "__smoke/chat-down" && req.method === "POST") { req.resume(); res.writeHead(503, { "Content-Type": "application/json" }); res.end('{"error":"down"}'); return; }
  if (VIRTUAL[vp]) { res.writeHead(200, { "Content-Type": TYPES[".html"] }); res.end(VIRTUAL[vp]); return; }
  const f = join(root, p);
  if (!f.startsWith(root) || f.split(sep).includes(".git") || !existsSync(f) || !statSync(f).isFile()) { missing404.add("/" + p.split(sep).join("/")); res.writeHead(404); res.end("not found"); return; }
  res.writeHead(200, { "Content-Type": TYPES[extname(f).toLowerCase()] || "application/octet-stream" });
  res.end(readFileSync(f));
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;

const pages = ["index.html", "events.html", "about.html", "achievements.html", "team.html", "contact.html", "chat.html", "event.html", "404.html"];
const events = JSON.parse(readFileSync(join(root, "content/events.json"), "utf8")).events || [];

// URL-driven states: [url, predicate(out) -> problem string or ""]. Skipped with a note if data is missing.
const extra = [];
const lbOpen = out => /<dialog[^>]*id="lb"[^>]*\sopen/.test(out) || /<dialog[^>]*\sopen[^>]*id="lb"/.test(out);
const lbCount = out => (out.match(/class="lb-count"[^>]*>([^<]*)</) || [])[1];
const galleries = JSON.parse(readFileSync(join(root, "content/team.json"), "utf8")).galleries || [];
const ev2 = events.find(e => (e.photos || []).length >= 2);
if (ev2) extra.push([`event.html?e=${ev2.slug}#photo-2`, out => !lbOpen(out) ? "photo viewer not open for #photo-2" : lbCount(out) !== `2 / ${ev2.photos.length}` ? `expected counter "2 / ${ev2.photos.length}", got "${lbCount(out)}"` : ""]);
else console.log("note: no event with 2+ photos, skipping event deep-link check");
if (galleries.length >= 2 && galleries[0].photos.length && galleries[1].photos.length) {
  const k = galleries[0].photos.length + 1;
  extra.push([`team.html#photo-${k}`, out => !lbOpen(out) ? `photo viewer not open for #photo-${k}` : lbCount(out) !== `1 / ${galleries[1].photos.length}` ? `expected counter "1 / ${galleries[1].photos.length}", got "${lbCount(out)}"` : ""]);
} else console.log("note: fewer than 2 team galleries, skipping team deep-link check");
extra.push(["team.html#photo-9999", out => lbOpen(out) ? "photo viewer opened for out-of-range hash" : ""]);
const term = ((events[0]?.name || "").toLowerCase().match(/[a-z]{3,}/) || [])[0];
if (term) {
  const k = events.filter(e => (e.name + " " + e.description + " " + e.semester).toLowerCase().includes(term)).length;
  extra.push([`events.html?q=${term}`, out => out.includes(`${k} of ${events.length} events`) ? "" : `expected "${k} of ${events.length} events"`]);
} else console.log("note: no searchable event name, skipping ?q= check");
const semYear = e => (String(e.semester).match(/^\d\d-\d\d/) || [""])[0];
const pressed = (out, y) => new RegExp(`data-y="${y}"[^>]*aria-pressed="true"`).test(out);
const years = [...new Set(events.map(semYear).filter(Boolean))];
if (years.length >= 2) {
  const y = semYear(events[0]), k = events.filter(e => semYear(e) === y).length;
  extra.push([`events.html?y=${y}`, out => !out.includes(`${k} of ${events.length} events`) ? `expected "${k} of ${events.length} events"` : !pressed(out, y) ? `chip ${y} not pressed` : ""]);
} else console.log("note: fewer than 2 event years, skipping ?y= check");
extra.push(["events.html?y=99-00", out => !out.includes(`${events.length} of ${events.length} events`) ? `expected "${events.length} of ${events.length} events"` : !pressed(out, "all") ? "All chip not pressed" : ""]);
extra.push(["events.html?q=zqxjv", out => !out.includes(`0 of ${events.length} events`) ? `expected "0 of ${events.length} events"` : !out.includes("No events match") ? "missing No events match" : ""]);
// Event page: unknown slug, per-event title/og:title, Older/Newer nav.
const NOSLUG = "event.html?e=zqxjv-no-such-event";
const htmlEsc = t => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
extra.push([NOSLUG, out => !out.includes("Event not found") ? "missing Event not found"
  : !/<meta(?=[^>]*name="robots")(?=[^>]*content="noindex")[^>]*>/.test(out) ? "missing noindex robots meta"
  : !out.includes("<title>Event not found | MAD Club</title>") ? "wrong not-found title" : ""]);
if (events.length) {
  const e0 = events[0], t0 = htmlEsc(`${e0.name} | MAD Club`);
  extra.push([`event.html?e=${e0.slug}`, out => {
    if (!out.includes(`<title>${t0}</title>`)) return `expected <title>${t0}</title>`;
    if (!(out.match(/<meta[^>]*>/g) || []).some(m => m.includes('property="og:title"') && m.includes(`content="${t0}"`))) return "og:title does not match the event title";
    if (events.length >= 3) {
      const nav = (out.match(/<nav[^>]*aria-label="More events"[^>]*>[\s\S]*?<\/nav>/) || [])[0];
      if (!nav) return "missing More events nav";
      const slugs = [...nav.matchAll(/href="event\.html\?e=([^"]+)"/g)].map(m => decodeURIComponent(m[1]));
      if (!slugs.length || slugs.some(s => s === e0.slug || !events.some(e => e.slug === s))) return `bad More events links: ${slugs.join(", ")}`;
    }
    return "";
  }]);
  if (events.length < 3) console.log("note: fewer than 3 events, skipping Older/Newer check");
}
// Admin editor: login view, then every tab renders fields without errors.
const adminTabs = [...readFileSync(join(root, "admin/admin.js"), "utf8").split("const TABS = [")[1].split(/\r?\n\];/)[0].matchAll(/^  \{ id: "([^"]+)"/gm)].map(m => m[1]);
const ADMIN = "admin/index.html", ADMIN_TABS = "__smoke/admin-tabs.html";
const EXEMPT = new Set([ADMIN, ADMIN_TABS]);
VIRTUAL[ADMIN_TABS] = `<!doctype html><meta charset="utf-8"><body><ol id="out"></ol><script>
try { sessionStorage.setItem("mad_admin", "1"); } catch {}
const f = document.createElement("iframe"); f.src = "../admin/index.html"; document.body.append(f);
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const d = () => f.contentDocument;
  for (let i = 0; i < 40 && !(d() && d().querySelector("#tabs button")); i++) await sleep(100);
  const out = document.getElementById("out");
  for (const b of [...d().querySelectorAll("#tabs button")]) {
    b.click(); await sleep(300);
    const li = document.createElement("li");
    li.dataset.tab = b.dataset.id; li.dataset.fields = d().querySelectorAll("#form .field").length;
    li.dataset.err = d().documentElement.dataset.jsError || "";
    out.append(li);
  }
  document.body.insertAdjacentHTML("beforeend", '<p id="done">done</p>');
})();
<\/script>`;
if (adminTabs.length) {
  extra.push([ADMIN, out => !/<div[^>]*id="login"(?![^>]*\shidden)[^>]*>/.test(out) ? "login view not shown" : ""]);
  extra.push([ADMIN_TABS, out => {
    if (!out.includes('id="done"')) return "admin tabs page never finished";
    const lis = [...out.matchAll(/<li[^>]*data-tab="([^"]*)"[^>]*>/g)].map(m => m[0]);
    const bad = adminTabs.map(id => { const li = lis.find(l => l.includes(`data-tab="${id}"`)); const n = li && +(li.match(/data-fields="(\d+)"/) || [])[1]; const er = li && (li.match(/data-err="([^"]*)"/) || [])[1];
      return !li ? `tab ${id} missing` : er ? `tab ${id} error: ${er}` : !(n >= 1) ? `tab ${id} has no fields` : ""; }).filter(Boolean);
    return bad.join("; ");
  }]);
} else console.log("note: could not read admin TABS, skipping admin checks");
// Admin drafts in localStorage must override the published JSON. Runs in a throwaway profile so the draft cannot leak.
const DRAFT = "__smoke/draft.html", DRAFT_NAME = "Smoke Draft Zqxjv";
const FRESH = new Set([DRAFT]);
if (events.length) {
  VIRTUAL[DRAFT] = `<!doctype html><meta charset="utf-8"><body><script>
fetch("../content/events.json").then(r => r.json()).then(d => {
  d.events[0].name = ${JSON.stringify(DRAFT_NAME)};
  localStorage.setItem("mad_content_events", JSON.stringify(d));
  location.replace("../events.html");
});
<\/script>`;
  extra.push([DRAFT, out => !out.includes(DRAFT_NAME) ? "draft event name not shown on events.html" : !out.includes(`${events.length} of ${events.length} events`) ? `expected "${events.length} of ${events.length} events"` : ""]);
  extra.push(["events.html", out => out.includes(DRAFT_NAME) ? "draft leaked into a normal profile" : ""]);
}
// ?skin= for every skin (keys from SKINS in site.js, --bg from style.css) plus the unknown-skin fallback.
const siteJs = readFileSync(join(root, "assets/site.js"), "utf8"), styleCss = readFileSync(join(root, "assets/style.css"), "utf8");
const skinKeys = [...((siteJs.match(/const SKINS = \[(.*)\];/) || [])[1] || "").matchAll(/\["([a-z]+)"/g)].map(m => m[1]);
const metaTheme = out => ((out.match(/<meta[^>]*>/g) || []).find(m => m.includes('name="theme-color"')) || "").match(/content="([^"]*)"/)?.[1] || "";
const btnPressed = (out, k) => (out.match(/<button[^>]*>/g) || []).some(b => b.includes(`data-skin="${k}"`) && b.includes('aria-pressed="true"'));
const htmlSkin = out => ((out.match(/<html[^>]*>/i) || [""])[0].match(/data-skin="([^"]*)"/) || [])[1];
for (const k of skinKeys) {
  const bg = (styleCss.match(new RegExp(":root[[]data-skin=" + k + "[\\]][{]--bg:(#[0-9a-fA-F]{3,8})")) || [])[1];
  extra.push([`about.html?skin=${k}`, out => !bg ? `no --bg rule for skin ${k} in style.css` : htmlSkin(out) !== k ? `expected data-skin="${k}", got "${htmlSkin(out)}"`
    : !btnPressed(out, k) ? `skin button ${k} not pressed` : metaTheme(out).toLowerCase() !== bg.toLowerCase() ? `theme-color "${metaTheme(out)}" does not match ${k} --bg ${bg}` : ""]);
}
if (skinKeys.length >= 2) {
  extra.push(["about.html?skin=zqxjv", out => htmlSkin(out) !== "nebula" ? `unknown skin should fall back to nebula, got "${htmlSkin(out)}"` : ""]);
  const k2 = skinKeys[1];
  if (events.length) extra.push([`events.html?skin=${k2}&y=${semYear(events[0])}`, out => htmlSkin(out) !== k2 ? `skin ${k2} lost after the year filter, got "${htmlSkin(out)}"` : ""]);
} else console.log("note: could not read SKINS, skipping ?skin= checks");
// Contact email/phone cards and the NHCE college link: published pages (hidden while empty) and a draft with both set.
const siteJson = JSON.parse(readFileSync(join(root, "content/site.json"), "utf8"));
const cc = siteJson.contact || {}, collegePage = (siteJson.college_page || "").trim();
const CDRAFT = "__smoke/contact-draft.html";
FRESH.add(CDRAFT);
VIRTUAL[CDRAFT] = `<!doctype html><meta charset="utf-8"><body><script>
fetch("../content/site.json").then(r => r.json()).then(d => {
  d.contact = Object.assign({}, d.contact, { email: "smoke@example.com", phone: "+91 98765 43210", form_endpoint: "" });
  localStorage.setItem("mad_content_site", JSON.stringify(d));
  location.replace("../contact.html");
});
<\/script>`;
extra.push([CDRAFT, out => {
  const bad = [];
  if ((out.match(/href="mailto:smoke@example\.com"/g) || []).length < 2) bad.push('expected href="mailto:smoke@example.com" in the card and the notice');
  if (!out.includes('href="tel:+919876543210"')) bad.push('missing href="tel:+919876543210"');
  if (!out.includes("<h3>Email</h3>") || !out.includes("<h3>Phone</h3>")) bad.push("missing Email/Phone card heading");
  if (!out.includes("or email")) bad.push('missing "or email" in the registration notice');
  return bad.join("; ");
}]);
const collegeLink = out => out.includes(`href="${collegePage}"`) && out.includes("Club page on the NHCE website");
if (collegePage) for (const pg of ["contact.html", "about.html"]) extra.push([pg, out => collegeLink(out) ? "" : `${pg}: missing NHCE college link ${collegePage}`]);
else console.log("note: site.json college_page is empty, skipping college link checks");
if (!(cc.email || "").trim() && !(cc.phone || "").trim()) extra.push(["contact.html", out => /href="(mailto|tel):/.test(out) ? "mailto:/tel: link shown while contact email and phone are empty" : ""]);
else console.log("note: site.json has a contact email or phone, skipping the hidden-when-empty check");
// Home-page announcement strip: a draft with text/link shows it, the published page shows none while the text is empty.
const HDRAFT = "__smoke/home-draft.html";
FRESH.add(HDRAFT);
VIRTUAL[HDRAFT] = `<!doctype html><meta charset="utf-8"><body><script>
fetch("../content/site.json").then(r => r.json()).then(d => {
  d.announcement = { text: "Smoke notice Qzvx", link: "events.html", link_label: "See events" };
  localStorage.setItem("mad_content_site", JSON.stringify(d));
  location.replace("../index.html");
});
<\/script>`;
extra.push([HDRAFT, out => ["class=\"announce\"", "Smoke notice Qzvx", 'href="events.html"', "See events"].filter(t => !out.includes(t)).map(t => `announcement strip missing ${t}`).join("; ")]);
if (!String(siteJson.announcement?.text || "").trim()) extra.push(["index.html", out => out.includes('class="announce"') ? "announcement strip shown while announcement.text is empty" : ""]);
else console.log("note: site.json announcement.text is set, skipping the hidden-when-empty check");
// Chat assistant: with a draft endpoint the full-page chat sends a question and shows the reply.
const CHAT = "__smoke/chat-draft.html";
FRESH.add(CHAT); EXEMPT.add(CHAT);
VIRTUAL[CHAT] = `<!doctype html><meta charset="utf-8"><body><script>
const sleep = ms => new Promise(r => setTimeout(r, ms));
fetch("../content/site.json").then(r => r.json()).then(async d => {
  d.chat = { endpoint: "/__smoke/chat" };
  localStorage.setItem("mad_content_site", JSON.stringify(d));
  const f = document.createElement("iframe"); f.src = "../chat.html"; document.body.append(f);
  const q = s => f.contentDocument && f.contentDocument.querySelector(s);
  for (let i = 0; i < 40 && !q("#gpt-q"); i++) await sleep(100);
  const out = document.createElement("p"); out.id = "chat-result";
  if (!q("#gpt-q")) out.dataset.err = "no chat composer";
  else {
    out.dataset.empty = !!q(".gpt-empty") && q("#gpt-send").disabled;
    q("#gpt-q").value = "Zqxjv question";
    q("#gpt-q").dispatchEvent(new Event("input", { bubbles: true }));
    q("#gpt-form").requestSubmit();
    for (let i = 0; i < 40 && !q(".gpt-msg.bot[data-done]"); i++) await sleep(100);
    out.dataset.user = (q(".gpt-bubble") || {}).textContent || "";
    out.dataset.bot = (q(".gpt-msg.bot .gpt-text") || {}).textContent || "";
    out.dataset.items = f.contentDocument.querySelectorAll(".gpt-msg.bot .gpt-text li").length;
    out.dataset.src = [...f.contentDocument.querySelectorAll(".gpt-src a")].map(a => a.getAttribute("href")).join(",");
    out.dataset.saved = f.contentDocument.querySelectorAll("#gpt-list .gpt-chat").length;
    out.dataset.err = f.contentDocument.documentElement.dataset.jsError || f.contentDocument.documentElement.dataset.cspViolation || "";
  }
  document.body.append(out);
});
<\/script>`;
extra.push([CHAT, out => {
  const p = (out.match(/<p[^>]*id="chat-result"[^>]*>/) || [])[0];
  if (!p) return "chat test never finished";
  const a = n => (p.match(new RegExp("data-" + n + '="([^"]*)"')) || [])[1];
  return a("err") ? "chat: " + a("err") : a("empty") !== "true" ? "chat did not start on the empty state with Send disabled"
    : a("user") !== "Zqxjv question" ? "question not shown in the chat" : !a("bot").startsWith("Smoke reply to: Zqxjv question") ? `reply not shown, got: ${a("bot")}`
    : a("items") !== "2" ? "bullet lines were not turned into a list" : a("src") !== "team.html" ? `expected only the team.html source link, got: ${a("src")}`
    : a("saved") !== "1" ? "chat was not added to the sidebar" : "";
}]);
// Built-in answers (no draft, so the published chat.endpoint) and the fallback when the backend is down (503).
// Both ask the first suggestion chip and report what the chat showed.
const chatProbe = (endpoint, id) => `<!doctype html><meta charset="utf-8"><body><script>
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  ${endpoint ? `const d = await (await fetch("../content/site.json")).json(); d.chat = { endpoint: "${endpoint}" }; localStorage.setItem("mad_content_site", JSON.stringify(d));` : ""}
  const f = document.createElement("iframe"); f.src = "../chat.html"; document.body.append(f);
  const q = s => f.contentDocument && f.contentDocument.querySelector(s), all = s => [...f.contentDocument.querySelectorAll(s)];
  for (let i = 0; i < 40 && !q(".gpt-chips button"); i++) await sleep(100);
  const out = document.createElement("p"); out.id = "${id}";
  const chip = q(".gpt-chips button") && all(".gpt-chips button").find(b => b.textContent === "Who is on the core team?");
  if (!chip) out.dataset.err = "no core team suggestion";
  else {
    chip.click();
    for (let i = 0; i < 60 && !q(".gpt-msg.bot[data-done]"); i++) await sleep(100);
    out.dataset.bot = ((q(".gpt-msg.bot .gpt-text") || {}).textContent || "").slice(0, 400);
    out.dataset.src = all(".gpt-src a").map(a => a.getAttribute("href")).join(",");
    out.dataset.saved = all("#gpt-list .gpt-chat").length;
    out.dataset.fallback = !!q(".gpt-fallback");
    out.dataset.gpterr = !!q(".gpt-err");
    q("#gpt-new").click();
    out.dataset.reset = !!q(".gpt-empty") && !q(".gpt-msg");
    f.contentDocument.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
    if (q("#pal-q")) { q("#pal-q").value = "assistant"; q("#pal-q").dispatchEvent(new Event("input", { bubbles: true })); }
    out.dataset.pal = ((q("#pal-l") || {}).textContent || "").includes("Ask the assistant");
    out.dataset.err = f.contentDocument.documentElement.dataset.jsError || f.contentDocument.documentElement.dataset.cspViolation || "";
  }
  document.body.append(out);
})();
</script>`;
const probe = (out, id) => { const p = (out.match(new RegExp(`<p[^>]*id="${id}"[^>]*>`)) || [])[0]; return p && (n => (p.match(new RegExp("data-" + n + '="([^"]*)"')) || [])[1]); };
const firstMember = String(JSON.parse(readFileSync(join(root, "content/team.json"), "utf8")).current?.[0]?.name || "");
const CHAT_LOCAL = "__smoke/chat-local.html", CHAT_DOWN = "__smoke/chat-down.html";
FRESH.add(CHAT_DOWN); EXEMPT.add(CHAT_DOWN);
VIRTUAL[CHAT_DOWN] = chatProbe("/__smoke/chat-down", "down-result");
extra.push([CHAT_DOWN, out => {
  const a = probe(out, "down-result");
  if (!a) return "backend-down chat test never finished";
  return a("err") ? "chat: " + a("err") : a("gpterr") !== "false" ? "showed an error instead of a built-in answer"
    : !a("bot").includes(firstMember) ? `built-in answer missing ${firstMember}, got: ${a("bot")}` : a("fallback") !== "true" ? "missing the gpt-fallback line" : "";
}]);
if (!String(siteJson.chat?.endpoint || "").trim()) {
  FRESH.add(CHAT_LOCAL); EXEMPT.add(CHAT_LOCAL);
  VIRTUAL[CHAT_LOCAL] = chatProbe("", "local-result");
  extra.push([CHAT_LOCAL, out => {
    const a = probe(out, "local-result");
    if (!a) return "built-in chat test never finished";
    return a("err") ? "chat: " + a("err") : !a("bot").includes(firstMember) ? `answer missing ${firstMember}, got: ${a("bot")}`
      : !a("src").split(",").includes("team.html") ? `no team.html source link, got: ${a("src")}` : a("saved") !== "1" ? "chat was not added to the sidebar"
      : a("fallback") !== "false" ? "built-in mode showed the offline line" : a("reset") !== "true" ? "New chat did not bring back the empty state" : a("pal") !== "true" ? "Ctrl+K menu has no Ask the assistant entry" : "";
  }]);
  for (const u of ["events.html", "team.html"]) extra.push([u, out => /id="chat-open"[^>]*href="chat.html"|href="chat.html"[^>]*id="chat-open"/.test(out) ? "" : "assistant link missing"]);
} else console.log("note: site.json chat.endpoint is set, skipping the built-in answer checks");
// The chat is always on: built-in answers while chat.endpoint is empty, the backend once it is set.
extra.push(["index.html", out => out.includes('id="chat-open"') ? "" : "assistant link missing"]);
extra.push(["chat.html", out => !out.includes('id="gpt"') ? "chat UI missing" : !String(siteJson.chat?.endpoint || "").trim() && !out.includes("Quick answers matched from this website") ? "missing the built-in answers note" : ""]);
// Several predicates may target one URL: run them all.
const extraPred = new Map();
for (const [u, f] of extra) { const prev = extraPred.get(u); extraPred.set(u, prev ? out => [prev(out), f(out)].filter(Boolean).join("; ") : f); }
const urls = [...new Set([...pages, ...events.map(e => `event.html?e=${e.slug}`), ...extra.map(x => x[0]), ...process.argv.slice(2)])];

const dump = url => new Promise(resolve => {
  const prof = FRESH.has(url) ? mkdtempSync(join(tmpdir(), "smoke-")) : null;
  execFile(chrome, ["--headless=new", "--disable-gpu", "--no-sandbox", "--virtual-time-budget=5000", ...(prof ? ["--user-data-dir=" + prof] : []), "--dump-dom", base + url],
    { maxBuffer: 64 * 1024 * 1024, timeout: 60000 }, (err, out) => {
      if (prof) setTimeout(() => rmSync(prof, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }), 500);
      resolve({ err, out: out || "" });
    });
});

const team = JSON.parse(readFileSync(join(root, "content/team.json"), "utf8"));
const shots = (team.galleries || []).reduce((n, g) => n + (g.photos || []).length, 0);

let failed = 0;
for (const u of urls) {
  missing404 = new Set();
  const { err, out } = await dump(u);
  const why = [];
  const gone = [...missing404].map(x => x.replace(/^\//, "")).filter(x => x !== "favicon.ico");
  if (gone.length) why.push(gone.slice(0, 5).map(x => "404: " + x).join("; "));
  if (err) why.push("chrome error: " + err.message.split("\n")[0]);
  if (!out.includes("<h1") && u !== "404.html" && !EXEMPT.has(u)) why.push("no <h1");
  if (u === "404.html" && !out.includes("<h1")) why.push("no <h1");
  const htmlTag = (out.match(/<html[^>]*>/i) || [""])[0];
  const attr = n => (htmlTag.match(new RegExp("data-" + n + '="([^"]*)"')) || [])[1];
  if (attr("js-error") !== undefined) why.push("JS error: " + attr("js-error"));
  if (attr("csp-violation") !== undefined) why.push("CSP violation: " + attr("csp-violation"));
  if (attr("ready") !== "1" && !EXEMPT.has(u)) why.push("page never finished rendering (no data-ready)");
  if (u === "events.html" && !out.includes(`${events.length} of ${events.length} events`)) why.push(`expected "${events.length} of ${events.length} events"`);
  if (u === "team.html" && (out.match(/class="shot"/g) || []).length !== shots) why.push(`expected ${shots} photo buttons`);
  const pred = extraPred.get(u); if (pred) { const m = pred(out); if (m) why.push(m); }
  if (out.includes("Could not load content")) why.push("Could not load content");
  if (u.startsWith("event.html?e=") && u !== NOSLUG && out.includes("Event not found")) why.push("Event not found");
  if (why.length) { failed++; console.log(`FAIL ${u}: ${why.join("; ")}`); } else console.log(`ok   ${u}`);
}
server.close();
console.log(failed ? `smoke: ${failed} of ${urls.length} failed` : `smoke: ${urls.length} pages ok`);
process.exit(failed ? 1 : 0);
