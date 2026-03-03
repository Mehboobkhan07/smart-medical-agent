import { useState, useEffect } from 'react';
import { getPatients, createPatient } from '../utils/api';

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', age: '', gender: 'Male', blood_type: 'A+', phone: '', email: '', allergies: '', conditions: '' });

  useEffect(() => {
    getPatients().then(r => { setPatients(r.data); setLoading(false); });
  }, []);

  const filtered = patients.filter(p => p.name?.toLowerCase().includes(search.toLowerCase()) || p.id?.includes(search));

  const handleCreate = async () => {
    try {
      const data = {
        ...form,
        age: parseInt(form.age),
        allergies: form.allergies ? form.allergies.split(',').map(s => s.trim()) : [],
        conditions: form.conditions ? form.conditions.split(',').map(s => s.trim()) : [],
        medications: [],
      };
      const res = await createPatient(data);
      setPatients(prev => [...prev, res.data]);
      setShowModal(false);
      setForm({ name: '', age: '', gender: 'Male', blood_type: 'A+', phone: '', email: '', allergies: '', conditions: '' });
    } catch (e) { alert('Error creating patient'); }
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <div className="section-title">Patient Records</div>
          <div className="section-sub">{patients.length} total patients</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Patient</button>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <input className="input" placeholder="🔍  Search by name or patient ID..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="card">
        {loading ? <div className="page-loader"><div className="spinner" /></div> : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Patient ID</th><th>Name</th><th>Age</th><th>Blood Type</th>
                  <th>Conditions</th><th>Allergies</th><th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => (
                  <tr key={p.id}>
                    <td><span style={{ fontFamily: 'JetBrains Mono', color: '#0ea5e9', fontSize: 12 }}>{p.id}</span></td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(14,165,233,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#0ea5e9', fontWeight: 700 }}>
                          {p.name?.[0]}
                        </div>
                        <div>
                          <div style={{ color: '#e2e8f0', fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: '#4a5568' }}>{p.gender}</div>
                        </div>
                      </div>
                    </td>
                    <td>{p.age} yrs</td>
                    <td><span className="badge badge-blue">{p.blood_type}</span></td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {(p.conditions || []).slice(0, 2).map((c, i) => <span key={i} className="badge badge-violet" style={{ fontSize: 10 }}>{c}</span>)}
                        {(p.conditions || []).length > 2 && <span style={{ fontSize: 10, color: '#64748b' }}>+{p.conditions.length - 2}</span>}
                      </div>
                    </td>
                    <td>
                      {(p.allergies || []).length === 0
                        ? <span style={{ color: '#4a5568', fontSize: 12 }}>None</span>
                        : (p.allergies || []).map((a, i) => <span key={i} className="badge badge-red" style={{ fontSize: 10, marginRight: 3 }}>⚠️ {a}</span>)
                      }
                    </td>
                    <td><span className="badge badge-green">Active</span></td>
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
              <div className="modal-title">👤 Register New Patient</div>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="grid-2" style={{ gap: 14 }}>
              {[
                { key: 'name', label: 'Full Name', type: 'text', placeholder: 'Arjun Sharma' },
                { key: 'age', label: 'Age', type: 'number', placeholder: '35' },
                { key: 'phone', label: 'Phone', type: 'text', placeholder: '+91-9876543210' },
                { key: 'email', label: 'Email', type: 'email', placeholder: 'patient@example.com' },
              ].map(f => (
                <div key={f.key} className="input-group">
                  <label className="input-label">{f.label}</label>
                  <input className="input" type={f.type} placeholder={f.placeholder} value={form[f.key]} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div className="input-group">
                <label className="input-label">Gender</label>
                <select className="select" value={form.gender} onChange={e => setForm(p => ({ ...p, gender: e.target.value }))}>
                  <option>Male</option><option>Female</option><option>Other</option>
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Blood Type</label>
                <select className="select" value={form.blood_type} onChange={e => setForm(p => ({ ...p, blood_type: e.target.value }))}>
                  {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(bt => <option key={bt}>{bt}</option>)}
                </select>
              </div>
            </div>
            <div className="input-group" style={{ marginTop: 14 }}>
              <label className="input-label">Medical Conditions (comma-separated)</label>
              <input className="input" placeholder="Diabetes, Hypertension" value={form.conditions} onChange={e => setForm(p => ({ ...p, conditions: e.target.value }))} />
            </div>
            <div className="input-group" style={{ marginTop: 14 }}>
              <label className="input-label">Allergies (comma-separated)</label>
              <input className="input" placeholder="Penicillin, Sulfa" value={form.allergies} onChange={e => setForm(p => ({ ...p, allergies: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreate}>Register Patient</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
