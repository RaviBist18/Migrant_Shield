"""
One-time corpus ingestion script.
Reads PDFs from legal_corpus/, chunks text,
upserts into Supabase legal_chunks table (tsvector-based RAG, no embeddings).

Run from: E:/migrantshield/backend/
Command: python ingest_corpus.py
"""

import os
import sys
import uuid
import fitz
from pathlib import Path
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
CORPUS_DIR = Path(__file__).parent / "legal_corpus"
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50
CHARS_PER_TOKEN = 4
BATCH_SIZE = 50

CHUNK_CHARS = CHUNK_SIZE * CHARS_PER_TOKEN
OVERLAP_CHARS = CHUNK_OVERLAP * CHARS_PER_TOKEN

SOURCE_LABELS = {
    "ilo_c029": "ILO Convention 29 — Forced Labour",
    "ilo_c105": "ILO Convention 105 — Abolition of Forced Labour",
    "ilo_c143": "ILO Convention 143 — Migrant Workers",
    "ilo_c189_domestic_workers_convention_2011": "ILO Convention 189 — Domestic Workers",
    "uae_labour_law_2021": "UAE Labour Law 2021",
    "saudi_labour_law": "Saudi Labour Law",
    "qatar_labour_law": "Qatar Labour Law 2004",
    "qatar_labour_law_2017_amendment": "Qatar Labour Law 2017 Amendment",
    "poea_standard_contract": "POEA Standard Employment Contract",
    "poea_rules_full": "POEA Rules and Regulations",
    "kuwait_labour_law_2010": "Kuwait Labour Law No. 6/2010",
    "malaysia_employment_act_1955": "Malaysia Employment Act 1955",
    "nepal_foreign_employment_act_2007": "Nepal Foreign Employment Act 2007",
    "oman_labour_law_2003": "Oman Labour Law Royal Decree 35/2003",
}

COUNTRY_MAP = {
    "ilo_c029": "ILO",
    "ilo_c105": "ILO",
    "ilo_c143": "ILO",
    "ilo_c189_domestic_workers_convention_2011": "ILO",
    "uae_labour_law_2021": "UAE",
    "saudi_labour_law": "Saudi Arabia",
    "qatar_labour_law": "Qatar",
    "qatar_labour_law_2017_amendment": "Qatar",
    "poea_standard_contract": "Philippines",
    "poea_rules_full": "Philippines",
    "kuwait_labour_law_2010": "Kuwait",
    "malaysia_employment_act_1955": "Malaysia",
    "nepal_foreign_employment_act_2007": "Nepal",
    "oman_labour_law_2003": "Oman",
}


def extract_text(pdf_path: Path) -> str:
    doc = fitz.open(str(pdf_path))
    pages = []
    for page in doc:
        text = page.get_text("text")
        if text.strip():
            pages.append(text)
    doc.close()
    return "\n".join(pages)


def chunk_text(text: str, source: str) -> list[dict]:
    chunks = []
    start = 0
    idx = 0
    text_len = len(text)
    while start < text_len:
        end = min(start + CHUNK_CHARS, text_len)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append({"source": source, "chunk_index": idx, "chunk_text": chunk})
            idx += 1
        if end == text_len:
            break
        start = end - OVERLAP_CHARS
    return chunks


def upsert_chunks(supabase: Client, chunks: list[dict]) -> None:
    rows = [
        {
            "chunk_id": str(uuid.uuid4()),
            "source": c["source"],
            "chunk_index": c["chunk_index"],
            "chunk_text": c["chunk_text"],
            "country": c.get("country", "Unknown"),
            "law_title": c.get("law_title", c["source"]),
        }
        for c in chunks
    ]
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i : i + BATCH_SIZE]
        supabase.table("legal_chunks").insert(batch).execute()
        print(f"  Upserted rows {i+1}–{i+len(batch)}")


def already_ingested(supabase: Client, source: str) -> bool:
    result = (
        supabase.table("legal_chunks")
        .select("chunk_id", count="exact")
        .eq("source", source)
        .limit(1)
        .execute()
    )
    return result.count is not None and result.count > 0


def main() -> None:
    if not CORPUS_DIR.exists():
        print(f"ERROR: Corpus dir not found: {CORPUS_DIR}")
        sys.exit(1)

    supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    pdfs = list(CORPUS_DIR.glob("*.pdf"))
    if not pdfs:
        print(f"ERROR: No PDFs found in {CORPUS_DIR}")
        sys.exit(1)

    print(f"Found {len(pdfs)} PDFs.\n")

    for pdf_path in sorted(pdfs):
        stem = pdf_path.stem
        source_label = SOURCE_LABELS.get(stem, stem)

        print(f"[{stem}] Checking if already ingested...")
        if already_ingested(supabase, source_label):
            print(f"  SKIP — already in DB.\n")
            continue

        print(f"  Extracting text...")
        text = extract_text(pdf_path)
        if not text.strip():
            print(f"  WARN: No text extracted. Scanned PDF? Skipping.\n")
            continue
        print(f"  Extracted {len(text)} chars.")

        print(f"  Chunking (size={CHUNK_SIZE}tok, overlap={CHUNK_OVERLAP}tok)...")
        country = COUNTRY_MAP.get(stem, "Unknown")
        chunks = chunk_text(text, source_label)
        for c in chunks:
            c["country"] = country
            c["law_title"] = source_label
        print(f"  {len(chunks)} chunks.")

        print(f"  Upserting to Supabase...")
        upsert_chunks(supabase, chunks)

        print(f"  DONE — {source_label}\n")

    print("Ingestion complete.")


if __name__ == "__main__":
    main()
