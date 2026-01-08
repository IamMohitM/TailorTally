from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from .. import models, schemas
from ..database import get_db

router = APIRouter(
    prefix="/schools",
    tags=["schools"]
)

@router.get("/", response_model=List[schemas.School])
def read_schools(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    schools = db.query(models.School).order_by(models.School.name).offset(skip).limit(limit).all()
    return schools

@router.post("/", response_model=schemas.School)
def create_school(school: schemas.SchoolCreate, db: Session = Depends(get_db)):
    db_school = db.query(models.School).filter(models.School.name == school.name).first()
    if db_school:
        raise HTTPException(status_code=400, detail="School already registered")
    new_school = models.School(name=school.name)
    db.add(new_school)
    db.commit()
    db.refresh(new_school)
    return new_school
