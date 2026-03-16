from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(slots=True)
class DocumentHeader:
    title: str
    meta_rows: list[tuple[str, str]] = field(default_factory=list)
    left_logo_path: str | None = None
    right_logo_path: str | None = None


@dataclass(slots=True)
class DocumentScopeRow:
    label: str
    value: str


@dataclass(slots=True)
class DocumentPriceRow:
    label: str
    value: float
    is_total: bool = False


@dataclass(slots=True)
class DocumentSummaryRow:
    row_no: str
    inspection_type_name: str
    estimated_days: int | None
    subtotal: float
    discount_amount: float = 0
    vat_rate_label: str = '0'
    vat_amount: float = 0
    grand_total: float = 0


@dataclass(slots=True)
class DocumentRevisionRow:
    revision_no: str
    revision_date: str
    revision_reason: str


@dataclass(slots=True)
class DocumentSignatureBlock:
    left_title: str
    right_title: str
    authorized_person_name: str
    signature_image_path: str | None = None


@dataclass(slots=True)
class DocumentFooter:
    company_text: str
    address_text: str
    contact_text: str
    form_text: str


@dataclass(slots=True)
class DocumentSection:
    code: str
    title: str
    scope_rows: list[DocumentScopeRow] = field(default_factory=list)
    test_items: list[str] = field(default_factory=list)
    price_rows: list[DocumentPriceRow] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(slots=True)
class DocumentModel:
    document_type: str
    document_no: str
    date: str
    currency: str
    header: DocumentHeader
    intro_sections: list[dict[str, Any]] = field(default_factory=list)
    sections: list[DocumentSection] = field(default_factory=list)
    summary_rows: list[DocumentSummaryRow] = field(default_factory=list)
    summary_totals: dict[str, float] = field(default_factory=dict)
    revisions: list[DocumentRevisionRow] = field(default_factory=list)
    signatures: DocumentSignatureBlock | None = None
    footer: DocumentFooter | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
