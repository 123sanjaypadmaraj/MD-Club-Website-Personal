---
title: MAD Club Assistant
emoji: 💬
colorFrom: purple
colorTo: green
sdk: docker
pinned: false
license: mit
---

Backend for the chat assistant on the MAD Club website. It answers only from the website's own content.

How it works: it reads `content/*.json` from the published site, splits it into one chunk per topic, embeds the chunks with `all-MiniLM-L6-v2`, stores them in a FAISS index, and for each question sends the best matches (plus two short chunks saying what the club is and does) to Groq with a strict system prompt. Questions that match nothing on the site are refused without calling Groq. The content is re-read every 10 minutes.

Settings (Space settings, "Variables and secrets"):

- `GROQ_API_KEY` (secret, required)
- `SITE_URL` (variable): the published site, default `https://123sanjaypadmaraj.github.io/MD-Club-Website-Personal`
- `ALLOWED_ORIGINS` (variable): comma-separated origins allowed to call it, default `https://123sanjaypadmaraj.github.io`
- `GROQ_MODEL` (variable, optional): default `openai/gpt-oss-20b`

Endpoints: `GET /health`, `POST /ask` with `{"question": "...", "history": [{"role": "user", "content": "..."}]}` returning `{"answer": "...", "sources": [...]}`.
