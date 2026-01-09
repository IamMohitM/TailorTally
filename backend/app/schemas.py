from pydantic import BaseModel
from typing import List, Optional, Literal
from datetime import datetime

# --- Master Data Schemas ---

class MaterialRuleBase(BaseModel):
    fabric_width_inches: Optional[int] = None
    length_required: float
    unit: str = "meters"

class MaterialRuleCreate(MaterialRuleBase):
    pass

class MaterialRule(MaterialRuleBase):
    id: int
    size_id: int

    class Config:
        from_attributes = True

class SizeBase(BaseModel):
    label: str
    order_index: int = 0
    is_active: bool = True

class SizeCreate(SizeBase):
    pass

class Size(SizeBase):
    id: int
    product_id: int
    material_rules: List[MaterialRule] = []

    class Config:
        from_attributes = True

class ProductBase(BaseModel):
    name: str
    category: str = "General"
    is_active: bool = True

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: int
    sizes: List[Size] = []

    class Config:
        from_attributes = True

class TailorBase(BaseModel):
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None
    is_active: bool = True

class TailorCreate(TailorBase):
    pass

class Tailor(TailorBase):
    id: int

    class Config:
        from_attributes = True

# --- School Schemas ---

class SchoolBase(BaseModel):
    name: str

class SchoolCreate(SchoolBase):
    pass

class School(SchoolBase):
    id: int

    class Config:
        from_attributes = True

# --- Delivery Schemas ---

class DeliveryCreate(BaseModel):
    quantity_delivered: int

class Delivery(BaseModel):
    id: int
    order_line_id: int
    quantity_delivered: int
    date_delivered: datetime

    class Config:
        from_attributes = True

# --- Order Schemas ---

class OrderLineBase(BaseModel):
    product_id: int
    size_id: int
    school_id: Optional[int] = None
    fabric_width_inches: Optional[int] = None
    quantity: int

class OrderLineCreate(OrderLineBase):
    rule_id: Optional[int] = None

class OrderLine(OrderLineBase):
    id: int
    order_id: int
    product_name: str
    size_label: str
    school_name: Optional[str] = None
    material_req_per_unit: float
    unit: str
    total_material_req: float
    delivered_qty: int = 0 
    pending_qty: int = 0
    deliveries: List[Delivery] = []

    class Config:
        from_attributes = True

class OrderCreate(BaseModel):
    tailor_id: int
    # school_id: Optional[int] = None # REMOVED
    order_lines: List[OrderLineCreate]
    created_at: Optional[datetime] = None
    notes: Optional[str] = None

class Order(BaseModel):
    id: int
    tailor_id: int
    tailor_name: str
    # school_id: Optional[int] = None # REMOVED
    # school_name: Optional[str] = None # REMOVED
    status: str
    created_at: datetime
    notes: Optional[str] = None
    order_lines: List[OrderLine] = []
    order_lines: List[OrderLine] = []

    class Config:
        from_attributes = True
