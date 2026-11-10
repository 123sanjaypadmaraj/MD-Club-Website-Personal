// Tests for check-content.mjs. Run: node --test scripts/*.test.mjs
import test from "node:test";
import assert from "node:assert";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./check-content.mjs", import.meta.url));
const BASE = "https://example.github.io/site/";
const sha = s => "'sha256-" + createHash("sha256").update(s).digest("base64") + "'";
const page = (body, script = "var a=1;") => `<meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' ${sha(script)}">${body}<script>${script}</script>`;
const pair = (a, b) => ({ [a]: "x", [b]: "y" });

function fixture(mutate) {
  const dir = mkdtempSync(join(tmpdir(), "cc-"));
  const f = {
    "content/events.json": { events: [{ slug: "ev1", name: "Ev", semester: "24-25 Odd Sem", description: "d", photos: ["photos/ev1/1.jpg"] }] },
    "content/site.json": {
      name: "n", full_name: "n", college: "c", college_short: "c", established: "2023", tagline: "t", instagram: "https://i.example/x", instagram_handle: "x",
      hero_title: "h", hero_lead: "l", why_title: "w", why_lead: "w", cta_title: "c", cta_text: "c",
      stats: [{ value: "1", label: "a" }], highlights: [pair("title", "text")], why: [pair("title", "text")],
      about: { who: "w", objective: "o", outcomes: "o", functions: [pair("title", "text")] },
      contact: { coordinators: "c", form_endpoint: "" }
    },
    "content/achievements.json": { stats: [{ value: "1", label: "a" }], apps: [pair("name", "text")] },
    "content/team.json": { current_year: "24-25", current: [{ name: "A", role: "R" }], earlier: [{ name: "B", role: "R", year: "23-24" }], galleries: [{ label: "G", photos: [] }] },
    "sitemap.xml": `<urlset><url><loc>${BASE}</loc></url><url><loc>${BASE}event.html?e=ev1</loc></url></urlset>`,
    "manifest.webmanifest": { icons: [{ src: "favicon.svg" }] },
    "favicon.svg": "<svg/>",
    "index.html": page('<a href="event.html?e=ev1">e</a>'),
    "event.html": page("<p>e</p>"),
    "assets/site.js": 'const a = "event.html";',
    "photos/ev1/1.jpg": "x"
  };
  mutate?.(f);
  for (const [name, val] of Object.entries(f)) {
    if (val === null) continue;
    const path = join(dir, name);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, typeof val === "string" ? val : JSON.stringify(val));
  }
  return dir;
}

