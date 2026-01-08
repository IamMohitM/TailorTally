
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app import models, schemas
from app.database import get_db, Base, engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta

# Setup test DB
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

@pytest.fixture(scope="module")
def test_db():
    # Create tables
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Clean up existing data for clean state using delete statements for relationships and objects
    db.query(models.Delivery).delete()
    db.query(models.OrderLine).delete()
    db.query(models.Order).delete()
    db.query(models.Tailor).delete()
    db.commit()

    # Seed Data
    tailor1 = models.Tailor(name="Alice Tailor", is_active=True)
    tailor2 = models.Tailor(name="Bob Tailor", is_active=True)
    db.add(tailor1)
    db.add(tailor2)
    db.commit()

    # Create Orders with forced timestamps
    # Order 1: Alice, Pending, Oldest
    order1 = models.Order(tailor_id=tailor1.id, status="Pending", created_at=datetime.utcnow() - timedelta(days=2))
    # Order 2: Alice, Completed, Middle
    order2 = models.Order(tailor_id=tailor1.id, status="Completed", created_at=datetime.utcnow() - timedelta(days=1))
    # Order 3: Bob, Pending, Newest
    order3 = models.Order(tailor_id=tailor2.id, status="Pending", created_at=datetime.utcnow())
    
    db.add_all([order1, order2, order3])
    db.commit()
    
    # Refresh to get IDs
    db.refresh(order1)
    db.refresh(order2)
    db.refresh(order3)
    
    yield db
    
    # Teardown (optional since we clean at start, but good practice)
    db.close()

def test_list_orders_no_params(test_db):
    response = client.get("/orders/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    # Default sort is newest first
    assert data[0]['tailor_name'] == "Bob Tailor"
    assert data[2]['tailor_name'] == "Alice Tailor"

def test_list_orders_search_tailor(test_db):
    response = client.get("/orders/?search=Alice")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    for order in data:
        assert order['tailor_name'] == "Alice Tailor"

def test_list_orders_search_id(test_db):
    # Get an ID first
    response_all = client.get("/orders/")
    first_id = response_all.json()[0]['id']
    
    response = client.get(f"/orders/?search={first_id}")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]['id'] == first_id

def test_list_orders_filter_status(test_db):
    response = client.get("/orders/?status=Completed")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]['status'] == "Completed"

def test_list_orders_sort_oldest(test_db):
    response = client.get("/orders/?sort_by=oldest")
    assert response.status_code == 200
    data = response.json()
    # Oldest first (Alice, 2 days ago)
    assert data[0]['tailor_name'] == "Alice Tailor"
    assert data[0]['status'] == "Pending" # Verify it's the specific old order

def test_list_orders_combined(test_db):
    # Search Alice, Sort Oldest
    response = client.get("/orders/?search=Alice&sort_by=oldest")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    # Verify order
    t1 = datetime.fromisoformat(data[0]['created_at'])
    t2 = datetime.fromisoformat(data[1]['created_at'])
    assert t1 < t2
