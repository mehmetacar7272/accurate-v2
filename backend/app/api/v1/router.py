from fastapi import APIRouter

from app.api.v1 import auth, customers, dashboard, inspection, offers, operations, protocols, quality, requests

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(operations.router, tags=["operations"])
api_router.include_router(quality.router, tags=["quality"])
api_router.include_router(inspection.router, tags=["inspection"])
api_router.include_router(requests.router, tags=["requests"])
api_router.include_router(offers.router, tags=["offers"])
api_router.include_router(protocols.router, tags=["protocols"])

api_router.include_router(customers.router, tags=["customers"])
