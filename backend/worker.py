# =============================================================
# FILE: backend/worker.py
# MigrantShield Phase 5 — ARQ Async Worker + Groq + RAG
# =============================================================

import io
import json
import logging
import os
import re
from datetime import datetime, timezone
from pathlib import Path

import resource

import fitz  # PyMuPDF
from groq import Groq
from arq import create_pool
from arq.connections import RedisSettings
from arq import cron
from dotenv import load_dotenv
from supabase import Client, create_client

# from retriever import retrieve_legal_context

load_dotenv(override=True)

# =============================================================
# LOGGING
# =============================================================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migrantshield.worker")


def _log_memory(tag: str):
    usage_kb = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    logger.info(f"[mem] {tag}: {usage_kb / 1024:.1f} MB")


# =============================================================
# ENV
# =============================================================
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
SUPABASE_BUCKET = os.environ.get("SUPABASE_BUCKET", "migrantshield-contracts")
REDIS_URL = os.environ["REDIS_URL"]
GROQ_KEYS = [
    os.environ.get("GROQ_API_KEY_1"),
    os.environ.get("GROQ_API_KEY_2"),
    os.environ.get("GROQ_API_KEY_3"),
]
GROQ_KEYS = [k for k in GROQ_KEYS if k]

if not GROQ_KEYS:
    raise RuntimeError("No GROQ_API_KEY_1/2/3 found in environment.")

_groq_clients = [Groq(api_key=k) for k in GROQ_KEYS]


def _groq_create_with_rotation(**kwargs):
    """Try each Groq key in order, fall through on rate limit / failure."""
    last_err = None
    for i, client in enumerate(_groq_clients):
        try:
            return client.chat.completions.create(**kwargs)
        except Exception as e:
            err_str = str(e).lower()
            if "rate limit" in err_str or "429" in err_str:
                logger.warning(f"[groq] key #{i+1} rate limited, trying next.")
                last_err = e
                continue
            raise  # non-rate-limit error, fail immediately
    raise RuntimeError(f"All Groq keys exhausted. Last error: {last_err}")


# from sentence_transformers import SentenceTransformer

# _embedding_model = SentenceTransformer("paraphrase-multilingual-MiniLM-L12-v2")


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
    return RedisSettings(
        host=host,
        port=port,
        password=password,
        ssl=ssl,
        conn_timeout=10,
        conn_retries=10,
        conn_retry_delay=2,
    )


REDIS_SETTINGS = _parse_redis_settings(REDIS_URL)


# =============================================================
# COUNTRY DETECTION (fast keyword scan — no Groq call)
# =============================================================
COUNTRY_KEYWORDS = {
    "UAE": ["united arab emirates", "uae", "dubai", "abu dhabi", "sharjah"],
    "Qatar": ["qatar", "doha"],
    "Saudi Arabia": ["saudi arabia", "saudi", "riyadh", "jeddah", "ksa"],
    "Kuwait": ["kuwait", "kuwait city"],
    "Oman": ["oman", "muscat"],
    "Malaysia": ["malaysia", "kuala lumpur", "kl"],
    "Nepal": ["nepal", "kathmandu"],
    "Philippines": ["philippines", "philippine", "manila", "poea"],
}


def _detect_country(text: str) -> str | None:
    lower = text[:3000].lower()
    for country, keywords in COUNTRY_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            return country
    return None


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
      "description": "string — MANDATORY sentence count depends on severity: critical=2 sentences, warning=2 sentences, info=1 sentence. Each ending in '.', '!', or '?', concatenated as ONE string. When 2 sentences required: sentence 1 = what the clause literally says, sentence 2 = why it is legally/practically risky. Sentences must NOT be near-duplicates of each other or of mitigation_steps/recommendation. Fewer sentences than required for that severity, or 2+ sentences saying the same thing in different words, is a FAILURE.",
      "clause_text": "string or null",
      "recommendation": "string — a single-line summary distinct in wording and content from 'description'. Do not restate description sentences.",
      "mitigation_steps": [
        "Step 1 as plain string",
        "Step 2 as plain string (omit if info severity — only 1 required)"
      ],
      "legal_references": [
        "ILO Convention No. 29 (Forced Labour), Article 2",
        "UAE Labour Law 2021, Article 13"
      ]
    }
  ]
}

