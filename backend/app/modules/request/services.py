import json
import re
from datetime import datetime

from app.core.database import SessionLocal
from app.modules.customer.models import Customer, CustomerBranch, CustomerContact
from app.modules.offer.models import Offer
from app.modules.offer.services import create_offer_draft_from_request_snapshot
from app.modules.operations.models import InspectionType, InspectionTypeTest
from app.modules.request.models import Request, RequestEvaluation, RequestInspectionLine, RequestInspectionPayload, RequestTestRequest

DEFAULT_PAYLOAD_TEMPLATES = {
    'CLEAN_ROOM': {'oda_bilgileri': '', 'filtre_tipi_ve_sayisi': '', 'alan_hacim_bilgileri': '', 'ahu_bilgileri': '', 'diger_talepler': '', 'ozel_notlar': ''},
    'HYGIENIC_AREA': {'oda_bilgileri': '', 'filtre_tipi_ve_sayisi': '', 'alan_hacim_bilgileri': '', 'ahu_bilgileri': '', 'diger_talepler': '', 'ozel_notlar': ''},
    'TEMPERATURE_HUMIDITY_MAPPING': {'cihaz_bilgileri': '', 'depo_alan_bilgileri': '', 'iklimlendirme_bilgileri': '', 'kayit_suresi': '', 'kayit_periyodu': '', 'diger_talepler': '', 'ozel_notlar': ''},
    'AUTOCLAVE': {'cihaz_bilgileri': '', 'otoklav_tipi': '', 'kullanim_amaci': '', 'muayene_standardi': '', 'diger_talepler': '', 'ozel_notlar': ''},
    'BSC': {'cihaz_bilgileri': '', 'muayene_standardi': '', 'hepa_filtre_tipi': '', 'kullanim_sikligi': '', 'biyoguvenlik_seviyesi': '', 'diger_talepler': '', 'ozel_notlar': ''},
    'EO': {'sterilizator_bilgileri': '', 'eo_gaz_karisimi': '', 'urun_bilgileri': '', 'sterilizator_diger_bilgiler': '', 'diger_talepler': '', 'ozel_notlar': ''},
    'DRY_HEAT': {'cihaz_bilgileri': '', 'sterilizator_tipi': '', 'kullanim_amaci': '', 'muayene_standardi': '', 'diger_talepler': '', 'ozel_notlar': ''},
    'FUME_HOOD': {'cihaz_bilgileri': '', 'cihaz_tipi': '', 'egzoz_bilgileri': '', 'uygunluk_kosullari': '', 'diger_talepler': '', 'ozel_notlar': ''},
    'BIOCONTAMINATION': {'oda_bilgileri': '', 'kullanim_durumu': '', 'temiz_oda_faaliyeti': '', 'diger_talepler': '', 'ozel_notlar': ''},
    'DUCT_LEAK': {'kanal_bilgileri': '', 'tasarlanmis_calisma_basinci': '', 'toplam_baglanti_uzunlugu': '', 'diger_talepler': '', 'ozel_notlar': ''},
}


def _request_no(db):
    prefix = f"R-{datetime.utcnow().strftime('%y%m')}"
    base_requests = (
        db.query(Request)
        .filter((Request.revision_no == 0) | (Request.parent_revision_id.is_(None)))
        .all()
    )
    next_no = len(base_requests) + 1
    candidate = f"{prefix}{next_no:03d}"
    while db.query(Request).filter(Request.request_no == candidate).first():
        next_no += 1
        candidate = f"{prefix}{next_no:03d}"
    return candidate


def _root_base_request_no(db, source: Request):
    root_id = source.root_id or source.id
    root_first = (
        db.query(Request)
        .filter(Request.root_id == root_id)
        .order_by(Request.revision_no.asc(), Request.id.asc())
        .first()
    )
    seed = (root_first.request_no if root_first else source.request_no) or ""
    return re.sub(r"-R\d+$", "", seed)


def _next_revision_request_no(db, source: Request):
    root_id = source.root_id or source.id
    last_revision = (
        db.query(Request)
        .filter(Request.root_id == root_id)
        .order_by(Request.revision_no.desc(), Request.id.desc())
        .first()
    )
    next_revision_no = (last_revision.revision_no if last_revision else 0) + 1
    base_no = _root_base_request_no(db, source)
    candidate = f"{base_no}-R{next_revision_no}"
    while db.query(Request).filter(Request.request_no == candidate).first():
        next_revision_no += 1
        candidate = f"{base_no}-R{next_revision_no}"
    return candidate, next_revision_no


