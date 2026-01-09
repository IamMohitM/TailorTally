from typing import Dict, List, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def send_order_email(tailor_email: str, order_details: Dict[str, Any]):
    """
    Simulates sending an email to the tailor with order details.
    
    Args:
        tailor_email: The recipient's email address.
        order_details: A dictionary containing order information.
    """
    if not tailor_email:
        logger.warning("No email address provided for tailor. Skipping email.")
        return

    subject = f"New Order Received: #{order_details.get('id')}"
    
    # Format the email body
    body_lines = [
        f"Dear {order_details.get('tailor_name', 'Tailor')},",
        "",
        f"You have received a new order (ID: {order_details.get('id')}).",
        f"Date: {order_details.get('created_at')}",
        "",
        "Order Items:",
    ]
    
    for line in order_details.get('order_lines', []):
        try:
            # Handle both object and dict access for flexibility if schema dumping varies
             # (Assuming Pydantic model dump or dict access)
            product = line.get('product_name', 'Unknown Product')
            size = line.get('size_label', 'Unknown Size')
            qty = line.get('quantity', 0)
            material = line.get('total_material_req', 0)
            unit = line.get('unit', '')
            details = f"- {product} ({size}): {qty} units. Material: {material} {unit}"
            if line.get('school_name'):
                details += f" [School: {line.get('school_name')}]"
            body_lines.append(details)
        except Exception as e:
            logger.error(f"Error formatting line {line}: {e}")
            body_lines.append(f"- Error formatting item")

    if order_details.get('notes'):
        body_lines.append("")
        body_lines.append(f"Notes: {order_details.get('notes')}")
        
    body_lines.append("")
    body_lines.append("Please log in to your dashboard for more details.")
    body_lines.append("Best regards,")
    body_lines.append("Tailor Tally Team")
    
    email_body = "\n".join(body_lines)
    
    # Simulate sending
    print("="*60)
    print(f"SENDING EMAIL TO: {tailor_email}")
    print(f"SUBJECT: {subject}")
    print("-" * 60)
    print(email_body)
    print("="*60)
    
    logger.info(f"Email simulated to {tailor_email} for Order #{order_details.get('id')}")
