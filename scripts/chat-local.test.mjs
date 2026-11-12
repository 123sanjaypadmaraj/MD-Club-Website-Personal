// Tests for assets/chat-local.js, the built-in answers the chat uses while site.json chat.endpoint is empty.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const ctx = {};
vm.createContext(ctx);
vm.runInContext(readFileSync(new URL("assets/chat-local.js", root), "utf8"), ctx);
const { buildChunks, answer, GREETING, OFF_TOPIC } = ctx.MADChatLocal;
const load = n => JSON.parse(readFileSync(new URL(`content/${n}.json`, root), "utf8"));
const team = load("team");
const chunks = buildChunks(load("site"), load("events"), team, load("achievements"));

test("chunk titles match chatbot/rag.py build_chunks for the current content", () => {
  // From: python -c "import rag; print([c['title'] for c in rag.build_chunks(...)])" in chatbot/, on the current content.
  assert.deepEqual(Array.from(chunks, c => c.title), ["About the club", "What the club does", "Why join and how to join", "Contact details",
    "Achievements and numbers", "Apps built by members", "Core team 2025-26 (current members and their roles)", "Earlier teams (previous members)",
    "List of all events", "Flagship events", "Event: Mindspark'23", "Event: InnoWave'24", "Event: TechSync'24", "Event: Connect'24",
    "Event: Pixel Pursuit'24", "Event: Codathon", "Event: Appsylum'25", "Event: Game Design'26", "Event: Gitout'26", "Event: Daemon Hour"]);
});

test("core team question answers with team.json names and a team.html source", () => {
  const r = answer("Who is on the core team?", [], chunks);
  assert.ok(r.answer.includes(team.current[0].name), r.answer);
  assert.ok(r.sources.some(s => s.page === "team.html"));
  assert.ok(!r.answer.includes("(MAD Club) -"), "chunk prefix line should be stripped");
});

test("off-topic question gets the fixed refusal", () => {
  const r = answer("what is the capital of France", [], chunks);
  assert.equal(r.answer, OFF_TOPIC);
  assert.equal(r.sources.length, 0);
});

test("greeting gets the greeting", () => {
  assert.equal(answer("Hello!", [], chunks).answer, GREETING);
});

test("follow-up uses the previous question when the new one matches nothing", () => {
  const r = answer("and when?", [{ role: "user", content: "Tell me about Mindspark" }], chunks);
  assert.ok(r.sources.some(s => s.page.startsWith("event.html?e=")), JSON.stringify(r));
});
