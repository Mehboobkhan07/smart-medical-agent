import { useState, useEffect } from 'react';
import { getAppointments, createAppointment, getPatients } from '../utils/api';

const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '14:00', '14:30', '15:00', '15:30', '16:00'];
const doctors = ['Dr. Mehta', 'Dr. Sharma', 'Dr. Kapoor', 'Dr. Reddy', 'Dr. Singh'];

export default function Appointments() {
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [form, setForm] = useState({ patient_id: '', doctor: '', date: '', time: '', reason: '' });

  useEffect(() => {
    Promise.all([getAppointments(), getPatients()]).then(([a, p]) => {
      setAppointments(a.data);
      setPatients(p.data);
      setLoading(false);
    });
  }, []);

  const filtered = filterDate ? appointments.filter(a => a.date === filterDate) : appointments;
  const today = new Date().toISOString().split('T')[0];
  const todayAppts = appointments.filter(a => a.date === today);

  const handleCreate = async () => {
    try {
      const res = await createAppointment(form);
      setAppointments(prev => [...prev, res.data]);
      setShowModal(false);
    } catch (e) { alert('Error creating appointment'); }
  };

  const getPatientName = (id) => patients.find(p => p.id === id)?.name || id;

  const statusColor = { scheduled: 'badge-blue', completed: 'badge-green', cancelled: 'badge-red' };

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Appointment Schedule</div>
          <div className="section-sub">{todayAppts.length} appointments today · {appointments.length} total</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Schedule Appointment</button>
      </div>

      {/* Today summary */}
      {todayAppts.length > 0 && (
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
          {todayAppts.map((a, i) => (
            <div key={i} style={{ minWidth: 200, background: 'var(--bg-card2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', borderTop: '2px solid #0ea5e9' }}>
              <div style={{ fontSize: 11, color: '#0ea5e9', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{a.time}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0', marginTop: 5 }}>{getPatientName(a.patient_id)}</div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{a.doctor}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 6, background: 'rgba(14,165,233,0.06)', padding: '4px 8px', borderRadius: 5 }}>{a.reason}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12, marginBottom: 18, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>Filter by date:</span>
          <input className="input" type="date" style={{ width: 'auto' }} value={filterDate} onChange={e => setFilterDate(e.target.value)} />
          {filterDate && <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => setFilterDate('')}>Clear</button>}
        </div>
      </div>

      <div className="card">
        {loading ? <div className="page-loader"><div className="spinner" /></div> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Appointment ID</th><th>Patient</th><th>Doctor</th><th>Date</th><th>Time</th><th>Reason</th><th>Status</th></tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <tr key={a.id}>
                    <td><span style={{ fontFamily: 'JetBrains Mono', color: '#8b5cf6', fontSize: 12 }}>{a.id}</span></td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 13 }}>{getPatientName(a.patient_id)}</div>
                      <div style={{ fontSize: 11, color: '#4a5568' }}>{a.patient_id}</div>
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: 13 }}>{a.doctor}</td>
                    <td>
                      <span style={{ fontSize: 12 }}>{a.date}</span>
                      {a.date === today && <span className="badge badge-green" style={{ fontSize: 10, marginLeft: 6 }}>Today</span>}
                    </td>
                    <td><span style={{ fontFamily: 'JetBrains Mono', color: '#0ea5e9', fontWeight: 700, fontSize: 13 }}>{a.time}</span></td>
                    <td style={{ fontSize: 13, color: '#94a3b8', maxWidth: 160 }}>{a.reason}</td>
                    <td><span className={`badge ${statusColor[a.status] || 'badge-blue'}`}>{a.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">📅 Schedule Appointment</div>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="input-group">
                <label className="input-label">Patient</label>
                <select className="select" value={form.patient_id} onChange={e => setForm(p => ({ ...p, patient_id: e.target.value }))}>
                  <option value="">Select patient...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Doctor</label>
                <select className="select" value={form.doctor} onChange={e => setForm(p => ({ ...p, doctor: e.target.value }))}>
                  <option value="">Select doctor...</option>
                  {doctors.map(d => <option key={d}>{d}</option>)}
                </select>
              </div>
              <div className="grid-2" style={{ gap: 14 }}>
                <div className="input-group">
                  <label className="input-label">Date</label>
                  <input className="input" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Time Slot</label>
                  <select className="select" value={form.time} onChange={e => setForm(p => ({ ...p, time: e.target.value }))}>
                    <option value="">Select time...</option>
                    {timeSlots.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Reason for Visit</label>
                <input className="input" placeholder="Routine checkup, Follow-up, etc." value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate}>Schedule</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
