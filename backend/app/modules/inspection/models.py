from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class InspectionDefinition(Base):
    __tablename__ = "inspection_definitions_v2"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    short_name = Column(String(100), nullable=True)
    description = Column(Text, default="", nullable=False)
    category_code = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    is_request_enabled = Column(Boolean, default=True, nullable=False)
    is_offer_enabled = Column(Boolean, default=True, nullable=False)
    is_protocol_enabled = Column(Boolean, default=True, nullable=False)
    is_work_order_enabled = Column(Boolean, default=True, nullable=False)
    is_report_enabled = Column(Boolean, default=True, nullable=False)
    display_order = Column(Integer, default=0, nullable=False)
    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    versions = relationship("InspectionDefinitionVersion", back_populates="definition", cascade="all, delete-orphan")


class InspectionDefinitionVersion(Base):
    __tablename__ = "inspection_definition_versions_v2"

    id = Column(Integer, primary_key=True, index=True)
    inspection_definition_id = Column(Integer, ForeignKey("inspection_definitions_v2.id"), nullable=False, index=True)
    version_no = Column(Integer, nullable=False, default=1)
    version_label = Column(String(100), nullable=True)
    status = Column(String(30), nullable=False, default="APPROVED", index=True)
    change_reason = Column(Text, default="", nullable=False)
    is_current = Column(Boolean, default=False, nullable=False, index=True)
    effective_from = Column(DateTime, nullable=True)
    effective_to = Column(DateTime, nullable=True)
    created_by = Column(Integer, nullable=True)
    approved_by = Column(Integer, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    definition = relationship("InspectionDefinition", back_populates="versions")
    sections = relationship("InspectionFormSection", back_populates="definition_version", cascade="all, delete-orphan")
    fields = relationship("InspectionFormField", back_populates="definition_version", cascade="all, delete-orphan")
    tests = relationship("InspectionTestDefinition", back_populates="definition_version", cascade="all, delete-orphan")


class InspectionFormSection(Base):
    __tablename__ = "inspection_form_sections_v2"

    id = Column(Integer, primary_key=True, index=True)
    inspection_definition_version_id = Column(Integer, ForeignKey("inspection_definition_versions_v2.id"), nullable=False, index=True)
    code = Column(String(100), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, default="", nullable=False)
    display_order = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    definition_version = relationship("InspectionDefinitionVersion", back_populates="sections")
    fields = relationship("InspectionFormField", back_populates="section")


class InspectionFormField(Base):
    __tablename__ = "inspection_form_fields_v2"

    id = Column(Integer, primary_key=True, index=True)
    inspection_definition_version_id = Column(Integer, ForeignKey("inspection_definition_versions_v2.id"), nullable=False, index=True)
    section_id = Column(Integer, ForeignKey("inspection_form_sections_v2.id"), nullable=True, index=True)
    code = Column(String(100), nullable=False)
    label = Column(String(200), nullable=False)
    field_type = Column(String(50), nullable=False)
    is_required = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_readonly = Column(Boolean, default=False, nullable=False)
    is_customer_visible = Column(Boolean, default=True, nullable=False)
    is_internal_visible = Column(Boolean, default=True, nullable=False)
    placeholder = Column(Text, nullable=True)
    help_text = Column(Text, nullable=True)
    default_value = Column(Text, nullable=True)
    display_order = Column(Integer, default=0, nullable=False)
    column_span = Column(Integer, default=12, nullable=False)
    validation_rules_json = Column(Text, default="{}", nullable=False)
    ui_props_json = Column(Text, default="{}", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    definition_version = relationship("InspectionDefinitionVersion", back_populates="fields")
    section = relationship("InspectionFormSection", back_populates="fields")
    options = relationship("InspectionFieldOption", back_populates="field", cascade="all, delete-orphan")
    table_columns = relationship("InspectionFieldTableColumn", back_populates="field", cascade="all, delete-orphan")


class InspectionFieldOption(Base):
    __tablename__ = "inspection_field_options_v2"

    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("inspection_form_fields_v2.id"), nullable=False, index=True)
    option_code = Column(String(100), nullable=False)
    option_label = Column(String(200), nullable=False)
    option_value = Column(String(200), nullable=True)
    display_order = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    field = relationship("InspectionFormField", back_populates="options")


class InspectionFieldTableColumn(Base):
    __tablename__ = "inspection_field_table_columns_v2"

    id = Column(Integer, primary_key=True, index=True)
    field_id = Column(Integer, ForeignKey("inspection_form_fields_v2.id"), nullable=False, index=True)
    code = Column(String(100), nullable=False)
    label = Column(String(200), nullable=False)
    column_type = Column(String(50), nullable=False)
    is_required = Column(Boolean, default=False, nullable=False)
    display_order = Column(Integer, default=0, nullable=False)
    validation_rules_json = Column(Text, default="{}", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    field = relationship("InspectionFormField", back_populates="table_columns")


class InspectionTestDefinition(Base):
    __tablename__ = "inspection_test_definitions_v2"

    id = Column(Integer, primary_key=True, index=True)
    inspection_definition_version_id = Column(Integer, ForeignKey("inspection_definition_versions_v2.id"), nullable=False, index=True)
    test_code = Column(String(100), nullable=False)
    test_name = Column(String(250), nullable=False)
    short_name = Column(String(150), nullable=True)
    description = Column(Text, default="", nullable=False)
    standard_reference = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_required_by_default = Column(Boolean, default=False, nullable=False)
    is_customer_selectable = Column(Boolean, default=True, nullable=False)
    display_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    definition_version = relationship("InspectionDefinitionVersion", back_populates="tests")
