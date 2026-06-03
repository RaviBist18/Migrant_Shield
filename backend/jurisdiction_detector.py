"""
Lightweight jurisdiction detector.
Extracts employer country from contract text via Groq.
Called before RAG retrieval to filter legal chunks by relevant jurisdiction.
"""

import os
from groq import Groq

# Map detected country → legal_chunks source labels relevant to that jurisdiction
JURISDICTION_SOURCES = {
    "UAE":          [
                        "UAE Labour Law 2021",
                        "ILO Convention 29 — Forced Labour",
                        "ILO Convention 105 — Abolition of Forced Labour",
                        "ILO Convention 143 — Migrant Workers",
                        "ILO Convention 189 — Domestic Workers",
                    ],
    "Saudi Arabia": [
                        "Saudi Labour Law",
                        "ILO Convention 29 — Forced Labour",
                        "ILO Convention 105 — Abolition of Forced Labour",
                        "ILO Convention 143 — Migrant Workers",
                        "ILO Convention 189 — Domestic Workers",
                    ],
    "Qatar":        [
                        "Qatar Labour Law 2004",
                        "Qatar Labour Law 2017 Amendment",
                        "ILO Convention 29 — Forced Labour",
                        "ILO Convention 105 — Abolition of Forced Labour",
                        "ILO Convention 143 — Migrant Workers",
                        "ILO Convention 189 — Domestic Workers",
                    ],
    "Philippines":  [
                        "POEA Standard Employment Contract",
                        "POEA Rules and Regulations",
                        "ILO Convention 29 — Forced Labour",
                        "ILO Convention 143 — Migrant Workers",
                        "ILO Convention 189 — Domestic Workers",
                    ],
    "Unknown":      [
                        "ILO Convention 29 — Forced Labour",
                        "ILO Convention 105 — Abolition of Forced Labour",
                        "ILO Convention 143 — Migrant Workers",
                        "ILO Convention 189 — Domestic Workers",
                        "POEA Standard Employment Contract",
                        "UAE Labour Law 2021",
                        "Saudi Labour Law",
                        "Qatar Labour Law 2004",
                    ],
}

DETECTION_PROMPT = """
You are a contract jurisdiction detector.
Read the contract text and identify the EMPLOYER'S country.
Return ONLY one of these exact strings — nothing else:
UAE
Saudi Arabia
Qatar
Philippines
Unknown

Rules:
- Look for employer address, governing law clause, or currency references.
- If ambiguous or undetectable, return Unknown.
- Never return anything other than the exact strings above.
""".strip()

TEXT_MODEL = "llama-3.3-70b-versatile"


def detect_jurisdiction(groq: Groq, contract_text: str) -> str:
    """
    Returns one of: UAE, Saudi Arabia, Qatar, Philippines, Unknown
    Uses first 4000 chars — jurisdiction signals appear early in contracts.
    """
    try:
        response = groq.chat.completions.create(
            model=TEXT_MODEL,
            messages=[
                {"role": "system", "content": DETECTION_PROMPT},
                {"role": "user",   "content": contract_text[:4000]},
            ],
            temperature=0.0,
            max_tokens=10,
        )
        result = response.choices[0].message.content.strip()
        if result not in JURISDICTION_SOURCES:
            print(f"[jurisdiction] Unexpected response '{result}' — defaulting to Unknown")
            return "Unknown"
        print(f"[jurisdiction] Detected: {result}")
        return result
    except Exception as e:
        print(f"[jurisdiction] Detection failed: {e} — defaulting to Unknown")
        return "Unknown"


def get_sources_for_jurisdiction(jurisdiction: str) -> list[str]:
    """Returns list of source labels to filter pgvector search."""
    return JURISDICTION_SOURCES.get(jurisdiction, JURISDICTION_SOURCES["Unknown"])