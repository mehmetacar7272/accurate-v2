from datetime import datetime
from typing import Optional

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.modules.quality.services import (
    create_and_publish_revision,
    create_document,
    create_document_category,
    create_document_revision,
    get_document_detail,
    get_quality_overview,
    import_lt03_file,
    import_lt03_upload,
    list_document_categories,
    list_document_revisions,
    list_documents,
    list_notification_logs,
    publish_document_revision,
    publish_revision_from_row,
    save_document_row,
    update_document,
)

router = APIRouter(prefix="/quality", tags=["quality"])


class DocumentCategoryCreateRequest(BaseModel):
    code: str
    name: str
    sort_order: int = 0


class QualityDocumentCreateRequest(BaseModel):
    category_id: int
    document_no: str
    document_name: str
    document_type: Optional[str] = None
    department: Optional[str] = None
    first_publish_date: Optional[datetime] = None


class QualityDocumentUpdateRequest(BaseModel):
    category_id: int
    document_name: str
    document_type: Optional[str] = None
    department: Optional[str] = None
    first_publish_date: Optional[datetime] = None
    is_active: bool = True


class DocumentRowSaveRequest(BaseModel):
    category_id: int
    document_no: str
    document_name: str
    first_publish_date: Optional[datetime] = None
    revision_no: str = "0"
    revision_date: Optional[datetime] = None
    last_review_date: Optional[datetime] = None
    distribution_text: str = ""
    change_summary: str = ""
    notes: str = ""
    is_active: bool = True


class RevisionPublishFromRowRequest(DocumentRowSaveRequest):
    software_explanation: str
    published_by: str = "system"


class DocumentRevisionCreateRequest(BaseModel):
    revision_no: str
    revision_date: Optional[datetime] = None
    effective_date: Optional[datetime] = None
    last_review_date: Optional[datetime] = None
    change_summary: str = ""
    notes: str = ""
    distribution_text: str = ""
    file_path: Optional[str] = None


class RevisionPublishCreateRequest(BaseModel):
    revision_no: str
    revision_date: Optional[datetime] = None
    effective_date: Optional[datetime] = None
    last_review_date: Optional[datetime] = None
    software_explanation: str
    notes: str = ""
    distribution_text: str = ""
    file_path: Optional[str] = None
    published_by: str = "system"


class PublishRevisionRequest(BaseModel):
    published_by: str = "system"


class ImportLT03Request(BaseModel):
    file_path: str


