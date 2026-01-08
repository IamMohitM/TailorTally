from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from .. import models, schemas
from ..database import get_db

router = APIRouter(
    prefix="/orders",
    tags=["orders"]
)

@router.post("/", response_model=schemas.Order)
def create_order(order: schemas.OrderCreate, db: Session = Depends(get_db)):
    # Create Order
    db_order = models.Order(tailor_id=order.tailor_id, notes=order.notes)
    db.add(db_order)
    db.commit()
    db.refresh(db_order)

    # Process Lines
    for line in order.order_lines:
        # Find Material Rule
        if line.rule_id:
            rule = db.query(models.MaterialRule).filter(models.MaterialRule.id == line.rule_id).first()
        else:
            query = db.query(models.MaterialRule).filter(models.MaterialRule.size_id == line.size_id)
            if line.fabric_width_inches:
                rule = query.filter(models.MaterialRule.fabric_width_inches == line.fabric_width_inches).first()
            else:
                rule = query.first()
        
        if not rule:
            raise HTTPException(status_code=400, detail=f"No material rule found for Size ID {line.size_id}")

        material_req = rule.length_required
        total_req = material_req * line.quantity

        db_line = models.OrderLine(
            order_id=db_order.id,
            product_id=line.product_id,
            size_id=line.size_id,
            fabric_width_inches=line.fabric_width_inches,
            material_req_per_unit=material_req,
            unit=rule.unit,
            quantity=line.quantity,
            total_material_req=total_req
        )
        db.add(db_line)
    
    db.commit()
    db.refresh(db_order)
    return map_order_response(db_order)

@router.get("/", response_model=List[schemas.Order])
def list_orders(db: Session = Depends(get_db)):
    orders = db.query(models.Order).order_by(models.Order.created_at.desc()).all()
    return [map_order_response(o) for o in orders]

@router.get("/{order_id}", response_model=schemas.Order)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(models.Order).filter(models.Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return map_order_response(order)

@router.post("/lines/{line_id}/deliveries", response_model=schemas.Delivery)
def record_delivery(line_id: int, delivery: schemas.DeliveryCreate, db: Session = Depends(get_db)):
    line = db.query(models.OrderLine).filter(models.OrderLine.id == line_id).first()
    if not line:
        raise HTTPException(status_code=404, detail="Order Line not found")

    db_delivery = models.Delivery(
        order_line_id=line_id,
        quantity_delivered=delivery.quantity_delivered
    )
    db.add(db_delivery)
    db.commit()
    db.refresh(db_delivery)
    
    # Update Order Status
    # Logic: Check all lines in the order.
    # If all lines have (delivered >= quantity), status = Completed
    # If any delivery exists but not all completed, status = In Progress
    # If no deliveries, status = Pending (usually starts here)
    
    order = db.query(models.Order).filter(models.Order.id == line.order_id).first()
    if order:
        # Force refresh of order and its relationships to ensure we see the new delivery
        db.refresh(order)
        
        all_completed = True
        any_delivered = False
        
        for ol in order.order_lines:
            # Explicitly refresh the line or its deliveries if needed, 
            # but usually refreshing order should cascade if configured, 
            # or access triggers lazy load. 
            # Safest is to sum manually from the relationship which will re-query if expired.
            db.refresh(ol) 
            d_qty = sum(d.quantity_delivered for d in ol.deliveries)
            
            if d_qty > 0:
                any_delivered = True
            
            if d_qty < ol.quantity:
                all_completed = False
        
        new_status = order.status
        if all_completed and len(order.order_lines) > 0:
            new_status = "Completed"
        elif any_delivered:
            new_status = "In Progress"
        
        if new_status != order.status:
            order.status = new_status
            db.commit()
            db.refresh(order)
    
    return db_delivery

def map_order_response(order: models.Order) -> schemas.Order:
    # Helper to calculate delivered/pending quantities for response
    mapped_lines = []
    for line in order.order_lines:
        delivered = sum(d.quantity_delivered for d in line.deliveries)
        pending = line.quantity - delivered
        mapped_lines.append(schemas.OrderLine(
            id=line.id,
            order_id=line.order_id,
            product_id=line.product_id,
            size_id=line.size_id,
            product_name=line.product.name if line.product else f"Product #{line.product_id}",
            size_label=line.size.label if line.size else f"Size #{line.size_id}",
            fabric_width_inches=line.fabric_width_inches,
            quantity=line.quantity,
            material_req_per_unit=line.material_req_per_unit,
            unit=line.unit,
            total_material_req=line.total_material_req,
            delivered_qty=delivered,
            pending_qty=pending,
            deliveries=line.deliveries
        ))

    return schemas.Order(
        id=order.id,
        tailor_id=order.tailor_id,
        tailor_name=order.tailor.name,
        status=order.status,
        created_at=order.created_at,
        notes=order.notes,
        order_lines=mapped_lines
    )
