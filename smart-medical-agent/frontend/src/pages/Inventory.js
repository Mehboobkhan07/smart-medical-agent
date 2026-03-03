import { useState, useEffect } from 'react';
import { getMedicines, addMedicine, updateStock, getInventoryAlerts } from '../utils/api';

export default function Inventory() {
  const [medicines, setMedicines] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', category: '', stock: '', min_stock: '', price: '', supplier: '', expiry: '' });

  useEffect(() => {
    Promise.all([getMedicines(), getInventoryAlerts()]).then(([m, a]) => {
      setMedicines(m.data);
      setAlerts(a.data.alerts);
      setLoading(false);
    });
  }, []);

  const filtered = medicines.filter(m => m.name?.toLowerCase().includes(search.toLowerCase()) || m.category?.toLowerCase().includes(search.toLowerCase()));

  const getStockStatus = (stock, min) => {
    if (stock === 0) return { label: 'OUT OF STOCK', badge: 'badge-red' };
    if (stock < min) return { label: 'LOW STOCK', badge: 'badge-amber' };
    return { label: 'ADEQUATE', badge: 'badge-green' };
  };

  const handleAdd = async () => {
    try {
      const res = await addMedicine({ ...form, stock: +form.stock, min_stock: +form.min_stock, price: +form.price });
      setMedicines(prev => [...prev, res.data]);
      setShowModal(false);
    } catch (e) { alert('Error adding medicine'); }
  };

  const handleStockUpdate = async (id, current) => {
    const qty = prompt('Enter new stock quantity:', current);
    if (qty === null) return;
    try {
      const res = await updateStock(id, parseInt(qty));
      setMedicines(prev => prev.map(m => m.id === id ? res.data : m));
    } catch (e) { alert('Error updating stock'); }
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Medicine Inventory</div>
          <div className="section-sub">{medicines.length} medicines · {alerts.length} alerts</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {alerts.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 8, fontSize: 13, color: '#ef4444', fontWeight: 600 }}>
              🚨 {alerts.length} Low Stock
            </div>
          )}
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Medicine</button>
        </div>
      </div>

      {/* Alert Banner */}
      {alerts.filter(a => a.severity === 'critical').length > 0 && (
        <div className="alert-card alert-critical" style={{ marginBottom: 20, borderRadius: 10 }}>
          <span style={{ fontSize: 22 }}>🚨</span>
          <div>
            <div style={{ fontWeight: 700, color: '#ef4444', fontSize: 14 }}>Critical Stock Alert</div>
            <div style={{ fontSize: 13, color: '#94a3b8', marginTop: 2 }}>
              {alerts.filter(a => a.severity === 'critical').map(a => a.medicine).join(', ')} — immediate restocking required
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <input className="input" style={{ flex: 1 }} placeholder="🔍  Search medicines..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card">
        {loading ? <div className="page-loader"><div className="spinner" /></div> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Medicine</th><th>Category</th><th>Stock Level</th>
                  <th>Price</th><th>Supplier</th><th>Expiry</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const status = getStockStatus(m.stock, m.min_stock);
                  const pct = Math.min((m.stock / Math.max(m.min_stock * 2, 1)) * 100, 100);
                  const fillColor = m.stock === 0 ? '#ef4444' : m.stock < m.min_stock ? '#f59e0b' : '#10b981';
                  return (
                    <tr key={m.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 13 }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: '#4a5568', fontFamily: 'JetBrains Mono' }}>{m.id}</div>
                      </td>
                      <td><span className="badge badge-blue" style={{ fontSize: 10 }}>{m.category}</span></td>
                      <td>
                        <div style={{ minWidth: 120 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                            <span style={{ color: fillColor, fontWeight: 700 }}>{m.stock}</span>
                            <span style={{ color: '#4a5568' }}>Min: {m.min_stock}</span>
                          </div>
                          <div className="stock-bar">
                            <div className="stock-fill" style={{ width: `${pct}%`, background: fillColor }} />
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'JetBrains Mono', fontSize: 13 }}>₹{m.price}</td>
                      <td>{m.supplier}</td>
                      <td style={{ fontSize: 12, color: '#64748b' }}>{m.expiry}</td>
                      <td><span className={`badge ${status.badge}`}>{status.label}</span></td>
                      <td>
                        <button className="btn btn-ghost" style={{ padding: '5px 10px', fontSize: 12 }} onClick={() => handleStockUpdate(m.id, m.stock)}>
                          📦 Update
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">💊 Add Medicine</div>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="grid-2" style={{ gap: 14 }}>
              {[
                { key: 'name', label: 'Medicine Name', placeholder: 'Metformin 500mg' },
                { key: 'category', label: 'Category', placeholder: 'Antidiabetic' },
                { key: 'stock', label: 'Current Stock', placeholder: '100' },
                { key: 'min_stock', label: 'Min Stock Level', placeholder: '50' },
                { key: 'price', label: 'Price (₹)', placeholder: '12.50' },
                { key: 'supplier', label: 'Supplier', placeholder: 'Sun Pharma' },
                { key: 'expiry', label: 'Expiry Date', placeholder: '2025-12-31' },
              ].map(f => (
                <div key={f.key} className="input-group">
                  <label className="input-label">{f.label}</label>
                  <input className="input" placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleAdd}>Add Medicine</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
