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

    # 6. Test PDF report download endpoint
    response_pdf = client.get("/reports/cloth-tally/pdf")
    assert response_pdf.status_code == 200
    assert response_pdf.headers["content-type"] == "application/pdf"
    assert "attachment; filename=" in response_pdf.headers.get("content-disposition", "")
    assert len(response_pdf.content) > 500
    assert response_pdf.content.startswith(b"%PDF")

    # 7. Test PDF report with filters (school, tailor, date range)
    response_pdf_filt = client.get(f"/reports/cloth-tally/pdf?school_id={school_a.id}&tailor_id={tailor.id}&start_date=2026-03-01&end_date=2026-03-05")
    assert response_pdf_filt.status_code == 200
    assert response_pdf_filt.headers["content-type"] == "application/pdf"
    assert len(response_pdf_filt.content) > 500
    assert response_pdf_filt.content.startswith(b"%PDF")

    # 8. Test PDF report with empty / non-matching results
    response_pdf_empty = client.get("/reports/cloth-tally/pdf?start_date=2020-01-01&end_date=2020-01-02")
    assert response_pdf_empty.status_code == 200
    assert response_pdf_empty.headers["content-type"] == "application/pdf"
    assert len(response_pdf_empty.content) > 500
    assert response_pdf_empty.content.startswith(b"%PDF")


def test_hashlib_compat_usedforsecurity_rejection():
    """Verify that hashlib_compat gracefully handles Python 3.8 / OpenSSL builds that reject usedforsecurity."""
    import hashlib
    from app import hashlib_compat

    # Force patch re-application
    hashlib_compat.apply_hashlib_compat_patch()

    # Calling with data and usedforsecurity=False should succeed and return a valid hash
    h1 = hashlib.md5(b"test data", usedforsecurity=False)
    assert h1.hexdigest() == "eb733a00c0c9d336e65691a37ab54293"

    # Calling without data (empty init) and usedforsecurity=False should also succeed
    h2 = hashlib.md5(usedforsecurity=False)
    h2.update(b"test data")
    assert h2.hexdigest() == "eb733a00c0c9d336e65691a37ab54293"

    # Calling sha1/sha256 with usedforsecurity=False
    h_sha = hashlib.sha1(b"test data", usedforsecurity=False)
    assert h_sha.hexdigest() == "f48dd853820860816c75d54d0f584dc863327a7c"

    # Invalid type should still raise TypeError even when usedforsecurity is passed
    with pytest.raises(TypeError):
        hashlib.md5(12345, usedforsecurity=False)

    # Test simulating an underlying function raising keyword argument rejection
    orig_fn = hashlib.md5
    calls_kw = []

    def mock_kw_broken(*args, **kwargs):
        calls_kw.append(kwargs.copy())
        if "usedforsecurity" in kwargs:
            raise TypeError("usedforsecurity is an invalid keyword argument for openssl_md5()")
        return orig_fn(*args, **kwargs)

    safe_fn_kw = hashlib_compat._make_safe(mock_kw_broken)
    result_kw = safe_fn_kw(b"test data", usedforsecurity=False)
    assert result_kw.hexdigest() == "eb733a00c0c9d336e65691a37ab54293"
    assert len(calls_kw) == 2

    # Test simulating C-level argument count error in Python 3.8
    calls_argcount = []

    def mock_argcount_broken(*args, **kwargs):
        calls_argcount.append(kwargs.copy())
        if "usedforsecurity" in kwargs:
            raise TypeError("openssl_md5() takes at most 1 argument (2 given)")
        return orig_fn(*args, **kwargs)

    safe_fn_argcount = hashlib_compat._make_safe(mock_argcount_broken)
    result_argcount = safe_fn_argcount(b"test data", usedforsecurity=False)
    assert result_argcount.hexdigest() == "eb733a00c0c9d336e65691a37ab54293"
    assert len(calls_argcount) == 2


def test_pdf_generation_under_simulated_python38_windows(client):
    """
    Simulates the exact runtime environment of a remote Windows machine running Python 3.8 / OpenSSL
    where hashlib.md5 raises TypeError when called with usedforsecurity=False.
    Verifies that the PDF endpoint succeeds and returns valid PDF binary data without crashing.
    """
    import hashlib
    from app import hashlib_compat

    real_md5 = hashlib.md5

    def broken_windows_py38_md5(*args, **kwargs):
        if "usedforsecurity" in kwargs:
            raise TypeError("usedforsecurity is an invalid keyword argument for openssl_md5()")
        return real_md5(*args, **kwargs)

    # Wrap the simulated broken function with our compatibility wrapper
    hashlib.md5 = hashlib_compat._make_safe(broken_windows_py38_md5)

    try:
        response = client.get("/reports/cloth-tally/pdf")
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert response.content.startswith(b"%PDF")
        assert len(response.content) > 500
    finally:
        # Restore real md5
        hashlib.md5 = real_md5
        hashlib_compat.apply_hashlib_compat_patch()
