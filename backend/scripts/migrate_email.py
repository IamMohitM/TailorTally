import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "../tailor_tally.db")

def migrate():
    print(f"Migrating database at {DB_PATH}")
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE tailors ADD COLUMN email VARCHAR")
        print("Successfully added email column to tailors table.")
    except sqlite3.OperationalError as e:
        if "duplicate column" in str(e):
            print("Column 'email' already exists in 'tailors' table.")
        else:
            print(f"Error during migration: {e}")
            
    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
