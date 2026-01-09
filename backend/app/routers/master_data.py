from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db

router = APIRouter(
    prefix="/master-data",
    tags=["master-data"]
)

# --- Products ---

@router.get("/products", response_model=List[schemas.Product])
def read_products(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    products = db.query(models.Product).offset(skip).limit(limit).all()
    return products

@router.post("/products", response_model=schemas.Product)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    db_product = models.Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@router.put("/products/{product_id}", response_model=schemas.Product)
def update_product(product_id: int, product: schemas.ProductCreate, db: Session = Depends(get_db)):
    db_product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    for key, value in product.dict().items():
        setattr(db_product, key, value)
    
    db.commit()
    db.refresh(db_product)
    return db_product


# --- Sizes ---

@router.post("/products/{product_id}/sizes", response_model=schemas.Size)
def create_size(product_id: int, size: schemas.SizeCreate, db: Session = Depends(get_db)):
    # Check if product exists
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    db_size = models.Size(**size.dict(), product_id=product_id)
    db.add(db_size)
    db.commit()
    db.refresh(db_size)
    return db_size

@router.put("/sizes/{size_id}", response_model=schemas.Size)
def update_size(size_id: int, size: schemas.SizeCreate, db: Session = Depends(get_db)):
    db_size = db.query(models.Size).filter(models.Size.id == size_id).first()
    if not db_size:
        raise HTTPException(status_code=404, detail="Size not found")
    
    for key, value in size.dict().items():
        setattr(db_size, key, value)
    
    db.commit()
    db.refresh(db_size)
    return db_size


# --- Material Rules ---

@router.post("/sizes/{size_id}/rules", response_model=schemas.MaterialRule)
def create_material_rule(size_id: int, rule: schemas.MaterialRuleCreate, db: Session = Depends(get_db)):
    size = db.query(models.Size).filter(models.Size.id == size_id).first()
    if not size:
        raise HTTPException(status_code=404, detail="Size not found")

    db_rule = models.MaterialRule(**rule.dict(), size_id=size_id)
    db.add(db_rule)
    db.commit()
    db.refresh(db_rule)
    return db_rule

@router.put("/rules/{rule_id}", response_model=schemas.MaterialRule)
def update_material_rule(rule_id: int, rule: schemas.MaterialRuleCreate, db: Session = Depends(get_db)):
    db_rule = db.query(models.MaterialRule).filter(models.MaterialRule.id == rule_id).first()
    if not db_rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    for key, value in rule.dict().items():
        setattr(db_rule, key, value)
    
    db.commit()
    db.refresh(db_rule)
    return db_rule

@router.get("/sizes/{size_id}/rules", response_model=List[schemas.MaterialRule])
def read_material_rules(size_id: int, db: Session = Depends(get_db)):
    rules = db.query(models.MaterialRule).filter(models.MaterialRule.size_id == size_id).all()
    return rules

# --- Tailors ---

@router.get("/tailors", response_model=List[schemas.Tailor])
def read_tailors(db: Session = Depends(get_db)):
    return db.query(models.Tailor).all()

@router.post("/tailors", response_model=schemas.Tailor)
def create_tailor(tailor: schemas.TailorCreate, db: Session = Depends(get_db)):
    db_tailor = models.Tailor(**tailor.dict())
    db.add(db_tailor)
    db.commit()
    db.refresh(db_tailor)
    return db_tailor

@router.put("/tailors/{tailor_id}", response_model=schemas.Tailor)
def update_tailor(tailor_id: int, tailor: schemas.TailorCreate, db: Session = Depends(get_db)):
    db_tailor = db.query(models.Tailor).filter(models.Tailor.id == tailor_id).first()
    if not db_tailor:
        raise HTTPException(status_code=404, detail="Tailor not found")
    
    for key, value in tailor.dict().items():
        setattr(db_tailor, key, value)
    
    db.commit()
    db.refresh(db_tailor)
    return db_tailor
