from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class QualityDocumentCategory(Base):
    __tablename__ = "quality_document_categories"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(100), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    documents = relationship("QualityDocument", back_populates="category")


class QualityDocument(Base):
    __tablename__ = "quality_documents"

    id = Column(Integer, primary_key=True, index=True)
    category_id = Column(
        Integer,
        ForeignKey("quality_document_categories.id"),
        nullable=False,
        index=True,
    )
    document_no = Column(String(100), unique=True, nullable=False, index=True)
    document_name = Column(String(500), nullable=False)
    document_type = Column(String(100), nullable=True)
    department = Column(String(255), nullable=True)
    first_publish_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    category = relationship("QualityDocumentCategory", back_populates="documents")
    revisions = relationship(
        "QualityDocumentRevision",
        back_populates="document",
        cascade="all, delete-orphan",
    )
    distribution_rules = relationship(
        "QualityDocumentDistributionRule",
        back_populates="document",
        cascade="all, delete-orphan",
    )


class QualityDocumentRevision(Base):
    __tablename__ = "quality_document_revisions"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(
        Integer,
        ForeignKey("quality_documents.id"),
        nullable=False,
        index=True,
    )
    revision_no = Column(String(50), nullable=False)
    revision_date = Column(DateTime, nullable=True)
    effective_date = Column(DateTime, nullable=True)
    last_review_date = Column(DateTime, nullable=True)
    change_summary = Column(Text, default="", nullable=False)
    notes = Column(Text, default="", nullable=False)
    distribution_text = Column(Text, default="", nullable=False)
    file_path = Column(String(1000), nullable=True)
    status = Column(String(50), nullable=False, default="DRAFT", index=True)
    published_by = Column(String(255), nullable=True)
    published_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    document = relationship("QualityDocument", back_populates="revisions")
    notification_logs = relationship(
        "QualityDocumentNotificationLog",
        back_populates="document_revision",
        cascade="all, delete-orphan",
    )


class QualityDocumentDistributionRule(Base):
    __tablename__ = "quality_document_distribution_rules"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(
        Integer,
        ForeignKey("quality_documents.id"),
        nullable=False,
        index=True,
    )
    target_type = Column(String(50), nullable=False)  # ROLE / USER / GROUP / ALL_ACTIVE_PERSONNEL
    target_value = Column(String(255), nullable=False, default="")
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    document = relationship("QualityDocument", back_populates="distribution_rules")


class QualityDocumentNotificationLog(Base):
    __tablename__ = "quality_document_notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    document_revision_id = Column(
        Integer,
        ForeignKey("quality_document_revisions.id"),
        nullable=False,
        index=True,
    )
    recipient_email = Column(String(255), nullable=False, default="")
    recipient_name = Column(String(255), nullable=False, default="")
    delivery_channel = Column(String(50), nullable=False, default="EMAIL")
    delivery_status = Column(String(50), nullable=False, default="PENDING", index=True)
    sent_at = Column(DateTime, nullable=True)
    error_message = Column(Text, default="", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    document_revision = relationship(
        "QualityDocumentRevision",
        back_populates="notification_logs",
    )