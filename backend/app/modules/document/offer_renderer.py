from __future__ import annotations

from pathlib import Path

from app.modules.document.offer_renderer_docx import generate_offer_docx as _generate_offer_docx
from app.modules.document_engine.services.offer_pdf_service import OfferPDFService


def generate_offer_docx(offer_id: int) -> Path:
    return _generate_offer_docx(offer_id)


def generate_offer_pdf(offer_id: int) -> Path:
    return OfferPDFService().generate(offer_id)
