from datetime import date, datetime

from pydantic import BaseModel, EmailStr


class PatientSignupRequest(BaseModel):
    doctor_id: int
    full_name: str
    email: EmailStr
    password: str
    phone: str | None = None
    local_address: str | None = None
    pincode: str | None = None
    city: str | None = None
    state: str | None = None
    gender: str | None = None
    date_of_birth: date | None = None


class PatientProfileOut(BaseModel):
    id: int
    doctor_id: int
    full_name: str
    email: EmailStr
    phone: str | None
    address: str | None
    local_address: str | None
    pincode: str | None
    city: str | None
    state: str | None
    gender: str | None
    date_of_birth: date | None


class PatientProfileUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    local_address: str | None = None
    pincode: str | None = None
    city: str | None = None
    state: str | None = None
    gender: str | None = None
    date_of_birth: date | None = None


class PatientAppointmentCreate(BaseModel):
    doctor_id: int
    patient_name: str | None = None
    time: datetime
    notes: str | None = None
    medical_files: list[str] | None = None


class PatientAppointmentOut(BaseModel):
    id: int
    doctor_id: int
    time: datetime
    status: str
    notes: str | None
    medical_files: list[str] | None = None
    created_at: datetime
