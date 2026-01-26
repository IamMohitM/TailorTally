import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAPI } from '../api';
import Combobox from '../components/Combobox';

export default function CreateOrder() {
  const navigate = useNavigate();
  const [tailors, setTailors] = useState([]);
  const [schools, setSchools] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [selectedTailor, setSelectedTailor] = useState("");
  const [tailorEmail, setTailorEmail] = useState(""); // State for email
  const [selectedSchool, setSelectedSchool] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");

  const [productEntries, setProductEntries] = useState([]);


  useEffect(() => {
    loadData();
  }, []);

  // Sync email when tailor selected
  useEffect(() => {
    if (selectedTailor) {
        const t = tailors.find(t => t.id == selectedTailor);
        setTailorEmail(t?.email || "");
    } else {
        setTailorEmail("");
    }
  }, [selectedTailor, tailors]);

  async function loadData() {
    try {
      const [tData, sData, pData] = await Promise.all([
        fetchAPI('/master-data/tailors'),
        fetchAPI('/schools/'),
        fetchAPI('/master-data/products')
      ]);
      setTailors(tData);
      setSchools(sData);
      setProducts(pData);
      setProductEntries([{ tempId: Date.now(), productId: "", selections: {} }]);
    } catch (e) {
      console.error(e);
    }
  }

  const handleCreateTailor = async (name) => {
      // Removed prompt for email. Created with name only.
      try {
          const body = { name };
          // email is optional and can be filled in the input later

          const newTailor = await fetchAPI('/master-data/tailors', {
              method: 'POST',
              body: JSON.stringify(body)
          });
          setTailors([...tailors, newTailor]);
          setSelectedTailor(newTailor.id);
      } catch (e) {
          alert("Failed to create tailor: " + e.message);
      }
  };

  const handleCreateSchool = async (name) => {
      try {
          const newSchool = await fetchAPI('/schools/', {
              method: 'POST',
              body: JSON.stringify({ name })
          });
          setSchools([...schools, newSchool]);
          setSelectedSchool(newSchool.id);
      } catch (e) {
          alert("Failed to create school: " + e.message);
      }
  };

  function addProductEntry() {
      setProductEntries([
          ...productEntries, 
          { tempId: Date.now(), productId: "", schoolId: "", selections: {} } // Added schoolId
      ]);
  }

  function removeProductEntry(tempId) {
      setProductEntries(productEntries.filter(p => p.tempId !== tempId));
  }

  function updateProductEntry(tempId, field, value) {
      setProductEntries(prev => prev.map(entry => {
          if (entry.tempId !== tempId) return entry;
          
          if (field === 'productId') {
              return { ...entry, productId: value, selections: {} };
          }
          
          if (field === 'schoolId') { // Handle school update
              return { ...entry, schoolId: value };
          }

          if (field === 'selections') {
              return { ...entry, selections: value };
          }

          if (field === 'given_cloth') {
              return { ...entry, given_cloth: value };
          }

          return entry;
      }));
  }

  const handleSubmit = async () => {
      if (!selectedTailor) return alert("Select a tailor");

      // Check if email updated
      const currentTailor = tailors.find(t => t.id == selectedTailor);
      if (currentTailor && currentTailor.email !== tailorEmail) {
          try {
             // Update tailor first
             const updated = await fetchAPI(`/master-data/tailors/${selectedTailor}`, {
                 method: 'PUT',
                 body: JSON.stringify({ ...currentTailor, email: tailorEmail })
             });
             // Update local list
             setTailors(tailors.map(t => t.id === selectedTailor ? updated : t));
          } catch(e) {
              console.error("Failed to update tailor email", e);
              if(!confirm("Failed to update tailor email. Continue creating order anyway?")) return;
          }
      }

      const orderLines = [];

      productEntries.forEach(entry => {
          if (!entry.productId) return;
          
          let firstLineOfGroup = true;
          const groupId = entry.tempId.toString();

          Object.entries(entry.selections).forEach(([sizeId, data]) => {
              if (data.quantity > 0) {
                  orderLines.push({
                      product_id: entry.productId,
                      size_id: sizeId,
                      school_id: entry.schoolId || null, // Pass schoolId
                      rule_id: data.ruleId,
                      fabric_width_inches: data.fabricWidth,
                      quantity: parseInt(data.quantity),
                      group_id: groupId,
                      given_cloth: firstLineOfGroup ? (entry.given_cloth ? parseFloat(entry.given_cloth) : null) : null
                  });
                  firstLineOfGroup = false;
              }
          });
      });

      if (orderLines.length === 0) return alert("Add at least one item with quantity");

      const payload = {
          tailor_id: selectedTailor,
          // school_id: selectedSchool || null, // REMOVED
          created_at: new Date(orderDate).toISOString(),
          notes,
          given_cloth: productEntries.reduce((acc, entry) => acc + (parseFloat(entry.given_cloth || 0)), 0),
          order_lines: orderLines,
          send_email: true
      };

      try {
          await fetchAPI('/orders/', {
              method: 'POST',
              body: JSON.stringify(payload)
          });
          navigate('/');
      } catch (e) {
          alert("Failed to create order: " + e.message);
      }
  };

  const focusField = (id) => {
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.focus();
      }, 0);
  }

  return (
    <div>
      <h1>Create New Order</h1>
      
      <div className="card" style={{ padding: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Tailor</label>
                <Combobox 
                    id="tailor-select"
                    options={tailors}
                    value={selectedTailor}
                    onChange={setSelectedTailor}
                    onCreate={handleCreateTailor}
                    placeholder="Search/create tailor..."
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') focusField('tailor-email');
                    }}
                />
              </div>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                 <label>Tailor Email</label>
                 <input 
                    id="tailor-email"
                    type="email" 
                    className="input" 
                    value={tailorEmail} 
                    onChange={e => setTailorEmail(e.target.value)}
                    placeholder="Enter email..."
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            focusField('order-date');
                        }
                    }}
                 />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Date</label>
                <input 
                    id="order-date"
                    type="date" 
                    className="input" 
                    value={orderDate} 
                    onChange={e => setOrderDate(e.target.value)} 
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            focusField('order-notes');
                        }
                    }}
                />
              </div>
          </div>
          
          <div className="form-group" style={{ marginTop: '1rem', marginBottom: 0 }}>
              <label>Notes</label>
              <textarea 
                id="order-notes"
                className="input" 
                value={notes} 
                onChange={e => setNotes(e.target.value)} 
                rows="1"
                style={{ resize: 'vertical', minHeight: '38px' }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        if (productEntries.length > 0) {
                            focusField(`product-select-0`);
                        }
                    }
                }}
              />
          </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <h3>Items</h3>
        {productEntries.map((entry, index) => (
            <ProductEntryItem 
                key={entry.tempId} 
                entry={entry} 
                index={index} 
                products={products}
                schools={schools} // Pass schools
                onCreateSchool={handleCreateSchool} // Pass handler
                onUpdate={(field, val) => updateProductEntry(entry.tempId, field, val)}
                onRemove={() => removeProductEntry(entry.tempId)}
            />
        ))}
        <button className="btn" onClick={addProductEntry}>+ Add Product Group</button>
      </div>

      <div className="flex gap-4">
          <button className="btn success" onClick={handleSubmit}>Create Order</button>
          <button className="btn danger" onClick={() => navigate('/')}>Cancel</button>
      </div>
    </div>
  );
}

