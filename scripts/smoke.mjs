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
const urls = [...pages, ...events.map(e => `event.html?e=${e.slug}`), ...process.argv.slice(2)];

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
  if (out.includes("Could not load content")) why.push("Could not load content");
  if (u.startsWith("event.html?e=") && out.includes("Event not found")) why.push("Event not found");
  if (why.length) { failed++; console.log(`FAIL ${u}: ${why.join("; ")}`); } else console.log(`ok   ${u}`);
}
server.close();
console.log(failed ? `smoke: ${failed} of ${urls.length} failed` : `smoke: ${urls.length} pages ok`);
process.exit(failed ? 1 : 0);
