import sys
import os
import platform
import bcrypt

print("=== DIAGNOSTICS ===")
print(f"OS: {platform.system()} {platform.release()}")
print(f"Python: {sys.version}")
print(f"Bcrypt Version: {bcrypt.__version__}")

print("\n=== SANITY CHECK ===")
try:
    print("Hashing 'test'...")
    hashed = bcrypt.hashpw(b"test", bcrypt.gensalt())
    print(f"Generated hash: {hashed}")
    print("Verifying 'test'...")
    if bcrypt.checkpw(b"test", hashed):
        print("Sanity check PASSED")
    else:
        print("Sanity check FAILED")
except Exception as e:
    print(f"Sanity check ERROR: {e}")
    import traceback
    traceback.print_exc()

print("\n=== DB CHECK ===")
sys.path.append(os.getcwd())
try:
    from app.database import SessionLocal, engine
    from app import models
    print(f"Connecting to DB: {engine}")
    
    db = SessionLocal()
    setting = db.query(models.Settings).filter(models.Settings.key == "admin_password").first()
    
    if not setting:
        print("Admin password NOT found in DB keys.")
    else:
        print(f"Stored hash: {setting.value}")
        pwd = "admin"
        pwd_bytes = pwd.encode('utf-8')
        
        # Check explicit encoding if stored as string
        if isinstance(setting.value, str):
            hash_bytes = setting.value.encode('utf-8')
        else:
            hash_bytes = setting.value
            
        try:
            print(f"Verifying password '{pwd}' against stored hash...")
            result = bcrypt.checkpw(pwd_bytes, hash_bytes)
            print(f"Result: {result}")
        except Exception as e:
            print(f"Verification ERROR: {e}")
            import traceback
            traceback.print_exc()
            
    db.close()
except Exception as e:
    print(f"DB Import/Connection ERROR: {e}")

