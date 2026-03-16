from __future__ import annotations

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

ACCENT_HEX = "#7A150F"
MUTED_HEX = "#475467"
LIGHT_BORDER = colors.HexColor("#d0d5dd")
SOFT_BG = colors.HexColor("#f8f4f2")
HEADER_BG = colors.HexColor("#fce7e4")
TABLE_HEADER_BG = colors.HexColor("#eef2f7")
SUMMARY_HEADER_BG = colors.HexColor("#17325c")
SUMMARY_TOTAL_BG = colors.HexColor("#fdf1ef")
TEXT_DARK = colors.HexColor("#101828")


def register_pdf_font() -> str:
    regular_candidates = [
        "/usr/share/fonts/truetype/noto/NotoSans-Regular.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/calibri.ttf",
    ]
    bold_candidates = [
        "/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/calibrib.ttf",
    ]
    regular_name = None
    for path in regular_candidates:
        if Path(path).exists():
            try:
                pdfmetrics.registerFont(TTFont("OfferSans", path))
                regular_name = "OfferSans"
                break
            except Exception:
                continue
    for path in bold_candidates:
        if Path(path).exists():
            try:
                pdfmetrics.registerFont(TTFont("OfferSans-Bold", path))
                break
            except Exception:
                continue
    return regular_name or "Helvetica"


def build_pdf_styles(font_name: str) -> dict[str, ParagraphStyle]:
    styles = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("OfferTitle", parent=styles["Title"], fontName=font_name, fontSize=16, textColor=colors.HexColor(ACCENT_HEX), alignment=TA_CENTER, leading=20, spaceAfter=8),
        "section": ParagraphStyle("OfferSection", parent=styles["Heading2"], fontName=font_name, fontSize=12.5, textColor=colors.HexColor(ACCENT_HEX), spaceBefore=6, spaceAfter=6, leading=16),
        "subheading": ParagraphStyle("OfferSubheading", parent=styles["Heading3"], fontName=font_name, fontSize=10.5, textColor=colors.HexColor(ACCENT_HEX), spaceBefore=4, spaceAfter=4, leading=13),
        "body": ParagraphStyle("OfferBody", parent=styles["BodyText"], fontName=font_name, fontSize=9.5, leading=13, textColor=TEXT_DARK, spaceAfter=4),
        "small": ParagraphStyle("OfferSmall", parent=styles["BodyText"], fontName=font_name, fontSize=8.5, leading=11, textColor=colors.HexColor(MUTED_HEX), spaceAfter=3),
        "center_small": ParagraphStyle("OfferCenterSmall", parent=styles["BodyText"], fontName=font_name, fontSize=9, leading=11, alignment=TA_CENTER, textColor=TEXT_DARK, spaceAfter=3),
        "table_header": ParagraphStyle("OfferTableHeader", parent=styles["BodyText"], fontName=font_name, fontSize=9.2, leading=11, textColor=colors.HexColor("#17325c"), spaceAfter=0),
        "right_bold": ParagraphStyle("OfferRightBold", parent=styles["BodyText"], fontName=font_name, fontSize=9.5, leading=12, alignment=TA_RIGHT, rightIndent=4, textColor=TEXT_DARK, spaceAfter=3),
    }
