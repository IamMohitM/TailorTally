import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav style={{ background: '#333', color: '#fff', padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <div style={{ fontWeight: 'bold', fontSize: '1.2rem', marginRight: 'auto' }}>
        <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>Tailor Tally</Link>
      </div>
      <Link to="/" style={{ color: '#fff', textDecoration: 'none', padding: '0.5rem 0.8rem' }}>Orders</Link>
      <Link to="/master-data" style={{ color: '#fff', textDecoration: 'none', padding: '0.5rem 0.8rem' }}>Master Data</Link>
      <Link to="/dashboard" style={{ color: '#fff', textDecoration: 'none', padding: '0.5rem 0.8rem' }}>Dashboard</Link>
      <Link to="/create-order" style={{ 
        background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)', 
        color: '#fff', 
        textDecoration: 'none', 
        padding: '0.6rem 1.2rem', 
        borderRadius: '8px', 
        fontWeight: '600',
        boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)',
        transition: 'transform 0.2s'
      }}>+ New Order</Link>
    </nav>
  );
}
