from __future__ import annotations

import json

from app.core.database import SessionLocal
from app.modules.offer.models import Offer, OfferSection
from app.modules.protocol.models import Protocol, ProtocolTest


def _safe_json_load(raw: str | None) -> dict:
    try:
        loaded = json.loads(raw or "{}")
        return loaded if isinstance(loaded, dict) else {}
    except Exception:
        return {}


def _serialize_protocol(protocol: Protocol, offer_no: str | None = None) -> dict:
    return {
        "id": protocol.id,
        "protocol_no": protocol.protocol_no,
        "offer_id": protocol.offer_id,
        "offer_no": offer_no,
        "offer_section_id": protocol.offer_section_id,
        "customer_name": protocol.customer_name,
        "inspection_location_address": protocol.inspection_location_address,
        "source_request_no": protocol.source_request_no,
        "inspection_type_code": protocol.inspection_type_code,
        "inspection_type_name": protocol.inspection_type_name,
        "status": protocol.status,
        "revision_no": protocol.revision_no,
        "is_current": protocol.is_current,
        "is_readonly": not bool(protocol.is_current),
        "tests_count": len(protocol.tests),
        "created_at": protocol.created_at.isoformat() if protocol.created_at else None,
        "updated_at": protocol.updated_at.isoformat() if protocol.updated_at else None,
    }


def ensure_protocol_drafts_for_offer(offer_id: int) -> list[dict]:
    db = SessionLocal()
    try:
        offer = db.query(Offer).filter(Offer.id == offer_id).first()
        if not offer:
            raise ValueError("Teklif bulunamadı")
        if not bool(offer.is_current):
            raise ValueError("Eski teklif revizyonundan protokol oluşturulamaz")
        if offer.status == "CANCELLED":
            raise ValueError("İptal edilmiş tekliften protokol oluşturulamaz")
        created = False
        snapshot = _safe_json_load(offer.request_snapshot_json)
        request_id = snapshot.get("request_id")
        for section in offer.sections:
            existing = (
                db.query(Protocol)
                .filter(Protocol.offer_id == offer.id, Protocol.offer_section_id == section.id, Protocol.is_current == True)
                .order_by(Protocol.id.desc())
                .first()
            )
            if existing:
                continue
            protocol = Protocol(
                protocol_no=f"{offer.offer_no}-{section.section_no}",
                offer_id=offer.id,
                offer_section_id=section.id,
                request_id=request_id,
                customer_name=offer.customer_name,
                inspection_location_address=offer.inspection_location_address,
                source_request_no=offer.source_request_no,
                inspection_type_code=section.inspection_type_code,
                inspection_type_name=section.inspection_type_name,
                status="DRAFT",
                revision_no=0,
                is_current=True,
                offer_snapshot_json=json.dumps(
                    {
                        "offer_no": offer.offer_no,
                        "source_request_no": offer.source_request_no,
                        "inspection_location_address": offer.inspection_location_address,
                        "inspection_type_code": section.inspection_type_code,
                        "inspection_type_name": section.inspection_type_name,
                        **_safe_json_load(section.section_snapshot_json),
                    },
                    ensure_ascii=False,
                ),
            )
            db.add(protocol)
            db.flush()
            for test in section.tests:
                db.add(
                    ProtocolTest(
                        protocol_id=protocol.id,
                        test_code=test.test_code,
                        test_name=test.test_name,
                        is_required=bool(test.is_requested),
                        is_selected=bool(test.is_requested),
                        display_order=test.display_order,
                    )
                )
            created = True
        if created:
            db.commit()
        return list_protocol_drafts_for_offer(offer_id)
    finally:
        db.close()


def list_protocol_drafts_for_offer(offer_id: int) -> list[dict]:
    db = SessionLocal()
    try:
        offer = db.query(Offer).filter(Offer.id == offer_id).first()
        rows = (db.query(Protocol).filter(Protocol.offer_id == offer_id, Protocol.is_current == True).order_by(Protocol.protocol_no.asc(), Protocol.id.asc()).all())
        return [_serialize_protocol(row, offer.offer_no if offer else None) for row in rows]
    finally:
        db.close()


def list_protocols() -> list[dict]:
    db = SessionLocal()
    try:
        offer_map = {row.id: row.offer_no for row in db.query(Offer).all()}
        rows = (db.query(Protocol).filter(Protocol.is_current == True).order_by(Protocol.created_at.desc(), Protocol.id.desc()).all())
        return [_serialize_protocol(row, offer_map.get(row.offer_id)) for row in rows]
    finally:
        db.close()


def update_protocol_status(protocol_id: int, status: str) -> dict:
    db = SessionLocal()
    try:
        protocol = db.query(Protocol).filter(Protocol.id == protocol_id).first()
        if not protocol:
            raise ValueError("Protokol bulunamadı")
        if not bool(protocol.is_current):
            raise ValueError("Eski protokol revizyonları salt okunurdur")
        if status not in {"APPROVED", "CANCELLED"}:
            raise ValueError("Geçersiz protokol durumu")
        protocol.status = status
        db.commit()
        db.refresh(protocol)
        offer = db.query(Offer).filter(Offer.id == protocol.offer_id).first()
        return _serialize_protocol(protocol, offer.offer_no if offer else None)
    finally:
        db.close()


def get_protocol_detail(protocol_id: int) -> dict:
    db = SessionLocal()
    try:
        protocol = db.query(Protocol).filter(Protocol.id == protocol_id).first()
        if not protocol:
            raise ValueError("Protokol bulunamadı")
        snapshot = _safe_json_load(protocol.offer_snapshot_json)
        offer = db.query(Offer).filter(Offer.id == protocol.offer_id).first()
        return {
            **_serialize_protocol(protocol, offer.offer_no if offer else None),
            "is_readonly": not bool(protocol.is_current),
            "snapshot": snapshot,
            "tests": [
                {
                    "id": test.id,
                    "test_code": test.test_code,
                    "test_name": test.test_name,
                    "is_required": bool(test.is_required),
                    "is_selected": bool(test.is_selected),
                    "display_order": test.display_order,
                }
                for test in protocol.tests
            ],
        }
    finally:
        db.close()
