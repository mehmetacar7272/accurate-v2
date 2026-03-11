from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.database import SessionLocal
from app.modules.operations.models import OperationTask

router = APIRouter()


@router.get("")
def dashboard_summary():
    db = SessionLocal()
    try:
        rows = db.query(OperationTask).all()
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        open_tasks = [r for r in rows if (r.status or "open") not in {"done", "closed"}]
        overdue_tasks = [r for r in open_tasks if r.due_date and r.due_date < now]
        blocker_tasks = [r for r in open_tasks if (r.task_type or "").lower() == "blocker"]
        return {
            "today_jobs": 0,
            "pending_reports": 0,
            "calibration_alerts": 0,
            "personnel_alerts": 0,
            "recent_inspections": [],
            "operation_tasks_open": len(open_tasks),
            "operation_tasks_overdue": len(overdue_tasks),
            "operation_tasks_blocking": len(blocker_tasks),
        }
    finally:
        db.close()
