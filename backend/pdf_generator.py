# =============================================================
# FILE: backend/pdf_generator.py
# MigrantShield — Production PDF Generation Service
# Design: Institutional trust aesthetic, high contrast
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
from reportlab.lib.styles import ParagraphStyle
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
    HRFlowable,
)

# =============================================================
# COLOUR PALETTE — matches frontend design system exactly
# =============================================================
SLATE_900  = colors.HexColor("#0f172a")
SLATE_700  = colors.HexColor("#334155")
SLATE_500  = colors.HexColor("#64748b")
SLATE_400  = colors.HexColor("#94a3b8")
SLATE_200  = colors.HexColor("#e2e8f0")
SLATE_50   = colors.HexColor("#f8fafc")
WHITE      = colors.HexColor("#ffffff")

AMBER_600  = colors.HexColor("#d97706")
AMBER_50   = colors.HexColor("#fffbeb")
AMBER_200  = colors.HexColor("#fcd34d")

RED_600    = colors.HexColor("#dc2626")
RED_50     = colors.HexColor("#fef2f2")
RED_200    = colors.HexColor("#fecaca")

YELLOW_600 = colors.HexColor("#ca8a04")
YELLOW_50  = colors.HexColor("#fefce8")
YELLOW_200 = colors.HexColor("#fde68a")

EMERALD_600 = colors.HexColor("#16a34a")
EMERALD_50  = colors.HexColor("#f0fdf4")
EMERALD_200 = colors.HexColor("#86efac")

# =============================================================
# SEVERITY CONFIG
# =============================================================
SEVERITY_CONFIG = {
    "critical": {
        "bg": RED_50, "border": RED_200, "badge_bg": RED_600,
        "text": RED_600, "label": "CRITICAL"
    },
    "warning": {
        "bg": YELLOW_50, "border": YELLOW_200, "badge_bg": YELLOW_600,
        "text": YELLOW_600, "label": "WARNING"
    },
    "info": {
        "bg": SLATE_50, "border": SLATE_200, "badge_bg": SLATE_500,
        "text": SLATE_500, "label": "INFO"
    },
}

VERDICT_CONFIG = {
    "CRITICAL": {"bg": RED_50,    "border": RED_600,    "text": RED_600,    "label": "HIGH RISK"},
    "CAUTION":  {"bg": AMBER_50,  "border": AMBER_600,  "text": AMBER_600,  "label": "CAUTION"},
    "SAFE":     {"bg": EMERALD_50,"border": EMERALD_600,"text": EMERALD_600,"label": "LOW RISK"},
}

# =============================================================
# FONT SETUP
# =============================================================
FONTS_DIR = os.path.join(os.path.dirname(__file__), "fonts")

FONT_URLS = {
    "NotoSans-Regular": "https://github.com/google/fonts/raw/main/ofl/notosans/NotoSans-Regular.ttf",
    "NotoSans-Bold":    "https://github.com/google/fonts/raw/main/ofl/notosans/NotoSans-Bold.ttf",
    "NotoSansDevanagari-Regular": "https://github.com/google/fonts/raw/main/ofl/notosansdevanagari/NotoSansDevanagari-Regular.ttf",
    "NotoSansDevanagari-Bold":    "https://github.com/google/fonts/raw/main/ofl/notosansdevanagari/NotoSansDevanagari-Bold.ttf",
    "NotoSansArabic-Regular": "https://github.com/google/fonts/raw/main/ofl/notosansarabic/NotoSansArabic-Regular.ttf",
    "NotoSansArabic-Bold":    "https://github.com/google/fonts/raw/main/ofl/notosansarabic/NotoSansArabic-Bold.ttf",
}

LANGUAGE_FONT_MAP = {
    "en": ("Helvetica",                   "Helvetica-Bold",              False),
    "tl": ("Helvetica",                   "Helvetica-Bold",              False),
    "bn": ("NotoSans-Regular",            "NotoSans-Bold",               False),
    "ne": ("NotoSansDevanagari-Regular",  "NotoSansDevanagari-Bold",     False),
    "hi": ("NotoSansDevanagari-Regular",  "NotoSansDevanagari-Bold",     False),
    "ar": ("NotoSansArabic-Regular",      "NotoSansArabic-Bold",         True),
}

_fonts_registered: set = set()


