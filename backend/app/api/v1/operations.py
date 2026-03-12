from fastapi import APIRouter
from app.core.database import SessionLocal
from app.modules.operations.models import OperationTask
from app.modules.operations.services import (
    create_form,
    publish_revision,
    create_task,
    add_field,
    generate_periodic_task,
)

router = APIRouter(prefix="/operations")


@router.post("/forms")
def new_form():
    return create_form("Temizlik Kontrol", "FR057")


@router.post("/revision")
def new_revision():
    return publish_revision(1)


@router.post("/task")
def new_task():
    return create_task(1, "personel1")


@router.post("/field")
def new_field():
    return add_field(1, "Alan Temiz mi?", "checkbox", True, 1)


@router.post("/generate-task")
def gen_task():
    return generate_periodic_task(1, "personel1", 7)


@router.get("/tasks")
def get_tasks():
    db = SessionLocal()
    tasks = db.query(OperationTask).all()
    return [
        {
            "id": t.id,
            "status": t.status,
            "due_date": t.due_date,
        }
        for t in tasks
    ]