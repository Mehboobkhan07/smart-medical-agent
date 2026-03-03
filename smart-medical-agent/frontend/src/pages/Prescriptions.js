import { useState, useEffect } from 'react';
import { getPrescriptions, createPrescription, getPatients } from '../utils/api';

export default function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ patient_id: '', doctor: '', date: '', medicines: '', dosage: '', duration: '' });
  const [validating, setValidating] = useState(false);

  useEffect(() => {
    Promise.all([getPrescriptions(), getPatients()]).then(([rx, pt]) => {
      setPrescriptions(rx.data);
      setPatients(pt.data);
      setLoading(false);
    });
  }, []);

  const handleCreate = async () => {
    setValidating(true);
    try {
      const data = { ...form, medicines: form.medicines.split(',').map(s => s.trim()) };
      const res = await createPrescription(data);
      setPrescriptions(prev => [...prev, res.data.prescription || res.data]);
      setShowModal(false);
    } catch (e) {
      const msg = e.response?.data?.detail;
      alert(typeof msg === 'string' ? `⚠️ Safety Check Failed:\n${msg}` : '⚠️ Prescription could not be saved');
    }
    setValidating(false);
  };

  const getPatientName = (id) => patients.find(p => p.id === id)?.name || id;

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Prescription Management</div>
          <div className="section-sub">AI-validated prescriptions with drug interaction checks</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Prescription</button>
      </div>

      <div className="alert-card alert-info" style={{ marginBottom: 20, borderRadius: 10 }}>
        <span style={{ fontSize: 20 }}>🤖</span>
        <div style={{ fontSize: 13, color: '#38bdf8' }}>
          <strong>AI Safety Check Active:</strong> All prescriptions are automatically validated for drug interactions before being saved.
        </div>
      </div>

      <div className="card">
        {loading ? <div className="page-loader"><div className="spinner" /></div> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Rx ID</th><th>Patient</th><th>Doctor</th><th>Medicines</th><th>Duration</th><th>Date</th><th>Status</th></tr>
              </thead>
              <tbody>
                {prescriptions.map(rx => (
                  <tr key={rx.id}>
                    <td><span style={{ fontFamily: 'JetBrains Mono', color: '#10b981', fontSize: 12 }}>{rx.id}</span></td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#e2e8f0', fontSize: 13 }}>{getPatientName(rx.patient_id)}</div>
                      <div style={{ fontSize: 11, color: '#4a5568' }}>{rx.patient_id}</div>
                    </td>
                    <td style={{ color: '#94a3b8', fontSize: 13 }}>{rx.doctor}</td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(rx.medicines || []).map((m, i) => <span key={i} className="badge badge-blue" style={{ fontSize: 10 }}>{m}</span>)}
                      </div>
                    </td>
                    <td style={{ fontSize: 13 }}>{rx.duration}</td>
                    <td style={{ fontSize: 12, color: '#64748b' }}>{rx.date}</td>
                    <td><span className={`badge ${rx.status === 'active' ? 'badge-green' : 'badge-amber'}`}>{rx.status}</span></td>
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
              <div className="modal-title">💊 New Prescription</div>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div style={{ background: 'rgba(14,165,233,0.05)', border: '1px solid rgba(14,165,233,0.15)', borderRadius: 8, padding: '10px 14px', marginBottom: 18, fontSize: 12, color: '#38bdf8' }}>
              🤖 AI will automatically validate drug interactions before saving
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="input-group">
                <label className="input-label">Patient</label>
                <select className="select" value={form.patient_id} onChange={e => setForm(p => ({ ...p, patient_id: e.target.value }))}>
                  <option value="">Select patient...</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}
                </select>
              </div>
              <div className="grid-2" style={{ gap: 14 }}>
                <div className="input-group">
                  <label className="input-label">Doctor</label>
                  <input className="input" placeholder="Dr. Mehta" value={form.doctor} onChange={e => setForm(p => ({ ...p, doctor: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Date</label>
                  <input className="input" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} />
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">Medicines (comma-separated)</label>
                <input className="input" placeholder="Metformin 500mg, Lisinopril 10mg" value={form.medicines} onChange={e => setForm(p => ({ ...p, medicines: e.target.value }))} />
              </div>
              <div className="grid-2" style={{ gap: 14 }}>
                <div className="input-group">
                  <label className="input-label">Dosage Instructions</label>
                  <input className="input" placeholder="Twice daily after meals" value={form.dosage} onChange={e => setForm(p => ({ ...p, dosage: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="input-label">Duration</label>
                  <input className="input" placeholder="30 days" value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} />
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate} disabled={validating}>
                {validating ? '🔍 Validating...' : '✓ Validate & Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