def _ensure_font(font_name: str) -> None:
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
    pdfmetrics.registerFont(TTFont(font_name, font_path))
    _fonts_registered.add(font_name)


def _get_fonts(language: str) -> tuple:
    regular, bold, rtl = LANGUAGE_FONT_MAP.get(language, LANGUAGE_FONT_MAP["en"])
    _ensure_font(regular)
    _ensure_font(bold)
    return regular, bold, rtl


def _reshape_arabic(text: str) -> str:
    try:
        import arabic_reshaper
        from bidi.algorithm import get_display
        return get_display(arabic_reshaper.reshape(text))
    except ImportError:
        return text


def _t(text: str, is_rtl: bool) -> str:
    if is_rtl and text:
        return _reshape_arabic(text)
    return text


# =============================================================
# PAGE DIMENSIONS
# =============================================================
PAGE_W, PAGE_H = A4
LM = 15 * mm
RM = 15 * mm
TM = 18 * mm
BM = 22 * mm
CONTENT_W = PAGE_W - LM - RM


# =============================================================
# FOOTER
# =============================================================
def _draw_footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(SLATE_400)
    canvas.drawCentredString(
        PAGE_W / 2, 10 * mm,
        f"MigrantShield Confidential Report  |  Page {doc.page}  |  Contract: {getattr(doc, 'contract_id_str', '')}"
    )
    canvas.setStrokeColor(SLATE_200)
    canvas.setLineWidth(0.3)
    canvas.line(LM, 14 * mm, PAGE_W - RM, 14 * mm)
    canvas.restoreState()


# =============================================================
# STYLE FACTORY
# =============================================================
def _s(name, font, size, leading, color=None, align=TA_LEFT, sb=0, sa=0):
    return ParagraphStyle(
        name, fontName=font, fontSize=size, leading=leading,
        textColor=color or SLATE_700,
        alignment=align, spaceBefore=sb, spaceAfter=sa,
    )


# =============================================================
# HELPERS
# =============================================================
def _hr(space_before=4, space_after=6, color=SLATE_200, thickness=0.5):
    return HRFlowable(
        width="100%", thickness=thickness, color=color,
        spaceBefore=space_before, spaceAfter=space_after
    )


def _cell_table(content_rows, col_widths, bg=None, border_color=None,
                border_width=0.5, pad=8, inner_pad=None):
    t = Table(content_rows, colWidths=col_widths)
    style = [
        ("TOPPADDING",    (0,0), (-1,-1), inner_pad or pad),
        ("BOTTOMPADDING", (0,0), (-1,-1), inner_pad or pad),
        ("LEFTPADDING",   (0,0), (-1,-1), inner_pad or pad),
        ("RIGHTPADDING",  (0,0), (-1,-1), inner_pad or pad),
        ("VALIGN",        (0,0), (-1,-1), "TOP"),
    ]
    if bg:
        style.append(("BACKGROUND", (0,0), (-1,-1), bg))
    if border_color:
        style.append(("BOX", (0,0), (-1,-1), border_width, border_color))
    t.setStyle(TableStyle(style))
    return t


def _zero_pad(t):
    t.setStyle(TableStyle([
        ("TOPPADDING",    (0,0), (-1,-1), 0),
        ("BOTTOMPADDING", (0,0), (-1,-1), 0),
        ("LEFTPADDING",   (0,0), (-1,-1), 0),
        ("RIGHTPADDING",  (0,0), (-1,-1), 0),
        ("VALIGN",        (0,0), (-1,-1), "TOP"),
    ]))
    return t


# =============================================================
# SECTION BUILDERS
# =============================================================

