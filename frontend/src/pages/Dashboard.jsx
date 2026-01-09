import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#0088fe', '#00C49F', '#FFBB28', '#FF8042'];

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:8000/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch stats:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading dashboard insights...</div>;
  if (!stats) return <div style={{ padding: '2rem', textAlign: 'center' }}>Error loading data.</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '2rem', color: '#333' }}>Dashboard Overview</h1>
      
      {/* Top Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div className="card" style={{ padding: '1.5rem', borderLeft: '5px solid #ff4d4f', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#666', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Active Orders</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: 0, color: '#ff4d4f' }}>{stats.active_orders}</p>
        </div>
        
        <div className="card" style={{ padding: '1.5rem', borderLeft: '5px solid #52c41a', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#666', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Material Issued</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: 0, color: '#52c41a' }}>{stats.material_issued} <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>meters</span></p>
        </div>

        <div className="card" style={{ padding: '1.5rem', borderLeft: '5px solid #1890ff', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#666', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Work Done</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: 0, color: '#1890ff' }}>{stats.material_work_done} <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>meters</span></p>
        </div>

        <div className="card" style={{ padding: '1.5rem', borderLeft: '5px solid #faad14', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h3 style={{ color: '#666', fontSize: '0.9rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Work Pending</h3>
          <p style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: 0, color: '#faad14' }}>{stats.material_work_pending} <span style={{ fontSize: '1rem', fontWeight: 'normal' }}>meters</span></p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '2rem' }}>
        
        {/* Top Products Chart */}
        <div className="card" style={{ padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', borderRadius: '12px', background: '#fff' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: '#444' }}>Top Product Types (by volume)</h2>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.top_products}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                />
                <Bar dataKey="quantity" radius={[4, 4, 0, 0]}>
                  {stats.top_products.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Tailors Chart */}
        <div className="card" style={{ padding: '1.5rem', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', borderRadius: '12px', background: '#fff' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', color: '#444' }}>Tailor Workload (Orders Assigned)</h2>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.top_tailors}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                />
                <Bar dataKey="order_count" radius={[4, 4, 0, 0]}>
                  {stats.top_tailors.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 3) % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
}
