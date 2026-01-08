from sqlalchemy.orm import Session
from .database import SessionLocal, engine, Base
from . import models

def db_seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # 1. Tailors
    if not db.query(models.Tailor).first():
        tailors = ["Ramesh", "Suresh", "Ganesh", "Mahesh"]
        for name in tailors:
            db.add(models.Tailor(name=name))
    
    # 2. Products and Sizes
    # List from prompt
    products_data = [
        {"name": "Blazer", "sizes": ["24", "26", "28", "30", "32", "34", "36", "38", "40", "42", "44"]},
        {"name": "Body Frock", "sizes": ["20", "22", "24", "26", "28", "30", "32", "34"]},
        {"name": "Box Model Neckar", "sizes": ["11", "12", "13", "14", "15", "16", "17", "18"]},
        {"name": "Box Model Skirt", "sizes": ["16", "17", "18", "20", "22", "24", "26"]},
        {"name": "Full Shirt", "sizes": ["22", "24", "26", "28", "30", "32", "34", "36", "38", "40", "42", "44"]},
        {"name": "Half Elastic Pant", "sizes": ["18", "20", "22", "24", "26", "28", "30", "32", "34", "36", "38", "40", "42", "44"]},
        {"name": "Half Elastic Skirt", "sizes": ["11", "12", "13", "14", "15", "16", "17", "18", "20", "22", "24", "26", "28", "30", "32", "32 L / 26 W"]},
        {"name": "Half Shirt", "sizes": ["18", "20", "22", "24", "26", "28", "30", "32", "34", "36", "38", "40", "42", "44"]},
        {"name": "Half Shirt Copy", "sizes": ["18", "20", "22", "24", "26", "28"]},
        {"name": "Liberty Uniform Shoe", "sizes": ["1", "2", "3", "8C", "9C", "10 C", "11 C", "12 C", "13 C"]},
        {"name": "Neckar", "sizes": ["11", "12", "13", "14", "15", "16", "17", "18"]},
        {"name": "Pant", "sizes": [
             "34 L / 26 W", "34 L / 28 W", "34 L / 30 W", "34 L / 32 W",
             "36 L / 26 W", "36 L / 28 W", "36 L / 30 W", "36 L / 32 W", "36 L / 34 W",
             "38 L / 26 W", "38 L / 28 W", "38 L / 30 W", "38 L / 32 W", "38 L / 34 W", "38 L / 36 W",
             "40 L / 28 W", "40 L / 30 W", "40 L / 32 W", "40 L / 34 W", "40 L / 36 W", "40 L / 38 W",
             "42 L / 26 W", "42 L / 28 W", "42 L / 30 W", "42 L / 32 W", "42 L / 34 W", "42 L / 36 W", "42 L / 38 W", "42 L / 40 W"
        ]},
        {"name": "Pre Primary Shoe", "sizes": ["1", "2", "3", "4", "8C", "9C", "10C", "11C", "12C", "13C"]},
        {"name": "Preprimary Shoe Liberty", "sizes": ["1", "2", "3", "8C", "9C", "10C", "11C", "12C", "13C", "4"]},
        {"name": "Preprimary Skirt", "sizes": ["16", "18", "20", "22", "24"]},
        {"name": "Punjabi Dress", "sizes": ["24", "26", "28", "30", "32", "34", "36", "38", "40"]},
        {"name": "Skirt", "sizes": [
             "20", "22", "24", "26",
             "28 L / 26 W", "28 L / 28 W", "28 L / 30 W", "28 L / 32 W",
             "30 L / 26 W", "30 L / 28 W", "30 L / 30 W", "30 L / 32 W", "30 L / 34 W", "30 L / 36 W",
             "32 L / 26 W", "32 L / 28 W", "32 L / 30 W", "32 L / 32 W", "32 L / 34 W", "32 L / 36 W", "32 L / 38 W", "32 L / 40 W", "32 L / 42 W",
             "34 L / 26 W", "34 L / 28 W", "34 L / 30 W", "34 L / 32 W", "34 L / 34 W",
             "36 L / 26 W", "36 L / 28 W", "36 L / 30 W", "36 L / 32 W", "36 L / 34 W",
             "38 L / 26 W", "38 L / 28 W", "38 L / 30 W", "38 L / 32 W", "38 L / 34 W", "38 L / 36 W",
             "40 L / 26 W", "40 L / 28 W", "40 L / 30 W", "40 L / 32 W", "40 L / 34 W", "40 L / 36 W",
             "42 L / 26 W", "42 L / 28 W", "42 L / 30 W", "42 L / 32 W", "42 L / 34 W", "42 L / 36 W", "42 L / 38 W", "42 L / 40 W"
        ]},
        {"name": "Sport Shoe Liberty", "sizes": ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "13 C"]},
        {"name": "Sports Lower", "sizes": ["18", "20", "22", "24", "26", "28", "30", "32", "34", "36", "38", "40", "42", "44"]},
        {"name": "Sports Lower Girls", "sizes": ["18", "20", "22", "24", "26", "28", "30", "32", "34", "36", "38", "40", "42", "44"]},
        {"name": "Sports T Shirt", "sizes": ["18", "20", "22", "24", "26", "28", "30", "32", "34", "36", "38", "40", "42", "44"]},
        {"name": "Sports T Shirt Full Girls", "sizes": ["20", "22", "24", "26", "28", "30", "32", "34", "36", "38", "40", "42"]},
        {"name": "Sports T Shirt Girls", "sizes": ["18", "20", "22", "24", "26", "28", "30", "32", "34", "36", "38", "40", "42", "44"]},
        {"name": "Uniform T Shirt", "sizes": ["18", "20", "22", "24", "26", "28", "30", "32", "34", "36", "38", "40", "42"]},
        {"name": "Waist Coat", "sizes": ["20", "22", "24", "26", "28", "30", "32", "34", "36", "38", "40", "42", "44"]},
    ]

    for p_idx, p_data in enumerate(products_data):
        p = db.query(models.Product).filter(models.Product.name == p_data["name"]).first()
        if not p:
            p = models.Product(name=p_data["name"])
            db.add(p)
            db.commit()
            db.refresh(p)
        
        # Add Sizes
        for s_idx, s_label in enumerate(p_data["sizes"]):
            s = db.query(models.Size).filter(models.Size.product_id == p.id, models.Size.label == s_label).first()
            if not s:
                s = models.Size(product_id=p.id, label=s_label, order_index=s_idx)
                db.add(s)
                db.commit()
                db.refresh(s)
                
                # Add Default Material Rule (Dummy Logic)
                # If Shoe, 0 material.
                # If Shirt/Pant, approx 1.5 - 2.5 meters.
                # If Sports, grams?
                
                if "Shoe" in p.name:
                    db.add(models.MaterialRule(size_id=s.id, length_required=0, unit="pairs"))
                elif "Sports" in p.name:
                     db.add(models.MaterialRule(size_id=s.id, length_required=200 + (s_idx * 10), unit="grams"))
                else:
                    # General Fabric
                    # 36 inch width
                    db.add(models.MaterialRule(size_id=s.id, fabric_width_inches=36, length_required=1.5 + (s_idx * 0.1), unit="meters"))
                    # 60 inch width (less fabric)
                    db.add(models.MaterialRule(size_id=s.id, fabric_width_inches=60, length_required=1.0 + (s_idx * 0.05), unit="meters"))
    
    db.commit()
    db.close()
    print("Seed data initialized.")

if __name__ == "__main__":
    db_seed()
