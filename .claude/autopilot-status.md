# Autopilot status

Project: MAD Club website (Mobile App Development Club, New Horizon College of Engineering).
Static HTML/CSS/JS, no build step, deployed to GitHub Pages via `.github/workflows/pages.yml`.

Redesign ground rules (apply to every task below):
- No emojis anywhere (content, JS templates, CSS `content:`), and no emoji-like decorative pictographs.
- No AI-generated or placeholder logos. The brand is a plain typographic wordmark set in the site's own type.
- No gradient blobs, no purple/cyan gradients, no gradient text. Flat colour, one accent, real hierarchy.
- Stay static: plain HTML/CSS/vanilla JS, no framework, no bundler, no npm.
- Content facts must stay accurate: est. 2023, 150+ participants per event, 4 flagships (Mindspark'23, InnoWave'24, TechSync'24, Connect'24), TechSync'24 with 4 clubs, 11 core-team roles, Instagram @md_club_nhce, the existing event list in `assets/site.js` EVENTS and the team names in `team.html`. Do not invent new numbers, quotes, sponsors, dates or people.

Design decisions already made (so no task needs to ask):
- Type: IBM Plex Sans (400/500/600/700) for text and headings, IBM Plex Mono (400/500) for labels, numbers and the tagline; loaded from Google Fonts with `display=swap` and a system-ui / ui-monospace fallback stack.
- Colour: light theme is the default (also follow `prefers-color-scheme`, then the saved toggle). Light: background #FAFAF7, surface #FFFFFF, text #111418, muted #5A616B, border #E3E3DE. Dark: background #0F1113, surface #171A1D, text #ECEDEE, muted #9BA1A8, border #2A2E33. Single accent: #C2410C (burnt orange) in light, #F97316 in dark; used only for links, active nav, focus rings, primary button and small labels. All text/background pairs must meet WCAG AA.
- Shape: radius 6px for cards/buttons/inputs (no 18-28px pill-ish cards), 1px borders, no drop-shadow glow, hover = border/underline change, not lift-and-scale.
- Wordmark: the text "MAD Club" in Plex Sans 700 with tight letter-spacing, optionally followed by a small mono "NHCE" label. No box, badge, monogram tile or image.
- Card icons are replaced by a small mono index label ("01", "02", ...) or nothing; no icon font, no SVG icon set.

## Task list

Finished tasks: `.claude/autopilot-log-archive.md` under Archived tasks (moved verbatim). Planners must check it for duplicates.

- [done] **Archive finished tasks and older run-log entries so this status file fits in one read again**
  After the first archive pass the file is back to 334 lines (about 35K tokens, over the 25K single-Read cap), and most of that is the Task list itself: about 45 `[done]` or `[blocked: superseded ...]` entries. Moving the log alone cannot make it fit, so this pass also moves finished tasks. In `.claude/autopilot-log-archive.md`, add a `## Archived tasks` section (above the existing log entries, below the heading/note) and move into it, verbatim and in their current order, every Task list entry whose status is `done` or `blocked: superseded by skins/CMS direction (2026-10-29)`; leave any `pending`, `in-progress` or other `blocked` entry in place. Under `## Task list` in `autopilot-status.md` add one line: "Finished tasks: `.claude/autopilot-log-archive.md` under Archived tasks (moved verbatim). Planners must check it for duplicates." Then move `### ` Run log entries, oldest first and verbatim, to the archive's log section (after its existing entries) until at most the newest 6 remain. Do not change the header rules, design decisions or the text of any moved item. Status-file-only task: no application code. Done when a plain Read of `autopilot-status.md` returns the whole file with no truncation notice, `grep -c "^### "` summed across both files is unchanged (51 at planning time: 22 + 29, use the count at run time), `grep -c "^- \[" ` summed across both files is unchanged, and every moved block is byte-identical (check by diffing against a backup copy kept in the scratchpad).


## Run log
Older entries: `.claude/autopilot-log-archive.md` (moved verbatim)