def _build_header(contract, FR, FBold, is_rtl):
    story = []
    # Brand + title
    story.append(Paragraph("MigrantShield", _s("brand", FBold, 22, 26, SLATE_900)))
    story.append(Paragraph(
        _t("AI-Assisted Employment Contract Risk Report", is_rtl),
        _s("brand_sub", FR, 10, 14, SLATE_500)
    ))
    story.append(Spacer(1, 3*mm))
    story.append(_hr(2, 4, SLATE_200, 0.5))

    # ID + date line
    cid = contract.get("contract_id") or contract.get("id") or "—"
    analysed_raw = contract.get("analyzed_at") or contract.get("created_at") or ""
    try:
        dt = datetime.fromisoformat(str(analysed_raw).replace("Z", "+00:00"))
        analysed_str = dt.strftime("%-m/%-d/%Y, %-I:%M:%S %p")
    except Exception:
        analysed_str = str(analysed_raw)[:16] if analysed_raw else "—"

    id_line = Table(
        [[
            Paragraph(f"ID: {cid}", _s("cid", FR, 8, 11, SLATE_400)),
            Paragraph(f"Analysed: {analysed_str}", _s("adt", FR, 8, 11, SLATE_400, align=TA_RIGHT)),
        ]],
        colWidths=[CONTENT_W * 0.6, CONTENT_W * 0.4]
    )
    _zero_pad(id_line)
    story.append(id_line)
    story.append(Spacer(1, 4*mm))
    return story


def _build_meta_card(contract, FR, FBold, is_rtl):
    rows = [
        [Paragraph(_t("Worker", is_rtl),   _s("ml", FR,   9, 12, SLATE_500)),
         Paragraph(_t(contract.get("worker_name") or "—", is_rtl), _s("mv", FBold, 9, 12, SLATE_900, TA_RIGHT))],
        [Paragraph(_t("Employer", is_rtl), _s("ml", FR,   9, 12, SLATE_500)),
         Paragraph(_t(contract.get("employer_name") or "—", is_rtl), _s("mv", FBold, 9, 12, SLATE_900, TA_RIGHT))],
        [Paragraph(_t("Country", is_rtl),  _s("ml", FR,   9, 12, SLATE_500)),
         Paragraph(_t(contract.get("country") or "—", is_rtl), _s("mv", FBold, 9, 12, SLATE_900, TA_RIGHT))],
        [Paragraph(_t("File", is_rtl),     _s("ml", FR,   9, 12, SLATE_500)),
         Paragraph(contract.get("original_filename") or "—", _s("mv", FR, 9, 12, SLATE_700, TA_RIGHT))],
    ]
    t = Table(rows, colWidths=[CONTENT_W * 0.35, CONTENT_W * 0.65])
    t.setStyle(TableStyle([
        ("BOX",           (0,0), (-1,-1), 0.5, SLATE_200),
        ("LINEBELOW",     (0,0), (-1,-2), 0.3, SLATE_200),
        ("ROWBACKGROUNDS",(0,0), (-1,-1), [WHITE, SLATE_50]),
        ("TOPPADDING",    (0,0), (-1,-1), 7),
        ("BOTTOMPADDING", (0,0), (-1,-1), 7),
        ("LEFTPADDING",   (0,0), (-1,-1), 10),
        ("RIGHTPADDING",  (0,0), (-1,-1), 10),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
    ]))
    return t


