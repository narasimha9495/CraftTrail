"""
retriever.py — CraftTrail RAG Query Engine (Groq + ChromaDB)
=============================================================
Handles: ChromaDB semantic search + Groq (Llama 3) answer generation.
Pipeline: retrieve relevant chunks → pass them as context to Groq LLM → get answer.
"""

import os
import re
from dotenv import load_dotenv

load_dotenv()

import chromadb
from chromadb.utils.embedding_functions import DefaultEmbeddingFunction

CHROMA_PATH = os.getenv("CHROMA_DB_PATH", "./chroma_db")
COLLECTION  = "crafttrail_knowledge"
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# ── ChromaDB Client ───────────────────────────────────────────────────────
# DefaultEmbeddingFunction uses all-MiniLM-L6-v2 via ONNX runtime
embedding_fn  = DefaultEmbeddingFunction()
chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)

# ── Groq Client ───────────────────────────────────────────────────────────
groq_client = None
if GROQ_API_KEY:
    try:
        from groq import Groq
        groq_client = Groq(api_key=GROQ_API_KEY)
        print("[retriever] Groq client initialized ✓")
    except ImportError:
        print("[retriever] WARNING: 'groq' package not installed. Using local fallback.")
    except Exception as e:
        print(f"[retriever] WARNING: Groq init failed: {e}. Using local fallback.")
else:
    print("[retriever] No GROQ_API_KEY set. Using local extractive fallback.")


# ── System prompt for the craft guide ─────────────────────────────────────
SYSTEM_PROMPT = """You are CraftBot AI — CraftTrail's expert guide on India's traditional crafts, artisans, and cultural heritage.

RULES:
1. Answer ONLY using the CONTEXT provided below. Do NOT make up information.
2. If the context doesn't contain enough info, say so honestly — don't fabricate.
3. Be specific: mention craft names, artisan names, locations, GI tags, and techniques from the context.
4. For location-based questions ("What crafts near Hyderabad?"), prioritize results from that geographic region in the context.
5. For travel/visit questions, give practical recommendations: craft clusters, what to see, distance from city.
6. Keep answers concise but informative — 3-6 sentences for simple questions, more for detailed ones.
7. Use bullet points for lists. Use bold (**text**) for craft names and places.
8. If asked about something outside Indian crafts/artisans, politely redirect.
9. If chat history is provided, maintain conversation continuity.
"""


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

    # For location-based queries, also search with state/region context
    queries = [question]
    city_state_map = {
        "hyderabad": "Telangana crafts near Hyderabad",
        "mumbai": "Maharashtra crafts near Mumbai",
        "delhi": "Delhi crafts artisans",
        "bangalore": "Karnataka crafts near Bangalore Bengaluru",
        "bengaluru": "Karnataka crafts near Bangalore Bengaluru",
        "chennai": "Tamil Nadu crafts near Chennai",
        "kolkata": "West Bengal crafts near Kolkata",
        "jaipur": "Rajasthan crafts near Jaipur",
        "lucknow": "Uttar Pradesh crafts near Lucknow",
        "varanasi": "Uttar Pradesh crafts Varanasi Banaras",
        "ahmedabad": "Gujarat crafts near Ahmedabad",
        "bhubaneswar": "Odisha crafts near Bhubaneswar",
        "kochi": "Kerala crafts near Kochi",
        "pune": "Maharashtra crafts near Pune",
        "mysore": "Karnataka crafts Mysore silk",
        "mysuru": "Karnataka crafts Mysore silk",
        "agra": "Uttar Pradesh crafts Agra marble inlay",
        "jodhpur": "Rajasthan crafts Jodhpur",
        "udaipur": "Rajasthan crafts Udaipur",
    }
    q_lower = question.lower()
    for city, expanded in city_state_map.items():
        if city in q_lower:
            queries.append(expanded)
            top_k = 10  # more chunks for location queries
            break

    all_docs = []
    seen = set()
    for q in queries:
        results = collection.query(
            query_texts=[q],
            n_results=min(top_k, count),
            include=["documents", "distances"],
        )
        docs      = results.get("documents", [[]])[0]
        distances = results.get("distances",  [[]])[0]
        for d, dist in zip(docs, distances):
            if d and d.strip() and dist < 1.8:
                key = d[:80]
                if key not in seen:
                    seen.add(key)
                    all_docs.append(d)

    if not all_docs:
        # Fallback: return all from first query
        results = collection.query(query_texts=[question], n_results=min(7, count), include=["documents"])
        all_docs = [d for d in results.get("documents", [[]])[0] if d and d.strip()]

    return all_docs[:12]  # cap at 12 chunks


