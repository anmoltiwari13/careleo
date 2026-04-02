from pydantic import BaseModel, EmailStr


class DoctorCreate(BaseModel):
    hospital_id: int
    specialization: str
    bio: str | None = None
    availability: str | None = None


class DoctorOut(BaseModel):
    id: int
    hospital_id: int
    specialization: str
    bio: str | None
    availability: str | None

    class Config:
        from_attributes = True


class PrivateClinicDoctorTenantCreate(BaseModel):
    clinic_name: str
    doctor_name: str
    doctor_email: EmailStr
    specialization: str
    domain: str | None = None
    clinic_logo: str | None = None
    bio: str | None = None
    availability: str | None = None
    clinic_description: str | None = None
    doctor_password: str


class PrivateClinicDoctorTenantOut(BaseModel):
    hospital_id: int
    doctor_id: int
    doctor_email: EmailStr
    doctor_login_code: str
    doctor_password: str
    domain: str | None
    public_url: str
    setup_url: str


class AdminDoctorOut(BaseModel):
    doctor_id: int
    hospital_id: int
    hospital_name: str
    doctor_email: EmailStr | None = None
    specialization: str
    availability: str | None = None