def _payload_template(code: str):
    return DEFAULT_PAYLOAD_TEMPLATES.get(code or '', {'genel_bilgiler': '', 'diger_talepler': '', 'ozel_notlar': ''})


def _serialize_request(item: Request):
    return {
        'id': item.id,
        'request_no': item.request_no,
        'customer_id': item.customer_id,
        'customer_branch_id': item.customer_branch_id,
        'customer_contact_id': item.customer_contact_id,
        'customer_name': item.customer_name,
        'customer_trade_name': item.customer_trade_name,
        'inspection_location_address': item.inspection_location_address,
        'requested_inspection_date': item.requested_inspection_date,
        'contact_person_name': item.contact_person_name,
        'phone': item.phone,
        'email': item.email,
        'tax_office': item.tax_office,
        'tax_number': item.tax_number,
        'request_status': item.request_status,
        'evaluation_status': item.evaluation_status,
        'revision_no': item.revision_no,
        'revision_status': item.revision_status,
        'revision_reason': item.revision_reason,
        'created_at': item.created_at.isoformat() if item.created_at else None,
        'is_current': item.is_current,
        'inspection_types': [line.inspection_type_name_snapshot for line in sorted(item.lines, key=lambda x: (x.line_order, x.id))],
    }


def _serialize_revision_summary(item: Request):
    return {
        'id': item.id,
        'request_no': item.request_no,
        'revision_no': item.revision_no,
        'request_status': item.request_status,
        'evaluation_status': item.evaluation_status,
        'revision_status': item.revision_status,
        'is_current': item.is_current,
        'created_at': item.created_at.isoformat() if item.created_at else None,
    }


def _sync_evaluation_status(db, request_id: int):
    request = db.query(Request).filter(Request.id == request_id).first()
    if not request:
        return
    rows = db.query(RequestEvaluation).filter(RequestEvaluation.request_id == request_id).all()
    if not rows:
        request.evaluation_status = 'PENDING'
        return
    statuses = {row.suitability_status for row in rows}
    if 'NOT_SUITABLE' in statuses:
        request.evaluation_status = 'BLOCKED'
    elif statuses == {'SUITABLE'}:
        request.evaluation_status = 'COMPLETED'
    elif 'PENDING' in statuses:
        request.evaluation_status = 'IN_PROGRESS'
    else:
        request.evaluation_status = 'COMPLETED'


def _serialize_evaluations(db, request_id: int):
    rows = db.query(RequestEvaluation).filter(RequestEvaluation.request_id == request_id).order_by(RequestEvaluation.id.asc()).all()
    return [{
        'id': row.id,
        'request_inspection_line_id': row.request_inspection_line_id,
        'test_code': row.test_code,
        'test_name_snapshot': row.test_name_snapshot,
        'suitability_status': row.suitability_status,
        'unsuitable_reason': row.unsuitable_reason,
        'evaluation_note': row.evaluation_note,
        'evaluated_at': row.evaluated_at.isoformat() if row.evaluated_at else None,
    } for row in rows]


def _create_line_tree(db, request_id: int, definition: InspectionType, index: int):
    line = RequestInspectionLine(
        request_id=request_id,
        inspection_definition_id=definition.id,
        inspection_definition_version_id=1,
        inspection_type_id=definition.id,
        inspection_type_code=definition.code,
        inspection_type_name_snapshot=definition.name,
        line_order=index,
        schema_version='v1',
    )
    db.add(line)
    db.flush()
    db.add(RequestInspectionPayload(
        request_id=request_id,
        request_inspection_line_id=line.id,
        inspection_definition_id=definition.id,
        inspection_definition_version_id=1,
        inspection_type_code=definition.code,
        schema_version='v1',
        payload_json=json.dumps(_payload_template(definition.code), ensure_ascii=False),
    ))
    test_links = db.query(InspectionTypeTest).filter(
        InspectionTypeTest.inspection_type_id == definition.id,
        InspectionTypeTest.is_active == True,
    ).order_by(InspectionTypeTest.sort_order.asc(), InspectionTypeTest.id.asc()).all()
    for test_link in test_links:
        test = test_link.inspection_test
        if not test:
            continue
        db.add(RequestTestRequest(
            request_id=request_id,
            request_inspection_line_id=line.id,
            inspection_test_definition_id=test.id,
            inspection_test_id=test.id,
            test_code=test.code,
            test_name_snapshot=test_link.display_name_override or test.name,
            is_requested=bool(test_link.is_default_selected),
            display_order=test_link.sort_order,
        ))
    return line


