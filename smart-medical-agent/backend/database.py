import uuid
from datetime import datetime, date, timedelta
import random

class Database:
    def __init__(self):
        self.patients = {}
        self.prescriptions = {}
        self.medicines = {}
        self.appointments = {}
        self.activity_log = []
        self._seed_data()

    def _seed_data(self):
        # Seed Patients
        patients_data = [
            {"id": "P001", "name": "Arjun Sharma", "age": 45, "gender": "Male", "blood_type": "A+",
             "allergies": ["Penicillin"], "conditions": ["Hypertension", "Diabetes Type 2"],
             "phone": "+91-9876543210", "email": "arjun@example.com",
             "medications": ["Metformin", "Lisinopril"], "last_visit": "2024-01-15"},
            {"id": "P002", "name": "Priya Patel", "age": 32, "gender": "Female", "blood_type": "B+",
             "allergies": [], "conditions": ["Asthma"],
             "phone": "+91-9876543211", "email": "priya@example.com",
             "medications": ["Salbutamol"], "last_visit": "2024-01-20"},
            {"id": "P003", "name": "Rahul Verma", "age": 58, "gender": "Male", "blood_type": "O+",
             "allergies": ["Sulfa drugs"], "conditions": ["Heart Disease", "Hypertension"],
             "phone": "+91-9876543212", "email": "rahul@example.com",
             "medications": ["Warfarin", "Atorvastatin"], "last_visit": "2024-01-10"},
            {"id": "P004", "name": "Sneha Gupta", "age": 28, "gender": "Female", "blood_type": "AB+",
             "allergies": ["Latex"], "conditions": ["Anxiety", "Hypothyroidism"],
             "phone": "+91-9876543213", "email": "sneha@example.com",
             "medications": ["Levothyroxine", "Sertraline"], "last_visit": "2024-01-22"},
            {"id": "P005", "name": "Vikram Singh", "age": 67, "gender": "Male", "blood_type": "A-",
             "allergies": ["Aspirin"], "conditions": ["COPD", "Diabetes Type 2"],
             "phone": "+91-9876543214", "email": "vikram@example.com",
             "medications": ["Metformin", "Tiotropium"], "last_visit": "2024-01-08"},
        ]
        for p in patients_data:
            self.patients[p["id"]] = p

        # Seed Medicines
        medicines_data = [
            {"id": "M001", "name": "Metformin 500mg", "category": "Antidiabetic", "stock": 450, "min_stock": 100, "price": 12.50, "supplier": "Sun Pharma", "expiry": "2025-12-31"},
            {"id": "M002", "name": "Lisinopril 10mg", "category": "ACE Inhibitor", "stock": 30, "min_stock": 50, "price": 18.00, "supplier": "Cipla", "expiry": "2025-08-31"},
            {"id": "M003", "name": "Warfarin 5mg", "category": "Anticoagulant", "stock": 85, "min_stock": 80, "price": 25.00, "supplier": "Zydus", "expiry": "2025-06-30"},
            {"id": "M004", "name": "Atorvastatin 20mg", "category": "Statin", "stock": 200, "min_stock": 60, "price": 32.00, "supplier": "Ranbaxy", "expiry": "2026-01-31"},
            {"id": "M005", "name": "Salbutamol Inhaler", "category": "Bronchodilator", "stock": 15, "min_stock": 30, "price": 145.00, "supplier": "GSK", "expiry": "2025-09-30"},
            {"id": "M006", "name": "Levothyroxine 50mcg", "category": "Thyroid", "stock": 320, "min_stock": 70, "price": 22.00, "supplier": "Abbott", "expiry": "2025-11-30"},
            {"id": "M007", "name": "Sertraline 50mg", "category": "SSRI Antidepressant", "stock": 0, "min_stock": 40, "price": 55.00, "supplier": "Pfizer", "expiry": "2025-10-31"},
            {"id": "M008", "name": "Amoxicillin 500mg", "category": "Antibiotic", "stock": 180, "min_stock": 80, "price": 8.50, "supplier": "Cipla", "expiry": "2025-07-31"},
            {"id": "M009", "name": "Omeprazole 20mg", "category": "PPI", "stock": 560, "min_stock": 100, "price": 9.00, "supplier": "Sun Pharma", "expiry": "2026-03-31"},
            {"id": "M010", "name": "Paracetamol 500mg", "category": "Analgesic", "stock": 25, "min_stock": 200, "price": 3.50, "supplier": "Generic", "expiry": "2026-06-30"},
        ]
        for m in medicines_data:
            self.medicines[m["id"]] = m

        # Seed Prescriptions
        prescriptions_data = [
            {"id": "RX001", "patient_id": "P001", "doctor": "Dr. Mehta", "date": "2024-01-15",
             "medicines": ["Metformin 500mg", "Lisinopril 10mg"], "dosage": "Twice daily", "duration": "30 days", "status": "active"},
            {"id": "RX002", "patient_id": "P003", "doctor": "Dr. Kapoor", "date": "2024-01-10",
             "medicines": ["Warfarin 5mg", "Atorvastatin 20mg"], "dosage": "Once daily", "duration": "90 days", "status": "active"},
            {"id": "RX003", "patient_id": "P002", "doctor": "Dr. Sharma", "date": "2024-01-20",
             "medicines": ["Salbutamol Inhaler"], "dosage": "As needed", "duration": "60 days", "status": "active"},
        ]
        for rx in prescriptions_data:
            self.prescriptions[rx["id"]] = rx

        # Seed Appointments
        today = date.today()
        appointments_data = [
            {"id": "A001", "patient_id": "P001", "doctor": "Dr. Mehta", "date": str(today), "time": "10:00", "reason": "Diabetes checkup", "status": "scheduled"},
            {"id": "A002", "patient_id": "P002", "doctor": "Dr. Sharma", "date": str(today), "time": "11:30", "reason": "Asthma followup", "status": "scheduled"},
            {"id": "A003", "patient_id": "P003", "doctor": "Dr. Kapoor", "date": str(today + timedelta(days=1)), "time": "09:00", "reason": "Heart checkup", "status": "scheduled"},
            {"id": "A004", "patient_id": "P004", "doctor": "Dr. Reddy", "date": str(today + timedelta(days=2)), "time": "14:00", "reason": "Thyroid test review", "status": "scheduled"},
        ]
        for a in appointments_data:
            self.appointments[a["id"]] = a

        # Seed Activity
        activities = [
            {"type": "prescription", "message": "New prescription for Arjun Sharma", "time": "10 min ago"},
            {"type": "alert", "message": "Low stock alert: Salbutamol Inhaler", "time": "25 min ago"},
            {"type": "appointment", "message": "Appointment scheduled for Priya Patel", "time": "1 hr ago"},
            {"type": "patient", "message": "New patient Sneha Gupta registered", "time": "2 hrs ago"},
            {"type": "alert", "message": "Out of stock: Sertraline 50mg", "time": "3 hrs ago"},
        ]
        self.activity_log = activities

    #  Patient CRUD 
    def get_all_patients(self):
        return list(self.patients.values())

    def get_patient(self, patient_id: str):
        return self.patients.get(patient_id)

    def create_patient(self, patient_data: dict):
        pid = patient_data.get("id") or f"P{str(uuid.uuid4())[:6].upper()}"
        patient_data["id"] = pid
        self.patients[pid] = patient_data
        self.activity_log.insert(0, {"type": "patient", "message": f"New patient {patient_data.get('name')} registered", "time": "just now"})
        return patient_data

    #  Prescription CRUD 
    def get_all_prescriptions(self):
        return list(self.prescriptions.values())

    def get_prescriptions_by_patient(self, patient_id: str):
        return [rx for rx in self.prescriptions.values() if rx["patient_id"] == patient_id]

    def create_prescription(self, rx_data: dict):
        rid = f"RX{str(uuid.uuid4())[:6].upper()}"
        rx_data["id"] = rid
        self.prescriptions[rid] = rx_data
        patient = self.get_patient(rx_data.get("patient_id", ""))
        name = patient["name"] if patient else "Unknown"
        self.activity_log.insert(0, {"type": "prescription", "message": f"New prescription for {name}", "time": "just now"})
        return rx_data

    #  Medicine CRUD 
    def get_all_medicines(self):
        return list(self.medicines.values())

    def add_medicine(self, med_data: dict):
        mid = med_data.get("id") or f"M{str(uuid.uuid4())[:6].upper()}"
        med_data["id"] = mid
        self.medicines[mid] = med_data
        return med_data

    def update_stock(self, medicine_id: str, quantity: int):
        if medicine_id in self.medicines:
            self.medicines[medicine_id]["stock"] = quantity
            return self.medicines[medicine_id]
        return None

    # Appointment CRUD 
    def get_all_appointments(self):
        return list(self.appointments.values())

    def create_appointment(self, appt_data: dict):
        aid = f"A{str(uuid.uuid4())[:6].upper()}"
        appt_data["id"] = aid
        self.appointments[aid] = appt_data
        patient = self.get_patient(appt_data.get("patient_id", ""))
        name = patient["name"] if patient else "Unknown"
        self.activity_log.insert(0, {"type": "appointment", "message": f"Appointment for {name}", "time": "just now"})
        return appt_data

    def get_today_appointments(self):
        today = str(date.today())
        return [a for a in self.appointments.values() if a.get("date") == today]

    # Analytics
    def get_recent_activity(self):
        return self.activity_log[:10]

    def get_medicine_stats(self):
        meds = list(self.medicines.values())
        categories = {}
        for m in meds:
            cat = m["category"]
            categories[cat] = categories.get(cat, 0) + 1
        return [{"category": k, "count": v} for k, v in categories.items()]

    def get_patient_trends(self):
        return [
            {"month": "Aug", "patients": 42},
            {"month": "Sep", "patients": 58},
            {"month": "Oct", "patients": 51},
            {"month": "Nov", "patients": 67},
            {"month": "Dec", "patients": 73},
            {"month": "Jan", "patients": 89},
        ]

db = Database()
