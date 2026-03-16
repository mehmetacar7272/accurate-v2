from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class Offer(Base):
    __tablename__ = "offers_v2"

    id = Column(Integer, primary_key=True, index=True)
    offer_no = Column(String(100), nullable=False, index=True)
    title = Column(String(255), nullable=False, default="Teklif Taslağı")
    customer_name = Column(String(250), nullable=False)
    inspection_location_address = Column(Text, nullable=True)
    requested_inspection_date = Column(String(50), nullable=True)
    status = Column(String(30), nullable=False, default="DRAFT", index=True)

    root_id = Column(Integer, nullable=True, index=True)
    revision_no = Column(Integer, nullable=False, default=0)
    revision_status = Column(String(30), nullable=False, default="DRAFT", index=True)
    is_current = Column(Boolean, nullable=False, default=True, index=True)
    revision_reason = Column(Text, nullable=True)
    parent_revision_id = Column(Integer, nullable=True)

    source_request_root_id = Column(Integer, nullable=False, index=True)
    source_request_revision_id = Column(Integer, nullable=False, index=True)
    source_request_no = Column(String(100), nullable=False)
    request_snapshot_json = Column(Text, nullable=False, default="{}")
    subtotal_amount = Column(Numeric(12, 2), nullable=False, default=0)
    grand_total = Column(Numeric(12, 2), nullable=False, default=0)
    currency = Column(String(10), nullable=False, default='TRY')
    vat_rate = Column(Numeric(8, 2), nullable=False, default=0)
    vat_amount = Column(Numeric(12, 2), nullable=False, default=0)
    grand_total_with_vat = Column(Numeric(12, 2), nullable=False, default=0)
    estimated_days = Column(Integer, nullable=True)
    extra_day_fee = Column(Numeric(12, 2), nullable=False, default=0)
    authorized_person_name = Column(String(255), nullable=True)
    approved_offer_file_path = Column(Text, nullable=True)
    approved_offer_file_name = Column(String(255), nullable=True)
    approved_offer_uploaded_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    links = relationship("RequestOfferLink", back_populates="offer", cascade="all, delete-orphan")
    sections = relationship("OfferSection", back_populates="offer", cascade="all, delete-orphan", order_by="OfferSection.section_no.asc(), OfferSection.id.asc()")


class OfferSection(Base):
    __tablename__ = "offer_sections_v2"

    id = Column(Integer, primary_key=True, index=True)
    offer_id = Column(Integer, ForeignKey("offers_v2.id"), nullable=False, index=True)
    section_no = Column(Integer, nullable=False, default=1)
    inspection_type_code = Column(String(100), nullable=False, default="GENERAL")
    inspection_type_name = Column(String(255), nullable=False, default="Muayene")
    title = Column(String(255), nullable=False)
    section_snapshot_json = Column(Text, nullable=False, default="{}")
    service_price = Column(Numeric(12, 2), nullable=False, default=0)
    travel_price = Column(Numeric(12, 2), nullable=False, default=0)
    report_price = Column(Numeric(12, 2), nullable=False, default=0)
    subtotal = Column(Numeric(12, 2), nullable=False, default=0)
    estimated_days = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    offer = relationship("Offer", back_populates="sections")
    tests = relationship("OfferSectionTest", back_populates="section", cascade="all, delete-orphan", order_by="OfferSectionTest.display_order.asc(), OfferSectionTest.id.asc()")


class OfferSectionTest(Base):
    __tablename__ = "offer_section_tests_v2"

    id = Column(Integer, primary_key=True, index=True)
    offer_section_id = Column(Integer, ForeignKey("offer_sections_v2.id"), nullable=False, index=True)
    test_code = Column(String(100), nullable=False)
    test_name = Column(String(255), nullable=False)
    is_requested = Column(Boolean, nullable=False, default=True)
    display_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    section = relationship("OfferSection", back_populates="tests")


class RequestOfferLink(Base):
    __tablename__ = "request_offer_links_v2"

    id = Column(Integer, primary_key=True, index=True)
    request_root_id = Column(Integer, nullable=False, index=True)
    request_revision_id = Column(Integer, nullable=False, index=True)
    offer_root_id = Column(Integer, nullable=False, index=True)
    offer_revision_id = Column(Integer, ForeignKey("offers_v2.id"), nullable=False, index=True)
    link_type = Column(String(50), nullable=False, default="GENERATED_DRAFT")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    offer = relationship("Offer", back_populates="links")
