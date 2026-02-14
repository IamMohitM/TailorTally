import sqlite3
import os

# Database file name - assumed to be in the current working directory (backend/)
DB_FILE = "tailor_tally.db"

def add_column_if_not_exists(cursor, table, column, definition):
    try:
        # Check if column exists
        cursor.execute(f"SELECT {column} FROM {table} LIMIT 1")
    except sqlite3.OperationalError:
        # Column likely doesn't exist
        print(f"Adding column '{column}' to table '{table}'...")
        try:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
            print(f"Successfully added {column}.")
            return True
        except Exception as e:
            print(f"Error adding column {column}: {e}")
            return False
    except Exception as e:
        print(f"Error checking column {column}: {e}")
        return False
        
    # print(f"Column '{column}' already exists in '{table}'.")
    return False

def main():
    if not os.path.exists(DB_FILE):
        print(f"Database file '{DB_FILE}' not found. Skipping schema update.")
        # Check if it exists in parent dir just in case
        if os.path.exists(f"../{DB_FILE}"):
             print(f"Found database in parent directory: ../{DB_FILE}")
             # We could update that one, but let's stick to the config.
        return

    print(f"Checking for schema updates in: {DB_FILE}")
    
    try:
        conn = sqlite3.connect(DB_FILE)
        cursor = conn.cursor()

        # 1. orders: given_cloth (Float)
        add_column_if_not_exists(cursor, "orders", "given_cloth", "FLOAT")
        
        # 1b. orders: slip_no (String)
        add_column_if_not_exists(cursor, "orders", "slip_no", "VARCHAR")
        
        # 2. order_lines: given_cloth (Float)
        add_column_if_not_exists(cursor, "order_lines", "given_cloth", "FLOAT")
        
        # 3. order_lines: school_id (Integer)
        add_column_if_not_exists(cursor, "order_lines", "school_id", "INTEGER")

        # 4. order_lines: group_id (String)
        add_column_if_not_exists(cursor, "order_lines", "group_id", "VARCHAR")

        conn.commit()
        conn.close()
        print("Schema check/update completed.")
        
    except Exception as e:
        print(f"An error occurred during schema update: {e}")

if __name__ == "__main__":
    main()
