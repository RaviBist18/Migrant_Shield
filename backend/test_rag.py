from sentence_transformers import SentenceTransformer
from rag import search_legal_chunks
from dotenv import load_dotenv

load_dotenv()
model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")

query = "passport confiscation employer"
embedding = model.encode(query).tolist()

results = search_legal_chunks(embedding, country="Oman", limit=3)
print(f"Count: {len(results)}")
for r in results:
    print(f"[{r['similarity']:.3f}] {r['law_title']} | {r['section_ref']}")
    print(r["chunk_text"][:200])
    print("---")
