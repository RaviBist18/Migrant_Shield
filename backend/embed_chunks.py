from sentence_transformers import SentenceTransformer
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()
supabase = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])
model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")

rows = (
    supabase.table("legal_chunks")
    .select("chunk_id,chunk_text")
    .is_("embedding", "null")
    .execute()
    .data
)
print(f"Found {len(rows)} unembedded chunks")

for i, row in enumerate(rows):
    emb = model.encode(row["chunk_text"]).tolist()
    supabase.table("legal_chunks").update({"embedding": emb}).eq(
        "chunk_id", row["chunk_id"]
    ).execute()
    print(f"[{i+1}/{len(rows)}] Embedded {row['chunk_id']}")

print("Done.")
