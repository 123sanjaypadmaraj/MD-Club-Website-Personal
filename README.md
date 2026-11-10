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
- **AI chat assistant (Groq).** The assistant page (`chat.html`) and the "Ask MAD Club" link stay hidden until "Assistant URL" (`chat.endpoint` in `content/site.json`) is filled in. The Groq key must never go into the site, because every file here is public; it lives in the backend in `chatbot/`, which runs as a free Hugging Face Space (Docker), the same way as the STEM club backend. One-time setup:
  1. Create a Space at huggingface.co/new-space with the Docker SDK and upload everything inside `chatbot/` to it.
  2. In the Space settings, under "Variables and secrets", add the secret `GROQ_API_KEY`. If the site is not at the default address, also set the variables `SITE_URL` and `ALLOWED_ORIGINS` (see `chatbot/README.md`).
  3. When the Space is running, put `https://<user>-<space>.hf.space/ask` into "Assistant URL" (Contact and basics tab) and publish.

  How it answers: the backend reads `content/*.json` from the live site (again every 10 minutes), splits it into one chunk per topic (each event, the core team, contact details and so on), embeds the chunks with `all-MiniLM-L6-v2` into a FAISS index, and sends only the best matches for each question to Groq with a strict system prompt (`chatbot/rag.py`). So it can only repeat what is published on the site: edit the site and the assistant follows, with nothing to retrain. Questions with no match on the site are refused before Groq is called; the rest are held to the site by the prompt. It refuses other origins and more than 10 questions a minute per visitor. `.github/workflows/chat-keepalive.yml` pings the Space every 6 hours so it does not go to sleep. Run `python -m unittest test_rag` inside `chatbot/` after changing the knowledge base or prompt.
- **Current team year.** `content/team.json` `current_year` is "2025-26" but there is also a "Team 2026-27" gallery. Only the club knows which is right; it has not been changed.

## Looks

Four skins share one structure: Nebula (violet and lime, the default), Ocean (blue and yellow) and Aurora (mint and pink) are dark; Solar (paper and burnt orange) is light. Visitors switch with the colour dots in the header (or "Style" in the phone tab bar), and the choice is remembered. Change the default in the inline script in each page's `<head>` and in `assets/site.js`. Colour is flat: one accent plus one "pop" colour per skin, set as variables at the top of `assets/style.css`.

## Interactions

- The phone on the home page is a story player over the real event photos: it advances by itself, pauses on hover, and tapping its left or right side goes back or forward. "Open event" goes to that event.
- The photo reel ("Seen at our events") and the event rows use the first photos of each event, so adding photos to an event in either editor updates the home page too.
- Gallery tiles follow each photo's shape (posters stand tall, team portraits are round).
- Ctrl+K (or the Search button) opens a command menu for pages, events and styles. Press `/` on the Events page to jump to search.
- The assistant page works like a chat app: suggested questions on an empty chat, Enter to send (Shift+Enter for a new line), a list of earlier chats kept in that browser, and links to the pages an answer came from.
- On phones the site has a bottom tab bar (Home, Events, Team, Join, Search, Style) and a full-screen menu.

## WordPress theme

`assets/site.js` and `assets/style.css` are also the engine of the WordPress theme (`mad-club-clone.zip`, kept outside this repo). The theme sets `window.MAD_WP` (content, page URLs, theme folder) and the same script draws the pages, so the two cannot drift apart. After changing the design here, copy `assets/`, `content/`, `photos/` and `favicon.svg` into the theme folder and zip it again.

## Other

- Contact form: set "Form endpoint" in the admin to a Formspree URL. Empty shows an Instagram notice instead.
- Open the site through a web server, not by double-clicking `index.html`, so the browser can read `content/`.
- Before you push, run the same three commands CI runs, in this order:
  1. `node --test scripts/*.test.mjs` tests the content check (small fixtures, no npm install).
  2. `node scripts/check-content.mjs` must print "content ok" (size warnings are fine).
  3. `node scripts/smoke.mjs` loads every page in headless Chrome, Chromium or Edge. Set `CHROME=<path>` if it is not found, and `SMOKE_ROOT=<folder>` to test a staged copy as CI does.
