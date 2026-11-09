# MAD Club site

Static site with a visual editor at `/admin/` and a GitHub-backed CMS (Decap) at `/admin/cms/`. All text, events, team and photos live in `content/*.json` and `photos/`, and the pages are built from them in the browser.

## Two editors

**1. Testing editor at `/admin/` (login `admin` / `admin`).** Visual forms with a live preview (desktop, tablet, phone). Edits are saved as a draft in your own browser and show on the site in that browser only. The password check runs in the browser, so it is for testing, not security. To publish an edit for everyone, press **Download JSON** and replace the matching file in `content/`, then commit.

**2. Real publishing editor at `/admin/cms/` (GitHub login).** Edit and press **Publish**. Decap commits to the repo and the site redeploys in about a minute. Only GitHub users with write access to the repo can log in; add collaborators on GitHub to give access.

When you add or remove an event, also add or remove its `event.html?e=<slug>` line in `sitemap.xml`; the content check fails if they disagree.

## One-time setup (for the GitHub editor)

1. Push this folder to a GitHub repo (branch `main`).
2. The repo is already set to `123sanjaypadmaraj/MD-Club-Website-Personal`. If you rename the repo or account, update `repo`, `site_url` and `display_url` in `admin/cms/config.yml`, plus the canonical tags, the `og:image` URLs, `sitemap.xml` and `robots.txt`.
3. Enable Pages: repo Settings, Pages, Source "GitHub Actions" (workflow is included).
4. Login needs an OAuth step, because GitHub Pages cannot do it alone. Pick one:
   - **Netlify (simplest).** Host the site on Netlify (drag the folder in or connect the repo), then Site settings, Access control, OAuth, Install provider: GitHub (create a GitHub OAuth app with callback `https://api.netlify.com/auth/done`). `/admin/cms/` then works with no other change.
   - **Stay on GitHub Pages.** Deploy a free OAuth proxy (for example `sterlingwes/decap-proxy` on Cloudflare Workers), then set `base_url` in `admin/cms/config.yml` to its URL.

## Edit locally without logging in

```
npx decap-server
python -m http.server 8000
```

Open `http://localhost:8000/admin/cms/`. `local_backend: true` skips login and edits the files directly.

## Settings only the club can fill in
These stay empty until the club supplies them; the site works without them.
- **Join form (Formspree).** Create a form at formspree.io, copy its `https://formspree.io/f/<id>` URL and paste it into "Form endpoint" (`contact.form_endpoint` in `content/site.json`). While empty, the Contact page shows an Instagram notice instead of the form. The CSP already allows `https:` for `form-action` and `connect-src`.
- **Contact email and phone** ("Contact email" / "Contact phone", `contact.email` / `contact.phone`). Each shows a card on the Contact page only when filled in.
- **Current team year.** `content/team.json` `current_year` is "2025-26" but there is also a "Team 2026-27" gallery. Only the club knows which is right; it has not been changed.

## Looks

Four dark themes (Nebula purple, Ocean blue, Aurora green, Solar amber) share one structure. Visitors switch with the control in the header, and the choice is remembered. Change the default in the inline script in each page's `<head>` and in `assets/site.js`.

## Interactions

Ctrl+K (or the Search button) opens a command menu for pages, events and styles. Press `/` on the Events page to jump to search. Cards tilt, buttons follow the pointer, and the phone on the home page is clickable.

## Other

- Contact form: set "Form endpoint" in the admin to a Formspree URL. Empty shows an Instagram notice instead.
- Open the site through a web server, not by double-clicking `index.html`, so the browser can read `content/`.
- Before you push, run the same three commands CI runs, in this order:
  1. `node --test scripts/*.test.mjs` tests the content check (small fixtures, no npm install).
  2. `node scripts/check-content.mjs` must print "content ok" (size warnings are fine).
  3. `node scripts/smoke.mjs` loads every page in headless Chrome, Chromium or Edge. Set `CHROME=<path>` if it is not found, and `SMOKE_ROOT=<folder>` to test a staged copy as CI does.
