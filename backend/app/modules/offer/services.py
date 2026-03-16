from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
import shutil
from decimal import Decimal
from typing import Any

from app.core.database import SessionLocal
from app.modules.offer.models import Offer, OfferSection, OfferSectionTest, RequestOfferLink
from app.modules.operations.models import DefinitionTextTemplate
from app.modules.request.models import Request

OFFER_TEMPLATE_DEFAULTS: dict[str, dict[str, str]] = {
    "OFFER_DOCUMENT_TITLE": {
        "title": "Teklif Belgesi Başlığı",
        "body_text": "MUAYENE ÜCRETİ TEKLİF FORMU",
    },
    "OFFER_SCOPE_TEXT": {
        "title": "Teklif Kapsamı",
        "body_text": "{{CUSTOMER_NAME}} kuruluşunun ilgili alanlarının, seçili muayene türleri kapsamında belirtilen standartlara göre muayene faaliyetlerini kapsar.",
    },
    "OFFER_STANDARDS_TEXT": {
        "title": "Referans Alınan Standartlar",
        "body_text": "Muayene kapsamımızda belirtilen metot ve standartlara göre muayeneler gerçekleştirilir.\n\nAkreditasyon Kapsamımız: www.accuratetest.com.tr/akreditasyonkapsami.pdf\nHizmet Sunum Profili: www.accuratetest.com.tr/hizmetsunumprofili.pdf",
    },
    "OFFER_PAYMENT_TERMS": {
        "title": "Ödeme Şartları",
        "body_text": "Muayene ücreti teklif onayında %50 peşin, kalan kısım gerçekleşen muayene sonrasında bir hafta içerisinde ödenecektir.",
    },
    "OFFER_NOTE_TEXT": {
        "title": "Not",
        "body_text": "NOT 1: Muayenelerde planlanmış muayene dışında ölçüm ve/veya muayene talep edildiğinde teklif revize edilir. Muayene günü ACCURATE'ten kaynaklanmayan sebepler ile muayenenin iptal olması durumunda masraflar ve günlük uzman personel ederi fatura edilir.",
    },
    "OFFER_ESTIMATED_DURATION": {
        "title": "Tahmini Süre",
        "body_text": "Muayeneler tahmini <b>{{ESTIMATED_DAYS}}</b> gün içerisinde gerçekleştirilecektir. Muayenenin ACCURATE'ten kaynaklanmayan sebeplerden planlanan sürenin dışına çıkması durumunda günlük çalışma bedeli (<b>{{EXTRA_DAY_FEE}}</b>) ayrıca faturalandırılır.",
    },
    "OFFER_OPTION_VALIDITY": {
        "title": "Opsiyon / Geçerlilik",
        "body_text": "Teklifimiz 30 gün süre ile geçerlidir.",
    },
    "OFFER_OTHER_TERMS": {
        "title": "Diğer Şartlar",
        "body_text": 'Teklifimizi kabul etmeniz durumunda "kabul edilmiştir" yazısı, firma kaşesi ve yetkili kişi imzasıyla tarafımıza fakslayınız.\n\nOnaylı ücret teklifi tarafımıza faksladıktan sonra, muayene tarihini kesinleştirmek için muayene teklif formunu onaylamanız gerekmektedir.\n\nMuayene personeli, muayene gününün teyidini aldıktan sonra gerekli muayeneyi yapmak için firmanıza gelecektir.\n\nFirma; kontrol esnasında yardımcı personel bulundurmakla, İSG ile ilgili tedbirleri almakla yükümlüdür. Görevlendirilen yardımcı personel muayeneye tabi tesisi, ekipmanları ve tesis içerisindeki yerleşimi iyi biliyor olması sağlanmalıdır.\n\nTeklif onaylandıktan sonra sözleşme yerine geçer. Kuruluş periyodik olarak muayene talep ettiği durumlarda ayrıca bir sözleşme imzalanabilir.\n\nMuayene sonuçlarını veya can güvenliğini olumsuz olarak etkileyecek çevre, iklim veya kuruluş için koşullar söz konusu olduğunda muayene gerçekleştirilmez.\n\nİs bu sözleşmenin uygulamasından doğacak itilaflarda İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.\n\nİlgili muayene hizmeti için verilen teklifte verilen Muayene Süresi tahmini hesaplanan teorik süredir. Bu süre; müşteri iş programı, muayene alanı değişiklikleri, mesai çalışmaları ve müşteri cihaz/sistem arızaları gibi nedenlerden dolayı değişebilir. Bu durumda teklif revize edilir.\n\nİlgili muayene hizmetinde, bu teklifi onaylayan müşteri kuruluş teklif formu ile gönderilen http://www.accuratetest.com.tr/hizmetsartlariformu.pdf ’nda belirtilen şartlara uymayı kabul etmiş sayılır.',
    },
    "OFFER_ACCURATE_SIGN_TITLE": {
        "title": "ACCURATE İmza Başlığı",
        "body_text": "ACCURATE",
    },
    "OFFER_CUSTOMER_SIGN_TITLE": {
        "title": "Müşteri İmza Başlığı",
        "body_text": "FİRMA",
    },
    "OFFER_FOOTER_COMPANY": {
        "title": "Footer Firma Bilgisi",
        "body_text": "ACCURATE MUAYENE TEST VE KALİBRASYON HİZ. TİC. LTD. ŞTİ.",
    },
    "OFFER_FOOTER_ADDRESS": {
        "title": "Footer Adres Bilgisi",
        "body_text": "Yukarı Dudullu Mah. Turna Sk. No 15 ÜMRANİYE/İSTANBUL",
    },
    "OFFER_FOOTER_CONTACT": {
        "title": "Footer İletişim Bilgisi",
        "body_text": "e-mail: info@accuratetest.com.tr | Tel: 0216 594 19 47 | web: www.accuratetest.com.tr | Fax: 0216 594 19 17",
    },
    "OFFER_REVISION_NOTE": {
        "title": "Revizyon Açıklaması",
        "body_text": "Revizyon Geçmişi",
    },
    "OFFER_COMPANY_LOGO_PATH": {
        "title": "Firma Logo Yolu",
        "body_text": "backend/assets/offer/accurate-logo-JPEG-RGB.jpg",
    },
    "OFFER_ACCREDITATION_LOGO_PATH": {
        "title": "Türkak Logo Yolu",
        "body_text": "backend/assets/offer/AB-0510-M.M.jpg",
    },
    "OFFER_SIGNATURE_IMAGE_PATH": {
        "title": "İmza Görsel Yolu",
        "body_text": "backend/assets/offer/signature-stamp.png",
    },
    "OFFER_STANDARDS_INTRO": {
        "title": "Standartlar Giriş Metni",
        "body_text": "Muayene kapsamımızda belirtilen metot ve standartlara göre muayeneler gerçekleştirilir.",
    },
    "OFFER_REFERENCE_LINK_1_LABEL": {
        "title": "Referans Link 1 Başlık",
        "body_text": "Akreditasyon Kapsamımız",
    },
    "OFFER_REFERENCE_LINK_1_URL": {
        "title": "Referans Link 1 URL",
        "body_text": "https://www.accuratetest.com.tr/akreditasyonkapsami.pdf",
    },
    "OFFER_REFERENCE_LINK_2_LABEL": {
        "title": "Referans Link 2 Başlık",
        "body_text": "Hizmet Sunum Profili",
    },
    "OFFER_REFERENCE_LINK_2_URL": {
        "title": "Referans Link 2 URL",
        "body_text": "https://www.accuratetest.com.tr/hizmetsunumprofili.pdf",
    },
    "OFFER_FOOTER_FORM_CODE": {
        "title": "Footer Form Kodu",
        "body_text": "FR.180",
    },
    "OFFER_FOOTER_REVISION_DATE": {
        "title": "Footer Revizyon Tarihi",
        "body_text": "15.03.2026",
    },
    "OFFER_FOOTER_REVISION_NO": {
        "title": "Footer Revizyon No",
        "body_text": "09",
    },
}


