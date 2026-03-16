from fastapi import APIRouter, HTTPException

from app.modules.protocol.services import get_protocol_detail, list_protocols, update_protocol_status

router = APIRouter(prefix="/protocols")


@router.get("")
def get_protocols():
    return {"items": list_protocols()}


@router.get("/{protocol_id}")
def get_protocol(protocol_id: int):
    try:
        return get_protocol_detail(protocol_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{protocol_id}/approve")
def post_protocol_approve(protocol_id: int):
    try:
        return update_protocol_status(protocol_id, "APPROVED")
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "bulunamadı" in message.lower() else 400
        raise HTTPException(status_code=status_code, detail=message) from exc


@router.post("/{protocol_id}/cancel")
def post_protocol_cancel(protocol_id: int):
    try:
        return update_protocol_status(protocol_id, "CANCELLED")
    except ValueError as exc:
        message = str(exc)
        status_code = 404 if "bulunamadı" in message.lower() else 400
        raise HTTPException(status_code=status_code, detail=message) from exc
