from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.database import SessionLocal
from app.modules.operations.models import OperationTask

router = APIRouter()


@router.get("/tasks")
def get_tasks():
    db = SessionLocal()
    try:
        rows = db.query(OperationTask).order_by(OperationTask.created_at.desc()).all()
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        result = []
        for row in rows:
            result.append(
                {
                    "id": row.id,
                    "title": row.title,
                    "task_type": row.task_type,
                    "status": row.status,
                    "assigned_to": row.assigned_to,
                    "due_date": row.due_date.isoformat() if row.due_date else None,
                    "created_at": row.created_at.isoformat() if row.created_at else None,
                    "is_overdue": bool(row.due_date and row.due_date < now and row.status != "done"),
                }
            )
        return result
    finally:
        db.close()
