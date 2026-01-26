from app.database import SessionLocal
from app import models

def check_settings():
    db = SessionLocal()
    try:
        setting = db.query(models.Settings).filter(models.Settings.key == "admin_password").first()
        if setting:
            print(f"Admin password found. Hash: {setting.value[:10]}...")
            return True
        else:
            print("Admin password NOT found in Settings table.")
            return False
    except Exception as e:
        print(f"Error checking settings: {e}")
        return False
    finally:
        db.close()

if __name__ == "__main__":
    check_settings()
