from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class Request(Base):
    __tablename__ = 'requests_v2'

    id = Column(Integer, primary_key=True, index=True)
    request_no = Column(String(100), unique=True, nullable=False, index=True)

    customer_id = Column(Integer, nullable=True, index=True)
    customer_branch_id = Column(Integer, nullable=True, index=True)
    customer_contact_id = Column(Integer, nullable=True, index=True)

    customer_name = Column(String(250), nullable=False)
    customer_trade_name = Column(String(250), nullable=True)
    customer_address = Column(Text, nullable=True)
    inspection_location_address = Column(Text, nullable=True)
    contact_person_name = Column(String(200), nullable=True)
    contact_person_title = Column(String(200), nullable=True)
    phone = Column(String(100), nullable=True)
    fax = Column(String(100), nullable=True)
    email = Column(String(200), nullable=True)
    invoice_name = Column(String(250), nullable=True)
    tax_office = Column(String(200), nullable=True)
    tax_number = Column(String(100), nullable=True)
    national_id_number = Column(String(50), nullable=True)
    requested_inspection_date = Column(String(50), nullable=True)
    general_notes = Column(Text, default='', nullable=False)

    request_status = Column(String(30), default='DRAFT', nullable=False, index=True)
    evaluation_status = Column(String(30), default='PENDING', nullable=False, index=True)
    proposal_no = Column(String(100), nullable=True)

    root_id = Column(Integer, nullable=True, index=True)
    revision_no = Column(Integer, default=0, nullable=False)
    revision_status = Column(String(30), default='APPROVED', nullable=False, index=True)
    is_current = Column(Boolean, default=True, nullable=False, index=True)
    revision_reason = Column(Text, nullable=True)
    parent_revision_id = Column(Integer, nullable=True)
    source_module = Column(String(50), nullable=True)
    source_root_id = Column(Integer, nullable=True)
    source_revision_id = Column(Integer, nullable=True)
    approved_by = Column(Integer, nullable=True)
    approved_at = Column(DateTime, nullable=True)
    superseded_at = Column(DateTime, nullable=True)
    revision_created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    created_by = Column(Integer, nullable=True)
    updated_by = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    lines = relationship('RequestInspectionLine', back_populates='request', cascade='all, delete-orphan')
    evaluations = relationship('RequestEvaluation', back_populates='request', cascade='all, delete-orphan')


class RequestInspectionLine(Base):
    __tablename__ = 'request_inspection_lines_v2'

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey('requests_v2.id'), nullable=False, index=True)
    inspection_definition_id = Column(Integer, nullable=False, index=True)
    inspection_definition_version_id = Column(Integer, nullable=True, index=True)
    inspection_type_id = Column(Integer, nullable=True, index=True)
    inspection_type_code = Column(String(100), nullable=False)
    inspection_type_name_snapshot = Column(String(250), nullable=False)
    is_selected = Column(Boolean, default=True, nullable=False)
    line_order = Column(Integer, default=0, nullable=False)
    requested_scope_note = Column(Text, default='', nullable=False)
    schema_version = Column(String(100), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    request = relationship('Request', back_populates='lines')
    payloads = relationship('RequestInspectionPayload', back_populates='line', cascade='all, delete-orphan')
    test_requests = relationship('RequestTestRequest', back_populates='line', cascade='all, delete-orphan')


class RequestInspectionPayload(Base):
    __tablename__ = 'request_inspection_payloads_v2'

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey('requests_v2.id'), nullable=False, index=True)
    request_inspection_line_id = Column(Integer, ForeignKey('request_inspection_lines_v2.id'), nullable=False, index=True)
    inspection_definition_id = Column(Integer, nullable=False, index=True)
    inspection_definition_version_id = Column(Integer, nullable=True, index=True)
    inspection_type_code = Column(String(100), nullable=False)
    schema_version = Column(String(100), nullable=True)
    payload_json = Column(Text, default='{}', nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    line = relationship('RequestInspectionLine', back_populates='payloads')


class RequestTestRequest(Base):
    __tablename__ = 'request_test_requests_v2'

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey('requests_v2.id'), nullable=False, index=True)
    request_inspection_line_id = Column(Integer, ForeignKey('request_inspection_lines_v2.id'), nullable=False, index=True)
    inspection_test_definition_id = Column(Integer, nullable=True, index=True)
    inspection_test_id = Column(Integer, nullable=True, index=True)
    test_code = Column(String(100), nullable=False)
    test_name_snapshot = Column(String(250), nullable=False)
    standard_reference_snapshot = Column(Text, nullable=True)
    is_requested = Column(Boolean, default=False, nullable=False)
    request_note = Column(Text, default='', nullable=False)
    display_order = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    line = relationship('RequestInspectionLine', back_populates='test_requests')


class RequestEvaluation(Base):
    __tablename__ = 'request_evaluations_v2'

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(Integer, ForeignKey('requests_v2.id'), nullable=False, index=True)
    request_inspection_line_id = Column(Integer, ForeignKey('request_inspection_lines_v2.id'), nullable=False, index=True)
    inspection_test_definition_id = Column(Integer, nullable=True, index=True)
    test_code = Column(String(100), nullable=True)
    test_name_snapshot = Column(String(250), nullable=True)
    suitability_status = Column(String(30), default='PENDING', nullable=False)
    unsuitable_reason = Column(Text, nullable=True)
    evaluation_note = Column(Text, nullable=True)
    evaluated_by = Column(Integer, nullable=True)
    evaluated_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    request = relationship('Request', back_populates='evaluations')