def _build_score_card(risk_score, critical_count, warning_count, info_count, FR, FBold):
    score_val = int(risk_score or 0)

    if score_val >= 70:
        verdict_key = "CRITICAL"
    elif score_val >= 40:
        verdict_key = "CAUTION"
    else:
        verdict_key = "SAFE"

    vcfg = VERDICT_CONFIG[verdict_key]

    # Score number
    score_para = Paragraph(str(score_val), _s("sn", FBold, 32, 36, vcfg["text"], TA_CENTER))
    denom_para = Paragraph("/ 100", _s("sd", FR, 10, 13, SLATE_400, TA_CENTER))
    verdict_para = Paragraph(vcfg["label"], _s("vl", FBold, 11, 14, vcfg["text"], TA_CENTER))

    score_col = Table(
        [[score_para], [denom_para], [verdict_para]],
        colWidths=[CONTENT_W * 0.3]
    )
    score_col.setStyle(TableStyle([
        ("TOPPADDING",    (0,0), (-1,-1), 3),
        ("BOTTOMPADDING", (0,0), (-1,-1), 3),
        ("LEFTPADDING",   (0,0), (-1,-1), 0),
        ("RIGHTPADDING",  (0,0), (-1,-1), 0),
        ("ALIGN",         (0,0), (-1,-1), "CENTER"),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
    ]))

    # Badge builder
    def _badge(label, count, bg, text_c):
        count_p = Paragraph(str(count), _s("bc", FBold, 16, 19, text_c, TA_CENTER))
        label_p = Paragraph(label,      _s("bl", FR,    8,  11, text_c, TA_CENTER))
        inner = Table([[count_p], [label_p]], colWidths=[CONTENT_W * 0.2])
        inner.setStyle(TableStyle([
            ("BACKGROUND",    (0,0), (-1,-1), bg),
            ("TOPPADDING",    (0,0), (-1,-1), 8),
            ("BOTTOMPADDING", (0,0), (-1,-1), 8),
            ("LEFTPADDING",   (0,0), (-1,-1), 4),
            ("RIGHTPADDING",  (0,0), (-1,-1), 4),
            ("ALIGN",         (0,0), (-1,-1), "CENTER"),
            ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
        ]))
        return inner

    badges = Table(
        [[
            _badge("Critical", critical_count, RED_50,    RED_600),
            _badge("Warning",  warning_count,  YELLOW_50, YELLOW_600),
            _badge("Info",     info_count,     SLATE_50,  SLATE_500),
        ]],
        colWidths=[CONTENT_W * 0.233, CONTENT_W * 0.233, CONTENT_W * 0.233]
    )
    _zero_pad(badges)

    outer_row = Table(
        [[score_col, badges]],
        colWidths=[CONTENT_W * 0.3, CONTENT_W * 0.7]
    )
    outer_row.setStyle(TableStyle([
        ("TOPPADDING",    (0,0), (-1,-1), 0),
        ("BOTTOMPADDING", (0,0), (-1,-1), 0),
        ("LEFTPADDING",   (0,0), (-1,-1), 0),
        ("RIGHTPADDING",  (0,0), (-1,-1), 0),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
        ("LINEAFTER",     (0,0), (0,-1),  0.5, SLATE_200),
    ]))

    card = Table([[outer_row]], colWidths=[CONTENT_W])
    card.setStyle(TableStyle([
        ("BOX",           (0,0), (-1,-1), 1.0, vcfg["border"]),
        ("BACKGROUND",    (0,0), (-1,-1), vcfg["bg"]),
        ("TOPPADDING",    (0,0), (-1,-1), 12),
        ("BOTTOMPADDING", (0,0), (-1,-1), 12),
        ("LEFTPADDING",   (0,0), (-1,-1), 12),
        ("RIGHTPADDING",  (0,0), (-1,-1), 12),
    ]))
    return card


