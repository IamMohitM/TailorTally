from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.orm import Session
from .. import models, schemas
from ..database import get_db
from ..utils.security import verify_password, get_password_hash

router = APIRouter(
    prefix="/admin",
    tags=["admin"]
)

@router.post("/verify-password", response_model=bool)
def verify_admin_password(body: schemas.AdminPasswordVerify, db: Session = Depends(get_db)):
    setting = db.query(models.Settings).filter(models.Settings.key == "admin_password").first()
    if not setting:
        raise HTTPException(status_code=500, detail="Admin password not set")
    
    if verify_password(body.password, setting.value):
        return True
    return False

@router.post("/change-password")
def change_admin_password(body: schemas.AdminPasswordChange, db: Session = Depends(get_db)):
    setting = db.query(models.Settings).filter(models.Settings.key == "admin_password").first()
    if not setting:
        raise HTTPException(status_code=500, detail="Admin password not set")

    if not verify_password(body.current_password, setting.value):
        raise HTTPException(status_code=401, detail="Incorrect current password")
    
    new_hash = get_password_hash(body.new_password)
    setting.value = new_hash
    db.commit()
    
    return {"message": "Password updated successfully"}
