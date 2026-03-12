from datetime import datetime
from collections import Counter, defaultdict

from fastapi import APIRouter

from app.core.database import SessionLocal
from app.modules.operations.models import OperationTask, OperationTaskLog

router = APIRouter()


def _safe_iso(value):
    return value.isoformat() if value else None


@router.get("")
def dashboard_summary():
    db = SessionLocal()
    try:
        now = datetime.utcnow()

        tasks = db.query(OperationTask).all()

        visible_tasks = []
        for task in tasks:
            if getattr(task, "is_deleted", False):
                continue
            visible_tasks.append(task)

        open_statuses = {"PENDING", "IN_PROGRESS"}
        completed_statuses = {"COMPLETED"}
        cancelled_statuses = {"CANCELLED"}

        open_tasks = [t for t in visible_tasks if (t.status or "PENDING") in open_statuses]
        overdue_tasks = [
            t for t in open_tasks
            if t.due_date is not None and t.due_date < now
        ]
        critical_tasks = [
            t for t in open_tasks
            if (getattr(t, "priority", "MEDIUM") or "MEDIUM") == "CRITICAL"
        ]
        due_today_tasks = [
            t for t in open_tasks
            if t.due_date is not None and t.due_date.date() == now.date()
        ]
        completed_today_tasks = [
            t for t in visible_tasks
            if (t.status or "") in completed_statuses
            and getattr(t, "completed_at", None) is not None
            and t.completed_at.date() == now.date()
        ]

        status_counts = Counter((t.status or "PENDING") for t in visible_tasks)
        priority_counts = Counter((getattr(t, "priority", "MEDIUM") or "MEDIUM") for t in visible_tasks)

        assignee_map = defaultdict(lambda: {
            "assigned_to": "",
            "total": 0,
            "pending": 0,
            "in_progress": 0,
            "overdue": 0,
            "critical": 0,
        })

        for task in visible_tasks:
            assignee = (task.assigned_to or "Atanmamış").strip() or "Atanmamış"
            row = assignee_map[assignee]
            row["assigned_to"] = assignee
            row["total"] += 1

            status = task.status or "PENDING"
            if status == "PENDING":
                row["pending"] += 1
            elif status == "IN_PROGRESS":
                row["in_progress"] += 1

            if task.due_date and status in open_statuses and task.due_date < now:
                row["overdue"] += 1

            if (getattr(task, "priority", "MEDIUM") or "MEDIUM") == "CRITICAL":
                row["critical"] += 1

        assignee_workload = sorted(
            assignee_map.values(),
            key=lambda x: (-x["overdue"], -x["in_progress"], -x["pending"], x["assigned_to"]),
        )

        urgent_tasks = sorted(
            open_tasks,
            key=lambda t: (
                0 if (getattr(t, "priority", "MEDIUM") == "CRITICAL") else 1,
                0 if (t.due_date and t.due_date < now) else 1,
                t.due_date or datetime.max,
                t.id,
            ),
        )[:8]

        logs = []
        try:
            logs = (
                db.query(OperationTaskLog)
                .order_by(OperationTaskLog.created_at.desc(), OperationTaskLog.id.desc())
                .limit(10)
                .all()
            )
        except Exception:
            logs = []

        recent_activity = []
        for log in logs:
            related_task = next((t for t in visible_tasks if t.id == log.task_id), None)
            recent_activity.append({
                "id": log.id,
                "task_id": log.task_id,
                "task_title": related_task.title if related_task else f"Görev #{log.task_id}",
                "action": log.action,
                "note": log.note,
                "created_at": _safe_iso(log.created_at),
            })

        recent_tasks = [
            {
                "id": t.id,
                "title": t.title,
                "status": t.status,
                "priority": getattr(t, "priority", "MEDIUM"),
                "assigned_to": t.assigned_to,
                "task_type": t.task_type,
                "due_date": _safe_iso(t.due_date),
                "created_at": _safe_iso(t.created_at),
                "completed_at": _safe_iso(getattr(t, "completed_at", None)),
            }
            for t in sorted(
                visible_tasks,
                key=lambda x: (x.created_at or datetime.min, x.id),
                reverse=True,
            )[:8]
        ]

        return {
            "today_jobs": len(due_today_tasks),
            "pending_reports": 0,
            "calibration_alerts": 0,
            "personnel_alerts": 0,
            "operation_tasks_open": len(open_tasks),
            "operation_tasks_overdue": len(overdue_tasks),
            "operation_tasks_blocking": len(critical_tasks),
            "operation_tasks_completed_today": len(completed_today_tasks),
            "status_counts": {
                "PENDING": status_counts.get("PENDING", 0),
                "IN_PROGRESS": status_counts.get("IN_PROGRESS", 0),
                "COMPLETED": status_counts.get("COMPLETED", 0),
                "CANCELLED": status_counts.get("CANCELLED", 0),
            },
            "priority_counts": {
                "LOW": priority_counts.get("LOW", 0),
                "MEDIUM": priority_counts.get("MEDIUM", 0),
                "HIGH": priority_counts.get("HIGH", 0),
                "CRITICAL": priority_counts.get("CRITICAL", 0),
            },
            "assignee_workload": assignee_workload[:10],
            "urgent_tasks": [
                {
                    "id": t.id,
                    "title": t.title,
                    "status": t.status,
                    "priority": getattr(t, "priority", "MEDIUM"),
                    "assigned_to": t.assigned_to,
                    "task_type": t.task_type,
                    "due_date": _safe_iso(t.due_date),
                    "is_overdue": bool(t.due_date and t.due_date < now),
                }
                for t in urgent_tasks
            ],
            "recent_activity": recent_activity,
            "recent_tasks": recent_tasks,
        }
    finally:
        db.close()