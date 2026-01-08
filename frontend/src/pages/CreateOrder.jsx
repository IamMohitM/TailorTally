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
  const [selectedSchool, setSelectedSchool] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");

  const [productEntries, setProductEntries] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

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
      try {
          const newTailor = await fetchAPI('/master-data/tailors', {
              method: 'POST',
              body: JSON.stringify({ name })
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

          return entry;
      }));
  }

  const handleSubmit = async () => {
      if (!selectedTailor) return alert("Select a tailor");

      const orderLines = [];

      productEntries.forEach(entry => {
          if (!entry.productId) return;
          
          Object.entries(entry.selections).forEach(([sizeId, data]) => {
              if (data.quantity > 0) {
                  orderLines.push({
                      product_id: entry.productId,
                      size_id: sizeId,
                      school_id: entry.schoolId || null, // Pass schoolId
                      rule_id: data.ruleId,
                      fabric_width_inches: data.fabricWidth,
                      quantity: parseInt(data.quantity)
                  });
              }
          });
      });

      if (orderLines.length === 0) return alert("Add at least one item with quantity");

      const payload = {
          tailor_id: selectedTailor,
          // school_id: selectedSchool || null, // REMOVED
          created_at: new Date(orderDate).toISOString(),
          notes,
          order_lines: orderLines
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

  return (
    <div>
      <h1>Create New Order</h1>
      
      <div className="card">
          <div className="form-group">
            <label>Select Tailor</label>
            <div style={{ maxWidth: '400px' }}>
                <Combobox 
                    options={tailors}
                    value={selectedTailor}
                    onChange={setSelectedTailor}
                    onCreate={handleCreateTailor}
                    placeholder="Search or create tailor..."
                />
            </div>
          </div>
          {/* Global School Selection REMOVED */}

          <div className="form-group">
            <label>Date</label>
            <input 
                type="date" 
                className="input" 
                style={{ maxWidth: '200px' }}
                value={orderDate} 
                onChange={e => setOrderDate(e.target.value)} 
            />
          </div>
          <div className="form-group">
              <label>Notes</label>
              <textarea className="input" value={notes} onChange={e => setNotes(e.target.value)} />
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

    return (
        <div className="card" style={{ background: '#fafafa', marginBottom: '1rem' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '1rem' }}>
                <h4 style={{ margin: 0 }}>Product Group #{index + 1}</h4>
                <button className="btn danger" style={{ padding: '0.2rem 0.5rem' }} onClick={onRemove}>X</button>
            </div>
            
            <div className="flex gap-4 mb-4">
                <div className="form-group flex-1">
                    <label>Product</label>
                    <select 
                        className="input" 
                        value={entry.productId} 
                        onChange={e => onUpdate('productId', e.target.value)}
                    >
                        <option value="">Select Product...</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                <div className="form-group flex-1">
                     <label>School</label>
                     <Combobox 
                        options={schools}
                        value={entry.schoolId}
                        onChange={(val) => onUpdate('schoolId', val)}
                        onCreate={onCreateSchool}
                        placeholder="Select School (Optional)..."
                    />
                </div>
            </div>

            {selectedProduct && (
                <div style={{ paddingLeft: '1rem', borderLeft: '3px solid #eee' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, 1fr) 100px 1fr 100px', gap: '1rem', marginBottom: '0.5rem', fontWeight: 'bold', fontSize: '0.9rem', color: '#666' }}>
                        <div>Size</div>
                        <div>Quantity</div>
                        <div>Material Rule</div>
                        <div>Required</div>
                    </div>
                    
                    {sizes.map(size => {
                        const data = entry.selections[size.id] || { quantity: "", ruleId: "", totalMaterial: 0 };
                        const rules = size.material_rules || [];
                        
                        return (
                            <SizeRow 
                                key={size.id}
                                size={size}
                                data={data}
                                rules={rules}
                                onChange={(field, val) => handleSizeUpdate(size.id, field, val)}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    )
}

function SizeRow({ size, data, rules, onChange }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(80px, 1fr) 100px 1fr 100px', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ fontWeight: 'bold' }}>{size.label}</div>
            <div>
                 <input 
                    type="number" 
                    className="input" 
                    placeholder="0"
                    min="0"
                    value={data.quantity} 
                    onChange={e => onChange('quantity', e.target.value)}
                    style={{ padding: '0.3rem' }}
                 />
            </div>
            <div>
                {rules.length > 0 ? (
                    <select 
                        className="input" 
                        value={data.ruleId || ""} 
                        onChange={e => onChange('ruleId', e.target.value)}
                        disabled={!data.quantity} 
                        style={{ padding: '0.3rem', fontSize: '0.9rem' }}
                    >
                         {rules.map(r => (
                            <option key={r.id} value={r.id}>
                                {r.fabric_width_inches ? `${r.fabric_width_inches}"` : 'Standard'} ({r.length_required} {r.unit})
                            </option>
                         ))}
                    </select>
                ) : <span style={{fontSize: '0.8rem', color: '#999'}}>No rules</span>}
            </div>
            <div style={{ fontSize: '0.9rem' }}>
                {data.totalMaterial > 0 ? `${data.totalMaterial.toFixed(2)} ${data.unit}` : '-'}
            </div>
        </div>
    )
}
