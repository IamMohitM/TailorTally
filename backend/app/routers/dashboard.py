from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from .. import models, schemas
from ..database import get_db

router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"]
)

@router.get("/stats", response_model=schemas.DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    # 1. Active Orders (Pending + In Progress)
    active_orders = db.query(models.Order).filter(models.Order.status.in_(["Pending", "In Progress"])).count()

    # 2. Material Issued (Total total_material_req)
    material_issued = db.query(func.sum(models.OrderLine.total_material_req)).scalar() or 0.0

    # 3. Material Work Done (Sum of delivered_qty * material_req_per_unit)
    material_work_done = db.query(
        func.sum(models.Delivery.quantity_delivered * models.OrderLine.material_req_per_unit)
    ).join(models.OrderLine).scalar() or 0.0

    material_work_pending = material_issued - material_work_done

    # 4. Top Products (By total quantity)
    # Group by product name, sum quantity
    top_products_raw = db.query(
        models.Product.name,
        func.sum(models.OrderLine.quantity).label("total_quantity")
    ).join(models.OrderLine).group_by(models.Product.name).order_by(func.sum(models.OrderLine.quantity).desc()).limit(5).all()
    
    top_products = [schemas.ProductStat(name=p[0], quantity=p[1]) for p in top_products_raw]

    # 4. Top Tailors (By order count)
    top_tailors_raw = db.query(
        models.Tailor.name,
        func.count(models.Order.id).label("order_count")
    ).join(models.Order).group_by(models.Tailor.name).order_by(func.count(models.Order.id).desc()).limit(5).all()

    top_tailors = [schemas.TailorStat(name=t[0], order_count=t[1]) for t in top_tailors_raw]

    return {
        "active_orders": active_orders,
        "material_issued": round(material_issued, 2),
        "material_work_done": round(material_work_done, 2),
        "material_work_pending": round(material_work_pending, 2),
        "top_products": top_products,
        "top_tailors": top_tailors
    }
