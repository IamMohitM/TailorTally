import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app import models
import pytest

# client = TestClient(app) - Removed

def test_edit_protection_and_fields(client):
    # 1. Setup - Create Order
    # Get initial data
    products = client.get("/master-data/products").json()
    product_id = products[0]["id"]
    size_id = products[0]["sizes"][0]["id"]
    tailors = client.get("/master-data/tailors").json()
    tailor_id = tailors[0]["id"]
    schools = client.get("/schools").json()
    if not schools:
        # Create a school if none
        client.post("/schools", json={"name": "Test School"})
        schools = client.get("/schools").json()
    school_id = schools[0]["id"]
    
    # Create Order
    payload = {
        "tailor_id": tailor_id,
        "notes": "Test Order for Edit",
        "order_lines": [
            {
                "product_id": product_id,
                "size_id": size_id,
                "quantity": 5
            }
        ]
    }
    response = client.post("/orders/", json=payload)
    assert response.status_code == 200
    order = response.json()
    line_id = order["order_lines"][0]["id"]

    # 2. Get Admin Password (from settings in DB or set it)
    # Since we are running against a real/persistent DB (per test_flow.py pattern), 
    # we need to know the password. If it's seeded, it's 'admin'. 
    # Let's try to verify it first, or set it via a hack if possible, but 
    # relying on seed 'admin' is standard for this project context.
    password = "admin" 
    
    # Verify we can authenticate
    verify_resp = client.post("/admin/verify-password", json={"password": password})
    if not verify_resp.json():
         # Attempt to set it if verify fails? (Assuming we can't easily without logic)
         # But the DB should have seed data.
         pytest.fail("Default admin password 'admin' not working. Check seed data.")

    # 3. Test Unauthorized Edit (No Header)
    update_payload = {"quantity": 10}
    resp = client.put(f"/orders/lines/{line_id}", json=update_payload)
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Admin password required"

    # 4. Test Unauthorized Edit (Wrong Header)
    resp = client.put(f"/orders/lines/{line_id}", json=update_payload, headers={"X-Admin-Password": "wrong"})
    assert resp.status_code == 401
    assert resp.json()["detail"] == "Invalid admin password"

    # 5. Test Authorized Edit - Quantity
    new_qty = 15
    resp = client.put(f"/orders/lines/{line_id}", json={"quantity": new_qty}, headers={"X-Admin-Password": password})
    assert resp.status_code == 200
    updated_line = resp.json()
    assert updated_line["quantity"] == new_qty
    assert updated_line["pending_qty"] == new_qty # Should recalculate

    # 6. Test Authorized Edit - School
    # Initially None, set to school_id
    resp = client.put(f"/orders/lines/{line_id}", json={"school_id": school_id}, headers={"X-Admin-Password": password})
    assert resp.status_code == 200
    updated_line = resp.json()
    assert updated_line["school_id"] == school_id
    # Assert name is populated if schema returns it, or fetch order again
    
    # 7. Test Authorized Edit - Given Cloth
    given = 2.5
    resp = client.put(f"/orders/lines/{line_id}", json={"given_cloth": given}, headers={"X-Admin-Password": password})
    assert resp.status_code == 200
    updated_line = resp.json()
    assert updated_line["given_cloth"] == given

    print("\nTest Passed: Edit protection and field updates verified.")
