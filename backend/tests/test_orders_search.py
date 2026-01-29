import pytest
from app import models, schemas
from datetime import datetime, timedelta

@pytest.fixture(scope="function")
def search_data(db):
    # Seed Data specifically for search tests
    tailor1 = models.Tailor(name="Alice Tailor", is_active=True)
    tailor2 = models.Tailor(name="Bob Tailor", is_active=True)
    db.add(tailor1)
    db.add(tailor2)
    db.commit()

    # Create Orders with forced timestamps
    order1 = models.Order(tailor_id=tailor1.id, status="Pending", created_at=datetime.utcnow() - timedelta(days=2))
    order2 = models.Order(tailor_id=tailor1.id, status="Completed", created_at=datetime.utcnow() - timedelta(days=1))
    order3 = models.Order(tailor_id=tailor2.id, status="Pending", created_at=datetime.utcnow())
    
    db.add_all([order1, order2, order3])
    db.commit()
    return {"tailor1": tailor1, "tailor2": tailor2}

def test_list_orders_no_params(client, search_data):
    response = client.get("/orders/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    # Default sort is newest first
    assert data[0]['tailor_name'] == "Bob Tailor"
    assert data[2]['tailor_name'] == "Alice Tailor"

def test_list_orders_search_tailor(client, search_data):
    response = client.get("/orders/?search=Alice")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    for order in data:
        assert order['tailor_name'] == "Alice Tailor"

def test_list_orders_search_id(client, search_data):
    # Get an ID first
    response_all = client.get("/orders/")
    first_id = response_all.json()[0]['id']
    
    response = client.get(f"/orders/?search={first_id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]['id'] == first_id

def test_list_orders_filter_status(client, search_data):
    response = client.get("/orders/?status=Completed")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]['status'] == "Completed"

def test_list_orders_sort_oldest(client, search_data):
    response = client.get("/orders/?sort_by=oldest")
    assert response.status_code == 200
    data = response.json()
    # Oldest first (Alice, 2 days ago)
    assert data[0]['tailor_name'] == "Alice Tailor"
    assert data[0]['status'] == "Pending" # Verify it's the specific old order

def test_list_orders_combined(client, search_data):
    # Search Alice, Sort Oldest
    response = client.get("/orders/?search=Alice&sort_by=oldest")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    # Verify order
    t1 = datetime.fromisoformat(data[0]['created_at'])
    t2 = datetime.fromisoformat(data[1]['created_at'])
    assert t1 < t2
