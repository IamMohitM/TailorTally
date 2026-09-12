from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import datetime
import io

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

from .. import models
from ..database import get_db

router = APIRouter(
    prefix="/reports",
    tags=["reports"]
)

def parse_datetime_param(dt_str: Optional[str], is_end_of_day: bool = False) -> Optional[datetime]:
    if not dt_str:
        return None
    dt_str = dt_str.strip()
    if not dt_str:
        return None
    try:
        if "T" in dt_str:
            clean_str = dt_str.replace("Z", "+00:00")
            return datetime.fromisoformat(clean_str)
        # Expect YYYY-MM-DD
        dt = datetime.strptime(dt_str, "%Y-%m-%d")
        if is_end_of_day:
            return dt.replace(hour=23, minute=59, second=59, microsecond=999999)
        return dt
    except Exception:
        return None

def calculate_cloth_tally_data(
    db: Session,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    school_id: Optional[int] = None,
    tailor_id: Optional[int] = None
) -> Dict[str, Any]:
    start_dt = parse_datetime_param(start_date, is_end_of_day=False)
    end_dt = parse_datetime_param(end_date, is_end_of_day=True)

    orders_query = db.query(models.Order)

    if start_dt:
        orders_query = orders_query.filter(models.Order.created_at >= start_dt)
    if end_dt:
        orders_query = orders_query.filter(models.Order.created_at <= end_dt)
    if tailor_id:
        orders_query = orders_query.filter(models.Order.tailor_id == tailor_id)

    orders = orders_query.order_by(models.Order.created_at.desc(), models.Order.id.desc()).all()

    selected_school_name = "All Schools"
    if school_id:
        school_obj = db.query(models.School).filter(models.School.id == school_id).first()
        if school_obj:
            selected_school_name = school_obj.name

    selected_tailor_name = "All Tailors"
    if tailor_id:
        tailor_obj = db.query(models.Tailor).filter(models.Tailor.id == tailor_id).first()
        if tailor_obj:
            selected_tailor_name = tailor_obj.name

    filtered_orders_map = {}
    tailor_map: Dict[int, Dict[str, Any]] = {}
    school_map: Dict[Any, Dict[str, Any]] = {}

    total_pieces_ordered = 0
    total_pieces_delivered = 0
    total_pieces_pending = 0
    total_cloth_given = 0.0
    total_cloth_required = 0.0
    total_cloth_used = 0.0
    total_cloth_pending = 0.0

    for order in orders:
        matching_lines = []
        for line in order.order_lines:
            if school_id is not None and line.school_id != school_id:
                continue
            matching_lines.append(line)

        if not matching_lines:
            continue

        filtered_orders_map[order.id] = order

        tailor = order.tailor
        tid = tailor.id if tailor else 0
        tname = tailor.name if tailor else "Unknown Tailor"

        if tid not in tailor_map:
            tailor_map[tid] = {
                "tailor_id": tid,
                "tailor_name": tname,
                "phone": tailor.phone if tailor else None,
                "email": tailor.email if tailor else None,
                "orders_count": 0,
                "order_ids": set(),
                "schools_involved": set(),
                "total_pieces_ordered": 0,
                "total_pieces_delivered": 0,
                "total_pieces_pending": 0,
                "total_cloth_given": 0.0,
                "total_cloth_required": 0.0,
                "total_cloth_used": 0.0,
                "total_cloth_pending": 0.0,
                "orders": []
            }

        tailor_entry = tailor_map[tid]
        tailor_entry["order_ids"].add(order.id)

        order_pieces_ordered = 0
        order_pieces_delivered = 0
        order_pieces_pending = 0
        order_cloth_given = 0.0
        order_cloth_required = 0.0
        order_schools = set()

        for line in matching_lines:
            qty = line.quantity or 0
            del_qty = sum(d.quantity_delivered for d in line.deliveries)
            pend_qty = max(0, qty - del_qty)
            mat_rate = line.material_req_per_unit or 0.0
            line_tot_req = line.total_material_req if line.total_material_req is not None else (qty * mat_rate)
            line_used = del_qty * mat_rate
            line_pend = pend_qty * mat_rate
            line_given = float(line.given_cloth) if line.given_cloth is not None else 0.0

            s_id = line.school_id
            s_name = line.school.name if line.school else "General / Unassigned"

            order_pieces_ordered += qty
            order_pieces_delivered += del_qty
            order_pieces_pending += pend_qty
            order_cloth_given += line_given
            order_cloth_required += line_tot_req
            order_schools.add(s_name)

            tailor_entry["schools_involved"].add(s_name)
            tailor_entry["total_pieces_ordered"] += qty
            tailor_entry["total_pieces_delivered"] += del_qty
            tailor_entry["total_pieces_pending"] += pend_qty
            tailor_entry["total_cloth_given"] += line_given
            tailor_entry["total_cloth_required"] += line_tot_req
            tailor_entry["total_cloth_used"] += line_used
            tailor_entry["total_cloth_pending"] += line_pend

            total_pieces_ordered += qty
            total_pieces_delivered += del_qty
            total_pieces_pending += pend_qty
            total_cloth_given += line_given
            total_cloth_required += line_tot_req
            total_cloth_used += line_used
            total_cloth_pending += line_pend

            if s_id not in school_map:
                school_map[s_id] = {
                    "school_id": s_id,
                    "school_name": s_name,
                    "order_ids": set(),
                    "total_pieces_ordered": 0,
                    "total_pieces_delivered": 0,
                    "total_pieces_pending": 0,
                    "total_cloth_given": 0.0,
                    "total_cloth_required": 0.0,
                    "total_cloth_used": 0.0,
                    "total_cloth_pending": 0.0,
                    "tailors_involved": set(),
                    "items": []
                }

            s_entry = school_map[s_id]
            s_entry["order_ids"].add(order.id)
            s_entry["tailors_involved"].add(tname)
            s_entry["total_pieces_ordered"] += qty
            s_entry["total_pieces_delivered"] += del_qty
            s_entry["total_pieces_pending"] += pend_qty
            s_entry["total_cloth_given"] += line_given
            s_entry["total_cloth_required"] += line_tot_req
            s_entry["total_cloth_used"] += line_used
            s_entry["total_cloth_pending"] += line_pend

            balance = round(line_given - line_tot_req, 2) if line.given_cloth is not None else None

            s_entry["items"].append({
                "line_id": line.id,
                "order_id": order.id,
                "slip_no": order.slip_no or "",
                "order_date": order.created_at.strftime("%Y-%m-%d") if order.created_at else "-",
                "order_status": order.status,
                "tailor_id": tid,
                "tailor_name": tname,
                "product_id": line.product_id,
                "product_name": line.product.name if line.product else f"Product #{line.product_id}",
                "size_id": line.size_id,
                "size_label": line.size.label if line.size else f"Size #{line.size_id}",
                "fabric_width_inches": line.fabric_width_inches,
                "quantity": qty,
                "delivered_qty": del_qty,
                "pending_qty": pend_qty,
                "material_req_per_unit": round(mat_rate, 2),
                "unit": line.unit or "meters",
                "total_material_req": round(line_tot_req, 2),
                "given_cloth": round(line_given, 2) if line.given_cloth is not None else None,
                "balance": balance,
                "group_id": line.group_id
            })

        tailor_entry["orders"].append({
            "order_id": order.id,
            "slip_no": order.slip_no or "-",
            "created_at": order.created_at.strftime("%Y-%m-%d") if order.created_at else "-",
            "status": order.status,
            "notes": order.notes or "",
            "pieces_ordered": order_pieces_ordered,
            "pieces_delivered": order_pieces_delivered,
            "pieces_pending": order_pieces_pending,
            "cloth_given": round(order_cloth_given, 2),
            "cloth_required": round(order_cloth_required, 2),
            "schools": sorted(list(order_schools))
        })

    tailor_summaries = []
    for t_id, data in sorted(tailor_map.items(), key=lambda x: x[1]["tailor_name"]):
        ord_count = len(data["order_ids"])
        tot_ord = data["total_pieces_ordered"]
        tot_del = data["total_pieces_delivered"]
        comp_pct = round((tot_del / tot_ord * 100), 1) if tot_ord > 0 else 0.0
        given = round(data["total_cloth_given"], 2)
        required = round(data["total_cloth_required"], 2)
        used = round(data["total_cloth_used"], 2)
        pending = round(data["total_cloth_pending"], 2)

        tailor_summaries.append({
            "tailor_id": data["tailor_id"],
            "tailor_name": data["tailor_name"],
            "phone": data["phone"],
            "email": data["email"],
            "orders_count": ord_count,
            "schools_involved": sorted(list(data["schools_involved"])),
            "total_pieces_ordered": tot_ord,
            "total_pieces_delivered": tot_del,
            "total_pieces_pending": data["total_pieces_pending"],
            "completion_percentage": comp_pct,
            "total_cloth_given": given,
            "total_cloth_required": required,
            "total_cloth_used": used,
            "total_cloth_pending": pending,
            "cloth_balance": round(given - required, 2),
            "cloth_in_hand": round(given - used, 2),
            "orders": sorted(data["orders"], key=lambda o: o["order_id"], reverse=True)
        })

    school_details = []
    for s_id, s_data in sorted(school_map.items(), key=lambda x: (x[1]["school_name"] == "General / Unassigned", x[1]["school_name"])):
        given = round(s_data["total_cloth_given"], 2)
        required = round(s_data["total_cloth_required"], 2)
        used = round(s_data["total_cloth_used"], 2)
        pending = round(s_data["total_cloth_pending"], 2)

        school_details.append({
            "school_id": s_data["school_id"],
            "school_name": s_data["school_name"],
            "total_orders": len(s_data["order_ids"]),
            "total_pieces_ordered": s_data["total_pieces_ordered"],
            "total_pieces_delivered": s_data["total_pieces_delivered"],
            "total_pieces_pending": s_data["total_pieces_pending"],
            "total_cloth_given": given,
            "total_cloth_required": required,
            "total_cloth_used": used,
            "total_cloth_pending": pending,
            "cloth_balance": round(given - required, 2),
            "cloth_in_hand": round(given - used, 2),
            "tailors_involved": sorted(list(s_data["tailors_involved"])),
            "items": s_data["items"]
        })

    overall_summary = {
        "total_orders": len(filtered_orders_map),
        "total_pieces_ordered": total_pieces_ordered,
        "total_pieces_delivered": total_pieces_delivered,
        "total_pieces_pending": total_pieces_pending,
        "total_cloth_given": round(total_cloth_given, 2),
        "total_cloth_required": round(total_cloth_required, 2),
        "total_cloth_used": round(total_cloth_used, 2),
        "total_cloth_pending": round(total_cloth_pending, 2),
        "net_cloth_balance": round(total_cloth_given - total_cloth_required, 2),
        "net_cloth_in_hand": round(total_cloth_given - total_cloth_used, 2),
        "active_tailors_count": len(tailor_summaries),
        "active_schools_count": len([s for s in school_details if s["school_name"] != "General / Unassigned"])
    }

    return {
        "filters": {
            "start_date": start_date,
            "end_date": end_date,
            "school_id": school_id,
            "school_name": selected_school_name,
            "tailor_id": tailor_id,
            "tailor_name": selected_tailor_name
        },
        "overall_summary": overall_summary,
        "tailor_summaries": tailor_summaries,
        "school_details": school_details
    }