def _build_flag_card(flag, idx, FR, FBold, is_rtl):
    severity = (flag.get("severity") or "info").lower()
    cfg = SEVERITY_CONFIG.get(severity, SEVERITY_CONFIG["info"])

    # Field mapping — handles both old and new schema keys
    flag_title     = flag.get("title") or flag.get("flag_title") or f"Risk Flag {idx}"
    clause_text    = flag.get("clause_text") or "—"
    description    = flag.get("description") or "—"
    recommendation = flag.get("recommendation") or flag.get("mitigation_steps") or "—"
    legal_refs     = flag.get("legal_references") or []
    flag_type      = flag.get("flag_type") or ""

    if isinstance(legal_refs, str):
        legal_refs = [legal_refs]

    # Recommendation → list
    if isinstance(recommendation, list):
        rec_items = [r.strip() for r in recommendation if str(r).strip()]
    else:
        rec_items = [r.strip() for r in str(recommendation).split("\n") if r.strip()]
    if not rec_items:
        rec_items = [str(recommendation)]

    # ── Badge ──
    badge_p = Paragraph(cfg["label"], _s("fb", FBold, 7, 9, WHITE, TA_CENTER))
    badge_t = Table([[badge_p]], colWidths=[16*mm])
    badge_t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), cfg["badge_bg"]),
        ("TOPPADDING",    (0,0), (-1,-1), 3),
        ("BOTTOMPADDING", (0,0), (-1,-1), 3),
        ("LEFTPADDING",   (0,0), (-1,-1), 5),
        ("RIGHTPADDING",  (0,0), (-1,-1), 5),
    ]))

    # ── Header row: badge + title ──
    title_p = Paragraph(
        _t(f"{idx}. {flag_title}", is_rtl),
        _s("ft", FBold, 10, 14, cfg["text"])
    )
    header_row = Table(
        [[badge_t, title_p]],
        colWidths=[18*mm, CONTENT_W - 18*mm - 24]
    )
    header_row.setStyle(TableStyle([
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
        ("TOPPADDING",    (0,0), (-1,-1), 0),
        ("BOTTOMPADDING", (0,0), (-1,-1), 0),
        ("LEFTPADDING",   (0,0), (-1,-1), 0),
        ("RIGHTPADDING",  (0,0), (-1,-1), 4),
    ]))

    if flag_type:
        type_p = Paragraph(
            _t(f"Category: {flag_type.replace('_', ' ').title()}", is_rtl),
            _s("ftype", FR, 8, 11, SLATE_400)
        )
    else:
        type_p = Spacer(1, 1)

    # ── Clause block with left accent bar ──
    clause_inner = Table(
        [[Paragraph(clause_text, _s("cq", "Helvetica-Oblique", 8.5, 13, SLATE_700))]],
        colWidths=[CONTENT_W - 24 - 6]
    )
    clause_inner.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), SLATE_50),
        ("TOPPADDING",    (0,0), (-1,-1), 7),
        ("BOTTOMPADDING", (0,0), (-1,-1), 7),
        ("LEFTPADDING",   (0,0), (-1,-1), 8),
        ("RIGHTPADDING",  (0,0), (-1,-1), 8),
    ]))
    accent_bar = Table([[""]], colWidths=[3], rowHeights=[None])
    accent_bar.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), cfg["badge_bg"]),
        ("TOPPADDING",    (0,0), (-1,-1), 0),
        ("BOTTOMPADDING", (0,0), (-1,-1), 0),
        ("LEFTPADDING",   (0,0), (-1,-1), 0),
        ("RIGHTPADDING",  (0,0), (-1,-1), 0),
    ]))
    clause_row = Table(
        [[accent_bar, clause_inner]],
        colWidths=[3, CONTENT_W - 24 - 3]
    )
    _zero_pad(clause_row)

    # ── Recommendations ──
    rec_rows = []
    for i, rec in enumerate(rec_items, 1):
        rec_rows.append([
            Paragraph(f"[{i}]", _s("rn", FBold, 9, 13, cfg["text"], TA_CENTER)),
            Paragraph(_t(rec, is_rtl), _s("rb", FR, 9, 13, SLATE_700))
        ])
    if rec_rows:
        rec_table = Table(rec_rows, colWidths=[8*mm, CONTENT_W - 24 - 8*mm])
        rec_table.setStyle(TableStyle([
            ("VALIGN",        (0,0), (-1,-1), "TOP"),
            ("TOPPADDING",    (0,0), (-1,-1), 3),
            ("BOTTOMPADDING", (0,0), (-1,-1), 3),
            ("LEFTPADDING",   (0,0), (-1,-1), 2),
            ("RIGHTPADDING",  (0,0), (-1,-1), 2),
            ("LINEBELOW",     (0,0), (-1,-2), 0.3, SLATE_200),
        ]))
    else:
        rec_table = None

    # ── Legal refs ──
    legal_block = None
    if legal_refs:
        refs_str = "  ·  ".join(str(r) for r in legal_refs)
        legal_block = Paragraph(
            _t(f"📋 {refs_str}", is_rtl),
            _s("lr", FR, 8, 11, SLATE_400)
        )

    # ── Assemble card content ──
    inner_rows = [
        [header_row],
        [type_p],
        [Spacer(1, 5)],
        [Paragraph("📄 Extracted Contract Clause", _s("sec_l", FBold, 8, 11, SLATE_400))],
        [Spacer(1, 3)],
        [clause_row],
        [Spacer(1, 8)],
        [Paragraph("📖 Plain Language Explanation", _s("sec_l2", FBold, 8, 11, SLATE_400))],
        [Spacer(1, 3)],
        [Paragraph(_t(description, is_rtl), _s("desc", FR, 9, 14, SLATE_700))],
        [Spacer(1, 8)],
        [Paragraph("✅ What You Can Do", _s("sec_l3", FBold, 8, 11, SLATE_400))],
        [Spacer(1, 3)],
    ]
    if rec_table:
        inner_rows.append([rec_table])
    if legal_block:
        inner_rows += [
            [Spacer(1, 6)],
            [Paragraph("📋 Regulatory Reference", _s("sec_l4", FBold, 8, 11, SLATE_400))],
            [Spacer(1, 2)],
            [legal_block],
        ]

    inner_t = Table(inner_rows, colWidths=[CONTENT_W - 24])
    _zero_pad(inner_t)

    card = Table([[inner_t]], colWidths=[CONTENT_W])
    card.setStyle(TableStyle([
        ("BOX",           (0,0), (-1,-1), 0.8, cfg["border"]),
        ("BACKGROUND",    (0,0), (-1,-1), cfg["bg"]),
        ("TOPPADDING",    (0,0), (-1,-1), 12),
        ("BOTTOMPADDING", (0,0), (-1,-1), 12),
        ("LEFTPADDING",   (0,0), (-1,-1), 12),
        ("RIGHTPADDING",  (0,0), (-1,-1), 12),
    ]))
    return KeepTogether([card, Spacer(1, 4*mm)])


