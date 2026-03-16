from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _sqlite_table_columns(table_name: str) -> set[str]:
    inspector = inspect(engine)
    try:
        cols = inspector.get_columns(table_name)
    except Exception:
        return set()
    return {col["name"] for col in cols}


def _ensure_sqlite_columns(table_name: str, column_definitions: dict[str, str]) -> None:
    if not settings.DATABASE_URL.startswith("sqlite"):
        return
    existing = _sqlite_table_columns(table_name)
    if not existing:
        return
    with engine.begin() as conn:
        for column_name, sql_type in column_definitions.items():
            if column_name in existing:
                continue
            conn.execute(text(f"ALTER TABLE {table_name} ADD COLUMN {column_name} {sql_type}"))


def ensure_runtime_schema_compatibility() -> None:

    _ensure_sqlite_columns(
        "offers_v2",
        {
            "subtotal_amount": "NUMERIC(12,2) DEFAULT 0",
            "grand_total": "NUMERIC(12,2) DEFAULT 0",
            "currency": "VARCHAR(10) DEFAULT 'TRY'",
            "vat_rate": "NUMERIC(8,2) DEFAULT 0",
            "vat_amount": "NUMERIC(12,2) DEFAULT 0",
            "grand_total_with_vat": "NUMERIC(12,2) DEFAULT 0",
            "estimated_days": "INTEGER",
            "extra_day_fee": "NUMERIC(12,2) DEFAULT 0",
            "authorized_person_name": "VARCHAR(255)",
            "approved_offer_file_path": "TEXT",
            "approved_offer_file_name": "VARCHAR(255)",
            "approved_offer_uploaded_at": "DATETIME",
        },
    )
    _ensure_sqlite_columns(
        "offer_sections_v2",
        {
            "section_no": "INTEGER DEFAULT 1",
            "inspection_type_code": "VARCHAR(100) DEFAULT 'GENERAL'",
            "inspection_type_name": "VARCHAR(255) DEFAULT 'Muayene'",
            "section_snapshot_json": "TEXT DEFAULT '{}'",
            "service_price": "NUMERIC(12,2) DEFAULT 0",
            "travel_price": "NUMERIC(12,2) DEFAULT 0",
            "report_price": "NUMERIC(12,2) DEFAULT 0",
            "subtotal": "NUMERIC(12,2) DEFAULT 0",
            "estimated_days": "INTEGER",
            "created_at": "DATETIME",
            "updated_at": "DATETIME",
        },
    )
    _ensure_sqlite_columns(
        "offer_section_tests_v2",
        {
            "is_requested": "BOOLEAN DEFAULT 1",
            "display_order": "INTEGER DEFAULT 0",
            "created_at": "DATETIME",
        },
    )
    _ensure_sqlite_columns(
        "protocols_v2",
        {
            "request_id": "INTEGER",
            "customer_name": "VARCHAR(250) DEFAULT ''",
            "inspection_location_address": "TEXT",
            "source_request_no": "VARCHAR(120)",
            "inspection_type_code": "VARCHAR(100) DEFAULT 'GENERAL'",
            "inspection_type_name": "VARCHAR(255) DEFAULT 'Muayene'",
            "status": "VARCHAR(30) DEFAULT 'DRAFT'",
            "revision_no": "INTEGER DEFAULT 0",
            "is_current": "BOOLEAN DEFAULT 1",
            "offer_snapshot_json": "TEXT DEFAULT '{}'",
            "created_at": "DATETIME",
            "updated_at": "DATETIME",
        },
    )
    _ensure_sqlite_columns(
        "protocol_tests_v2",
        {
            "is_required": "BOOLEAN DEFAULT 1",
            "is_selected": "BOOLEAN DEFAULT 1",
            "display_order": "INTEGER DEFAULT 0",
            "created_at": "DATETIME",
        },
    )
    # Request v2 tables can exist from an earlier step with fewer columns.
    _ensure_sqlite_columns(
        "requests_v2",
        {
            "customer_id": "INTEGER",
            "customer_branch_id": "INTEGER",
            "customer_contact_id": "INTEGER",
            "customer_trade_name": "VARCHAR(250)",
            "customer_address": "TEXT",
            "contact_person_title": "VARCHAR(200)",
            "fax": "VARCHAR(100)",
            "invoice_name": "VARCHAR(250)",
            "tax_office": "VARCHAR(200)",
            "tax_number": "VARCHAR(100)",
            "national_id_number": "VARCHAR(50)",
            "general_notes": "TEXT DEFAULT ''",
            "proposal_no": "VARCHAR(100)",
            "source_module": "VARCHAR(50)",
            "source_root_id": "INTEGER",
            "source_revision_id": "INTEGER",
            "approved_by": "INTEGER",
            "created_by": "INTEGER",
            "updated_by": "INTEGER",
        },
    )
    _ensure_sqlite_columns(
        "request_inspection_lines_v2",
        {
            "inspection_type_id": "INTEGER",
            "inspection_definition_id": "INTEGER",
            "inspection_definition_version_id": "INTEGER",
            "schema_version": "VARCHAR(100)",
            "requested_scope_note": "TEXT DEFAULT ''",
        },
    )
    _ensure_sqlite_columns(
        "request_test_requests_v2",
        {
            "inspection_test_id": "INTEGER",
            "inspection_test_definition_id": "INTEGER",
            "standard_reference_snapshot": "TEXT",
            "request_note": "TEXT DEFAULT ''",
        },
    )
    _ensure_sqlite_columns(
        "request_evaluations_v2",
        {
            "inspection_test_definition_id": "INTEGER",
            "evaluation_note": "TEXT",
        },
    )


from app.modules.customer import models as customer_models  # noqa: E402,F401
from app.modules.inspection import models as inspection_models  # noqa: E402,F401
from app.modules.offer import models as offer_models  # noqa: E402,F401
from app.modules.operations import models as operation_models  # noqa: E402,F401
from app.modules.quality import models as quality_models  # noqa: E402,F401
from app.modules.request import models as request_models  # noqa: E402,F401

from app.modules.protocol import models as protocol_models  # noqa: E402,F401