@router.get("/cloth-tally")
def get_cloth_tally_report(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD or ISO)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD or ISO)"),
    school_id: Optional[int] = Query(None, description="Filter by school ID"),
    tailor_id: Optional[int] = Query(None, description="Filter by tailor ID"),
    db: Session = Depends(get_db)
):
    return calculate_cloth_tally_data(db, start_date, end_date, school_id, tailor_id)

@router.get("/cloth-tally/pdf")
def get_cloth_tally_pdf(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD or ISO)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD or ISO)"),
    school_id: Optional[int] = Query(None, description="Filter by school ID"),
    tailor_id: Optional[int] = Query(None, description="Filter by tailor ID"),
    db: Session = Depends(get_db)
):
    data = calculate_cloth_tally_data(db, start_date, end_date, school_id, tailor_id)

    filters = data["filters"]
    overall = data["overall_summary"]
    tailors = data["tailor_summaries"]
    schools = data["school_details"]

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=landscape(A4),
        rightMargin=20,
        leftMargin=20,
        topMargin=20,
        bottomMargin=20
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontSize=15,
        leading=18,
        textColor=colors.HexColor('#0f172a'),
        spaceAfter=2
    )
    meta_style = ParagraphStyle(
        'DocMeta',
        parent=styles['Normal'],
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#64748b'),
        spaceAfter=10
    )
    h2_style = ParagraphStyle(
        'H2Title',
        parent=styles['Heading2'],
        fontSize=11,
        leading=14,
        textColor=colors.HexColor('#1e293b'),
        spaceBefore=10,
        spaceAfter=4
    )
    school_header_style = ParagraphStyle(
        'SchoolH',
        parent=styles['Heading3'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor('#0f172a'),
        spaceBefore=8,
        spaceAfter=3
    )

    story = []

    # Title & Metadata
    story.append(Paragraph('<b>Tailor Tally — Cloth Allocation & Orders Report</b>', title_style))
    period_str = f"{filters['start_date'] or 'Earliest'} to {filters['end_date'] or 'Latest'}" if (filters['start_date'] or filters['end_date']) else "All Historical Orders"
    meta_text = f"<b>Generated:</b> {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')} | <b>Period:</b> {period_str} | <b>School Filter:</b> {filters['school_name']} | <b>Tailor Filter:</b> {filters['tailor_name']}"
    story.append(Paragraph(meta_text, meta_style))

    # 1. Tailor Orders & Material Summary Table
    story.append(Paragraph('<b>1. Tailor Orders & Material Summary</b>', h2_style))

    t_header = ['Tailor Name', 'Orders', 'Cloth Given', 'Cloth Req.', 'Balance', 'Garments (Del/Ord)', 'Completion']
    t_rows = [t_header]

    for t in tailors:
        bal_str = f"+{t['cloth_balance']:.2f} m" if t['cloth_balance'] >= 0 else f"{t['cloth_balance']:.2f} m"
        t_rows.append([
            t['tailor_name'],
            str(t['orders_count']),
            f"{t['total_cloth_given']:.2f} m",
            f"{t['total_cloth_required']:.2f} m",
            bal_str,
            f"{t['total_pieces_delivered']} / {t['total_pieces_ordered']}",
            f"{t['completion_percentage']:.1f}%"
        ])

    tot_bal_str = f"+{overall['net_cloth_balance']:.2f} m" if overall['net_cloth_balance'] >= 0 else f"{overall['net_cloth_balance']:.2f} m"
    comp_all = f"{(overall['total_pieces_delivered'] / overall['total_pieces_ordered'] * 100):.1f}%" if overall['total_pieces_ordered'] > 0 else "0.0%"
    t_rows.append([
        'Total',
        str(overall['total_orders']),
        f"{overall['total_cloth_given']:.2f} m",
        f"{overall['total_cloth_required']:.2f} m",
        tot_bal_str,
        f"{overall['total_pieces_delivered']} / {overall['total_pieces_ordered']}",
        comp_all
    ])

    t_table = Table(t_rows, colWidths=[180, 60, 110, 110, 110, 140, 90])
    t_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f1f5f9')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#1e293b')),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (2, 0), (4, -1), 'RIGHT'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#e2e8f0')),
    ]))
    story.append(t_table)
    story.append(Spacer(1, 12))

    # 2. Detailed Cloth & Garment Allocations by School
    story.append(Paragraph('<b>2. Detailed Allocations by School</b>', h2_style))

    if not schools:
        story.append(Paragraph('<i>No school orders found matching the filter criteria.</i>', meta_style))
    else:
        for school in schools:
            sch_bal_str = f"+{school['cloth_balance']:.2f} m" if school['cloth_balance'] >= 0 else f"{school['cloth_balance']:.2f} m"
            sch_hdr_text = f"<b>School: {school['school_name']}</b> | Orders: {school['total_orders']} | Tailors: {', '.join(school['tailors_involved']) or '-'} | Given: {school['total_cloth_given']:.2f} m | Req: {school['total_cloth_required']:.2f} m | Variance: {sch_bal_str}"
            story.append(Paragraph(sch_hdr_text, school_header_style))

            s_header = ['Order', 'Date', 'Tailor', 'Product & Size', 'Width', 'Qty (Del/Ord)', 'Cloth Given', 'Req. Cloth', 'Balance', 'Status']
            s_rows = [s_header]

            for it in school['items']:
                order_lbl = f"#{it['order_id']}"
                if it['slip_no']:
                    order_lbl += f" ({it['slip_no']})"
                prod_size = f"{it['product_name']} - {it['size_label']}"
                w_str = f"{it['fabric_width_inches']}\"" if it['fabric_width_inches'] else "-"
                qty_str = f"{it['delivered_qty']} / {it['quantity']}"
                given_str = f"{it['given_cloth']:.2f} m" if it['given_cloth'] is not None else "-"
                req_str = f"{it['total_material_req']:.2f} m"
                bal_str = f"{'+' if it['balance'] >= 0 else ''}{it['balance']:.2f} m" if it['balance'] is not None else "-"

                s_rows.append([
                    order_lbl,
                    it['order_date'],
                    it['tailor_name'],
                    prod_size,
                    w_str,
                    qty_str,
                    given_str,
                    req_str,
                    bal_str,
                    it['order_status']
                ])

            s_rows.append([
                'School Subtotal',
                '',
                '',
                '',
                '',
                f"{school['total_pieces_delivered']} / {school['total_pieces_ordered']}",
                f"{school['total_cloth_given']:.2f} m",
                f"{school['total_cloth_required']:.2f} m",
                sch_bal_str,
                ''
            ])

            s_table = Table(s_rows, colWidths=[75, 60, 95, 175, 45, 80, 75, 75, 60, 60])
            s_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#f8fafc')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.HexColor('#334155')),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 7.5),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
                ('TOPPADDING', (0, 0), (-1, -1), 3),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (4, 0), (5, -1), 'CENTER'),
                ('ALIGN', (6, 0), (8, -1), 'RIGHT'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
                ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
                ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#f1f5f9')),
            ]))
            story.append(s_table)
            story.append(Spacer(1, 8))

    doc.build(story)
    pdf_bytes = buf.getvalue()

    school_slug = filters['school_name'].lower().replace(' ', '_').replace('/', '_')
    date_slug = (filters['start_date'] or 'earliest') + '_to_' + (filters['end_date'] or 'latest')
    filename = f"cloth_tally_report_{school_slug}_{date_slug}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"'
        }
    )
