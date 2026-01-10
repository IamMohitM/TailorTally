import pandas as pd
from sqlalchemy.orm import Session
from .. import models
import logging

logger = logging.getLogger(__name__)

def process_master_data_file(file_obj, db: Session, filename: str):
    logger.info(f"Processing file: {filename}")
    
    # Read the file initially with no header processing to inspect rows
    if filename.endswith('.csv'):
        # using header=None to read everything as data first
        df_raw = pd.read_csv(file_obj, header=None)
    elif filename.endswith(('.xls', '.xlsx')):
        df_raw = pd.read_excel(file_obj, header=None)
    else:
        raise ValueError("Unsupported file format. Please use .csv or .xlsx")

    # Expected columns validation
    expected_cols = [
        'Product Name', 'Category', 'Size Label', 'Size Order Index', 
        'Fabric Width (Inches)', 'Length Required', 'Unit'
    ]
    expected_cols_lower = [c.lower() for c in expected_cols]

    # Search for the header row in the first 10 rows
    header_row_index = None
    for i in range(min(10, len(df_raw))):
        # Get values of the row as strings, stripped, lowercased
        row_values = [str(x).strip().lower() for x in df_raw.iloc[i].values]
        # Check if this row contains 'product name' and 'size label' (strong indicators)
        # or most of the expected columns. Let's look for a subset match.
        matches = sum(1 for col in expected_cols_lower if col in row_values)
        
        # If we match at least 4 of the expected columns, assume this is the header
        if matches >= 4:
            header_row_index = i
            break
    
    if header_row_index is not None:
        # Re-read or slice the dataframe
        # Slicing is faster since we already have it
        df = df_raw.iloc[header_row_index + 1:].copy()
        df.columns = df_raw.iloc[header_row_index].values
    else:
        # Fallback to assuming first row was header (or re-read if we used header=None)
        # Since we read with header=None, row 0 is the "header" if check failed,
        # but the check failed so we proceed to standard validation which will fail and show the error.
        df = df_raw.iloc[1:].copy()
        df.columns = df_raw.iloc[0].values
    
    # Normalize headers
    df.columns = [str(c).strip() for c in df.columns]

    # Try to map columns case-insensitively
    actual_cols_map = {c.lower(): c for c in df.columns}
    
    for expected in expected_cols:
        if expected not in df.columns and expected.lower() in actual_cols_map:
            # Rename the actual column to the expected one
            df.rename(columns={actual_cols_map[expected.lower()]: expected}, inplace=True)
    
    missing_cols = [col for col in expected_cols if col not in df.columns]
    
    if missing_cols:
        # Check if it looks like the header is on the second row (common issue)
        # e.g. if explicit columns like "run 1" or "unnamed: 0" are present
        found_cols_str = ", ".join([str(c) for c in df.columns[:5]])  # Show first 5 to avoid clutter
        if len(df.columns) > 5:
            found_cols_str += "..."
            
        error_msg = f"Missing columns: {missing_cols}. Found columns: [{found_cols_str}]"
        
        # Hint for the user
        if any("unnamed" in str(c).lower() for c in df.columns):
            error_msg += ". It looks like the file might not have headers in the first row."
            
        raise ValueError(error_msg)

    # Counters
    stats = {
        "products_created": 0,
        "products_updated": 0,
        "sizes_created": 0,
        "rules_created": 0,
        "rules_updated": 0
    }

    try:
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
                stats["products_created"] += 1
            else:
                if product.category != category:
                    product.category = category
                    db.commit()
                    stats["products_updated"] += 1

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
                stats["sizes_created"] += 1
            else:
                if size.order_index != size_index:
                    size.order_index = size_index
                    db.commit()

            # 3. Material Rule
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
                if rule.length_required != length_req or rule.unit != unit:
                    rule.length_required = length_req
                    rule.unit = unit
                    db.commit()
                    stats["rules_updated"] += 1
            else:
                rule = models.MaterialRule(
                    size_id=size.id,
                    fabric_width_inches=fabric_width,
                    length_required=length_req,
                    unit=unit
                )
                db.add(rule)
                db.commit()
                stats["rules_created"] += 1
                
        return stats

    except Exception as e:
        logger.error(f"Error during import: {e}")
        raise e
