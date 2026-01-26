import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchAPI } from '../api';
import { useNotification } from '../components/Notification';

export default function OrderList() {
  const navigate = useNavigate();
  const { showToast } = useNotification();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState(null);
  
  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState({ show: false, orderId: null });
  const [deletePassword, setDeletePassword] = useState("");
  
  // Search state
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [statusFilter, setStatusFilter] = useState("All");
  const [schoolFilter, setSchoolFilter] = useState("All");
  const [schools, setSchools] = useState([]);

  useEffect(() => {
    fetchSchools();
  }, []);

  async function fetchSchools() {
    try {
      const data = await fetchAPI('/schools/');
      setSchools(data);
    } catch (e) {
      console.error("Failed to load schools");
    }
  }

  useEffect(() => {
    // Debounce search slightly to avoid too many requests
    const timer = setTimeout(() => {
      fetchOrders();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, sortBy, statusFilter, schoolFilter]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  async function fetchOrders() {
    try {
      setLoading(true);
      // Construct query params
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (sortBy) params.append("sort_by", sortBy);
      if (statusFilter && statusFilter !== "All") params.append("status", statusFilter);
      if (schoolFilter && schoolFilter !== "All") params.append("school_id", schoolFilter);

      const queryString = params.toString() ? `?${params.toString()}` : "";
      const data = await fetchAPI(`/orders${queryString}`);
      setOrders(data);
    } catch (error) {
        console.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  function confirmDeleteOrder(e, orderId) {
      // e.stopPropagation() handled in calling button
      setDeleteModal({ show: true, orderId });
      setDeletePassword("");
  }

  async function performDeleteOrder() {
      if (!deletePassword) {
            showToast("Please enter admin password", "error");
            return;
      }
      
      try {
          await fetchAPI(`/orders/${deleteModal.orderId}`, {
              method: 'DELETE',
              headers: { 'X-Admin-Password': deletePassword }
          });
          setDeleteModal({ show: false, orderId: null });
          setDeletePassword("");
          showToast("Order deleted successfully", "success");
          fetchOrders();
      } catch (err) {
          showToast("Failed to delete order: " + err.message, "error");
      }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1>Orders</h1>
      </div>

      <div className="controls-container">
        {/* Search */}
        <div className="control-group">
          <label className="control-label">Search   </label>
          <div className="input-wrapper">
             <svg className="input-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
             </svg>
            <input 
              type="text" 
              placeholder="Search by Order # or Tailor..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="styled-input"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="control-group small">
           <label className="control-label">Status</label>
           <div className="input-wrapper">
             <select 
               value={statusFilter}
               onChange={(e) => setStatusFilter(e.target.value)}
               className="styled-select"
             >
               <option value="All">All Statuses</option>
               <option value="Pending">Pending</option>
               <option value="In Progress">In Progress</option>
               <option value="Completed">Completed</option>
             </select>
             <svg className="select-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
             </svg>
           </div>
        </div>

        {/* School Filter */}
        <div className="control-group small">
           <label className="control-label">School</label>
           <div className="input-wrapper">
             <select 
               value={schoolFilter}
               onChange={(e) => setSchoolFilter(e.target.value)}
               className="styled-select"
             >
               <option value="All">All Schools</option>
               {schools.map(school => (
                   <option key={school.id} value={school.id}>{school.name}</option>
               ))}
             </select>
             <svg className="select-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
             </svg>
           </div>
        </div>

        {/* Sort */}
        <div className="control-group small">
           <label className="control-label">Sort By</label>
           <div className="input-wrapper">
             <select 
               value={sortBy}
               onChange={(e) => setSortBy(e.target.value)}
               className="styled-select"
             >
               <option value="newest">Newest First</option>
               <option value="oldest">Oldest First</option>
             </select>
             <svg className="select-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
             </svg>
           </div>
        </div>
      </div>
      
      {loading ? (
        <div>Loading orders...</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr>
              <th>Date</th>
              <th>Order ID</th>
              <th>Tailor</th>
              <th>Progress</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => {
              const totalQty = order.order_lines.reduce((sum, line) => sum + line.quantity, 0);
              const deliveredQty = order.order_lines.reduce((sum, line) => sum + (line.delivered_qty || 0), 0);
              const progress = totalQty > 0 ? Math.round((deliveredQty / totalQty) * 100) : 0;

              return (
              <tr 
                key={order.id} 
                onClick={() => navigate(`/orders/${order.id}`)}
                className="order-row" // Will add this class to CSS
                style={{ cursor: 'pointer', borderBottom: '1px solid #eee' }} // Inline fallback or move to CSS
              >
                <td>{new Date(order.created_at).toLocaleDateString()}</td>
                <td>#{order.id}</td>
                <td>{order.tailor_name}</td>
                <td>
                  <div className="progress-wrapper">
                    <div className="progress-container">
                      <div 
                        className={`progress-bar ${progress === 100 ? 'complete' : 'partial'}`} 
                        style={{width: `${progress}%`}}
                      ></div>
                    </div>
                    <span className="progress-text">{progress}%</span>
                  </div>
                </td>
                <td>
                  <span className={`px-2 py-1 rounded text-sm ${
                    order.status === 'Completed' ? 'bg-green-100 text-green-800' :
                    order.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {order.status}
                  </span>
                </td>
                <td className="text-right pr-4 relative">
                  <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === order.id ? null : order.id);
                    }}
                    className="icon-btn"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                    </svg>
                  </button>
                  
                  {openMenuId === order.id && (
                      <div className="dropdown-menu">
                              <button
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/orders/${order.id}`);
                                  }}
                                  className="dropdown-item"
                              >
                                  View Details
                              </button>
                              <button
                                  onClick={(e) => {
                                      e.stopPropagation();
                                      confirmDeleteOrder(e, order.id);
                                  }}
                                  className="dropdown-item danger"
                              >
                                  Delete Order
                              </button>
                      </div>
                  )}
                </td>
              </tr>
              );
            })}
            {orders.length === 0 && (
              <tr>
                <td colSpan="6" style={{textAlign: 'center', padding: '2rem'}}>
                  No orders found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
      {/* Delete Modal */}
      {deleteModal.show && (
            <div className="modal-overlay" style={{ zIndex: 200 }}>
                <div className="modal-content" style={{ maxWidth: '400px' }}>
                    <h3 className="modal-title">Delete Order #{deleteModal.orderId}</h3>
                    <p className="modal-message mb-4">
                        Are you sure you want to delete this order? All items and history will be lost.
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
                        <button className="btn secondary" onClick={() => setDeleteModal({ show: false, orderId: null })}>Cancel</button>
                        <button className="btn danger" onClick={performDeleteOrder}>Delete</button>
                    </div>
                </div>
            </div>
      )}
    </div>
  );
}
