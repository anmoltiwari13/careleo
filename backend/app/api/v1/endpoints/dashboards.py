from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import role_guard
from app.core.database import get_db
from app.models.appointment import Appointment
from app.models.doctor import Doctor
from app.models.enums import AppointmentStatus
from app.models.enums import UserRole
from app.models.hospital import Hospital
from app.models.patient import Patient
from app.models.user import User

router = APIRouter(prefix="/dashboards", tags=["dashboards"])


@router.get("/careleo-admin", dependencies=[Depends(role_guard(UserRole.CARELEO_ADMIN))])
async def careleo_admin_metrics(db: AsyncSession = Depends(get_db)):
    hospitals = await db.scalar(select(func.count(Hospital.id)).where(Hospital.is_private_clinic.is_(False)))
    private_clinics = await db.scalar(
        select(func.count(func.distinct(Hospital.id)))
        .join(Doctor, Doctor.hospital_id == Hospital.id)
        .where(Hospital.is_private_clinic.is_(True))
    )
    doctors_hospitals = await db.scalar(
        select(func.count(Doctor.id)).join(Hospital, Hospital.id == Doctor.hospital_id).where(Hospital.is_private_clinic.is_(False))
    )
    doctors_private = await db.scalar(
        select(func.count(Doctor.id)).join(Hospital, Hospital.id == Doctor.hospital_id).where(Hospital.is_private_clinic.is_(True))
    )
    patients_hospitals = await db.scalar(
        select(func.count(Patient.id))
        .join(Doctor, Doctor.id == Patient.doctor_id)
        .join(Hospital, Hospital.id == Doctor.hospital_id)
        .where(Hospital.is_private_clinic.is_(False))
    )
    patients_private = await db.scalar(
        select(func.count(Patient.id))
        .join(Doctor, Doctor.id == Patient.doctor_id)
        .join(Hospital, Hospital.id == Doctor.hospital_id)
        .where(Hospital.is_private_clinic.is_(True))
    )
    appointments_pending = await db.scalar(select(func.count(Appointment.id)).where(Appointment.status == AppointmentStatus.PENDING))
    appointments_approved = await db.scalar(select(func.count(Appointment.id)).where(Appointment.status == AppointmentStatus.APPROVED))
    appointments_rejected = await db.scalar(select(func.count(Appointment.id)).where(Appointment.status == AppointmentStatus.REJECTED))

    return {
        "hospitals": hospitals or 0,
        "private_clinics": private_clinics or 0,
        "doctors": {
            "hospital": doctors_hospitals or 0,
            "private_clinic": doctors_private or 0,
            "total": (doctors_hospitals or 0) + (doctors_private or 0),
        },
        "patients": {
            "hospital": patients_hospitals or 0,
            "private_clinic": patients_private or 0,
            "total": (patients_hospitals or 0) + (patients_private or 0),
        },
        "appointments": {
            "pending": appointments_pending or 0,
            "approved": appointments_approved or 0,
            "rejected": appointments_rejected or 0,
            "total": (appointments_pending or 0) + (appointments_approved or 0) + (appointments_rejected or 0),
        },
    }


@router.get("/hospital-admin", dependencies=[Depends(role_guard(UserRole.HOSPITAL_ADMIN))])
async def hospital_admin_metrics(user: User = Depends(role_guard(UserRole.HOSPITAL_ADMIN)), db: AsyncSession = Depends(get_db)):
    doctors = await db.scalar(select(func.count(Doctor.id)).where(Doctor.hospital_id == user.hospital_id))
    return {"doctors": doctors or 0}


@router.get("/doctor", dependencies=[Depends(role_guard(UserRole.DOCTOR))])
async def doctor_metrics(user: User = Depends(role_guard(UserRole.DOCTOR)), db: AsyncSession = Depends(get_db)):
    patients = await db.scalar(select(func.count(Patient.id)).where(Patient.doctor_id == user.doctor_id))
    appointments = await db.scalar(select(func.count(Appointment.id)).where(Appointment.doctor_id == user.doctor_id))
    return {"patients": patients or 0, "appointments": appointments or 0}


@router.get("/patient", dependencies=[Depends(role_guard(UserRole.PATIENT))])
async def patient_metrics(user: User = Depends(role_guard(UserRole.PATIENT))):
    return {"message": f"Patient dashboard for user {user.id}"}
