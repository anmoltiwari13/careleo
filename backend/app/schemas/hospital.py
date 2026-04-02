from pydantic import BaseModel, EmailStr


class HospitalCreate(BaseModel):
    name: str
    domain: str | None = None
    logo: str | None = None
    description: str | None = None
    colors: str | None = None
    owner_name: str
    owner_email: EmailStr
    owner_password: str


class HospitalOut(BaseModel):
    id: int
    name: str
    domain: str | None

    class Config:
        from_attributes = True
