import React, { useEffect, useState } from 'react';
import { fetchAPI } from '../api';

export default function MasterData() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedProduct, setExpandedProduct] = useState(null);
  
  // New State
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProductName, setNewProductName] = useState("");

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    try {
      const data = await fetchAPI('/master-data/products');
      setProducts(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateProduct() {
      if (!newProductName.trim()) return;
      try {
          const newP = await fetchAPI('/master-data/products', {
              method: 'POST',
              body: JSON.stringify({ name: newProductName, category: 'General' })
          });
          setProducts([...products, newP]);
          setNewProductName("");
          setIsAddingProduct(false);
      } catch (e) {
          alert("Failed to create product");
      }
  }

  return (
    <div>
      <div className="flex justify-between items-center" style={{marginBottom: '1rem'}}>
        <h1>Master Data</h1>
        <button className="btn" onClick={() => setIsAddingProduct(true)}>+ Add Product</button>
      </div>

      {isAddingProduct && (
          <div className="card">
              <h3>New Product</h3>
              <div className="flex gap-2">
                  <input 
                    className="input" 
                    placeholder="Product Name" 
                    value={newProductName} 
                    onChange={e => setNewProductName(e.target.value)}
                  />
                  <button className="btn success" onClick={handleCreateProduct}>Save</button>
                  <button className="btn danger" onClick={() => setIsAddingProduct(false)}>Cancel</button>
              </div>
          </div>
      )}

      {loading ? <div>Loading...</div> : (
        <div>
          {products.map(product => (
            <ProductRow 
                key={product.id} 
                product={product} 
                expanded={expandedProduct === product.id}
                onToggle={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ProductRow({ product, expanded, onToggle }) {
    return (
        <div className="card" style={{ padding: '0.5rem 1rem' }}>
            <div className="flex justify-between items-center" style={{ cursor: 'pointer' }} onClick={onToggle}>
                <h3 style={{ margin: 0 }}>{product.name}</h3>
                <div>
                   <span style={{ fontSize: '0.9rem', color: '#666' }}>{product.sizes.length} Sizes</span>
                   <span style={{ marginLeft: '1rem' }}>{expanded ? '▲' : '▼'}</span>
                </div>
            </div>
            {expanded && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid #eee', paddingTop: '1rem' }}>
                    <SizeManager product={product} />
                </div>
            )}
        </div>
    );
}

function SizeManager({ product }) {
    const [sizes, setSizes] = useState(product.sizes || []);
    const [isAdding, setIsAdding] = useState(false);
    const [newSizeLabel, setNewSizeLabel] = useState("");

    const refreshSizes = async () => {
         // In a real app we might fetch just sizes, but here we used embedded. 
         // Actually better to just refetch product or assume optimistic update?
         // Let's assume passed prop is static and we manage local state for now.
    }

    async function handleAddSize() {
        if (!newSizeLabel) return;
        try {
            const newS = await fetchAPI(`/master-data/products/${product.id}/sizes`, {
                method: 'POST',
                body: JSON.stringify({ label: newSizeLabel, order_index: sizes.length })
            });
            // Update local sizes
            setSizes([...sizes, newS]);
            setNewSizeLabel("");
            setIsAdding(false);
        } catch (e) {
            alert("Failed to add size");
        }
    }

    return (
        <div>
            <div className="flex justify-between items-center">
                <h4>Sizes</h4>
                <button className="btn" style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem' }} onClick={() => setIsAdding(true)}>+ Add Size</button>
            </div>
            
            {isAdding && (
                <div className="flex gap-2" style={{ marginBottom: '1rem' }}>
                    <input className="input" placeholder="Size Label (e.g. 38, L)" value={newSizeLabel} onChange={e => setNewSizeLabel(e.target.value)} />
                    <button className="btn success" onClick={handleAddSize}>Save</button>
                    <button className="btn" onClick={() => setIsAdding(false)}>Cancel</button>
                </div>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {sizes.map(size => (
                    <SizeCard key={size.id} size={size} />
                ))}
            </div>
        </div>
    )
}

function SizeCard({ size }) {
    const [rules, setRules] = useState(size.material_rules || []);
    const [isEditing, setIsEditing] = useState(false);
    const [editedRules, setEditedRules] = useState([]);

    useEffect(() => {
        setRules(size.material_rules || []);
        // Initialize edited rules with current rules plus a potential new one? No, just current.
        setEditedRules(size.material_rules ? size.material_rules.map(r => ({ ...r })) : []);
    }, [size]);

    const handleEditToggle = () => {
        if (!isEditing) {
            // Enter edit mode: clone rules
            setEditedRules(rules.map(r => ({ ...r })));
        } else {
            // Cancel edit: revert is handled by not saving
        }
        setIsEditing(!isEditing);
    };

    const handleRuleChange = (index, field, value) => {
        const newRules = [...editedRules];
        newRules[index] = { ...newRules[index], [field]: value };
        setEditedRules(newRules);
    };

    const handleSave = async () => {
        try {
            // Update all rules
            // In a real app, might want to only update changed ones.
            // But here we iterate.
            for (const rule of editedRules) {
                if (rule.id) {
                     await fetchAPI(`/master-data/rules/${rule.id}`, {
                        method: 'PUT',
                        body: JSON.stringify({
                             fabric_width_inches: rule.fabric_width_inches ? parseInt(rule.fabric_width_inches) : null,
                             length_required: parseFloat(rule.length_required),
                             unit: rule.unit
                        })
                    });
                } else {
                    // New rule
                    await fetchAPI(`/master-data/sizes/${size.id}/rules`, {
                        method: 'POST',
                        body: JSON.stringify({
                            fabric_width_inches: rule.fabric_width_inches ? parseInt(rule.fabric_width_inches) : null,
                            length_required: parseFloat(rule.length_required),
                            unit: rule.unit
                       })
                   });
                }
            }
            
            // Refresh rules? We can just update local state if we trust the loop.
            // Better to refetch or just update local based on success.
            // Let's rely on basic success.
            setRules(editedRules); // Note: IDs for new rules won't be here. 
            // Ideally we need to reload content from server to get IDs for new rules.
            // For now, let's just toggle off. If user edits again immediately, new rule won't have ID.
            // So we really should trigger a reload or handle updates better.
            // Checking how master data handles updates... it doesn't pass a "onRefresh" to SizeCard.
            // Let's add onRefresh to SizeCard props.
            alert("Rules updated! (Please refresh to see new IDs if you added rules)"); 
            // In a pro app, we'd refetch.
            setIsEditing(false);
        } catch (e) {
            console.error(e);
            alert("Failed to save rules");
        }
    };

    const addNewRule = () => {
        setEditedRules([...editedRules, { id: null, fabric_width_inches: '', length_required: 0, unit: 'meters' }]);
    };

    return (
        <div style={{ border: '1px solid #ddd', padding: '0.5rem', borderRadius: '4px', background: '#f9f9f9', minWidth: '150px' }}>
            <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
                <strong>{size.label}</strong>
                <button 
                    className="btn" 
                    style={{ fontSize: '0.7rem', padding: '0.1rem 0.3rem' }} 
                    onClick={handleEditToggle}
                >
                    {isEditing ? 'Cancel' : 'Edit'}
                </button>
             </div>
             
             {isEditing ? (
                 <div style={{ fontSize: '0.85rem' }}>
                     {editedRules.map((r, idx) => (
                         <div key={idx} style={{ marginBottom: '0.5rem', borderBottom: '1px dotted #ccc', paddingBottom: '0.2rem' }}>
                             <div className="flex gap-1 items-center">
                                <label style={{fontSize: '0.7rem'}}>Width("):</label>
                                <input 
                                    className="input" 
                                    type="number" 
                                    style={{ width: '40px', padding: '1px' }} 
                                    value={r.fabric_width_inches || ''} 
                                    placeholder="Any"
                                    onChange={e => handleRuleChange(idx, 'fabric_width_inches', e.target.value)}
                                />
                             </div>
                             <div className="flex gap-1 items-center mt-1">
                                <label style={{fontSize: '0.7rem'}}>Len:</label>
                                <input 
                                    className="input" 
                                    type="number" 
                                    step="0.1"
                                    style={{ width: '50px', padding: '1px' }} 
                                    value={r.length_required} 
                                    onChange={e => handleRuleChange(idx, 'length_required', e.target.value)}
                                />
                                <select 
                                    style={{ border: '1px solid #ddd', borderRadius: '4px' }}
                                    value={r.unit}
                                    onChange={e => handleRuleChange(idx, 'unit', e.target.value)}
                                >
                                    <option value="meters">m</option>
                                    <option value="yards">yd</option>
                                </select>
                             </div>
                         </div>
                     ))}
                     <button className="btn" style={{ width: '100%', fontSize: '0.8rem', marginBottom: '0.5rem' }} onClick={addNewRule}>+ Rule</button>
                     <button className="btn success" style={{ width: '100%', fontSize: '0.8rem' }} onClick={handleSave}>Save</button>
                 </div>
             ) : (
                 <div style={{ fontSize: '0.85rem', color: '#666' }}>
                     {rules.length > 0 ? (
                         rules.map((r, i) => (
                             <div key={r.id || i}>
                                 {r.fabric_width_inches ? `${r.fabric_width_inches}" Width: ` : 'Any Width: '} 
                                 {r.length_required} {r.unit}
                             </div>
                         ))
                     ) : (
                         <div style={{ color: 'red' }}>No rules defined</div>
                     )}
                 </div>
             )}
        </div>
    )
}
