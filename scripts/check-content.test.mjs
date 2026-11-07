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
test("site.json missing about.functions", () => fails(run(f => { delete f["content/site.json"].about.functions; }), /about\.functions must be an array/));
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