Rules for mitigation_steps:
- MANDATORY count depends on severity: critical=2 items, warning=2 items, info=1 item. Fewer than required for that severity is NOT acceptable — if short, split one idea into concrete sub-steps.
- Each item is one short, complete, actionable sentence in plain language
- Every item MUST be an action the WORKER personally takes — start with an imperative verb aimed at the worker: "Ask...", "Request...", "Contact...", "Keep...", "Report...", "Refuse...", "Document...".
- NEVER phrase a step as a rule, prohibition, or description of what the employer should/must/must not do (e.g. "Employer must not confiscate passport", "Deductions should not exceed X%") — that belongs in 'description', not here. If you catch yourself writing "should not" or "must not" about the employer, rewrite it as something the worker can go do instead.
- No legal jargon
- Fewer items than required for the flag's severity is a failure
- CRITICAL: mitigation_steps and recommendation must NOT repeat or rephrase any sentence already used in description. description = what/why the clause is risky. mitigation_steps = what to DO about it. Different content, not paraphrase of same fact.
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
    warning = sum(1 for f in flags if f.get("severity", "").lower() == "warning")
    info = sum(1 for f in flags if f.get("severity", "").lower() == "info")

    score = (critical * 18) + (warning * 7) + (info * 2)

    if critical >= 1:
        score = max(score, 55)
    if warning >= 3:
        score = max(score, 35)

    return min(score, 100)


def _min_points_for_severity(severity: str) -> int:
    sev = (severity or "").lower()
    if sev == "critical":
        return 2
    if sev == "warning":
        return 2
    return 1  # info


def _validate_flag(flag: dict, sim_threshold: float = 0.90) -> list[str]:
    """Return list of problems found. Empty list = flag passes."""
    problems = []
    min_points = _min_points_for_severity(flag.get("severity"))

    description = (flag.get("description") or "").strip()
    sentences = [
        s.strip() for s in re.split(r"(?<=[.!?।])\s+", description) if s.strip()
    ]
    if len(sentences) < min_points:
        problems.append(f"description_needs_{min_points}_sentences")

    steps = flag.get("mitigation_steps") or []
    if not isinstance(steps, list):
        steps = [steps]
    if len(steps) < min_points:
        problems.append(f"mitigation_steps_needs_{min_points}_items")

    return problems


# =============================================================
# TEXT EXTRACTION ROUTER
# =============================================================


def extract_text(file_bytes: bytes, mime_type: str) -> str:
    if mime_type == "application/pdf":
        return _extract_from_pdf(file_bytes)
    elif mime_type in ("image/png", "image/jpeg", "image/webp"):
        return _extract_from_image_groq_vision(file_bytes, mime_type)
    else:
        raise ValueError(f"Unsupported mime type: {mime_type}")


def _extract_from_pdf(file_bytes: bytes) -> str:
    # Try fitz first (fast, text-based PDF)
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        text = ""
        for page in doc:
            text += page.get_text()
        doc.close()
        if text.strip():
            logger.info("[extract] fitz text extraction succeeded")
            return text
    except Exception as e:
        logger.warning(f"[extract] fitz failed: {e}")

    # Fallback: scanned PDF → OCR
    logger.warning(
        "[extract] fitz returned empty — scanned/image-only PDF not supported"
    )
    raise ValueError(
        "This PDF appears to be scanned or image-based with no extractable text. "
        "Please upload a photo of the document instead, or a text-based PDF."
    )


def _extract_from_image_groq_vision(file_bytes: bytes, mime_type: str) -> str:
    import base64

    try:
        b64_image = base64.b64encode(file_bytes).decode("utf-8")
        response = _groq_create_with_rotation(
            model="qwen/qwen3.6-27b",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Extract all text from this document image exactly as written, preserving numbers, dates, and figures precisely. Output only the raw extracted text, no commentary, no formatting, no markdown.",
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{b64_image}"
                            },
                        },
                    ],
                }
            ],
            temperature=0,
        )
        text = response.choices[0].message.content
        logger.info(f"[extract] Groq vision OCR: {len(text)} chars")
        return text
    except Exception as e:
        logger.error(f"[extract] Groq vision OCR failed: {e}")
        raise ValueError(f"Groq vision extraction failed: {e}")


# =============================================================
# GROQ ANALYSIS (single pass with RAG)
# =============================================================
async def _analyse_with_groq(
    file_bytes: bytes, mime_type: str, language: str = "en"
) -> dict:
    text = extract_text(file_bytes, mime_type)
    if not text.strip():
        raise ValueError(
            "Could not extract text from document. File may be empty or unreadable."
        )
    return await _analyse_with_groq_text(text=text, language=language)


