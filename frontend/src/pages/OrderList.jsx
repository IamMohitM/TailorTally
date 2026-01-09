import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAPI } from '../api';

export default function OrderList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
              <tr key={order.id}>
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
                <td>
                  <Link to={`/orders/${order.id}`} className="text-indigo-600 hover:text-indigo-900">View</Link>
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
    </div>
  );
}
