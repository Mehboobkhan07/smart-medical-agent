from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
from agents import MedicalAgent
from database import db
from models import Patient, Prescription, Medicine, Appointment

app = FastAPI(title="Smart Medical AI Agent", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

medical_agent = MedicalAgent()

# ── Chat ──────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    patient_id: Optional[str] = None
    session_id: Optional[str] = "default"

class ChatResponse(BaseModel):
    response: str
    agent_type: str
    actions_taken: List[str]
    data: Optional[dict] = None

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    result = await medical_agent.process(request.message, request.patient_id, request.session_id)
    return result

# ── Patients ──────────────────────────────────────────────────────────────────
@app.get("/api/patients")
async def get_patients():
    return db.get_all_patients()

@app.get("/api/patients/{patient_id}")
async def get_patient(patient_id: str):
    patient = db.get_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient

@app.post("/api/patients")
async def create_patient(patient: Patient):
    return db.create_patient(patient.dict())

# ── Prescriptions ─────────────────────────────────────────────────────────────
@app.get("/api/prescriptions")
async def get_prescriptions():
    return db.get_all_prescriptions()

@app.post("/api/prescriptions")
async def create_prescription(prescription: Prescription):
    result = await medical_agent.validate_prescription(prescription.dict())
    if result["is_safe"]:
        saved = db.create_prescription(prescription.dict())
        return {"prescription": saved, "validation": result}
    raise HTTPException(status_code=400, detail=result["warnings"])

@app.get("/api/prescriptions/{patient_id}")
async def get_patient_prescriptions(patient_id: str):
    return db.get_prescriptions_by_patient(patient_id)

# ── Medicines / Inventory ─────────────────────────────────────────────────────
@app.get("/api/medicines")
async def get_medicines():
    return db.get_all_medicines()

@app.post("/api/medicines")
async def add_medicine(medicine: Medicine):
    return db.add_medicine(medicine.dict())

@app.put("/api/medicines/{medicine_id}/stock")
async def update_stock(medicine_id: str, quantity: int):
    return db.update_stock(medicine_id, quantity)

@app.get("/api/inventory/alerts")
async def get_inventory_alerts():
    return await medical_agent.check_inventory_alerts()

# ── Appointments ──────────────────────────────────────────────────────────────
@app.get("/api/appointments")
async def get_appointments():
    return db.get_all_appointments()

@app.post("/api/appointments")
async def create_appointment(appointment: Appointment):
    return db.create_appointment(appointment.dict())

# ── Analytics ─────────────────────────────────────────────────────────────────
@app.get("/api/analytics/dashboard")
async def get_dashboard():
    return {
        "total_patients": len(db.get_all_patients()),
        "total_prescriptions": len(db.get_all_prescriptions()),
        "low_stock_medicines": len([m for m in db.get_all_medicines() if m["stock"] < m["min_stock"]]),
        "today_appointments": len(db.get_today_appointments()),
        "recent_activity": db.get_recent_activity(),
        "medicine_stats": db.get_medicine_stats(),
        "patient_trends": db.get_patient_trends(),
    }

@app.get("/api/analytics/drug-interactions/{medicine1}/{medicine2}")
async def check_drug_interaction(medicine1: str, medicine2: str):
    return await medical_agent.check_drug_interactions(medicine1, medicine2)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