function ProductEntryItem({ entry, index, products, schools, onCreateSchool, onUpdate, onRemove }) {
    const selectedProduct = products.find(p => p.id == entry.productId);
    const sizes = useMemo(() => {
        return selectedProduct ? [...selectedProduct.sizes].sort((a,b) => a.order_index - b.order_index) : [];
    }, [selectedProduct]);

    // ... (handleSizeUpdate stays same) ...

    const handleSizeUpdate = (sizeId, field, value) => {
        let currentData = entry.selections[sizeId] || { quantity: "", ruleId: "", fabricWidth: null, materialPerUnit: 0, unit: "", totalMaterial: 0 };
        
        let newData = { ...currentData };

        if (field === 'quantity') {
            newData.quantity = value;
            // Auto-select rule if needed
            const size = sizes.find(s => s.id == sizeId);
            if (size && size.material_rules.length > 0 && !newData.ruleId) {
                const r = size.material_rules[0];
                newData.ruleId = r.id;
                newData.fabricWidth = r.fabric_width_inches;
                newData.materialPerUnit = r.length_required;
                newData.unit = r.unit;
            }
        } 
        else if (field === 'ruleId') {
             const size = sizes.find(s => s.id == sizeId);
             const r = size ? size.material_rules.find(r => r.id == value) : null;
             if (r) {
                newData.ruleId = r.id;
                newData.fabricWidth = r.fabric_width_inches;
                newData.materialPerUnit = r.length_required;
                newData.unit = r.unit;
             }
        }
        
        // Re-calc total
        if (field === 'quantity' || field === 'ruleId') {
             newData.totalMaterial = (newData.quantity || 0) * (newData.materialPerUnit || 0);
        }

        const newSelections = { ...entry.selections, [sizeId]: newData };
        onUpdate('selections', newSelections);
    };

    // Calculate unique available fabric widths
    const availableWidths = useMemo(() => {
        if (!selectedProduct) return [];
        const widths = new Set();
        selectedProduct.sizes.forEach(s => {
            s.material_rules.forEach(r => {
                if (r.fabric_width_inches) widths.add(r.fabric_width_inches);
            });
        });
        return Array.from(widths).sort((a, b) => a - b);
    }, [selectedProduct]);

    const handleGroupWidthChange = (width) => {
        let newSelections = { ...entry.selections };
        
        sizes.forEach(size => {
            // Find rule for this size with matching width
            const rule = size.material_rules.find(r => r.fabric_width_inches == width);
            
            if (rule) {
                // Update selection for this size
                const currentData = newSelections[size.id] || { quantity: "", ruleId: "", fabricWidth: null, materialPerUnit: 0, unit: "", totalMaterial: 0 };
                newSelections[size.id] = {
                    ...currentData,
                    ruleId: rule.id,
                    fabricWidth: rule.fabric_width_inches,
                    materialPerUnit: rule.length_required,
                    unit: rule.unit,
                    totalMaterial: (currentData.quantity || 0) * rule.length_required
                };
            }
        });

        onUpdate('selections', newSelections);
    };

    // Calculate total meters for this entry
    const totalMeters = Object.values(entry.selections).reduce((acc, curr) => acc + (curr.totalMaterial || 0), 0);

    const focusField = (id) => {
        setTimeout(() => {
            const el = document.getElementById(id);
            if (el) el.focus();
        }, 0);
    };

    return (
        <div className="card" style={{ background: '#fafafa', marginBottom: '0.75rem', padding: '0.75rem' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '0.75rem' }}>
                <div className="flex gap-4 flex-1">
                    <div className="form-group flex-1" style={{ marginBottom: 0 }}>
                        <select 
                            id={`product-select-${index}`}
                            className="input" 
                            style={{ fontWeight: 'bold', border: 'none', background: 'transparent', paddingLeft: 0, fontSize: '1.1rem' }}
                            value={entry.productId} 
                            onChange={e => onUpdate('productId', e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    focusField(`school-select-${index}`);
                                }
                            }}
                        >
                            <option value="">Select Product...</option>
                            {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <div className="form-group flex-1" style={{ marginBottom: 0, position: 'relative' }}>
                         <Combobox 
                            id={`school-select-${index}`}
                            options={schools}
                            value={entry.schoolId}
                            onChange={(val) => onUpdate('schoolId', val)}
                            onCreate={onCreateSchool}
                            placeholder="Select School (Optional)..."
                            inputStyle={{ background: '#fff', border: '1px solid #ddd', borderRadius: '6px' }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    focusField(`qty-${entry.tempId}-0`);
                                }
                            }}
                        />
                    </div>
                </div>

                {availableWidths.length > 0 && (
                    <div className="form-group" style={{ marginBottom: 0, marginLeft: '1rem', width: '120px' }}>
                         <select 
                            className="input"
                            style={{ padding: '0.4rem', fontSize: '0.9rem' }}
                            onChange={(e) => handleGroupWidthChange(e.target.value)}
                            defaultValue=""
                         >
                             <option value="" disabled>Set Width</option>
                             {availableWidths.map(w => (
                                 <option key={w} value={w}>{w}"</option>
                             ))}
                         </select>
                    </div>
                )}
                
                <button className="btn danger" style={{ padding: '0.2rem 0.5rem', marginLeft: '1rem' }} onClick={onRemove}>X</button>
            </div>

            {selectedProduct && (
                <div style={{ borderTop: '1px solid #eee', paddingTop: '0.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 100px 120px', gap: '0.75rem', marginBottom: '0.25rem', fontWeight: 'bold', fontSize: '0.8rem', color: '#888', textTransform: 'uppercase' }}>
                        <div>Size</div>
                        <div>Material/Unt</div>
                        <div>Quantity</div>
                        <div style={{ textAlign: 'right' }}>Total</div>
                    </div>
                    
                    {sizes.map((size, idx) => {
                        const data = entry.selections[size.id] || { quantity: "", ruleId: "", totalMaterial: 0 };
                        const rules = size.material_rules || [];
                        
                        return (
                            <SizeRow 
                                key={size.id}
                                size={size}
                                data={data}
                                rules={rules}
                                onChange={(field, val) => handleSizeUpdate(size.id, field, val)}
                                entryId={entry.tempId}
                                rowIndex={idx}
                                totalRows={sizes.length}
                            />
                        );
                    })}

                    <div style={{ 
                        marginTop: '0.5rem', 
                        paddingTop: '0.5rem', 
                        borderTop: '1px solid #ddd', 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        fontWeight: 'bold',
                        color: '#666'
                    }}>
                        <div className="flex gap-2 items-center">
                            <label style={{ fontSize: '0.9rem' }}>Given:</label>
                             <input 
                                type="number"
                                step="0.01"
                                className="input" 
                                style={{ width: '80px', padding: '0.2rem' }}
                                value={entry.given_cloth || ""} 
                                onChange={e => onUpdate('given_cloth', e.target.value)} 
                                placeholder="0"
                            />
                        </div>
                        <div>Total: {totalMeters.toFixed(2)} meters</div>
                    </div>
                </div>
            )}
        </div>
    )
}

