from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.modules.document.offer_renderer import generate_offer_docx, generate_offer_pdf
from app.modules.offer.services import approve_offer, archive_cancelled_offer, cancel_approved_offer, delete_approved_offer_file, get_approved_offer_file_path, get_offer_detail, get_offer_document_context, list_approved_offers, list_offer_revision_children, list_offers, update_offer_document_fields, update_offer_section_pricing, upload_approved_offer_file
from app.modules.protocol.services import ensure_protocol_drafts_for_offer, list_protocol_drafts_for_offer

router = APIRouter(prefix="/offers")


class OfferSectionPricingPayload(BaseModel):
    service_price: float = 0
    travel_price: float = 0
    report_price: float = 0
    estimated_days: int | None = None


class OfferDocumentPayload(BaseModel):
    currency: str = "EUR"
    vat_rate: float = 20
    extra_day_fee: float = 500
    authorized_person_name: str | None = "Mehmet ACAR"


@router.get("")
def get_offers():
    return {"items": list_offers()}


@router.get("/approved")
def get_approved_offers():
    return {"items": list_approved_offers()}


@router.get("/{offer_id}/revisions")
def get_offer_revisions(offer_id: int):
    try:
        return {"items": list_offer_revision_children(offer_id)}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{offer_id}")
def get_offer(offer_id: int):
    try:
        return get_offer_detail(offer_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/{offer_id}/document-context")
def get_offer_doc_context(offer_id: int):
    try:
        return get_offer_document_context(offer_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.put("/{offer_id}/sections/{section_id}/pricing")
def put_offer_section_pricing(offer_id: int, section_id: int, payload: OfferSectionPricingPayload):
    try:
        return update_offer_section_pricing(offer_id, section_id, payload.model_dump())
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "bulunamadı" in message.lower() else 400
        raise HTTPException(status_code=status_code, detail=message) from exc




@router.put("/{offer_id}/document-fields")
def put_offer_document_fields(offer_id: int, payload: OfferDocumentPayload):
    try:
        return update_offer_document_fields(offer_id, payload.model_dump())
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "bulunamadı" in message.lower() else 400
        raise HTTPException(status_code=status_code, detail=message) from exc


@router.get("/{offer_id}/protocol-drafts")
def get_offer_protocol_drafts(offer_id: int):
    return {"items": list_protocol_drafts_for_offer(offer_id)}


@router.post("/{offer_id}/protocol-drafts")
def post_offer_protocol_drafts(offer_id: int):
    try:
        return {"items": ensure_protocol_drafts_for_offer(offer_id)}
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "bulunamadı" in message.lower() else 400
        raise HTTPException(status_code=status_code, detail=message) from exc


@router.post("/{offer_id}/generate-docx")
def post_offer_generate_docx(offer_id: int):
    try:
        path = generate_offer_docx(offer_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return FileResponse(path=str(path), filename=path.name, media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document")


@router.post("/{offer_id}/generate-pdf")
def post_offer_generate_pdf(offer_id: int):
    try:
        path = generate_offer_pdf(offer_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return FileResponse(path=str(path), filename=path.name, media_type="application/pdf")


@router.post("/{offer_id}/approve")
def post_offer_approve(offer_id: int):
    try:
        return approve_offer(offer_id)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "bulunamadı" in message.lower() else 400
        raise HTTPException(status_code=status_code, detail=message) from exc


@router.post("/{offer_id}/cancel")
def post_offer_cancel(offer_id: int):
    try:
        return cancel_approved_offer(offer_id)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "bulunamadı" in message.lower() else 400
        raise HTTPException(status_code=status_code, detail=message) from exc


@router.post("/{offer_id}/approved-file")
def post_offer_approved_file(offer_id: int, file: UploadFile = File(...)):
    try:
        return upload_approved_offer_file(offer_id, file)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "bulunamadı" in message.lower() else 400
        raise HTTPException(status_code=status_code, detail=message) from exc




@router.get("/{offer_id}/approved-file")
def get_offer_approved_file(offer_id: int):
    try:
        path, filename = get_approved_offer_file_path(offer_id)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "bulunamadı" in message.lower() else 400
        raise HTTPException(status_code=status_code, detail=message) from exc
    suffix = path.suffix.lower()
    media_type = "application/pdf" if suffix == ".pdf" else None
    return FileResponse(path=str(path), filename=filename, media_type=media_type)


@router.delete("/{offer_id}/approved-file")
def delete_offer_approved_file(offer_id: int):
    try:
        return delete_approved_offer_file(offer_id)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "bulunamadı" in message.lower() else 400
        raise HTTPException(status_code=status_code, detail=message) from exc

@router.post("/{offer_id}/archive")
def post_offer_archive(offer_id: int):
    try:
        return archive_cancelled_offer(offer_id)
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "bulunamadı" in message.lower() else 400
        raise HTTPException(status_code=status_code, detail=message) from exc
