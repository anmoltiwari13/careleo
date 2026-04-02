from pydantic import BaseModel, EmailStr


class UserOut(BaseModel):
    id: int
    full_name: str | None = None
    email: EmailStr
    role: str
    hospital_id: int | None
    doctor_id: int | None
    patient_id: int | None = None