def _create_evaluations_for_line(db, request_id: int, line_id: int):
    tests = db.query(RequestTestRequest).filter(
        RequestTestRequest.request_inspection_line_id == line_id
    ).order_by(RequestTestRequest.display_order.asc(), RequestTestRequest.id.asc()).all()
    for test in tests:
        db.add(RequestEvaluation(
            request_id=request_id,
            request_inspection_line_id=line_id,
            inspection_test_definition_id=test.inspection_test_definition_id,
            test_code=test.test_code,
            test_name_snapshot=test.test_name_snapshot,
            suitability_status='SUITABLE',
        ))


def _request_can_submit(request: Request):
    if not request.customer_id:
        return False, 'Müşteri seçimi zorunludur'
    if not request.lines:
        return False, 'En az bir muayene türü olmalıdır'
    return True, None


def _request_can_approve(request: Request):
    ok, reason = _request_can_submit(request)
    if not ok:
        return False, reason
    if request.evaluation_status not in {'COMPLETED', 'BLOCKED'}:
        return False, 'Talep onayı için değerlendirme tamamlanmalıdır'
    return True, None


def _serialize_offer_bridge(db, request: Request):
    ready, reason = _request_can_approve(request)
    offers = db.query(Offer).filter(
        Offer.source_request_root_id == (request.root_id or request.id)
    ).order_by(Offer.revision_no.desc(), Offer.id.desc()).all()
    serialized_offers = [{
        'id': item.id,
        'offer_no': item.offer_no,
        'status': item.status,
        'revision_no': item.revision_no,
        'revision_status': item.revision_status,
        'is_current': item.is_current,
    } for item in offers]
    current_offer = next((row for row in serialized_offers if row['is_current']), serialized_offers[0] if serialized_offers else None)
    return {
        'is_ready': bool(request.request_status == 'APPROVED' and request.is_current and ready),
        'can_prepare': bool(ready),
        'status': 'CREATED' if current_offer else ('READY' if request.request_status == 'APPROVED' and request.is_current and ready else 'WAITING'),
        'message': 'Teklif taslağı oluşturuldu' if current_offer else ('Teklif taslağı üretimine hazır' if request.request_status == 'APPROVED' and request.is_current and ready else (reason or 'Talep onayı sonrası teklif taslağı hazırlığı aktif olacaktır')),
        'current_offer': current_offer,
        'offers': serialized_offers,
    }


def _build_request_snapshot(db, request: Request):
    lines = db.query(RequestInspectionLine).filter(RequestInspectionLine.request_id == request.id).order_by(RequestInspectionLine.line_order.asc(), RequestInspectionLine.id.asc()).all()
    payload_map = {
        row.request_inspection_line_id: json.loads(row.payload_json or '{}')
        for row in db.query(RequestInspectionPayload).filter(RequestInspectionPayload.request_id == request.id).all()
    }
    test_map = {}
    for row in db.query(RequestTestRequest).filter(RequestTestRequest.request_id == request.id).order_by(RequestTestRequest.display_order.asc(), RequestTestRequest.id.asc()).all():
        test_map.setdefault(row.request_inspection_line_id, []).append({
            'test_code': row.test_code,
            'test_name': row.test_name_snapshot,
            'is_requested': row.is_requested,
        })
    return {
        'request_id': request.id,
        'request_no': request.request_no,
        'request_root_id': request.root_id or request.id,
        'request_revision_no': request.revision_no,
        'customer_name': request.customer_name,
        'customer_trade_name': request.customer_trade_name,
        'inspection_location_address': request.inspection_location_address,
        'requested_inspection_date': request.requested_inspection_date,
        'contact_person_name': request.contact_person_name,
        'phone': request.phone,
        'email': request.email,
        'tax_office': request.tax_office,
        'tax_number': request.tax_number,
        'lines': [{
            'inspection_type_code': line.inspection_type_code,
            'inspection_type_name': line.inspection_type_name_snapshot,
            'payload': payload_map.get(line.id, {}),
            'tests': test_map.get(line.id, []),
        } for line in lines],
    }


def _ensure_offer_draft_for_request(db, request: Request, revision_reason: str | None = None):
    snapshot = _build_request_snapshot(db, request)
    return create_offer_draft_from_request_snapshot(
        source_request_root_id=request.root_id or request.id,
        source_request_revision_id=request.id,
        source_request_no=request.request_no,
        customer_name=request.customer_name,
        inspection_location_address=request.inspection_location_address,
        requested_inspection_date=request.requested_inspection_date,
        request_snapshot=snapshot,
        revision_reason=revision_reason,
    )


