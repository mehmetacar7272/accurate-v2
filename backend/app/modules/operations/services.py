from datetime import datetime, timedelta
from typing import Optional

from app.core.database import SessionLocal
from .models import (
    OperationFormDefinition,
    OperationFormRevision,
    OperationTask,
    OperationFormField,
    OperationTaskLog,
)


def _add_task_log(db, task_id: int, action: str, note: str = ""):
    log = OperationTaskLog(
        task_id=task_id,
        action=action,
        note=note or "",
    )
    db.add(log)
    return log


def create_form(name: str, code: str):
    db = SessionLocal()
    try:
        form = OperationFormDefinition(name=name, code=code)
        db.add(form)
        db.commit()
        db.refresh(form)
        return form
    finally:
        db.close()


def publish_revision(form_id: int):
    db = SessionLocal()
    try:
        current_max = (
            db.query(OperationFormRevision)
            .filter(OperationFormRevision.form_id == form_id)
            .order_by(OperationFormRevision.revision_no.desc())
            .first()
        )

        next_revision_no = 1 if not current_max else current_max.revision_no + 1

        rev = OperationFormRevision(
            form_id=form_id,
            revision_no=next_revision_no,
            published=True,
        )
        db.add(rev)
        db.commit()
        db.refresh(rev)
        return rev
    finally:
        db.close()


def create_task(
    form_id: Optional[int],
    assigned_to: str,
    title: str,
    due_date: Optional[datetime] = None,
    task_type: str = "MANUAL",
    revision_id: Optional[int] = None,
    description: Optional[str] = None,
    priority: str = "MEDIUM",
):
    db = SessionLocal()
    try:
        task = OperationTask(
            form_id=form_id,
            revision_id=revision_id,
            title=title,
            description=description,
            task_type=task_type,
            status="PENDING",
            priority=priority,
            assigned_to=assigned_to,
            due_date=due_date,
        )
        db.add(task)
        db.flush()

        _add_task_log(
            db,
            task.id,
            "CREATED",
            f"Görev oluşturuldu. Atanan: {assigned_to}, Öncelik: {priority}",
        )

        db.commit()
        db.refresh(task)
        return task
    finally:
        db.close()


def list_tasks(status: Optional[str] = None):
    db = SessionLocal()
    try:
        query = (
            db.query(OperationTask)
            .filter(OperationTask.is_deleted == False)
            .order_by(OperationTask.created_at.desc(), OperationTask.id.desc())
        )
        if status and status != "ALL":
            query = query.filter(OperationTask.status == status)
        return query.all()
    finally:
        db.close()


def get_task(task_id: int):
    db = SessionLocal()
    try:
        return (
            db.query(OperationTask)
            .filter(OperationTask.id == task_id, OperationTask.is_deleted == False)
            .first()
        )
    finally:
        db.close()


def get_task_logs(task_id: int):
    db = SessionLocal()
    try:
        return (
            db.query(OperationTaskLog)
            .filter(OperationTaskLog.task_id == task_id)
            .order_by(OperationTaskLog.created_at.desc(), OperationTaskLog.id.desc())
            .all()
        )
    finally:
        db.close()


def update_task(
    task_id: int,
    title: str,
    assigned_to: str,
    description: Optional[str] = None,
    priority: str = "MEDIUM",
    due_date: Optional[datetime] = None,
    task_type: str = "MANUAL",
):
    db = SessionLocal()
    try:
        task = (
            db.query(OperationTask)
            .filter(OperationTask.id == task_id, OperationTask.is_deleted == False)
            .first()
        )
        if not task:
            return None

        changes = []

        if task.title != title:
            changes.append(f"Başlık: '{task.title}' -> '{title}'")
            task.title = title

        if task.assigned_to != assigned_to:
            changes.append(f"Atanan: '{task.assigned_to}' -> '{assigned_to}'")
            task.assigned_to = assigned_to

        if (task.description or "") != (description or ""):
            changes.append("Açıklama güncellendi")
            task.description = description

        if task.priority != priority:
            changes.append(f"Öncelik: '{task.priority}' -> '{priority}'")
            task.priority = priority

        if task.task_type != task_type:
            changes.append(f"Görev tipi: '{task.task_type}' -> '{task_type}'")
            task.task_type = task_type

        old_due = task.due_date.isoformat() if task.due_date else ""
        new_due = due_date.isoformat() if due_date else ""
        if old_due != new_due:
            changes.append("Termin tarihi güncellendi")
            task.due_date = due_date

        if changes:
            _add_task_log(db, task.id, "UPDATED", " | ".join(changes))

        db.commit()
        db.refresh(task)
        return task
    finally:
        db.close()


def update_task_status(task_id: int, status: str):
    db = SessionLocal()
    try:
        task = (
            db.query(OperationTask)
            .filter(OperationTask.id == task_id, OperationTask.is_deleted == False)
            .first()
        )
        if not task:
            return None

        old_status = task.status
        task.status = status

        if status == "COMPLETED":
            task.completed_at = datetime.utcnow()
        else:
            task.completed_at = None

        _add_task_log(
            db,
            task.id,
            "STATUS_CHANGED",
            f"Durum: '{old_status}' -> '{status}'",
        )

        db.commit()
        db.refresh(task)
        return task
    finally:
        db.close()


def delete_task(task_id: int):
    db = SessionLocal()
    try:
        task = (
            db.query(OperationTask)
            .filter(OperationTask.id == task_id, OperationTask.is_deleted == False)
            .first()
        )
        if not task:
            return None

        task.is_deleted = True
        task.deleted_at = datetime.utcnow()

        _add_task_log(db, task.id, "DELETED", "Görev soft delete ile kaldırıldı")

        db.commit()
        db.refresh(task)
        return task
    finally:
        db.close()


def add_field(revision_id, label, field_type, required, order_no):
    db = SessionLocal()
    try:
        field = OperationFormField(
            revision_id=revision_id,
            field_key=f"field_{order_no}",
            field_label=label,
            field_type=field_type,
            required=required,
            order_no=order_no,
        )
        db.add(field)
        db.commit()
        db.refresh(field)
        return {"ok": True, "field_id": field.id}
    finally:
        db.close()


def generate_periodic_task(form_id, assigned_to, days):
    db = SessionLocal()
    try:
        next_date = datetime.utcnow() + timedelta(days=days)
        task = OperationTask(
            form_id=form_id,
            revision_id=1,
            title="Periyodik Operasyon Görevi",
            description="Sistem tarafından oluşturulan periyodik görev",
            task_type="PERIODIC",
            status="PENDING",
            priority="MEDIUM",
            assigned_to=assigned_to,
            due_date=next_date,
        )
        db.add(task)
        db.flush()

        _add_task_log(db, task.id, "GENERATED", "Periyodik görev üretildi")

        db.commit()
        db.refresh(task)
        return {"ok": True, "task_id": task.id}
    finally:
        db.close()