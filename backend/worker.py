# =============================================================
# FILE: backend/worker.py
# MigrantShield Phase 5 — ARQ Async Worker + Groq + Legal Corpus
# =============================================================

import io
import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path

import fitz  # PyMuPDF
from groq import Groq
from arq import create_pool
from arq.connections import RedisSettings
from dotenv import load_dotenv
from supabase import Client, create_client

load_dotenv(override=True)

# =============================================================
# LOGGING
# =============================================================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migrantshield.worker")

# =============================================================
# ENV
# =============================================================
SUPABASE_URL         = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
SUPABASE_BUCKET      = os.environ.get("SUPABASE_BUCKET", "migrantshield-contracts")
GROQ_API_KEY         = os.environ["GROQ_API_KEY"]
REDIS_URL            = os.environ["REDIS_URL"]

# =============================================================
# CORPUS CACHE
# =============================================================
_corpus_cache: dict[str, str] = {}

# =============================================================
# CLIENTS
# =============================================================
_groq_client = Groq(api_key=GROQ_API_KEY)

def _get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# =============================================================
# REDIS SETTINGS
# =============================================================
def _parse_redis_settings(url: str) -> RedisSettings:
    url = url.strip()
    ssl = url.startswith("rediss://")
    url_stripped = url.replace("rediss://", "").replace("redis://", "")
    auth_part, host_part = url_stripped.rsplit("@", 1)
    password = auth_part.split(":", 1)[1] if ":" in auth_part else auth_part
    host, port_str = host_part.rsplit(":", 1)
    port = int(port_str)
    return RedisSettings(host=host, port=port, password=password, ssl=ssl)

REDIS_SETTINGS = _parse_redis_settings(REDIS_URL)

# =============================================================
# LEGAL CORPUS LOADER
# =============================================================

def _get_corpus_for_country(country: str | None) -> str:
    if not country or not _corpus_cache:
        # Return ILO conventions as fallback
        ilo_keys = [k for k in _corpus_cache if k.startswith("ilo_")]
        parts = [_corpus_cache[k] for k in ilo_keys]
        return "\n\n---\n\n".join(parts)

    country_lower = country.lower()
    mapping = {
        "united arab emirates": ["uae_labour_law_2021", "ilo_c029", "ilo_c189"],
        "qatar":                 ["qatar_labour_law", "qatar_labour_law_2017_amendment", "ilo_c029"],
        "saudi arabia":          ["saudi_labour_law", "ilo_c029", "ilo_c189"],
        "philippines":           ["poea_rules_full", "poea_standard_contract", "ilo_c143"],
    }

    keys = next((v for k, v in mapping.items() if k in country_lower), None)
    if not keys:
        keys = [k for k in _corpus_cache if k.startswith("ilo_")]

    parts = [_corpus_cache[k] for k in keys if k in _corpus_cache]
    return "\n\n---\n\n".join(parts)


def _load_corpus() -> None:
    global _corpus_cache
    corpus_dir = Path(__file__).parent / "legal_corpus"
    if not corpus_dir.exists():
        logger.warning(f"[corpus] Directory not found: {corpus_dir}")
        return
    for pdf_path in corpus_dir.glob("*.pdf"):
        try:
            doc = fitz.open(str(pdf_path))
            text = ""
            for page in doc:
                text += page.get_text()
            doc.close()
            key = pdf_path.stem
            _corpus_cache[key] = text[:3000]
            logger.info(f"[corpus] Loaded: {pdf_path.name} ({len(_corpus_cache[key])} chars)")
        except Exception as e:
            logger.warning(f"[corpus] Failed to load {pdf_path.name}: {e}")
    logger.info(f"[corpus] Total loaded: {list(_corpus_cache.keys())}")

_load_corpus()

