import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchAPI } from '../api';
import { formatDate } from '../utils';
import { useNotification } from '../components/Notification';

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

  // Grouping Logic
  const processedLines = useMemo(() => {
      if (!order || !order.order_lines) return [];
      
      // 1. Sort lines to ensure groups are contiguous
      // Primary Sort: Product Name, Secondary: School Name
      const sortedLines = [...order.order_lines].sort((a, b) => {
          const pDiff = a.product_name.localeCompare(b.product_name);
          if (pDiff !== 0) return pDiff;
          const sA = a.school_name || "";
          const sB = b.school_name || "";
          return sA.localeCompare(sB);
      });

      // 2. Metadata for grouping
      const result = [];
      let currentGroupKey = null;
      let currentGroupStartIndex = 0;

      // Temporary holder for group stats
      let groupStatsMap = new Map(); 

      // First pass to determine groups and basic stats
      for (let i = 0; i < sortedLines.length; i++) {
          const line = sortedLines[i];
          // Key: Product + School + Unit + FabricWidth (to be safe if mixed units/widths usually shouldn't happen for same product but technically possible)
          const key = `${line.product_id}|${line.school_id}|${line.unit}`; // Ignored fabric width for loose visual grouping, can add if strictly needed
          
          if (key !== currentGroupKey) {
              // New Group
              if (currentGroupKey !== null) {
                  // Finalize previous group
                  const groupSize = i - currentGroupStartIndex;
                  result[currentGroupStartIndex].rowSpan = groupSize;
                  result[currentGroupStartIndex].groupStats = groupStatsMap.get(currentGroupKey);
              }
              
              currentGroupKey = key;
              currentGroupStartIndex = i;
              
              // Initialize stats for new group
              groupStatsMap.set(key, {
                  totalGiven: 0,
                  totalEst: 0,
                  hasGiven: false
              });
          }

          // Accumulate stats
          const stats = groupStatsMap.get(key);
          if (line.given_cloth != null) {
              stats.hasGiven = true;
              stats.totalGiven += parseFloat(line.given_cloth);
          }
           // Use total_material_req if available, else calc
          const est = line.total_material_req || (line.quantity * line.material_req_per_unit);
          stats.totalEst += est;
          
          // Add line to result with default props
          result.push({
              ...line,
              rowSpan: 0, // 0 means hidden, >0 means spans
              isGroupStart: false, // Will mark true for start
              groupStats: null // Will attach to start
          });
      }

      // Finalize last group
      if (currentGroupStartIndex < sortedLines.length) {
          const groupSize = sortedLines.length - currentGroupStartIndex;
          result[currentGroupStartIndex].rowSpan = groupSize;
          result[currentGroupStartIndex].groupStats = groupStatsMap.get(currentGroupKey);
      }
      
      if (result.length > 0) {
          // Mark group starts explicitly if rowSpan > 0 (already set above)
           // Actually, the loop set rowSpan on `result` objects at specific indices.
           // We just need to make sure `isGroupStart` is consistent or just check rowSpan.
      }

      return result;
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
                {processedLines.map((line, index) => (
                   <OrderLineRow 
                       key={line.id} 
                       line={line} 
                       onUpdate={loadOrder} 
                       masterData={masterData}
                   />
                ))}
            </tbody>
        </table>
      </div>

      <PrintableOrder order={order} />
    </div>
  );
}



