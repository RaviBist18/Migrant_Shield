# =============================================================
# FILE: backend/worker.py
# MigrantShield Phase 7 + Gap 4 — RAG-grounded pipeline + language
# =============================================================

import base64
import json
import os
import re
from datetime import datetime, timezone
from typing import Optional
import time

import httpx
from groq import Groq
from supabase import Client, create_client
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, HtmlContent, To

from pdf_generator import generate_and_store_pdf
from retriever import retrieve_legal_context
from jurisdiction_detector import detect_jurisdiction, get_sources_for_jurisdiction
from groq_utils import groq_chat_with_retry

# =============================================================
# CLIENTS
# =============================================================
def _get_supabase() -> Client:
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"],
    )

def _get_groq() -> Groq:
    return Groq(api_key=os.environ["GROQ_API_KEY"])



# =============================================================
# CONSTANTS
# =============================================================
TEXT_MODEL   = "llama-3.3-70b-versatile"
VISION_MODEL = "llama-4-scout-17b-16e-instruct"
BUCKET       = os.environ.get("SUPABASE_BUCKET", "migrantshield-contracts")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
CONFIDENCE_THRESHOLD = 0.85

LANGUAGE_NAMES = {
    "en": "English",
    "ne": "Nepali",
    "hi": "Hindi",
    "ar": "Arabic",
    "tl": "Filipino (Tagalog)",
    "bn": "Bengali",
}

ANALYSIS_SYSTEM_PROMPT = """
You are an expert employment law analyst specializing in migrant worker contract review.
Analyze the provided contract text and return ONLY a valid JSON object with this exact schema:

{
  "risk_score": <integer 0-100>,
  "confidence_score": <float 0.0-1.0>,
  "verdict": <"SAFE" | "CAUTION" | "CRITICAL">,
  "flags": [
    {
      "severity": <"CRITICAL" | "WARNING" | "INFO">,
      "category": <string>,
      "title": <string>,
      "contract_clause": <exact quoted text from contract>,
      "plain_language_explanation": <string>,
      "mitigation_steps": [<string>, ...],
      "legal_references": [<string>, ...],
      "ai_confidence": <float 0.0-1.0>
    }
  ]
}

Rules:
- Return ONLY the JSON object. No preamble, no explanation, no markdown fences.
- contract_clause must be exact text copied from the document.
- mitigation_steps must be actionable, specific, worker-focused.
- legal_references MUST cite only from the RELEVANT LEGAL CONTEXT provided. Do not invent citations.
- risk_score 0-30 = SAFE, 31-69 = CAUTION, 70-100 = CRITICAL.
""".strip()


def _build_system_prompt(language: str) -> str:
    lang_name = LANGUAGE_NAMES.get(language, "English")
    if language == "en":
        return ANALYSIS_SYSTEM_PROMPT
    return ANALYSIS_SYSTEM_PROMPT + f"\n- Return all text fields (title, plain_language_explanation, mitigation_steps, category) in {lang_name}. contract_clause must remain as exact original text from the contract — do NOT translate it."


# =============================================================
# SCHEMA VALIDATOR
# =============================================================
def _validate_analysis(data: dict) -> dict:
    required = ["risk_score", "confidence_score", "verdict", "flags"]
    for key in required:
        if key not in data:
            raise ValueError(f"Missing required field: {key}")

    data["risk_score"] = max(0, min(100, int(data["risk_score"])))
    data["confidence_score"] = max(0.0, min(1.0, float(data["confidence_score"])))

    if data["verdict"] not in ("SAFE", "CAUTION", "CRITICAL"):
        data["verdict"] = _resolve_verdict(data["risk_score"])

    validated_flags = []
    for flag in data.get("flags", []):
        validated_flags.append({
            "severity":                   flag.get("severity", "INFO").upper(),
            "category":                   flag.get("category", "General"),
            "title":                      flag.get("title", "Unnamed Issue"),
            "contract_clause":            flag.get("contract_clause", ""),
            "plain_language_explanation": flag.get("plain_language_explanation", ""),
            "mitigation_steps":           flag.get("mitigation_steps", []),
            "legal_references":           flag.get("legal_references", []),
            "ai_confidence":              max(0.0, min(1.0, float(flag.get("ai_confidence", 0.8)))),
        })
    data["flags"] = validated_flags
    return data


def _resolve_verdict(risk_score: int) -> str:
    if risk_score >= 70:
        return "CRITICAL"
    elif risk_score >= 31:
        return "CAUTION"
    return "SAFE"


def _parse_json_response(raw: str) -> dict:
    raw = raw.strip()
    raw = re.sub(r"^```json\s*", "", raw)
    raw = re.sub(r"^```\s*",     "", raw)
    raw = re.sub(r"\s*```$",     "", raw)
    return json.loads(raw)


