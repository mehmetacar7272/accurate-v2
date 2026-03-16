from __future__ import annotations

from datetime import datetime

from app.core.database import SessionLocal
from app.modules.operations.definition_seed import seed_inspection_definitions
from app.modules.operations.models import InspectionType, InspectionTypeTest

# Optional v2 imports. These may not exist in older project states.
try:
    from app.modules.inspection.models import (
        InspectionDefinition,
        InspectionDefinitionVersion,
        InspectionFormSection,
        InspectionFormField,
        InspectionTestDefinition,
    )
    V2_AVAILABLE = True
except Exception:
    InspectionDefinition = None
    InspectionDefinitionVersion = None
    InspectionFormSection = None
    InspectionFormField = None
    InspectionTestDefinition = None
    V2_AVAILABLE = False

DEFAULT_DEFINITIONS = [
    ("CLEANROOM_HVAC", "Temiz Oda HVAC/LAF Kalifikasyonu", "HVAC"),
    ("HOSPITAL_HVAC", "Hastane Hijyenik Alan HVAC Kalifikasyonu", "HVAC"),
    ("TEMP_HUMIDITY_MAPPING", "Sıcaklık/Nem Haritalama", "HARITALAMA"),
    ("AUTOCLAVE", "Otoklav Kalifikasyonu", "STERİLİZASYON"),
    ("BSC", "Biyogüvenlik Kabini Kalifikasyonu", "KABİN"),
    ("EO", "Etilen Oksit Sterilizasyon Kalifikasyonu", "STERİLİZASYON"),
    ("DRY_HEAT", "Kuru Hava Sterilizasyon Kalifikasyonu", "STERİLİZASYON"),
    ("FUME_HOOD", "Çeker Ocak Performans Kalifikasyonu", "LABORATUVAR"),
    ("BIOCONTAMINATION", "Biyokontaminasyon Muayenesi", "MİKROBİYOLOJİ"),
    ("DUCT_LEAK", "Kanal Kaçak Testi", "HVAC"),
]

DEFAULT_SCHEMA_FIELDS = [
    ("REQUEST_SUMMARY", "Talep Özeti", 1, [
        ("requested_inspection_date", "Talep Edilen Muayene Tarihi", "date", True),
        ("requested_scope_note", "Talep Açıklaması", "textarea", False),
    ]),
    ("OTHER_NOTES", "Diğer Talepler ve Notlar", 2, [
        ("other_requests", "Diğer Talepler", "textarea", False),
        ("special_notes", "Özel Talep ve Notlar", "textarea", False),
    ]),
]

DEFAULT_TESTS = {
    "CLEANROOM_HVAC": [
        ("UNIDIRECTIONAL_AIR_VELOCITY", "Tek yönlü hava akış hızı ve aynılık testi (LAF)"),
        ("AIR_VELOCITY_TOTAL_FLOW", "Türbülanslı sistemler hava hızı ve debisi"),
        ("PRESSURE_DIFFERENCE", "Mahaller arası basınç farkı testi"),
        ("PARTICLE_COUNTING", "Partikül sayımı ve temiz alanın sınıflandırılması"),
    ],
    "HOSPITAL_HVAC": [
        ("LTF_ULF_AIR_VELOCITY", "Düşük Türbülanslı/Tek taraflı hava akış hızı ve aynılık testi"),
        ("PRESSURE_DIFFERENCE", "Mahaller arası basınç farkı testi"),
        ("PARTICLE_COUNTING", "Partikül sayımı ve temiz alanın sınıflandırılması"),
    ],
}


def seed_request_definitions():
    """Backward-compatible seed used by the existing inspection router."""
    seed_inspection_definitions()
    return {"ok": True}



def list_request_definitions():
    """Backward-compatible list used by step2/step3 request pages."""
    db = SessionLocal()
    try:
        items = (
            db.query(InspectionType)
            .filter(InspectionType.is_active == True)
            .order_by(InspectionType.sort_order.asc(), InspectionType.id.asc())
            .all()
        )
        result = []
        for item in items:
            tests = (
                db.query(InspectionTypeTest)
                .filter(
                    InspectionTypeTest.inspection_type_id == item.id,
                    InspectionTypeTest.is_active == True,
                )
                .order_by(InspectionTypeTest.sort_order.asc(), InspectionTypeTest.id.asc())
                .all()
            )
            result.append(
                {
                    "id": item.id,
                    "code": item.code,
                    "name": item.name,
                    "category": item.category,
                    "version_no": item.version_no,
                    "tests": [
                        {
                            "id": link.inspection_test.id if link.inspection_test else None,
                            "code": link.inspection_test.code if link.inspection_test else (link.display_name_override or "UNKNOWN"),
                            "name": link.display_name_override or (link.inspection_test.name if link.inspection_test else "Test"),
                            "is_required": link.is_required,
                            "is_default_selected": link.is_default_selected,
                            "sort_order": link.sort_order,
                        }
                        for link in tests
                    ],
                }
            )
        return result
    finally:
        db.close()



def seed_inspection_definitions_v2() -> dict:
    """Optional v2 seed used by later steps. Safe no-op when v2 models are absent."""
    if not V2_AVAILABLE:
        return {"created_definitions": 0, "skipped": True}

    db = SessionLocal()
    created = 0
    try:
        for order, (code, name, category) in enumerate(DEFAULT_DEFINITIONS, start=1):
            existing = db.query(InspectionDefinition).filter(InspectionDefinition.code == code).first()
            if existing:
                continue
            definition = InspectionDefinition(
                code=code,
                name=name,
                category_code=category,
                display_order=order,
                is_active=True,
                is_request_enabled=True,
            )
            db.add(definition)
            db.flush()

            version = InspectionDefinitionVersion(
                inspection_definition_id=definition.id,
                version_no=1,
                version_label="v1",
                status="APPROVED",
                is_current=True,
                effective_from=datetime.utcnow(),
                approved_at=datetime.utcnow(),
            )
            db.add(version)
            db.flush()

            for section_code, title, display_order, fields in DEFAULT_SCHEMA_FIELDS:
                section = InspectionFormSection(
                    inspection_definition_version_id=version.id,
                    code=section_code,
                    title=title,
                    display_order=display_order,
                )
                db.add(section)
                db.flush()
                for field_order, (field_code, label, field_type, is_required) in enumerate(fields, start=1):
                    db.add(
                        InspectionFormField(
                            inspection_definition_version_id=version.id,
                            section_id=section.id,
                            code=field_code,
                            label=label,
                            field_type=field_type,
                            is_required=is_required,
                            display_order=field_order,
                        )
                    )

            for test_order, test_tuple in enumerate(DEFAULT_TESTS.get(code, []), start=1):
                test_code, test_name = test_tuple
                db.add(
                    InspectionTestDefinition(
                        inspection_definition_version_id=version.id,
                        test_code=test_code,
                        test_name=test_name,
                        display_order=test_order,
                    )
                )

            created += 1
        db.commit()
        return {"created_definitions": created, "skipped": False}
    finally:
        db.close()
