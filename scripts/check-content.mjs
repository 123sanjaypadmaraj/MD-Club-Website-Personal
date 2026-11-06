// Validates content/*.json. Plain Node, no dependencies. Run: node scripts/check-content.mjs
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const errors = [];
const root = fileURLToPath(new URL("..", import.meta.url));
const dir = join(root, "content");
const docs = {};
for (const f of readdirSync(dir).filter(f => f.endsWith(".json"))) {
  try { docs[f] = JSON.parse(readFileSync(join(dir, f), "utf8")); }
  catch (e) { errors.push(`${f}: invalid JSON (${e.message})`); }
}

function checkPhotos(id, photos) {
  for (const p of photos || []) {
    if (String(p).startsWith("data:")) errors.push(`${id}: photo is a data: URL`);
    else if (!/^(https?:)?\/\//.test(p)) {
      const f = join(root, String(p).replace(/^\//, ""));
      if (!existsSync(f)) errors.push(`${id}: photo not found on disk: ${p}`);
      else {
        if (!/\.(jpe?g|png|webp)$/i.test(p)) errors.push(`${id}: unsupported image type: ${p}`);
        const kb = statSync(f).size / 1024;
        if (kb > 500) console.warn(`warning: ${p} is ${Math.round(kb)} KB (over 500 KB; consider compressing)`);
      }
    }
  }
}

const events = docs["events.json"]?.events;
if (!Array.isArray(events)) errors.push("events.json: missing 'events' array");
else {
  const seen = new Set();
  events.forEach((ev, i) => {
    const id = `events.json event #${i + 1} (${ev.slug || ev.name || "?"})`;
    for (const k of ["slug", "name", "semester", "description"])
      if (!ev[k] || typeof ev[k] !== "string") errors.push(`${id}: missing ${k}`);
    if (ev.slug) {
      if (!/^[a-z0-9-]+$/.test(ev.slug)) errors.push(`${id}: slug must match ^[a-z0-9-]+$`);
      if (seen.has(ev.slug)) errors.push(`${id}: duplicate slug`);
      seen.add(ev.slug);
    }
    if (ev.semester && !/^\d\d-\d\d (Odd|Even) Sem$/.test(ev.semester))
      errors.push(`${id}: semester must look like "24-25 Odd Sem"`);
    checkPhotos(id, ev.photos);
  });
}

const team = docs["team.json"];
if (team) {
  const str = v => typeof v === "string" && v.trim() !== "";
  if (!str(team.current_year)) errors.push("team.json: current_year missing or not a string");
  (team.current || []).forEach((m, i) => { for (const k of ["name", "role"]) if (!str(m?.[k])) errors.push(`team.json current #${i + 1} (${m?.name || "?"}): missing ${k}`); });
  (team.earlier || []).forEach((m, i) => { for (const k of ["name", "role", "year"]) if (!str(m?.[k])) errors.push(`team.json earlier #${i + 1} (${m?.name || "?"}): missing ${k}`); });
  const labels = new Set();
  (team.galleries || []).forEach((g, i) => {
    if (!str(g?.label)) errors.push(`team.json gallery #${i + 1}: missing label`);
    else if (labels.has(g.label)) errors.push(`team.json gallery #${i + 1} (${g.label}): duplicate label`);
    else labels.add(g.label);
    if (!Array.isArray(g?.photos)) errors.push(`team.json gallery #${i + 1} (${g?.label || "?"}): photos must be an array`);
  });
}

(docs["team.json"]?.galleries || []).forEach((g, i) => checkPhotos(`team.json gallery #${i + 1} (${g.label || "?"})`, Array.isArray(g.photos) ? g.photos : []));

try {
  const used = new Set();
  const norm = p => String(p).replace(/^\//, "").replace(/\\/g, "/");
  for (const ev of events || []) for (const p of ev.photos || []) used.add(norm(p));
  for (const g of docs["team.json"]?.galleries || []) for (const p of g.photos || []) used.add(norm(p));
  const walk = d => readdirSync(join(root, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(d + "/" + e.name) : [d + "/" + e.name]);
  const unused = walk("photos").filter(f => /\.(jpe?g|png|webp)$/i.test(f) && !used.has(f));
  for (const f of unused) console.warn(`warning: ${f} is not used by any event or team gallery`);
  if (unused.length) console.warn(`warning: ${unused.length} unused photo file(s) in photos/`);
} catch {}

try {
  const sm =readFileSync(join(root, "sitemap.xml"), "utf8");
  const inMap = new Set([...sm.matchAll(/event\.html\?e=([^<"&\s]+)/g)].map(m => m[1]));
  const slugs = new Set((events || []).map(e => e.slug).filter(Boolean));
  for (const s of slugs) if (!inMap.has(s)) errors.push(`sitemap.xml: missing event.html?e=${s} (update sitemap.xml)`);
  for (const s of inMap) if (!slugs.has(s)) errors.push(`sitemap.xml: lists event.html?e=${s} but no such event (update sitemap.xml)`);
} catch (e) { errors.push("sitemap.xml: cannot read (" + e.message + ")"); }

try {
  if (readFileSync(join(root, "admin/cms/config.yml"), "utf8").includes("YOUR_GITHUB_USERNAME"))
    console.warn("warning: admin/cms/config.yml still contains YOUR_GITHUB_USERNAME");
} catch {}

if (errors.length) { console.error(errors.map(e => "error: " + e).join("\n")); process.exit(1); }
console.log("content ok");
