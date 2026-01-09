import pandas as pd
import os

# Paths inside the container (cwd will be /app which maps to ./backend)
csv_path = 'master_data_template.csv'
xlsx_path = 'master_data_template.xlsx'

if os.path.exists(csv_path):
    print(f"Reading {csv_path}...")
    df = pd.read_csv(csv_path)
    df.to_excel(xlsx_path, index=False)
    print(f"Created {xlsx_path}")
else:
    print(f"File not found: {csv_path}")