def _groq_generate(question: str, chunks: list[str], chat_history: list[dict] = None) -> str:
    """Use Groq (Llama 3) to generate a contextual answer from retrieved chunks."""
    context_text = "\n\n---\n\n".join(chunks)

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
    ]

    # Add chat history for conversational continuity
    if chat_history:
        for msg in chat_history[-4:]:  # last 4 messages for context
            role = msg.get("role", "user")
            if role in ("user", "assistant"):
                messages.append({"role": role, "content": msg.get("text", msg.get("content", ""))})

    # Add the current question with context
    user_message = f"""CONTEXT (from CraftTrail knowledge base):
{context_text}

USER QUESTION: {question}

Answer the question using ONLY the context above. Be specific and helpful."""

    messages.append({"role": "user", "content": user_message})

    try:
        response = groq_client.chat.completions.create(
            model="qwen/qwen3.8-27b",
            messages=messages,
            temperature=0.3,       # Low temp for factual answers
            max_tokens=800,
            top_p=0.9,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"[retriever] Groq API error: {e}")
        return None  # Fall back to local extraction


# ── Local fallback (extractive) ───────────────────────────────────────────
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
    "tell","know","speak","does","languages",
}

def _tokenize(text: str) -> list[str]:
    tokens = re.findall(r"[a-z]+", text.lower())
    return [t for t in tokens if t not in _STOP and len(t) > 2]

def _local_fallback(question: str, chunks: list[str]) -> str:
    """Simple extractive fallback when Groq is unavailable."""
    query_tokens = _tokenize(question)
    all_sentences = []
    seen = set()
    for chunk in chunks:
        sentences = re.split(r"(?<=[.!?])\s+", chunk.strip())
        for sent in sentences:
            sent = sent.strip()
            if len(sent) < 30:
                continue
            key = sent[:60].lower()
            if key in seen:
                continue
            seen.add(key)
            # Score by keyword overlap
            sent_tokens = _tokenize(sent)
            hits = sum(1 for qt in query_tokens if qt in sent_tokens) if query_tokens else 0
            all_sentences.append((hits, sent))

    all_sentences.sort(key=lambda x: x[0], reverse=True)
    top = [s for score, s in all_sentences[:6] if score > 0]
    if not top:
        top = [s for _, s in all_sentences[:3]]
    return "\n\n".join(top) if top else None


def answer(question: str, context: str = "", chat_history: list[dict] = None) -> dict:
    """
    RAG pipeline:
    1. Semantic retrieval from ChromaDB
    2. Generate answer via Groq LLM (with local extractive fallback)
    """
    # ── Retrieval ──
    chunks = retrieve(question, top_k=7)

    # Prepend UI context (artisan/state info passed from React)
    if context and context.strip():
        chunks = [context.strip()] + chunks

    if not chunks:
        return {
            "answer": (
                "I'm CraftBot AI — your guide to India's craft heritage! I can tell you about "
                "traditional crafts, artisans, their techniques, GI tags, and which crafts "
                "belong to which regions.\n\n"
                "Try asking me:\n"
                "• \"What crafts can I find near Hyderabad?\"\n"
                "• \"Tell me about Pochampally Ikat\"\n"
                "• \"Which crafts are from Rajasthan?\"\n"
                "• \"What government schemes help artisans?\""
            ),
            "sources": [],
            "retrieved": 0,
        }

    # ── Generate answer ──
    answer_text = None

    # Try Groq LLM first
    if groq_client:
        answer_text = _groq_generate(question, chunks, chat_history)

    # Fallback to local extractive if Groq fails or unavailable
    if not answer_text:
        answer_text = _local_fallback(question, chunks)

    if not answer_text:
        answer_text = (
            "I found some related information but couldn't form a clear answer. "
            "Try rephrasing your question, or ask about a specific craft, state, or artisan."
        )

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
        "model":   "Groq Llama 3.1" if groq_client else "local-extractive",
        "groq_configured": groq_client is not None,
    }
