from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app import models
from app.utils.security import get_password_hash
import pytest

client = TestClient(app)

def setup_admin_password():
    db = SessionLocal()
    try:
        pwd = "testpassword"
        hashed = get_password_hash(pwd)
        
        setting = db.query(models.Settings).filter(models.Settings.key == "admin_password").first()
        if not setting:
            setting = models.Settings(key="admin_password", value=hashed)
            db.add(setting)
        else:
            setting.value = hashed
        db.commit()
        return pwd
    finally:
        db.close()

def test_update_quantity_and_cloth():
    # 1. Setup Data
    admin_password = setup_admin_password()
    
    response = client.get("/master-data/products")
    products = response.json()
    if not products:
        pytest.skip("No products found")
        
    blazer = next((p for p in products if p["name"] == "Blazer"), products[0])
    product_id = blazer["id"]
    size_id = blazer["sizes"][0]["id"]
    
    response = client.get("/master-data/tailors")
    tailors = response.json()
    if not tailors:
        pytest.skip("No tailors found")
    tailor_id = tailors[0]["id"]

    # 2. Create Order
    qty = 10
    payload = {
        "tailor_id": tailor_id,
        "notes": "Test Order",
        "order_lines": [
            {
                "product_id": product_id,
                "size_id": size_id,
                "quantity": qty,
                "given_cloth": 15.5
            }
        ]
    }
    response = client.post("/orders/", json=payload)
    assert response.status_code == 200
    order = response.json()
    line_id = order["order_lines"][0]["id"]
    
    # 3. Update Quantity and Given Cloth
    new_qty = 20
    new_given_cloth = 25.5
    
    update_payload = {
        "quantity": new_qty,
        "given_cloth": new_given_cloth
    }
    
    response = client.put(
        f"/orders/lines/{line_id}", 
        json=update_payload,
        headers={"X-Admin-Password": admin_password}
    )
    
    if response.status_code != 200:
        print(f"Update failed: {response.json()}")
        
    assert response.status_code == 200
    updated_line = response.json()
    
    assert updated_line["quantity"] == new_qty
    assert updated_line["given_cloth"] == new_given_cloth
    
    # 4. Verify persistence
    response = client.get(f"/orders/{order['id']}")
    fetched_order = response.json()
    fetched_line = fetched_order["order_lines"][0]
    
    assert fetched_line["quantity"] == new_qty
    assert fetched_line["given_cloth"] == new_given_cloth
    
    print("\nSUCCESS: Quantity and Given Cloth updated successfully.")

if __name__ == "__main__":
    test_update_quantity_and_cloth()
