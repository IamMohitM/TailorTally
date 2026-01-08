from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime, func
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    category = Column(String, default="General") # e.g., "School Uniform", "Mens Wear"
    is_active = Column(Boolean, default=True)

    sizes = relationship("Size", back_populates="product", cascade="all, delete-orphan")

class Size(Base):
    __tablename__ = "sizes"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"))
    label = Column(String) # e.g., "38", "S", "L"
    order_index = Column(Integer, default=0) # For sorting sizes
    is_active = Column(Boolean, default=True)

    product = relationship("Product", back_populates="sizes")
    material_rules = relationship("MaterialRule", back_populates="size", cascade="all, delete-orphan")

class MaterialRule(Base):
    __tablename__ = "material_rules"

    id = Column(Integer, primary_key=True, index=True)
    size_id = Column(Integer, ForeignKey("sizes.id"))
    
    # Fabric width constraint (e.g., 36 or 60 inches). Nullable if not applicable.
    fabric_width_inches = Column(Integer, nullable=True) 
    
    # How much material is needed?
    length_required = Column(Float) 
    unit = Column(String, default="meters") # meters, grams, etc.

    size = relationship("Size", back_populates="material_rules")

class Tailor(Base):
    __tablename__ = "tailors"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    phone = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

    orders = relationship("Order", back_populates="tailor")

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    tailor_id = Column(Integer, ForeignKey("tailors.id"))
    status = Column(String, default="Pending") # Pending, In Progress, Completed
    created_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(String, nullable=True)

    tailor = relationship("Tailor", back_populates="orders")
    order_lines = relationship("OrderLine", back_populates="order", cascade="all, delete-orphan")

class OrderLine(Base):
    __tablename__ = "order_lines"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    product_id = Column(Integer, ForeignKey("products.id"))
    size_id = Column(Integer, ForeignKey("sizes.id"))
    
    # Snapshot of the rule used at time of ordering
    fabric_width_inches = Column(Integer, nullable=True)
    material_req_per_unit = Column(Float)
    unit = Column(String)
    
    quantity = Column(Integer)
    total_material_req = Column(Float) # quantity * material_req_per_unit

    order = relationship("Order", back_populates="order_lines")
    product = relationship("Product")
    size = relationship("Size")
    deliveries = relationship("Delivery", back_populates="order_line", cascade="all, delete-orphan")

class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True, index=True)
    order_line_id = Column(Integer, ForeignKey("order_lines.id"))
    quantity_delivered = Column(Integer)
    date_delivered = Column(DateTime, default=datetime.utcnow)

    order_line = relationship("OrderLine", back_populates="deliveries")
