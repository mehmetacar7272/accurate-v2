from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class Protocol(Base):
    __tablename__ = "protocols_v2"

    id = Column(Integer, primary_key=True, index=True)
    protocol_no = Column(String(120), nullable=False, index=True)
    offer_id = Column(Integer, ForeignKey("offers_v2.id"), nullable=False, index=True)
    offer_section_id = Column(Integer, ForeignKey("offer_sections_v2.id"), nullable=False, index=True)
    request_id = Column(Integer, nullable=True, index=True)
    customer_name = Column(String(250), nullable=False)
    inspection_location_address = Column(Text, nullable=True)
    source_request_no = Column(String(120), nullable=True)
    inspection_type_code = Column(String(100), nullable=False)
    inspection_type_name = Column(String(255), nullable=False)
    status = Column(String(30), nullable=False, default="DRAFT", index=True)
    revision_no = Column(Integer, nullable=False, default=0)
    is_current = Column(Boolean, nullable=False, default=True, index=True)
    offer_snapshot_json = Column(Text, nullable=False, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    tests = relationship("ProtocolTest", back_populates="protocol", cascade="all, delete-orphan", order_by="ProtocolTest.display_order.asc(), ProtocolTest.id.asc()")


class ProtocolTest(Base):
    __tablename__ = "protocol_tests_v2"

    id = Column(Integer, primary_key=True, index=True)
    protocol_id = Column(Integer, ForeignKey("protocols_v2.id"), nullable=False, index=True)
    test_code = Column(String(100), nullable=False)
    test_name = Column(String(255), nullable=False)
    is_required = Column(Boolean, nullable=False, default=True)
    is_selected = Column(Boolean, nullable=False, default=True)
    display_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    protocol = relationship("Protocol", back_populates="tests")