### 2026-11-07 - planner run 18 (after autopilot run 15)
- Surveyed: this file in full (it took two Reads, because it is past the single-read cap), `git log --oneline -30` (latest 5e237ad CSP + SRI), `git diff --stat` (the user's team-gallery work and the uncommitted `pages.yml`/README/`check-content.mjs`/test edits are still in the working tree), directory listing, `.github/workflows/pages.yml` (syntax check, tests, content check, smoke test, staging, concurrency all present), gallery `<img>` markup in `assets/site.js` (433 lines) and the gallery CSS. TODO/FIXME/XXX grep across js/mjs/html/yml: no matches.
- Backlog state: 1 pending task (smoke test runtime-error/CSP/ready markers).
- Added 1 task: archive old run-log entries into `.claude/autopilot-log-archive.md`. The status file is now about 48K tokens, roughly twice the single-Read cap, so every session has to page through it, and a session that stops after the first page misses the newest log entries and pending notes. This is new. No earlier run proposed or rejected it. It moves entries verbatim, so no history is lost, and the task list stays untouched.
- Checked, no task needed: gallery images already use `loading="lazy"`/`decoding="async"`, and `.shot` has a fixed `aspect-ratio`, so there is no layout shift. The CI pipeline already covers syntax, tests, content, rendering and deploy serialization.
- Deliberately not added: the same items rejected in earlier runs (compression/thumbnails/`srcset`, preloading, PR workflow, service worker, prerendering, real `/admin/` auth, JSON-LD without dates, JS-set `og:image`, cache-busting query strings, a 360px overflow check in the smoke test). Nothing else was worth adding beyond the pending smoke-marker task.
- Reminder carried over for the user: commit the team-gallery work and the uncommitted `pages.yml`/`check-content.mjs`/test changes before merging this branch.

### 2026-11-07 - autopilot run 16 (branch autopilot/md-club-redesign)
- Picked up: archive old run-log entries. Moved the 29 oldest `### ` entries verbatim to `.claude/autopilot-log-archive.md`; 18 stay here (47 before, 18 + 29 after). The Task list section is unchanged (diffed against a backup). A plain Read now returns the whole file.
- Committed this file and the archive. Not pushed.
- Still pending: smoke test runtime-error capture (it needs an edit to `assets/site.js`, which holds the user's uncommitted team-gallery work).

### 2026-11-07 - autopilot run 17 (branch autopilot/md-club-redesign)
- Picked up: smoke test runtime-error and empty-render detection.
- Did: top of `assets/site.js` records uncaught errors, unhandled rejections and CSP violations as `data-js-error` / `data-csp-violation` on `<html>`, and sets `data-ready="1"` after the bootstrap renders; `scripts/smoke.mjs` fails on any of those or a missing ready flag, and checks `events.html` shows "n of n events" and `team.html` has as many `.shot` buttons as `team.json` lists; `pages.yml` syntax-check step also covers `smoke.mjs` and `check-content.test.mjs`.
- Verification (no test suite): `node --check` ok on both scripts; smoke 17 pages ok. With a temporary `setTimeout(() => { throw new Error("x") })` in `wireEvents` (reverted) every page FAILs with "JS error: Uncaught Error: x". Note: a throw directly inside `wireEvents` is caught by the bootstrap `try/catch`, which already shows "Could not load content" and fails the old check, so the async throw is the case this task adds.
- NOT committed: `assets/site.js`, `scripts/smoke.mjs`'s new checks are committed-file edits but `smoke.mjs` is committed below; `site.js` and `pages.yml` stay in the working tree beside the user's team-gallery work and another session's test step. Not pushed.
- Backlog is empty. Next planner run should add nothing unless there is a clearly new idea.

### 2026-11-07 - planner run 19 (after autopilot run 17)
- Surveyed: this file in full (two Reads, it is past the cap again at about 32K tokens), archive grep for earlier rejections (og:image, srcset, axe, offline, integrity), README, `.github/workflows/pages.yml`, `git log --oneline -30` (latest 6de7ec6), `git status` (the user's team-gallery work plus uncommitted `pages.yml`/README/`check-content.mjs`/`site.js` edits and the untracked test file are still in the working tree), shell `<head>` meta, the CSP guard in `check-content.mjs`, test coverage in `check-content.test.mjs` (17 tests, none for CSP), photo sizes and dimensions. Viewed `photos/mindspark23/14.jpg` and `3.jpg` to choose a preview image. TODO/FIXME/XXX grep: no matches.
- Added 2 tasks:
  1. Static `og:image` (+ `summary_large_image`) in every shell, using the real 1280x720, 120 KB group photo `photos/mindspark23/14.jpg`, with a check that the path exists. New angle on the earlier rejection: runs 9/10 rejected a JS-set or per-event `og:image` because scrapers do not run JS. A static tag in the raw HTML does not depend on JS, and shared links currently show no picture at all.
  2. Tests for the CSP hash guard plus a required `integrity` on external scripts. The guard landed after the test file and has no coverage, and nothing stops a future Decap bump from dropping the SRI.
- Deliberately not added: committing the user's uncommitted work (only they can); the items rejected in earlier runs (compression/thumbnails/`srcset`, preloading, PR workflow, service worker, prerendering, real `/admin/` auth, JSON-LD without dates, JS-set or per-event `og:image`, cache-busting, a 360px overflow smoke check, a marquee pause control); an axe/Lighthouse CI step (needs npm). The status file is past the read cap again, but the archive task just ran and the cap is about fitting the newest entries, so I did not queue a second archive pass yet. A later run can repeat the same procedure if it grows further.
- Suggested order: the CSP/integrity tests first (tests only, low risk), then the `og:image` task, which adds its own fixture test.

### 2026-11-07 - autopilot run 18 (branch autopilot/md-club-redesign)
- Picked up: CSP guard tests plus integrity check; static `og:image` in every shell.
- Did: `check-content.mjs` now fails on an external `<script src="https://...">` without `integrity` (root and `admin/**` HTML) and on an `og:image` whose base differs from the site base or whose file is missing; `check-content.test.mjs` fixture pages now carry a CSP and 6 new tests were added (23 total); all 8 shells have `og:image` (`photos/mindspark23/14.jpg`), width/height/alt and `twitter:card` `summary_large_image`; README step 2 mentions `og:image`.
- Verification: `node --test scripts/*.test.mjs` 23 pass, 0 fail; check-content "content ok"; smoke 17 pages ok; `node --check` ok. Not verified: a real link preview on WhatsApp/Instagram (needs the deployed site).
- Committed: shells, `check-content.mjs`, `check-content.test.mjs`, README, this file. NOT committed: `.github/workflows/pages.yml` (test, smoke and wider syntax-check steps) and `assets/site.js`. The committed `smoke.mjs` needs the uncommitted `data-ready` line in `site.js`, so the user must commit `site.js` (with their team-gallery work) before or together with `pages.yml`, or CI will fail on main. Not pushed.
- Status file is over the single-read size again; a second archive pass would help. Backlog is empty.

### 2026-11-07 - planner run 20 (after autopilot run 18)
- Surveyed: this file in full (two Reads, it is about 35K tokens), the archive's rejection lines, `git log --oneline -30` (latest 73c0750 og:image + CSP/integrity tests), `git diff --stat` (still uncommitted: `pages.yml`, `assets/site.js`, `content/team.json`, `admin/cms/config.yml`, untracked `photos/team/`), directory listing, `### ` entry counts (22 here, 29 in the archive). TODO/FIXME/XXX grep across js/mjs/html/yml: no matches.
- Added 1 task: a second archive pass that also moves finished Task list entries, verbatim, to the archive. Autopilot run 18 flagged that the file is past the read cap again. The first pass moved only log entries, and the done-task list alone now takes most of the cap, so repeating the same procedure would not be enough. The new angle is moving finished tasks too, with a pointer line so planners still deduplicate against them.
- Deliberately not added: any application feature. The site already has CI syntax checks, tests, content/link/CSP/og:image validation, a smoke test, deploy serialization, and the lightbox, sharing, deep-link and a11y work. Every other gap I considered was rejected in earlier runs: compression/thumbnails/`srcset`, preloading, PR workflow, service worker, prerendering, real `/admin/` auth, JSON-LD without dates, per-event `og:image`, cache-busting, a 360px overflow smoke check, a marquee pause control, and axe/Lighthouse in CI (needs npm).
- Reminder for the user (not an autopilot task): commit `assets/site.js` (team-gallery work plus the `data-ready` line), `content/team.json`, `admin/cms/config.yml`, `photos/team/` and `.github/workflows/pages.yml` together before merging. The committed `smoke.mjs` needs the uncommitted `data-ready` line, so CI on main would fail without it.

### 2026-11-07 - autopilot run 19 (branch autopilot/md-club-redesign)
- Picked up: archive finished tasks and older log entries.
- Did: moved 50 done/superseded task entries (verbatim, in order) to `## Archived tasks` in `.claude/autopilot-log-archive.md` and the 17 oldest run-log entries to its `## Archived run log` section; `autopilot-status.md` keeps the header rules, design decisions, a pointer line under Task list, this task, and the newest 6 log entries (about 13 KB, reads in one go). Entry counts unchanged: 52 `### ` entries (23 + 29 before, 6 + 46 after) and 51 task entries. Moved blocks checked against a backup; only the archive headings and the new pointer line differ.
- Committed `.claude/` status and archive only. Not pushed.
- Backlog is empty. Uncommitted work for the user to commit together: `assets/site.js`, `.github/workflows/pages.yml`, `content/team.json`, `admin/cms/config.yml`, `photos/team/`. The committed `smoke.mjs` needs the `data-ready` line in `site.js`.

### 2026-11-09 - planner run 21 (after autopilot run 19)
- Surveyed: this file in full (one Read, the archive pass worked), `git log --oneline -30` (latest 613d3a1, the archive commit; no application changes since planner run 20), `git status`/`git diff --stat` (the same uncommitted user work: `site.js`, `pages.yml`, `team.json`, `admin/cms/config.yml`, untracked `photos/team/` with 23-24..26-27 and investiture), directory listing, `scripts/` (check-content, its tests, smoke), `### ` counts (7 here, 46 in the archive). TODO/FIXME/XXX grep across js/mjs/html/yml/json: no matches.
- Added 0 tasks. Nothing in the project has changed since planner run 20 found no feature gaps. CI already covers syntax, unit tests, content/link/CSP/integrity/og:image checks and a headless smoke test. Every other idea I considered was rejected in earlier runs (see run 20's list: compression/thumbnails/`srcset`, preloading, PR workflow, service worker, prerendering, `/admin/` auth, JSON-LD without dates, per-event `og:image`, cache-busting, 360px overflow smoke check, marquee pause, axe/Lighthouse needing npm). The file is small again, so no archive pass is needed.
- Not added: committing the user's uncommitted work, because only the user can do that. Reminder: commit `assets/site.js` (with the `data-ready` line), `pages.yml`, `team.json`, `admin/cms/config.yml` and `photos/team/` together before merging. Otherwise CI on main fails the smoke test.

### 2026-11-09 - planner run 22b (concurrent with run 22)
- A second planner session ran at the same time as run 22. It also surveyed the full `git diff` of the uncommitted `site.js` (team galleries, `?q=` search in the URL, lightbox prev/next/swipe/deep links, `data-ready`) and `admin/cms/config.yml` (galleries field). It found no gap that isn't already validated or already rejected and agrees with run 22 (0 tasks added). In `photos/team/26-27`, seven PNGs are over 1 MB each (12 MB total), and those are the best candidates for converting to JPEG.

### 2026-11-09 - planner run 22 (after autopilot run 19)
- Surveyed: this file in full (one Read), `git log --oneline -30` (latest is still 613d3a1, so no commits since planner run 21), `git status`/`git diff --stat` (the same uncommitted user work: `site.js` +66, `team.json` +142, `admin/cms/config.yml`, `pages.yml`, untracked `photos/team/` at 28 MB), directory listing, team-photo sizes, the team.json checks in `scripts/check-content.mjs` (name/role/year/label/photos-array/duplicate-label plus photo existence, type and the 500 KB warning are all present), and the archive's rejection and size-warning history. TODO/FIXME/XXX grep across js/mjs/html/yml/json: no matches.
- Added 0 tasks. The project is unchanged since run 21, which found no gaps, and the backlog's only entry is done.
- Considered and rejected: recompressing the many 400 KB-1 MB team PNGs, because compression was rejected earlier (no npm or build tools, so the user has to do it) and check-content already warns about each oversized file. Also rejected again: the earlier list (thumbnails/`srcset`, preloading, PR workflow, service worker, prerendering, `/admin/` auth, JSON-LD without dates, per-event `og:image`, cache-busting, 360px overflow smoke check, marquee pause, axe/Lighthouse needing npm).
- Reminder for the user, unchanged: commit `assets/site.js` (with the `data-ready` line), `pages.yml`, `team.json`, `admin/cms/config.yml` and `photos/team/` together before merging. Converting the team PNGs to JPEG before committing would cut most of the 28 MB. Future planner runs should add nothing until new commits land.

### 2026-11-09 - autopilot run 20 (branch autopilot/md-club-redesign)
- Picked up: nothing. The only task is done and planner run 22 added none. No in-progress tasks to re-check.
- Did: no code changes, no tests run, nothing committed or pushed.
- Next session: still nothing to do until the user commits their uncommitted work (`assets/site.js`, `pages.yml`, `team.json`, `admin/cms/config.yml`, `photos/team/`) together.

### 2026-11-09 - planner run 23 (after autopilot run 20)
- Surveyed: this file in full (one Read), `git log --oneline -30` (latest is still 613d3a1, no commits since planner runs 21/22), `git diff --stat` (the same uncommitted user work: `site.js` +66, `team.json` +142, `admin/cms/config.yml`, `pages.yml`, untracked `photos/team/` with 23-24/24-25/25-26/26-27/investiture), directory listing. TODO/FIXME/XXX grep across js/mjs/html/yml/json/css/md: matches only in `.claude/` status and archive files, none in project code.
- Added 0 tasks. Nothing has changed since runs 21 and 22, which found no gaps. The earlier rejection list still applies (compression/thumbnails/`srcset`, preloading, PR workflow, service worker, prerendering, `/admin/` auth, JSON-LD without dates, per-event `og:image`, cache-busting, 360px overflow smoke check, marquee pause, axe/Lighthouse needing npm, team PNG recompression).
- Reminder for the user, unchanged: commit `assets/site.js` (with the `data-ready` line), `pages.yml`, `team.json`, `admin/cms/config.yml` and `photos/team/` together before merging, or CI on main will fail the smoke test. Planner runs should keep adding nothing until new commits land.

### 2026-11-09 - planner run 24 (after autopilot run 20)
- Surveyed: this file in full (two Reads, because other planner runs appended to it while this one was working), `git log --oneline -30` (latest is still 613d3a1), `git diff --stat` and the `pages.yml` diff (same uncommitted user work), README, `sitemap.xml`, `manifest.webmanifest`, `robots.txt`, `favicon.svg`, the reduced-motion and print rules in `style.css`, and the Decap `<script>` tag. I checked the README claims (four skins, Ctrl+K, tilt) against `site.js`, and they match. I also grepped the archive for ideas no earlier run had covered. TODO/FIXME/XXX: none in project code.
- Added 0 tasks. Nothing has changed since runs 20-23.
- New ideas considered and rejected, recorded here so later runs skip them: (1) a PNG `apple-touch-icon`/manifest icon. iOS ignores SVG on the home screen, but rasterizing without npm needs a headless-Chrome screenshot step, which is too much work for a club site. (2) `<lastmod>` in `sitemap.xml`. Without event dates (an earlier rejection) it could only repeat commit dates, which tells search engines nothing. (3) Dependabot or automated Decap bumps. It cannot track a pinned unpkg `<script>` with SRI, and a bump needs a hand-recomputed hash anyway. (4) More print styles. A minimal `@media print` rule already exists, and printing is unlikely.
- Note: planner runs 22 (twice), 23 and this one all ran on the same day with no new commits. The scheduler is running the planner more often than the project changes.
- Note: this file has two "planner run 22" entries written by separate sessions. They have different text, so they are not exact duplicates and I left both in place.