def _next_offer_no(db) -> str:
    prefix = datetime.utcnow().strftime("T-%y%m")
    total = db.query(Offer).filter(Offer.revision_no == 0, Offer.offer_no.like(f"{prefix}%")).count() + 1
    return f"{prefix}{total:03d}"


def _to_decimal(value) -> Decimal:
    try:
        return Decimal(str(value or 0)).quantize(Decimal("0.01"))
    except Exception:
        return Decimal("0.00")


def _money(value) -> float:
    return float(_to_decimal(value))


def _currency_code(value: Any) -> str:
    code = str(value or 'TRY').upper()
    return {'TL': 'TRY'}.get(code, code)




def _money_label(value: Any, currency: Any) -> str:
    amount = _to_decimal(value)
    code = _currency_code(currency)
    symbols = {'TRY': '₺', 'USD': '$', 'EUR': '€'}
    symbol = symbols.get(code, code)
    text = f"{amount:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    return f"{text} {symbol}"

def _vat_rate_value(value: Any) -> Decimal:
    try:
        return Decimal(str(value or 0)).quantize(Decimal('0.01'))
    except Exception:
        return Decimal('0.00')


def _safe_json_load(raw: str | None) -> dict:
    try:
        loaded = json.loads(raw or "{}")
        return loaded if isinstance(loaded, dict) else {}
    except Exception:
        return {}



def _offer_document_snapshot(offer: Offer) -> dict[str, Any]:
    snapshot = _safe_json_load(offer.request_snapshot_json)
    current = snapshot.get("offer_document")
    if not isinstance(current, dict):
        current = {}
        snapshot["offer_document"] = current
    return snapshot


def _get_offer_discount_rate(offer: Offer) -> Decimal:
    snapshot = _safe_json_load(offer.request_snapshot_json)
    document = snapshot.get("offer_document") if isinstance(snapshot, dict) else {}
    try:
        return Decimal(str((document or {}).get("discount_rate") or 0)).quantize(Decimal("0.01"))
    except Exception:
        return Decimal("0.00")


def _get_section_discount_rate(section: OfferSection) -> Decimal:
    snapshot = _safe_json_load(section.section_snapshot_json)
    try:
        return Decimal(str((snapshot or {}).get("discount_rate") or 0)).quantize(Decimal("0.01"))
    except Exception:
        return Decimal("0.00")


def _set_section_discount_rate(section: OfferSection, rate: Any) -> None:
    snapshot = _safe_json_load(section.section_snapshot_json)
    snapshot["discount_rate"] = float(_to_decimal(rate))
    section.section_snapshot_json = json.dumps(snapshot, ensure_ascii=False)


def _assert_offer_editable(offer: Offer) -> None:
    _assert_offer_is_current(offer)
    if offer.status == "APPROVED":
        raise ValueError("Onaylı teklif üzerinde fiyat veya belge alanı revizesi yapılamaz")
    if offer.status == "CANCELLED":
        raise ValueError("İptal edilmiş teklif üzerinde işlem yapılamaz")

