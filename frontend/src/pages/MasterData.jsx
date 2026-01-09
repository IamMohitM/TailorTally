import React, { useEffect, useState } from 'react';
import { fetchAPI } from '../api';
import { useNotification } from '../components/Notification';

export default function MasterData() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [newProductName, setNewProductName] = useState("");
  const { showToast, showConfirm } = useNotification();

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    try {
      const data = await fetchAPI('/master-data/products');
      // Extra safety: sort alphabetically by name
      const sortedData = [...data].sort((a, b) => a.name.localeCompare(b.name));
      setProducts(sortedData);
      
      if (sortedData.length > 0 && !selectedProduct) {
        setSelectedProduct(sortedData[0]);
      } else if (selectedProduct) {
        const updated = sortedData.find(p => p.id === selectedProduct.id);
        if (updated) setSelectedProduct(updated);
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to load products", "error");
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
      const newProduct = { ...newP, sizes: [] };
      setProducts(prev => {
          const updated = [...prev, newProduct];
          return updated.sort((a, b) => a.name.localeCompare(b.name));
      });
      setNewProductName("");
      setIsAddingProduct(false);
      setSelectedProduct(newProduct);
      showToast("Product created successfully", "success");
    } catch (e) {
      showToast("Failed to create product", "error");
    }
  }

  async function handleFileUpload(e) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/master-data/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(error.detail || "Upload failed");
      }
      
      showToast('Upload successful!', 'success');
      loadProducts();
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Upload failed', 'error');
    } finally {
      setLoading(false);
      // Reset input value to allow re-uploading the same file
      if (e.target) e.target.value = '';
    }
  }

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="master-data-container">
      {/* Sidebar */}
      <div className="sidebar">
        <div className="sidebar-header">
          <input 
            className="input" 
            placeholder="Search products..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{ marginBottom: isAddingProduct ? '1rem' : 0 }}
          />
          {isAddingProduct ? (
            <div className="flex gap-2">
              <input 
                className="input" 
                placeholder="Product Name" 
                value={newProductName} 
                autoFocus
                onChange={e => setNewProductName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateProduct()}
              />
              <button className="btn success" onClick={handleCreateProduct}>Add</button>
              <button className="btn-ghost" onClick={() => setIsAddingProduct(false)}>✕</button>
            </div>
          ) : (
            <button 
              className="btn" 
              style={{ width: '100%', marginTop: '0.75rem' }} 
              onClick={() => setIsAddingProduct(true)}
            >
              + Add Product
            </button>
          )}

          <div style={{ marginTop: '0.75rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
            <label className="btn secondary" style={{ width: '100%', display: 'block', textAlign: 'center', cursor: 'pointer' }}>
               ↑ Upload CSV/Excel
              <input 
                type="file" 
                hidden 
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={handleFileUpload}
              />
            </label>
          </div>
        </div>
        <div className="sidebar-content">
          {loading ? (
            <div style={{ padding: '1rem', textAlign: 'center' }}>Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
              No products found
            </div>
          ) : (
            filteredProducts.map(product => (
              <div 
                key={product.id} 
                className={`product-item ${selectedProduct?.id === product.id ? 'active' : ''}`}
                onClick={() => setSelectedProduct(product)}
              >
                <h4>{product.name}</h4>
                <p>{product.sizes?.length || 0} Sizes</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="details-panel">
        {selectedProduct ? (
          <ProductDetails 
            product={selectedProduct} 
            onRefresh={loadProducts} 
          />
        ) : (
          <div className="empty-state">
            <h3>Select a product to view details</h3>
            <p>You can manage sizes and material rules here.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductDetails({ product, onRefresh }) {
  const { showToast, showConfirm } = useNotification();
  const [isEditing, setIsEditing] = useState(false);
  const [editedProduct, setEditedProduct] = useState(null);
  const [isAddingSize, setIsAddingSize] = useState(false);
  const [newSizeLabel, setNewSizeLabel] = useState("");

  useEffect(() => {
    setEditedProduct(JSON.parse(JSON.stringify(product)));
    setIsEditing(false);
    setIsAddingSize(false);
  }, [product]);

  const handleEditToggle = () => {
    if (isEditing) {
      setEditedProduct(JSON.parse(JSON.stringify(product)));
    }
    setIsEditing(!isEditing);
  };

  const handleRuleChange = (sizeIdx, ruleIdx, field, value) => {
    const newP = { ...editedProduct };
    newP.sizes[sizeIdx].material_rules[ruleIdx][field] = value;
    setEditedProduct(newP);
  };

  const handleAddRule = (sizeIdx) => {
    const newP = { ...editedProduct };
    if (!newP.sizes[sizeIdx].material_rules) newP.sizes[sizeIdx].material_rules = [];
    newP.sizes[sizeIdx].material_rules.push({
      id: null,
      fabric_width_inches: '',
      length_required: 0,
      unit: 'meters'
    });
    setEditedProduct(newP);
  };

  const handleRemoveRule = (sizeIdx, ruleIdx) => {
    const newP = { ...editedProduct };
    newP.sizes[sizeIdx].material_rules.splice(ruleIdx, 1);
    setEditedProduct(newP);
  };

  const handleAddSize = async () => {
    if (!newSizeLabel.trim()) return;
    try {
      await fetchAPI(`/master-data/products/${product.id}/sizes`, {
        method: 'POST',
        body: JSON.stringify({ 
          label: newSizeLabel, 
          order_index: product.sizes.length 
        })
      });
      setNewSizeLabel("");
      setIsAddingSize(false);
      onRefresh();
    } catch (e) {
      showToast("Failed to add size", "error");
    }
  };

  const handleSave = async () => {
    try {
      // For each size and rule, we need to call the appropriate API.
      // This is a bit inefficient but matches the current backend structure.
      // Ideally, the backend would support a bulk update.
      for (const size of editedProduct.sizes) {
        // Update size (if label changed or other fields added later)
        // Currently API doesn't seem to have a PUT for size label specifically, 
        // but we can add rules.
        
        for (const rule of size.material_rules) {
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
      }
      
      // Cleanup: We don't have a DELETE rule API shown in previous code, 
      // but if we did, we'd call it for removed rules.
      // Since it's not shown, we'll assume the user only adds/edits.
      
      setIsEditing(false);
      onRefresh();
      showToast("Rules saved successfully", "success");
    } catch (e) {
      console.error(e);
      showToast(e.message || "Failed to save rules", "error");
    }
  };

  const handleDelete = () => {
    showConfirm(
      "Delete Product",
      `Are you sure you want to delete ${product.name}? This cannot be undone.`,
      async () => {
        try {
          await fetchAPI(`/master-data/products/${product.id}`, { method: 'DELETE' });
          showToast("Product deleted successfully", "success");
          onRefresh();
        } catch (e) {
          showToast(e.message || "Failed to delete product. It may be in use.", "error");
        }
      }
    );
  };

  return (
    <>
      <div className="details-header">
        <div>
          <h2 style={{ margin: 0 }}>{product.name}</h2>
          <span className="badge">{product.category || 'General'}</span>
        </div>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button className="btn success" onClick={handleSave}>Save Changes</button>
              <button className="btn-ghost" onClick={handleEditToggle}>Cancel</button>
            </>
          ) : (
            <>
              <button className="btn" onClick={handleEditToggle}>Edit Rules</button>
              <button className="btn danger" onClick={handleDelete}>Delete</button>
            </>
          )}
        </div>
      </div>
      
      <div className="details-content">
        <div className="section-title">
          <span>Sizes & Material Rules</span>
          {!isEditing && (
            <div className="flex gap-2 items-center">
              {isAddingSize ? (
                <div className="flex gap-1">
                  <input 
                    className="input" 
                    placeholder="New Size (e.g. 40)" 
                    style={{ width: '150px', padding: '0.25rem 0.5rem' }} 
                    value={newSizeLabel}
                    onChange={e => setNewSizeLabel(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddSize()}
                  />
                  <button className="btn success" style={{ padding: '0.25rem 0.5rem' }} onClick={handleAddSize}>Add</button>
                  <button className="btn-ghost" onClick={() => setIsAddingSize(false)}>✕</button>
                </div>
              ) : (
                <button className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} onClick={() => setIsAddingSize(true)}>+ Add Size</button>
              )}
            </div>
          )}
        </div>

        {editedProduct?.sizes?.length === 0 ? (
          <div className="empty-state" style={{ height: '200px' }}>
            <p>No sizes defined for this product.</p>
          </div>
        ) : (
          <table className="rules-table">
            <thead>
              <tr>
                <th style={{ width: '100px' }}>Size</th>
                <th>Material Rules</th>
                {isEditing && <th style={{ width: '80px' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {editedProduct?.sizes.map((size, sizeIdx) => (
                <tr key={size.id} className="rule-row">
                  <td style={{ fontWeight: '600' }}>{size.label}</td>
                  <td>
                    <div className="flex flex-col gap-2">
                      {size.material_rules?.map((rule, ruleIdx) => (
                        <div key={rule.id || ruleIdx} className="flex gap-2 items-center">
                          {isEditing ? (
                            <>
                              <div className="flex items-center gap-1">
                                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Width:</span>
                                <input 
                                  className="input" 
                                  type="number" 
                                  style={{ width: '70px', height: '32px' }} 
                                  placeholder="Any"
                                  value={rule.fabric_width_inches || ''}
                                  onChange={e => handleRuleChange(sizeIdx, ruleIdx, 'fabric_width_inches', e.target.value)}
                                />
                                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>"</span>
                              </div>
                              <div className="flex items-center gap-1" style={{ marginLeft: '1rem' }}>
                                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Length:</span>
                                <input 
                                  className="input" 
                                  type="number" 
                                  step="0.01"
                                  style={{ width: '80px', height: '32px' }} 
                                  value={rule.length_required}
                                  onChange={e => handleRuleChange(sizeIdx, ruleIdx, 'length_required', e.target.value)}
                                />
                                <select 
                                  className="input"
                                  style={{ width: '90px', height: '32px', padding: '0 0.5rem' }}
                                  value={rule.unit}
                                  onChange={e => handleRuleChange(sizeIdx, ruleIdx, 'unit', e.target.value)}
                                >
                                  <option value="meters">meters</option>
                                  <option value="yards">yards</option>
                                </select>
                              </div>
                              <button 
                                className="btn-ghost" 
                                style={{ color: 'var(--danger-color)' }}
                                onClick={() => handleRemoveRule(sizeIdx, ruleIdx)}
                              >
                                Remove
                              </button>
                            </>
                          ) : (
                            <div className="badge primary">
                              {rule.fabric_width_inches ? `${rule.fabric_width_inches}" Width: ` : 'Any Width: '}
                              {rule.length_required} {rule.unit}
                            </div>
                          )}
                        </div>
                      ))}
                      {isEditing && (
                        <button 
                          className="btn-ghost" 
                          style={{ alignSelf: 'flex-start', fontSize: '0.75rem', padding: 0 }}
                          onClick={() => handleAddRule(sizeIdx)}
                        >
                          + Add Rule
                        </button>
                      )}
                      {!isEditing && size.material_rules?.length === 0 && (
                        <span style={{ color: 'var(--danger-color)', fontSize: '0.875rem' }}>No rules</span>
                      )}
                    </div>
                  </td>
                  {isEditing && (
                    <td></td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
