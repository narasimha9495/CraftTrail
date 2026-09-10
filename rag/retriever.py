"""
retriever.py — CraftTrail RAG Query Engine (Local / No-API)
=============================================================
Handles: ChromaDB semantic search + local extractive answer generation.
NO external API required — answers come purely from the trained knowledge base.
"""

import os
import re
import string
from collections import Counter
from dotenv import load_dotenv

load_dotenv()

import chromadb
from chromadb.utils.embedding_functions import SentenceTransformerEmbeddingFunction

CHROMA_PATH = os.getenv("CHROMA_DB_PATH", "./chroma_db")
COLLECTION  = "crafttrail_knowledge"

# ── Clients ────────────────────────────────────────────────────────────────
embedding_fn  = SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")
chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)

# ── Stop-words to ignore when scoring relevance ────────────────────────────
_STOP = {
    "a","an","the","is","are","was","were","be","been","being","have","has",
    "had","do","does","did","will","would","could","should","may","might",
    "shall","can","need","dare","ought","used","of","in","on","at","to",
    "for","with","by","from","as","and","or","but","if","so","yet","nor",
    "not","what","which","who","whom","this","that","these","those","i",
    "me","my","we","our","you","your","he","she","it","his","her","its",
    "they","them","their","about","into","through","during","before","after",
    "above","below","up","down","out","off","over","under","then","once",
    "there","when","where","how","all","any","both","each","more","most",
    "other","some","such","no","only","same","than","too","very","just",
    "tell","know","speak","does","speak","languages","does",
}


def _tokenize(text: str) -> list[str]:
    """Lowercase, strip punctuation, remove stop-words."""
    tokens = re.findall(r"[a-z]+", text.lower())
    return [t for t in tokens if t not in _STOP and len(t) > 2]


def _score_sentence(sentence: str, query_tokens: list[str]) -> float:
    """Score a sentence by how many query keywords it contains (weighted by rarity)."""
    sent_tokens = _tokenize(sentence)
    if not sent_tokens:
        return 0.0
    hits = sum(1 for qt in query_tokens if qt in sent_tokens)
    # Bonus for exact multi-word phrases
    sentence_lower = sentence.lower()
    phrase_bonus = sum(0.5 for qt in query_tokens if len(qt) > 5 and qt in sentence_lower)
    return (hits + phrase_bonus) / max(len(query_tokens), 1)


def _extract_best_sentences(chunks: list[str], query: str, max_sentences: int = 8) -> list[str]:
    """
    From all retrieved chunks, pick the most query-relevant sentences.
    Returns deduplicated, ranked sentences.
    """
    query_tokens = _tokenize(query)
    if not query_tokens:
        # No useful query tokens — just return first sentences of top chunks
        results = []
        for chunk in chunks[:3]:
            sentences = re.split(r"(?<=[.!?])\s+", chunk.strip())
            results.extend(sentences[:3])
        return results[:max_sentences]

    scored = []
    seen = set()

    for chunk in chunks:
        # Split chunk into sentences
        sentences = re.split(r"(?<=[.!?])\s+", chunk.strip())
        for sent in sentences:
            sent = sent.strip()
            if len(sent) < 30:          # skip very short fragments
                continue
            # Deduplicate (first 60 chars as key)
            key = sent[:60].lower()
            if key in seen:
                continue
            seen.add(key)
            score = _score_sentence(sent, query_tokens)
            scored.append((score, sent))

    # Sort descending by score
    scored.sort(key=lambda x: x[0], reverse=True)

    # Return top sentences, but keep reading order within each chunk
    top = [s for _, s in scored[:max_sentences] if _ > 0]
    if not top:
        # Fallback: first sentence of each chunk
        top = []
        for chunk in chunks[:3]:
            sentences = re.split(r"(?<=[.!?])\s+", chunk.strip())
            if sentences:
                top.append(sentences[0].strip())
    return top


