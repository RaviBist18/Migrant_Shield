import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()


def search_legal_chunks(
    query_embedding: list, country: str = None, limit: int = 5
) -> list[dict]:
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()

    vec_str = "[" + ",".join(str(x) for x in query_embedding) + "]"

    if country:
        cur.execute(
            """
            SELECT chunk_text, section_ref, law_title, country,
                1 - (embedding <=> %s::vector) AS similarity
            FROM legal_chunks
            WHERE country = %s
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """,
            (vec_str, country, vec_str, limit),
        )
    else:
        cur.execute(
            """
            SELECT chunk_text, section_ref, law_title, country,
                1 - (embedding <=> %s::vector) AS similarity
            FROM legal_chunks
            ORDER BY embedding <=> %s::vector
            LIMIT %s
        """,
            (vec_str, vec_str, limit),
        )

    rows = cur.fetchall()
    cur.close()
    conn.close()

    return [
        {
            "chunk_text": r[0],
            "section_ref": r[1],
            "law_title": r[2],
            "country": r[3],
            "similarity": r[4],
        }
        for r in rows
    ]