# =============================================================
# ANALYSIS PROMPT
# =============================================================
ANALYSIS_PROMPT = """You are a senior legal expert specialising in migrant worker employment contracts and international labour law.

Analyse the provided contract and respond ONLY with a valid JSON object.
Do not include any explanation, markdown, or text outside the JSON.
LANGUAGE INSTRUCTION: Generate ALL human-readable text fields (title, description, flag_type, recommendation, mitigation_steps array items) in the language specified at the end of this prompt. Legal reference citations remain in English.

You have access to relevant legal corpus documents (ILO Conventions, destination country labour laws) appended below the contract text.
Use these to cite specific legal references for each flag you detect.

Required JSON structure:
{
  "worker_name": "string or null",
  "employer_name": "string or null",
  "country": "string or null",
  "monthly_salary": "string or null",
  "working_hours_per_week": "number or null",
  "contract_duration_months": "number or null",
  "flags": [
    {
      "flag_type": "string",
      "severity": "critical | warning | info",
      "title": "string",
      "description": "string",
      "clause_text": "string or null",
      "recommendation": "string",
      "mitigation_steps": [
        "Step 1 as plain string",
        "Step 2 as plain string",
        "Step 3 as plain string"
      ],
      "legal_references": [
        "ILO Convention No. 29 (Forced Labour), Article 2",
        "UAE Labour Law 2021, Article 13"
      ]
    }
  ]
}

Rules for mitigation_steps:
- Provide 2-4 concrete, actionable steps in plain language
- Written directly to the worker (use "You should...", "Request...", "Contact...")
- No legal jargon

Rules for legal_references — MANDATORY:
- You MUST populate legal_references for EVERY flag. Empty array is NOT acceptable.
- Legal corpus is appended below the contract text. Read it. Cite from it.
- Format EXACTLY: "Document Name, Article X: one-line description"
- Minimum 1 reference per flag. Maximum 3.
- If no exact match, cite nearest ILO Convention article by number.
- NEVER return an empty legal_references array.

Flag detection rules — flag ANY of these if found:
CRITICAL:
- Passport or document confiscation by employer
- Recruitment or placement fees charged to worker
- Wage deductions not agreed in writing
- Physical restriction of movement
- No right to terminate contract
- Debt bondage clauses
- Threat of deportation as disciplinary measure
- Working hours exceeding 60 hours/week with no overtime pay
- Salary below destination country minimum wage

WARNING:
- Probation period exceeding 6 months
- Excessive notice period (>3 months) for worker only
- One-sided termination rights (employer only)
- No mention of rest days or annual leave
- Vague or missing salary terms
- Automatic contract renewal without worker consent
- Penalty clauses for resigning

INFO:
- Contract language worker may not understand
- No mention of dispute resolution mechanism
- Missing employer contact details
- No mention of health insurance or medical coverage
- Jurisdiction not specified

If no flags found, return empty array for flags.
Be thorough. Migrant workers depend on accurate detection."""

# =============================================================
# RISK SCORE CALCULATION
# =============================================================
def _calculate_risk_score(flags: list[dict]) -> int:
    if not flags:
        return 5

    critical = sum(1 for f in flags if f.get("severity", "").lower() == "critical")
    warning  = sum(1 for f in flags if f.get("severity", "").lower() == "warning")
    info     = sum(1 for f in flags if f.get("severity", "").lower() == "info")

    score = (critical * 18) + (warning * 7) + (info * 2)

    if critical >= 1:
        score = max(score, 55)
    if warning >= 3:
        score = max(score, 35)

    return min(score, 100)

# =============================================================
# GROQ ANALYSIS
# =============================================================

async def _analyse_with_groq(file_bytes: bytes, mime_type: str, country_hint: str | None = None, language: str = "en") -> dict:
    # Extract text from PDF
    logger.info(f"[worker] _analyse_with_groq called: country_hint={country_hint!r}")
    if mime_type == "application/pdf":
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
    else:
        doc = fitz.open(stream=file_bytes, filetype=mime_type.split("/")[1])
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()

    if not text.strip():
        raise ValueError("Could not extract text from document. File may be scanned image without OCR.")

    # Truncate contract text to 5000 chars (leave room for corpus)
    contract_text = text[:5000]

    # Get relevant legal corpus
    corpus_text = _get_corpus_for_country(country_hint)
    logger.info(f"[DEBUG] corpus_text len={len(corpus_text)} bool={bool(corpus_text)} first50={corpus_text[:50]!r}")

    # Build full prompt
    language_instruction = f"\n\nIMPORTANT: Generate ALL text fields (title, description, recommendation, mitigation_steps, legal_references) in language code: '{language}'. Do not use English if a different language is specified."
    if corpus_text:
        full_prompt = (
            f"{ANALYSIS_PROMPT}{language_instruction}\n\n"
            f"CONTRACT TEXT:\n{contract_text}\n\n"
            f"=== LEGAL CORPUS (use for citations) ===\n{corpus_text}"
        )
    else:
        full_prompt = f"{ANALYSIS_PROMPT}{language_instruction}\n\nCONTRACT TEXT:\n{contract_text}"

    logger.info(f"[worker] Prompt size: {len(full_prompt)} chars")

    response = _groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": full_prompt}],
        temperature=0.1,
        max_tokens=6000,
    )

    raw_text = response.choices[0].message.content.strip()
    logger.info(f"[DEBUG] Groq raw: {raw_text[:800]}")
    logger.info(f"[DEBUG] Groq raw output: {raw_text[:500]}")
    raw_text = re.sub(r"^```json\s*", "", raw_text)
    raw_text = re.sub(r"^```\s*", "", raw_text)
    raw_text = re.sub(r"\s*```$", "", raw_text)

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError as e:
        logger.error(f"[worker] Groq JSON parse failed: {e}\nRaw: {raw_text[:500]}")
        raise ValueError(f"Groq returned invalid JSON: {e}")

    return parsed

