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

  useEffect(() => {
    // Debounce search slightly to avoid too many requests
    const timer = setTimeout(() => {
      fetchOrders();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, sortBy, statusFilter]);

  async function fetchOrders() {
    try {
      setLoading(true);
      // Construct query params
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (sortBy) params.append("sort_by", sortBy);
      if (statusFilter && statusFilter !== "All") params.append("status", statusFilter);

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
        <Link to="/create-order" className="btn">New Order</Link>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4 items-end">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
          <input 
            type="text" 
            placeholder="Search Order ID or Tailor Name..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border p-2 rounded"
          />
        </div>

        {/* Status Filter */}
        <div className="w-[200px]">
           <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
           <select 
             value={statusFilter}
             onChange={(e) => setStatusFilter(e.target.value)}
             className="w-full border p-2 rounded"
           >
             <option value="All">All Statuses</option>
             <option value="Pending">Pending</option>
             <option value="In Progress">In Progress</option>
             <option value="Completed">Completed</option>
           </select>
        </div>

        {/* Sort */}
        <div className="w-[200px]">
           <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
           <select 
             value={sortBy}
             onChange={(e) => setSortBy(e.target.value)}
             className="w-full border p-2 rounded"
           >
             <option value="newest">Newest First</option>
             <option value="oldest">Oldest First</option>
           </select>
        </div>
      </div>
      
      {loading ? (
        <div>Loading orders...</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Tailor</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr key={order.id}>
                <td>#{order.id}</td>
                <td>{order.tailor_name}</td>
                <td>{new Date(order.created_at).toLocaleDateString()}</td>
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
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan="5" style={{textAlign: 'center', padding: '2rem'}}>
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
