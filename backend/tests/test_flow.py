from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.database import Base, engine, SessionLocal
from backend.app import models
import pytest

# Setup Test DB
# For simplicity, we use the same SQLite file but usually would use 'sqlite:///:memory:' or separate file.
# Since we have seed data in the main DB, let's use the main DB to test against the seed data! 
# (Not ideal for unit tests but good for "end-to-end" on local).

client = TestClient(app)

def test_order_flow():
    # 1. Get Tailors
    response = client.get("/master-data/tailors")
    assert response.status_code == 200
    tailors = response.json()
    assert len(tailors) > 0
    tailor_id = tailors[0]["id"]

    # 2. Get Products
    response = client.get("/master-data/products")
    assert response.status_code == 200
    products = response.json()
    assert len(products) > 0
    
    # Find Blazer
    blazer = next((p for p in products if p["name"] == "Blazer"), products[0])
    product_id = blazer["id"]
    size_id = blazer["sizes"][0]["id"] # First size (e.g. 24)
    
    # Get Rules for Size
    response = client.get(f"/master-data/sizes/{size_id}/rules")
    rules = response.json()
    assert len(rules) > 0
    rule = rules[0]
    rule_id = rule["id"]
    exp_material = rule["length_required"]

    # 3. Create Order
    qty = 10
    payload = {
        "tailor_id": tailor_id,
        "notes": "Test Order",
        "order_lines": [
            {
                "product_id": product_id,
                "size_id": size_id,
                "rule_id": rule_id,
                "quantity": qty
            }
        ]
    }
    response = client.post("/orders/", json=payload)
    assert response.status_code == 200
    order = response.json()
    assert order["tailor_id"] == tailor_id
    line = order["order_lines"][0]
    assert line["quantity"] == qty
    assert line["material_req_per_unit"] == exp_material
    assert line["total_material_req"] == exp_material * qty
    assert line["delivered_qty"] == 0
    assert line["pending_qty"] == qty

    # 4. Filter Orders
    response = client.get("/orders/")
    assert response.status_code == 200
    orders = response.json()
    assert len(orders) > 0
    assert orders[0]["id"] == order["id"] # Should be latest

    # 5. Record Delivery
    line_id = line["id"]
    del_qty = 4
    response = client.post(f"/orders/lines/{line_id}/deliveries", json={"quantity_delivered": del_qty})
    assert response.status_code == 200
    delivery = response.json()
    assert delivery["quantity_delivered"] == del_qty

    # 6. Verify State
    response = client.get(f"/orders/{order['id']}")
    assert response.status_code == 200
    updated_order = response.json()
    updated_line = updated_order["order_lines"][0]
    assert updated_line["delivered_qty"] == del_qty
    assert updated_line["pending_qty"] == qty - del_qty

    print("\nTest Passed: Order Flow verified.")
