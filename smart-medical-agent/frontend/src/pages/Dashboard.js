import { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { getDashboard, getInventoryAlerts } from '../utils/api';

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0a1628', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 8, padding: '8px 12px' }}>
      <p style={{ color: '#94a3b8', fontSize: 12 }}>{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color, fontSize: 13, fontWeight: 600 }}>{p.value}</p>)}
    </div>
  );
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboard(), getInventoryAlerts()]).then(([d, a]) => {
      setData(d.data);
      setAlerts(a.data.alerts);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page-loader"><div className="spinner" /><span>Loading dashboard...</span></div>
  );

  const stats = [
    { icon: '👥', label: 'Total Patients', value: data?.total_patients || 0, color: '#0ea5e9', bg: 'rgba(14,165,233,0.12)' },
    { icon: '💊', label: 'Prescriptions', value: data?.total_prescriptions || 0, color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    { icon: '📅', label: "Today's Appointments", value: data?.today_appointments || 0, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    { icon: '⚠️', label: 'Low Stock Alerts', value: data?.low_stock_medicines || 0, color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
  ];

  return (
    <div>
      {/* Stats */}
      <div className="stats-grid">
        {stats.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div className="stat-info">
              <h3 style={{ color: s.color }}>{s.value}</h3>
              <p>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: 20 }}>
        {/* Patient Trends */}
        <div className="card">
          <div className="section-header">
            <div>
              <div className="section-title">Patient Trends</div>
              <div className="section-sub">Monthly registrations</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data?.patient_trends || []}>
              <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="patients" stroke="#0ea5e9" strokeWidth={2.5}
                dot={{ fill: '#0ea5e9', r: 4 }} activeDot={{ r: 6, fill: '#38bdf8' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Medicine Categories */}
        <div className="card">
          <div className="section-header">
            <div>
              <div className="section-title">Medicine Categories</div>
              <div className="section-sub">Inventory distribution</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie data={data?.medicine_stats || []} dataKey="count" cx="50%" cy="50%" outerRadius={75} innerRadius={40}>
                  {(data?.medicine_stats || []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ flex: 1 }}>
              {(data?.medicine_stats || []).map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length], flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#94a3b8', flex: 1 }}>{item.category}</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: COLORS[i % COLORS.length] }}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2">
        {/* Inventory Alerts */}
        <div className="card">
          <div className="section-header">
            <div className="section-title">⚠️ Inventory Alerts</div>
            <span className="badge badge-red">{alerts.length} Active</span>
          </div>
          {alerts.length === 0 ? (
            <p style={{ color: '#64748b', fontSize: 14 }}>✓ All stock levels normal</p>
          ) : (
            alerts.map((alert, i) => (
              <div key={i} className={`alert-card ${alert.severity === 'critical' ? 'alert-critical' : 'alert-warning'}`}>
                <span style={{ fontSize: 20 }}>{alert.severity === 'critical' ? '🚨' : '⚠️'}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: alert.severity === 'critical' ? '#ef4444' : '#f59e0b' }}>
                    {alert.medicine}
                  </div>
                  <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                    Stock: {alert.current_stock} / Min: {alert.min_stock}
                  </div>
                </div>
                <span className={`badge ${alert.severity === 'critical' ? 'badge-red' : 'badge-amber'}`}>
                  {alert.severity.toUpperCase()}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="section-header">
            <div className="section-title">Recent Activity</div>
          </div>
          {(data?.recent_activity || []).map((act, i) => {
            const icons = { prescription: '💊', alert: '⚠️', appointment: '📅', patient: '👤' };
            const colors = { prescription: '#10b981', alert: '#f59e0b', appointment: '#0ea5e9', patient: '#8b5cf6' };
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${colors[act.type]}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                  {icons[act.type] || '📌'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, color: '#cbd5e1' }}>{act.message}</div>
                  <div style={{ fontSize: 11, color: '#4a5568', marginTop: 1 }}>{act.time}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
