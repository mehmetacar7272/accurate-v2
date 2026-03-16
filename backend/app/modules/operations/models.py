from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class OperationFormDefinition(Base):
    __tablename__ = "operation_form_definitions"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    revisions = relationship("OperationFormRevision", back_populates="form")


class OperationFormRevision(Base):
    __tablename__ = "operation_form_revisions"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(
        Integer,
        ForeignKey("operation_form_definitions.id"),
        nullable=False,
        index=True,
    )
    revision_no = Column(Integer, nullable=False, default=0)
    revision_note = Column(Text, default="", nullable=False)
    published = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    form = relationship("OperationFormDefinition", back_populates="revisions")
    fields = relationship("OperationFormField", back_populates="revision")


class OperationFormField(Base):
    __tablename__ = "operation_form_fields"

    id = Column(Integer, primary_key=True, index=True)
    revision_id = Column(
        Integer,
        ForeignKey("operation_form_revisions.id"),
        nullable=False,
        index=True,
    )
    field_key = Column(String(100), nullable=False)
    field_label = Column(String(255), nullable=False)
    field_type = Column(String(50), nullable=False)
    required = Column(Boolean, default=False, nullable=False)
    order_no = Column(Integer, default=0, nullable=False)

    revision = relationship("OperationFormRevision", back_populates="fields")


class OperationTask(Base):
    __tablename__ = "operation_tasks"

    id = Column(Integer, primary_key=True, index=True)
    form_id = Column(Integer, nullable=True, index=True)
    revision_id = Column(Integer, nullable=True, index=True)

    title = Column(String(255), nullable=False, default="Operasyon Görevi")
    description = Column(Text, nullable=True)

    task_type = Column(String(50), nullable=False, default="MANUAL")
    status = Column(String(50), nullable=False, default="PENDING", index=True)
    priority = Column(String(20), nullable=False, default="MEDIUM")

    assigned_to = Column(String(255), nullable=False, default="")
    due_date = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    completed_at = Column(DateTime, nullable=True)

    is_deleted = Column(Boolean, nullable=False, default=False, index=True)
    deleted_at = Column(DateTime, nullable=True)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    logs = relationship(
        "OperationTaskLog",
        primaryjoin="OperationTask.id == foreign(OperationTaskLog.task_id)",
        order_by="desc(OperationTaskLog.created_at)",
        viewonly=True,
    )


class OperationTaskLog(Base):
    __tablename__ = "operation_task_logs"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, nullable=False, index=True)
    action = Column(String(100), nullable=False)
    note = Column(Text, default="", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class InspectionType(Base):
    __tablename__ = "inspection_types"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    category = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    sort_order = Column(Integer, default=0, nullable=False)
    version_no = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    test_links = relationship(
        "InspectionTypeTest",
        back_populates="inspection_type",
        cascade="all, delete-orphan",
    )


class InspectionTest(Base):
    __tablename__ = "inspection_tests"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    short_name = Column(String(255), nullable=True)
    description = Column(Text, default="", nullable=False)
    unit_label = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    sort_order = Column(Integer, default=0, nullable=False)
    version_no = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    type_links = relationship(
        "InspectionTypeTest",
        back_populates="inspection_test",
        cascade="all, delete-orphan",
    )


class InspectionTypeTest(Base):
    __tablename__ = "inspection_type_tests"

    id = Column(Integer, primary_key=True, index=True)
    inspection_type_id = Column(
        Integer,
        ForeignKey("inspection_types.id"),
        nullable=False,
        index=True,
    )
    inspection_test_id = Column(
        Integer,
        ForeignKey("inspection_tests.id"),
        nullable=False,
        index=True,
    )
    is_required = Column(Boolean, default=False, nullable=False)
    is_default_selected = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    sort_order = Column(Integer, default=0, nullable=False)
    display_name_override = Column(String(255), nullable=True)
    notes = Column(Text, default="", nullable=False)
    version_no = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    inspection_type = relationship("InspectionType", back_populates="test_links")
    inspection_test = relationship("InspectionTest", back_populates="type_links")


class DefinitionTextTemplate(Base):
    __tablename__ = "definition_text_templates"

    id = Column(Integer, primary_key=True, index=True)
    template_type = Column(String(100), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    body_text = Column(Text, default="", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    version_no = Column(Integer, default=1, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )


class DefinitionSnapshot(Base):
    __tablename__ = "definition_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    entity_type = Column(String(50), nullable=False, index=True)
    entity_id = Column(Integer, nullable=False, index=True)
    definition_version_summary = Column(String(255), nullable=False, default="")
    snapshot_json = Column(Text, nullable=False, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)