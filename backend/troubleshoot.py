import sys
import time

def test_import(module_name):
    print(f"Testing import: {module_name}...", end=" ")
    sys.stdout.flush()
    try:
        __import__(module_name)
        print("OK")
    except ImportError as e:
        print(f"FAILED (ImportError: {e})")
    except Exception as e:
        print(f"FAILED ({type(e).__name__}: {e})")

print(f"Python versions: {sys.version}")

modules = [
    "typing",
    "pydantic",
    "sqlalchemy",
    "pandas",
    "openpyxl",
    "fastapi",
    "uvicorn",
]

for mod in modules:
    test_import(mod)
    time.sleep(0.5)

print("\nIf you see this, basic imports are working.")
