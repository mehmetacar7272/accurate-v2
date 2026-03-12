from fastapi import APIRouter
from app.modules.operations.services import create_form, publish_revision, create_task

router = APIRouter()

@router.post("/operations/forms")
def new_form():
    return create_form("Temizlik Kontrol", "FR057")

@router.post("/operations/revision")
def new_revision():
    return publish_revision(1)

@router.post("/operations/task")
def new_task():
    return create_task(1, "personel1")