def _serialize_customer_ref(db, request: Request):
    if not request.customer_id:
        return None
    customer = db.query(Customer).filter(Customer.id == request.customer_id).first()
    branch = db.query(CustomerBranch).filter(CustomerBranch.id == request.customer_branch_id).first() if request.customer_branch_id else None
    contact = db.query(CustomerContact).filter(CustomerContact.id == request.customer_contact_id).first() if request.customer_contact_id else None
    return {
        'customer_id': request.customer_id,
        'branch_id': request.customer_branch_id,
        'contact_id': request.customer_contact_id,
        'customer_name': customer.customer_name if customer else request.customer_name,
        'trade_name': customer.trade_name if customer else request.customer_trade_name,
        'tax_office': customer.tax_office if customer else request.tax_office,
        'tax_number': customer.tax_number if customer else request.tax_number,
        'branch_name': branch.branch_name if branch else None,
        'address': branch.address if branch else request.inspection_location_address,
        'contact_name': contact.full_name if contact else request.contact_person_name,
        'phone': contact.phone if contact else request.phone,
        'email': contact.email if contact else request.email,
    }


def list_requests():
    db = SessionLocal()
    try:
        items = (
            db.query(Request)
            .order_by(Request.created_at.desc(), Request.id.desc())
            .all()
        )
        grouped: dict[int, list[Request]] = {}
        for item in items:
            grouped.setdefault(item.root_id or item.id, []).append(item)

        preferred: list[Request] = []
        for rows in grouped.values():
            rows = sorted(rows, key=lambda row: (row.created_at or datetime.min, row.id), reverse=True)
            draft = next((row for row in rows if row.revision_status in {'DRAFT', 'PENDING_APPROVAL'}), None)
            current = next((row for row in rows if row.is_current), None)
            preferred.append(draft or current or rows[0])

        preferred.sort(key=lambda row: (row.created_at or datetime.min, row.id), reverse=True)
        return [_serialize_request(item) for item in preferred]
    finally:
        db.close()


def delete_request(request_id: int):
    db = SessionLocal()
    try:
        item = db.query(Request).filter(Request.id == request_id).first()
        if not item:
            return None
        db.delete(item)
        db.commit()
        return {'ok': True, 'id': request_id}
    finally:
        db.close()


def create_request(data: dict):
    db = SessionLocal()
    try:
        customer_id = data.get('customer_id')
        branch_id = data.get('customer_branch_id')
        contact_id = data.get('customer_contact_id')
        selected_ids = data.get('inspection_type_ids') or []
        if not customer_id:
            raise ValueError('Önce müşteri seçmelisin')
        if not selected_ids:
            raise ValueError('En az 1 muayene türü seçmelisin')
        customer = db.query(Customer).filter(Customer.id == customer_id, Customer.is_active == True).first()
        if not customer:
            raise ValueError('Müşteri bulunamadı')
        branch = db.query(CustomerBranch).filter(CustomerBranch.id == branch_id, CustomerBranch.customer_id == customer.id).first() if branch_id else db.query(CustomerBranch).filter(CustomerBranch.customer_id == customer.id, CustomerBranch.is_default == True).first()
        contact = db.query(CustomerContact).filter(CustomerContact.id == contact_id, CustomerContact.customer_id == customer.id).first() if contact_id else db.query(CustomerContact).filter(CustomerContact.customer_id == customer.id, CustomerContact.is_default == True).first()
        request = Request(
            request_no=_request_no(db),
            customer_id=customer.id,
            customer_branch_id=branch.id if branch else None,
            customer_contact_id=contact.id if contact else None,
            customer_name=customer.customer_name,
            customer_trade_name=customer.trade_name,
            customer_address=branch.address if branch else None,
            inspection_location_address=branch.address if branch else None,
            contact_person_name=contact.full_name if contact else None,
            contact_person_title=contact.title if contact else None,
            phone=contact.phone if contact else None,
            email=contact.email if contact else None,
            invoice_name=customer.trade_name,
            tax_office=customer.tax_office,
            tax_number=customer.tax_number,
            requested_inspection_date=data.get('requested_inspection_date') or None,
            request_status='DRAFT',
            evaluation_status='PENDING',
            revision_no=0,
            revision_status='APPROVED',
            is_current=True,
        )
        db.add(request)
        db.flush()
        request.root_id = request.id

        definitions = db.query(InspectionType).filter(
            InspectionType.id.in_(selected_ids),
            InspectionType.is_active == True
        ).order_by(InspectionType.sort_order.asc(), InspectionType.id.asc()).all()
        if not definitions:
            raise ValueError('Geçerli muayene türü bulunamadı')
        for index, definition in enumerate(definitions, start=1):
            line = _create_line_tree(db, request.id, definition, index)
            _create_evaluations_for_line(db, request.id, line.id)
        _sync_evaluation_status(db, request.id)
        db.commit()
        return get_request_detail(request.id)
    finally:
        db.close()