def _format_answer(question: str, sentences: list[str], chunks: list[str]) -> str:
    """
    Build a readable, structured answer from the best extracted sentences.
    Detects list-type questions and formats accordingly.
    """
    if not sentences:
        return (
            "I don't have specific information about that in my knowledge base. "
            "Try asking about a specific Indian state, craft type, GI tag, or artisan on CraftTrail."
        )

    q_lower = question.lower()
    is_list_q = any(w in q_lower for w in [
        "list", "what are", "which", "name", "types", "examples",
        "crafts", "languages", "states", "districts", "clusters",
    ])
    is_how_q  = any(w in q_lower for w in ["how", "process", "steps", "make", "create", "work"])
    is_what_q = any(w in q_lower for w in ["what is", "what are", "define", "describe", "tell me"])

    # ── Build intro ────────────────────────────────────────────────────────
    # Extract a strong opening sentence (highest scored one)
    intro = sentences[0]
    rest  = sentences[1:]

    if is_list_q and len(rest) >= 2:
        # Format as bullet list
        bullets = "\n".join(f"• {s}" for s in rest[:6])
        return f"{intro}\n\n{bullets}"
    elif is_how_q and len(rest) >= 2:
        # Numbered steps feel more natural for "how" questions
        steps = "\n".join(f"{i+1}. {s}" for i, s in enumerate(rest[:5]))
        return f"{intro}\n\n{steps}"
    else:
        # Paragraph style
        paragraphs = [intro]
        if rest:
            paragraphs.append(" ".join(rest[:4]))
        return "\n\n".join(paragraphs)


def get_collection():
    """Return the ChromaDB collection, or None if not initialized."""
    try:
        return chroma_client.get_collection(
            name=COLLECTION,
            embedding_function=embedding_fn,
        )
    except Exception:
        return None


def retrieve(question: str, top_k: int = 7) -> list[str]:
    """Semantic search — return top_k most relevant chunks from ChromaDB."""
    collection = get_collection()
    if not collection:
        return []
    count = collection.count()
    if count == 0:
        return []
    results = collection.query(
        query_texts=[question],
        n_results=min(top_k, count),
        include=["documents", "distances"],
    )
    docs      = results.get("documents", [[]])[0]
    distances = results.get("distances",  [[]])[0]
    # Filter out very poor matches (distance > 1.8 = not relevant)
    filtered = [d for d, dist in zip(docs, distances) if d and d.strip() and dist < 1.8]
    return filtered or [d for d in docs if d and d.strip()]  # fallback: return all if all poor


def answer(question: str, context: str = "", chat_history: list[dict] = None) -> dict:
    """
    Local RAG pipeline (no external API):
    1. Semantic retrieval from ChromaDB
    2. Extractive sentence ranking by keyword relevance
    3. Structured answer formatting, with a graceful off-topic redirect
    """
    # ── Retrieval ──
    chunks = retrieve(question, top_k=7)

    # Prepend UI context (artisan/state info passed from React)
    if context and context.strip():
        chunks = [context.strip()] + chunks

    if not chunks:
        return {
            "answer": (
                "I'm CraftTrail's craft guide — I can tell you about India's craft "
                "traditions, the artisans, their techniques, GI tags, and which crafts "
                "belong to which regions. Try asking me something like \"What is Pochampally "
                "Ikat?\" or \"Which crafts are from Rajasthan?\""
            ),
            "sources": [],
            "retrieved": 0,
        }

    # ── Extractive generation ──
    sentences = _extract_best_sentences(chunks, question, max_sentences=8)

    # If retrieval returned chunks but none actually matched the question well,
    # the question is probably off-topic — redirect gracefully instead of dumping
    # unrelated text.
    query_tokens = _tokenize(question)
    best_score = 0.0
    if query_tokens:
        for s in sentences:
            best_score = max(best_score, _score_sentence(s, query_tokens))

    if query_tokens and best_score == 0.0:
        return {
            "answer": (
                "That's a little outside what I know about — I focus on India's craft "
                "heritage and the artisans on CraftTrail. Ask me about a craft, a technique, "
                "or a region and I'll help! For example: \"Tell me about Kutch embroidery\" "
                "or \"What crafts can I find near Jaipur?\""
            ),
            "sources": [],
            "retrieved": len(chunks),
        }

    answer_text = _format_answer(question, sentences, chunks)

    return {
        "answer":    answer_text,
        "sources":   [],
        "retrieved": len(chunks),
    }


def status() -> dict:
    """Return current knowledge base stats."""
    collection = get_collection()
    if not collection:
        return {"indexed": 0, "ready": False, "message": "Not initialized. Run python ingest.py"}
    count = collection.count()
    return {
        "indexed": count,
        "ready":   count > 0,
        "message": f"{count} chunks indexed in ChromaDB" if count > 0 else "Empty. Run python ingest.py",
        "model":   "local-extractive (ChromaDB + keyword ranking)",
    }
