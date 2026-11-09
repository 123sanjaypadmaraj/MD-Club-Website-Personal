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

- [done] **Archive finished tasks and older run-log entries again (third pass) so this status file fits in one Read**
  The file is past the single-Read cap again (about 27K tokens, 280 lines at planning time), so a plain Read truncates and the newest log entries are missed. Repeat the archived procedure exactly: move every `[done]` Task list entry above this one, verbatim and in order, to the end of `## Archived tasks` in `.claude/autopilot-log-archive.md`, and move `### ` Run log entries oldest first, verbatim, to the end of the archive's `## Archived run log` section until at most the newest 6 remain. Leave the header rules, design decisions, the pointer line, this entry and any `pending`/`in-progress`/other `blocked` entry in place, then mark this entry done. Status-file-only task: no application code. Done when a plain Read of `autopilot-status.md` returns the whole file with no truncation notice, and `grep -c "^### "` and `grep -c "^- \["` summed across both files are unchanged from their values just before the move (use the counts at run time, since other sessions append), and each moved block is byte-identical to a scratchpad backup.

- [done] **Fail the content check when the inline `<head>` default skin differs from `site.js`**
  README "Looks" tells editors to change the default skin in two places (each shell's inline script and `assets/site.js`), and the existing skin-list check in `scripts/check-content.mjs` (around line 133) compares only the allowed list, not the fallback. If the two defaults drift, a first-time visitor sees one skin painted and then switched to the other. Extend that same `try` block: take the default from `site.js` with `/const skinOk = [^\n]*\?\s*k\s*:\s*"([a-z]+)"/`, and for each root `*.html` inline script that matches the existing list regex, take its fallback with `/\.test\(k\)\?k:"([a-z]+)"/`. Push `<file>: inline default skin "<x>" does not match skinOk default "<y>" in assets/site.js` when they differ, and `assets/site.js: default skin "<y>" is not in SKINS` when the `site.js` default is not a SKINS key. Skip silently when either regex finds nothing, so existing fixtures pass. Add 2 fixture tests to `scripts/check-content.test.mjs` in the existing style (a mismatched inline default fails with `/does not match skinOk default/`, a matching one passes). Do not change any HTML shell or `site.js`, so no CSP hashes change. Done when `node scripts/check-content.mjs` prints "content ok" on the current tree, changing `:"nebula"` to `:"ocean"` in a scratch copy of `about.html` makes it exit 1 with that message, and `node --test scripts/*.test.mjs` passes with 2 more tests than before (33 at planning time).

## Run log
Older entries: `.claude/autopilot-log-archive.md` (moved verbatim)

### 2026-11-09 - autopilot run 23 (branch autopilot/md-club-redesign)
- Picked up: both planner run 34 tasks, `?skin=` smoke test and the inline `<head>` skin script.
- Did: `scripts/smoke.mjs` now checks `about.html?skin=<k>` for every skin read from `SKINS` (data-skin, pressed button, `theme-color` equals that skin's `--bg` from `style.css`), the unknown-skin fallback and the skin surviving the Events `?y=` rewrite. The inline script in all 8 root shells now reads `?skin=` before localStorage (same precedence as `site.js`), with CSP hashes recomputed. `check-content.mjs` checks the inline skin list against `SKINS` and that each skin has a `:root[data-skin=<k>]` rule (skipped when `site.js` has no `SKINS`), with 2 new fixture tests.
- Tests: `node scripts/smoke.mjs` 34 pages ok, `node --test scripts/*.test.mjs` 33 pass (2 more), `node scripts/check-content.mjs` "content ok", `node --check` ok. Renaming the ocean rule in `style.css` made the ocean smoke check FAIL (reverted, `git diff assets/` empty at that point). A throwaway script run against the extracted inline script gave solar, nebula, ocean, nebula for the four cases in the task, all as expected.
- Not pushed; waiting on the user's go-ahead.

### 2026-11-09 - planner run 35 (after autopilot run 23, commit 231fc7d)
- Surveyed: this file in full (re-checked right before editing, no concurrent appends), archive greps for staging/`_site`/manifest/404/link-check ideas and rejections, `git log --oneline -30` (latest 231fc7d, the inline `?skin=` fix; only `.claude/scheduled_tasks.lock` is modified), `.github/workflows/pages.yml`, the server, URL list and main loop in `scripts/smoke.mjs`, `pages.contact`/`pages.notfound`/`wireContactForm` in `assets/site.js`, `404.html`, `manifest.webmanifest`. TODO/FIXME/XXX: none in project code.
- Added 1 task: run the smoke test against the staged `_site` (the files actually deployed) and fail on any same-origin 404 seen by the smoke server. This angle is new. The archived static link check (shell `href`/`src`, manifest icons, sitemap) only reads files on disk in the repo root, so it misses runtime-requested URLs and anything left out of the `cp` list in `pages.yml`. No earlier run proposed or rejected this.
- Deliberately not added: everything on run 20's rejection list plus run 24's additions, team PNG recompression, smoke-testing the Ctrl+K palette or tilt (run 34), a contact-form submit test (needs a network endpoint, run 29), the static `theme-color` mismatch (run 34), and the `current_year` vs. "Team 2026-27" mismatch (only the user can decide it). The Team page group chips are also left untested because they are a purely visual filter with no URL state. With this task done, the deploy path is covered end to end, so later planner runs should add nothing until new application commits land.

### 2026-11-09 - autopilot run 24 (branch autopilot/md-club-redesign)
- Picked up: run the smoke test against the staged `_site` and fail on same-origin 404s.
- Did: `scripts/smoke.mjs` takes `SMOKE_ROOT` (default: repo root), records every 404 the static server returns per page and fails that page with `404: <path>` (favicon.ico exempt, max 5 listed); `pages.yml` stages `_site` before the smoke step and runs `SMOKE_ROOT=_site node scripts/smoke.mjs`.
- Real bug found and fixed: the new check flagged `admin/photos/...` 404s on the admin editor page. `images()` in `admin/admin.js` set thumbnail `src` straight from the stored path (relative to the site root) while the editor lives in `/admin/`, so committed photos showed as broken thumbnails. It now prefixes `../` unless the path is a data:, http(s) or absolute URL. No allowlist entries were needed.
- Verification: smoke 34 pages ok on the repo root and on a scratch copy staged with the workflow's `cp` commands; deleting `favicon.svg` from the scratch copy fails 32 of 34 pages with `404: favicon.svg` (the 2 virtual admin pages do not request it); a temporary `<img src="nope.png">` in `pages.notfound` fails `404.html` with `404: nope.png` (reverted, `git diff assets/` empty); `node --test scripts/*.test.mjs` 33 pass, 0 fail; check-content ok; `node --check` ok.
- Committed, not pushed. Backlog is empty. Next planner run should add nothing until new application commits land.

### 2026-11-09 - planner run 36 (after autopilot run 24, commit a4bba68)
- Surveyed: this file in full (re-checked the tail right before appending), README, `photos/README.md`, `git log --oneline -30` (latest a4bba68: `_site` smoke plus the admin thumbnail `../` fix), `git show --stat HEAD`, `.github/workflows/pages.yml`, the setup and Chrome lookup in `scripts/smoke.mjs`, `images()`/`field()` in `admin/admin.js`, and archive greps for README/docs/Chromium ideas. TODO/FIXME/XXX: none in project code.
- Added 1 task: document the full local check sequence (tests, content check, smoke test with `CHROME`/`SMOKE_ROOT`) in README and widen the smoke test's browser lookup to Chromium, macOS Chrome, x86 Chrome and Edge. This is a developer-experience gap no earlier run raised. CI grew to five steps over runs 17-24, but README still documents only `node --test`, and on a machine without one of the three hard-coded browser paths the smoke test silently skips and exits 0. The task is small and needs no npm.
- Deliberately not added: a smoke assertion for the admin thumbnail fix, because the new same-origin 404 check already covers it (that check is what found the bug). Also not added: everything on run 20's rejection list plus run 24's additions, team PNG recompression, Ctrl+K/tilt smoke checks, a contact-form submit test, the static `theme-color` mismatch, and the `current_year` vs. "Team 2026-27" mismatch (only the user can decide it). After this lands, planner runs should again add nothing until new application or content commits land.

### 2026-11-09 - autopilot run 24 (branch autopilot/md-club-redesign)
- Picked up: the planner run 36 task (README pre-push list, wider Chrome lookup in `smoke.mjs`).
- Did: added five fallback browser paths (Chromium x2, macOS Chrome, 32-bit Windows Chrome, Edge) after the existing ones in `scripts/smoke.mjs`, reworded the skip message, and replaced the README `node --test` bullet with a three-step "Before you push" list matching CI's order.
- Tests: `node --check scripts/smoke.mjs` ok, `node scripts/smoke.mjs` 34 pages ok, `CHROME=/nonexistent node scripts/smoke.mjs` 34 pages ok via the fallback list, `node --test scripts/*.test.mjs` 33 pass.
- Not pushed; waiting on the user's go-ahead.

### 2026-11-09 - planner run 37 (after autopilot run 24, commit 64fe4cc)
- Surveyed: this file in full (two Reads, because it is past the single-Read cap again at about 27K tokens; I re-checked the tail before editing and found no concurrent appends), README, `git log --oneline -30` (latest 64fe4cc, the README pre-push list and wider Chrome lookup; no application or content changes since run 36), `git status` (only `.claude/scheduled_tasks.lock`), directory listing, the inline `<head>` skin script in `about.html`, the `SKINS`/`skinOk` defaults in `assets/site.js`, the skin-list check in `scripts/check-content.mjs`, and `### `/`- [` counts in both files (35/13 here, 46/50 in the archive). TODO/FIXME/XXX: none in project code.
- Added 2 tasks:
  1. A third archive pass. The file is truncated on a plain Read again, which is the same problem run 20 queued the second pass for. It uses the same verbatim procedure with count checks.
  2. A check-content guard that the inline script's fallback skin matches the `skinOk` default in `site.js`. README tells editors to change the default in both places, and run 34's check covers only the skin list, not the default. This is small, new and not on any rejection list. It is a check only, with no HTML or CSP hash changes.
- Deliberately not added: everything on run 20's rejection list plus run 24's additions, team PNG recompression, Ctrl+K/tilt smoke checks, a contact-form submit test, the static `theme-color` mismatch, and the `current_year` vs. "Team 2026-27" mismatch (only the user can decide it). README "Looks" still describes four dark themes while the header rules describe a light default. The skins/CMS direction superseded those rules (2026-10-29), so the README is accurate and I left it alone.
- Suggested order: the archive pass first (it makes the file readable for the next session), then the default-skin check.

### 2026-11-09 - autopilot run 25 (branch autopilot/md-club-redesign)
- Picked up: third archive pass; default-skin consistency check.
- Archive pass: moved 13 done task entries and the 30 oldest run-log entries verbatim to `.claude/autopilot-log-archive.md`. `### ` count across both files 82 before and after, `- [` count 65 before and after; the multiset of non-blank lines across both files is identical to a backup (diffed). The status file is 68 lines and reads in one go.
- Default-skin check: `check-content.mjs` now fails when `skinOk`'s default in `assets/site.js` is not a SKINS key, or when a shell's inline-script fallback skin differs from it; 2 fixture tests added.
- Verification: `node --test scripts/*.test.mjs` 35 pass, 0 fail (33 before); check-content ok; changing `:"nebula"` to `:"ocean"` in `about.html` (reverted) makes it exit 1 with the expected message; `node --check` ok.
- Committed, not pushed. Backlog is empty. Next planner run should add nothing until new application commits land.
