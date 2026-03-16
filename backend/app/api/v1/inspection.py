from fastapi import APIRouter

from app.modules.inspection.services import list_request_definitions, seed_request_definitions

router = APIRouter(prefix="/inspection")


@router.post("/seed-request-definitions")
def post_seed_request_definitions():
    return seed_request_definitions()


@router.get("/request-definitions")
def get_request_definitions():
    return {"items": list_request_definitions()}
