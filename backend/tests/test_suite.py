# client = TestClient(app) - Removed
# Used fixture instead

def test_order_creation_and_consistency(client):
    """
    Test 1: Order Creation & Data Consistency
    - Create order with valid data
    - Verify response structure
    - Verify calculated fields (total_material_req, pending_qty)
    - Verify default values (delivered_qty = 0)
    """
    # 1. Setup Data
    tailors = client.get("/master-data/tailors").json()
    assert len(tailors) > 0, "No tailors found in master data"
    tailor_id = tailors[0]["id"]

    products = client.get("/master-data/products").json()
    assert len(products) > 0, "No products found in master data"
    product = products[0]
    product_id = product["id"]
    
    assert len(product["sizes"]) > 0, "No sizes found for product"
    size = product["sizes"][0]
    size_id = size["id"]

    # Get rule for expected material calc
    rules = client.get(f"/master-data/sizes/{size_id}/rules").json()
    # If rules exist, use the first one, else we accept default (which might be 0 or handle logic)
    # Looking at logic, rules might be optional or auto-picked? 
    # Let's pick a rule if available to be precise
    rule_id = rules[0]["id"] if rules else None
    exp_material_per_unit = rules[0]["length_required"] if rules else 0

    qty = 5
    payload = {
        "tailor_id": tailor_id,
        "notes": "TestSuite Order",
        "order_lines": [
            {
                "product_id": product_id,
                "size_id": size_id,
                "quantity": qty,
                "rule_id": rule_id
            }
        ]
    }

    # 2. Create Order
    response = client.post("/orders/", json=payload)
    assert response.status_code == 200, f"Order creation failed: {response.text}"
    order = response.json()
    
    # 3. Verify Consistency
    assert order["tailor_id"] == tailor_id
    line = order["order_lines"][0]
    
    assert line["quantity"] == qty
    assert line["pending_qty"] == qty, "Pending quantity should equal initial quantity"
    assert line["delivered_qty"] == 0, "Delivered quantity should start at 0"
    
    # Verify Material Calculation (if rule logic applies)
    if rule_id:
        assert line["material_req_per_unit"] == exp_material_per_unit
        assert line["total_material_req"] == exp_material_per_unit * qty

def test_invalid_tailor(client):
    """Test creating order with non-existent tailor ID (should fail)"""
    payload = {
        "tailor_id": 99999, 
        "order_lines": []
    }
    response = client.post("/orders/", json=payload)
    assert response.status_code != 200

def test_negative_quantity(client):
    """Test creating order with negative quantity (should fail validation)"""
    # Get valid IDs first
    resp_tailors = client.get("/master-data/tailors")
    assert resp_tailors.status_code == 200
    tailor_id = resp_tailors.json()[0]["id"]
    
    resp_products = client.get("/master-data/products")
    assert resp_products.status_code == 200
    product = resp_products.json()[0]
    
    payload = {
        "tailor_id": tailor_id,
        "order_lines": [
            {
                "product_id": product["id"],
                "size_id": product["sizes"][0]["id"],
                "quantity": -5
            }
        ]
    }
    response = client.post("/orders/", json=payload)
    assert response.status_code != 200

def test_security_edit_protection(client):
    """
    Test 3: Security - Edit Protection
    - Edit without password -> 401
    - Edit with wrong password -> 401
    - Edit with correct password -> 200
    """
    # Setup: Create an order to edit
    tailors = client.get("/master-data/tailors").json()
    products = client.get("/master-data/products").json()
    
    create_payload = {
        "tailor_id": tailors[0]["id"],
        "order_lines": [{"product_id": products[0]["id"], "size_id": products[0]["sizes"][0]["id"], "quantity": 10}]
    }
    order = client.post("/orders/", json=create_payload).json()
    line_id = order["order_lines"][0]["id"]
    
    # Password (assuming 'admin' from seed)
    password = "admin"
    update_data = {"quantity": 20}

    # 1. No Password
    resp = client.put(f"/orders/lines/{line_id}", json=update_data)
    assert resp.status_code == 401, "Should require password"

    # 2. Wrong Password
    resp = client.put(f"/orders/lines/{line_id}", json=update_data, headers={"X-Admin-Password": "wrong"})
    assert resp.status_code == 401, "Should reject wrong password"

    # 3. Correct Password
    resp = client.put(f"/orders/lines/{line_id}", json=update_data, headers={"X-Admin-Password": password})
    assert resp.status_code == 200, "Should match password"
    updated_line = resp.json()
    assert updated_line["quantity"] == 20
    assert updated_line["pending_qty"] == 20 # Logic check: update pending if no delivery

def test_security_delete_protection(client):
    """
    Test 4: Security - Delete Protection
    - Delete without password -> 401
    - Delete with wrong password -> 401
    - Delete with correct password -> 200
    """
    # Setup: Create an order to delete
    tailors = client.get("/master-data/tailors").json()
    products = client.get("/master-data/products").json()
    
    create_payload = {
        "tailor_id": tailors[0]["id"],
        "order_lines": [{"product_id": products[0]["id"], "size_id": products[0]["sizes"][0]["id"], "quantity": 10}]
    }
    order = client.post("/orders/", json=create_payload).json()
    line_id = order["order_lines"][0]["id"]
    
    password = "admin"

    # 1. No Password
    resp = client.delete(f"/orders/lines/{line_id}")
    assert resp.status_code == 401, "Should require password"

    # 2. Wrong Password
    resp = client.delete(f"/orders/lines/{line_id}", headers={"X-Admin-Password": "wrong"})
    assert resp.status_code == 401, "Should reject wrong password"

    # 3. Correct Password
    resp = client.delete(f"/orders/lines/{line_id}", headers={"X-Admin-Password": password})
    assert resp.status_code == 200, "Should allow delete with password"
    
    # Verify deletion
    # Assuming GET /orders/{id} returns the order, check lines?
    # Or fetch key again
    # If the endpoint truly deletes the line, fetching the order might show it empty or it might be cascade deleted?
    # Simpler check: accessing the line directly via an endpoint if it existed, or check order lines count.
    
    # Refetch order
    refetch = client.get(f"/orders/{order['id']}")
    if refetch.status_code == 200:
        # If order still exists, check lines
        curr_lines = refetch.json()["order_lines"]
        assert len(curr_lines) == 0, "Line should be deleted"
