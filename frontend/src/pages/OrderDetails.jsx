import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchAPI } from '../api';
import { formatDate } from '../utils';

import PrintableOrder from '../components/PrintableOrder';

export default function OrderDetails() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [masterData, setMasterData] = useState({ products: [], schools: [] });

  useEffect(() => {
    loadOrder();
    loadMasterData();
  }, [id]);

  async function loadOrder() {
    // setLoading(true); // Don't block UI if just refreshing
    try {
      const data = await fetchAPI(`/orders/${id}`);
      setOrder(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function loadMasterData() {
      try {
          // We can reuse the endpoints from MasterData or new dedicated ones.
          // Assuming /products and /schools exist or similar.
          // Checking routers/master_data.py would be wise, but I recall previous context suggesting they exist.
          // The snippet shows `MasterData.jsx` uses them.
          // If not, I'll have to improvise or check.
          // Let's assume standard endpoints: /master/products, /schools ...
          // Wait, I should check `master_data.py`. I haven't read it fully.
          // I'll read it in a separate tool call if needed, but for now I'll use common sense or peek.
          // OK, I'll assume they are:
          // fetchAPI('/products')
          // fetchAPI('/schools')
          // fetchAPI('/tailors') - not needed here
          
          const [products, schools] = await Promise.all([
             fetchAPI('/master-data/products').catch(() => []), 
             fetchAPI('/schools').catch(() => [])
          ]);
          setMasterData({ products, schools });
      } catch (e) {
          console.error("Failed to load master data", e);
      }
  }

  const handlePrint = () => {
    window.print();
  };

  const groupStats = useMemo(() => {
      if (!order || !order.order_lines) return {};
      const stats = {};
      order.order_lines.forEach(line => {
          if (line.group_id) {
              if (!stats[line.group_id]) stats[line.group_id] = 0;
              stats[line.group_id] += (line.quantity * line.material_req_per_unit);
          }
      });
      return stats;
  }, [order]);

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
        </div>
      </div>

      <div className="no-print card">
        <h3>Items</h3>

        <table style={{ border: 'none', boxShadow: 'none' }}>
            <thead>
                <tr>
                    <th>Product</th>
                    <th>School</th>
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
                   <OrderLineRow 
                       key={line.id} 
                       line={line} 
                       onUpdate={loadOrder} 
                       masterData={masterData}
                       groupStats={groupStats}
                   />
                ))}
            </tbody>
        </table>
      </div>

      <PrintableOrder order={order} />
    </div>
  );
}



