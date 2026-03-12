from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.modules.operations.services import (
    add_field,
    create_form,
    create_task,
    delete_task,
    generate_periodic_task,
    get_task,
    get_task_logs,
    list_tasks,
    publish_revision,
    update_task,
    update_task_status,
)

router = APIRouter(prefix="/operations")


class TaskCreateRequest(BaseModel):
    title: str
    assigned_to: str
    description: Optional[str] = None
    priority: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = "MEDIUM"
    due_date: Optional[datetime] = None
    form_id: Optional[int] = None
    revision_id: Optional[int] = None
    task_type: str = "MANUAL"


class TaskUpdateRequest(BaseModel):
    title: str
    assigned_to: str
    description: Optional[str] = None
    priority: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"] = "MEDIUM"
    due_date: Optional[datetime] = None
    task_type: str = "MANUAL"


class TaskStatusUpdateRequest(BaseModel):
    status: Literal["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]


def serialize_task(task):
    return {
        "id": task.id,
        "title": task.title,
        "description": task.description,
        "task_type": task.task_type,
        "status": task.status,
        "priority": task.priority,
        "assigned_to": task.assigned_to,
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


@router.patch("/tasks/{task_id}/status")
def update_task_status_endpoint(task_id: int, payload: TaskStatusUpdateRequest):
    task = update_task_status(task_id, payload.status)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return serialize_task(task)


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