import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAPI } from '../api';

export default function OrderList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    try {
      setLoading(true);
      const data = await fetchAPI('/orders');
      setOrders(data);
    } catch (error) {
        console.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div>Loading orders...</div>;

  return (
    <div>
      <div className="flex justify-between items-center" style={{marginBottom: '1rem'}}>
        <h1>Orders</h1>
        <Link to="/create-order" className="btn">New Order</Link>
      </div>
      
      <table>
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
              <td>{order.status}</td>
              <td>
                <Link to={`/orders/${order.id}`}>View</Link>
              </td>
            </tr>
          ))}
          {orders.length === 0 && (
            <tr>
              <td colSpan="5" style={{textAlign: 'center'}}>No orders found</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
