from datetime import date, datetime

from pydantic import BaseModel


class PatientInventoryUpsert(BaseModel):
    religion: str | None = None
    diagnosis: str | None = None
    investigation: str | None = None
    investigation_date: date | None = None
    finding: str | None = None
    finding_date: date | None = None
    prescription: str | None = None
    special_instruction: str | None = None
    family_history: str | None = None
    past_medication_history: str | None = None
    surgical_history: str | None = None
    presenting_complaints: str | None = None


class PatientInventoryOut(PatientInventoryUpsert):
    id: int
    doctor_id: int
    patient_id: int
    created_at: datetime
    updated_at: datetime
