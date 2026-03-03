import axios from 'axios';

const API = axios.create({ 
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/api' 
});

export const chatApi = (msg, patientId, sessionId) =>
  API.post('/chat', { message: msg, patient_id: patientId, session_id: sessionId });

export const getDashboard = () => API.get('/analytics/dashboard');
export const getPatients = () => API.get('/patients');
export const createPatient = (data) => API.post('/patients', data);
export const getPrescriptions = () => API.get('/prescriptions');
export const createPrescription = (data) => API.post('/prescriptions', data);
export const getMedicines = () => API.get('/medicines');
export const addMedicine = (data) => API.post('/medicines', data);
export const updateStock = (id, qty) => API.put(`/medicines/${id}/stock`, null, { params: { quantity: qty } });
export const getInventoryAlerts = () => API.get('/inventory/alerts');
export const getAppointments = () => API.get('/appointments');
export const createAppointment = (data) => API.post('/appointments', data);
export const checkDrugInteraction = (d1, d2) => API.get(`/analytics/drug-interactions/${d1}/${d2}`);
