import sqlite3
import webbrowser
import os
import html
import sys

# Determine path to database
# Check if running from root or backend
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# SCRIPT_DIR should be .../backend/scripts
BACKEND_DIR = os.path.dirname(SCRIPT_DIR)
# BACKEND_DIR should be .../backend

DB_PATH = os.path.join(BACKEND_DIR, "tailor_tally.db")
OUTPUT_HTML = os.path.join(BACKEND_DIR, "db_view.html")

def generate_html_view():
    if not os.path.exists(DB_PATH):
        # Fallback check if running from root without proper context? 
        # But we intend to run it via the proper path.
        print(f"Error: Database not found at {DB_PATH}")
        print(f"Current working directory: {os.getcwd()}")
        return

    print(f"Reading database from: {DB_PATH}")
    
    conn = sqlite3.connect(DB_PATH)
    
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        
        if not tables:
            print("No tables found in the database.")
            return

        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Tailor Tally Database View</title>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 20px; background-color: #f4f4f4; color: #333; }
                .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                h1 { color: #2c3e50; text-align: center; }
                h2 { color: #34495e; border-bottom: 2px solid #ecf0f1; padding-bottom: 10px; margin-top: 40px; }
                table { border-collapse: collapse; width: 100%; margin-bottom: 20px; font-size: 14px; }
                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                th { background-color: #3f51b5; color: white; font-weight: 600; text-transform: uppercase; font-size: 12px; position: sticky; top: 0; }
                tr:nth-child(even) { background-color: #f8f9fa; }
                tr:hover { background-color: #e8f0fe; }
                .empty { color: #7f8c8d; font-style: italic; padding: 10px; background: #f9f9f9; border: 1px dashed #ccc; }
                .timestamp { text-align: right; color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
            </style>
        </head>
        <body>
            <div class="container">
            <h1>Tailor Tally Database View</h1>
            <p style="text-align: center; color: #666;">A snapshot of your current data</p>
        """
        
        for table_name_tuple in tables:
            table_name = table_name_tuple[0]
            # Skip sqlite internal tables if any (sqlite_sequence is common)
            if table_name.startswith('sqlite_'):
                continue
                
            print(f"Processing table: {table_name}")
            
            html_content += f"<h2>{table_name}</h2>"
            
            # Get columns
            cursor.execute(f"PRAGMA table_info({table_name})")
            columns_info = cursor.fetchall()
            column_names = [col[1] for col in columns_info]
            
            # Get data
            cursor.execute(f"SELECT * FROM {table_name}")
            rows = cursor.fetchall()
            
            if not rows:
                html_content += "<div class='empty'>No data available in this table.</div>"
                continue
                
            html_content += "<div style='overflow-x: auto;'><table><thead><tr>"
            for col in column_names:
                html_content += f"<th>{html.escape(str(col))}</th>"
            html_content += "</tr></thead><tbody>"
            
            for row in rows:
                html_content += "<tr>"
                for cell in row:
                    cell_val = str(cell) if cell is not None else "NULL"
                    html_content += f"<td>{html.escape(cell_val)}</td>"
                html_content += "</tr>"
            html_content += "</tbody></table></div>"

        import datetime
        html_content += f"""
            <div class="timestamp">Generated on {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</div>
            </div>
        </body>
        </html>
        """
        
        with open(OUTPUT_HTML, "w", encoding="utf-8") as f:
            f.write(html_content)
            
        print(f"Successfully created HTML view at {OUTPUT_HTML}")
        
        # Open in browser
        # file_url = 'file://' + os.path.abspath(OUTPUT_HTML)
        # webbrowser.open(file_url)
        # Using a simpler approach for Windows which is the target
        webbrowser.open(OUTPUT_HTML)

    except Exception as e:
        print(f"An error occurred: {e}")
        import traceback
        traceback.print_exc()
    finally:
        conn.close()

if __name__ == "__main__":
    generate_html_view()
