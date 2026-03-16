import json
from datetime import datetime, timedelta
from typing import Optional
from sqlalchemy.orm import joinedload

from app.core.database import SessionLocal
from .models import (
    DefinitionSnapshot,
    DefinitionTextTemplate,
    InspectionTest,
    InspectionType,
    InspectionTypeTest,
    OperationFormDefinition,
    OperationFormField,
    OperationFormRevision,
    OperationTask,
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


def bulk_update_task_status(task_ids: list[int], status: str):
    db = SessionLocal()
    try:
        tasks = (
            db.query(OperationTask)
            .filter(OperationTask.id.in_(task_ids), OperationTask.is_deleted == False)
            .all()
        )

        updated_ids = []

        for task in tasks:
            old_status = task.status
            task.status = status

            if status == "COMPLETED":
                task.completed_at = datetime.utcnow()
            else:
                task.completed_at = None

            _add_task_log(
                db,
                task.id,
                "BULK_STATUS_CHANGED",
                f"Toplu durum değişimi: '{old_status}' -> '{status}'",
            )
            updated_ids.append(task.id)

        db.commit()
        return updated_ids
    finally:
        db.close()


def bulk_delete_tasks(task_ids: list[int]):
    db = SessionLocal()
    try:
        tasks = (
            db.query(OperationTask)
            .filter(OperationTask.id.in_(task_ids), OperationTask.is_deleted == False)
            .all()
        )

        deleted_ids = []

        for task in tasks:
            task.is_deleted = True
            task.deleted_at = datetime.utcnow()
            _add_task_log(db, task.id, "BULK_DELETED", "Görev toplu silme ile kaldırıldı")
            deleted_ids.append(task.id)

        db.commit()
        return deleted_ids
    finally:
        db.close()


def export_tasks(status: Optional[str] = None):
    db = SessionLocal()
    try:
        query = db.query(OperationTask).filter(OperationTask.is_deleted == False)

        if status and status != "ALL":
            query = query.filter(OperationTask.status == status)

        tasks = query.order_by(OperationTask.created_at.desc(), OperationTask.id.desc()).all()
        return tasks
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


# -----------------------------
# Inspection Definition Engine
# -----------------------------

def list_inspection_types(active_only: bool = False):
    db = SessionLocal()
    try:
        query = db.query(InspectionType)
        if active_only:
            query = query.filter(InspectionType.is_active == True)
        return query.order_by(InspectionType.sort_order.asc(), InspectionType.id.asc()).all()
    finally:
        db.close()


def create_inspection_type(
    code: str,
    name: str,
    category: Optional[str] = None,
    sort_order: int = 0,
):
    db = SessionLocal()
    try:
        item = InspectionType(
            code=code.strip(),
            name=name.strip(),
            category=(category or "").strip() or None,
            sort_order=sort_order,
            is_active=True,
            version_no=1,
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return item
    finally:
        db.close()


def update_inspection_type(
    inspection_type_id: int,
    name: str,
    category: Optional[str] = None,
    sort_order: int = 0,
):
    db = SessionLocal()
    try:
        item = db.query(InspectionType).filter(InspectionType.id == inspection_type_id).first()
        if not item:
            return None

        item.name = name.strip()
        item.category = (category or "").strip() or None
        item.sort_order = sort_order
        item.version_no += 1

        db.commit()
        db.refresh(item)
        return item
    finally:
        db.close()


def set_inspection_type_active(inspection_type_id: int, is_active: bool):
    db = SessionLocal()
    try:
        item = db.query(InspectionType).filter(InspectionType.id == inspection_type_id).first()
        if not item:
            return None

        item.is_active = is_active
        item.version_no += 1

        db.commit()
        db.refresh(item)
        return item
    finally:
        db.close()


def list_inspection_tests(active_only: bool = False):
    db = SessionLocal()
    try:
        query = db.query(InspectionTest)
        if active_only:
            query = query.filter(InspectionTest.is_active == True)
        return query.order_by(InspectionTest.sort_order.asc(), InspectionTest.id.asc()).all()
    finally:
        db.close()


def create_inspection_test(
    code: str,
    name: str,
    short_name: Optional[str] = None,
    description: str = "",
    unit_label: Optional[str] = None,
    sort_order: int = 0,
):
    db = SessionLocal()
    try:
        item = InspectionTest(
            code=code.strip(),
            name=name.strip(),
            short_name=(short_name or "").strip() or None,
            description=description or "",
            unit_label=(unit_label or "").strip() or None,
            sort_order=sort_order,
            is_active=True,
            version_no=1,
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return item
    finally:
        db.close()


def update_inspection_test(
    inspection_test_id: int,
    name: str,
    short_name: Optional[str] = None,
    description: str = "",
    unit_label: Optional[str] = None,
    sort_order: int = 0,
):
    db = SessionLocal()
    try:
        item = db.query(InspectionTest).filter(InspectionTest.id == inspection_test_id).first()
        if not item:
            return None

        item.name = name.strip()
        item.short_name = (short_name or "").strip() or None
        item.description = description or ""
        item.unit_label = (unit_label or "").strip() or None
        item.sort_order = sort_order
        item.version_no += 1

        db.commit()
        db.refresh(item)
        return item
    finally:
        db.close()


def set_inspection_test_active(inspection_test_id: int, is_active: bool):
    db = SessionLocal()
    try:
        item = db.query(InspectionTest).filter(InspectionTest.id == inspection_test_id).first()
        if not item:
            return None

        item.is_active = is_active
        item.version_no += 1

        db.commit()
        db.refresh(item)
        return item
    finally:
        db.close()


def list_type_tests(inspection_type_id: int, active_only: bool = False):
    db = SessionLocal()
    try:
        query = (
            db.query(InspectionTypeTest)
            .options(joinedload(InspectionTypeTest.inspection_test))
            .filter(InspectionTypeTest.inspection_type_id == inspection_type_id)
        )

        if active_only:
            query = query.join(InspectionTest).filter(
                InspectionTypeTest.is_active == True,
                InspectionTest.is_active == True,
            )

        return query.order_by(
            InspectionTypeTest.sort_order.asc(),
            InspectionTypeTest.id.asc(),
        ).all()
    finally:
        db.close()


def attach_test_to_type(
    inspection_type_id: int,
    inspection_test_id: int,
    is_required: bool = False,
    is_default_selected: bool = False,
    sort_order: int = 0,
    display_name_override: Optional[str] = None,
    notes: str = "",
):
    db = SessionLocal()
    try:
        existing = (
            db.query(InspectionTypeTest)
            .filter(
                InspectionTypeTest.inspection_type_id == inspection_type_id,
                InspectionTypeTest.inspection_test_id == inspection_test_id,
            )
            .first()
        )
        if existing:
            return existing

        link = InspectionTypeTest(
            inspection_type_id=inspection_type_id,
            inspection_test_id=inspection_test_id,
            is_required=is_required,
            is_default_selected=is_default_selected,
            is_active=True,
            sort_order=sort_order,
            display_name_override=(display_name_override or "").strip() or None,
            notes=notes or "",
            version_no=1,
        )
        db.add(link)
        db.commit()
        db.refresh(link)
        return link
    finally:
        db.close()


def update_type_test_link(
    link_id: int,
    is_required: bool = False,
    is_default_selected: bool = False,
    sort_order: int = 0,
    display_name_override: Optional[str] = None,
    notes: str = "",
):
    db = SessionLocal()
    try:
        link = db.query(InspectionTypeTest).filter(InspectionTypeTest.id == link_id).first()
        if not link:
            return None

        link.is_required = is_required
        link.is_default_selected = is_default_selected
        link.sort_order = sort_order
        link.display_name_override = (display_name_override or "").strip() or None
        link.notes = notes or ""
        link.version_no += 1

        db.commit()
        db.refresh(link)
        return link
    finally:
        db.close()


def set_type_test_link_active(link_id: int, is_active: bool):
    db = SessionLocal()
    try:
        link = db.query(InspectionTypeTest).filter(InspectionTypeTest.id == link_id).first()
        if not link:
            return None

        link.is_active = is_active
        link.version_no += 1

        db.commit()
        db.refresh(link)
        return link
    finally:
        db.close()


def list_text_templates(active_only: bool = False):
    db = SessionLocal()
    try:
        query = db.query(DefinitionTextTemplate)
        if active_only:
            query = query.filter(DefinitionTextTemplate.is_active == True)
        return query.order_by(DefinitionTextTemplate.template_type.asc(), DefinitionTextTemplate.id.desc()).all()
    finally:
        db.close()


def get_active_text_template(template_type: str):
    db = SessionLocal()
    try:
        return (
            db.query(DefinitionTextTemplate)
            .filter(
                DefinitionTextTemplate.template_type == template_type,
                DefinitionTextTemplate.is_active == True,
            )
            .order_by(DefinitionTextTemplate.version_no.desc(), DefinitionTextTemplate.id.desc())
            .first()
        )
    finally:
        db.close()


def create_text_template(template_type: str, title: str, body_text: str):
    db = SessionLocal()
    try:
        last_item = (
            db.query(DefinitionTextTemplate)
            .filter(DefinitionTextTemplate.template_type == template_type)
            .order_by(DefinitionTextTemplate.version_no.desc(), DefinitionTextTemplate.id.desc())
            .first()
        )
        next_version = 1 if not last_item else last_item.version_no + 1

        item = DefinitionTextTemplate(
            template_type=template_type.strip(),
            title=title.strip(),
            body_text=body_text or "",
            is_active=True,
            version_no=next_version,
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return item
    finally:
        db.close()


def update_text_template(template_id: int, title: str, body_text: str, is_active: bool = True):
    db = SessionLocal()
    try:
        item = db.query(DefinitionTextTemplate).filter(DefinitionTextTemplate.id == template_id).first()
        if not item:
            return None

        item.title = title.strip()
        item.body_text = body_text or ""
        item.is_active = is_active
        item.version_no += 1

        db.commit()
        db.refresh(item)
        return item
    finally:
        db.close()


def build_definition_snapshot(inspection_type_code: str):
    db = SessionLocal()
    try:
        inspection_type = (
            db.query(InspectionType)
            .filter(
                InspectionType.code == inspection_type_code,
                InspectionType.is_active == True,
            )
            .first()
        )
        if not inspection_type:
            return None

        links = (
            db.query(InspectionTypeTest)
            .join(InspectionTest, InspectionTypeTest.inspection_test_id == InspectionTest.id)
            .filter(
                InspectionTypeTest.inspection_type_id == inspection_type.id,
                InspectionTypeTest.is_active == True,
                InspectionTest.is_active == True,
            )
            .order_by(InspectionTypeTest.sort_order.asc(), InspectionTypeTest.id.asc())
            .all()
        )

        templates = (
            db.query(DefinitionTextTemplate)
            .filter(DefinitionTextTemplate.is_active == True)
            .order_by(DefinitionTextTemplate.template_type.asc(), DefinitionTextTemplate.id.desc())
            .all()
        )

        snapshot = {
            "inspection_type": {
                "id": inspection_type.id,
                "code": inspection_type.code,
                "name": inspection_type.name,
                "category": inspection_type.category,
                "version_no": inspection_type.version_no,
            },
            "tests": [
                {
                    "link_id": link.id,
                    "test_id": link.inspection_test.id,
                    "code": link.inspection_test.code,
                    "name": link.display_name_override or link.inspection_test.name,
                    "master_name": link.inspection_test.name,
                    "short_name": link.inspection_test.short_name,
                    "description": link.inspection_test.description,
                    "unit_label": link.inspection_test.unit_label,
                    "is_required": link.is_required,
                    "is_default_selected": link.is_default_selected,
                    "sort_order": link.sort_order,
                    "version_no": link.version_no,
                }
                for link in links
            ],
            "text_templates": [
                {
                    "id": item.id,
                    "template_type": item.template_type,
                    "title": item.title,
                    "body_text": item.body_text,
                    "version_no": item.version_no,
                }
                for item in templates
            ],
            "generated_at": datetime.utcnow().isoformat(),
        }

        return snapshot
    finally:
        db.close()


def store_definition_snapshot(entity_type: str, entity_id: int, snapshot: dict):
    db = SessionLocal()
    try:
        version_summary = ""
        if snapshot and isinstance(snapshot, dict):
            inspection_type = snapshot.get("inspection_type") or {}
            version_summary = (
                f"type:{inspection_type.get('code', '')}"
                f":v{inspection_type.get('version_no', '')}"
            )

        item = DefinitionSnapshot(
            entity_type=entity_type,
            entity_id=entity_id,
            definition_version_summary=version_summary,
            snapshot_json=json.dumps(snapshot or {}, ensure_ascii=False),
        )
        db.add(item)
        db.commit()
        db.refresh(item)
        return item
    finally:
        db.close()