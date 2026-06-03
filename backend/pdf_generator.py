# =============================================================
# FILE: backend/pdf_generator.py
# MigrantShield Phase 6 + Gap 4 — Multilingual PDF Generation
# =============================================================

import io
import os
import uuid
import urllib.request
from datetime import datetime, timezone
from typing import Optional

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    KeepTogether,
)
from reportlab.platypus.flowables import HRFlowable
from supabase import Client

# =============================================================
# FONT SETUP
# =============================================================
FONTS_DIR = os.path.join(os.path.dirname(__file__), "fonts")

FONT_URLS = {
    "NotoSans-Regular":      "https://github.com/google/fonts/raw/main/ofl/notosans/NotoSans-Regular.ttf",
    "NotoSans-Bold":         "https://github.com/google/fonts/raw/main/ofl/notosans/NotoSans-Bold.ttf",
    "NotoSansDevanagari-Regular": "https://github.com/google/fonts/raw/main/ofl/notosansdevanagari/NotoSansDevanagari-Regular.ttf",
    "NotoSansDevanagari-Bold":    "https://github.com/google/fonts/raw/main/ofl/notosansdevanagari/NotoSansDevanagari-Bold.ttf",
    "NotoSansArabic-Regular": "https://github.com/google/fonts/raw/main/ofl/notosansarabic/NotoSansArabic-Regular.ttf",
    "NotoSansArabic-Bold":    "https://github.com/google/fonts/raw/main/ofl/notosansarabic/NotoSansArabic-Bold.ttf",
}

# Language → (regular_font, bold_font, is_rtl)
LANGUAGE_FONT_MAP = {
    "en": ("Helvetica",                  "Helvetica-Bold",             False),
    "tl": ("Helvetica",                  "Helvetica-Bold",             False),
    "bn": ("NotoSans-Regular",           "NotoSans-Bold",              False),
    "ne": ("NotoSansDevanagari-Regular", "NotoSansDevanagari-Bold",    False),
    "hi": ("NotoSansDevanagari-Regular", "NotoSansDevanagari-Bold",    False),
    "ar": ("NotoSansArabic-Regular",     "NotoSansArabic-Bold",        True),
}

_fonts_registered: set = set()


def _ensure_font(font_name: str) -> None:
    """Download font if missing, register with ReportLab once."""
    if font_name in _fonts_registered:
        return
    if font_name.startswith("Helvetica"):
        _fonts_registered.add(font_name)
        return

    os.makedirs(FONTS_DIR, exist_ok=True)
    font_path = os.path.join(FONTS_DIR, f"{font_name}.ttf")

    if not os.path.exists(font_path):
        url = FONT_URLS.get(font_name)
        if not url:
            raise ValueError(f"No URL configured for font: {font_name}")
        print(f"[pdf_generator] Downloading font {font_name}...")
        urllib.request.urlretrieve(url, font_path)
        print(f"[pdf_generator] Font saved: {font_path}")

    pdfmetrics.registerFont(TTFont(font_name, font_path))
    _fonts_registered.add(font_name)


def _get_fonts(language: str) -> tuple[str, str, bool]:
    """Returns (regular, bold, is_rtl) for language. Falls back to Helvetica."""
    regular, bold, rtl = LANGUAGE_FONT_MAP.get(language, LANGUAGE_FONT_MAP["en"])
    _ensure_font(regular)
    _ensure_font(bold)
    return regular, bold, rtl


def _reshape_arabic(text: str) -> str:
    """Apply Arabic reshaping + bidi for correct RTL rendering."""
    try:
        import arabic_reshaper
        from bidi.algorithm import get_display
        reshaped = arabic_reshaper.reshape(text)
        return get_display(reshaped)
    except ImportError:
        print("[pdf_generator] arabic_reshaper/bidi not installed — Arabic may render incorrectly")
        return text


def _prep_text(text: str, is_rtl: bool) -> str:
    if is_rtl and text:
        return _reshape_arabic(text)
    return text


# =============================================================
# COLOR PALETTE — matches frontend design system
# =============================================================
SLATE_900  = colors.HexColor("#0f172a")
SLATE_700  = colors.HexColor("#334155")
SLATE_400  = colors.HexColor("#94a3b8")
SLATE_100  = colors.HexColor("#f1f5f9")
SLATE_50   = colors.HexColor("#f8fafc")
WHITE      = colors.HexColor("#ffffff")

CRIMSON_BG = colors.HexColor("#fef2f2")
CRIMSON_BD = colors.HexColor("#fecaca")
CRIMSON_TX = colors.HexColor("#b91c1c")