function OrderLineRow({ line, onUpdate, masterData }) {
    const { showToast } = useNotification();
    const isCompleted = line.pending_qty <= 0;
    const [deliveryQty, setDeliveryQty] = useState("");
    const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
    const [recording, setRecording] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [deletePassword, setDeletePassword] = useState("");

    // Edit Mode State
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({});

    // Material In Hand Calculation (Fallback if no stats)
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
            fabric_width_inches: line.fabric_width_inches,
            given_cloth: line.given_cloth // ensure this is preserved/editable
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
        if (!deletePassword) {
            showToast("Please enter the admin password", "error");
            return;
        }

        try {
            await fetchAPI(`/orders/lines/${line.id}`, {
                method: 'DELETE',
                headers: {
                    'X-Admin-Password': deletePassword
                }
            });
            setShowConfirmDelete(false);
            setDeletePassword(""); // Reset
            showToast("Item deleted", "success");
            onUpdate();
        } catch (e) {
            showToast("Failed to delete line: " + e.message, "error");
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

    // --- RENDER LOGIC for GROUPING ---
    const isGroupStart = line.rowSpan > 0;
    const isHidden = line.rowSpan === 0;

    if (isEditing) {
        // When editing, we might break the table layout if we don't handle rowSpan.
        // Ideally editing should be a modal or handle spans carefully.
        // For simplicity, if editing, we force render standard cells (might glitch layout momentarily, or we can just render as single row)
        // Let's render as a single row that basically overlays or replaces.
        // BUT, since we have rowSpan in other rows, replacing just one <tr> might misalign columns if it was part of a span.
        // PROPOSAL: If editing, temporarily treat as standalone?
        // Actually, "Edit Item" is per line.
        // If we edit a line that is NOT the group start, but part of a group, the 'Product' column is hidden.
        // If we edit, we need to show the inputs.
        // Simplest fix: If editing, render all columns for this row.
        // However, the previous rows might still span over this one.
        // This is tricky.
        // Given the requirement, maybe we just pop a modal? Or just render inputs.
        // Let's stick to inline edit, but acknowledge visual quirks or disable grouping for that row?
        // Let's just try to render inputs. If it was hidden, it becomes visible? No, the `td` is hidden.
        // If we are editing a child row (hidden Product col), and we show a Product dropdown... we can't because the cell doesn't exist.
        // We'll keep the Product/School non-editable in this view or...
        // Wait, the user can edit Product/School.
        // If isEditing, maybe we render a special row.
        return (
             <tr>
                <td colSpan="9">
                    {/* Simplified Edit Form for now to avoid breaking table layout with spans */}
                    <div style={{ padding: '10px', background: '#fff3e0', border: '1px solid #ffcc80' }}>
                        <strong>Editing {line.product_name} - {line.size_label}</strong>
                         <div className="flex gap-2 mt-2 items-end">
                             <label>
                                 <span className="text-sm">School:</span>
                                 <select 
                                     className="input" 
                                     value={editData.school_id || ""} 
                                     onChange={e => {
                                         const val = e.target.value;
                                         setEditData({...editData, school_id: val === "" ? null : parseInt(val)});
                                     }}
                                     style={{ minWidth: '150px' }}
                                 >
                                     <option value="">Select School</option>
                                     {masterData.schools.map(s => (
                                         <option key={s.id} value={s.id}>{s.name}</option>
                                     ))}
                                 </select>
                             </label>
                             <label>
                                 <span className="text-sm">Qty:</span>
                                <input 
                                    type="number" className="input" style={{width: '60px'}}
                                    value={editData.quantity} 
                                    onChange={e => setEditData({...editData, quantity: parseInt(e.target.value) || 0})} 
                                />
                             </label>
                              <label>
                                <span className="text-sm">Given Cloth:</span>
                                <input 
                                    type="number" step="0.01" className="input" style={{width: '80px'}}
                                    value={editData.given_cloth || ""} 
                                    onChange={e => setEditData({...editData, given_cloth: e.target.value === "" ? null : parseFloat(e.target.value)})} 
                                />
                             </label>
                             <button className="btn success" onClick={handleSave}>Save</button>
                             <button className="btn danger" onClick={() => setIsEditing(false)}>Cancel</button>
                         </div>
                    </div>
                </td>
             </tr>
        );
    }

    return (
        <>
            <tr>
                {/* Product Column - Merged */}
                {(!isHidden || isGroupStart) && isGroupStart && (
                     <td rowSpan={line.rowSpan} style={{ verticalAlign: 'top', background: '#fff' }}>
                         <strong>{line.product_name}</strong>
                     </td>
                )}
                
                {/* School Column - Merged */}
                {(!isHidden || isGroupStart) && isGroupStart && (
                    <td rowSpan={line.rowSpan} style={{ verticalAlign: 'top', background: '#fff' }}>
                        {line.school_name || '-'}
                    </td>
                )}

                {/* Size - Always per line */}
                <td>{line.size_label}</td>
                
                {/* Material / Unit - Always per line */}
                <td>{line.material_req_per_unit} {line.unit}</td>

                {/* In Hand - MERGED AGGREGATE */}
                {(!isHidden || isGroupStart) && isGroupStart && (
                    <td rowSpan={line.rowSpan} style={{ verticalAlign: 'top', background: '#fff', borderLeft: '1px solid #eee' }}>
                         {(() => {
                             const stats = line.groupStats;
                             if (!stats) return '-';

                             const { totalGiven, totalEst } = stats;
                             
                             // Always show stats for groups, assuming 0 given if not set
                             const diff = totalGiven - totalEst;
                             return (
                                <div style={{ fontSize: '0.9rem' }}>
                                    <div style={{ fontWeight: '600', color: '#333' }}>{totalGiven.toFixed(2)} {line.unit}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#888' }}>Est: {totalEst.toFixed(2)}</div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: diff >= 0 ? '#2e7d32' : '#c62828' }}>
                                         {diff >= 0 ? '+' : ''}{diff.toFixed(2)}
                                    </div>
                                </div>
                             );
                         })()}
                    </td>
                )}

                {/* Ordered - Always per line */}
                <td>{line.quantity}</td>
                
                {/* Delivered - Always per line */}
                <td>{line.delivered_qty}</td>
                
                {/* Pending - Always per line */}
                <td style={{ color: isCompleted ? 'green' : 'orange', fontWeight: 'bold' }}>
                        {line.pending_qty}
                </td>

                <td className="relative">
                     {/* Confirmation Modal */}
                     {showConfirmDelete && (
                        <div className="modal-overlay" style={{ zIndex: 100 }}>
                            <div className="modal-content" style={{ maxWidth: '400px' }}>
                                <h3 className="modal-title">Delete Item</h3>
                                <p className="modal-message mb-4">
                                    Are you sure you want to delete <strong>{line.product_name}</strong>?
                                </p>
                                <div className="form-group">
                                    <label style={{ fontSize: '0.9rem' }}>Admin Password</label>
                                    <input 
                                        type="password" 
                                        className="input" 
                                        value={deletePassword}
                                        onChange={e => setDeletePassword(e.target.value)}
                                        placeholder="Enter password"
                                        autoFocus
                                    />
                                </div>
                                <div className="modal-actions mt-4">
                                    <button className="btn secondary" onClick={() => { setShowConfirmDelete(false); setDeletePassword(""); }}>Cancel</button>
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
