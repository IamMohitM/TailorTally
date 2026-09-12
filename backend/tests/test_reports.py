import pytest
from app import models
from datetime import datetime

def test_cloth_tally_report_structure(client, db):
    # Setup test entities
    tailor = models.Tailor(name="Test Tailor 1", phone="123456", email="test@tailor.com")
    school_a = models.School(name="Test School Alpha")
    school_b = models.School(name="Test School Beta")
    product = models.Product(name="Uniform Shirt")
    db.add_all([tailor, school_a, school_b, product])
    db.commit()

    size = models.Size(product_id=product.id, label="M")
    db.add(size)
    db.commit()

    # Create an order on 2026-03-01
    order1 = models.Order(
        tailor_id=tailor.id,
        status="In Progress",
        created_at=datetime(2026, 3, 1, 10, 0, 0),
        slip_no="SLIP-001"
    )
    db.add(order1)
    db.commit()

    # Add line 1: School Alpha, 10 qty, 2.0 m/unit = 20.0 total req, 25.0 given cloth
    line1 = models.OrderLine(
        order_id=order1.id,
        product_id=product.id,
        size_id=size.id,
        school_id=school_a.id,
        fabric_width_inches=36,
        material_req_per_unit=2.0,
        unit="meters",
        quantity=10,
        total_material_req=20.0,
        given_cloth=25.0
    )
    # Add line 2: School Beta, 5 qty, 1.5 m/unit = 7.5 total req, 5.0 given cloth
    line2 = models.OrderLine(
        order_id=order1.id,
        product_id=product.id,
        size_id=size.id,
        school_id=school_b.id,
        fabric_width_inches=36,
        material_req_per_unit=1.5,
        unit="meters",
        quantity=5,
        total_material_req=7.5,
        given_cloth=5.0
    )
    db.add_all([line1, line2])
    db.commit()

    # Deliver 6 pieces for line 1
    delivery = models.Delivery(
        order_line_id=line1.id,
        quantity_delivered=6,
        date_delivered=datetime(2026, 3, 2, 10, 0, 0)
    )
    db.add(delivery)
    db.commit()

    # 1. Test overall report without filters
    response = client.get("/reports/cloth-tally")
    assert response.status_code == 200
    data = response.json()

    assert "overall_summary" in data
    assert "tailor_summaries" in data
    assert "school_details" in data
    assert "filters" in data

    # Find Test Tailor 1
    tailor_summary = next((t for t in data["tailor_summaries"] if t["tailor_id"] == tailor.id), None)
    assert tailor_summary is not None
    assert tailor_summary["tailor_name"] == "Test Tailor 1"
    assert tailor_summary["total_pieces_ordered"] >= 15
    assert tailor_summary["total_pieces_delivered"] >= 6
    assert tailor_summary["total_cloth_given"] >= 30.0
    assert tailor_summary["total_cloth_required"] >= 27.5
    assert "Test School Alpha" in tailor_summary["schools_involved"]
    assert "Test School Beta" in tailor_summary["schools_involved"]

    # 2. Test School Filter (School Alpha only)
    response_school = client.get(f"/reports/cloth-tally?school_id={school_a.id}")
    assert response_school.status_code == 200
    data_school = response_school.json()

    assert data_school["filters"]["school_id"] == school_a.id
    assert data_school["filters"]["school_name"] == "Test School Alpha"

    school_entry = next((s for s in data_school["school_details"] if s["school_id"] == school_a.id), None)
    assert school_entry is not None
    assert school_entry["total_pieces_ordered"] == 10
    assert school_entry["total_pieces_delivered"] == 6
    assert school_entry["total_pieces_pending"] == 4
    assert school_entry["total_cloth_given"] == 25.0
    assert school_entry["total_cloth_required"] == 20.0
    assert school_entry["cloth_balance"] == 5.0
    assert len(school_entry["items"]) == 1
    assert school_entry["items"][0]["quantity"] == 10
    assert school_entry["items"][0]["delivered_qty"] == 6

    # 3. Test Date Filter (Matching range)
    response_date = client.get("/reports/cloth-tally?start_date=2026-03-01&end_date=2026-03-05")
    assert response_date.status_code == 200
    data_date = response_date.json()
    assert any(t["tailor_id"] == tailor.id for t in data_date["tailor_summaries"])

    # 4. Test Date Filter (Non-matching range)
    response_nomatch = client.get("/reports/cloth-tally?start_date=2025-01-01&end_date=2025-01-31")
    assert response_nomatch.status_code == 200
    data_nomatch = response_nomatch.json()
    assert not any(t["tailor_id"] == tailor.id for t in data_nomatch["tailor_summaries"])

    # 5. Test Tailor Filter
    response_tailor = client.get(f"/reports/cloth-tally?tailor_id={tailor.id}")
    assert response_tailor.status_code == 200
    data_tailor = response_tailor.json()
    assert len(data_tailor["tailor_summaries"]) == 1
    assert data_tailor["tailor_summaries"][0]["tailor_id"] == tailor.id