async def _analyse_with_groq_text(text: str, language: str = "en") -> dict:
    """Same as _analyse_with_groq but accepts pre-extracted text directly."""
    if not text.strip():
        raise ValueError("Empty text passed to analyser.")

    contract_text = text[:3000]
    country = _detect_country(contract_text)
    logger.info(f"[worker] Country detected: {country}")

    LANGUAGE_NAMES = {
        "ne": "Nepali (Devanagari script)",
        "hi": "Hindi (Devanagari script)",
        "ar": "Arabic",
        "fil": "Filipino (Tagalog)",
        "en": "English",
    }

    language_full_name = LANGUAGE_NAMES.get(language, language)

    language_instruction = (
        f"CRITICAL LANGUAGE REQUIREMENT: You MUST write the 'title', 'description', "
        f"'recommendation', and every 'mitigation_steps' item entirely in {language_full_name}. "
        f"Do not use Arabic, English, or any other language in these fields unless {language_full_name} IS English. "
        f"Empty strings or wrong-language text in these fields is a failure.\n\n"
    )

    # if corpus_text:
    #     full_prompt = (
    #         f"{language_instruction}{ANALYSIS_PROMPT}\n\n"
    #         f"CONTRACT TEXT:\n{contract_text}\n\n"
    #         f"=== LEGAL CORPUS (use for citations) ===\n{corpus_text}"
    #     )
    # else:

    full_prompt = (
        f"{language_instruction}{ANALYSIS_PROMPT}\n\nCONTRACT TEXT:\n{contract_text}"
    )

    logger.info(f"[worker] Prompt size: {len(full_prompt)} chars")

    response = _groq_create_with_rotation(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": full_prompt}],
        temperature=0.4,
        max_tokens=2000,
    )

    logger.info(
        f"[worker] finish_reason={response.choices[0].finish_reason} | raw_len={len(response.choices[0].message.content)}"
    )

    raw_text = response.choices[0].message.content.strip()
    logger.info(f"[worker] RAW SAMPLE: {raw_text[:1500]}")
    raw_text = re.sub(r"^```json\s*", "", raw_text)
    raw_text = re.sub(r"^```\s*", "", raw_text)
    raw_text = re.sub(r"\s*```$", "", raw_text)
    raw_text = raw_text.encode("utf-8", errors="replace").decode("utf-8")

    try:
        parsed = json.loads(raw_text)
    except json.JSONDecodeError as e:
        logger.error(f"[worker] JSON parse failed: {e}\nRaw: {raw_text[:500]}")
        raise ValueError(f"Groq returned invalid JSON: {e}")

    if not parsed.get("country") and country:
        parsed["country"] = country

    # -------- validation + single corrective retry --------
    flags = parsed.get("flags", [])
    bad_flags = [(i, _validate_flag(f)) for i, f in enumerate(flags)]
    bad_flags = [(i, p) for i, p in bad_flags if p]

    max_retries = 3
    attempt = 0
    while bad_flags and attempt < max_retries:
        attempt += 1
        logger.warning(
            f"[worker] Attempt {attempt}: validation failed for {len(bad_flags)} flag(s): {bad_flags}"
        )

        problem_lines = []
        for i, problems in bad_flags:
            title = flags[i].get("title", f"flag {i}")
            sev = flags[i].get("severity", "info")
            min_pts = _min_points_for_severity(sev)
            issues = []
            if any(p.startswith("description_needs_") for p in problems):
                issues.append(
                    f"'description' needs at least {min_pts} distinct sentence(s) — severity is '{sev}'"
                )
            if any(p.startswith("mitigation_steps_needs_") for p in problems):
                issues.append(
                    f"'mitigation_steps' needs at least {min_pts} distinct item(s) — severity is '{sev}'"
                )
            if any(p.startswith("overlap_") for p in problems):
                issues.append(
                    "a mitigation_step repeats the same idea as a description sentence — rewrite that step"
                )
            problem_lines.append(
                f'- Flag "{title}" (severity: {sev}): {"; ".join(issues)}'
            )

        correction_note = (
            "\n\nCORRECTION REQUIRED — specific problems found:\n"
            + "\n".join(problem_lines)
            + "\n\nRegenerate the FULL JSON. Point count required per flag depends on severity: "
            "info = at least 1, warning = at least 2, critical = at least 3 — for BOTH 'description' "
            "sentences AND 'mitigation_steps' items. Each point must be a genuinely distinct idea, "
            "not a rephrase. Never fall short of the minimum for that flag's severity."
        )

        retry_response = _groq_create_with_rotation(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": full_prompt + correction_note}],
            temperature=0.4,
            max_tokens=2000,
        )
        retry_raw = retry_response.choices[0].message.content.strip()
        retry_raw = re.sub(r"^```json\s*", "", retry_raw)
        retry_raw = re.sub(r"^```\s*", "", retry_raw)
        retry_raw = re.sub(r"\s*```$", "", retry_raw)
        retry_raw = retry_raw.encode("utf-8", errors="replace").decode("utf-8")

        try:
            retry_parsed = json.loads(retry_raw)
            if not retry_parsed.get("country") and country:
                retry_parsed["country"] = country
            parsed = retry_parsed
            flags = parsed.get("flags", [])
            bad_flags = [(i, _validate_flag(f)) for i, f in enumerate(flags)]
            bad_flags = [(i, p) for i, p in bad_flags if p]
        except json.JSONDecodeError as e:
            logger.error(
                f"[worker] Retry {attempt} JSON parse failed: {e} — stopping retries"
            )
            break

    if bad_flags:
        logger.warning(
            f"[worker] Gave up after {attempt} retries — {len(bad_flags)} flag(s) still fail validation"
        )
    else:
        logger.info(
            f"[worker] All flags pass validation after {attempt} retr{'y' if attempt==1 else 'ies'}"
        )

    return parsed


