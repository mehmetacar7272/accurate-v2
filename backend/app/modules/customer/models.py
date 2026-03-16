from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from app.core.database import Base


class Customer(Base):
    __tablename__ = 'customers_v2'

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String(250), nullable=False, index=True)
    trade_name = Column(String(250), nullable=False, index=True)
    tax_office = Column(String(200), nullable=True)
    tax_number = Column(String(100), nullable=True, index=True)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    branches = relationship('CustomerBranch', back_populates='customer', cascade='all, delete-orphan')
    contacts = relationship('CustomerContact', back_populates='customer', cascade='all, delete-orphan')


class CustomerBranch(Base):
    __tablename__ = 'customer_branches_v2'

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey('customers_v2.id'), nullable=False, index=True)
    branch_name = Column(String(250), nullable=False)
    address = Column(Text, nullable=True)
    is_default = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    customer = relationship('Customer', back_populates='branches')
    contacts = relationship('CustomerContact', back_populates='branch')


class CustomerContact(Base):
    __tablename__ = 'customer_contacts_v2'

    id = Column(Integer, primary_key=True, index=True)
    customer_id = Column(Integer, ForeignKey('customers_v2.id'), nullable=False, index=True)
    branch_id = Column(Integer, ForeignKey('customer_branches_v2.id'), nullable=True, index=True)
    full_name = Column(String(200), nullable=False)
    phone = Column(String(100), nullable=True)
    email = Column(String(200), nullable=True)
    title = Column(String(200), nullable=True)
    is_default = Column(Boolean, nullable=False, default=False)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    customer = relationship('Customer', back_populates='contacts')
    branch = relationship('CustomerBranch', back_populates='contacts')
