// Built-in answers for the MAD Club assistant. It needs no backend and no API key.
// buildChunks() is a port of build_chunks() in chatbot/rag.py: one chunk per topic on the website, built
// from content/*.json. answer() picks the chunks that share the most words with the question and
// repeats their text, so it can only ever say what is already published on the site.
// chat.html loads this file on demand (assets/site.js wireChatPage); scripts/chat-local.test.mjs tests it.
(function () {
  "use strict";
  const NOT_FOUND = "I can't find that on the MAD Club website. Please check the site's pages or ask the team on Instagram.";
  const OFF_TOPIC = "I can only help with information from the MAD Club website.";
  const GREETING = "Hi! I can answer questions about the MAD Club website: events, the team, what the club does and how to join.";
  const MAX_QUESTION = 500;

  const s = v => (v === null || v === undefined ? "" : String(v).trim());
  const lines = pairs => pairs.filter(([, v]) => s(v)).map(([k, v]) => `${k}: ${s(v)}`).join("\n");
  const arr = v => (Array.isArray(v) ? v : []);
  const obj = v => (v && typeof v === "object" && !Array.isArray(v) ? v : {});

  function buildChunks(site, events, team, achievements) {
    site = obj(site); events = obj(events); team = obj(team); achievements = obj(achievements);
    const club = s(site.name) || "MAD Club", full = s(site.full_name) || club;
    const about = obj(site.about), contact = obj(site.contact), hasSite = Object.keys(site).length > 0;
    const evs = arr(events.events).filter(e => e && typeof e === "object" && s(e.name));
    const chunks = [];
    const add = (title, page, text, core = false) => {
      text = s(text);
      if (text && (hasSite || !/^(about|contact)/.test(page))) chunks.push({ title, page, core, text: `${full} (${club}) - ${title}\n${text}` });
    };

    add("About the club", "about.html", lines([
      ["Name", `${full}, also called ${club}`], ["College", `${s(site.college)} (${s(site.college_short)})`],
      ["Year established", site.established], ["Tagline", site.tagline],
      ["Who we are", about.who], ["Objective", about.objective], ["Outcomes for members", about.outcomes]]), true);
    add("What the club does", "about.html", [
      ...arr(about.functions).map(f => `- ${s(f.title)}: ${s(f.text)}`),
      ...arr(site.highlights).map(h => `- ${s(h.title)}: ${s(h.text)}`),
      ...(s(site.hero_lead) ? [s(site.hero_lead)] : [])].join("\n"), true);
    const ann = s(obj(site.announcement).text);
    add("Why join and how to join", "contact.html", [
      s(site.why_lead), ...arr(site.why).map(w => `- ${s(w.title)}: ${s(w.text)}`),
      `${s(site.cta_title)}. ${s(site.cta_text)}`,
      `How to join or register: registration for membership and events is announced on the club's Instagram, ${s(site.instagram_handle)}.`,
      ...(ann ? [`Current announcement: ${ann}`] : [])].join("\n"));
    add("Contact details", "contact.html", lines([
      ["Instagram", `${s(site.instagram_handle)} ${s(site.instagram)}`],
      ["Official college page for the club", site.college_page],
      ["Coordinators to contact", contact.coordinators], ["Email", contact.email], ["Phone", contact.phone]]));
    const stats = [...arr(site.stats), ...arr(achievements.stats)];
    add("Achievements and numbers", "achievements.html", stats.map(x => `- ${s(x.value)} ${s(x.label)}`).join("\n"));
    add("Apps built by members", "achievements.html", arr(achievements.apps).map(a => `- ${s(a.name)}: ${s(a.text)}`).join("\n"));

    const current = arr(team.current);
    if (current.length)
      add(`Core team ${s(team.current_year)} (current members and their roles)`, "team.html",
        `The current core team, year ${s(team.current_year)}, has ${current.length} members:\n` +
        current.map(m => `- ${s(m.name)}: ${s(m.role)}`).join("\n"));
    const earlier = arr(team.earlier);
    if (earlier.length)
      add("Earlier teams (previous members)", "team.html", earlier.map(m => `- ${s(m.name)}: ${s(m.role)}, ${s(m.year)}`).join("\n"));

    if (evs.length) {
      add("List of all events", "events.html", `The club has run ${evs.length} events listed on the website:\n` +
        evs.map(e => `- ${s(e.name)} (${s(e.semester)}${e.flagship ? ", flagship event" : ""})`).join("\n"));
      const flag = evs.filter(e => e.flagship);
      if (flag.length)
        add("Flagship events", "events.html", `The ${flag.length} flagship events are:\n` +
          flag.map(e => `- ${s(e.name)} (${s(e.semester)}): ${s(e.description)}`).join("\n"));
    }
    for (const e of evs) {
      const slug = s(e.slug);
      add(`Event: ${s(e.name)}`, slug ? `event.html?e=${slug}` : "events.html", lines([
        ["Event name", e.name], ["Semester", e.semester], ["Flagship event", e.flagship ? "yes" : "no"],
        ["Description", e.description], ["Photos on the website", arr(e.photos).length || ""]]));
    }
    return chunks;
  }

  // Same stop words, tokens and greeting pattern as chatbot/rag.py. A trailing plural "s" is dropped so
  // "teams" matches "team" (the backend's embedding model covers that; plain keywords need the help).
  const STOP = new Set(`a an and are about all any can could did does for from had has have how its into is it me my of on or our out that the their them
there this to was were what when where which who whom why will with would you your tell give show list please know more some many much
get got one two also than then they she him her his not but just`.split(/\s+/));
  const tokens = text => new Set((s(text).toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter(t => t.length > 2 && !STOP.has(t)).map(t => (t.length > 3 && /[^s]s$/.test(t) ? t.slice(0, -1) : t)));
  const GREET = /^\W*(hi+|hello+|hey+|hola|namaste|yo|good (morning|afternoon|evening)|thanks?( you)?|thank you|ok(ay)?|bye)\W*$/i;

  // Each question word found in a chunk (title or text) adds its weight; words that appear in many chunks (such as "club")
  // weigh less. Words in the title add a small bonus as a tie-break. Scores run from 0 to about 1.25.
  function score(query, chunks) {
    const q = tokens(query);
    if (!q.size || !chunks.length) return chunks.map(() => 0);
    const titles = chunks.map(c => tokens(c.title));
    const bodies = chunks.map((c, i) => new Set([...tokens(c.text.slice(c.text.indexOf("\n") + 1)), ...titles[i]]));
    const w = {};
    for (const t of q) w[t] = Math.log(1 + chunks.length / (1 + bodies.filter(b => b.has(t)).length));
    const total = Object.values(w).reduce((a, b) => a + b, 0);
    return chunks.map((c, i) => {
      let hit = 0, top = 0;
      for (const t of q) { if (bodies[i].has(t)) hit += w[t]; if (titles[i].has(t)) top += w[t]; }
      return hit ? (hit + 0.25 * top) / total : 0;
    });
  }

  function answer(question, history, chunks) {
    question = s(question).slice(0, MAX_QUESTION);
    chunks = arr(chunks);
    if (!question) return { answer: NOT_FOUND, sources: [] };
    if (GREET.test(question)) return { answer: GREETING, sources: [] };
    let scores = score(question, chunks);
    if (!scores.some(x => x > 0)) {
      // A follow-up such as "when was it?" may only make sense with the previous question.
      const prev = arr(history).filter(h => h && h.role === "user" && typeof h.content === "string").slice(-1).map(h => h.content);
      if (prev.length) scores = score(prev[0] + " " + question, chunks);
    }
    const ranked = chunks.map((c, i) => [scores[i], i, c]).filter(r => r[0] > 0).sort((a, b) => b[0] - a[0] || a[1] - b[1]).map(r => [r[0], r[2]]);
    if (!ranked.length) return { answer: tokens(question).size ? OFF_TOPIC : NOT_FOUND, sources: [] };
    const best = ranked[0][0], picked = ranked.filter((r, i) => i === 0 || (i === 1 && r[0] >= best * 0.85)).map(r => r[1]);
    const body = c => c.text.split("\n").slice(1).join("\n").trim();
    const text = picked.map((c, i) => (picked.length > 1 ? c.title + ":\n" : "") + body(c)).join("\n\n").trim();
    const seen = new Set(), sources = [];
    for (const [, c] of ranked) if (!seen.has(c.page) && sources.length < 3) { seen.add(c.page); sources.push({ title: c.title, page: c.page }); }
    return { answer: text || NOT_FOUND, sources: text ? sources : [] };
  }

  globalThis.MADChatLocal = { buildChunks, answer, tokens, GREETING, OFF_TOPIC, NOT_FOUND };
})();
