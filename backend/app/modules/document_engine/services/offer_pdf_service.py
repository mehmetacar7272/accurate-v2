from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any

from reportlab.lib.units import cm
from reportlab.platypus import KeepTogether, Paragraph, Spacer

from app.modules.document_engine.builders.offer_document_builder import OfferDocumentBuilder
from app.modules.document_engine.renderers.pdf_core import NumberedCanvas, PDFContext, draw_offer_page_header
from app.modules.document_engine.renderers.revision_renderer import RevisionRenderer
from app.modules.document_engine.renderers.section_renderer import SectionRenderer
from app.modules.document_engine.renderers.signature_renderer import SignatureRenderer
from app.modules.document_engine.renderers.table_renderer import TableRenderer
from app.modules.document_engine.styles.pdf_styles import ACCENT_HEX, build_pdf_styles, register_pdf_font
from app.modules.document_engine.utils.formatting import resolve_asset_path, slugify_filename

OUTPUT_DIR = Path(__file__).resolve().parents[4] / 'generated_offers'


class OfferPDFService:
    def __init__(self):
        self.builder = OfferDocumentBuilder()

    def generate(self, offer_id: int) -> Path:
        document_model = self.builder.build(offer_id)
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        filename = f"{slugify_filename(document_model.document_no)}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.pdf"
        output_path = OUTPUT_DIR / filename
        pdf_context = PDFContext(output_path=output_path)

        font_name = register_pdf_font()
        styles = build_pdf_styles(font_name)
        table_renderer = TableRenderer(styles, font_name)
        section_renderer = SectionRenderer(styles, table_renderer)
        revision_renderer = RevisionRenderer(styles, table_renderer)
        signature_renderer = SignatureRenderer(styles, __file__)

        story: list[Any] = []
        left_logo = resolve_asset_path(__file__, document_model.header.left_logo_path)
        right_logo = resolve_asset_path(__file__, document_model.header.right_logo_path)
        if right_logo is None:
            offer_assets_dir = Path(__file__).resolve().parents[4] / 'assets' / 'offer'
            fallback_logos = sorted(offer_assets_dir.glob('AB-0510*.jpg'))
            right_logo = fallback_logos[0] if fallback_logos else None

        meta_rows = [[label, value] for label, value in document_model.header.meta_rows]
        story.append(table_renderer.key_value_table(meta_rows, [3.2 * cm, 12.8 * cm], highlight_first_col=True))
        story.append(Spacer(1, 0.18 * cm))

        for intro in document_model.intro_sections:
            story.append(Paragraph(intro['heading'], styles['section']))
            if intro.get('is_label_only'):
                continue
            story.append(Paragraph(intro['body_html'], styles['body']))
            for link in intro.get('links') or []:
                story.append(Paragraph(f"<link href='{link['url']}' color='{ACCENT_HEX}'><u>{link['label']}</u></link>", styles['body']))

        for section in document_model.sections:
            payload = {
                'code': section.code,
                'title': section.title,
                'scope_rows': [{'label': row.label, 'value': row.value} for row in section.scope_rows],
                'test_items': section.test_items,
                'currency': document_model.currency,
                **section.metadata,
            }
            story.extend(section_renderer.render_offer_section(payload))

        summary_payload = [
            {
                'row_no': row.row_no,
                'inspection_type_name': row.inspection_type_name,
                'estimated_days': row.estimated_days,
                'subtotal': row.subtotal,
                'discount_amount': row.discount_amount,
                'vat_rate_label': row.vat_rate_label,
                'vat_amount': row.vat_amount,
                'grand_total': row.grand_total,
            }
            for row in document_model.summary_rows
        ]
        story.append(KeepTogether([
            Paragraph('GENEL TEKLİF ÖZETİ', styles['section']),
            table_renderer.offer_summary_table(summary_payload, document_model.currency, document_model.summary_totals),
        ]))
        story.append(Spacer(1, 0.16 * cm))

        story.append(Paragraph('3.1. Ödemeler', styles['subheading']))
        story.append(Paragraph(document_model.metadata['payment_terms_text'], styles['body']))
        story.append(Paragraph('3.2. Not', styles['subheading']))
        story.append(Paragraph(document_model.metadata['note_text'], styles['body']))
        story.append(Paragraph('3.3. Tahmini Süre', styles['subheading']))
        story.append(Paragraph(document_model.metadata['estimated_duration_text'], styles['body']))
        story.append(Paragraph('3.4. Opsiyon', styles['subheading']))
        story.append(Paragraph(document_model.metadata['option_validity_text'], styles['body']))
        story.append(Paragraph('3.5. Diğer Şartlar', styles['subheading']))
        other_terms = document_model.metadata['other_terms_text'].replace(
            'http://www.accuratetest.com.tr/hizmetsartlariformu.pdf',
            f"<link href='http://www.accuratetest.com.tr/hizmetsartlariformu.pdf' color='{ACCENT_HEX}'><u>http://www.accuratetest.com.tr/hizmetsartlariformu.pdf</u></link>",
        ).replace('\n\n', '<br/><br/>')
        story.append(Paragraph(other_terms, styles['body']))
        story.append(Spacer(1, 0.12 * cm))

        story.extend(revision_renderer.render([
            {
                'revision_no': row.revision_no,
                'revision_date': row.revision_date,
                'revision_reason': row.revision_reason,
            }
            for row in document_model.revisions
        ]))
        story.append(Spacer(1, 0.16 * cm))
        story.extend(signature_renderer.render(document_model.signatures))

        def _draw_header(canv, doc):
            draw_offer_page_header(
                canv,
                doc,
                title=document_model.header.title,
                left_logo_path=left_logo,
                right_logo_path=right_logo,
                font_name=font_name,
            )

        doc = pdf_context.create_document()
        doc.build(
            story,
            onFirstPage=_draw_header,
            onLaterPages=_draw_header,
            canvasmaker=lambda *args, **kwargs: NumberedCanvas(*args, footer=document_model.footer, **kwargs),
        )
        return output_path
