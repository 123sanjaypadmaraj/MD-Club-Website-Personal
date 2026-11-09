// Validates content/*.json. Plain Node, no dependencies. Run: node scripts/check-content.mjs [rootDir] [root-dir]
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const errors = [];
const root = process.argv[2] ? resolve(process.argv[2]) : fileURLToPath(new URL("..", import.meta.url));
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

{
  const str = v => typeof v === "string" && v.trim() !== "";
  const pairs = (id, list, keys) => {
    if (!Array.isArray(list)) { errors.push(`${id} must be an array`); return; }
    list.forEach((it, i) => { for (const k of keys) if (!str(it?.[k])) errors.push(`${id}[${i}] missing ${k}`); });
  };
  const site = docs["site.json"];
  if (site) {
    for (const k of ["name", "full_name", "college", "college_short", "established", "tagline", "instagram", "instagram_handle", "hero_title", "hero_lead", "why_title", "why_lead", "cta_title", "cta_text"])
      if (!str(site[k])) errors.push(`site.json: ${k} missing or not a string`);
    if (str(site.instagram) && !/^https:\/\//.test(site.instagram)) errors.push("site.json: instagram must start with https://");
    pairs("site.json: stats", site.stats, ["value", "label"]);
    pairs("site.json: highlights", site.highlights, ["title", "text"]);
    pairs("site.json: why", site.why, ["title", "text"]);
    for (const k of ["who", "objective", "outcomes"]) if (!str(site.about?.[k])) errors.push(`site.json: about.${k} missing or not a string`);
    pairs("site.json: about.functions", site.about?.functions, ["title", "text"]);
    if (!str(site.contact?.coordinators)) errors.push("site.json: contact.coordinators missing or not a string");
    const ep = site.contact?.form_endpoint;
    if (typeof ep !== "string") errors.push("site.json: contact.form_endpoint must be a string");
    else if (ep.trim() && !/^https:\/\//.test(ep.trim())) errors.push("site.json: contact.form_endpoint must be empty or start with https://");
  } else errors.push("site.json: missing");
  const ach = docs["achievements.json"];
  if (ach) {
    pairs("achievements.json: stats", ach.stats, ["value", "label"]);
    pairs("achievements.json: apps", ach.apps, ["name", "text"]);
  } else errors.push("achievements.json: missing");
}

try {
  const { createHash } = await import("node:crypto");
  for (const f of readdirSync(root).filter(f => f.endsWith(".html"))) {
    const h = readFileSync(join(root, f), "utf8");
    const csp = h.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)"/)?.[1];
    if (!csp) { errors.push(`${f}: missing Content-Security-Policy meta`); continue; }
    for (const m of h.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
      const hash = "'sha256-" + createHash("sha256").update(m[1]).digest("base64") + "'";
      if (!csp.includes(hash)) errors.push(`${f}: inline script hash ${hash} not in its Content-Security-Policy (recompute it)`);
    }
  }
  const htmls = readdirSync(root).filter(f => f.endsWith(".html"));
  const walkAdmin = d => existsSync(join(root, d)) ? readdirSync(join(root, d), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walkAdmin(d + "/" + e.name) : e.name.endsWith(".html") ? [d + "/" + e.name] : []) : [];
  for (const f of [...htmls, ...walkAdmin("admin")]) {
    const h = readFileSync(join(root, f), "utf8");
    for (const m of h.matchAll(/<script\b[^>]*\ssrc=["'](https?:\/\/[^"']+)["'][^>]*>/gi))
      if (!/\sintegrity=/i.test(m[0])) errors.push(`${f}: external script ${m[1]} has no integrity attribute`);
  }
} catch (e) { errors.push("CSP check failed: " + e.message); }

// The inline <head> skin script hard-codes the skin list: keep it in sync with SKINS in site.js and style.css.
try {
  const js = readFileSync(join(root, "assets/site.js"), "utf8");
  const keys = ((js.match(/const SKINS = \[(.*)\];/) || [])[1] || "").match(/\["([a-z]+)"/g)?.map(m => m.slice(2, -1));
  if (keys) {
    const css = existsSync(join(root, "assets/style.css")) ? readFileSync(join(root, "assets/style.css"), "utf8") : null;
    if (css) for (const k of keys) if (!css.includes(`:root[data-skin=${k}]`)) errors.push(`assets/style.css: no :root[data-skin=${k}] rule for skin "${k}" in SKINS`);
    const okDef = js.match(/const skinOk = [^\n]*\?\s*k\s*:\s*"([a-z]+)"/)?.[1];
    if (okDef && !keys.includes(okDef)) errors.push(`assets/site.js: default skin "${okDef}" is not in SKINS`);
    const want = [...keys].sort().join("|");
    for (const f of readdirSync(root).filter(f => f.endsWith(".html"))) {
      const h = readFileSync(join(root, f), "utf8");
      for (const m of h.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
        const list = m[1].match(/\/\^\(([a-z|]+)\)\$\/\.test\(k\)/)?.[1];
        const fb = m[1].match(/\.test\(k\)\?k:"([a-z]+)"/)?.[1];
        if (okDef && fb !== undefined && fb !== okDef) errors.push(`${f}: inline default skin "${fb}" does not match skinOk default "${okDef}" in assets/site.js`);
        if (list !== undefined && list.split("|").sort().join("|") !== want) errors.push(`${f}: inline skin list "${list}" does not match SKINS in assets/site.js`);
      }
    }
  }
} catch {}

try {
  const sm = (() => { try { return readFileSync(join(root, "sitemap.xml"), "utf8"); } catch { return ""; } })();
  const smBase = sm.match(/<loc>\s*(https?:\/\/[^<\s]*?\/)[^/<]*<\/loc>/)?.[1];
  for (const f of readdirSync(root).filter(f => f.endsWith(".html"))) {
    const h = readFileSync(join(root, f), "utf8");
    const img = h.match(/<meta property="og:image" content="([^"]*)"/)?.[1];
    if (!img) continue;
    const url = h.match(/<meta property="og:url" content="([^"]*)"/)?.[1] || h.match(/<link rel="canonical" href="([^"]*)"/)?.[1];
    const base = url ? url.replace(/[^/]*$/, "") : smBase;
    if (!base || !img.startsWith(base)) { errors.push(f + ": og:image " + img + " does not start with the site base URL " + base); continue; }
    const p = img.slice(base.length);
    if (!existsSync(join(root, p))) errors.push(f + ": og:image references missing " + p);
  }
} catch (e) { errors.push("og:image check failed: " + e.message); }

try {
  if (readFileSync(join(root, "admin/cms/config.yml"), "utf8").includes("YOUR_GITHUB_USERNAME"))
    console.warn("warning: admin/cms/config.yml still contains YOUR_GITHUB_USERNAME");
} catch {}

try {
  // Local link check: shells, site.js page literals, manifest icons, sitemap pages.
  const isLocal = u => u && !/^(https?:|\/\/|mailto:|tel:|#|data:|javascript:)/i.test(u);
  const missing = (src, u) => {
    const path = u.split("#")[0].split("?")[0].replace(/^\//, "");
    if (path && !existsSync(join(root, path))) errors.push(`${src}: references missing ${path}`);
  };
  for (const f of readdirSync(root).filter(f => f.endsWith(".html"))) {
    const html = readFileSync(join(root, f), "utf8").replace(/<script(?:\s[^>]*)?>[\s\S]*?<\/script>/gi, "");
    for (const m of html.matchAll(/(?:href|src)\s*=\s*"([^"]*)"/g)) if (isLocal(m[1])) missing(f, m[1]);
  }
  const js = readFileSync(join(root, "assets/site.js"), "utf8");
  for (const m of new Set([...js.matchAll(/["'`]([a-z0-9-]+\.html)(?:[?#"'`])/g)].map(m => m[1]))) missing("assets/site.js", m);
  for (const ic of JSON.parse(readFileSync(join(root, "manifest.webmanifest"), "utf8")).icons || []) if (isLocal(ic.src)) missing("manifest.webmanifest", ic.src);
  const sm2 = readFileSync(join(root, "sitemap.xml"), "utf8");
  for (const m of sm2.matchAll(/<loc>\s*https?:\/\/[^/<]+(?:\/[^/<]+)?\/?([^<]*?)\s*<\/loc>/g)) {
    const page = m[1].split("?")[0].split("#")[0] || "index.html";
    if (/\.html$/.test(page)) missing("sitemap.xml", page);
  }
} catch (e) { errors.push("link check failed (" + e.message + ")"); }

// Every top-level content key must be editable in both /admin/ and Decap (skipped when the editor files are absent).
try {
  const adm = join(root, "admin/admin.js"), cfg = join(root, "admin/cms/config.yml");
  if (existsSync(adm) && existsSync(cfg)) {
    const tabsText = readFileSync(adm, "utf8").split("const TABS = [")[1]?.split(/\r?\n\];/)[0];
    if (tabsText === undefined) errors.push("admin/admin.js: cannot find const TABS");
    else {
      const mk = t => (key) => ({ t, key });
      const tabs = new Function("str", "txt", "list", "pair", "data", "return [" + tabsText + "]")(mk("string"), mk("text"), mk("list"), [], {});
      const inAdmin = {};
      for (const t of tabs) for (const d of t.defs || []) (inAdmin[t.file] ||= new Set()).add(d.key);
      const inCms = {};
      const lines = readFileSync(cfg, "utf8").split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        const fm = lines[i].match(/^\s*file:\s*content\/([\w-]+)\.json\s*$/);
        if (!fm) continue;
        const names = (inCms[fm[1]] ||= new Set());
        let j = i + 1;
        while (j < lines.length && !/^\s*fields:\s*$/.test(lines[j])) j++;
        const ind = n => lines[n].match(/^\s*/)[0].length;
        const first = j + 1;
        if (first >= lines.length) continue;
        const base = ind(first);
        for (let k = first; k < lines.length; k++) {
          if (!lines[k].trim()) continue;
          if (ind(k) < base) break;
          if (ind(k) === base) { const nm = lines[k].match(/^\s*-\s*(?:\{\s*)?name:\s*([\w-]+)/); if (nm) names.add(nm[1]); }
        }
      }
      for (const [f, doc] of Object.entries(docs)) {
        const base = f.replace(/\.json$/, "");
        for (const k of Object.keys(doc || {})) {
          if (!inAdmin[base]?.has(k)) errors.push(`content/${f} key "${k}" is not editable in admin/admin.js`);
          if (!inCms[base]?.has(k)) errors.push(`content/${f} key "${k}" is not editable in admin/cms/config.yml`);
        }
      }
    }
  }
} catch (e) { errors.push("editor coverage check failed (" + e.message + ")"); }

if (errors.length) { console.error(errors.map(e => "error: " + e).join("\n")); process.exit(1); }
console.log("content ok");
