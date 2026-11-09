// Headless-Chrome smoke test of every page. Plain Node 20, no dependencies.
// Run: node scripts/smoke.mjs   (set CHROME to the browser path if needed)
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { execFile } from "node:child_process";

const root = fileURLToPath(new URL("..", import.meta.url));
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".xml": "application/xml", ".txt": "text/plain" };

const chrome = [process.env.CHROME, "/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"]
  .find(p => p && existsSync(p));
if (!chrome) {
  console.log("smoke: Chrome not found, skipped");
  process.exit(process.env.CI ? 1 : 0);
}

const server = createServer((req, res) => {
  const p = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^[/\\]+/, "") || "index.html";
  const f = join(root, p);
  if (!f.startsWith(root) || f.split(sep).includes(".git") || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end("not found"); return; }
  res.writeHead(200, { "Content-Type": TYPES[extname(f).toLowerCase()] || "application/octet-stream" });
  res.end(readFileSync(f));
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;

const pages = ["index.html", "events.html", "about.html", "achievements.html", "team.html", "contact.html", "event.html", "404.html"];
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
const extraPred = new Map(extra);
const urls = [...pages, ...events.map(e => `event.html?e=${e.slug}`), ...[...new Set(extra.map(x => x[0]))], ...process.argv.slice(2)];

const dump = url => new Promise(resolve => {
  execFile(chrome, ["--headless=new", "--disable-gpu", "--no-sandbox", "--virtual-time-budget=5000", "--dump-dom", base + url],
    { maxBuffer: 64 * 1024 * 1024, timeout: 60000 }, (err, out) => resolve({ err, out: out || "" }));
});

const team = JSON.parse(readFileSync(join(root, "content/team.json"), "utf8"));
const shots = (team.galleries || []).reduce((n, g) => n + (g.photos || []).length, 0);

let failed = 0;
for (const u of urls) {
  const { err, out } = await dump(u);
  const why = [];
  if (err) why.push("chrome error: " + err.message.split("\n")[0]);
  if (!out.includes("<h1") && u !== "404.html") why.push("no <h1");
  if (u === "404.html" && !out.includes("<h1")) why.push("no <h1");
  const htmlTag = (out.match(/<html[^>]*>/i) || [""])[0];
  const attr = n => (htmlTag.match(new RegExp("data-" + n + '="([^"]*)"')) || [])[1];
  if (attr("js-error") !== undefined) why.push("JS error: " + attr("js-error"));
  if (attr("csp-violation") !== undefined) why.push("CSP violation: " + attr("csp-violation"));
  if (attr("ready") !== "1") why.push("page never finished rendering (no data-ready)");
  if (u === "events.html" && !out.includes(`${events.length} of ${events.length} events`)) why.push(`expected "${events.length} of ${events.length} events"`);
  if (u === "team.html" && (out.match(/class="shot"/g) || []).length !== shots) why.push(`expected ${shots} photo buttons`);
  const pred = extraPred.get(u); if (pred) { const m = pred(out); if (m) why.push(m); }
  if (out.includes("Could not load content")) why.push("Could not load content");
  if (u.startsWith("event.html?e=") && out.includes("Event not found")) why.push("Event not found");
  if (why.length) { failed++; console.log(`FAIL ${u}: ${why.join("; ")}`); } else console.log(`ok   ${u}`);
}
server.close();
console.log(failed ? `smoke: ${failed} of ${urls.length} failed` : `smoke: ${urls.length} pages ok`);
process.exit(failed ? 1 : 0);
