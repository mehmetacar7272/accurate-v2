from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.modules.operations.definition_seed import seed_inspection_definitions

from app.modules.operations.services import (
    add_field,
    attach_test_to_type,
    build_definition_snapshot,
    bulk_delete_tasks,
    bulk_update_task_status,
    create_form,
    create_inspection_test,
    create_inspection_type,
    create_task,
    create_text_template,
    delete_task,
    export_tasks,
    generate_periodic_task,
    get_active_text_template,
    get_task,
    get_task_logs,
    list_inspection_tests,
    list_inspection_types,
    list_tasks,
    list_text_templates,
    list_type_tests,
    publish_revision,
    set_inspection_test_active,
    set_inspection_type_active,
    set_type_test_link_active,
    store_definition_snapshot,
    update_inspection_test,
    update_inspection_type,
    update_task,
    update_task_status,
    update_text_template,
    update_type_test_link,
)

router = APIRouter(prefix="/operations")


class TaskCreateRequest(BaseModel):
    title: str
    assigned_to: str = Field(alias="assignee")
    description: Optional[str] = None
    priority: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = "MEDIUM"
    due_date: Optional[datetime] = Field(default=None, alias="deadline")
    form_id: Optional[int] = None
    revision_id: Optional[int] = None
    task_type: str = "MANUAL"

    model_config = {
        "populate_by_name": True
    }


class TaskUpdateRequest(BaseModel):
    title: str
    assigned_to: str = Field(alias="assignee")
    description: Optional[str] = None
    priority: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = "MEDIUM"
    due_date: Optional[datetime] = Field(default=None, alias="deadline")
    task_type: str = "MANUAL"

    model_config = {
        "populate_by_name": True
    }


