from app.core.database import SessionLocal
from .models import OperationFormDefinition, OperationFormRevision, OperationTask

def create_form(name, code):
    db = SessionLocal()
    form = OperationFormDefinition(name=name, code=code)
    db.add(form)
    db.commit()
    return form

def publish_revision(form_id):
    db = SessionLocal()
    rev = OperationFormRevision(form_id=form_id, revision_no=1, published=True)
    db.add(rev)
    db.commit()
    return rev

def create_task(form_id, assigned_to):
    db = SessionLocal()
    task = OperationTask(
        form_id=form_id,
        revision_id=1,
        task_type="MANUAL",
        status="PENDING",
        assigned_to=assigned_to
    )
    db.add(task)
    db.commit()
    return task