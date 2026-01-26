import sys
import os
import bcrypt

# Ensure we can import app
sys.path.append(os.getcwd())

from app.database import SessionLocal, engine
from app import models

# Verify DB connection
print(f"Connecting to DB using engine: {engine}")

db = SessionLocal()
try:
    print("Querying settings for 'admin_password'...")
    setting = db.query(models.Settings).filter(models.Settings.key == "admin_password").first()
    if not setting:
        print("Admin password NOT set in DB.")
    else:
        print(f"Stored hash: {setting.value}")
        pwd = "admin"
        pwd_bytes = pwd.encode('utf-8')
        hash_bytes = setting.value.encode('utf-8')
        
        try:
            print(f"Attempting to verify password '{pwd}'...")
            result = bcrypt.checkpw(pwd_bytes, hash_bytes)
            print(f"Verification result for 'admin': {result}")
        except Exception as e:
            print(f"Bcrypt error: {e}")
            import traceback
            traceback.print_exc()

finally:
    db.close()
