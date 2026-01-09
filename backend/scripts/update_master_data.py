import argparse
import sys
import pandas as pd
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app import models
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def update_master_data(file_path: str):
    logger.info(f"Reading file: {file_path}")
    
    if file_path.endswith('.csv'):
        df = pd.read_csv(file_path)
    elif file_path.endswith(('.xls', '.xlsx')):
        df = pd.read_excel(file_path)
    else:
        logger.error("Unsupported file format. Please use .csv or .xlsx")
        sys.exit(1)
        
    # Expected columns validation
    expected_cols = [
        'Product Name', 'Category', 'Size Label', 'Size Order Index', 
        'Fabric Width (Inches)', 'Length Required', 'Unit'
    ]
    
    # Normalize headers just in case
    df.columns = [c.strip() for c in df.columns]
    
    missing_cols = [col for col in expected_cols if col not in df.columns]
    if missing_cols:
        logger.error(f"Missing columns: {missing_cols}")
        logger.info(f"Expected columns: {expected_cols}")
        sys.exit(1)

    db = SessionLocal()
    
    try:
        # Counters
        products_created = 0
        products_updated = 0
        sizes_created = 0
        rules_created = 0
        rules_updated = 0

        for index, row in df.iterrows():
            product_name = str(row['Product Name']).strip()
            category = str(row['Category']).strip() if pd.notna(row['Category']) else 'General'
            size_label = str(row['Size Label']).strip()
            
            # Size Index
            try:
                size_index = int(row['Size Order Index'])
            except ValueError:
                size_index = 0
                
            # Rule details
            fabric_width = row['Fabric Width (Inches)']
            fabric_width = int(fabric_width) if pd.notna(fabric_width) and str(fabric_width).strip() != '' else None
            
            try:
                length_req = float(row['Length Required'])
            except ValueError:
                logger.warning(f"Row {index+2}: Invalid length required. Skipping.")
                continue
                
            unit = str(row['Unit']).strip().lower() if pd.notna(row['Unit']) else 'meters'

            # 1. Product
            product = db.query(models.Product).filter(models.Product.name == product_name).first()
            if not product:
                product = models.Product(name=product_name, category=category)
                db.add(product)
                db.commit()
                db.refresh(product)
                products_created += 1
            else:
                # Update category if needed? For now just ensure existence.
                if product.category != category:
                    product.category = category
                    db.commit()
                    products_updated += 1

            # 2. Size
            size = db.query(models.Size).filter(
                models.Size.product_id == product.id, 
                models.Size.label == size_label
            ).first()
            
            if not size:
                size = models.Size(product_id=product.id, label=size_label, order_index=size_index)
                db.add(size)
                db.commit()
                db.refresh(size)
                sizes_created += 1
            else:
                if size.order_index != size_index:
                    size.order_index = size_index
                    db.commit()

            # 3. Material Rule
            # Check if a rule exists for this size + width combination
            # Note: width can be None (Any)
            
            if fabric_width is None:
                rule = db.query(models.MaterialRule).filter(
                    models.MaterialRule.size_id == size.id,
                    models.MaterialRule.fabric_width_inches.is_(None)
                ).first()
            else:
                rule = db.query(models.MaterialRule).filter(
                    models.MaterialRule.size_id == size.id,
                    models.MaterialRule.fabric_width_inches == fabric_width
                ).first()

            if rule:
                # Update if different
                if rule.length_required != length_req or rule.unit != unit:
                    rule.length_required = length_req
                    rule.unit = unit
                    db.commit()
                    rules_updated += 1
            else:
                rule = models.MaterialRule(
                    size_id=size.id,
                    fabric_width_inches=fabric_width,
                    length_required=length_req,
                    unit=unit
                )
                db.add(rule)
                db.commit()
                rules_created += 1

        logger.info("Import Completed Successfully.")
        logger.info(f"Products Created: {products_created}")
        logger.info(f"Sizes Created: {sizes_created}")
        logger.info(f"Material Rules Created: {rules_created}")
        logger.info(f"Material Rules Updated: {rules_updated}")

    except Exception as e:
        logger.error(f"Error during import: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Update Master Data from CSV/Excel')
    parser.add_argument('file', help='Path to the CSV or Excel file')
    
    args = parser.parse_args()
    update_master_data(args.file)