def _build_summary_items(payload: dict) -> list[dict]:
    items: list[dict] = []
    if not isinstance(payload, dict):
        return items
    for key, value in payload.items():
        label = str(key).replace("_", " ").strip().title()
        pretty_value = value
        if value in (None, "", [], {}):
            pretty_value = "-"
        elif isinstance(value, (list, tuple)):
            pretty_value = ", ".join(str(v) for v in value) if value else "-"
        elif isinstance(value, dict):
            pretty_value = ", ".join(f"{k}: {v}" for k, v in value.items()) if value else "-"
        items.append({"label": label, "value": pretty_value})
    return items


def _build_sections_from_snapshot(snapshot: dict) -> list[dict]:
    lines = snapshot.get("lines") or []
    sections: list[dict] = []
    for index, line in enumerate(lines, start=1):
        inspection_type_code = line.get("inspection_type_code") or f"LINE_{index}"
        inspection_type_name = line.get("inspection_type_name") or f"Muayene {index}"
        payload = line.get("payload") or {}
        tests = line.get("tests") or []
        sections.append(
            {
                "section_no": index,
                "inspection_type_code": inspection_type_code,
                "inspection_type_name": inspection_type_name,
                "title": f"{index}. {inspection_type_name}",
                "section_snapshot_json": json.dumps(
                    {
                        "inspection_type_code": inspection_type_code,
                        "inspection_type_name": inspection_type_name,
                        "payload": payload,
                        "summary_items": _build_summary_items(payload),
                    },
                    ensure_ascii=False,
                ),
                "tests": [
                    {
                        "test_code": test.get("test_code") or f"TEST_{i}",
                        "test_name": test.get("test_name") or test.get("test_code") or f"Test {i}",
                        "is_requested": bool(test.get("is_requested", True)),
                        "display_order": i,
                    }
                    for i, test in enumerate(tests, start=1)
                ],
            }
        )
    if sections:
        return sections
    return [
        {
            "section_no": 1,
            "inspection_type_code": "GENERAL",
            "inspection_type_name": "Genel Muayene",
            "title": "1. Genel Muayene",
            "section_snapshot_json": json.dumps({"summary_items": []}, ensure_ascii=False),
            "tests": [],
        }
    ]


def _recalculate_offer_totals(db, offer: Offer) -> None:
    subtotal = Decimal("0.00")
    section_discount_total = Decimal("0.00")
    extra_day_fee_total = Decimal("0.00")
    extra_day_fee = _to_decimal(getattr(offer, 'extra_day_fee', 0))
    for section in offer.sections:
        section.subtotal = _to_decimal(section.service_price) + _to_decimal(section.travel_price) + _to_decimal(section.report_price)
        section_discount_rate = _get_section_discount_rate(section)
        section_discount_amount = (section.subtotal * section_discount_rate / Decimal('100')).quantize(Decimal('0.01'))
        section.updated_at = datetime.utcnow()
        subtotal += _to_decimal(section.subtotal)
        section_discount_total += section_discount_amount
        extra_day_fee_total += _to_decimal(section.estimated_days or 0) * extra_day_fee
    vat_rate = _vat_rate_value(offer.vat_rate)
    offer_discount_rate = _get_offer_discount_rate(offer)
    pre_offer_discount_base = max(subtotal - section_discount_total, Decimal('0.00')) + extra_day_fee_total
    offer_discount_amount = (pre_offer_discount_base * offer_discount_rate / Decimal('100')).quantize(Decimal('0.01'))
    vat_base = max(pre_offer_discount_base - offer_discount_amount, Decimal('0.00'))
    vat_amount = (vat_base * vat_rate / Decimal('100')).quantize(Decimal('0.01'))
    offer.subtotal_amount = subtotal
    offer.grand_total = vat_base
    offer.vat_amount = vat_amount
    offer.grand_total_with_vat = (vat_base + vat_amount).quantize(Decimal('0.01'))
    offer.currency = _currency_code(getattr(offer, 'currency', 'TRY'))
    offer.extra_day_fee = extra_day_fee
    offer.updated_at = datetime.utcnow()
    db.flush()


def _serialize_section(section: OfferSection) -> dict:
    snapshot = _safe_json_load(section.section_snapshot_json)
    return {
        "id": section.id,
        "section_no": section.section_no,
        "inspection_type_code": section.inspection_type_code,
        "inspection_type_name": section.inspection_type_name,
        "section_title": section.title,
        "summary_items": snapshot.get("summary_items") or [],
        "payload": snapshot.get("payload") or {},
        "service_price": _money(section.service_price),
        "travel_price": _money(section.travel_price),
        "report_price": _money(section.report_price),
        "subtotal": _money(section.subtotal),
        "estimated_days": section.estimated_days,
        "discount_rate": float(_get_section_discount_rate(section)),
        "tests": [
            {
                "id": test.id,
                "test_code": test.test_code,
                "test_name": test.test_name,
                "is_requested": bool(test.is_requested),
                "display_order": test.display_order,
            }
            for test in section.tests
        ],
    }


