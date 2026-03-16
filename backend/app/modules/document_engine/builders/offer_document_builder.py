from __future__ import annotations

from app.modules.document_engine.models.document_model import (
    DocumentFooter,
    DocumentHeader,
    DocumentModel,
    DocumentRevisionRow,
    DocumentScopeRow,
    DocumentSection,
    DocumentSignatureBlock,
    DocumentSummaryRow,
)
from app.modules.offer.services import get_offer_document_context


class OfferDocumentBuilder:
    def build(self, offer_id: int) -> DocumentModel:
        context = get_offer_document_context(offer_id)

        header = DocumentHeader(
            title=context['template']['document_title'],
            meta_rows=[('Teklif No', context['offer_no']), ('Tarih', context['date'])],
            left_logo_path=context['template'].get('company_logo_path'),
            right_logo_path=context['template'].get('accreditation_logo_path'),
        )

        intro_sections = [
            {
                'heading': '1. TEKLİF KAPSAMI',
                'body_html': context['template']['scope_text'].replace(context['customer_name'], f"<b>{context['customer_name']}</b>", 1),
            },
            {
                'heading': '2. REFERANS ALINAN STANDARTLAR',
                'body_html': context['template']['standards_intro_text'],
                'links': context['reference_links'],
            },
            {
                'heading': '3. HİZMET BEDELLERİ VE ÖDEMELER',
                'is_label_only': True,
            },
        ]

        sections = [
            DocumentSection(
                code=section['row_no'],
                title=section['inspection_type_name'],
                scope_rows=[DocumentScopeRow(label=row['label'], value=row['value']) for row in section.get('summary_rows') or []],
                test_items=[test['test_name'] for test in section.get('tests') or []],
                metadata={
                    'service_price': float(section['service_price']),
                    'travel_price': float(section['travel_price']),
                    'report_price': float(section['report_price']),
                    'subtotal': float(section['subtotal']),
                    'vat_rate_label': section['vat_rate_label'],
                    'vat_amount': float(section['vat_amount']),
                    'discount_amount': float(section.get('discount_amount', 0) or 0),
                    'grand_total': float(section['grand_total']),
                },
            )
            for section in context['section_documents']
        ]

        summary_rows = [
            DocumentSummaryRow(
                row_no=row['row_no'],
                inspection_type_name=row['inspection_type_name'],
                estimated_days=row.get('estimated_days'),
                subtotal=float(row['subtotal']),
                discount_amount=float(row.get('discount_amount', 0) or 0),
                vat_rate_label=row['vat_rate_label'],
                vat_amount=float(row['vat_amount']),
                grand_total=float(row['grand_total']),
            )
            for row in context['summary_rows']
        ]

        revisions = [
            DocumentRevisionRow(
                revision_no=row['revision_no'],
                revision_date=row['revision_date'],
                revision_reason=row['revision_reason'],
            )
            for row in context['revision_logs']
        ]

        signatures = DocumentSignatureBlock(
            left_title=context['template']['accurate_sign_title'],
            right_title=context['template']['customer_sign_title'],
            authorized_person_name=context.get('authorized_person_name') or '-',
            signature_image_path=context['template'].get('signature_image_path'),
        )

        footer = DocumentFooter(
            company_text=context['template']['footer_company_text'],
            address_text=context['template'].get('footer_address_text', ''),
            contact_text=context['template']['footer_contact_text'],
            form_text=context['template']['footer_form_full_text'],
        )

        return DocumentModel(
            document_type='offer',
            document_no=context['offer_no'],
            date=context['date'],
            currency=context['currency'],
            header=header,
            intro_sections=intro_sections,
            sections=sections,
            summary_rows=summary_rows,
            summary_totals={
                'subtotal_before_discount': float(context.get('subtotal_before_discount', 0) or 0),
                'discount_amount': float(context.get('discount_amount', 0) or 0),
                'subtotal': float(context.get('grand_total', 0) or 0),
                'vat_amount': float(context.get('vat_amount', 0) or 0),
                'grand_total': float(context.get('grand_total_with_vat', 0) or 0),
            },
            revisions=revisions,
            signatures=signatures,
            footer=footer,
            metadata={
                'payment_terms_text': context['template']['payment_terms_text'],
                'note_text': context['template']['note_text'],
                'estimated_duration_text': context['template']['estimated_duration_text'],
                'option_validity_text': context['template']['option_validity_text'],
                'other_terms_text': context['template']['other_terms_text'],
            },
        )