# =============================================================
# MAIN JOB: process_contract
# =============================================================
async def process_contract(ctx, contract_id: str):
    logger.info(f"[worker] Starting analysis: contract_id={contract_id}")
    _log_memory("process_contract start")
    supabase = _get_supabase()

    try:
        supabase.table("contracts").update(
            {
                "status": "processing",
            }
        ).eq("contract_id", contract_id).execute()
    except Exception as e:
        logger.error(f"[worker] Status update to processing failed: {e}")
        return

    import asyncio

    ping_task = (
        asyncio.create_task(_keepalive_during_job(ctx))
        if ctx and ctx.get("redis")
        else None
    )
    try:
        result = (
            supabase.table("contracts")
            .select("contract_id, file_path, mime_type, language, extracted_text")
            .eq("contract_id", contract_id)
            .single()
            .execute()
        )

        if not result.data:
            raise ValueError("Contract record not found in DB.")

        contract = result.data
        file_path = contract["file_path"]
        mime_type = contract["mime_type"]
        report_language = contract.get("language", "en")

        extracted_text = contract.get("extracted_text")

        if extracted_text:
            logger.info(f"[worker] Using cached extracted_text for {contract_id}")
            analysis = await _analyse_with_groq_text(
                text=extracted_text,
                language=report_language,
            )
        else:
            logger.info(f"[worker] Downloading file: {file_path}")
            try:
                file_bytes = supabase.storage.from_(SUPABASE_BUCKET).download(file_path)
            except Exception as e:
                raise ValueError(f"Storage download failed: {e}")
            if not file_bytes:
                raise ValueError("Downloaded file is empty.")
            _log_memory(f"after download, file_size={len(file_bytes)/1024:.0f}KB")
            analysis = await _analyse_with_groq(
                file_bytes=file_bytes,
                mime_type=mime_type,
                language=report_language,
            )

        _log_memory("after analysis")
        flags = analysis.get("flags", [])
        worker_name = analysis.get("worker_name")
        employer_name = analysis.get("employer_name")
        country = analysis.get("country")
        risk_score = _calculate_risk_score(flags)

        logger.info(f"[worker] Risk score: {risk_score}, Flags: {len(flags)}")

        if flags:
            flag_rows = []
            for flag in flags:
                severity = flag.get("severity", "info")
                if severity not in ("critical", "warning", "info"):
                    severity = "info"

                mitigation_steps = flag.get("mitigation_steps", [])
                if not isinstance(mitigation_steps, list):
                    mitigation_steps = [str(mitigation_steps)]

                legal_references = flag.get("legal_references", [])
                if not isinstance(legal_references, list):
                    legal_references = [str(legal_references)]

                # Derive legal_status from severity
                legal_status_map = {
                    "critical": "ILLEGAL",
                    "warning": "RESTRICTED",
                    "info": "UNKNOWN",
                }
                legal_status = legal_status_map.get(severity, "UNKNOWN")
                law_citation = legal_references[0] if legal_references else None

                flag_rows.append(
                    {
                        "contract_id": contract_id,
                        "flag_type": flag.get("flag_type", "unknown"),
                        "severity": severity,
                        "title": flag.get("title", "Untitled Flag"),
                        "description": flag.get("description", ""),
                        "clause_text": flag.get("clause_text"),
                        "recommendation": flag.get("recommendation", ""),
                        "mitigation_steps": mitigation_steps,
                        "legal_references": legal_references,
                        "legal_status": legal_status,
                        "law_citation": law_citation,
                    }
                )

            supabase.table("contract_flags").insert(flag_rows).execute()

        critical_count = sum(1 for f in flags if f.get("severity") == "critical")
        if risk_score >= 50 or critical_count >= 1:
            try:
                supabase.table("human_review_queue").insert(
                    {
                        "contract_id": contract_id,
                        "reason": f"Risk score {risk_score}, critical flags: {critical_count}",
                        "status": "pending",
                    }
                ).execute()
                logger.info(
                    f"[worker] Queued for human review: contract_id={contract_id}"
                )
            except Exception as e:
                logger.warning(f"[worker] Failed to insert review queue: {e}")

        supabase.table("contracts").update(
            {
                "status": "completed",
                "risk_score": risk_score,
                "worker_name": worker_name,
                "employer_name": employer_name,
                "country": country,
                "analyzed_at": datetime.now(timezone.utc).isoformat(),
                "error_reason": None,
            }
        ).eq("contract_id", contract_id).execute()

        logger.info(f"[worker] Completed: contract_id={contract_id}")

    except Exception as e:
        error_msg = str(e)
        logger.error(
            f"[worker] Analysis failed: contract_id={contract_id} error={error_msg}"
        )
        try:
            supabase.table("contracts").update(
                {
                    "status": "failed",
                    "error_reason": error_msg[:500],
                }
            ).eq("contract_id", contract_id).execute()
        except Exception as db_err:
            logger.error(f"[worker] Failed to write error status: {db_err}")
    finally:
        if ping_task:
            ping_task.cancel()