def _serialize_offer(item: Offer) -> dict:
    return {
        "id": item.id,
        "offer_no": item.offer_no,
        "title": item.title,
        "customer_name": item.customer_name,
        "inspection_location_address": item.inspection_location_address,
        "requested_inspection_date": item.requested_inspection_date,
        "status": item.status,
        "root_id": item.root_id,
        "revision_no": item.revision_no,
        "revision_status": item.revision_status,
        "is_current": item.is_current,
        "source_request_root_id": item.source_request_root_id,
        "source_request_revision_id": item.source_request_revision_id,
        "source_request_no": item.source_request_no,
        "section_count": len(item.sections),
        "subtotal_amount": _money(item.subtotal_amount),
        "grand_total": _money(item.grand_total),
        "currency": _currency_code(getattr(item, 'currency', 'TRY')) ,
        "vat_rate": float(_vat_rate_value(getattr(item, 'vat_rate', 0))),
        "vat_amount": _money(getattr(item, 'vat_amount', 0)),
        "grand_total_with_vat": _money(getattr(item, 'grand_total_with_vat', item.grand_total)),
        "estimated_days": getattr(item, 'estimated_days', None),
        "extra_day_fee": _money(getattr(item, 'extra_day_fee', 0)),
        "authorized_person_name": getattr(item, 'authorized_person_name', None),
        "approved_offer_file_name": getattr(item, 'approved_offer_file_name', None),
        "approved_offer_file_path": getattr(item, 'approved_offer_file_path', None),
        "has_approved_offer_file": bool(getattr(item, 'approved_offer_file_path', None)),
        "discount_rate": float(_get_offer_discount_rate(item)),
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def _ensure_sections(db, offer: Offer) -> None:
    if offer.sections:
        _recalculate_offer_totals(db, offer)
        return
    snapshot = _safe_json_load(offer.request_snapshot_json)
    section_defs = _build_sections_from_snapshot(snapshot)
    for section_def in section_defs:
        section = OfferSection(
            offer_id=offer.id,
            section_no=section_def["section_no"],
            inspection_type_code=section_def["inspection_type_code"],
            inspection_type_name=section_def["inspection_type_name"],
            title=section_def["title"],
            section_snapshot_json=section_def["section_snapshot_json"],
            service_price=0,
            travel_price=0,
            report_price=0,
            subtotal=0,
        )
        db.add(section)
        db.flush()
        for test in section_def["tests"]:
            db.add(
                OfferSectionTest(
                    offer_section_id=section.id,
                    test_code=test["test_code"],
                    test_name=test["test_name"],
                    is_requested=test["is_requested"],
                    display_order=test["display_order"],
                )
            )
    db.flush()
    db.refresh(offer)
    _recalculate_offer_totals(db, offer)
    db.commit()
    db.refresh(offer)


def _render_template_text(text: str, replacements: dict[str, Any]) -> str:
    rendered = text or ""
    for key, value in replacements.items():
        rendered = rendered.replace(f"{{{{{key}}}}}", str(value or ""))
    return rendered


def ensure_offer_template_defaults() -> None:
    db = SessionLocal()
    try:
        existing = {
            item.template_type
            for item in db.query(DefinitionTextTemplate).filter(DefinitionTextTemplate.template_type.like("OFFER_%")).all()
        }
        changed = False
        for template_type, payload in OFFER_TEMPLATE_DEFAULTS.items():
            if template_type in existing:
                continue
            db.add(
                DefinitionTextTemplate(
                    template_type=template_type,
                    title=payload["title"],
                    body_text=payload["body_text"],
                    is_active=True,
                    version_no=1,
                )
            )
            changed = True
        if changed:
            db.commit()
    finally:
        db.close()


def get_offer_template_settings() -> dict[str, str]:
    ensure_offer_template_defaults()
    db = SessionLocal()
    try:
        items = (
            db.query(DefinitionTextTemplate)
            .filter(DefinitionTextTemplate.template_type.like("OFFER_%"), DefinitionTextTemplate.is_active == True)
            .order_by(DefinitionTextTemplate.template_type.asc(), DefinitionTextTemplate.version_no.desc(), DefinitionTextTemplate.id.desc())
            .all()
        )
        data: dict[str, str] = {key: value["body_text"] for key, value in OFFER_TEMPLATE_DEFAULTS.items()}
        seen: set[str] = set()
        for item in items:
            if item.template_type in seen:
                continue
            data[item.template_type] = item.body_text or ""
            seen.add(item.template_type)
        return data
    finally:
        db.close()


def _extract_request_contact(snapshot: dict) -> dict[str, str | None]:
    return {
        "request_no": snapshot.get("request_no"),
        "contact_person_name": snapshot.get("contact_person_name"),
        "phone": snapshot.get("phone"),
        "email": snapshot.get("email"),
    }


def _build_pricing_rows(offer: Offer) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for section in offer.sections:
        rows.append(
            {
                "row_no": f"3.{section.section_no}",
                "section_no": section.section_no,
                "inspection_type_code": section.inspection_type_code,
                "inspection_type_name": section.inspection_type_name,
                "service_price": _money(section.service_price),
                "travel_price": _money(section.travel_price),
                "report_price": _money(section.report_price),
                "total": _money(section.subtotal),
            }
        )
    return rows


def list_offers() -> list[dict]:
    db = SessionLocal()
    try:
        rows = (
            db.query(Offer)
            .filter(Offer.is_current == True, Offer.status.notin_(["APPROVED", "CANCELLED"]))
            .order_by(Offer.created_at.desc(), Offer.id.desc())
            .all()
        )
        data: list[dict] = []
        for row in rows:
            _ensure_sections(db, row)
            data.append(_serialize_offer(row))
        return data
    finally:
        db.close()


def list_approved_offers() -> list[dict]:
    db = SessionLocal()
    try:
        rows = (
            db.query(Offer)
            .filter(Offer.is_current == True, Offer.status.in_(["APPROVED", "CANCELLED"]))
            .order_by(Offer.updated_at.desc(), Offer.id.desc())
            .all()
        )
        data: list[dict] = []
        for row in rows:
            _ensure_sections(db, row)
            data.append(_serialize_offer(row))
        return data
    finally:
        db.close()


def list_offer_revision_children(offer_id: int) -> list[dict]:
    db = SessionLocal()
    try:
        offer = db.query(Offer).filter(Offer.id == offer_id).first()
        if not offer:
            raise ValueError("Teklif bulunamadı")
        root_id = offer.root_id or offer.id
        rows = (
            db.query(Offer)
            .filter(Offer.root_id == root_id, Offer.id != offer.id)
            .order_by(Offer.revision_no.desc(), Offer.id.desc())
            .all()
        )
        data: list[dict] = []
        for row in rows:
            _ensure_sections(db, row)
            data.append(_serialize_offer(row))
        return data
    finally:
        db.close()


def list_offers_for_request_root(request_root_id: int) -> list[dict]:
    db = SessionLocal()
    try:
        rows = (
            db.query(Offer)
            .filter(Offer.source_request_root_id == request_root_id)
            .order_by(Offer.revision_no.desc(), Offer.id.desc())
            .all()
        )
        data: list[dict] = []
        for row in rows:
            _ensure_sections(db, row)
            data.append(_serialize_offer(row))
        return data
    finally:
        db.close()


def get_offer_detail(offer_id: int) -> dict:
    db = SessionLocal()
    try:
        offer = db.query(Offer).filter(Offer.id == offer_id).first()
        if not offer:
            raise ValueError("Teklif bulunamadı")
        _ensure_sections(db, offer)
        snapshot = _safe_json_load(offer.request_snapshot_json)
        from app.modules.protocol.services import list_protocol_drafts_for_offer

        revision_rows = (
            db.query(Offer)
            .filter(Offer.source_request_root_id == offer.source_request_root_id)
            .order_by(Offer.revision_no.desc(), Offer.id.desc())
            .all()
        )
        for row in revision_rows:
            _ensure_sections(db, row)

        return {
            **_serialize_offer(offer),
            "request_snapshot": _extract_request_contact(snapshot),
            "sections": [_serialize_section(section) for section in offer.sections],
            "protocol_drafts": list_protocol_drafts_for_offer(offer.id),
            "revision_history": [
                {
                    "id": row.id,
                    "offer_no": row.offer_no,
                    "revision_no": row.revision_no,
                    "revision_status": row.revision_status,
                    "is_current": bool(row.is_current),
                    "status": row.status,
                    "grand_total": _money(row.grand_total),
                    "section_count": len(row.sections),
                    "created_at": row.created_at.isoformat() if row.created_at else None,
                }
                for row in revision_rows
            ],
        }
    finally:
        db.close()


def get_offer_document_context(offer_id: int) -> dict[str, Any]:
    db = SessionLocal()
    try:
        offer = db.query(Offer).filter(Offer.id == offer_id).first()
        if not offer:
            raise ValueError("Teklif bulunamadı")
        _ensure_sections(db, offer)
        settings = get_offer_template_settings()
        revision_rows = (
            db.query(Request)
            .filter(Request.root_id == offer.source_request_root_id)
            .order_by(Request.revision_no.asc(), Request.id.asc())
            .all()
        )
        if not revision_rows:
            revision_rows = (
                db.query(Request)
                .filter((Request.id == offer.source_request_revision_id) | (Request.root_id == offer.source_request_root_id))
                .order_by(Request.revision_no.asc(), Request.id.asc())
                .all()
            )

        total_estimated_days = sum(int(section.estimated_days or 0) for section in offer.sections if section.estimated_days)
        replacements = {
            "CUSTOMER_NAME": offer.customer_name,
            "OFFER_NO": offer.offer_no,
            "REQUEST_NO": offer.source_request_no,
            "ADDRESS": offer.inspection_location_address or "-",
            "DATE": datetime.utcnow().strftime("%d.%m.%Y"),
            "ESTIMATED_DAYS": str(total_estimated_days or '--'),
            "EXTRA_DAY_FEE": f"<b>{_money_label(getattr(offer, 'extra_day_fee', 0), getattr(offer, 'currency', 'TRY'))}</b>",
            "AUTHORIZED_PERSON": getattr(offer, 'authorized_person_name', '') or '',
        }

        section_documents: list[dict[str, Any]] = []
        summary_rows: list[dict[str, Any]] = []
        currency = _currency_code(getattr(offer, 'currency', 'TRY'))
        vat_rate = _vat_rate_value(getattr(offer, 'vat_rate', 0))
        offer_discount_rate = _get_offer_discount_rate(offer)
        total_subtotal = Decimal('0.00')
        total_section_discount = Decimal('0.00')
        extra_day_fee_total = Decimal('0.00')
        for section in offer.sections:
            subtotal = _to_decimal(section.subtotal)
            section_discount_rate = _get_section_discount_rate(section)
            section_discount_amount = (subtotal * section_discount_rate / Decimal('100')).quantize(Decimal('0.01'))
            net_subtotal = max(subtotal - section_discount_amount, Decimal('0.00'))
            section_vat = (net_subtotal * vat_rate / Decimal('100')).quantize(Decimal('0.01'))
            section_total = (net_subtotal + section_vat).quantize(Decimal('0.01'))
            total_subtotal += subtotal
            total_section_discount += section_discount_amount
            extra_day_fee_total += _to_decimal(section.estimated_days or 0) * _to_decimal(getattr(offer, 'extra_day_fee', 0))
            serialized = _serialize_section(section)
            summary_items = serialized.get('summary_items') or _build_summary_items(serialized.get('payload') or {})
            doc_section = {
                **serialized,
                'row_no': f"3.{section.section_no}",
                'service_price': _money(section.service_price),
                'travel_price': _money(section.travel_price),
                'report_price': _money(section.report_price),
                'subtotal': _money(subtotal),
                'discount_rate': float(section_discount_rate),
                'discount_amount': _money(section_discount_amount),
                'net_subtotal': _money(net_subtotal),
                'vat_rate': float(vat_rate),
                'vat_rate_label': f"%{vat_rate:.2f}".replace('.00', ''),
                'vat_amount': _money(section_vat),
                'grand_total': _money(section_total),
                'grand_total_raw': float(section_total),
                'estimated_days': section.estimated_days,
                'summary_rows': [
                    {'label': str(item.get('label') or '-'), 'value': str(item.get('value') or '-')}
                    for item in summary_items
                ],
            }
            section_documents.append(doc_section)
            summary_rows.append({
                'row_no': doc_section['row_no'],
                'inspection_type_name': section.inspection_type_name,
                'estimated_days': section.estimated_days,
                'subtotal': float(subtotal),
                'discount_amount': float(section_discount_amount),
                'vat_rate_label': doc_section['vat_rate_label'],
                'vat_amount': float(section_vat),
                'grand_total': float(section_total),
                'grand_total_raw': float(section_total),
                'document_totals': {
                    'subtotal': float(getattr(offer, 'grand_total', 0) or 0),
                    'vat_amount': float(getattr(offer, 'vat_amount', 0) or 0),
                    'grand_total': float(getattr(offer, 'grand_total_with_vat', getattr(offer, 'grand_total', 0)) or 0),
                },
            })

        request_contact = _extract_request_contact(_safe_json_load(offer.request_snapshot_json))
        reference_links = [
            {'label': settings['OFFER_REFERENCE_LINK_1_LABEL'], 'url': settings['OFFER_REFERENCE_LINK_1_URL']},
            {'label': settings['OFFER_REFERENCE_LINK_2_LABEL'], 'url': settings['OFFER_REFERENCE_LINK_2_URL']},
        ]

        offer_discount_base = max(total_subtotal - total_section_discount + extra_day_fee_total, Decimal('0.00'))
        offer_discount_amount = (offer_discount_base * offer_discount_rate / Decimal('100')).quantize(Decimal('0.01'))
        vat_base = max(offer_discount_base - offer_discount_amount, Decimal('0.00'))
        total_vat_amount = (vat_base * vat_rate / Decimal('100')).quantize(Decimal('0.01'))
        total_grand = (vat_base + total_vat_amount).quantize(Decimal('0.01'))

        revision_logs = [
            {
                'revision_no': f"Rev.{row.revision_no}",
                'revision_date': (row.revision_created_at or row.updated_at or row.created_at).strftime('%d.%m.%Y') if (row.revision_created_at or row.updated_at or row.created_at) else '-',
                'revision_reason': row.revision_reason or 'İlk kayıt',
            }
            for row in revision_rows
        ] or [{'revision_no': 'Rev.0', 'revision_date': datetime.utcnow().strftime('%d.%m.%Y'), 'revision_reason': 'İlk kayıt'}]

        return {
            'offer_id': offer.id,
            'offer_no': offer.offer_no,
            'date': datetime.utcnow().strftime('%d.%m.%Y'),
            'customer_name': offer.customer_name,
            'address': offer.inspection_location_address or '-',
            'source_request_no': offer.source_request_no,
            'request_contact': request_contact,
            'currency': currency,
            'vat_rate': float(vat_rate),
            'vat_amount': _money(total_vat_amount),
            'grand_total': _money(vat_base),
            'grand_total_with_vat': _money(total_grand),
            'subtotal_before_discount': _money(total_subtotal + extra_day_fee_total),
            'section_discount_total': _money(total_section_discount),
            'offer_discount_rate': float(offer_discount_rate),
            'offer_discount_amount': _money(offer_discount_amount),
            'discount_amount': _money(total_section_discount + offer_discount_amount),
            'estimated_days': getattr(offer, 'estimated_days', None),
            'extra_day_fee': _money(getattr(offer, 'extra_day_fee', 0)),
            'authorized_person_name': getattr(offer, 'authorized_person_name', None) or '',
            'sections': [_serialize_section(section) for section in offer.sections],
            'section_documents': section_documents,
            'summary_rows': summary_rows,
            'reference_links': reference_links,
            'revision_logs': revision_logs,
            'template': {
                'document_title': _render_template_text(settings['OFFER_DOCUMENT_TITLE'], replacements),
                'scope_text': _render_template_text(settings['OFFER_SCOPE_TEXT'], replacements),
                'standards_text': _render_template_text(settings['OFFER_STANDARDS_TEXT'], replacements),
                'standards_intro_text': _render_template_text(settings['OFFER_STANDARDS_INTRO'], replacements),
                'payment_terms_text': _render_template_text(settings['OFFER_PAYMENT_TERMS'], replacements),
                'note_text': _render_template_text(settings['OFFER_NOTE_TEXT'], replacements),
                'estimated_duration_text': f"Muayeneler tahmini <b>{replacements['ESTIMATED_DAYS']}</b> gün içerisinde gerçekleştirilecektir. Muayenenin ACCURATE'ten kaynaklanmayan sebeplerden planlanan sürenin dışına çıkması durumunda günlük çalışma bedeli (<b>{replacements['EXTRA_DAY_FEE']}</b>) ayrıca faturalandırılır.",
                'option_validity_text': _render_template_text(settings['OFFER_OPTION_VALIDITY'], replacements),
                'other_terms_text': '''Teklifimizi kabul etmeniz durumunda “kabul edilmiştir” yazısı, firma kaşesi ve yetkili kişi imzasıyla tarafımıza fakslayınız.

Onaylı ücret teklifi tarafımıza faksladıktan sonra, muayene tarihini kesinleştirmek için muayene teklif formunu onaylamanız gerekmektedir.

Muayene personeli, muayene gününün teyidini aldıktan sonra gerekli muayeneyi yapmak için firmanıza gelecektir.

Firma; kontrol esnasında yardımcı personel bulundurmakla, İSG ile ilgili tedbirleri almakla yükümlüdür. Görevlendirilen yardımcı personel muayeneye tabi tesisi, ekipmanları ve tesis içerisindeki yerleşimi iyi biliyor olması sağlanmalıdır.

Teklif onaylandıktan sonra sözleşme yerine geçer. Kuruluş periyodik olarak muayene talep ettiği durumlarda ayrıca bir sözleşme imzalanabilir.

Muayene sonuçlarını veya can güvenliğini olumsuz olarak etkileyecek çevre, iklim veya kuruluş için koşullar söz konusu olduğunda muayene gerçekleştirilmez.

İs bu sözleşmenin uygulamasından doğacak itilaflarda İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.

İlgili muayene hizmeti için verilen teklifte verilen Muayene Süresi tahmini hesaplanan teorik süredir. Bu süre; müşteri iş programı, muayene alanı değişiklikleri, mesai çalışmaları ve müşteri cihaz/sistem arızaları gibi nedenlerden dolayı değişebilir. Bu durumda teklif revize edilir.

İlgili muayene hizmetinde, bu teklifi onaylayan müşteri kuruluş teklif formu ile gönderilen http://www.accuratetest.com.tr/hizmetsartlariformu.pdf ’nda belirtilen şartlara uymayı kabul etmiş sayılır.''',
                'accurate_sign_title': _render_template_text(settings['OFFER_ACCURATE_SIGN_TITLE'], replacements),
                'customer_sign_title': _render_template_text(settings['OFFER_CUSTOMER_SIGN_TITLE'], replacements),
                'footer_company_text': _render_template_text(settings['OFFER_FOOTER_COMPANY'], replacements),
                'footer_address_text': _render_template_text(settings['OFFER_FOOTER_ADDRESS'], replacements),
                'footer_contact_text': _render_template_text(settings['OFFER_FOOTER_CONTACT'], replacements),
                'revision_note_text': _render_template_text(settings['OFFER_REVISION_NOTE'], replacements),
                'company_logo_path': settings['OFFER_COMPANY_LOGO_PATH'],
                'accreditation_logo_path': settings['OFFER_ACCREDITATION_LOGO_PATH'],
                'signature_image_path': settings['OFFER_SIGNATURE_IMAGE_PATH'],
                'footer_form_full_text': f"{settings['OFFER_FOOTER_FORM_CODE']}/{settings['OFFER_FOOTER_REVISION_DATE']}-{settings['OFFER_FOOTER_REVISION_NO']}",
            },
        }
    finally:
        db.close()


def update_offer_section_pricing(offer_id: int, section_id: int, payload: dict) -> dict:
    db = SessionLocal()
    try:
        offer = db.query(Offer).filter(Offer.id == offer_id).first()
        if not offer:
            raise ValueError("Teklif bulunamadı")
        _ensure_sections(db, offer)
        _assert_offer_editable(offer)
        section = db.query(OfferSection).filter(OfferSection.id == section_id, OfferSection.offer_id == offer_id).first()
        if not section:
            raise ValueError("Teklif bölümü bulunamadı")
        section.service_price = _to_decimal(payload.get("service_price"))
        section.travel_price = _to_decimal(payload.get("travel_price"))
        section.report_price = _to_decimal(payload.get("report_price"))
        estimated_days = payload.get('estimated_days')
        section.estimated_days = int(estimated_days) if str(estimated_days or '').strip() else None
        _set_section_discount_rate(section, payload.get('discount_rate'))
        _recalculate_offer_totals(db, offer)
        db.commit()
        db.refresh(section)
        db.refresh(offer)
        return {
            "section": _serialize_section(section),
            "offer": _serialize_offer(offer),
        }
    finally:
        db.close()




def update_offer_document_fields(offer_id: int, payload: dict) -> dict:
    db = SessionLocal()
    try:
        offer = db.query(Offer).filter(Offer.id == offer_id).first()
        if not offer:
            raise ValueError('Teklif bulunamadı')
        _assert_offer_editable(offer)
        offer.currency = _currency_code(payload.get('currency') or offer.currency or 'EUR')
        offer.vat_rate = _vat_rate_value(payload.get('vat_rate'))
        offer.extra_day_fee = _to_decimal(payload.get('extra_day_fee'))
        authorized_person_name = str(payload.get('authorized_person_name') or '').strip()
        offer.authorized_person_name = authorized_person_name or None
        snapshot = _offer_document_snapshot(offer)
        document = snapshot.get('offer_document') or {}
        document['discount_rate'] = float(_to_decimal(payload.get('discount_rate')))
        snapshot['offer_document'] = document
        offer.request_snapshot_json = json.dumps(snapshot, ensure_ascii=False)
        _recalculate_offer_totals(db, offer)
        db.commit()
        db.refresh(offer)
        return _serialize_offer(offer)
    finally:
        db.close()

def create_offer_draft_from_request_snapshot(
    *,
    source_request_root_id: int,
    source_request_revision_id: int,
    source_request_no: str,
    customer_name: str,
    inspection_location_address: str | None,
    requested_inspection_date: str | None,
    request_snapshot: dict,
    revision_reason: str | None = None,
) -> dict:
    db = SessionLocal()
    try:
        existing_same = (
            db.query(Offer)
            .filter(
                Offer.source_request_revision_id == source_request_revision_id,
                Offer.source_request_root_id == source_request_root_id,
            )
            .order_by(Offer.id.desc())
            .first()
        )
        if existing_same:
            _ensure_sections(db, existing_same)
            return _serialize_offer(existing_same)

        current = (
            db.query(Offer)
            .filter(Offer.source_request_root_id == source_request_root_id, Offer.is_current == True)
            .order_by(Offer.id.desc())
            .first()
        )

        if current:
            offer_no = current.offer_no
            root_id = current.root_id or current.id
            revision_no = (current.revision_no or 0) + 1
            current.is_current = False
            current.revision_status = "SUPERSEDED"
            current.updated_at = datetime.utcnow()
            parent_revision_id = current.id
        else:
            offer_no = _next_offer_no(db)
            root_id = None
            revision_no = 0
            parent_revision_id = None

        item = Offer(
            offer_no=offer_no,
            title=f"{customer_name} · Teklif Taslağı",
            customer_name=customer_name,
            inspection_location_address=inspection_location_address,
            requested_inspection_date=requested_inspection_date,
            status="DRAFT",
            root_id=root_id,
            revision_no=revision_no,
            revision_status="DRAFT",
            is_current=True,
            revision_reason=revision_reason,
            parent_revision_id=parent_revision_id,
            source_request_root_id=source_request_root_id,
            source_request_revision_id=source_request_revision_id,
            source_request_no=source_request_no,
            request_snapshot_json=json.dumps(request_snapshot or {}, ensure_ascii=False),
        )
        db.add(item)
        db.flush()
        if not item.root_id:
            item.root_id = item.id

        db.add(
            RequestOfferLink(
                request_root_id=source_request_root_id,
                request_revision_id=source_request_revision_id,
                offer_root_id=item.root_id,
                offer_revision_id=item.id,
                link_type="GENERATED_DRAFT",
            )
        )
        db.flush()
        _ensure_sections(db, item)
        db.refresh(item)
        return _serialize_offer(item)
    finally:
        db.close()


APPROVED_UPLOAD_DIR = Path(__file__).resolve().parents[4] / "generated_offers" / "approved_uploads"

def _get_offer_or_raise(db, offer_id: int) -> Offer:
    offer = db.query(Offer).filter(Offer.id == offer_id).first()
    if not offer:
        raise ValueError("Teklif bulunamadı")
    return offer


def _assert_offer_is_current(offer: Offer) -> None:
    if not bool(offer.is_current):
        raise ValueError("Eski revizyonlar üzerinde işlem yapılamaz")


def approve_offer(offer_id: int) -> dict:
    db = SessionLocal()
    try:
        offer = _get_offer_or_raise(db, offer_id)
        _assert_offer_is_current(offer)
        if offer.status == 'CANCELLED':
            raise ValueError('İptal edilmiş teklif tekrar onaylanamaz')
        offer.status = 'APPROVED'
        offer.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(offer)
        return _serialize_offer(offer)
    finally:
        db.close()


def cancel_approved_offer(offer_id: int) -> dict:
    db = SessionLocal()
    try:
        offer = _get_offer_or_raise(db, offer_id)
        _assert_offer_is_current(offer)
        if offer.status != 'APPROVED':
            raise ValueError('Sadece onaylı teklifler iptal edilebilir')
        offer.status = 'CANCELLED'
        offer.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(offer)
        return _serialize_offer(offer)
    finally:
        db.close()


def upload_approved_offer_file(offer_id: int, upload_file) -> dict:
    db = SessionLocal()
    try:
        offer = db.query(Offer).filter(Offer.id == offer_id).first()
        if not offer:
            raise ValueError('Teklif bulunamadı')
        suffix = Path(upload_file.filename or '').suffix.lower()
        _assert_offer_editable(offer)
        if suffix not in {'.pdf', '.jpg', '.jpeg', '.png'}:
            raise ValueError('Sadece PDF veya görsel dosyası yüklenebilir')
        APPROVED_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        filename = f"offer_{offer.id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}{suffix}"
        path = APPROVED_UPLOAD_DIR / filename
        with path.open('wb') as target:
            shutil.copyfileobj(upload_file.file, target)
        offer.approved_offer_file_path = str(path)
        offer.approved_offer_file_name = upload_file.filename or filename
        offer.approved_offer_uploaded_at = datetime.utcnow()
        offer.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(offer)
        return _serialize_offer(offer)
    finally:
        db.close()