# =============================================================
# TEXT EXTRACTION (PDF)
# =============================================================
def _extract_pdf_text(pdf_bytes: bytes) -> str:
    import fitz
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    pages = [page.get_text() for page in doc]
    doc.close()
    return "\n".join(pages).strip()


# =============================================================
# GROQ — TEXT ANALYSIS (RAG-grounded)
# =============================================================
def _analyze_text(groq: Groq, text: str, legal_context: str, language: str = "en") -> dict:
    system_prompt = _build_system_prompt(language)
    # NEW
    user_content = f"{legal_context}\n\n---\n\nAnalyze this employment contract:\n\n{text[:6000]}" \
        if legal_context else f"Analyze this employment contract:\n\n{text[:6000]}"
    raw = groq_chat_with_retry(
        groq=groq,
        model=TEXT_MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_content},
        ],
    )
    print(f"[worker] GROQ RAW RESPONSE: {raw[:500]}")
    return _validate_analysis(_parse_json_response(raw))


# =============================================================
# GROQ — VISION ANALYSIS (RAG-grounded)
# =============================================================
def _analyze_image(groq: Groq, image_bytes: bytes, mime_type: str, legal_context: str, language: str = "en") -> dict:
    b64 = base64.b64encode(image_bytes).decode("utf-8")
    system_prompt = _build_system_prompt(language)

    text_prompt = f"{system_prompt}\n\n{legal_context}\n\nAnalyze this employment contract image." \
        if legal_context else f"{system_prompt}\n\nAnalyze this employment contract image."

    raw = groq_chat_with_retry(
        groq=groq,
        model=VISION_MODEL,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:{mime_type};base64,{b64}"},
                    },
                    {
                        "type": "text",
                        "text": text_prompt,
                    },
                ],
            }
        ],
    )
    print(f"[worker] GROQ RAW RESPONSE: {raw[:500]}")
    return _validate_analysis(_parse_json_response(raw))


# =============================================================
# SUPABASE — FETCH FILE BYTES
# =============================================================
def _download_contract(supabase: Client, file_path: str) -> bytes:
    return supabase.storage.from_(BUCKET).download(file_path)


# =============================================================
# SENDGRID — TRANSACTIONAL EMAIL
# =============================================================
def _send_report_email(
    worker_email: str,
    worker_name: str,
    contract_id: str,
    verdict: str,
    risk_score: int,
    signed_url: str,
) -> None:
    api_key = os.environ.get("SENDGRID_API_KEY")
    if not api_key:
        print("[worker] SENDGRID_API_KEY not set — skipping email delivery")
        return

    report_url = f"{FRONTEND_URL}/report/{contract_id}"

    verdict_color = {
        "CRITICAL": "#b91c1c",
        "CAUTION":  "#b45309",
        "SAFE":     "#15803d",
    }.get(verdict, "#334155")

    html_body = f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#0f172a;padding:24px 32px;">
          <p style="margin:0;color:#ffffff;font-size:18px;font-weight:bold;">MigrantShield</p>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;">AI Contract Risk Report Ready</p>
        </td></tr>
        <tr><td style="padding:32px;">
          <p style="margin:0 0 16px;color:#0f172a;font-size:15px;">Dear {worker_name or "Valued Worker"},</p>
          <p style="margin:0 0 24px;color:#334155;font-size:14px;line-height:1.6;">
            Your employment contract has been analyzed. Your risk report is now ready.
          </p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td width="50%" style="padding:16px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;text-align:center;">
                <p style="margin:0;color:#94a3b8;font-size:11px;text-transform:uppercase;">Risk Score</p>
                <p style="margin:4px 0 0;color:#0f172a;font-size:28px;font-weight:bold;">{risk_score}</p>
                <p style="margin:2px 0 0;color:#94a3b8;font-size:11px;">out of 100</p>
              </td>
              <td width="8px"></td>
              <td width="50%" style="padding:16px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:6px;text-align:center;">
                <p style="margin:0;color:#94a3b8;font-size:11px;text-transform:uppercase;">Verdict</p>
                <p style="margin:4px 0 0;font-size:20px;font-weight:bold;color:{verdict_color};">{verdict}</p>
              </td>
            </tr>
          </table>
          <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
            <tr>
              <td style="padding-right:12px;">
                <a href="{signed_url}" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:13px;font-weight:bold;">
                  Download PDF Report
                </a>
              </td>
              <td>
                <a href="{report_url}" style="display:inline-block;background:#ffffff;color:#0f172a;text-decoration:none;padding:12px 24px;border-radius:6px;font-size:13px;font-weight:bold;border:1px solid #e2e8f0;">
                  View Full Report
                </a>
              </td>
            </tr>
          </table>
          <p style="margin:0;color:#94a3b8;font-size:11px;line-height:1.5;">
            The PDF download link expires in 24 hours. Return to MigrantShield to generate a new link at any time.
          </p>
        </td></tr>
        <tr><td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#94a3b8;font-size:10px;line-height:1.6;">
            Automated Translation Aid Only — Not Legal Advice.<br>
            This report was generated by an AI system and does not constitute legal advice.
            Always consult a qualified legal professional before taking action.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