def serialize_category(item):
    return {
        "id": item.id,
        "code": item.code,
        "name": item.name,
        "sort_order": item.sort_order,
        "is_active": item.is_active,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def serialize_document(item):
    return {
        "id": item.id,
        "category_id": item.category_id,
        "category": serialize_category(item.category) if getattr(item, "category", None) else None,
        "document_no": item.document_no,
        "document_name": item.document_name,
        "document_type": item.document_type,
        "department": item.department,
        "first_publish_date": item.first_publish_date.isoformat() if item.first_publish_date else None,
        "is_active": item.is_active,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def serialize_revision(item):
    return {
        "id": item.id,
        "document_id": item.document_id,
        "revision_no": item.revision_no,
        "revision_date": item.revision_date.isoformat() if item.revision_date else None,
        "effective_date": item.effective_date.isoformat() if item.effective_date else None,
        "last_review_date": item.last_review_date.isoformat() if item.last_review_date else None,
        "change_summary": item.change_summary,
        "notes": item.notes,
        "distribution_text": item.distribution_text,
        "file_path": item.file_path,
        "status": item.status,
        "published_by": item.published_by,
        "published_at": item.published_at.isoformat() if item.published_at else None,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def serialize_notification_log(item):
    return {
        "id": item.id,
        "document_revision_id": item.document_revision_id,
        "recipient_email": item.recipient_email,
        "recipient_name": item.recipient_name,
        "delivery_channel": item.delivery_channel,
        "delivery_status": item.delivery_status,
        "sent_at": item.sent_at.isoformat() if item.sent_at else None,
        "error_message": item.error_message,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }


@router.get("/overview")
def get_overview(search: str = "", active_only: bool = False, category_id: Optional[int] = None):
    return get_quality_overview(search=search, active_only=active_only, category_id=category_id)


@router.get("/document-categories")
def get_document_categories(active_only: bool = False):
    items = list_document_categories(active_only=active_only)
    return [serialize_category(item) for item in items]


@router.post("/document-categories")
def post_document_category(payload: DocumentCategoryCreateRequest):
    item = create_document_category(code=payload.code, name=payload.name, sort_order=payload.sort_order)
    return serialize_category(item)


@router.get("/documents")
def get_documents(category_id: Optional[int] = None, active_only: bool = False):
    items = list_documents(category_id=category_id, active_only=active_only)
    return [serialize_document(item) for item in items]


@router.get("/documents/{document_id}/detail")
def get_document_detail_endpoint(document_id: int):
    payload = get_document_detail(document_id)
    if not payload:
        raise HTTPException(status_code=404, detail="Document not found")
    return payload


@router.post("/documents")
def post_document(payload: QualityDocumentCreateRequest):
    item = create_document(
        category_id=payload.category_id,
        document_no=payload.document_no,
        document_name=payload.document_name,
        document_type=payload.document_type,
        department=payload.department,
        first_publish_date=payload.first_publish_date,
    )
    return serialize_document(item)


@router.post("/documents/row")
def post_document_row(payload: DocumentRowSaveRequest):
    try:
        item = save_document_row(document_id=None, **payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return get_document_detail(item.id)


@router.put("/documents/{document_id}/row")
def put_document_row(document_id: int, payload: DocumentRowSaveRequest):
    try:
        item = save_document_row(document_id=document_id, **payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not item:
        raise HTTPException(status_code=404, detail="Document not found")
    return get_document_detail(item.id)


@router.post("/documents/{document_id}/publish-row-revision")
def post_publish_row_revision(document_id: int, payload: RevisionPublishFromRowRequest):
    try:
        item = publish_revision_from_row(document_id=document_id, **payload.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not item:
        raise HTTPException(status_code=404, detail="Document not found")
    return item


@router.put("/documents/{document_id}")
def put_document(document_id: int, payload: QualityDocumentUpdateRequest):
    item = update_document(
        document_id=document_id,
        category_id=payload.category_id,
        document_name=payload.document_name,
        document_type=payload.document_type,
        department=payload.department,
        first_publish_date=payload.first_publish_date,
        is_active=payload.is_active,
    )
    if not item:
        raise HTTPException(status_code=404, detail="Document not found")
    return serialize_document(item)


@router.get("/documents/{document_id}/revisions")
def get_document_revisions(document_id: int):
    items = list_document_revisions(document_id=document_id)
    return [serialize_revision(item) for item in items]


@router.post("/documents/{document_id}/revisions")
def post_document_revision(document_id: int, payload: DocumentRevisionCreateRequest):
    item = create_document_revision(
        document_id=document_id,
        revision_no=payload.revision_no,
        revision_date=payload.revision_date,
        effective_date=payload.effective_date,
        last_review_date=payload.last_review_date,
        change_summary=payload.change_summary,
        notes=payload.notes,
        distribution_text=payload.distribution_text,
        file_path=payload.file_path,
    )
    return item


@router.post("/documents/{document_id}/revisions/publish-new")
def post_create_and_publish_revision(document_id: int, payload: RevisionPublishCreateRequest):
    try:
        item = create_and_publish_revision(
            document_id=document_id,
            revision_no=payload.revision_no,
            revision_date=payload.revision_date,
            effective_date=payload.effective_date,
            last_review_date=payload.last_review_date,
            software_explanation=payload.software_explanation,
            notes=payload.notes,
            distribution_text=payload.distribution_text,
            file_path=payload.file_path,
            published_by=payload.published_by,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not item:
        raise HTTPException(status_code=404, detail="Document not found")
    return item


@router.post("/revisions/{revision_id}/publish")
def post_publish_revision(revision_id: int, payload: PublishRevisionRequest):
    item = publish_document_revision(revision_id=revision_id, published_by=payload.published_by)
    if not item:
        raise HTTPException(status_code=404, detail="Revision not found")
    return item


@router.get("/revisions/{revision_id}/notification-logs")
def get_revision_notification_logs(revision_id: int):
    items = list_notification_logs(document_revision_id=revision_id)
    return [serialize_notification_log(item) for item in items]


@router.post("/import-lt03")
def post_import_lt03(payload: ImportLT03Request):
    return import_lt03_file(payload.file_path)


@router.post("/import-lt03-upload")
async def post_import_lt03_upload(file: UploadFile = File(...)):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Boş dosya yüklenemez")
    return import_lt03_upload(content, file.filename or "lt03.xlsx")