def _build_contacts(FR, FBold):
    header_p = Paragraph(
        "🆘 Emergency Resource & Legal Advocacy Hub",
        _s("ch", FBold, 10, 14, WHITE)
    )
    rows = [
        [header_p, ""],
        [Paragraph("International Labour Organization (ILO)", _s("cn", FBold, 9, 12, SLATE_900)),
         Paragraph("www.ilo.org  |  +41 22 799 6111", _s("cv", FR, 9, 12, SLATE_500))],
        [Paragraph("Pravasi Nepali Coordination Committee (PNCC)", _s("cn2", FBold, 9, 12, SLATE_900)),
         Paragraph("www.pncc.org.np  |  +977-1-4004747", _s("cv2", FR, 9, 12, SLATE_500))],
        [Paragraph("Nepal Dept. of Foreign Employment (DOFE)", _s("cn3", FBold, 9, 12, SLATE_900)),
         Paragraph("www.dofe.gov.np  |  +977-1-4102390", _s("cv3", FR, 9, 12, SLATE_500))],
        [Paragraph("Migrant Forum in Asia (MFA)", _s("cn4", FBold, 9, 12, SLATE_900)),
         Paragraph("www.mfasia.org  |  info@mfasia.org", _s("cv4", FR, 9, 12, SLATE_500))],
    ]
    t = Table(rows, colWidths=[CONTENT_W * 0.55, CONTENT_W * 0.45])
    t.setStyle(TableStyle([
        ("SPAN",          (0,0), (1,0)),
        ("BACKGROUND",    (0,0), (-1,0), SLATE_900),
        ("ROWBACKGROUNDS",(0,1), (-1,-1), [WHITE, SLATE_50]),
        ("BOX",           (0,0), (-1,-1), 0.5, SLATE_200),
        ("LINEBELOW",     (0,0), (-1,-2), 0.3, SLATE_200),
        ("TOPPADDING",    (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("LEFTPADDING",   (0,0), (-1,-1), 10),
        ("RIGHTPADDING",  (0,0), (-1,-1), 10),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
    ]))
    return t


def _build_disclaimer(FR):
    lines = [
        "This report was generated by an automated AI system and is provided solely as an informational aid.",
        "It does not constitute legal advice and must not be relied upon as a substitute for professional legal consultation.",
        "MigrantShield and its operators accept no liability for decisions made on the basis of this report.",
        "If your contract contains issues, seek assistance from a qualified legal professional or registered migrant worker support organization.",
        f"Generated: {datetime.now(timezone.utc).strftime('%d %B %Y %H:%M UTC')}",
    ]
    story = []
    for line in lines:
        story.append(Paragraph(line, _s("disc", FR, 7.5, 11, SLATE_400)))
        story.append(Spacer(1, 1*mm))
    return story


# =============================================================
# MAIN ENTRY POINT — called from main.py
# =============================================================
def generate_pdf(contract_data: dict, flags: list, language: str = "en") -> bytes:
    """
    Generate a PDF report for a contract.

    Args:
        contract_data: dict with keys: contract_id/id, worker_name, employer_name,
                       country, original_filename, risk_score, analyzed_at/created_at, language
        flags: list of flag dicts with keys: severity, title/flag_title, clause_text,
               description, recommendation/mitigation_steps, legal_references, flag_type
        language: ISO language code (en/ne/hi/ar/tl/bn)

    Returns:
        PDF bytes
    """
    lang = language or contract_data.get("language") or "en"
    FR, FBold, is_rtl = _get_fonts(lang)

    buffer = io.BytesIO()

    doc = BaseDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=LM,
        rightMargin=RM,
        topMargin=TM,
        bottomMargin=BM,
    )
    doc.contract_id_str = str(contract_data.get("contract_id") or contract_data.get("id") or "")

    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
    template = PageTemplate(id="main_t", frames=[frame], onPage=_draw_footer)
    doc.addPageTemplates([template])

    story = []

    # ── Header ──────────────────────────────────────────────
    story.extend(_build_header(contract_data, FR, FBold, is_rtl))

    # ── Meta card ───────────────────────────────────────────
    story.append(_build_meta_card(contract_data, FR, FBold, is_rtl))
    story.append(Spacer(1, 4*mm))

    # ── Score card ──────────────────────────────────────────
    risk_score     = contract_data.get("risk_score") or 0
    critical_count = sum(1 for f in flags if (f.get("severity") or "").lower() == "critical")
    warning_count  = sum(1 for f in flags if (f.get("severity") or "").lower() == "warning")
    info_count     = sum(1 for f in flags if (f.get("severity") or "").lower() == "info")

    story.append(_build_score_card(risk_score, critical_count, warning_count, info_count, FR, FBold))
    story.append(Spacer(1, 5*mm))

    # ── Disclaimer ──────────────────────────────────────────
    story.append(Paragraph(
        "This report was generated by an AI system. It is not legal advice. "
        "Always consult a qualified legal professional before acting on any finding.",
        _s("adis", FR, 7.5, 11, SLATE_400)
    ))
    story.append(_hr(4, 6, SLATE_200, 0.3))

    # ── Flags ───────────────────────────────────────────────
    if flags:
        story.append(Paragraph(
            _t(f"Risk Flags ({len(flags)})", is_rtl),
            _s("rf_h", FBold, 13, 17, SLATE_900, sb=4, sa=4)
        ))
        story.append(Spacer(1, 3*mm))

        order = {"critical": 0, "warning": 1, "info": 2}
        sorted_flags = sorted(flags, key=lambda f: order.get((f.get("severity") or "info").lower(), 3))

        for idx, flag in enumerate(sorted_flags, 1):
            story.append(_build_flag_card(flag, idx, FR, FBold, is_rtl))
    else:
        story.append(Paragraph(
            _t("No risk flags were identified in this contract.", is_rtl),
            _s("nf", FR, 10, 14, SLATE_500)
        ))

    story.append(Spacer(1, 4*mm))
    story.append(_hr(2, 6, SLATE_200, 0.5))

    # ── Contacts ────────────────────────────────────────────
    story.append(_build_contacts(FR, FBold))
    story.append(Spacer(1, 4*mm))

    # ── Legal disclaimer ────────────────────────────────────
    story.append(_hr(2, 4, SLATE_200, 0.3))
    story.extend(_build_disclaimer(FR))

    doc.build(story)
    buffer.seek(0)
    return buffer.read()


# =============================================================
# LEGACY ALIAS — for any code calling build_pdf()
# =============================================================
def build_pdf(
    contract_id: str,
    worker_name: str,
    risk_score: float,
    confidence_score: float,
    analyzed_at,
    flags: list,
    language: str = "en",
) -> bytes:
    contract_data = {
        "contract_id": contract_id,
        "worker_name": worker_name,
        "risk_score":  risk_score,
        "analyzed_at": analyzed_at.isoformat() if hasattr(analyzed_at, "isoformat") else str(analyzed_at),
        "language":    language,
    }
    return generate_pdf(contract_data, flags, language)


# =============================================================
# SUPABASE UPLOAD + DB RECORD (kept from original)
# =============================================================
def generate_and_store_pdf(
    supabase,
    contract_id: str,
    worker_name: str,
    risk_score: float,
    confidence_score: float,
    analyzed_at,
    flags: list,
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
        object_path = f"reports/{contract_id}/report_{uuid.uuid4().hex[:8]}.pdf"
        supabase.storage.from_(bucket).upload(
            path=object_path,
            file=pdf_bytes,
            file_options={"content-type": "application/pdf", "upsert": "true"},
        )
        supabase.table("reports").insert({
            "contract_id":      contract_id,
            "pdf_url":          object_path,
            "generated_at":     datetime.now(timezone.utc).isoformat(),
            "downloaded_count": 0,
        }).execute()
        return object_path
    except Exception as e:
        print(f"[pdf_generator] ERROR contract={contract_id}: {e}")
        return None