import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def verify():
    # 1. Fetch Schools
    print("Fetching schools...")
    r = requests.get(f"{BASE_URL}/schools/")
    if r.status_code != 200:
        print(f"Failed to fetch schools: {r.status_code}")
        sys.exit(1)
    schools = r.json()
    if not schools:
        print("No schools found. Seeding might have failed.")
        sys.exit(1)
    
    school_1 = schools[0]
    school_2 = schools[1]
    print(f"Selected Schools: {school_1['name']} ({school_1['id']}), {school_2['name']} ({school_2['id']})")

    # 2. Get a tailor (needed for order)
    r = requests.get(f"{BASE_URL}/master-data/tailors")
    tailors = r.json()
    if not tailors:
        # Create one
        r = requests.post(f"{BASE_URL}/master-data/tailors", json={"name": "Test Tailor"})
        tailor_id = r.json()['id']
    else:
        tailor_id = tailors[0]['id']
    print(f"Selected Tailor ID: {tailor_id}")

    # 3. Create Order with Multiple Schools (per line)
    print("Creating order...")
    
    # Get products
    products = requests.get(f"{BASE_URL}/master-data/products").json()
    if len(products) < 2:
         print("Need at least 2 products for mixed school test.")
         # If checking locally, seed creates plenty.
         
    p1 = products[0]
    p2 = products[1] if len(products) > 1 else products[0]
    
    order_payload = {
        "tailor_id": tailor_id,
        "notes": "Refactored Order",
        "order_lines": [
            {
                "product_id": p1['id'],
                "size_id": p1['sizes'][0]['id'],
                "quantity": 1,
                "school_id": school_1['id']
            },
            {
                "product_id": p2['id'],
                "size_id": p2['sizes'][0]['id'],
                "quantity": 2,
                "school_id": school_2['id']
            }
        ]
    }
    
    r = requests.post(f"{BASE_URL}/orders/", json=order_payload)
    if r.status_code != 200:
         print(f"Failed to create order: {r.text}")
         sys.exit(1)

    order_data = r.json()
    order_id = order_data['id']
    print(f"Order created: ID {order_id}")
    
    # Check lines
    lines = order_data['order_lines']
    if len(lines) != 2:
        print(f"Expected 2 lines, got {len(lines)}")
        sys.exit(1)
        
    line1 = next(l for l in lines if l['product_id'] == p1['id'])
    line2 = next(l for l in lines if l['product_id'] == p2['id'])
    
    if line1['school_id'] != school_1['id']:
        print(f"Line 1 school mismatch. Expected {school_1['id']}, got {line1.get('school_id')}")
        sys.exit(1)
        
    if line2['school_id'] != school_2['id']:
         print(f"Line 2 school mismatch. Expected {school_2['id']}, got {line2.get('school_id')}")
         sys.exit(1)

    print("Order Lines verification successful.")

    # 4. Filter Orders by School
    # Filter by School 1
    print(f"Filtering by School 1 ({school_1['name']})...")
    r = requests.get(f"{BASE_URL}/orders?school_id={school_1['id']}")
    orders = r.json()
    if not any(o['id'] == order_id for o in orders):
        print("FAILURE: Order not found when filtering by School 1")
        sys.exit(1)
        
    # Filter by School 2
    print(f"Filtering by School 2 ({school_2['name']})...")
    r = requests.get(f"{BASE_URL}/orders?school_id={school_2['id']}")
    orders = r.json()
    if not any(o['id'] == order_id for o in orders):
        print("FAILURE: Order not found when filtering by School 2")
        sys.exit(1)

    print("Filtering verification successful.")

if __name__ == "__main__":
    verify()
