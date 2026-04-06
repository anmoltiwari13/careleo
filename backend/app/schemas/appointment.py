from datetime import date, datetime

from pydantic import BaseModel, EmailStr


class AppointmentCreate(BaseModel):
    patient_name: str
    patient_email: EmailStr
    patient_phone: str | None = None
    patient_gender: str | None = None
    patient_date_of_birth: date | None = None
    patient_local_address: str | None = None
    patient_pincode: str | None = None
    patient_city: str | None = None
    patient_state: str | None = None
    time: datetime
    notes: str | None = None


class AppointmentDecision(BaseModel):
    status: str
    notes: str | None = None


class AppointmentOut(BaseModel):
    id: int
    doctor_id: int
    patient_id: int
    patient_name: str
    patient_email: EmailStr
    time: datetime
    status: str
    notes: str | None
    medical_files: list[str] | None = None
    consultation_mode: str | None = None
    teleconsultation_link: str | None = None
    follow_up_date: datetime | None = None
    reminder_channel: str | None = None
    fee_amount: str | None = None
    receipt_number: str | None = None
    payment_status: str | None = None
    payment_notes: str | None = None
    created_at: datetime


class AppointmentDetailUpdate(BaseModel):
    consultation_mode: str | None = None
    teleconsultation_link: str | None = None
    follow_up_date: datetime | None = None
    reminder_channel: str | None = None
    fee_amount: str | None = None
    receipt_number: str | None = None
    payment_status: str | None = None
    payment_notes: str | None = None


class FollowUpBookingCreate(BaseModel):
    time: datetime
    notes: str | None = None
    consultation_mode: str | None = None
    teleconsultation_link: str | None = None
    reminder_channel: str | None = None
    fee_amount: str | None = None
    receipt_number: str | None = None
    payment_status: str | None = None
    payment_notes: str | None = None
