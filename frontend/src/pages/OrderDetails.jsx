import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchAPI } from '../api';

import PrintableOrder from '../components/PrintableOrder';

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrder();
  }, [id]);

  async function loadOrder() {
    setLoading(true);
    try {
      const data = await fetchAPI(`/orders/${id}`);
      setOrder(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div>Loading...</div>;
  if (!order) return <div>Order not found</div>;

  return (
    <div>
      <div className="no-print flex justify-between items-center" style={{marginBottom: '1rem'}}>
        <div>
            <h1>Order #{order.id}</h1>
            <div style={{ color: '#666' }}>Tailor: {order.tailor_name} | Status: {order.status}</div>
        </div>
        <div className="flex gap-2">
            <button className="btn" onClick={handlePrint}>Print / Save PDF</button>
            <Link to="/" className="btn" style={{background: '#6b7280'}}>Back to List</Link>
        </div>
      </div>

      <div className="no-print card">
        <h3>Items</h3>

        <table style={{ border: 'none', boxShadow: 'none' }}>
            <thead>
                <tr>
                    <th>Product</th>
                    <th>Size</th>
                    <th>Material / Unit</th>
                    <th>In Hand</th>
                    <th>Ordered</th>
                    <th>Delivered</th>
                    <th>Pending</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                {order.order_lines.map(line => (
                   <OrderLineRow key={line.id} line={line} onUpdate={loadOrder} />
                ))}
            </tbody>
        </table>
      </div>

      <PrintableOrder order={order} />
    </div>
  );
}



function OrderLineRow({ line, onUpdate }) {
    const isCompleted = line.pending_qty <= 0;
    const [deliveryQty, setDeliveryQty] = useState("");
    const [recording, setRecording] = useState(false);
    const [showHistory, setShowHistory] = useState(false);

    async function handleDelivery() {
        if (!deliveryQty || parseInt(deliveryQty) <= 0) return;
        try {
            await fetchAPI(`/orders/lines/${line.id}/deliveries`, {
                method: 'POST',
                body: JSON.stringify({ quantity_delivered: parseInt(deliveryQty) })
            });
            setRecording(false);
            setDeliveryQty("");
            onUpdate();
        } catch (e) {
            alert("Failed to record delivery");
        }
    }

    // Column Calculations
    const materialInHand = (line.pending_qty * line.material_req_per_unit).toFixed(2);

    return (
        <>
            <tr>
                <td><strong>{line.product_name}</strong></td>
                <td>{line.size_label}</td>
                <td>{line.material_req_per_unit} {line.unit}</td>
                <td style={{ color: '#666' }}>{materialInHand} {line.unit}</td>
                <td>{line.quantity}</td>
                <td>{line.delivered_qty}</td>
                <td style={{ color: isCompleted ? 'green' : 'orange', fontWeight: 'bold' }}>{line.pending_qty}</td>
                <td>
                    <div className="flex gap-2">
                        {isCompleted ? (
                            <span className="badge success">Done</span>
                        ) : (
                            recording ? (
                                <div className="flex gap-1 items-center">
                                    <input 
                                        type="number" 
                                        className="input" 
                                        style={{ width: '50px', padding: '0.2rem' }} 
                                        value={deliveryQty} 
                                        onChange={e => setDeliveryQty(e.target.value)}
                                        placeholder="Qty"
                                    />
                                    <button className="btn success" style={{ padding: '0.2rem 0.5rem' }} onClick={handleDelivery}>✓</button>
                                    <button className="btn danger" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setRecording(false)}>X</button>
                                </div>
                            ) : (
                                <button className="btn" style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }} onClick={() => setRecording(true)}>+ Del</button>
                            )
                        )}
                        <button 
                            className="btn" 
                            style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', background: '#eee', color: '#333' }}
                            onClick={() => setShowHistory(!showHistory)}
                        >
                            {showHistory ? 'Hide Log' : 'Log'}
                        </button>
                    </div>
                </td>
            </tr>
            {showHistory && (
                <tr>
                    <td colSpan="8" style={{ background: '#f9f9f9', padding: '0.5rem 2rem' }}>
                        <strong>Delivery History</strong>
                        {line.deliveries && line.deliveries.length > 0 ? (
                            <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
                                {line.deliveries.map(d => (
                                    <li key={d.id}>
                                        {new Date(d.date_delivered).toLocaleString()}: <strong>{d.quantity_delivered}</strong> delivered
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div style={{ fontStyle: 'italic', color: '#777', margin: '0.5rem 0' }}>No deliveries recorded yet.</div>
                        )}
                    </td>
                </tr>
            )}
        </>
    )
}