# =============================================================
# UPLOAD JOB: process_upload
# Extracts text + computes embedding, stores in contracts row
# Then enqueues process_contract
# =============================================================
async def process_upload(ctx, contract_id: str):
    logger.info(f"[worker] process_upload start: {contract_id}")
    supabase = _get_supabase()
    import asyncio

    ping_task = asyncio.create_task(_keepalive_during_job(ctx))
    try:
        result = (
            supabase.table("contracts")
            .select("contract_id, file_path, mime_type")
            .eq("contract_id", contract_id)
            .single()
            .execute()
        )
        if not result.data:
            raise ValueError("Contract not found.")

        contract = result.data
        file_bytes = supabase.storage.from_(SUPABASE_BUCKET).download(
            contract["file_path"]
        )
        if not file_bytes:
            raise ValueError("Downloaded file empty.")

        # Extract text
        text = extract_text(file_bytes, contract["mime_type"])
        if not text.strip():
            raise ValueError("Text extraction returned empty.")

        # Store extracted text
        supabase.table("contracts").update(
            {
                "extracted_text": text,
            }
        ).eq("contract_id", contract_id).execute()

        logger.info(
            f"[worker] process_upload done: {contract_id}, text={len(text)} chars"
        )

    except Exception as e:
        error_msg = str(e)[:400]
        logger.error(f"[worker] process_upload failed: {contract_id} {error_msg}")
        try:
            supabase.table("contracts").update(
                {
                    "status": "failed",
                    "error_reason": f"Upload processing failed: {error_msg}",
                }
            ).eq("contract_id", contract_id).execute()
        except Exception as inner_e:
            logger.error(f"[worker] Failed to write error status: {inner_e}")
    finally:
        ping_task.cancel()

    # Enqueue analysis — reuse arq's own pool, don't spin up a second one
    await ctx["redis"].enqueue_job("process_contract", contract_id)
    logger.info(
        f"[worker] process_contract enqueued from process_upload: {contract_id}"
    )


async def keep_redis_alive(ctx):
    try:
        await ctx["redis"].ping()
        logger.info("[worker] Redis keepalive ping OK")
    except Exception as e:
        logger.warning(f"[worker] Redis keepalive ping failed: {e}")


async def _keepalive_during_job(ctx, interval: int = 10):
    """Ping redis every `interval` seconds while a long job (OCR/Groq) runs."""
    import asyncio

    while True:
        await asyncio.sleep(interval)
        try:
            await ctx["redis"].ping()
        except Exception as e:
            logger.warning(f"[worker] in-job keepalive ping failed: {e}")


# =============================================================
# ARQ WORKER SETTINGS
# =============================================================
class WorkerSettings:
    functions = [process_contract, process_upload]
    cron_jobs = [cron(keep_redis_alive, second=set(range(0, 60, 30)))]
    redis_settings = REDIS_SETTINGS
    max_jobs = 5
    job_timeout = 180
    keep_result = 3600


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


async def enqueue_upload(contract_id: str):
    pool = await create_pool(REDIS_SETTINGS)
    await pool.enqueue_job("process_upload", contract_id)
    await pool.close()
    logger.info(f"[enqueue] Upload job queued: {contract_id}")


def enqueue_upload_sync(contract_id: str):
    import asyncio

    asyncio.run(enqueue_upload(contract_id))
