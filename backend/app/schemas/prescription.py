from datetime import date, datetime

from pydantic import BaseModel


class PrescriptionCreate(BaseModel):
    diagnosis: str
    drug_names: list[str]
    instructions: str | None = None
    start_date: date | None = None
    end_date: date | None = None
    printable_notes: str | None = None


class PrescriptionOut(BaseModel):
    id: int
    doctor_id: int
    patient_id: int
    appointment_id: int
    diagnosis: str
    drug_names: list[str]
    instructions: str | None
    start_date: date | None
    end_date: date | None
    printable_notes: str | None
    created_at: datetime