function run(mutate) {
  const dir = fixture(mutate);
  try {
    const r = spawnSync(process.execPath, [script, dir], { encoding: "utf8" });
    return { code: r.status, out: r.stdout + r.stderr };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

const fails = (r, text) => { assert.strictEqual(r.code, 1, r.out); assert.match(r.out, text); };

test("valid fixture passes", () => {
  const r = run();
  assert.strictEqual(r.code, 0, r.out);
  assert.match(r.out, /content ok/);
});
test("duplicate slug", () => fails(run(f => { const e = f["content/events.json"].events; e.push({ ...e[0] }); }), /duplicate slug/));
test("bad slug", () => fails(run(f => { f["content/events.json"].events[0].slug = "My Event"; }), /slug must match/));
test("bad semester", () => fails(run(f => { f["content/events.json"].events[0].semester = "Fall 2025"; }), /semester must look like/));
test("data: photo", () => fails(run(f => { f["content/events.json"].events[0].photos = ["data:image/jpeg;base64,AAA"]; }), /data: URL/));
test("missing photo file", () => fails(run(f => { f["content/events.json"].events[0].photos = ["photos/ev1/9.jpg"]; }), /not found on disk/));
test("gif photo", () => fails(run(f => { f["content/events.json"].events[0].photos = ["photos/ev1/1.gif"]; f["photos/ev1/1.gif"] = "x"; }), /unsupported image type/));
test("event missing from sitemap", () => fails(run(f => { f["sitemap.xml"] = `<urlset><url><loc>${BASE}</loc></url></urlset>`; }), /sitemap\.xml: missing event\.html\?e=ev1/));
test("unused photo is a warning only", () => {
  const r = run(f => { f["photos/ev1/2.jpg"] = "x"; });
  assert.strictEqual(r.code, 0, r.out);
  assert.match(r.out, /warning: photos\/ev1\/2\.jpg is not used/);
});
test("team member without a name", () => fails(run(f => { f["content/team.json"].current[0].name = ""; }), /team\.json current #1 .*missing name/));
test("team gallery without a label", () => fails(run(f => { delete f["content/team.json"].galleries[0].label; }), /gallery #1: missing label/));
test("team gallery duplicate label", () => fails(run(f => { const g = f["content/team.json"].galleries; g.push({ label: "G", photos: [] }); }), /gallery #2 \(G\): duplicate label/));
test("team gallery photos not an array", () => fails(run(f => { f["content/team.json"].galleries[0].photos = "photos/ev1/1.jpg"; }), /gallery #1 \(G\): photos must be an array/));
test("team gallery photo missing on disk", () => fails(run(f => { f["content/team.json"].galleries[0].photos = ["photos/team/9.jpg"]; }), /team\.json gallery #1 \(G\): photo not found on disk: photos\/team\/9\.jpg/));
test("team gallery gif photo", () => fails(run(f => { f["content/team.json"].galleries[0].photos = ["photos/team/1.gif"]; f["photos/team/1.gif"] = "x"; }), /gallery #1 \(G\): unsupported image type/));
test("team gallery with an existing photo passes", () => {
  const r = run(f => { f["content/team.json"].galleries[0].photos = ["photos/team/1.jpg"]; f["photos/team/1.jpg"] = "x"; });
  assert.strictEqual(r.code, 0, r.out);
  assert.match(r.out, /content ok/);
  assert.doesNotMatch(r.out, /not used by any/);
});
test("site.json missing about.functions", () => fails(run(f => { delete f["content/site.json"].about.functions; }), /about\.functions must be an array/));
test("bad contact email", () => fails(run(f => { f["content/site.json"].contact.email = "not-an-email"; }), /contact.email is not a valid/));
test("bad contact phone", () => fails(run(f => { f["content/site.json"].contact.phone = "call me"; }), /contact.phone is not a valid/));
test("empty email and phone pass", () => { const r = run(f => { f["content/site.json"].contact.email = ""; f["content/site.json"].contact.phone = ""; }); assert.strictEqual(r.code, 0, r.out); });
test("college_page must be https", () => fails(run(f => { f["content/site.json"].college_page = "http://x.example"; }), /college_page must be empty or start with https/));
test("empty form_endpoint only warns", () => { const r = run(); assert.strictEqual(r.code, 0, r.out); assert.match(r.out, /warning: site.json: contact.form_endpoint is empty/); });
test("site.json form_endpoint must be https", () => fails(run(f => { f["content/site.json"].contact.form_endpoint = "http://x"; }), /form_endpoint must be empty or start with https/));
test("achievements app without a name", () => fails(run(f => { delete f["content/achievements.json"].apps[0].name; }), /achievements\.json: apps\[0\] missing name/));
test("broken link in a page", () => fails(run(f => { f["index.html"] = '<a href="missing.html">x</a>'; }), /index\.html: references missing missing\.html/));
test("page literal in site.js with no file", () => fails(run(f => { f["assets/site.js"] = 'const a = "nope.html";'; }), /assets\/site\.js: references missing nope\.html/));
test("sitemap page with no file", () => fails(run(f => { f["sitemap.xml"] += `<url><loc>${BASE}team2.html</loc></url>`; }), /sitemap\.xml: references missing team2\.html/));

test("inline script with a stale CSP hash", () => fails(run(f => { f["index.html"] = f["index.html"].replace("var a=1;", "var a=2;"); }), /index\.html: inline script hash .* not in its Content-Security-Policy/));
test("page without a CSP meta", () => fails(run(f => { f["index.html"] = "<p>x</p>"; }), /index\.html: missing Content-Security-Policy/));
test("external script without integrity", () => fails(run(f => { f["admin/cms/index.html"] = page('<script src="https://cdn.example/x.js"></script>'); }), /admin\/cms\/index\.html: external script .* has no integrity/));
test("external script with integrity passes", () => {
  const r = run(f => { f["admin/cms/index.html"] = page('<script src="https://cdn.example/x.js" integrity="sha384-abc" crossorigin="anonymous"></script>'); });
  assert.strictEqual(r.code, 0, r.out);
});
test("og:image pointing at a missing file", () => fails(run(f => { f["index.html"] = page('<meta property="og:url" content="' + BASE + '"><meta property="og:image" content="' + BASE + 'photos/nope.jpg">'); }), /index\.html: og:image references missing photos\/nope\.jpg/));
test("og:image that exists passes", () => {
  const r = run(f => { f["index.html"] = page('<meta property="og:url" content="' + BASE + '"><meta property="og:image" content="' + BASE + 'photos/ev1/1.jpg">'); });
  assert.strictEqual(r.code, 0, r.out);
});

// Editor coverage: every top-level content key must be editable in admin/admin.js and admin/cms/config.yml.
const withEditors = (adminKeys, cmsKeys) => f => {
  f["admin/admin.js"] = "const str = 1;\nconst TABS = [\n" + [
    ["events", ["events"]], ["site", adminKeys.site], ["team", adminKeys.team], ["achievements", adminKeys.achievements]
  ].map(([file, ks]) => `  { id: "${file}", label: "L", file: "${file}", defs: [${ks.map(k => `str("${k}", "L")`).join(", ")}] },`).join("\n") + "\n];\n";
  const block = (file, ks) => `      - name: ${file}\n        file: content/${file}.json\n        fields:\n${ks.map(k => `          - { name: ${k}, label: L, widget: string }`).join("\n")}\n`;
  f["admin/cms/config.yml"] = "collections:\n  - name: pages\n    files:\n" + block("events", ["events"]) + block("site", cmsKeys.site) + block("team", cmsKeys.team) + block("achievements", cmsKeys.achievements);
};
const SITE_KEYS = ["name", "full_name", "college", "college_short", "established", "tagline", "instagram", "instagram_handle", "hero_title", "hero_lead", "why_title", "why_lead", "cta_title", "cta_text", "stats", "highlights", "why", "about", "contact"];
const ALL = { site: SITE_KEYS, team: ["current_year", "current", "earlier", "galleries"], achievements: ["stats", "apps"] };
test("editors that cover every content key pass", () => {
  const r = run(withEditors(ALL, ALL));
  assert.strictEqual(r.code, 0, r.out);
});
test("content key missing from admin.js", () => fails(run(withEditors({ ...ALL, team: ["current_year", "current", "earlier"] }, ALL)), /team\.json key "galleries" is not editable in admin\/admin\.js/));
test("content key missing from config.yml", () => fails(run(withEditors(ALL, { ...ALL, achievements: ["stats"] })), /achievements\.json key "apps" is not editable in admin\/cms\/config\.yml/));

const skinPage = list => page("<p>e</p>", `try{var k=localStorage.getItem("skin");document.documentElement.dataset.skin=/^(${list})$/.test(k)?k:"nebula"}catch(e){}`);
const skinSite = 'const a = "event.html"; const SKINS = [["nebula","Nebula"],["ocean","Ocean"]];';
test("inline skin list that does not match SKINS fails", () => fails(run(f => { f["assets/site.js"] = skinSite; f["index.html"] = skinPage("nebula|ocean|solar"); }), /does not match SKINS/));
test("inline skin list matching SKINS passes", () => { const r = run(f => { f["assets/site.js"] = skinSite; f["index.html"] = skinPage("ocean|nebula"); f["assets/style.css"] = ":root[data-skin=nebula]{}:root[data-skin=ocean]{}"; }); assert.strictEqual(r.code, 0, r.out); });
const skinSite2 = 'const a = "event.html"; const SKINS = [["nebula","Nebula"],["ocean","Ocean"]]; const skinOk = k => SKINS.some(s => s[0] === k) ? k : "nebula";';
const skinCss = ":root[data-skin=nebula]{}:root[data-skin=ocean]{}";
test("inline default skin that differs from skinOk fails", () => fails(run(f => { f["assets/site.js"] = skinSite2; f["assets/style.css"] = skinCss; f["index.html"] = skinPage("nebula|ocean").replace('?k:"nebula"', '?k:"ocean"'); }), /does not match skinOk default/));
test("inline default skin matching skinOk passes", () => { const r = run(f => { f["assets/site.js"] = skinSite2; f["assets/style.css"] = skinCss; f["index.html"] = skinPage("nebula|ocean"); }); assert.strictEqual(r.code, 0, r.out); });
const ld = o => `<script type="application/ld+json">${JSON.stringify({ name: "n", alternateName: "n", foundingDate: "2023", sameAs: ["https://i.example/x"], parentOrganization: { name: "c" }, ...o })}</script>`;
test("JSON-LD foundingDate that differs from site.json fails", () => fails(run(f => { f["index.html"] = ld({ foundingDate: "2020" }) + f["index.html"]; }), /JSON-LD foundingDate does not match/));
test("JSON-LD matching site.json passes", () => { const r = run(f => { f["index.html"] = ld({}) + f["index.html"]; }); assert.strictEqual(r.code, 0, r.out); });

test("noscript fallback without the site.json instagram link fails", () => fails(run(f => { f["index.html"] = page("<noscript><p>needs JS</p></noscript>"); }), /noscript> fallback does not link site.json instagram/));

test("noscript fallback without the site.json college_page link fails", () => fails(run(f => { f["content/site.json"].college_page = "https://college.example/club/"; f["index.html"] = page('<noscript><a href="https://i.example/x">ig</a></noscript>'); }), /does not link site.json college_page/));

test("announcement with an http link fails", () => fails(run(f => { f["content/site.json"].announcement = { text: "Hi", link: "http://x.example", link_label: "" }; }), /announcement\.link must start with https/));
test("announcement link without text fails", () => fails(run(f => { f["content/site.json"].announcement = { text: "", link: "events.html", link_label: "" }; }), /announcement\.text is empty/));
test("empty announcement passes", () => { const r = run(f => { f["content/site.json"].announcement = { text: "", link: "", link_label: "" }; }); assert.strictEqual(r.code, 0, r.out); });
