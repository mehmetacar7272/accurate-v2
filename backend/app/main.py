from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.database import Base, engine, ensure_runtime_schema_compatibility
from app.modules.inspection.services import seed_inspection_definitions_v2
from app.modules.operations.definition_seed import seed_inspection_definitions
from app.modules.customer import models as customer_models  # noqa: F401
from app.modules.inspection import models as inspection_models  # noqa: F401
from app.modules.offer import models as offer_models  # noqa: F401
from app.modules.offer.services import ensure_offer_template_defaults
from app.modules.operations import models as operations_models  # noqa: F401
from app.modules.protocol import models as protocol_models  # noqa: F401
from app.modules.quality import models as quality_models  # noqa: F401
from app.modules.request import models as request_models  # noqa: F401

app = FastAPI(title="ACCURATE V2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    ensure_runtime_schema_compatibility()


@app.on_event("startup")
def startup_seed_definitions():
    try:
        seed_inspection_definitions()
        print("Inspection definition seed completed")
    except Exception as exc:
        print(f"Inspection definition seed skipped/error: {exc}")


@app.on_event("startup")
def startup_seed_request_definitions():
    try:
        seed_inspection_definitions_v2()
        print("Inspection definition v2 seed completed")
    except Exception as exc:
        print(f"Inspection definition v2 seed skipped/error: {exc}")




@app.on_event("startup")
def startup_seed_offer_templates():
    try:
        ensure_offer_template_defaults()
        print("Offer template defaults ensured")
    except Exception as exc:
        print(f"Offer template defaults skipped/error: {exc}")


@app.get("/health")
def health():
    return {"ok": True, "app": "ACCURATE V2"}


app.include_router(api_router)
