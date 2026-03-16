from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.modules.request.services import (
    add_request_line,
    approve_request,
    approve_request_revision,
    create_request,
    delete_request,
    get_request_detail,
    list_requests,
    reject_request,
    reject_request_revision,
    remove_request_line,
    save_all_request_evaluations,
    start_request_revision,
    submit_request,
    submit_request_revision,
    update_request_evaluation,
    update_request_header,
    update_request_line_payload,
    update_request_line_tests,
)

router = APIRouter(prefix='/requests')


class RequestCreatePayload(BaseModel):
    customer_id: int
    customer_branch_id: int | None = None
    customer_contact_id: int | None = None
    requested_inspection_date: str | None = None
    inspection_type_ids: list[int] = Field(default_factory=list)


class RequestHeaderUpdatePayload(BaseModel):
    requested_inspection_date: str | None = None
    revision_reason: str | None = None


class PayloadUpdatePayload(BaseModel):
    payload: dict


class TestsUpdatePayload(BaseModel):
    requested_test_ids: list[int] = Field(default_factory=list)


class EvaluationUpdatePayload(BaseModel):
    suitability_status: str
    unsuitable_reason: str | None = None
    evaluation_note: str | None = None


class BulkEvaluationItem(BaseModel):
    id: int
    suitability_status: str | None = None
    unsuitable_reason: str | None = None
    evaluation_note: str | None = None


class BulkEvaluationPayload(BaseModel):
    items: list[BulkEvaluationItem] = Field(default_factory=list)


class RevisionStartPayload(BaseModel):
    revision_reason: str


class RejectPayload(BaseModel):
    reason: str | None = None


class AddLinePayload(BaseModel):
    inspection_type_id: int


@router.get('')
def get_requests():
    return {'items': list_requests()}


@router.post('')
def post_request(payload: RequestCreatePayload):
    try:
        return create_request(payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.delete('/{request_id}')
def delete_request_endpoint(request_id: int):
    item = delete_request(request_id)
    if not item:
        raise HTTPException(status_code=404, detail='Talep bulunamadı')
    return item


@router.get('/{request_id}')
def get_request(request_id: int):
    item = get_request_detail(request_id)
    if not item:
        raise HTTPException(status_code=404, detail='Talep bulunamadı')
    return item


@router.put('/{request_id}/header')
def put_request_header(request_id: int, payload: RequestHeaderUpdatePayload):
    item = update_request_header(request_id, payload.model_dump())
    if not item:
        raise HTTPException(status_code=404, detail='Talep bulunamadı')
    return item


@router.post('/{request_id}/lines')
def post_request_line(request_id: int, payload: AddLinePayload):
    try:
        item = add_request_line(request_id, payload.inspection_type_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not item:
        raise HTTPException(status_code=404, detail='Talep bulunamadı')
    return item


@router.delete('/lines/{line_id}')
def delete_request_line(line_id: int):
    try:
        item = remove_request_line(line_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not item:
        raise HTTPException(status_code=404, detail='Talep satırı bulunamadı')
    return item


@router.put('/lines/{line_id}/payload')
def put_request_payload(line_id: int, payload: PayloadUpdatePayload):
    item = update_request_line_payload(line_id, payload.payload)
    if not item:
        raise HTTPException(status_code=404, detail='Talep satırı bulunamadı')
    return item


@router.put('/lines/{line_id}/tests')
def put_request_tests(line_id: int, payload: TestsUpdatePayload):
    item = update_request_line_tests(line_id, payload.requested_test_ids)
    if not item:
        raise HTTPException(status_code=404, detail='Talep satırı bulunamadı')
    return item


@router.put('/evaluations/{evaluation_id}')
def put_request_evaluation(evaluation_id: int, payload: EvaluationUpdatePayload):
    try:
        item = update_request_evaluation(evaluation_id, payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not item:
        raise HTTPException(status_code=404, detail='Değerlendirme kaydı bulunamadı')
    return item


@router.put('/{request_id}/lines/{line_id}/evaluations')
def put_request_evaluations(request_id: int, line_id: int, payload: BulkEvaluationPayload):
    try:
        item = save_all_request_evaluations(request_id, line_id, [x.model_dump() for x in payload.items])
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not item:
        raise HTTPException(status_code=404, detail='Talep bulunamadı')
    return item


@router.post('/{request_id}/submit')
def post_request_submit(request_id: int):
    try:
        item = submit_request(request_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not item:
        raise HTTPException(status_code=404, detail='Talep bulunamadı')
    return item


@router.post('/{request_id}/approve')
def post_request_approve(request_id: int):
    try:
        item = approve_request(request_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not item:
        raise HTTPException(status_code=404, detail='Talep bulunamadı')
    return item


@router.post('/{request_id}/reject')
def post_request_reject(request_id: int, payload: RejectPayload):
    try:
        item = reject_request(request_id, payload.reason)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not item:
        raise HTTPException(status_code=404, detail='Talep bulunamadı')
    return item


@router.post('/{request_id}/revision/start')
def post_request_revision_start(request_id: int, payload: RevisionStartPayload):
    try:
        item = start_request_revision(request_id, payload.revision_reason)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not item:
        raise HTTPException(status_code=404, detail='Talep bulunamadı')
    return item


@router.post('/{request_id}/revision/submit')
def post_request_revision_submit(request_id: int):
    try:
        item = submit_request_revision(request_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not item:
        raise HTTPException(status_code=404, detail='Talep bulunamadı')
    return item


@router.post('/{request_id}/revision/approve')
def post_request_revision_approve(request_id: int):
    try:
        item = approve_request_revision(request_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not item:
        raise HTTPException(status_code=404, detail='Talep bulunamadı')
    return item


@router.post('/{request_id}/revision/reject')
def post_request_revision_reject(request_id: int, payload: RejectPayload):
    try:
        item = reject_request_revision(request_id, payload.reason)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not item:
        raise HTTPException(status_code=404, detail='Talep bulunamadı')
    return item
