from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate

from app.modules.document_engine.models.document_model import DocumentFooter
from app.modules.document_engine.styles.pdf_styles import ACCENT_HEX, MUTED_HEX


HEADER_TOP_MARGIN = 2.55 * cm
LEFT_MARGIN = 1.6 * cm
RIGHT_MARGIN = 1.6 * cm


class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, footer: DocumentFooter | None = None, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []
        self.footer = footer

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        page_count = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_footer(page_count)
            super().showPage()
        super().save()

    def draw_page_footer(self, page_count: int):
        if not self.footer:
            return
        y = 1.2 * cm
        self.setStrokeColor(colors.HexColor(ACCENT_HEX))
        self.setLineWidth(0.6)
        self.line(1.6 * cm, y + 0.55 * cm, A4[0] - 1.6 * cm, y + 0.55 * cm)
        self.setFont("OfferSans", 7.6)
        self.setFillColor(colors.HexColor(MUTED_HEX))
        self.drawString(1.8 * cm, y + 0.22 * cm, self.footer.company_text)
        self.drawString(1.8 * cm, y - 0.08 * cm, self.footer.address_text)
        self.drawString(10.8 * cm, y + 0.22 * cm, "e-mail: info@accuratetest.com.tr")
        self.drawString(10.8 * cm, y - 0.08 * cm, "web: www.accuratetest.com.tr")
        self.drawString(A4[0] - 4.6 * cm, y + 0.22 * cm, "Tel: 0216 594 19 47")
        self.drawString(A4[0] - 4.6 * cm, y - 0.08 * cm, "Fax: 0216 594 19 17")
        self.drawString(1.8 * cm, y - 0.52 * cm, self.footer.form_text)
        self.drawRightString(A4[0] - 1.8 * cm, y - 0.52 * cm, f"{self._pageNumber}/{page_count}")


@dataclass(slots=True)
class PDFContext:
    output_path: Path

    def create_document(self) -> SimpleDocTemplate:
        return SimpleDocTemplate(
            str(self.output_path),
            pagesize=A4,
            leftMargin=LEFT_MARGIN,
            rightMargin=RIGHT_MARGIN,
            topMargin=HEADER_TOP_MARGIN,
            bottomMargin=2.4 * cm,
        )


def draw_offer_page_header(
    canv: canvas.Canvas,
    doc: SimpleDocTemplate,
    *,
    title: str,
    left_logo_path: Path | None = None,
    right_logo_path: Path | None = None,
    font_name: str = "Helvetica",
) -> None:
    page_width, page_height = A4

    left_logo_x = LEFT_MARGIN
    left_logo_y = page_height - 1.95 * cm
    left_logo_w = 4.6 * cm
    left_logo_h = 1.45 * cm

    right_logo_w = 1.65 * cm
    right_logo_h = 1.65 * cm
    right_logo_x = page_width - RIGHT_MARGIN - right_logo_w
    right_logo_y = page_height - 1.92 * cm  # slightly higher than before

    if left_logo_path and Path(left_logo_path).exists():
        canv.drawImage(
            str(left_logo_path),
            left_logo_x,
            left_logo_y,
            width=left_logo_w,
            height=left_logo_h,
            preserveAspectRatio=True,
            mask='auto',
        )
    if right_logo_path and Path(right_logo_path).exists():
        canv.drawImage(
            str(right_logo_path),
            right_logo_x,
            right_logo_y,
            width=right_logo_w,
            height=right_logo_h,
            preserveAspectRatio=True,
            mask='auto',
        )

    canv.setFillColor(colors.HexColor(ACCENT_HEX))
    title_font = font_name if font_name else "Helvetica"
    canv.setFont(title_font, 14.2)

    # Center the title in the visual space between the two logos instead of page center.
    title_left_bound = left_logo_x + left_logo_w + 0.35 * cm
    title_right_bound = right_logo_x - 0.35 * cm
    if title_right_bound > title_left_bound:
        title_center_x = (title_left_bound + title_right_bound) / 2
    else:
        title_center_x = page_width / 2

    canv.drawCentredString(title_center_x, page_height - 1.05 * cm, title)

    canv.setStrokeColor(colors.HexColor(ACCENT_HEX))
    canv.setLineWidth(0.65)
    line_y = page_height - 2.05 * cm
    canv.line(LEFT_MARGIN, line_y, page_width - RIGHT_MARGIN, line_y)
