import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav style={{ background: '#333', color: '#fff', padding: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
      <div style={{ fontWeight: 'bold', fontSize: '1.2rem', marginRight: 'auto' }}>
        Tailor Tally
      </div>
      <Link to="/" style={{ color: '#fff', textDecoration: 'none' }}>Orders</Link>
      <Link to="/create-order" style={{ color: '#fff', textDecoration: 'none' }}>New Order</Link>
      <Link to="/master-data" style={{ color: '#fff', textDecoration: 'none' }}>Master Data</Link>
    </nav>
  );
}
