from datetime import date

from pydantic import BaseModel, EmailStr

from app.schemas.patient_inventory import PatientInventoryUpsert


class DoctorPatientCreate(PatientInventoryUpsert):
    full_name: str
    email: EmailStr | None = None
    phone: str | None = None
    local_address: str | None = None
    pincode: str | None = None
    city: str | None = None
    state: str | None = None
    gender: str | None = None
    date_of_birth: date | None = None
