import React, { useState, useEffect } from 'react';
import { fetchAPI } from '../api';
import { useNotification } from '../components/Notification';

export default function Reports() {
  const { showToast } = useNotification();

  // Filters State
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [selectedTailorId, setSelectedTailorId] = useState('');

  // Dropdown options
  const [schools, setSchools] = useState([]);
  const [tailors, setTailors] = useState([]);

  // Report Data
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedTailors, setExpandedTailors] = useState({});

  // Load Schools and Tailors for dropdowns
  useEffect(() => {
    async function loadOptions() {
      try {
        const [schoolsData, tailorsData] = await Promise.all([
          fetchAPI('/schools/'),
          fetchAPI('/master-data/tailors/')
        ]);
        setSchools(schoolsData || []);
        setTailors(tailorsData || []);
      } catch (err) {
        console.error("Failed to load filter options:", err);
      }
    }
    loadOptions();
  }, []);

  // Fetch Report Data
  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedSchoolId) params.append('school_id', selectedSchoolId);
      if (selectedTailorId) params.append('tailor_id', selectedTailorId);

      const qs = params.toString();
      const endpoint = `/reports/cloth-tally${qs ? `?${qs}` : ''}`;
      const data = await fetchAPI(endpoint);
      setReportData(data);
    } catch (err) {
      console.error("Failed to fetch report:", err);
      showToast("Failed to load report data: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [startDate, endDate, selectedSchoolId, selectedTailorId]);

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedSchoolId('');
    setSelectedTailorId('');
  };

  const toggleTailorOrders = (tailorId) => {
    setExpandedTailors((prev) => ({
      ...prev,
      [tailorId]: !prev[tailorId]
    }));
  };

  const [downloading, setDownloading] = useState(false);

  // Backend PDF Download using Blob
  const handleDownloadPDF = async () => {
    if (downloading) return;
    setDownloading(true);
    showToast("Generating PDF report...", "info");

    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      if (selectedSchoolId) params.append('school_id', selectedSchoolId);
      if (selectedTailorId) params.append('tailor_id', selectedTailorId);

      const qs = params.toString();
      const downloadUrl = `http://localhost:8000/reports/cloth-tally/pdf${qs ? `?${qs}` : ''}`;

      const res = await fetch(downloadUrl);
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
      }

      const blob = await res.blob();
      if (!blob || blob.size === 0) {
        throw new Error("Received empty PDF file from server");
      }

      // Try to get filename from header
      let filename = '';
      const disposition = res.headers.get('content-disposition');
      if (disposition && disposition.includes('filename=')) {
        const matches = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (matches && matches[1]) {
          filename = matches[1].replace(/['"]/g, '').trim();
        }
      }
      if (!filename) {
        const schoolObj = schools.find(s => String(s.id) === String(selectedSchoolId));
        const schoolPart = schoolObj ? schoolObj.name.toLowerCase().replace(/[^a-z0-9]/g, '_') : 'all_schools';
        const datePart = (startDate || 'earliest') + '_to_' + (endDate || 'latest');
        filename = `cloth_tally_report_${schoolPart}_${datePart}.pdf`;
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        if (document.body.contains(a)) {
          document.body.removeChild(a);
        }
        window.URL.revokeObjectURL(blobUrl);
      }, 1500);

      showToast("PDF report downloaded successfully!", "success");
    } catch (err) {
      console.error("PDF download failed:", err);
      showToast("Download failed: " + (err.message || "Unknown error"), "error");
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const overall = reportData?.overall_summary || {};
  const tailorsList = reportData?.tailor_summaries || [];
  const schoolsList = reportData?.school_details || [];
  const activeFilters = reportData?.filters || {};

  return (
    <div className="reports-page" style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '2rem' }}>
      {/* Top Header & Actions */}
      <div className="no-print flex justify-between items-center flex-wrap gap-3 mb-4" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', color: '#1e293b' }}>Cloth Tally Report</h1>
          <p style={{ margin: '2px 0 0 0', color: '#64748b', fontSize: '0.85rem' }}>
            Tally fabric given to tailors against order requirements and track school delivery progress
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="btn secondary"
            onClick={handlePrint}
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
          >
            🖨️ Print
          </button>
          <button
            className="btn"
            style={{ 
              background: downloading ? '#94a3b8' : '#2563eb', 
              color: '#fff', 
              padding: '0.45rem 1rem', 
              fontSize: '0.85rem', 
              fontWeight: '600',
              cursor: downloading ? 'not-allowed' : 'pointer'
            }}
            onClick={handleDownloadPDF}
            disabled={downloading}
          >
            {downloading ? '⏳ Generating PDF...' : '📥 Download PDF'}
          </button>
        </div>
      </div>

      {/* Simple, Compact Filter Bar */}
      <div className="card no-print mb-4" style={{ padding: '0.75rem 1rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
        <div className="flex items-center flex-wrap gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span style={{ fontWeight: '600', color: '#475569' }}>From:</span>
            <input
              type="date"
              className="input"
              style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem', width: '135px' }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span style={{ fontWeight: '600', color: '#475569' }}>To:</span>
            <input
              type="date"
              className="input"
              style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem', width: '135px' }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2" style={{ minWidth: '180px', flex: '1 1 180px' }}>
            <span style={{ fontWeight: '600', color: '#475569' }}>School:</span>
            <select
              className="input"
              style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
            >
              <option value="">All Schools</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2" style={{ minWidth: '170px', flex: '1 1 170px' }}>
            <span style={{ fontWeight: '600', color: '#475569' }}>Tailor:</span>
            <select
              className="input"
              style={{ padding: '0.35rem 0.5rem', fontSize: '0.85rem' }}
              value={selectedTailorId}
              onChange={(e) => setSelectedTailorId(e.target.value)}
            >
              <option value="">All Tailors</option>
              {tailors.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {(startDate || endDate || selectedSchoolId || selectedTailorId) && (
            <button
              className="btn secondary"
              onClick={handleClearFilters}
              style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: '#dc2626' }}
            >
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {loading && !reportData ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
          Loading report data...
        </div>
      ) : (
        <div id="report-printable-area">
          {/* Print-only Document Title */}
          <div className="print-only" style={{ marginBottom: '1rem', borderBottom: '2px solid #334155', paddingBottom: '0.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.3rem' }}>Tailor Tally — Cloth Allocation & Tailor Report</h2>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
              Generated on: {new Date().toLocaleString()} | School: {activeFilters.school_name || 'All Schools'} | Tailor: {activeFilters.tailor_name || 'All Tailors'}
            </div>
          </div>

          {/* Section 1: Single Tailor Summary Table (includes Total row, without Schools Assigned column) */}
          <div className="card mb-4" style={{ padding: '1rem', border: '1px solid #e2e8f0' }}>
            <div className="flex justify-between items-center mb-3">
              <h2 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: '700' }}>
                1. Tailor Orders & Material Summary
              </h2>
              <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                {tailorsList.length} Tailor(s) Active
              </span>
            </div>

            {tailorsList.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                No tailor orders found for the selected filter.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Tailor Name</th>
                      <th style={{ textAlign: 'center' }}>Orders</th>
                      <th style={{ textAlign: 'right' }}>Cloth Given</th>
                      <th style={{ textAlign: 'right' }}>Cloth Req.</th>
                      <th style={{ textAlign: 'right' }}>Balance</th>
                      <th style={{ textAlign: 'center' }}>Garments (Del / Ord)</th>
                      <th style={{ textAlign: 'center' }}>Completion</th>
                      <th className="no-print" style={{ textAlign: 'center' }}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tailorsList.map((t) => {
                      const isExpanded = expandedTailors[t.tailor_id];
                      return (
                        <React.Fragment key={t.tailor_id}>
                          <tr>
                            <td>
                              <strong>{t.tailor_name}</strong>
                              {t.phone && (
                                <span style={{ fontSize: '0.75rem', color: '#64748b', marginLeft: '6px' }}>({t.phone})</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>{t.orders_count}</td>
                            <td style={{ textAlign: 'right', fontWeight: '600' }}>
                              {t.total_cloth_given.toFixed(2)} m
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {t.total_cloth_required.toFixed(2)} m
                            </td>
                            <td
                              style={{
                                textAlign: 'right',
                                fontWeight: '700',
                                color: t.cloth_balance >= 0 ? '#16a34a' : '#dc2626'
                              }}
                            >
                              {t.cloth_balance >= 0 ? '+' : ''}{t.cloth_balance.toFixed(2)} m
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <strong>{t.total_pieces_delivered}</strong> / {t.total_pieces_ordered}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span
                                className={`badge ${
                                  t.completion_percentage >= 100
                                    ? 'badge-success'
                                    : t.completion_percentage > 0
                                    ? 'badge-warning'
                                    : 'badge-neutral'
                                }`}
                              >
                                {t.completion_percentage}%
                              </span>
                            </td>
                            <td className="no-print" style={{ textAlign: 'center' }}>
                              <button
                                className="btn secondary"
                                style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }}
                                onClick={() => toggleTailorOrders(t.tailor_id)}
                              >
                                {isExpanded ? 'Hide' : 'Orders'}
                              </button>
                            </td>
                          </tr>

                          {/* Expandable Order Breakdown for Tailor */}
                          {isExpanded && (
                            <tr>
                              <td colSpan={8} style={{ background: '#f8fafc', padding: '8px 12px' }}>
                                <div style={{ fontWeight: '600', marginBottom: '4px', fontSize: '0.8rem', color: '#475569' }}>
                                  Assigned Orders for {t.tailor_name}:
                                </div>
                                <table className="report-subtable">
                                  <thead>
                                    <tr>
                                      <th>Order</th>
                                      <th>Slip</th>
                                      <th>Date</th>
                                      <th>Schools</th>
                                      <th>Status</th>
                                      <th style={{ textAlign: 'right' }}>Cloth Given</th>
                                      <th style={{ textAlign: 'right' }}>Cloth Req.</th>
                                      <th style={{ textAlign: 'center' }}>Pieces (Del / Ord)</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {t.orders.map((ord) => (
                                      <tr key={ord.order_id}>
                                        <td>
                                          <a href={`/orders/${ord.order_id}`} style={{ color: '#2563eb', fontWeight: '600' }}>
                                            #{ord.order_id}
                                          </a>
                                        </td>
                                        <td>{ord.slip_no}</td>
                                        <td>{ord.created_at}</td>
                                        <td>{ord.schools.join(', ') || '-'}</td>
                                        <td>
                                          <span className={`badge ${ord.status === 'Completed' ? 'badge-success' : ord.status === 'In Progress' ? 'badge-warning' : 'badge-neutral'}`}>
                                            {ord.status}
                                          </span>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>{ord.cloth_given.toFixed(2)} m</td>
                                        <td style={{ textAlign: 'right' }}>{ord.cloth_required.toFixed(2)} m</td>
                                        <td style={{ textAlign: 'center' }}>{ord.pieces_delivered} / {ord.pieces_ordered}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  {/* Total Row */}
                  <tfoot>
                    <tr style={{ background: '#f1f5f9', fontWeight: '700', borderTop: '2px solid #cbd5e1' }}>
                      <td>Total</td>
                      <td style={{ textAlign: 'center' }}>{overall.total_orders || 0}</td>
                      <td style={{ textAlign: 'right' }}>{(overall.total_cloth_given || 0).toFixed(2)} m</td>
                      <td style={{ textAlign: 'right' }}>{(overall.total_cloth_required || 0).toFixed(2)} m</td>
                      <td
                        style={{
                          textAlign: 'right',
                          color: (overall.net_cloth_balance || 0) >= 0 ? '#16a34a' : '#dc2626'
                        }}
                      >
                        {(overall.net_cloth_balance || 0) >= 0 ? '+' : ''}{(overall.net_cloth_balance || 0).toFixed(2)} m
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {overall.total_pieces_delivered || 0} / {overall.total_pieces_ordered || 0}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {overall.total_pieces_ordered
                          ? Math.round(((overall.total_pieces_delivered || 0) / overall.total_pieces_ordered) * 100)
                          : 0}%
                      </td>
                      <td className="no-print">-</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Section 2: School Breakdown (Details for each school given) */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-3">
              <h2 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a', fontWeight: '700' }}>
                2. School Breakdown & Allocations
              </h2>
              <span className="badge badge-neutral" style={{ fontSize: '0.75rem' }}>
                {schoolsList.length} School Group(s)
              </span>
            </div>

            {schoolsList.length === 0 ? (
              <div className="card" style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8' }}>
                No school items found matching the selected filter.
              </div>
            ) : (
              schoolsList.map((school) => (
                <div key={school.school_id ?? 'unassigned'} className="card mb-3" style={{ padding: '0.85rem', border: '1px solid #e2e8f0' }}>
                  {/* School Header */}
                  <div className="flex justify-between items-center flex-wrap gap-2 pb-2 mb-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: '1rem', fontWeight: '700', color: '#1e293b' }}>
                        🏫 {school.school_name}
                      </span>
                      <span className="badge badge-neutral" style={{ fontSize: '0.72rem' }}>
                        {school.total_orders} Orders
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs" style={{ color: '#475569' }}>
                      <span>Tailors: <strong>{school.tailors_involved.join(', ') || '-'}</strong></span>
                      <span>Given: <strong>{school.total_cloth_given.toFixed(2)} m</strong></span>
                      <span>Req: <strong>{school.total_cloth_required.toFixed(2)} m</strong></span>
                      <span>
                        Variance:{' '}
                        <strong style={{ color: school.cloth_balance >= 0 ? '#16a34a' : '#dc2626' }}>
                          {school.cloth_balance >= 0 ? '+' : ''}{school.cloth_balance.toFixed(2)} m
                        </strong>
                      </span>
                    </div>
                  </div>

                  {/* Clean School Items Table (9 columns) */}
                  <div className="table-responsive">
                    <table className="report-table">
                      <thead>
                        <tr>
                          <th>Order</th>
                          <th>Date</th>
                          <th>Tailor</th>
                          <th>Product & Size</th>
                          <th style={{ textAlign: 'center' }}>Qty (Del / Ord)</th>
                          <th style={{ textAlign: 'right' }}>Cloth Given</th>
                          <th style={{ textAlign: 'right' }}>Req. Cloth</th>
                          <th style={{ textAlign: 'right' }}>Balance</th>
                          <th style={{ textAlign: 'center' }}>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {school.items.map((item, idx) => (
                          <tr key={idx}>
                            <td>
                              <a href={`/orders/${item.order_id}`} style={{ color: '#2563eb', fontWeight: '600' }}>
                                #{item.order_id}
                              </a>
                              {item.slip_no && (
                                <span style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: '4px' }}>
                                  ({item.slip_no})
                                </span>
                              )}
                            </td>
                            <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.order_date}</td>
                            <td>{item.tailor_name}</td>
                            <td>
                              <strong>{item.product_name}</strong> - {item.size_label}
                              {item.fabric_width_inches && (
                                <span style={{ fontSize: '0.72rem', color: '#64748b', marginLeft: '4px' }}>
                                  ({item.fabric_width_inches}")
                                </span>
                              )}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <strong>{item.delivered_qty}</strong> / {item.quantity}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: '600' }}>
                              {item.given_cloth !== null ? `${item.given_cloth.toFixed(2)} m` : '-'}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              {item.total_material_req.toFixed(2)} m
                            </td>
                            <td
                              style={{
                                textAlign: 'right',
                                fontWeight: '700',
                                color: item.balance !== null ? (item.balance >= 0 ? '#16a34a' : '#dc2626') : '#94a3b8'
                              }}
                            >
                              {item.balance !== null ? `${item.balance >= 0 ? '+' : ''}${item.balance.toFixed(2)} m` : '-'}
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`badge ${item.order_status === 'Completed' ? 'badge-success' : item.order_status === 'In Progress' ? 'badge-warning' : 'badge-neutral'}`}>
                                {item.order_status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#f8fafc', fontWeight: '700' }}>
                          <td colSpan={4} style={{ textAlign: 'right' }}>Subtotal:</td>
                          <td style={{ textAlign: 'center' }}>{school.total_pieces_delivered} / {school.total_pieces_ordered}</td>
                          <td style={{ textAlign: 'right' }}>{school.total_cloth_given.toFixed(2)} m</td>
                          <td style={{ textAlign: 'right' }}>{school.total_cloth_required.toFixed(2)} m</td>
                          <td style={{ textAlign: 'right', color: school.cloth_balance >= 0 ? '#16a34a' : '#dc2626' }}>
                            {school.cloth_balance >= 0 ? '+' : ''}{school.cloth_balance.toFixed(2)} m
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