def get_request_detail(request_id: int):
    db = SessionLocal()
    try:
        request = db.query(Request).filter(Request.id == request_id).first()
        if not request:
            return None
        lines = db.query(RequestInspectionLine).filter(RequestInspectionLine.request_id == request.id).order_by(RequestInspectionLine.line_order.asc(), RequestInspectionLine.id.asc()).all()
        serialized_lines = []
        for line in lines:
            payload_row = db.query(RequestInspectionPayload).filter(RequestInspectionPayload.request_inspection_line_id == line.id).first()
            tests = db.query(RequestTestRequest).filter(RequestTestRequest.request_inspection_line_id == line.id).order_by(RequestTestRequest.display_order.asc(), RequestTestRequest.id.asc()).all()
            serialized_lines.append({
                'id': line.id,
                'inspection_definition_id': line.inspection_definition_id,
                'inspection_definition_version_id': line.inspection_definition_version_id,
                'inspection_type_code': line.inspection_type_code,
                'inspection_type_name_snapshot': line.inspection_type_name_snapshot,
                'schema_version': line.schema_version,
                'payload': json.loads(payload_row.payload_json or '{}') if payload_row else {},
                'tests': [{
                    'id': test.id,
                    'inspection_test_definition_id': test.inspection_test_definition_id,
                    'test_code': test.test_code,
                    'test_name_snapshot': test.test_name_snapshot,
                    'is_requested': test.is_requested,
                    'display_order': test.display_order,
                } for test in tests],
            })
        revisions = (
            db.query(Request)
            .filter(Request.root_id == (request.root_id or request.id))
            .order_by(Request.revision_no.desc(), Request.id.desc())
            .all()
        )
        return {
            'request': _serialize_request(request),
            'customer_ref': _serialize_customer_ref(db, request),
            'lines': serialized_lines,
            'evaluations': _serialize_evaluations(db, request.id),
            'offer_bridge': _serialize_offer_bridge(db, request),
            'revisions': [_serialize_revision_summary(row) for row in revisions],
        }
    finally:
        db.close()


def update_request_header(request_id: int, data: dict):
    db = SessionLocal()
    try:
        request = db.query(Request).filter(Request.id == request_id).first()
        if not request:
            return None
        if data.get('requested_inspection_date') is not None:
            request.requested_inspection_date = data.get('requested_inspection_date')
        if data.get('revision_reason') is not None:
            request.revision_reason = (data.get('revision_reason') or '').strip() or None
        request.updated_at = datetime.utcnow()
        db.commit()
        return get_request_detail(request.id)
    finally:
        db.close()


def add_request_line(request_id: int, inspection_type_id: int):
    db = SessionLocal()
    try:
        request = db.query(Request).filter(Request.id == request_id).first()
        if not request:
            return None
        if request.is_current and request.revision_status != 'DRAFT':
            raise ValueError('Aktif kayıtta muayene türü değişikliği için önce revizyon başlat')
        exists = db.query(RequestInspectionLine).filter(RequestInspectionLine.request_id == request.id, RequestInspectionLine.inspection_definition_id == inspection_type_id).first()
        if exists:
            raise ValueError('Bu muayene türü zaten ekli')
        definition = db.query(InspectionType).filter(InspectionType.id == inspection_type_id, InspectionType.is_active == True).first()
        if not definition:
            raise ValueError('Muayene türü bulunamadı')
        order = (db.query(RequestInspectionLine).filter(RequestInspectionLine.request_id == request.id).count() or 0) + 1
        line = _create_line_tree(db, request.id, definition, order)
        _create_evaluations_for_line(db, request.id, line.id)
        _sync_evaluation_status(db, request.id)
        db.commit()
        return get_request_detail(request.id)
    finally:
        db.close()


