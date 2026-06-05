# =============================================================
# FILE: backend/main.py
# MigrantShield Phase 6 + Gap 3 + Gap 4 — FastAPI Main Application
# =============================================================

import os
import time
import uuid
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

import httpx
import jwt
from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from supabase import Client, create_client

load_dotenv(override=True)

# =============================================================
# LOGGING
# =============================================================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("migrantshield")

# =============================================================
# ENV
# =============================================================
SUPABASE_URL         = os.environ["SUPABASE_URL"]
SUPABASE_SERVICE_KEY = os.environ["SUPABASE_SERVICE_KEY"]
SUPABASE_BUCKET      = os.environ.get("SUPABASE_BUCKET", "migrantshield-contracts")
FRONTEND_URL         = os.environ.get("FRONTEND_URL", "http://localhost:3000")
JWKS_URL             = f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json"
ADMIN_USER_ID        = os.environ.get("ADMIN_USER_ID", "")

# =============================================================
# SUPABASE CLIENT
# =============================================================
def _get_supabase() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# =============================================================
# FASTAPI APP
# =============================================================
app = FastAPI(
    title="MigrantShield API",
    version="6.2.0",
    description="AI-powered employment contract risk analysis for migrant workers.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def recover_stuck_contracts():
    """Reset contracts stuck in 'processing' for >10 minutes on startup."""
    try:
        supabase = _get_supabase()
        cutoff = (datetime.now(timezone.utc) - timedelta(minutes=10)).isoformat()
        result = supabase.table("contracts").update({
            "status":       "failed",
            "error_reason": "Processing timeout — auto-recovered on restart.",
        }).eq("status", "processing").lt("upload_date", cutoff).execute()
        count = len(result.data) if result.data else 0
        if count:
            logger.info(f"[startup] Recovered {count} stuck contracts.")
        else:
            logger.info("[startup] No stuck contracts found.")
    except Exception as e:
        logger.warning(f"[startup] Stuck contract recovery failed: {e}")

# =============================================================
# JWKS — ES256 TOKEN VALIDATION
# =============================================================
_jwks_cache: dict = {}
_jwks_cached_at: float = 0
JWKS_CACHE_TTL = 3600  # seconds

def _get_jwks() -> dict:
    global _jwks_cache, _jwks_cached_at
    now = time.time()
    if _jwks_cache and (now - _jwks_cached_at) < JWKS_CACHE_TTL:
        return _jwks_cache
    resp = httpx.get(JWKS_URL, timeout=10)
    resp.raise_for_status()
    _jwks_cache = resp.json()
    _jwks_cached_at = now
    return _jwks_cache

def _validate_jwt(token: str) -> dict:
    try:
        headers = jwt.get_unverified_header(token)
    except jwt.DecodeError:
        raise HTTPException(status_code=401, detail="Invalid token format.")

    jwks = _get_jwks()
    kid = headers.get("kid")
    key = None
    for k in jwks.get("keys", []):
        if k.get("kid") == kid:
            key = jwt.algorithms.ECAlgorithm.from_jwk(k)
            break
    if not key:
        raise HTTPException(status_code=401, detail="Signing key not found.")
    try:
        payload = jwt.decode(
            token,
            key,
            algorithms=["ES256"],
            options={"verify_aud": False},
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired.")
    except jwt.InvalidTokenError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {e}")

def _extract_token(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Bearer token.")
    return auth.split(" ", 1)[1]

def _get_current_user(request: Request) -> dict:
    token = _extract_token(request)
    return _validate_jwt(token)

# =============================================================
# ALLOWED MIME TYPES
# =============================================================
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/webp",
}

ALLOWED_LANGUAGES = {"en", "ne", "hi", "ar", "tl", "bn"}

MAX_FILE_SIZE_MB    = 10
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

# =============================================================
# ROUTES
# =============================================================

# --------------------------------------------------------------
# HEALTH CHECK
# --------------------------------------------------------------
@app.get("/health")
async def health():
    return {"status": "ok", "version": "6.2.0", "timestamp": datetime.now(timezone.utc).isoformat()}


# --------------------------------------------------------------
# POST /upload
# Accepts contract file + optional language param.
# Stores in Supabase Storage, enqueues background analysis.
# --------------------------------------------------------------
@app.post("/upload")
async def upload_contract(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    language: str = Form(default="en"),
):
    user = _get_current_user(request)
    user_id = user.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload.")

    # Validate language
    if language not in ALLOWED_LANGUAGES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language: {language}. Allowed: {', '.join(sorted(ALLOWED_LANGUAGES))}"
        )

    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {file.content_type}. Allowed: PDF, PNG, JPG, WEBP."
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds {MAX_FILE_SIZE_MB}MB limit."
        )

    contract_id = str(uuid.uuid4())
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
    object_path = f"contracts/{user_id}/{contract_id}.{ext}"

    supabase = _get_supabase()

    # Upload to storage
    try:
        supabase.storage.from_(SUPABASE_BUCKET).upload(
            path=object_path,
            file=file_bytes,
            file_options={"content-type": file.content_type, "upsert": "false"},
        )
    except Exception as e:
        logger.error(f"Storage upload failed: {e}")
        raise HTTPException(status_code=500, detail="File storage failed.")

    # Insert contracts row
    try:
        supabase.table("contracts").insert({
            "contract_id":           contract_id,
            "user_id":               user_id,
            "file_path":             object_path,
            "mime_type":             file.content_type,
            "original_filename":     file.filename,
            "status":                "queued",
            "legal_review_required": False,
            "language":              language,
            "upload_date":           datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as e:
        logger.error(f"DB insert failed: {e}")
        raise HTTPException(status_code=500, detail="Database record creation failed.")

    # Enqueue via ARQ
    from worker import enqueue_contract_sync
    background_tasks.add_task(enqueue_contract_sync, contract_id)

    logger.info(f"Contract queued: {contract_id} user={user_id} language={language}")
    return {"contract_id": contract_id, "status": "queued", "language": language}


# --------------------------------------------------------------
# GET /status/{contract_id}
# Returns processing status. JWT-gated + ownership verified.
# --------------------------------------------------------------
@app.get("/status/{contract_id}")
async def get_status(contract_id: str, request: Request):
    user = _get_current_user(request)
    user_id = user.get("sub")

    supabase = _get_supabase()

    try:
        result = supabase.table("contracts").select(
            "contract_id, status, risk_score, error_reason, analyzed_at, upload_date, language"
        ).eq("contract_id", contract_id).eq("user_id", user_id).single().execute()
    except Exception:
        raise HTTPException(status_code=404, detail="Contract not found.")

    if not result.data:
        raise HTTPException(status_code=404, detail="Contract not found.")

    contract = result.data

    # Fetch report if completed
    report_url = None
    if contract["status"] == "completed":
        try:
            report_result = supabase.table("reports").select(
                "report_id, pdf_url, generated_at"
            ).eq("contract_id", contract_id).order(
                "generated_at", desc=True
            ).limit(1).execute()
            if report_result.data:
                report_url = report_result.data[0].get("pdf_url")
        except Exception:
            pass

    return {
        "contract_id":  contract["contract_id"],
        "status":       contract["status"],
        "risk_score":   contract.get("risk_score"),
        "error":        contract.get("error_reason"),
        "analyzed_at":  contract.get("analyzed_at"),
        "upload_date":  contract.get("upload_date"),
        "language":     contract.get("language", "en"),
        "report_ready": report_url is not None,
    }

# --------------------------------------------------------------
# GET /report/{contract_id}
# Returns full analysis: contract metadata + all flags + risk score.
# JWT-gated + ownership verified.
# --------------------------------------------------------------
@app.get("/report/{contract_id}")
async def get_report(contract_id: str, request: Request):
    user = _get_current_user(request)
    user_id = user.get("sub")

    supabase = _get_supabase()

    # Verify ownership + fetch contract
    try:
        result = supabase.table("contracts").select(
            "contract_id, status, risk_score, worker_name, employer_name, "
            "country, original_filename, upload_date, analyzed_at, language, error_reason"
        ).eq("contract_id", contract_id).eq("user_id", user_id).single().execute()
    except Exception:
        raise HTTPException(status_code=404, detail="Contract not found.")

    if not result.data:
        raise HTTPException(status_code=403, detail="Access denied.")

    contract = result.data

    if contract["status"] != "completed":
        raise HTTPException(
            status_code=425,
            detail=f"Analysis not complete. Current status: {contract['status']}"
        )

    # Fetch flags
    try:
        flags_result = supabase.table("contract_flags").select(
            "flag_id, flag_type, severity, title, description, clause_text, recommendation, mitigation_steps, legal_references, created_at"
        ).eq("contract_id", contract_id).order("severity").execute()
        flags = flags_result.data or []
    except Exception as e:
        logger.error(f"Flags fetch failed: {e}")
        flags = []

    return {
        "contract_id":     contract["contract_id"],
        "worker_name":     contract.get("worker_name"),
        "employer_name":   contract.get("employer_name"),
        "country":         contract.get("country"),
        "original_filename": contract.get("original_filename"),
        "upload_date":     contract.get("upload_date"),
        "analyzed_at":     contract.get("analyzed_at"),
        "language":        contract.get("language", "en"),
        "risk_score":      contract.get("risk_score"),
        "flags":           flags,
        "flags_count":     len(flags),
        "critical_count":  sum(1 for f in flags if f["severity"] == "critical"),
        "warning_count":   sum(1 for f in flags if f["severity"] == "warning"),
        "info_count":      sum(1 for f in flags if f["severity"] == "info"),
    }

# --------------------------------------------------------------
# GET /report/{report_id}/download
# JWT-gated. Verifies ownership. Returns 24hr signed URL.
# Increments downloaded_count.
# --------------------------------------------------------------
@app.get("/report/{report_id}/download")
async def download_report(report_id: str, request: Request):
    user = _get_current_user(request)
    user_id = user.get("sub")

    supabase = _get_supabase()

    # Fetch report
    try:
        result = supabase.table("reports").select(
            "report_id, contract_id, pdf_url, downloaded_count"
        ).eq("report_id", report_id).single().execute()
    except Exception:
        raise HTTPException(status_code=404, detail="Report not found.")

    if not result.data:
        raise HTTPException(status_code=404, detail="Report not found.")

    report = result.data
    contract_id = report["contract_id"]

    # Verify ownership
    try:
        contract_result = supabase.table("contracts").select(
            "contract_id"
        ).eq("contract_id", contract_id).eq("user_id", user_id).single().execute()
    except Exception:
        raise HTTPException(status_code=403, detail="Access denied.")

    if not contract_result.data:
        raise HTTPException(status_code=403, detail="Access denied.")

    # Generate signed URL (24hr)
    object_path = report["pdf_url"]
    try:
        signed = supabase.storage.from_(SUPABASE_BUCKET).create_signed_url(
            object_path, expires_in=86400
        )
        signed_url = signed.get("signedURL") or signed.get("signed_url")
        if not signed_url:
            raise ValueError("Empty signed URL returned.")
    except Exception as e:
        logger.error(f"Signed URL generation failed: {e}")
        raise HTTPException(status_code=500, detail="Could not generate download link.")

    # Increment downloaded_count
    try:
        supabase.table("reports").update({
            "downloaded_count": report["downloaded_count"] + 1
        }).eq("report_id", report_id).execute()
    except Exception as e:
        logger.warning(f"downloaded_count increment failed: {e}")

    logger.info(f"Report downloaded: report_id={report_id} user={user_id}")
    return {
        "signed_url":  signed_url,
        "expires_in":  86400,
        "report_id":   report_id,
        "contract_id": contract_id,
    }


# --------------------------------------------------------------
# POST /review/request
# Worker-triggered. Inserts contract into human_review_queue.
# JWT-gated + ownership verified.
# --------------------------------------------------------------
@app.post("/review/request")
async def request_human_review(request: Request):
    user = _get_current_user(request)
    user_id = user.get("sub")

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body.")

    contract_id = body.get("contract_id")
    reason      = body.get("reason", "Worker requested human legal review.")

    if not contract_id:
        raise HTTPException(status_code=400, detail="contract_id required.")

    supabase = _get_supabase()

    # Verify ownership
    try:
        contract_result = supabase.table("contracts").select(
            "contract_id"
        ).eq("contract_id", contract_id).eq("user_id", user_id).single().execute()
    except Exception:
        raise HTTPException(status_code=404, detail="Contract not found.")

    if not contract_result.data:
        raise HTTPException(status_code=403, detail="Access denied.")

    # Check not already queued
    try:
        existing = supabase.table("human_review_queue").select(
            "review_id"
        ).eq("contract_id", contract_id).eq("status", "pending").execute()
        if existing.data:
            return {"status": "already_queued", "contract_id": contract_id}
    except Exception:
        pass

    # Insert review request
    try:
        supabase.table("human_review_queue").insert({
            "contract_id": contract_id,
            "reason":      reason,
            "status":      "pending",
            "created_at":  datetime.now(timezone.utc).isoformat(),
        }).execute()
    except Exception as e:
        logger.error(f"human_review_queue insert failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit review request.")

    logger.info(f"Human review requested: contract_id={contract_id} user={user_id}")
    return {
        "status":      "queued",
        "contract_id": contract_id,
        "message":     "Your contract has been flagged for human legal review.",
    }


# --------------------------------------------------------------
# GET /report/by-contract/{contract_id}
# Returns report metadata for a given contract_id.
# JWT-gated + ownership verified.
# --------------------------------------------------------------
@app.get("/report/by-contract/{contract_id}")
async def get_report_by_contract(contract_id: str, request: Request):
    user = _get_current_user(request)
    user_id = user.get("sub")

    supabase = _get_supabase()

    # Verify ownership
    try:
        contract_result = supabase.table("contracts").select(
            "contract_id"
        ).eq("contract_id", contract_id).eq("user_id", user_id).single().execute()
    except Exception:
        raise HTTPException(status_code=404, detail="Contract not found.")

    if not contract_result.data:
        raise HTTPException(status_code=403, detail="Access denied.")

    # Fetch latest report
    try:
        result = supabase.table("reports").select(
            "report_id, pdf_url, generated_at, downloaded_count"
        ).eq("contract_id", contract_id).order(
            "generated_at", desc=True
        ).limit(1).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Report fetch failed.")

    if not result.data:
        raise HTTPException(status_code=404, detail="No report found for this contract.")

    return result.data[0]


# --------------------------------------------------------------
# POST /contracts/{contract_id}/reanalyze  [Gap 3]
# Resets contract + flags + report row, re-enqueues analysis.
# JWT-gated + ownership verified.
# Rejects if status == "processing".
# --------------------------------------------------------------
@app.post("/contracts/{contract_id}/reanalyze")
async def reanalyze_contract(
    contract_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
):
    user = _get_current_user(request)
    user_id = user.get("sub")

    supabase = _get_supabase()

    # Verify ownership + fetch current status
    try:
        result = supabase.table("contracts").select(
            "contract_id, status"
        ).eq("contract_id", contract_id).eq("user_id", user_id).single().execute()
    except Exception:
        raise HTTPException(status_code=404, detail="Contract not found.")

    if not result.data:
        raise HTTPException(status_code=403, detail="Access denied.")

    contract = result.data

    if contract["status"] == "processing":
        raise HTTPException(
            status_code=409,
            detail="Contract is currently being processed. Wait until complete."
        )

    # Delete existing flags
    try:
        supabase.table("contract_flags").delete().eq("contract_id", contract_id).execute()
    except Exception as e:
        logger.error(f"Flag deletion failed for {contract_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear existing flags.")

    # Delete existing report row (PDF orphaned in storage — acceptable)
    try:
        supabase.table("reports").delete().eq("contract_id", contract_id).execute()
    except Exception as e:
        logger.warning(f"Report row deletion failed for {contract_id}: {e}")

    # Reset contract row
    try:
        supabase.table("contracts").update({
            "status":                "queued",
            "risk_score":            None,
            "error_reason":          None,
            "jurisdiction":          None,
            "legal_review_required": False,
            "analyzed_at":           None,
        }).eq("contract_id", contract_id).execute()
    except Exception as e:
        logger.error(f"Contract reset failed for {contract_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to reset contract.")

    # Re-enqueue
    from worker import enqueue_contract_sync
    background_tasks.add_task(enqueue_contract_sync, contract_id)

    logger.info(f"Reanalysis queued: contract_id={contract_id} user={user_id}")
    return {
        "contract_id": contract_id,
        "status":      "queued",
        "message":     "Contract queued for re-analysis.",
    }

    # =============================================================
# ADMIN — REVIEW QUEUE ENDPOINTS
# =============================================================

def _require_admin(request: Request) -> dict:
    user = _get_current_user(request)
    if user.get("sub") != ADMIN_USER_ID:
        raise HTTPException(status_code=403, detail="Admin access required.")
    return user


@app.get("/admin/review/queue")
async def get_review_queue(request: Request):
    _require_admin(request)
    supabase = _get_supabase()
    try:
        result = supabase.table("human_review_queue").select(
            "review_id, contract_id, reason, status, created_at"
        ).order("created_at", desc=False).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch queue: {e}")
    return {"queue": result.data or []}


@app.get("/admin/review/{review_id}")
async def get_review_detail(review_id: str, request: Request):
    _require_admin(request)
    supabase = _get_supabase()

    try:
        review = supabase.table("human_review_queue").select(
            "review_id, contract_id, reason, status, created_at"
        ).eq("review_id", review_id).single().execute()
    except Exception:
        raise HTTPException(status_code=404, detail="Review not found.")

    if not review.data:
        raise HTTPException(status_code=404, detail="Review not found.")

    contract_id = review.data["contract_id"]

    try:
        contract = supabase.table("contracts").select(
            "contract_id, status, risk_score, jurisdiction, language, upload_date, analyzed_at"
        ).eq("contract_id", contract_id).single().execute()
    except Exception:
        contract = None

    try:
        flags = supabase.table("contract_flags").select(
            "flag_id, severity, category, title, plain_language_explanation, ai_confidence"
        ).eq("contract_id", contract_id).execute()
    except Exception:
        flags = None

    return {
        "review":   review.data,
        "contract": contract.data if contract else None,
        "flags":    flags.data if flags else [],
    }


@app.patch("/admin/review/{review_id}")
async def update_review_status(review_id: str, request: Request):
    _require_admin(request)

    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body.")

    status = body.get("status")
    if status not in ("pending", "reviewed"):
        raise HTTPException(status_code=400, detail="status must be 'pending' or 'reviewed'.")

    supabase = _get_supabase()

    try:
        result = supabase.table("human_review_queue").update({
            "status": status,
        }).eq("review_id", review_id).execute()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update review: {e}")

    if not result.data:
        raise HTTPException(status_code=404, detail="Review not found.")

    return {"review_id": review_id, "status": status}