# =============================================================
# MAIN JOB: process_contract
# =============================================================
async def process_contract(ctx, contract_id: str):
    logger.info(f"[worker] Starting analysis: contract_id={contract_id}")
    supabase = _get_supabase()

    # Mark as processing
    try:
        supabase.table("contracts").update({
            "status": "processing",
        }).eq("contract_id", contract_id).execute()
    except Exception as e:
        logger.error(f"[worker] Status update to processing failed: {e}")
        return

    try:
        # Fetch contract row
        result = supabase.table("contracts").select(
            "contract_id, file_path, mime_type, language"
        ).eq("contract_id", contract_id).single().execute()

        if not result.data:
            raise ValueError("Contract record not found in DB.")

        contract  = result.data
        file_path = contract["file_path"]
        mime_type = contract["mime_type"]
        report_language = contract.get("language", "en")


        # Download file from Supabase Storage
        logger.info(f"[worker] Downloading file: {file_path}")
        try:
            file_bytes = supabase.storage.from_(SUPABASE_BUCKET).download(file_path)
        except Exception as e:
            raise ValueError(f"Storage download failed: {e}")

        if not file_bytes:
            raise ValueError("Downloaded file is empty.")

        # First pass — quick country extraction for corpus selection
        # (reuse text extracted in _analyse_with_groq — pass None for country_hint first)
        logger.info(f"[worker] Sending to Groq: mime_type={mime_type}")
        analysis = await _analyse_with_groq(file_bytes, mime_type, country_hint=None, language=report_language)

        country = analysis.get("country")

        # If country detected, re-run with corpus injected
        if country and _corpus_cache:
            logger.info(f"[worker] Country detected: {country}. Re-running with corpus.")
            analysis = await _analyse_with_groq(file_bytes, mime_type, country_hint=country, language=report_language)

        # Extract fields
        flags         = analysis.get("flags", [])
        worker_name   = analysis.get("worker_name")
        employer_name = analysis.get("employer_name")
        country       = analysis.get("country")

        # Risk score
        risk_score = _calculate_risk_score(flags)
        logger.info(f"[worker] Risk score: {risk_score}, Flags: {len(flags)}")

        # Insert flags
        if flags:
            flag_rows = []
            for flag in flags:
                severity = flag.get("severity", "info")
                if severity not in ("critical", "warning", "info"):
                    severity = "info"

                # Ensure mitigation_steps is a list
                mitigation_steps = flag.get("mitigation_steps", [])
                if not isinstance(mitigation_steps, list):
                    mitigation_steps = [str(mitigation_steps)]

                # Ensure legal_references is a list
                legal_references = flag.get("legal_references", [])
                if not isinstance(legal_references, list):
                    legal_references = [str(legal_references)]

                flag_rows.append({
                    "contract_id":      contract_id,
                    "flag_type":        flag.get("flag_type", "unknown"),
                    "severity":         severity,
                    "title":            flag.get("title", "Untitled Flag"),
                    "description":      flag.get("description", ""),
                    "clause_text":      flag.get("clause_text"),
                    "recommendation":   flag.get("recommendation", ""),
                    "mitigation_steps": mitigation_steps,
                    "legal_references": legal_references,
                })

            supabase.table("contract_flags").insert(flag_rows).execute()
            logger.info(f"[worker] Inserted {len(flag_rows)} flags.")

        # Update contract row
        supabase.table("contracts").update({
            "status":        "completed",
            "risk_score":    risk_score,
            "worker_name":   worker_name,
            "employer_name": employer_name,
            "country":       country,
            "analyzed_at":   datetime.now(timezone.utc).isoformat(),
            "error_reason":  None,
        }).eq("contract_id", contract_id).execute()

        logger.info(f"[worker] Completed: contract_id={contract_id}")

    except Exception as e:
        error_msg = str(e)
        logger.error(f"[worker] Analysis failed: contract_id={contract_id} error={error_msg}")
        try:
            supabase.table("contracts").update({
                "status":       "failed",
                "error_reason": error_msg[:500],
            }).eq("contract_id", contract_id).execute()
        except Exception as db_err:
            logger.error(f"[worker] Failed to write error status: {db_err}")

# =============================================================
# ARQ WORKER SETTINGS
# =============================================================
class WorkerSettings:
    functions      = [process_contract]
    redis_settings = REDIS_SETTINGS
    max_jobs       = 5
    job_timeout    = 180     # 3 min — corpus re-run needs more time
    keep_result    = 3600

# =============================================================
# ENQUEUE HELPERS
# =============================================================
async def enqueue_contract(contract_id: str):
    pool = await create_pool(REDIS_SETTINGS)
    await pool.enqueue_job("process_contract", contract_id)
    await pool.close()
    logger.info(f"[enqueue] Job queued: contract_id={contract_id}")

def enqueue_contract_sync(contract_id: str):
    import asyncio
    asyncio.run(enqueue_contract(contract_id))