class TaskPatchRequest(BaseModel):
    title: Optional[str] = None
    assigned_to: Optional[str] = Field(default=None, alias="assignee")
    description: Optional[str] = None
    priority: Optional[Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]] = None
    due_date: Optional[datetime] = Field(default=None, alias="deadline")
    task_type: Optional[str] = None
    status: Optional[Literal["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]] = None

    model_config = {
        "populate_by_name": True
    }


class TaskStatusUpdateRequest(BaseModel):
    status: Literal["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]


class BulkTaskStatusRequest(BaseModel):
    task_ids: list[int] = Field(default_factory=list)
    status: Literal["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]


class BulkTaskDeleteRequest(BaseModel):
    task_ids: list[int] = Field(default_factory=list)


class InspectionTypeCreateRequest(BaseModel):
    code: str
    name: str
    category: Optional[str] = None
    sort_order: int = 0


class InspectionTypeUpdateRequest(BaseModel):
    name: str
    category: Optional[str] = None
    sort_order: int = 0


class InspectionTypeActiveRequest(BaseModel):
    is_active: bool


class InspectionTestCreateRequest(BaseModel):
    code: str
    name: str
    short_name: Optional[str] = None
    description: str = ""
    unit_label: Optional[str] = None
    sort_order: int = 0


class InspectionTestUpdateRequest(BaseModel):
    name: str
    short_name: Optional[str] = None
    description: str = ""
    unit_label: Optional[str] = None
    sort_order: int = 0


class InspectionTestActiveRequest(BaseModel):
    is_active: bool


class InspectionTypeTestCreateRequest(BaseModel):
    inspection_test_id: int
    is_required: bool = False
    is_default_selected: bool = False
    sort_order: int = 0
    display_name_override: Optional[str] = None
    notes: str = ""


class InspectionTypeTestUpdateRequest(BaseModel):
    is_required: bool = False
    is_default_selected: bool = False
    sort_order: int = 0
    display_name_override: Optional[str] = None
    notes: str = ""


class InspectionTypeTestActiveRequest(BaseModel):
    is_active: bool


class TextTemplateCreateRequest(BaseModel):
    template_type: str
    title: str
    body_text: str


class TextTemplateUpdateRequest(BaseModel):
    title: str
    body_text: str
    is_active: bool = True


def serialize_task(task):
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "task_type": task.task_type,
        "status": task.status,
        "priority": task.priority,
        "assignee": task.assigned_to,
        "assigned_to": task.assigned_to,
        "deadline": task.due_date.isoformat() if task.due_date else None,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "created_at": task.created_at.isoformat() if task.created_at else None,
        "completed_at": task.completed_at.isoformat() if task.completed_at else None,
        "updated_at": task.updated_at.isoformat() if task.updated_at else None,
        "form_id": task.form_id,
        "revision_id": task.revision_id,
    }


def serialize_task_log(log):
    return {
        "id": log.id,
        "task_id": log.task_id,
        "action": log.action,
        "note": log.note,
        "created_at": log.created_at.isoformat() if log.created_at else None,
    }


def serialize_inspection_type(item):
    return {
        "id": item.id,
        "code": item.code,
        "name": item.name,
        "category": item.category,
        "is_active": item.is_active,
        "sort_order": item.sort_order,
        "version_no": item.version_no,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def serialize_inspection_test(item):
    return {
        "id": item.id,
        "code": item.code,
        "name": item.name,
        "short_name": item.short_name,
        "description": item.description,
        "unit_label": item.unit_label,
        "is_active": item.is_active,
        "sort_order": item.sort_order,
        "version_no": item.version_no,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def serialize_type_test_link(link):
    return {
        "id": link.id,
        "inspection_type_id": link.inspection_type_id,
        "inspection_test_id": link.inspection_test_id,
        "inspection_test": serialize_inspection_test(link.inspection_test),
        "is_required": link.is_required,
        "is_default_selected": link.is_default_selected,
        "is_active": link.is_active,
        "sort_order": link.sort_order,
        "display_name_override": link.display_name_override,
        "notes": link.notes,
        "version_no": link.version_no,
        "created_at": link.created_at.isoformat() if link.created_at else None,
        "updated_at": link.updated_at.isoformat() if link.updated_at else None,
    }


def serialize_text_template(item):
    return {
        "id": item.id,
        "template_type": item.template_type,
        "title": item.title,
        "body_text": item.body_text,
        "is_active": item.is_active,
        "version_no": item.version_no,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


@router.post("/forms")
def new_form():
    form = create_form("Temizlik Kontrol", "FR057")
    return {"ok": True, "id": form.id, "name": form.name, "code": form.code}


@router.post("/revision")
def new_revision():
    rev = publish_revision(1)
    return {"ok": True, "id": rev.id, "revision_no": rev.revision_no}


@router.post("/task")
def new_task_legacy():
    task = create_task(
        form_id=1,
        assigned_to="personel1",
        title="Varsayılan Operasyon Görevi",
        task_type="MANUAL",
        revision_id=1,
        description="Legacy endpoint ile oluşturuldu",
        priority="MEDIUM",
    )
    return serialize_task(task)


@router.post("/tasks")
def create_task_endpoint(payload: TaskCreateRequest):
    task = create_task(
        form_id=payload.form_id,
        assigned_to=payload.assigned_to,
        title=payload.title,
        due_date=payload.due_date,
        task_type=payload.task_type,
        revision_id=payload.revision_id,
        description=payload.description,
        priority=payload.priority,
    )
    return serialize_task(task)


@router.get("/tasks")
def get_tasks(status: Optional[str] = None):
    tasks = list_tasks(status=status)
    return [serialize_task(task) for task in tasks]


@router.get("/tasks/export")
def export_tasks_endpoint(status: Optional[str] = None):
    tasks = export_tasks(status=status)
    return [serialize_task(task) for task in tasks]


@router.get("/tasks/{task_id}")
def get_task_endpoint(task_id: int):
    task = get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return serialize_task(task)


@router.get("/tasks/{task_id}/logs")
def get_task_logs_endpoint(task_id: int):
    task = get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    logs = get_task_logs(task_id)
    return [serialize_task_log(log) for log in logs]


@router.put("/tasks/{task_id}")
def update_task_endpoint(task_id: int, payload: TaskUpdateRequest):
    task = update_task(
        task_id=task_id,
        title=payload.title,
        assigned_to=payload.assigned_to,
        description=payload.description,
        priority=payload.priority,
        due_date=payload.due_date,
        task_type=payload.task_type,
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return serialize_task(task)


@router.patch("/tasks/{task_id}")
def update_task_patch_endpoint(task_id: int, payload: TaskPatchRequest):
    current_task = get_task(task_id)
    if not current_task:
        raise HTTPException(status_code=404, detail="Task not found")

    task = update_task(
        task_id=task_id,
        title=payload.title if payload.title is not None else current_task.title,
        assigned_to=payload.assigned_to if payload.assigned_to is not None else current_task.assigned_to,
        description=payload.description if payload.description is not None else current_task.description,
        priority=payload.priority if payload.priority is not None else current_task.priority,
        due_date=payload.due_date if payload.due_date is not None else current_task.due_date,
        task_type=payload.task_type if payload.task_type is not None else current_task.task_type,
    )

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if payload.status is not None and payload.status != task.status:
        updated_status_task = update_task_status(task_id, payload.status)
        if updated_status_task:
            task = updated_status_task

    return serialize_task(task)


@router.patch("/tasks/{task_id}/status")
def update_task_status_endpoint(task_id: int, payload: TaskStatusUpdateRequest):
    task = update_task_status(task_id, payload.status)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return serialize_task(task)


@router.post("/tasks/bulk-status")
def bulk_update_task_status_endpoint(payload: BulkTaskStatusRequest):
    if not payload.task_ids:
        raise HTTPException(status_code=400, detail="Task ids required")

    updated_ids = bulk_update_task_status(payload.task_ids, payload.status)
    return {
        "ok": True,
        "updated_ids": updated_ids,
        "updated_count": len(updated_ids),
    }


@router.post("/tasks/bulk-delete")
def bulk_delete_tasks_endpoint(payload: BulkTaskDeleteRequest):
    if not payload.task_ids:
        raise HTTPException(status_code=400, detail="Task ids required")

    deleted_ids = bulk_delete_tasks(payload.task_ids)
    return {
        "ok": True,
        "deleted_ids": deleted_ids,
        "deleted_count": len(deleted_ids),
    }


@router.delete("/tasks/{task_id}")
def delete_task_endpoint(task_id: int):
    task = delete_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"ok": True, "deleted_task_id": task_id}


@router.post("/field")
def new_field():
    return add_field(1, "Alan Temiz mi?", "checkbox", True, 1)


@router.post("/generate-task")
def gen_task():
    return generate_periodic_task(1, "personel1", 7)


# -----------------------------
# Admin - Inspection Types
# -----------------------------

@router.get("/admin/inspection-types")
def admin_list_inspection_types(active_only: bool = False):
    items = list_inspection_types(active_only=active_only)
    return [serialize_inspection_type(item) for item in items]


@router.post("/admin/inspection-types")
def admin_create_inspection_type(payload: InspectionTypeCreateRequest):
    item = create_inspection_type(
        code=payload.code,
        name=payload.name,
        category=payload.category,
        sort_order=payload.sort_order,
    )
    return serialize_inspection_type(item)


@router.put("/admin/inspection-types/{inspection_type_id}")
def admin_update_inspection_type(
    inspection_type_id: int,
    payload: InspectionTypeUpdateRequest,
):
    item = update_inspection_type(
        inspection_type_id=inspection_type_id,
        name=payload.name,
        category=payload.category,
        sort_order=payload.sort_order,
    )
    if not item:
        raise HTTPException(status_code=404, detail="Inspection type not found")
    return serialize_inspection_type(item)


@router.patch("/admin/inspection-types/{inspection_type_id}/active")
def admin_set_inspection_type_active(
    inspection_type_id: int,
    payload: InspectionTypeActiveRequest,
):
    item = set_inspection_type_active(inspection_type_id, payload.is_active)
    if not item:
        raise HTTPException(status_code=404, detail="Inspection type not found")
    return serialize_inspection_type(item)


# -----------------------------
# Admin - Inspection Tests
# -----------------------------

@router.get("/admin/inspection-tests")
def admin_list_inspection_tests(active_only: bool = False):
    items = list_inspection_tests(active_only=active_only)
    return [serialize_inspection_test(item) for item in items]


@router.post("/admin/inspection-tests")
def admin_create_inspection_test(payload: InspectionTestCreateRequest):
    item = create_inspection_test(
        code=payload.code,
        name=payload.name,
        short_name=payload.short_name,
        description=payload.description,
        unit_label=payload.unit_label,
        sort_order=payload.sort_order,
    )
    return serialize_inspection_test(item)


@router.put("/admin/inspection-tests/{inspection_test_id}")
def admin_update_inspection_test(
    inspection_test_id: int,
    payload: InspectionTestUpdateRequest,
):
    item = update_inspection_test(
        inspection_test_id=inspection_test_id,
        name=payload.name,
        short_name=payload.short_name,
        description=payload.description,
        unit_label=payload.unit_label,
        sort_order=payload.sort_order,
    )
    if not item:
        raise HTTPException(status_code=404, detail="Inspection test not found")
    return serialize_inspection_test(item)


@router.patch("/admin/inspection-tests/{inspection_test_id}/active")
def admin_set_inspection_test_active(
    inspection_test_id: int,
    payload: InspectionTestActiveRequest,
):
    item = set_inspection_test_active(inspection_test_id, payload.is_active)
    if not item:
        raise HTTPException(status_code=404, detail="Inspection test not found")
    return serialize_inspection_test(item)


# -----------------------------
# Admin - Type/Test Mapping
# -----------------------------

@router.get("/admin/inspection-types/{inspection_type_id}/tests")
def admin_list_type_tests(inspection_type_id: int, active_only: bool = False):
    items = list_type_tests(inspection_type_id=inspection_type_id, active_only=active_only)
    return [serialize_type_test_link(item) for item in items]


@router.post("/admin/inspection-types/{inspection_type_id}/tests")
def admin_attach_test_to_type(
    inspection_type_id: int,
    payload: InspectionTypeTestCreateRequest,
):
    attach_test_to_type(
        inspection_type_id=inspection_type_id,
        inspection_test_id=payload.inspection_test_id,
        is_required=payload.is_required,
        is_default_selected=payload.is_default_selected,
        sort_order=payload.sort_order,
        display_name_override=payload.display_name_override,
        notes=payload.notes,
    )

    items = list_type_tests(inspection_type_id=inspection_type_id, active_only=False)
    return [serialize_type_test_link(item) for item in items]


@router.put("/admin/inspection-type-tests/{link_id}")
def admin_update_type_test_link(
    link_id: int,
    payload: InspectionTypeTestUpdateRequest,
):
    item = update_type_test_link(
        link_id=link_id,
        is_required=payload.is_required,
        is_default_selected=payload.is_default_selected,
        sort_order=payload.sort_order,
        display_name_override=payload.display_name_override,
        notes=payload.notes,
    )
    if not item:
        raise HTTPException(status_code=404, detail="Type test link not found")
    return serialize_type_test_link(item)


@router.patch("/admin/inspection-type-tests/{link_id}/active")
def admin_set_type_test_link_active(
    link_id: int,
    payload: InspectionTypeTestActiveRequest,
):
    item = set_type_test_link_active(link_id, payload.is_active)
    if not item:
        raise HTTPException(status_code=404, detail="Type test link not found")
    return serialize_type_test_link(item)


# -----------------------------
# Admin - Text Templates
# -----------------------------

@router.get("/admin/text-templates")
def admin_list_text_templates(active_only: bool = False):
    items = list_text_templates(active_only=active_only)
    return [serialize_text_template(item) for item in items]


@router.post("/admin/text-templates")
def admin_create_text_template(payload: TextTemplateCreateRequest):
    item = create_text_template(
        template_type=payload.template_type,
        title=payload.title,
        body_text=payload.body_text,
    )
    return serialize_text_template(item)


@router.put("/admin/text-templates/{template_id}")
def admin_update_text_template(
    template_id: int,
    payload: TextTemplateUpdateRequest,
):
    item = update_text_template(
        template_id=template_id,
        title=payload.title,
        body_text=payload.body_text,
        is_active=payload.is_active,
    )
    if not item:
        raise HTTPException(status_code=404, detail="Text template not found")
    return serialize_text_template(item)


# -----------------------------
# Runtime - Definition Reads
# -----------------------------

@router.get("/definitions/inspection-types")
def runtime_list_inspection_types():
    items = list_inspection_types(active_only=True)
    return [serialize_inspection_type(item) for item in items]


@router.get("/definitions/inspection-types/{inspection_type_code}/tests")
def runtime_list_type_tests(inspection_type_code: str):
    types = list_inspection_types(active_only=True)
    matched = next((item for item in types if item.code == inspection_type_code), None)
    if not matched:
        raise HTTPException(status_code=404, detail="Inspection type not found")

    items = list_type_tests(inspection_type_id=matched.id, active_only=True)
    return [serialize_type_test_link(item) for item in items]


@router.get("/definitions/text-templates/{template_type}")
def runtime_get_text_template(template_type: str):
    item = get_active_text_template(template_type)
    if not item:
        raise HTTPException(status_code=404, detail="Text template not found")
    return serialize_text_template(item)


@router.get("/definitions/inspection-types/{inspection_type_code}/snapshot")
def runtime_build_definition_snapshot(inspection_type_code: str):
    snapshot = build_definition_snapshot(inspection_type_code)
    if not snapshot:
        raise HTTPException(status_code=404, detail="Inspection type snapshot not found")
    return snapshot


@router.post("/definitions/snapshots/{entity_type}/{entity_id}")
def runtime_store_definition_snapshot(entity_type: str, entity_id: int, payload: dict):
    snapshot = payload.get("snapshot") if isinstance(payload, dict) else None
    if not snapshot:
        raise HTTPException(status_code=400, detail="snapshot is required")
    item = store_definition_snapshot(entity_type=entity_type, entity_id=entity_id, snapshot=snapshot)
    return {
        "ok": True,
        "id": item.id,
        "entity_type": item.entity_type,
        "entity_id": item.entity_id,
        "definition_version_summary": item.definition_version_summary,
        "created_at": item.created_at.isoformat() if item.created_at else None,
    }

@router.post("/admin/seed-definitions")
def admin_seed_definitions():
    seed_inspection_definitions()
    return {"ok": True, "message": "Inspection definitions seeded"}