AMBER_BG   = colors.HexColor("#fffbeb")
AMBER_BD   = colors.HexColor("#fcd34d")
AMBER_TX   = colors.HexColor("#b45309")

EMERALD_BG = colors.HexColor("#f0fdf4")
EMERALD_BD = colors.HexColor("#86efac")
EMERALD_TX = colors.HexColor("#15803d")

VERDICT_COLORS = {
    "CRITICAL": (CRIMSON_TX, CRIMSON_BG),
    "CAUTION":  (AMBER_TX,   AMBER_BG),
    "SAFE":     (EMERALD_TX, EMERALD_BG),
}

SEVERITY_COLORS = {
    "CRITICAL": (CRIMSON_TX, CRIMSON_BG, CRIMSON_BD),
    "WARNING":  (AMBER_TX,   AMBER_BG,   AMBER_BD),
    "INFO":     (EMERALD_TX, EMERALD_BG, EMERALD_BD),
}

# =============================================================
# FOOTER RENDERER
# =============================================================
FOOTER_TEXT = "Automated Translation Aid Only — Not Legal Advice"

def _draw_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(SLATE_400)
    canvas.drawCentredString(
        A4[0] / 2,
        12 * mm,
        f"{FOOTER_TEXT}   |   Page {doc.page}   |   Contract ID: {doc.contract_id_str}"
    )
    canvas.setStrokeColor(SLATE_400)
    canvas.setLineWidth(0.3)
    canvas.line(15 * mm, 15 * mm, A4[0] - 15 * mm, 15 * mm)
    canvas.restoreState()


# =============================================================
# STYLE REGISTRY
# =============================================================
def _build_styles(font_regular: str, font_bold: str, is_rtl: bool):
    align_body  = TA_RIGHT if is_rtl else TA_LEFT
    align_title = TA_RIGHT if is_rtl else TA_LEFT

    styles = {
        "title": ParagraphStyle(
            "title",
            fontName=font_bold,
            fontSize=20,
            textColor=SLATE_900,
            spaceAfter=4,
            leading=24,
            alignment=align_title,
        ),
        "subtitle": ParagraphStyle(
            "subtitle",
            fontName=font_regular,
            fontSize=10,
            textColor=SLATE_700,
            spaceAfter=2,
            alignment=align_title,
        ),
        "section_header": ParagraphStyle(
            "section_header",
            fontName=font_bold,
            fontSize=11,
            textColor=SLATE_900,
            spaceBefore=10,
            spaceAfter=4,
            alignment=align_title,
        ),
        "body": ParagraphStyle(
            "body",
            fontName=font_regular,
            fontSize=9,
            textColor=SLATE_700,
            leading=14,
            spaceAfter=4,
            alignment=align_body,
        ),
        "body_bold": ParagraphStyle(
            "body_bold",
            fontName=font_bold,
            fontSize=9,
            textColor=SLATE_900,
            leading=14,
            alignment=align_body,
        ),
        "clause_quote": ParagraphStyle(
            "clause_quote",
            fontName="Helvetica-Oblique",  # clause always Latin original
            fontSize=8.5,
            textColor=SLATE_700,
            leading=13,
            leftIndent=6,
            rightIndent=6,
        ),
        "flag_title": ParagraphStyle(
            "flag_title",
            fontName=font_bold,
            fontSize=9.5,
            leading=13,
            alignment=align_title,
        ),
        "flag_body": ParagraphStyle(
            "flag_body",
            fontName=font_regular,
            fontSize=8.5,
            textColor=SLATE_700,
            leading=13,
            alignment=align_body,
        ),
        "verdict_text": ParagraphStyle(
            "verdict_text",
            fontName=font_bold,
            fontSize=15,
            alignment=TA_CENTER,
        ),
        "score_label": ParagraphStyle(
            "score_label",
            fontName=font_regular,
            fontSize=8,
            textColor=SLATE_400,
            alignment=TA_CENTER,
        ),
        "score_value": ParagraphStyle(
            "score_value",
            fontName=font_bold,
            fontSize=28,
            textColor=SLATE_900,
            alignment=TA_CENTER,
            leading=32,
        ),
        "disclaimer": ParagraphStyle(
            "disclaimer",
            fontName=font_regular,
            fontSize=7.5,
            textColor=SLATE_400,
            leading=11,
            spaceAfter=2,
            alignment=align_body,
        ),
        "footer_section": ParagraphStyle(
            "footer_section",
            fontName=font_regular,
            fontSize=8,
            textColor=SLATE_400,
            leading=11,
            alignment=align_body,
        ),
    }
    return styles


