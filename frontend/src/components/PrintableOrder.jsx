import React from 'react';

const PrintableOrder = ({ order }) => {
  if (!order) return null;

  return (
    <div className="printable-order">
      <div className="print-header">
        <h1>Order #{order.id}</h1>
        <div className="meta-info">
          <div><strong>Tailor:</strong> {order.tailor_name}</div>
          <div><strong>Status:</strong> {order.status}</div>
          <div><strong>Printed On:</strong> {new Date().toLocaleString()}</div>
        </div>
      </div>

      <div className="print-section">
        <h3>Order Items & Logs</h3>
        {order.order_lines.map((line, index) => (
            <div key={line.id} className="print-item-block">
                <div className="print-item-header">
                    <span className="item-number">#{index + 1}</span>
                    <span className="item-name">{line.product_name} - {line.size_label}</span>
                    <span className="item-qty">Qty: {line.quantity}</span>
                </div>
                
                <table className="print-stats-table">
                    <thead>
                        <tr>
                           <th>Mat. Req</th>
                           <th>Used</th>
                           <th>In Hand</th>
                           <th>Ordered</th>
                           <th>Delivered</th>
                           <th>Pending</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>{line.material_req_per_unit} {line.unit}</td>
                            <td>{(line.delivered_qty * line.material_req_per_unit).toFixed(2)} {line.unit}</td>
                            <td>{(line.pending_qty * line.material_req_per_unit).toFixed(2)} {line.unit}</td>
                            <td>{line.quantity}</td>
                            <td>{line.delivered_qty}</td>
                            <td>{line.pending_qty}</td>
                        </tr>
                    </tbody>
                </table>

                <div className="print-logs">
                    <h4>Delivery Log</h4>
                    {line.deliveries && line.deliveries.length > 0 ? (
                        <table className="print-log-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Quantity Delivered</th>
                                </tr>
                            </thead>
                            <tbody>
                                {line.deliveries.map(d => (
                                    <tr key={d.id}>
                                        <td>{new Date(d.date_delivered).toLocaleString()}</td>
                                        <td>{d.quantity_delivered}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="no-logs">No deliveries recorded.</div>
                    )}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};

export default PrintableOrder;