""".strip()

    message = Mail(
        from_email="ravibist103@gmail.com",
        to_emails=To(worker_email),
        subject=f"Your MigrantShield Contract Report — {verdict}",
    )
    message.add_content(HtmlContent(html_body))

    try:
        sg = SendGridAPIClient(api_key)
        sg.send(message)
        print(f"[worker] Email sent to {worker_email}")
    except Exception as e:
        print(f"[worker] SendGrid error: {e}")


# =============================================================
# HUMAN REVIEW QUEUE — INSERT
# =============================================================
def _enqueue_human_review(
    supabase: Client,
    contract_id: str,
    reason: str,
) -> None:
    try:
        supabase.table("human_review_queue").insert({
            "contract_id": contract_id,
            "reason":      reason,
            "status":      "pending",
            "created_at":  datetime.now(timezone.utc).isoformat(),
        }).execute()
        print(f"[worker] Human review queued for contract={contract_id}")
    except Exception as e:
        print(f"[worker] human_review_queue insert error: {e}")


# =============================================================
# SIGNED URL HELPER
# =============================================================
def _generate_signed_url(supabase: Client, object_path: str) -> Optional[str]:
    try:
        result = supabase.storage.from_(BUCKET).create_signed_url(
            object_path, expires_in=86400
        )
        return result.get("signedURL") or result.get("signed_url")
    except Exception as e:
        print(f"[worker] signed URL error: {e}")
        return None


# =============================================================
# MAIN TASK ENTRY POINT
# =============================================================
async def process_contract(contract_id: str) -> None:
    supabase = _get_supabase()
    groq     = _get_groq()

    # STEP 1: Fetch contract record
    try:
        result = supabase.table("contracts").select("*").eq(
            "contract_id", contract_id
        ).single().execute()
        contract = result.data
        if not contract:
            raise ValueError(f"Contract not found: {contract_id}")
    except Exception as e:
        print(f"[worker] FATAL contract fetch failed: {e}")
        return

    supabase.table("contracts").update({
        "status": "processing"
    }).eq("contract_id", contract_id).execute()

    file_path  = contract["file_path"]
    user_id    = contract["user_id"]
    mime_type  = contract.get("mime_type", "application/pdf")
    legal_flag = contract.get("legal_review_required", False)
    language   = contract.get("language", "en")

    print(f"[worker] Language={language} for contract={contract_id}")

    # STEP 2: Fetch worker email
    worker_email = None
    worker_name  = None
    try:
        user_resp    = supabase.auth.admin.get_user(user_id)
        worker_email = user_resp.user.email
        worker_name  = (
            user_resp.user.user_metadata.get("full_name")
            or user_resp.user.user_metadata.get("name")
            or worker_email
        )
    except Exception as e:
        print(f"[worker] auth user fetch error: {e}")

    # STEP 3: Download file
    try:
        file_bytes = _download_contract(supabase, file_path)
    except Exception as e:
        supabase.table("contracts").update({
            "status":       "failed",
            "error_reason": f"File download failed: {e}",
        }).eq("contract_id", contract_id).execute()
        return

    # STEP 4: Jurisdiction detection + RAG retrieval + Groq analysis
    try:
        if mime_type == "application/pdf":
            text = _extract_pdf_text(file_bytes)
            if len(text.strip()) < 100:
                # Scanned PDF — OCR all pages via Tesseract
                import fitz
                import pytesseract
                from PIL import Image
                import io

                pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

                doc = fitz.open(stream=file_bytes, filetype="pdf")
                ocr_pages = []
                for page in doc:
                    pix = page.get_pixmap(dpi=200)
                    img = Image.open(io.BytesIO(pix.tobytes("png")))
                    ocr_text = pytesseract.image_to_string(img, lang="eng")
                    if ocr_text.strip():
                        ocr_pages.append(ocr_text)
                doc.close()

                text = "\n".join(ocr_pages).strip()
                print(f"[worker] OCR extracted {len(text)} chars from scanned PDF")

                if len(text.strip()) < 100:
                    # OCR failed — fallback to vision model
                    print(f"[worker] OCR failed — falling back to vision model")
                    doc = fitz.open(stream=file_bytes, filetype="pdf")
                    page = doc[0]
                    pix = page.get_pixmap(dpi=150)
                    img_bytes = pix.tobytes("png")
                    doc.close()
                    jurisdiction = "Unknown"
                    jurisdiction_sources = get_sources_for_jurisdiction(jurisdiction)
                    legal_context = retrieve_legal_context(supabase, "", jurisdiction_sources)
                    analysis = _analyze_image(groq, img_bytes, "image/png", legal_context, language)
                else:
                    # OCR succeeded — full pipeline
                    print(f"[worker] Detecting jurisdiction for scanned contract={contract_id}")
                    jurisdiction = detect_jurisdiction(groq, text)
                    jurisdiction_sources = get_sources_for_jurisdiction(jurisdiction)
                    print(f"[worker] Jurisdiction={jurisdiction} sources={len(jurisdiction_sources)}")
                    legal_context = retrieve_legal_context(supabase, text, jurisdiction_sources)
                    print(f"[worker] Legal context length={len(legal_context)} chars")
                    time.sleep(3)
                    analysis = _analyze_text(groq, text, legal_context, language)
            else:
                # Normal PDF — full pipeline
                print(f"[worker] Detecting jurisdiction for contract={contract_id}")
                jurisdiction = detect_jurisdiction(groq, text)
                jurisdiction_sources = get_sources_for_jurisdiction(jurisdiction)
                print(f"[worker] Jurisdiction={jurisdiction} sources={len(jurisdiction_sources)}")
                legal_context = retrieve_legal_context(supabase, text, jurisdiction_sources)
                print(f"[worker] Legal context length={len(legal_context)} chars")
                time.sleep(3)
                analysis = _analyze_text(groq, text, legal_context, language)
        else:
            # Image upload
            jurisdiction = "Unknown"
            jurisdiction_sources = get_sources_for_jurisdiction(jurisdiction)
            legal_context = retrieve_legal_context(supabase, "", jurisdiction_sources)
            analysis = _analyze_image(groq, file_bytes, mime_type, legal_context, language)

    except Exception as e:
        supabase.table("contracts").update({
            "status":       "failed",
            "error_reason": f"Groq analysis failed: {e}",
        }).eq("contract_id", contract_id).execute()
        return

    risk_score       = analysis["risk_score"]
    confidence_score = analysis["confidence_score"]
    verdict          = analysis["verdict"]
    flags            = analysis["flags"]

    # STEP 5: Write flags
    try:
        if flags:
            flag_rows = [
                {
                    "contract_id":                contract_id,
                    "severity":                   f["severity"],
                    "category":                   f["category"],
                    "title":                      f["title"],
                    "contract_clause":            f["contract_clause"],
                    "plain_language_explanation": f["plain_language_explanation"],
                    "mitigation_steps":           f["mitigation_steps"],
                    "legal_references":           f.get("legal_references", []),
                    "ai_confidence":              f["ai_confidence"],
                }
                for f in flags
            ]
            supabase.table("contract_flags").insert(flag_rows).execute()
    except Exception as e:
        print(f"[worker] contract_flags insert error: {e}")

    supabase.table("contracts").update({
        "status":      "completed",
        "risk_score":  risk_score,
        "analyzed_at": datetime.now(timezone.utc).isoformat(),
        "jurisdiction": jurisdiction,
    }).eq("contract_id", contract_id).execute()

    # STEP 6: Generate + upload PDF

    try:
        pdf_object_path = generate_and_store_pdf(
            supabase=supabase,
            contract_id=contract_id,
            worker_name=worker_name or "Unknown Worker",
            risk_score=float(risk_score),
            confidence_score=confidence_score,
            analyzed_at=datetime.now(timezone.utc),
            flags=flags,
            bucket=BUCKET,
            language=language,
        )
    except Exception as e:
        print(f"[worker] PDF generation failed contract={contract_id} error={e}")
        pdf_object_path = None

    # STEP 7: SendGrid notification
    if worker_email and pdf_object_path:
        signed_url = _generate_signed_url(supabase, pdf_object_path)
        if signed_url:
            _send_report_email(
                worker_email=worker_email,
                worker_name=worker_name or "",
                contract_id=contract_id,
                verdict=verdict,
                risk_score=risk_score,
                signed_url=signed_url,
            )

    # STEP 8: Human review queue
    review_reasons = []
    if confidence_score < CONFIDENCE_THRESHOLD:
        review_reasons.append(
            f"AI confidence {int(confidence_score * 100)}% below {int(CONFIDENCE_THRESHOLD * 100)}% threshold."
        )
    if legal_flag:
        review_reasons.append("Worker explicitly requested legal review.")

    if review_reasons:
        _enqueue_human_review(
            supabase=supabase,
            contract_id=contract_id,
            reason=" | ".join(review_reasons),
        )

    print(f"[worker] Pipeline complete contract={contract_id} verdict={verdict} score={risk_score} language={language}")