function SizeRow({ size, data, rules, onChange, entryId, rowIndex, totalRows }) {
    const qtyInputId = `qty-${entryId}-${rowIndex}`;

    const handleQtyKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            focusNextRowQty();
        }
    };

    const focusNextRowQty = () => {
        const nextQtyId = `qty-${entryId}-${rowIndex + 1}`;
        const nextInput = document.getElementById(nextQtyId);
        if (nextInput) {
            nextInput.focus();
        }
    };

    const getMaterialPerUnitDisplay = () => {
        if (data.materialPerUnit) {
            return `${data.materialPerUnit} ${data.unit}`;
        }
        if (rules.length > 0) {
             const r = rules[0];
             return `${r.length_required} ${r.unit}`;
        }
        return '-';
    };

    return (
        <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '100px 1fr 100px 120px', 
            gap: '0.75rem', 
            alignItems: 'center', 
            padding: '2px 0',
            borderBottom: '1px solid #f0f0f0' 
        }}>
            <div style={{ fontWeight: '600', fontSize: '0.95rem' }}>{size.label}</div>
            <div style={{ fontSize: '0.85rem', color: '#666' }}>
                {getMaterialPerUnitDisplay()}
            </div>
            <div>
                 <input 
                    id={qtyInputId}
                    type="number" 
                    className="input" 
                    placeholder="0"
                    min="0"
                    value={data.quantity} 
                    onChange={e => onChange('quantity', e.target.value)}
                    onKeyDown={handleQtyKeyDown}
                    style={{ padding: '0.2rem 0.4rem', fontSize: '0.9rem' }}
                 />
            </div>
            <div style={{ fontSize: '0.9rem', textAlign: 'right', fontWeight: data.totalMaterial > 0 ? '600' : 'normal' }}>
                {data.totalMaterial > 0 ? `${data.totalMaterial.toFixed(2)} ${data.unit}` : '-'}
            </div>
        </div>
    )
}

