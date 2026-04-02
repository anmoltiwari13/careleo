from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import role_guard
from app.core.database import get_db
from app.models.doctor import Doctor
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.doctor import DoctorCreate, DoctorOut
from app.services.login_code import generate_login_code

router = APIRouter(prefix="/hospitals", tags=["hospitals"])


@router.post("/doctors", response_model=DoctorOut, dependencies=[Depends(role_guard(UserRole.CARELEO_ADMIN, UserRole.HOSPITAL_ADMIN))])
async def create_doctor(payload: DoctorCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(role_guard(UserRole.CARELEO_ADMIN, UserRole.HOSPITAL_ADMIN))):
    hospital_id = current_user.hospital_id if current_user.role == UserRole.HOSPITAL_ADMIN else payload.hospital_id
    doctor = Doctor(hospital_id=hospital_id, specialization=payload.specialization, bio=payload.bio, availability=payload.availability)
    db.add(doctor)
    await db.flush()

    user = User(
        email=f"doctor{doctor.id}@careleo.local",
        role=UserRole.DOCTOR,
        password_hash="$2b$12$Y7nTqvBk8t1LkvLlvUT9j.G8G3lYhr6UAn8rQ8ft0s6ZzC0sW03Ei",  # ChangeMe123!
        hospital_id=hospital_id,
        doctor_id=doctor.id,
        login_code=generate_login_code("DOC"),
    )
    db.add(user)
    await db.commit()
    await db.refresh(doctor)
    return doctor


@router.get("/my-doctors", response_model=list[DoctorOut], dependencies=[Depends(role_guard(UserRole.CARELEO_ADMIN, UserRole.HOSPITAL_ADMIN))])
async def my_doctors(request: Request, db: AsyncSession = Depends(get_db), user: User = Depends(role_guard(UserRole.CARELEO_ADMIN, UserRole.HOSPITAL_ADMIN))):
    tenant_hospital_id = getattr(request.state, "tenant_hospital_id", None)
    hospital_id = user.hospital_id or tenant_hospital_id
    rows = await db.scalars(select(Doctor).where(Doctor.hospital_id == hospital_id).order_by(Doctor.id.desc()))
    return list(rows)
