from app.modules.operations.services import (
    attach_test_to_type,
    create_inspection_test,
    create_inspection_type,
    create_text_template,
    list_inspection_tests,
    list_inspection_types,
    list_text_templates,
)


def _type_by_code(code: str):
    items = list_inspection_types(active_only=False)
    return next((item for item in items if item.code == code), None)


def _test_by_code(code: str):
    items = list_inspection_tests(active_only=False)
    return next((item for item in items if item.code == code), None)


def seed_inspection_definitions():
    inspection_types = [
        ("CLEAN_ROOM", "Temiz Oda Muayenesi", "AREA", 10),
        ("HYGIENIC_AREA", "Hastane Hijyenik Alan Muayenesi", "AREA", 20),
        ("TEMPERATURE_HUMIDITY_MAPPING", "Sıcaklık/Nem Haritalama", "MAPPING", 30),
        ("AUTOCLAVE", "Otoklav Muayenesi", "DEVICE", 40),
        ("BSC", "Biyogüvenlik Kabini Muayenesi", "DEVICE", 50),
        ("DRY_HEAT_STERILIZER", "Kuru Hava Sterilizatörü Muayenesi", "DEVICE", 60),
        ("EO_STERILIZATION", "Etilen Oksit Sterilizasyon Muayenesi", "DEVICE", 70),
        ("FUME_HOOD", "Çeker Ocak Muayenesi", "DEVICE", 80),
        ("BIOCONTAMINATION", "Biyokontaminasyon Muayenesi", "BIO", 90),
        ("DUCT_LEAKAGE", "Kanal Sızdırmazlık Testi", "DUCT", 100),
        ("LAF", "LAF Muayenesi", "AREA", 110),
    ]

    for code, name, category, sort_order in inspection_types:
        if not _type_by_code(code):
            create_inspection_type(
                code=code,
                name=name,
                category=category,
                sort_order=sort_order,
            )

    inspection_tests = [
        ("AIRFLOW_VELOCITY", "Hava Akış Hızı Testi", 10),
        ("HEPA_LEAK", "Filtre Sızdırmazlık Testi", 20),
        ("PRESSURE_DIFF", "Basınç Farkı Testi", 30),
        ("TEMP_HUMIDITY", "Sıcaklık/Nem Testi", 40),
        ("AIRFLOW_VISUALIZATION", "Hava Akış Yönü Karakteristiği Testi", 50),
        ("RECOVERY", "Geri Kazanım Testi", 60),
        ("PARTICLE_COUNT", "Partikül Sayımı Testi", 70),
        ("ALARM_FUNCTION", "Alarm Fonksiyonları Testi", 80),
    ]

    for code, name, sort_order in inspection_tests:
        if not _test_by_code(code):
            create_inspection_test(
                code=code,
                name=name,
                sort_order=sort_order,
            )

    mappings = [
        ("CLEAN_ROOM", "AIRFLOW_VELOCITY", True, True, 10),
        ("CLEAN_ROOM", "HEPA_LEAK", False, False, 20),
        ("CLEAN_ROOM", "PRESSURE_DIFF", True, True, 30),
        ("CLEAN_ROOM", "TEMP_HUMIDITY", True, True, 40),
        ("CLEAN_ROOM", "AIRFLOW_VISUALIZATION", False, False, 50),
        ("CLEAN_ROOM", "RECOVERY", False, False, 60),
        ("CLEAN_ROOM", "PARTICLE_COUNT", True, True, 70),

        ("HYGIENIC_AREA", "AIRFLOW_VELOCITY", True, True, 10),
        ("HYGIENIC_AREA", "HEPA_LEAK", False, False, 20),
        ("HYGIENIC_AREA", "PRESSURE_DIFF", True, True, 30),
        ("HYGIENIC_AREA", "TEMP_HUMIDITY", True, True, 40),
        ("HYGIENIC_AREA", "AIRFLOW_VISUALIZATION", False, False, 50),
        ("HYGIENIC_AREA", "RECOVERY", False, False, 60),
        ("HYGIENIC_AREA", "PARTICLE_COUNT", True, True, 70),

        ("LAF", "AIRFLOW_VELOCITY", True, True, 10),
        ("LAF", "HEPA_LEAK", False, False, 20),
        ("LAF", "PARTICLE_COUNT", False, False, 30),

        ("BSC", "ALARM_FUNCTION", True, True, 10),
        ("BSC", "AIRFLOW_VELOCITY", True, True, 20),
        ("BSC", "HEPA_LEAK", False, False, 30),
        ("BSC", "PRESSURE_DIFF", False, False, 40),
        ("BSC", "AIRFLOW_VISUALIZATION", False, False, 50),
        ("BSC", "PARTICLE_COUNT", False, False, 60),
    ]

    for type_code, test_code, is_required, is_default_selected, sort_order in mappings:
        inspection_type = _type_by_code(type_code)
        inspection_test = _test_by_code(test_code)
        if inspection_type and inspection_test:
            attach_test_to_type(
                inspection_type_id=inspection_type.id,
                inspection_test_id=inspection_test.id,
                is_required=is_required,
                is_default_selected=is_default_selected,
                sort_order=sort_order,
            )

    existing_templates = list_text_templates(active_only=False)
    has_personnel_declaration = any(
        item.template_type == "WORK_ORDER_PERSONNEL_DECLARATION"
        for item in existing_templates
    )

    if not has_personnel_declaration:
        create_text_template(
            template_type="WORK_ORDER_PERSONNEL_DECLARATION",
            title="İş Emri Personel Taahhüt Metni",
            body_text=(
                "Yukarıda belirtilen tüm şartları okudum. "
                "Atmış olduğum imza ile şartları teyit ediyorum."
            ),
        )