def remove_request_line(line_id: int):
    db = SessionLocal()
    try:
        line = db.query(RequestInspectionLine).filter(RequestInspectionLine.id == line_id).first()
        if not line:
            return None
        request = db.query(Request).filter(Request.id == line.request_id).first()
        if request.is_current and request.revision_status != 'DRAFT':
            raise ValueError('Aktif kayıtta muayene türü değişikliği için önce revizyon başlat')
        db.query(RequestEvaluation).filter(RequestEvaluation.request_inspection_line_id == line.id).delete()
        db.query(RequestInspectionPayload).filter(RequestInspectionPayload.request_inspection_line_id == line.id).delete()
        db.query(RequestTestRequest).filter(RequestTestRequest.request_inspection_line_id == line.id).delete()
        db.delete(line)
        remaining = db.query(RequestInspectionLine).filter(RequestInspectionLine.request_id == request.id).order_by(RequestInspectionLine.line_order.asc(), RequestInspectionLine.id.asc()).all()
        for idx, row in enumerate(remaining, start=1):
            row.line_order = idx
        _sync_evaluation_status(db, request.id)
        db.commit()
        return get_request_detail(request.id)
    finally:
        db.close()


def update_request_line_payload(line_id: int, payload: dict):
    db = SessionLocal()
    try:
        line = db.query(RequestInspectionLine).filter(RequestInspectionLine.id == line_id).first()
        if not line:
            return None
        payload_row = db.query(RequestInspectionPayload).filter(RequestInspectionPayload.request_inspection_line_id == line.id).first()
        if not payload_row:
            payload_row = RequestInspectionPayload(
                request_id=line.request_id,
                request_inspection_line_id=line.id,
                inspection_definition_id=line.inspection_definition_id,
                inspection_definition_version_id=line.inspection_definition_version_id,
                inspection_type_code=line.inspection_type_code,
                schema_version=line.schema_version,
                payload_json='{}',
            )
            db.add(payload_row)
        payload_row.payload_json = json.dumps(payload or {}, ensure_ascii=False)
        payload_row.updated_at = datetime.utcnow()
        line.updated_at = datetime.utcnow()
        db.commit()
        return get_request_detail(line.request_id)
    finally:
        db.close()


def update_request_line_tests(line_id: int, requested_test_ids: list[int]):
    db = SessionLocal()
    try:
        line = db.query(RequestInspectionLine).filter(RequestInspectionLine.id == line_id).first()
        if not line:
            return None
        tests = db.query(RequestTestRequest).filter(RequestTestRequest.request_inspection_line_id == line.id).all()
        requested = set(requested_test_ids or [])
        for test in tests:
            test.is_requested = test.id in requested
            test.updated_at = datetime.utcnow()
        db.query(RequestEvaluation).filter(RequestEvaluation.request_inspection_line_id == line.id).delete()
        _create_evaluations_for_line(db, line.request_id, line.id)
        _sync_evaluation_status(db, line.request_id)
        db.commit()
        return get_request_detail(line.request_id)
    finally:
        db.close()


def update_request_evaluation(evaluation_id: int, data: dict):
    db = SessionLocal()
    try:
        row = db.query(RequestEvaluation).filter(RequestEvaluation.id == evaluation_id).first()
        if not row:
            return None
        status = (data.get('suitability_status') or 'SUITABLE').strip() or 'SUITABLE'
        if status == 'NOT_SUITABLE' and not (data.get('unsuitable_reason') or '').strip():
            raise ValueError('Uygun değil seçildiğinde gerekçe zorunludur')
        row.suitability_status = status
        row.unsuitable_reason = (data.get('unsuitable_reason') or '').strip() or None
        row.evaluation_note = (data.get('evaluation_note') or '').strip() or None
        row.evaluated_at = datetime.utcnow()
        row.updated_at = datetime.utcnow()
        _sync_evaluation_status(db, row.request_id)
        db.commit()
        return get_request_detail(row.request_id)
    finally:
        db.close()


def save_all_request_evaluations(request_id: int, line_id: int, items: list[dict]):
    db = SessionLocal()
    try:
        request = db.query(Request).filter(Request.id == request_id).first()
        if not request:
            return None
        rows = db.query(RequestEvaluation).filter(RequestEvaluation.request_inspection_line_id == line_id).all()
        row_map = {row.id: row for row in rows}
        for item in items:
            row = row_map.get(item.get('id'))
            if not row:
                continue
            status = (item.get('suitability_status') or 'SUITABLE').strip() or 'SUITABLE'
            if status == 'NOT_SUITABLE' and not (item.get('unsuitable_reason') or '').strip():
                raise ValueError(f"{row.test_name_snapshot} için uygun değil gerekçesi zorunludur")
            row.suitability_status = status
            row.unsuitable_reason = (item.get('unsuitable_reason') or '').strip() or None
            row.evaluation_note = (item.get('evaluation_note') or '').strip() or None
            row.evaluated_at = datetime.utcnow()
            row.updated_at = datetime.utcnow()
        _sync_evaluation_status(db, request_id)
        db.commit()
        return get_request_detail(request_id)
    finally:
        db.close()