# =============================================================
# VERDICT RESOLVER
# =============================================================
def _resolve_verdict(risk_score: float) -> str:
    if risk_score >= 70:
        return "CRITICAL"
    elif risk_score >= 40:
        return "CAUTION"
    return "SAFE"


# =============================================================
# SEVERITY BADGE
# =============================================================
def _severity_badge_table(severity: str, font_bold: str):
    tx, bg, bd = SEVERITY_COLORS.get(severity.upper(), (SLATE_700, SLATE_100, SLATE_400))
    label = Paragraph(
        f"<font name='{font_bold}' size='7'>{severity.upper()}</font>",
        ParagraphStyle("badge", fontName=font_bold, fontSize=7,
                       textColor=tx, alignment=TA_CENTER)
    )
    t = Table([[label]], colWidths=[18 * mm], rowHeights=[5 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), bg),
        ("BOX",           (0, 0), (-1, -1), 0.5, bd),
        ("TOPPADDING",    (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("LEFTPADDING",   (0, 0), (-1, -1), 4),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 4),
    ]))
    return t


# =============================================================
# MAIN PDF BUILDER
# =============================================================
def build_pdf(
    contract_id: str,
    worker_name: str,
    risk_score: float,
    confidence_score: float,
    analyzed_at: datetime,
    flags: list[dict],
    language: str = "en",
) -> bytes:
    font_regular, font_bold, is_rtl = _get_fonts(language)
    styles  = _build_styles(font_regular, font_bold, is_rtl)
    buffer  = io.BytesIO()
    verdict = _resolve_verdict(risk_score)
    verdict_color, verdict_bg = VERDICT_COLORS[verdict]

    def p(text: str, style_key: str) -> Paragraph:
        """Prep text (RTL reshape if needed) + wrap in Paragraph."""
        return Paragraph(_prep_text(str(text), is_rtl), styles[style_key])

    # Doc template
    doc = BaseDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=15 * mm,
        rightMargin=15 * mm,
        topMargin=18 * mm,
        bottomMargin=22 * mm,
    )
    doc.contract_id_str = contract_id

    frame = Frame(
        doc.leftMargin, doc.bottomMargin,
        doc.width, doc.height,
        id="main"
    )
    template = PageTemplate(
        id="main_template",
        frames=[frame],
        onPage=_draw_footer
    )
    doc.addPageTemplates([template])

    story = []

    # ==========================================================
    # SECTION 1: HEADER
    # ==========================================================
    story.append(p("MigrantShield", "title"))
    story.append(p("AI-Assisted Employment Contract Risk Report", "subtitle"))
    story.append(HRFlowable(width="100%", thickness=0.5, color=SLATE_400, spaceAfter=6))

    meta_data = [
        [_prep_text("Worker Name:", is_rtl), worker_name or "Not provided"],
        [_prep_text("Contract ID:", is_rtl), contract_id],
        [_prep_text("Analysis Date:", is_rtl), analyzed_at.strftime("%d %B %Y, %H:%M UTC") if analyzed_at else "Unknown"],
    ]
    meta_table = Table(meta_data, colWidths=[38 * mm, 130 * mm])
    meta_table.setStyle(TableStyle([
        ("FONTNAME",     (0, 0), (0, -1), font_bold),
        ("FONTNAME",     (1, 0), (1, -1), font_regular),
        ("FONTSIZE",     (0, 0), (-1, -1), 8.5),
        ("TEXTCOLOR",    (0, 0), (0, -1), SLATE_900),
        ("TEXTCOLOR",    (1, 0), (1, -1), SLATE_700),
        ("TOPPADDING",   (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 2),
        ("LEFTPADDING",  (0, 0), (-1, -1), 0),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 6 * mm))

    # ==========================================================
    # SECTION 2: VERDICT BANNER
    # ==========================================================
    verdict_label = Paragraph(
        _prep_text(f"OVERALL VERDICT: {verdict}", is_rtl),
        ParagraphStyle(
            "vb", fontName=font_bold, fontSize=14,
            textColor=verdict_color, alignment=TA_CENTER
        )
    )
    verdict_banner = Table([[verdict_label]], colWidths=[doc.width])
    verdict_banner.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), verdict_bg),
        ("BOX",           (0, 0), (-1, -1), 1.0, verdict_color),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(verdict_banner)
    story.append(Spacer(1, 4 * mm))

    # ==========================================================
    # SECTION 3: SCORE + CONFIDENCE METRICS
    # ==========================================================
    score_cell = [
        [p("RISK SCORE", "score_label")],
        [p(str(int(risk_score)), "score_value")],
        [p("out of 100", "score_label")],
    ]
    conf_cell = [
        [p("AI CONFIDENCE", "score_label")],
        [p(f"{int(confidence_score * 100)}%", "score_value")],
        [Paragraph(
            _prep_text(
                "⚠ Below threshold" if confidence_score < 0.85 else "Within threshold",
                is_rtl
            ),
            ParagraphStyle(
                "ct", fontName=font_regular, fontSize=7,
                textColor=AMBER_TX if confidence_score < 0.85 else EMERALD_TX,
                alignment=TA_CENTER
            )
        )],
    ]

    score_tbl = Table([score_cell[0], score_cell[1], score_cell[2]], colWidths=[doc.width / 2])
    score_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), SLATE_50),
        ("BOX",           (0, 0), (-1, -1), 0.5, SLATE_400),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
    ]))

    conf_tbl = Table([conf_cell[0], conf_cell[1], conf_cell[2]], colWidths=[doc.width / 2])
    conf_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), AMBER_BG if confidence_score < 0.85 else EMERALD_BG),
        ("BOX",           (0, 0), (-1, -1), 0.5, AMBER_BD if confidence_score < 0.85 else EMERALD_BD),
        ("TOPPADDING",    (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ALIGN",         (0, 0), (-1, -1), "CENTER"),
    ]))

    metrics_row = Table([[score_tbl, conf_tbl]], colWidths=[doc.width / 2, doc.width / 2])
    metrics_row.setStyle(TableStyle([
        ("LEFTPADDING",  (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING",   (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 0),
        ("VALIGN",       (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(metrics_row)
    story.append(Spacer(1, 3 * mm))

    story.append(p(
        "This report was generated by an automated AI system. Confidence scores reflect model certainty "
        "over extracted text. Results may be incomplete for scanned, handwritten, or non-standard documents. "
        "This report does not constitute legal advice. Always consult a qualified legal professional before "
        "acting on any finding.",
        "disclaimer"
    ))
    story.append(HRFlowable(width="100%", thickness=0.3, color=SLATE_400, spaceBefore=4, spaceAfter=6))

    # ==========================================================
    # SECTION 4: FLAG ITEMS
    # ==========================================================
    story.append(p("Identified Contract Risk Flags", "section_header"))
    story.append(Spacer(1, 2 * mm))

    if not flags:
        story.append(p("No risk flags were identified in this contract.", "body"))
    else:
        for idx, flag in enumerate(flags, start=1):
            severity = (flag.get("severity") or "INFO").upper()
            tx, bg, bd = SEVERITY_COLORS.get(severity, (SLATE_700, SLATE_100, SLATE_400))

            title_para = Paragraph(
                _prep_text(f"{idx}. {flag.get('title', 'Untitled Flag')}", is_rtl),
                ParagraphStyle("ft", fontName=font_bold, fontSize=9.5,
                               textColor=tx, leading=13,
                               alignment=TA_RIGHT if is_rtl else TA_LEFT)
            )
            category_para = Paragraph(
                _prep_text(f"Category: {flag.get('category', 'General')}", is_rtl),
                ParagraphStyle("fc", fontName=font_regular, fontSize=8,
                               textColor=tx, leading=12,
                               alignment=TA_RIGHT if is_rtl else TA_LEFT)
            )
            confidence_para = Paragraph(
                f"Flag Confidence: {int((flag.get('ai_confidence') or 0) * 100)}%",
                ParagraphStyle("fconf", fontName=font_regular, fontSize=8,
                               textColor=tx, leading=12, alignment=TA_CENTER)
            )

            header_inner = Table(
                [[title_para], [category_para], [confidence_para]],
                colWidths=[doc.width - 8 * mm]
            )
            header_inner.setStyle(TableStyle([
                ("LEFTPADDING",  (0, 0), (-1, -1), 0),
                ("RIGHTPADDING", (0, 0), (-1, -1), 0),
                ("TOPPADDING",   (0, 0), (-1, -1), 1),
                ("BOTTOMPADDING",(0, 0), (-1, -1), 1),
            ]))

            # Clause always in original language (Helvetica)
            clause_text = flag.get("contract_clause") or "No clause extracted."
            clause_block = Table(
                [[Paragraph(f'"{clause_text}"', styles["clause_quote"])]],
                colWidths=[doc.width - 8 * mm]
            )
            clause_block.setStyle(TableStyle([
                ("BACKGROUND",    (0, 0), (-1, -1), SLATE_50),
                ("LEFTPADDING",   (0, 0), (-1, -1), 6),
                ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
                ("TOPPADDING",    (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("BOX",           (0, 0), (-1, -1), 0.5, bd),
                ("LINEBEFORE",    (0, 0), (0, -1),  2.0, tx),
            ]))

            explanation_para = Paragraph(
                _prep_text(
                    f"Plain Language: {flag.get('plain_language_explanation', 'No explanation provided.')}",
                    is_rtl
                ),
                styles["flag_body"]
            )

            mitigation_raw = flag.get("mitigation_steps") or []
            if isinstance(mitigation_raw, str):
                mitigation_raw = [mitigation_raw]
            mitigation_items = "".join(
                f"{i+1}. {_prep_text(step, is_rtl)}<br/>"
                for i, step in enumerate(mitigation_raw)
            ) if mitigation_raw else "No mitigation steps provided."
            mitigation_para = Paragraph(
                _prep_text("Mitigation Steps:", is_rtl) + f"<br/>{mitigation_items}",
                styles["flag_body"]
            )

            legal_raw = flag.get("legal_references") or []
            if isinstance(legal_raw, str):
                legal_raw = [legal_raw]
            legal_text = ", ".join(legal_raw) if legal_raw else "No statutory references provided."
            legal_para = Paragraph(
                f"Legal References: {legal_text}",
                styles["flag_body"]
            )

            flag_content = Table(
                [
                    [header_inner],
                    [Spacer(1, 2 * mm)],
                    [clause_block],
                    [Spacer(1, 2 * mm)],
                    [explanation_para],
                    [Spacer(1, 1 * mm)],
                    [mitigation_para],
                    [Spacer(1, 1 * mm)],
                    [legal_para],
                ],
                colWidths=[doc.width - 8 * mm]
            )
            flag_content.setStyle(TableStyle([
                ("LEFTPADDING",  (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING",   (0, 0), (-1, -1), 0),
                ("BOTTOMPADDING",(0, 0), (-1, -1), 0),
            ]))

            outer = Table([[flag_content]], colWidths=[doc.width])
            outer.setStyle(TableStyle([
                ("BACKGROUND",    (0, 0), (-1, -1), bg),
                ("BOX",           (0, 0), (-1, -1), 0.8, bd),
                ("TOPPADDING",    (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING",   (0, 0), (-1, -1), 0),
                ("RIGHTPADDING",  (0, 0), (-1, -1), 0),
            ]))

            story.append(KeepTogether(outer))
            story.append(Spacer(1, 3 * mm))

    # ==========================================================
    # SECTION 5: LEGAL FOOTER DISCLAIMER
    # ==========================================================
    story.append(HRFlowable(width="100%", thickness=0.3, color=SLATE_400, spaceBefore=6, spaceAfter=4))
    story.append(p("Important Limitations & Legal Disclaimer", "section_header"))
    for line in [
        "This document was generated automatically using artificial intelligence and is provided solely as an informational aid.",
        "It does not constitute legal advice and must not be relied upon as a substitute for professional legal consultation.",
        "MigrantShield and its operators accept no liability for decisions made on the basis of this report.",
        "If your contract contains issues, seek assistance from a qualified legal professional or registered migrant worker support organization.",
        f"Report generated: {datetime.now(timezone.utc).strftime('%d %B %Y %H:%M UTC')}",
    ]:
        story.append(p(line, "footer_section"))
        story.append(Spacer(1, 1 * mm))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()


# =============================================================
# SUPABASE UPLOAD + DB RECORD
# =============================================================
def generate_and_store_pdf(
    supabase: Client,
    contract_id: str,
    worker_name: str,
    risk_score: float,
    confidence_score: float,
    analyzed_at: datetime,
    flags: list[dict],
    bucket: str,
    language: str = "en",
) -> Optional[str]:
    try:
        pdf_bytes = build_pdf(
            contract_id=contract_id,
            worker_name=worker_name,
            risk_score=risk_score,
            confidence_score=confidence_score,
            analyzed_at=analyzed_at,
            flags=flags,
            language=language,
        )

        object_path = f"reports/{contract_id}/reports_{uuid.uuid4().hex[:8]}.pdf"

        supabase.storage.from_(bucket).upload(
            path=object_path,
            file=pdf_bytes,
            file_options={"content-type": "application/pdf", "upsert": "true"},
        )

        supabase.table("reports").insert({
            "contract_id":    contract_id,
            "pdf_url":        object_path,
            "generated_at":   datetime.now(timezone.utc).isoformat(),
            "downloaded_count": 0,
        }).execute()

        return object_path

    except Exception as e:
        print(f"[pdf_generator] ERROR contract={contract_id}: {e}")
        return None