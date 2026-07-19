"""
RAG retriever — semantic search over legal_chunks via pgvector.
Uses psycopg2 direct connection (PostgREST can't cast vector type).
"""

import os
import psycopg2
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()

_model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")


def _get_model() -> SentenceTransformer:
    return _model


def retrieve_legal_context(
    contract_text: str,
    filter_countries: list[str],
    top_k: int = 10,
) -> str:
    model = _get_model()
    snippet = contract_text[:2000]
    embedding = model.encode(snippet).tolist()
    vec_str = "[" + ",".join(str(x) for x in embedding) + "]"

    try:
        conn = psycopg2.connect(os.environ["DATABASE_URL"])
        cur = conn.cursor()
        cur.execute(
            """
            SELECT chunk_text, law_title, country, section_ref,
                1 - (embedding <=> %s::vector) AS similarity
            FROM legal_chunks
            WHERE country = ANY(%s)
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """,
            (vec_str, filter_countries, vec_str, top_k),
        )

        rows = cur.fetchall()
        cur.close()
        conn.close()

        if not rows:
            print("[retriever] No chunks returned — country filter may be too narrow")
            return ""

        lines = ["RELEVANT LEGAL CONTEXT (retrieved from verified legal corpus):"]
        for i, row in enumerate(rows, 1):
            lines.append(f"\n[{i}] {row[1]} ({row[2]})")
            lines.append(row[0].strip())

        return "\n".join(lines)

    except Exception as e:
        print(f"[retriever] pgvector search error: {e}")
        return ""