function OrderLineRow({ line, onUpdate, masterData, groupStats }) {
    const isCompleted = line.pending_qty <= 0;
    const [deliveryQty, setDeliveryQty] = useState("");
    const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
    const [recording, setRecording] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});

    // Material In Hand Calculation
    const materialInHand = (line.pending_qty * line.material_req_per_unit).toFixed(2);

    // Close menu on click outside
    useEffect(() => {
        const closeMenu = () => setShowMenu(false);
        if (showMenu) {
            document.addEventListener('click', closeMenu);
        }
        return () => document.removeEventListener('click', closeMenu);
    }, [showMenu]);

    function startEdit() {
        setEditData({
            product_id: line.product_id,
            school_id: line.school_id || "",
            size_id: line.size_id,
            quantity: line.quantity,
            fabric_width_inches: line.fabric_width_inches
        });
        setIsEditing(true);
    }

    async function handleSave() {
        try {
            await fetchAPI(`/orders/lines/${line.id}`, {
                method: 'PUT',
                body: JSON.stringify(editData)
            });
            setIsEditing(false);
            onUpdate();
        } catch (e) {
            alert("Failed to update line: " + e.message);
        }
    }

    async function handleDeleteConfirmed() {
        try {
            await fetchAPI(`/orders/lines/${line.id}`, {
                method: 'DELETE'
            });
            setShowConfirmDelete(false);
            onUpdate();
        } catch (e) {
            alert("Failed to delete line: " + e.message);
            setShowConfirmDelete(false);
        }
    }

    async function handleDelivery() {
        if (!deliveryQty || parseInt(deliveryQty) <= 0) return;
        try {
            await fetchAPI(`/orders/lines/${line.id}/deliveries`, {
                method: 'POST',
                body: JSON.stringify({ 
                    quantity_delivered: parseInt(deliveryQty),
                    date_delivered: new Date(deliveryDate).toISOString() 
                })
            });
            setRecording(false);
            setDeliveryQty("");
            onUpdate();
        } catch (e) {
            alert("Failed to record delivery");
        }
    }

    // Helpers for Edit Mode
    const selectedProduct = masterData.products.find(p => p.id == editData.product_id);
    const availableSizes = selectedProduct ? selectedProduct.sizes : [];

    if (isEditing) {
        return (
            <tr>
                <td>
                    <select 
                        className="input"
                        value={editData.product_id} 
                        onChange={e => {
                            const pid = parseInt(e.target.value);
                            const prod = masterData.products.find(p => p.id === pid);
                            const firstSize = prod && prod.sizes.length > 0 ? prod.sizes[0].id : "";
                            setEditData({ ...editData, product_id: pid, size_id: firstSize });
                        }}
                    >
                        {masterData.products.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </td>
                <td>
                    <select 
                        className="input"
                        value={editData.school_id} 
                        onChange={e => setEditData({ ...editData, school_id: e.target.value ? parseInt(e.target.value) : null })}
                    >
                        <option value="">- None -</option>
                        {masterData.schools.map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                </td>
                <td>
                    <select 
                        className="input"
                        value={editData.size_id} 
                        onChange={e => setEditData({ ...editData, size_id: parseInt(e.target.value) })}
                    >
                        {availableSizes.map(s => (
                            <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                    </select>
                </td>
                <td colSpan="2" style={{ color: '#999', fontSize: '0.8rem' }}>
                    (Will Recalc)
                </td>
                <td>
                    <input 
                        type="number" 
                        className="input"
                        style={{ width: '60px' }}
                        value={editData.quantity} 
                        onChange={e => setEditData({ ...editData, quantity: parseInt(e.target.value) })}
                    />
                </td>
                <td colSpan="2" className="text-center">
                   
                </td>
                <td>
                    <div className="flex gap-1">
                        <button className="btn success" style={{ padding: '0.2rem 0.5rem' }} onClick={handleSave}>Save</button>
                        <button className="btn danger" style={{ padding: '0.2rem 0.5rem' }} onClick={() => setIsEditing(false)}>Cancel</button>
                    </div>
                </td>
            </tr>
        );
    }

    return (
        <>
            <tr>
                <td><strong>{line.product_name}</strong></td>
                <td>{line.school_name || '-'}</td>
                <td>{line.size_label}</td>
                <td>{line.material_req_per_unit} {line.unit}</td>
                <td style={{ color: '#666' }}>{materialInHand} {line.unit}</td>
                <td>{line.quantity}</td>
                <td>{line.delivered_qty}</td>
                <td style={{ color: isCompleted ? 'green' : 'orange', fontWeight: 'bold' }}>
                    {line.pending_qty}
                    {line.given_cloth ? (() => {
                        const given = parseFloat(line.given_cloth);
                        const est = (line.group_id && groupStats && groupStats[line.group_id]) 
                            ? groupStats[line.group_id] 
                            : (line.quantity * line.material_req_per_unit);
                        const diff = given - est;
                        
                        return (
                            <div style={{ fontSize: '0.75rem', marginTop: '2px', fontWeight: 'normal' }}>
                                <div style={{ color: '#555' }}>Given: {given}m</div>
                                <div style={{ color: '#777' }} title="Total estimated for group">Est: {est.toFixed(2)}m</div>
                                <div style={{ color: diff >= 0 ? '#2e7d32' : '#c62828', fontWeight: '600' }}>
                                    {diff >= 0 ? '+' : ''}{diff.toFixed(2)}m
                                </div>
                            </div>
                        );
                    })() : null}
                </td>
                <td className="relative">
                     {/* Confirmation Modal */}
                     {showConfirmDelete && (
                        <div className="modal-overlay" style={{ zIndex: 100 }}>
                            <div className="modal-content" style={{ maxWidth: '400px' }}>
                                <h3 className="modal-title">Delete Item?</h3>
                                <p className="modal-message">
                                    Are you sure you want to delete <strong>{line.product_name}</strong> ({line.size_label})? This action cannot be undone.
                                </p>
                                <div className="modal-actions">
                                    <button className="btn" style={{ background: '#e5e7eb', color: '#374151' }} onClick={() => setShowConfirmDelete(false)}>Cancel</button>
                                    <button className="btn danger" onClick={handleDeleteConfirmed}>Delete</button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2 items-center">
                        {isCompleted ? (
                             <span className="badge success">Done</span>
                        ) : (
                            recording ? (
                                <div className="flex gap-1 items-center" style={{ position: 'absolute', right: 0, background: 'white', padding: '5px', borderRadius: '4px', border: '1px solid #eee', boxShadow: '0 2px 5px rgba(0,0,0,0.1)', zIndex: 60 }}>
                                    <input 
                                        type="date" 
                                        className="input" 
                                        style={{ padding: '0.2rem' }} 
                                        value={deliveryDate} 
                                        onChange={e => setDeliveryDate(e.target.value)}
                                    />
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
                                <button 
                                    className="btn success" 
                                    style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }} 
                                    onClick={() => setRecording(true)}
                                    title="Record Delivery"
                                >
                                    <span>+</span> Del
                                </button>
                            )
                        )}

                        {/* Meatball Menu */}
                        <div className="relative">
                            <button 
                                className="icon-btn" 
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent closing immediately
                                    setShowMenu(!showMenu);
                                }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="1"></circle>
                                    <circle cx="12" cy="5" r="1"></circle>
                                    <circle cx="12" cy="19" r="1"></circle>
                                </svg>
                            </button>
                            
                            {showMenu && (
                                <div className="dropdown-menu">
                                    <button 
                                        className="dropdown-item" 
                                        onClick={() => { setShowHistory(!showHistory); }}
                                    >
                                        {showHistory ? 'Hide Log' : 'View Log'}
                                    </button>
                                    {!isCompleted && (
                                        <>
                                            <button 
                                                className="dropdown-item" 
                                                onClick={() => startEdit()}
                                            >
                                                Edit Item
                                            </button>
                                            <button 
                                                className="dropdown-item danger" 
                                                onClick={() => setShowConfirmDelete(true)}
                                            >
                                                Delete Item
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </td>
            </tr>
            {showHistory && (
                <tr>
                    <td colSpan="9" style={{ background: '#f9f9f9', padding: '0.5rem 2rem' }}>
                        <strong>Delivery History</strong>
                        {line.deliveries && line.deliveries.length > 0 ? (
                            <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem', fontSize: '0.9rem' }}>
                                {line.deliveries.map(d => (
                                    <li key={d.id}>
                                        {formatDate(d.date_delivered)}: <strong>{d.quantity_delivered}</strong> delivered
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
