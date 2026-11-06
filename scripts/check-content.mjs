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
    for (const p of ev.photos || []) {
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
  });
}

try {
  if (readFileSync(join(root, "admin/cms/config.yml"), "utf8").includes("YOUR_GITHUB_USERNAME"))
    console.warn("warning: admin/cms/config.yml still contains YOUR_GITHUB_USERNAME");
} catch {}

if (errors.length) { console.error(errors.map(e => "error: " + e).join("\n")); process.exit(1); }
console.log("content ok");
