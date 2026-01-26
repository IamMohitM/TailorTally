import sys
import os
import bcrypt
import platform

# Ensure we can import app
sys.path.append(os.getcwd())

from app.database import SessionLocal, engine
from app import models

print(f"=== ADMIN PASSWORD FIX TOOL ===")
print(f"OS: {platform.system()} {platform.release()}")

def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')

db = SessionLocal()
try:
    print("Checking 'admin_password' setting...")
    setting = db.query(models.Settings).filter(models.Settings.key == "admin_password").first()

    if not setting:
        print("[-] Admin password setting NOT found.")
        print("[*] Creating 'admin_password' with value 'admin'...")
        hashed = get_password_hash("admin")
        new_setting = models.Settings(key="admin_password", value=hashed)
        db.add(new_setting)
        db.commit()
        print("[+] Admin password created successfully.")
    else:
        print("[+] Admin password setting found.")
        pwd = "admin"
        
        # Verify
        try:
            pwd_bytes = pwd.encode('utf-8')
            if isinstance(setting.value, str):
                hash_bytes = setting.value.encode('utf-8')
            else:
                hash_bytes = setting.value
                
            if bcrypt.checkpw(pwd_bytes, hash_bytes):
                print("[+] Current password IS 'admin'. No changes needed.")
            else:
                print("[-] Current password is NOT 'admin'.")
                print("[*] Resetting password to 'admin'...")
                hashed = get_password_hash("admin")
                setting.value = hashed
                db.commit()
                print("[+] Password reset successfully.")
                
        except Exception as e:
            print(f"[-] Error verifying current password: {e}")
            print("[*] Force resetting password to 'admin'...")
            hashed = get_password_hash("admin")
            setting.value = hashed
            db.commit()
            print("[+] Password reset successfully.")

finally:
    db.close()
    print("=== DONE ===")
