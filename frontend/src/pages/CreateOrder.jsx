import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchAPI } from '../api';
import Combobox from '../components/Combobox';

export default function CreateOrder() {
  const navigate = useNavigate();
  const [tailors, setTailors] = useState([]);
  const [products, setProducts] = useState([]);
  
  const [selectedTailor, setSelectedTailor] = useState("");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [tData, pData] = await Promise.all([
        fetchAPI('/master-data/tailors'),
        fetchAPI('/master-data/products')
      ]);
      setTailors(tData);
      setProducts(pData);
      // Removed auto-select to encourage explicit selection, or keep simpler logic
      // if (tData.length > 0) setSelectedTailor(tData[0].id);
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

  function addLine() {
      setLines([...lines, { 
          tempId: Date.now(), 
          productId: "", 
          sizeId: "", 
          ruleId: "", 
          quantity: 1,
          fabricWidth: null, // Just for display/logic
          materialPerUnit: 0,
          unit: "",
          totalMaterial: 0
      }]);
  }

  function removeLine(tempId) {
      setLines(lines.filter(l => l.tempId !== tempId));
  }

  function updateLine(tempId, field, value) {
      setLines(prevLines => prevLines.map(line => {
          if (line.tempId !== tempId) return line;
          
          let updatedLine = { ...line, [field]: value };

          // Reset downstream fields if upstream changes
          if (field === 'productId') {
              updatedLine.sizeId = "";
              updatedLine.ruleId = "";
              updatedLine.materialPerUnit = 0;
              updatedLine.totalMaterial = 0;
          }
          if (field === 'sizeId') {
               updatedLine.ruleId = "";
               updatedLine.materialPerUnit = 0;
               updatedLine.totalMaterial = 0;
          }

          // Recalculate Logic
          if (field === 'quantity' || field === 'materialPerUnit') {
              updatedLine.totalMaterial = updatedLine.quantity * updatedLine.materialPerUnit;
          }

          return updatedLine;
      }));
  }

  // Effect to load rules when size changes is tricky inside the map.
  // Better to look up from the huge data or fetch.
  // We have Products -> Sizes -> Rules in 'products' state!
  // So we can find everything synchronously.

  const handleSubmit = async () => {
      if (lines.length === 0) return alert("Add at least one item");
      if (!selectedTailor) return alert("Select a tailor");

      const payload = {
          tailor_id: selectedTailor,
          created_at: new Date(orderDate).toISOString(),
          notes,
          order_lines: lines.map(l => ({
              product_id: l.productId,
              size_id: l.sizeId,
              rule_id: l.ruleId, // Added for robustness
              fabric_width_inches: l.fabricWidth, 
              quantity: parseInt(l.quantity)
          }))
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
        {lines.map((line, index) => (
            <OrderLineItem 
                key={line.tempId} 
                line={line} 
                index={index} 
                products={products}
                onUpdate={(field, val) => updateLine(line.tempId, field, val)}
                onRemove={() => removeLine(line.tempId)}
            />
        ))}
        <button className="btn" onClick={addLine}>+ Add Item</button>
      </div>

      <div className="flex gap-4">
          <button className="btn success" onClick={handleSubmit}>Create Order</button>
          <button className="btn danger" onClick={() => navigate('/')}>Cancel</button>
      </div>
    </div>
  );
}

function OrderLineItem({ line, index, products, onUpdate, onRemove }) {
    const selectedProduct = products.find(p => p.id == line.productId);
    const sizes = selectedProduct ? selectedProduct.sizes : [];
    const selectedSize = sizes.find(s => s.id == line.sizeId);
    const rules = selectedSize ? selectedSize.material_rules : [];

    // Auto-select rule if only one exists?
    useEffect(() => {
        if (rules.length === 1 && !line.ruleId) {
            handleRuleChange(rules[0].id);
        }
    }, [rules]);

    const handleRuleChange = (ruleId) => {
        const rule = rules.find(r => r.id == ruleId);
        if (rule) {
            onUpdate('ruleId', rule.id);
            onUpdate('fabricWidth', rule.fabric_width_inches);
            onUpdate('materialPerUnit', rule.length_required);
            onUpdate('unit', rule.unit);
            // Total calc happens in parent updateLine
        }
    }

    return (
        <div className="card" style={{ background: '#fafafa' }}>
            <div className="flex justify-between">
                <h4>Item #{index + 1}</h4>
                <button className="btn danger" style={{ padding: '0.2rem 0.5rem' }} onClick={onRemove}>X</button>
            </div>
            
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '150px' }}>
                    <label>Product</label>
                    <select className="input" value={line.productId} onChange={e => onUpdate('productId', e.target.value)}>
                        <option value="">Select Product</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                </div>
                
                <div style={{ flex: 1, minWidth: '100px' }}>
                     <label>Size</label>
                     <select className="input" value={line.sizeId} onChange={e => onUpdate('sizeId', e.target.value)} disabled={!line.productId}>
                        <option value="">Select Size</option>
                        {sizes.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                     </select>
                </div>

                <div style={{ flex: 1, minWidth: '100px' }}>
                     <label>Material / Width</label>
                     <select className="input" value={line.ruleId} onChange={e => handleRuleChange(e.target.value)} disabled={!line.sizeId}>
                        <option value="">Select Option</option>
                        {rules.map(r => (
                            <option key={r.id} value={r.id}>
                                {r.fabric_width_inches ? `${r.fabric_width_inches}"` : 'Standard'} ({r.length_required} {r.unit})
                            </option>
                        ))}
                     </select>
                </div>

                <div style={{ flex: 0.5, minWidth: '80px' }}>
                     <label>Qty</label>
                     <input type="number" className="input" value={line.quantity} onChange={e => onUpdate('quantity', e.target.value)} min="1" />
                </div>
            </div>

            <div style={{ marginTop: '0.5rem', fontWeight: 'bold', color: '#666' }}>
                Requires: {line.materialPerUnit > 0 ? `${line.totalMaterial.toFixed(2)} ${line.unit}` : '-'}
            </div>
        </div>
    )
}
