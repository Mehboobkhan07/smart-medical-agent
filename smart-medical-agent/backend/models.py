from pydantic import BaseModel
from typing import List, Optional

class Patient(BaseModel):
    id: Optional[str] = None
    name: str
    age: int
    gender: str
    blood_type: str
    allergies: List[str] = []
    conditions: List[str] = []
    phone: str
    email: str
    medications: List[str] = []

class Prescription(BaseModel):
    patient_id: str
    doctor: str
    date: str
    medicines: List[str]
    dosage: str
    duration: str
    status: str = "active"

class Medicine(BaseModel):
    id: Optional[str] = None
    name: str
    category: str
    stock: int
    min_stock: int
    price: float
    supplier: str
    expiry: str

class Appointment(BaseModel):
    patient_id: str
    doctor: str
    date: str
    time: str
    reason: str
    status: str = "scheduled"