def start_request_revision(request_id: int, revision_reason: str):
    db = SessionLocal()
    try:
        source = db.query(Request).filter(Request.id == request_id).first()
        if not source:
            return None
        if not source.is_current:
            raise ValueError('Revizyon sadece son onaylı revizyon üzerinden başlatılabilir')
        if source.request_status != 'APPROVED' or source.revision_status != 'APPROVED':
            raise ValueError('Revizyon başlatmak için güncel talep onaylı olmalıdır')
        reason = (revision_reason or '').strip()
        if not reason:
            raise ValueError('Revizyon nedeni zorunludur')
        root_id = source.root_id or source.id
        existing = db.query(Request).filter(Request.root_id == root_id, Request.revision_status == 'DRAFT').order_by(Request.id.desc()).first()
        if existing:
            return get_request_detail(existing.id)
        new_request_no, next_revision_no = _next_revision_request_no(db, source)
        clone = Request(
            request_no=new_request_no,
            customer_id=source.customer_id,
            customer_branch_id=source.customer_branch_id,
            customer_contact_id=source.customer_contact_id,
            customer_name=source.customer_name,
            customer_trade_name=source.customer_trade_name,
            customer_address=source.customer_address,
            inspection_location_address=source.inspection_location_address,
            contact_person_name=source.contact_person_name,
            contact_person_title=source.contact_person_title,
            phone=source.phone,
            email=source.email,
            invoice_name=source.invoice_name,
            tax_office=source.tax_office,
            tax_number=source.tax_number,
            requested_inspection_date=source.requested_inspection_date,
            request_status='DRAFT',
            evaluation_status='PENDING',
            root_id=root_id,
            revision_no=next_revision_no,
            revision_status='DRAFT',
            is_current=False,
            revision_reason=reason,
            parent_revision_id=source.id,
        )
        db.add(clone)
        db.flush()
        source_lines = db.query(RequestInspectionLine).filter(RequestInspectionLine.request_id == source.id).order_by(RequestInspectionLine.line_order.asc()).all()
        for line in source_lines:
            new_line = RequestInspectionLine(
                request_id=clone.id,
                inspection_definition_id=line.inspection_definition_id,
                inspection_definition_version_id=line.inspection_definition_version_id,
                inspection_type_id=line.inspection_type_id,
                inspection_type_code=line.inspection_type_code,
                inspection_type_name_snapshot=line.inspection_type_name_snapshot,
                line_order=line.line_order,
                is_selected=line.is_selected,
                requested_scope_note=line.requested_scope_note,
                schema_version=line.schema_version,
            )
            db.add(new_line)
            db.flush()
            payload_row = db.query(RequestInspectionPayload).filter(RequestInspectionPayload.request_inspection_line_id == line.id).first()
            db.add(RequestInspectionPayload(
                request_id=clone.id,
                request_inspection_line_id=new_line.id,
                inspection_definition_id=new_line.inspection_definition_id,
                inspection_definition_version_id=new_line.inspection_definition_version_id,
                inspection_type_code=new_line.inspection_type_code,
                schema_version=new_line.schema_version,
                payload_json=payload_row.payload_json if payload_row else '{}',
            ))
            tests = db.query(RequestTestRequest).filter(RequestTestRequest.request_inspection_line_id == line.id).all()
            for test in tests:
                db.add(RequestTestRequest(
                    request_id=clone.id,
                    request_inspection_line_id=new_line.id,
                    inspection_test_definition_id=test.inspection_test_definition_id,
                    inspection_test_id=test.inspection_test_id,
                    test_code=test.test_code,
                    test_name_snapshot=test.test_name_snapshot,
                    is_requested=test.is_requested,
                    display_order=test.display_order,
                ))
            _create_evaluations_for_line(db, clone.id, new_line.id)
        _sync_evaluation_status(db, clone.id)
        db.commit()
        return get_request_detail(clone.id)
    finally:
        db.close()


