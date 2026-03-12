from app.core.database import SessionLocal
from .models import OperationFormDefinition, OperationFormRevision, OperationTask, OperationFormField 
from datetime import datetime, timedelta

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

from datetime import datetime, timedelta


def add_field(revision_id, label, field_type, required, order_no):
    db = SessionLocal()
    field = OperationFormField(
        form_revision_id=revision_id,
        label=label,
        field_type=field_type,
        required=required,
        order_no=order_no
    )
    db.add(field)
    db.commit()
    return {"ok": True}


def generate_periodic_task(form_id, assigned_to, days):
    db = SessionLocal()

    next_date = datetime.utcnow() + timedelta(days=days)

    task = OperationTask(
        form_id=form_id,
        revision_id=1,
        task_type="PERIODIC",
        status="PENDING",
        assigned_to=assigned_to,
        due_date=next_date
    )

    db.add(task)
    db.commit()

    return {"ok": True}