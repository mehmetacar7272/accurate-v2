from __future__ import annotations

from pathlib import Path
from typing import Any

from reportlab.lib.units import cm
from reportlab.platypus import Image, KeepTogether, Paragraph, Spacer, Table, TableStyle

from app.modules.document_engine.models.document_model import DocumentSignatureBlock
from app.modules.document_engine.styles.pdf_styles import LIGHT_BORDER, SUMMARY_TOTAL_BG
from app.modules.document_engine.utils.formatting import resolve_asset_path


class SignatureRenderer:
    def __init__(self, styles: dict[str, Any], base_file: str):
        self.styles = styles
        self.base_file = base_file

    def render(self, signature: DocumentSignatureBlock | None) -> list[Any]:
        if not signature:
            return []
        title_tbl = Table(
            [[Paragraph(f"<b>{signature.left_title}</b>", self.styles['center_small']), Paragraph(f"<b>{signature.right_title}</b>", self.styles['center_small'])]],
            colWidths=[8 * cm, 8 * cm],
            hAlign='LEFT',
            splitByRow=0,
        )
        title_tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), SUMMARY_TOTAL_BG),
            ('GRID', (0, 0), (-1, -1), 0.5, LIGHT_BORDER),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))

        signature_image = resolve_asset_path(self.base_file, signature.signature_image_path)
        left_parts: list[Any] = [
            Paragraph(f"YETKİLİ: <b>{signature.authorized_person_name or '-'}</b>", self.styles['body']),
            Spacer(1, 0.08 * cm),
            Paragraph('KAŞE / İMZA', self.styles['small']),
            Spacer(1, 0.08 * cm),
        ]
        if signature_image and Path(signature_image).exists():
            left_parts.append(Image(str(signature_image), width=5.4 * cm, height=2.8 * cm))
        right_parts: list[Any] = [
            Paragraph('YETKİLİ:', self.styles['body']),
            Spacer(1, 0.08 * cm),
            Paragraph('KAŞE / İMZA', self.styles['small']),
            Spacer(1, 1.6 * cm),
        ]
        sign_table = Table([[left_parts, right_parts]], colWidths=[8 * cm, 8 * cm], hAlign='LEFT', splitByRow=0)
        sign_table.setStyle(TableStyle([
            ('GRID', (0, 0), (-1, -1), 0.5, LIGHT_BORDER),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ]))
        return [KeepTogether([title_tbl, sign_table])]