def submit_request_revision(request_id: int):
    db = SessionLocal()
    try:
        request = db.query(Request).filter(Request.id == request_id).first()
        if not request:
            return None
        if request.is_current:
            raise ValueError('Aktif kayıt için revizyon gönderimi yerine normal inceleme akışını kullan')
        if request.revision_status != 'DRAFT':
            raise ValueError('Sadece taslak revizyonlar onaya gönderilebilir')
        ok, message = _request_can_submit(request)
        if not ok:
            raise ValueError(message or 'Revizyon gönderilemedi')
        request.revision_status = 'PENDING_APPROVAL'
        request.request_status = 'UNDER_REVIEW'
        request.updated_at = datetime.utcnow()
        db.commit()
        return get_request_detail(request.id)
    finally:
        db.close()


def approve_request_revision(request_id: int):
    db = SessionLocal()
    try:
        request = db.query(Request).filter(Request.id == request_id).first()
        if not request:
            return None
        if request.is_current:
            raise ValueError('Aktif kayıt için revizyon onayı yerine normal onay akışını kullan')
        if request.revision_status != 'PENDING_APPROVAL':
            raise ValueError('Sadece onay bekleyen revizyonlar onaylanabilir')
        ok, message = _request_can_approve(request)
        if not ok:
            raise ValueError(message or 'Revizyon onaylanamadı')
        current = db.query(Request).filter(Request.root_id == request.root_id, Request.is_current == True, Request.id != request.id).order_by(Request.id.desc()).first()
        now = datetime.utcnow()
        if current:
            current.is_current = False
            current.revision_status = 'SUPERSEDED'
            current.superseded_at = now
            current.updated_at = now
        request.is_current = True
        request.revision_status = 'APPROVED'
        request.request_status = 'APPROVED'
        request.approved_at = now
        request.updated_at = now
        db.commit()
        _ensure_offer_draft_for_request(db, request, request.revision_reason)
        return get_request_detail(request.id)
    finally:
        db.close()


def reject_request_revision(request_id: int, reason: str | None = None):
    db = SessionLocal()
    try:
        request = db.query(Request).filter(Request.id == request_id).first()
        if not request:
            return None
        if request.is_current:
            raise ValueError('Aktif kayıt için revizyon reddi yerine normal red akışını kullan')
        if request.revision_status not in {'DRAFT', 'PENDING_APPROVAL'}:
            raise ValueError('Bu revizyon durumu reddedilemez')
        request.revision_status = 'REJECTED'
        request.request_status = 'REJECTED'
        if reason and reason.strip():
            request.revision_reason = reason.strip()
        request.updated_at = datetime.utcnow()
        db.commit()
        return get_request_detail(request.id)
    finally:
        db.close()


def submit_request(request_id: int):
    db = SessionLocal()
    try:
        request = db.query(Request).filter(Request.id == request_id).first()
        if not request:
            return None
        if request.request_status not in {'DRAFT', 'REJECTED'}:
            raise ValueError('Sadece taslak veya reddedilmiş talepler gönderilebilir')
        ok, message = _request_can_submit(request)
        if not ok:
            raise ValueError(message or 'Talep gönderilemedi')
        request.request_status = 'UNDER_REVIEW'
        request.updated_at = datetime.utcnow()
        db.commit()
        return get_request_detail(request.id)
    finally:
        db.close()


def approve_request(request_id: int):
    db = SessionLocal()
    try:
        request = db.query(Request).filter(Request.id == request_id).first()
        if not request:
            return None
        if request.request_status not in {'SUBMITTED', 'UNDER_REVIEW'}:
            raise ValueError('Sadece gönderilmiş veya incelemedeki talepler onaylanabilir')
        ok, message = _request_can_approve(request)
        if not ok:
            raise ValueError(message or 'Talep onaylanamadı')
        request.request_status = 'APPROVED'
        request.updated_at = datetime.utcnow()
        db.commit()
        _ensure_offer_draft_for_request(db, request, request.revision_reason)
        return get_request_detail(request.id)
    finally:
        db.close()


def reject_request(request_id: int, reason: str | None = None):
    db = SessionLocal()
    try:
        request = db.query(Request).filter(Request.id == request_id).first()
        if not request:
            return None
        if request.request_status not in {'SUBMITTED', 'UNDER_REVIEW', 'APPROVED'}:
            raise ValueError('Bu durumdaki talep reddedilemez')
        request.request_status = 'REJECTED'
        if reason and reason.strip():
            request.revision_reason = reason.strip()
        request.updated_at = datetime.utcnow()
        db.commit()
        return get_request_detail(request.id)
    finally:
        db.close()
