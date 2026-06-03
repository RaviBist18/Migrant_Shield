"""
RAG retriever — semantic search over legal_chunks via pgvector.
Filters by jurisdiction-relevant sources before similarity search.
Called by worker.py before Groq analysis.
"""

import os
from sentence_transformers import SentenceTransformer
from supabase import Client

_model: SentenceTransformer | None = None


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
    return _model


def retrieve_legal_context(
    supabase: Client,
    contract_text: str,
    jurisdiction_sources: list[str],
    top_k: int = 10,
) -> str:
    """
    Embed contract_text, search legal_chunks filtered by jurisdiction_sources,
    return formatted string ready for prompt injection.

    Args:
        supabase: Supabase service client
        contract_text: Extracted contract text
        jurisdiction_sources: List of source labels to restrict search to
        top_k: Number of chunks to retrieve
    """
    model = _get_model()

    # First 2000 chars sufficient for semantic signal
    snippet = contract_text[:2000]
    embedding = model.encode(snippet).tolist()

    try:
        result = supabase.rpc(
            "match_legal_chunks_filtered",
            {
                "query_embedding":      embedding,
                "match_count":          top_k,
                "filter_sources":       jurisdiction_sources,
            }
        ).execute()

        chunks = result.data
        if not chunks:
            print("[retriever] No chunks returned — jurisdiction filter may be too narrow")
            return ""

        lines = ["RELEVANT LEGAL CONTEXT (retrieved from verified legal corpus):"]
        for i, chunk in enumerate(chunks, 1):
            lines.append(f"\n[{i}] Source: {chunk['source']}")
            lines.append(chunk["chunk_text"].strip())

        return "\n".join(lines)

    except Exception as e:
        print(f"[retriever] pgvector search error: {e}")
        return ""