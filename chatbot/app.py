"""MAD Club assistant backend: retrieval-augmented answers from the website's own content.

Flow (same design as the STEM club backend): website content -> chunks -> MiniLM embeddings
-> FAISS index -> top matches for each question -> strict system prompt -> Groq.

Environment:
  GROQ_API_KEY     secret, required
  SITE_URL         the published site (content/*.json is read from here), or a local folder path
  ALLOWED_ORIGINS  comma-separated origins allowed to call /ask
  GROQ_MODEL       optional, a chat model from https://console.groq.com/docs/models
"""
import json
import os
import threading
import time

import faiss
import numpy as np
import requests
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer

import rag

API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL_NAME = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
SITE_URL = os.getenv("SITE_URL", "https://123sanjaypadmaraj.github.io/MD-Club-Website-Personal").rstrip("/")
ALLOWED_ORIGINS = [o.strip().rstrip("/") for o in os.getenv("ALLOWED_ORIGINS", "https://123sanjaypadmaraj.github.io").split(",") if o.strip()]

TOP_K = 6              # chunks handed to the model
KEYWORD_WEIGHT = 0.3   # how much shared words add to the embedding similarity when ranking chunks
MIN_SCORE = float(os.getenv("MIN_SCORE", "0.15"))  # a question below this similarity that also shares no words with the site is refused without calling Groq
REFRESH_SECONDS = 600  # re-read the website content this often
PER_MINUTE = 10        # questions per visitor per minute

app = FastAPI(title="MAD Club assistant")
app.add_middleware(CORSMiddleware, allow_origins=ALLOWED_ORIGINS, allow_methods=["GET", "POST"], allow_headers=["Content-Type"])

embed_model = SentenceTransformer("all-MiniLM-L6-v2")
state = {"site": {}, "chunks": [], "index": None, "at": 0.0, "raw": ""}
lock = threading.Lock()
hits = {}


def read_content(name):
    if SITE_URL.startswith(("http://", "https://")):
        r = requests.get(f"{SITE_URL}/content/{name}.json", timeout=15)
        r.raise_for_status()
        return r.json()
    with open(os.path.join(SITE_URL, "content", f"{name}.json"), encoding="utf-8") as f:
        return json.load(f)


def embed(texts):
    v = embed_model.encode(texts, normalize_embeddings=True)
    return np.array(v).astype("float32")


def refresh(force=False):
    """Rebuilds the index when the website content has changed. Keeps the old index if the site cannot be read."""
    if not force and state["index"] is not None and time.time() - state["at"] < REFRESH_SECONDS:
        return
    with lock:
        if not force and state["index"] is not None and time.time() - state["at"] < REFRESH_SECONDS:
            return
        try:
            docs = {n: read_content(n) for n in ("site", "events", "team", "achievements")}
        except Exception as e:  # network or JSON trouble
            print("could not read website content:", e)
            state["at"] = time.time() - REFRESH_SECONDS + 60  # retry in a minute
            return
        raw = json.dumps(docs, sort_keys=True)
        if raw != state["raw"]:
            chunks = rag.build_chunks(**docs)
            if not chunks:
                print("website content produced no chunks; keeping the previous index")
                return
            vectors = embed([c["text"] for c in chunks])
            index = faiss.IndexFlatIP(vectors.shape[1])  # inner product on normalised vectors = cosine similarity
            index.add(vectors)
            state.update(site=docs["site"], chunks=chunks, index=index, raw=raw)
            print(f"knowledge base rebuilt: {len(chunks)} chunks")
        state["at"] = time.time()


def retrieve_docs(query, k=TOP_K):
    index, chunks = state["index"], state["chunks"]
    if index is None or not chunks:
        return [], False
    scores, ids = index.search(embed([query]), len(chunks))  # the knowledge base is small, so score every chunk
    cosine = {int(i): float(s) for s, i in zip(scores[0], ids[0]) if i >= 0}
    words = rag.keyword_scores(query, chunks)
    ranked = sorted(cosine, key=lambda i: cosine[i] + KEYWORD_WEIGHT * words[i], reverse=True)[:k]
    related = max(cosine.values()) >= MIN_SCORE or max(words) > 0
    core = [i for i, c in enumerate(chunks) if c.get("core") and i not in ranked]
    return [chunks[i] for i in ranked + core], related


def limited(ip):
    now = time.time()
    recent = [t for t in hits.get(ip, []) if now - t < 60]
    if len(recent) >= PER_MINUTE:
        hits[ip] = recent
        return True
    recent.append(now)
    hits[ip] = recent
    if len(hits) > 5000:
        hits.clear()
    return False


class Turn(BaseModel):
    role: str
    content: str


class Question(BaseModel):
    question: str = Field(min_length=1, max_length=rag.MAX_QUESTION)
    history: list[Turn] = Field(default_factory=list, max_length=40)


def fail(status, message):
    return JSONResponse({"error": message}, status_code=status)


@app.on_event("startup")
def startup():
    refresh(force=True)


@app.get("/health")
def health():
    return {"status": "ok", "chunks": len(state["chunks"])}


@app.post("/ask")
def ask_ai(q: Question, request: Request):
    origin = (request.headers.get("origin") or "").rstrip("/")
    if origin not in ALLOWED_ORIGINS:
        return fail(403, "This site is not allowed to use the assistant.")
    ip = (request.headers.get("x-forwarded-for") or (request.client.host if request.client else "unknown")).split(",")[0].strip()
    if limited(ip):
        return fail(429, "Too many questions. Wait a minute and try again.")
    question = q.question.strip()
    if not question:
        return fail(400, "Ask a question first.")
    if rag.is_greeting(question):
        return {"answer": rag.GREETING, "sources": []}

    refresh()
    if state["index"] is None:
        return fail(503, "The assistant could not read the website just now. Try again in a minute.")
    history = [t.model_dump() for t in q.history]
    chunks, related = retrieve_docs(rag.retrieval_query(question, history))
    if not related:
        return {"answer": rag.OFF_TOPIC, "sources": []}
    if not API_KEY:
        return fail(503, "The assistant is not set up yet.")

    try:
        r = requests.post(GROQ_URL, timeout=40,
                          headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
                          json={"model": MODEL_NAME, "temperature": 0.1, "max_completion_tokens": 900,
                                "messages": rag.build_messages(state["site"], question, history, chunks)})
    except requests.RequestException as e:
        print("groq request failed:", type(e).__name__)
        return fail(502, "The assistant could not answer just now. Try again.")
    if r.status_code != 200:
        print("groq error", r.status_code, r.text[:300])
        return fail(502, "The assistant is busy. Try again in a minute." if r.status_code == 429 else "The assistant could not answer just now. Try again.")
    try:
        answer = (r.json()["choices"][0]["message"]["content"] or "").strip()
    except (KeyError, IndexError, TypeError, ValueError):
        answer = ""
    if not answer:
        return fail(502, "The assistant returned an empty answer. Try rephrasing.")
    fixed = (rag.NOT_FOUND, rag.OFF_TOPIC, rag.REFUSED)
    return {"answer": answer, "sources": [] if answer in fixed else rag.sources(chunks)}
