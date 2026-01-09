import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import OrderList from './pages/OrderList';
import CreateOrder from './pages/CreateOrder';
import MasterData from './pages/MasterData';
import OrderDetails from './pages/OrderDetails';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <Router>
      <Navbar />
      <div className="container">
        <Routes>
          <Route path="/" element={<OrderList />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-order" element={<CreateOrder />} />
          <Route path="/master-data" element={<MasterData />} />
          <Route path="/orders/:id" element={<OrderDetails />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
