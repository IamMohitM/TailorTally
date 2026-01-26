import React from 'react';
import { Link, NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">Tailor Tally</Link>
      
      <NavLink to="/" className="nav-link" end>Orders</NavLink>
      <NavLink to="/master-data" className="nav-link">Master Data</NavLink>
      <NavLink to="/dashboard" className="nav-link">Dashboard</NavLink>
      
      <NavLink to="/create-order" className="nav-link btn-new">+ New Order</NavLink>
      <NavLink to="/settings" className="nav-link">Settings</NavLink>
      <a href="http://localhost:8090" target="_blank" rel="noopener noreferrer" className="nav-link">DB Viewer</a>
    </nav>
  );
}
