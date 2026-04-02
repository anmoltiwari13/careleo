import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import role_guard
from app.core.config import settings
from app.core.database import get_db
from app.core.security import hash_password
from app.models.appointment import Appointment
from app.models.branding import BrandingConfig
from app.models.doctor import Doctor
from app.models.domain import Domain
from app.models.enums import AppointmentStatus, UserRole
from app.models.hospital import Hospital
from app.models.patient import Patient
from app.models.user import User
from app.schemas.branding import BrandingConfigUpdate
from app.schemas.doctor import AdminDoctorOut, PrivateClinicDoctorTenantCreate, PrivateClinicDoctorTenantOut
from app.schemas.hospital import HospitalCreate, HospitalOut
from app.services.login_code import generate_login_code

router = APIRouter(prefix="/admin", tags=["admin"])


def parse_medical_files(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [str(item) for item in parsed]
        return []
    except json.JSONDecodeError:
        return []


@router.post("/hospitals", response_model=HospitalOut, dependencies=[Depends(role_guard(UserRole.CARELEO_ADMIN))])
async def create_hospital(payload: HospitalCreate, db: AsyncSession = Depends(get_db)):
    try:
        hospital = Hospital(name=payload.name, domain=payload.domain, is_private_clinic=False)
        db.add(hospital)
        await db.flush()

        db.add(
            BrandingConfig(
                hospital_id=hospital.id,
                logo=payload.logo,
                colors=payload.colors,
                description=payload.description or f"Welcome to {payload.name}",
            )
        )
        if payload.domain:
            db.add(Domain(hospital_id=hospital.id, domain_name=payload.domain))

        db.add(
            User(
                full_name=payload.owner_name,
                email=payload.owner_email,
                role=UserRole.HOSPITAL_ADMIN,
                password_hash=hash_password(payload.owner_password),
                hospital_id=hospital.id,
                login_code=None,
            )
        )

        await db.commit()
        await db.refresh(hospital)
        return hospital
    except IntegrityError as exc:
        await db.rollback()
        msg = str(getattr(exc, "orig", exc))
        if "hospitals_name_key" in msg:
            detail = "Hospital name already exists."
        elif "domains_domain_name_key" in msg or "hospitals_domain_key" in msg:
            detail = "Hospital domain already exists."
        elif "users_email_key" in msg:
            detail = "Owner email already exists."
        else:
            detail = "Unable to create hospital. Please check unique fields."
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


@router.get("/hospitals", response_model=list[HospitalOut], dependencies=[Depends(role_guard(UserRole.CARELEO_ADMIN))])
async def list_hospitals(db: AsyncSession = Depends(get_db)):
    rows = await db.scalars(select(Hospital).where(Hospital.is_private_clinic.is_(False)).order_by(Hospital.id.desc()))
    return list(rows)


@router.delete("/hospitals/{hospital_id}", dependencies=[Depends(role_guard(UserRole.CARELEO_ADMIN))])
async def delete_hospital(hospital_id: int, db: AsyncSession = Depends(get_db)):
    hospital = await db.scalar(select(Hospital).where(Hospital.id == hospital_id))
    if hospital is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found")
    await db.delete(hospital)
    await db.commit()
    return {"status": "deleted"}


@router.patch(
    "/hospitals/{hospital_id}/branding",
    dependencies=[Depends(role_guard(UserRole.CARELEO_ADMIN, UserRole.HOSPITAL_ADMIN))],
)
async def update_branding(hospital_id: int, payload: BrandingConfigUpdate, db: AsyncSession = Depends(get_db)):
    branding = await db.scalar(select(BrandingConfig).where(BrandingConfig.hospital_id == hospital_id))
    if branding is None:
        branding = BrandingConfig(hospital_id=hospital_id)
        db.add(branding)

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(branding, field, value)

    await db.commit()
    return {"status": "ok"}


@router.post(
    "/private-clinic-doctors",
    response_model=PrivateClinicDoctorTenantOut,
    dependencies=[Depends(role_guard(UserRole.CARELEO_ADMIN))],
)
async def create_private_clinic_doctor_tenant(payload: PrivateClinicDoctorTenantCreate, db: AsyncSession = Depends(get_db)):
    doctor_password = payload.doctor_password
    doctor_login_code = generate_login_code("DOC")

    try:
        hospital = Hospital(name=payload.clinic_name, domain=payload.domain, is_private_clinic=True)
        db.add(hospital)
        await db.flush()

        db.add(
            BrandingConfig(
                hospital_id=hospital.id,
                logo=payload.clinic_logo,
                description=payload.clinic_description or f"{payload.clinic_name} private clinic on Careleo",
            )
        )
        if payload.domain:
            db.add(Domain(hospital_id=hospital.id, domain_name=payload.domain))

        doctor = Doctor(
            hospital_id=hospital.id,
            specialization=payload.specialization,
            bio=payload.bio,
            availability=payload.availability,
        )
        db.add(doctor)
        await db.flush()

        db.add(
            User(
                full_name=payload.doctor_name,
                email=payload.doctor_email,
                role=UserRole.DOCTOR,
                password_hash=hash_password(doctor_password),
                hospital_id=hospital.id,
                doctor_id=doctor.id,
                login_code=doctor_login_code,
            )
        )
        await db.commit()
        public_url = f"https://{payload.domain}" if payload.domain else f"https://{hospital.name.lower().replace(' ', '-')}.{settings.base_domain}"
        setup_url = (
            f"{settings.frontend_base_url.rstrip('/')}/doctor-onboarding"
            f"?doctorId={doctor.id}&email={payload.doctor_email}&code={doctor_login_code}"
        )

        return PrivateClinicDoctorTenantOut(
            hospital_id=hospital.id,
            doctor_id=doctor.id,
            doctor_email=payload.doctor_email,
            doctor_login_code=doctor_login_code,
            doctor_password=doctor_password,
            domain=payload.domain,
            public_url=public_url,
            setup_url=setup_url,
        )
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Clinic name, domain, or doctor email already exists.")


@router.get("/doctors", response_model=list[AdminDoctorOut], dependencies=[Depends(role_guard(UserRole.CARELEO_ADMIN))])
async def list_doctors(db: AsyncSession = Depends(get_db)):
    rows = await db.execute(
        select(Doctor, Hospital, User)
        .join(Hospital, Hospital.id == Doctor.hospital_id)
        .outerjoin(User, and_(User.doctor_id == Doctor.id, User.role == UserRole.DOCTOR))
        .order_by(Doctor.id.desc())
    )
    return [
        AdminDoctorOut(
            doctor_id=doctor.id,
            hospital_id=hospital.id,
            hospital_name=hospital.name,
            doctor_email=getattr(user, "email", None),
            specialization=doctor.specialization,
            availability=doctor.availability,
        )
        for doctor, hospital, user in rows.all()
    ]


@router.delete("/doctors/{doctor_id}", dependencies=[Depends(role_guard(UserRole.CARELEO_ADMIN))])
async def delete_doctor(doctor_id: int, db: AsyncSession = Depends(get_db)):
    doctor = await db.scalar(select(Doctor).where(Doctor.id == doctor_id))
    if doctor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    hospital = await db.scalar(select(Hospital).where(Hospital.id == doctor.hospital_id))
    await db.execute(delete(User).where(User.doctor_id == doctor_id))
    await db.delete(doctor)

    # For private-clinic tenants, deleting the doctor should remove the clinic tenant too
    # once no doctors are left under that tenant.
    if hospital and hospital.is_private_clinic:
        remaining = await db.scalar(select(Doctor.id).where(Doctor.hospital_id == hospital.id).limit(1))
        if remaining is None:
            await db.delete(hospital)

    await db.commit()
    return {"status": "deleted"}


@router.get("/patients", dependencies=[Depends(role_guard(UserRole.CARELEO_ADMIN))])
async def list_patients(db: AsyncSession = Depends(get_db)):
    rows = await db.execute(
        select(Patient, Doctor, Hospital)
        .join(Doctor, Doctor.id == Patient.doctor_id)
        .join(Hospital, Hospital.id == Doctor.hospital_id)
        .order_by(Patient.id.desc())
    )
    return [
        {
            "id": patient.id,
            "full_name": patient.full_name,
            "email": patient.email,
            "phone": patient.phone,
            "address": patient.address,
            "local_address": patient.local_address,
            "pincode": patient.pincode,
            "city": patient.city,
            "state": patient.state,
            "gender": patient.gender,
            "date_of_birth": patient.date_of_birth.isoformat() if patient.date_of_birth else None,
            "doctor_id": doctor.id,
            "doctor_specialization": doctor.specialization,
            "hospital_id": hospital.id,
            "hospital_name": hospital.name,
            "tenant_type": "private_clinic" if hospital.is_private_clinic else "hospital",
        }
        for patient, doctor, hospital in rows.all()
    ]


@router.get("/doctors/{doctor_id}/appointments", dependencies=[Depends(role_guard(UserRole.CARELEO_ADMIN))])
async def list_doctor_appointments(doctor_id: int, db: AsyncSession = Depends(get_db)):
    doctor = await db.scalar(select(Doctor).where(Doctor.id == doctor_id))
    if doctor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    rows = await db.execute(
        select(Appointment, Patient)
        .join(Patient, Patient.id == Appointment.patient_id)
        .where(Appointment.doctor_id == doctor_id)
        .order_by(Appointment.time.desc())
    )
    return [
        {
            "id": appointment.id,
            "doctor_id": appointment.doctor_id,
            "patient_id": appointment.patient_id,
            "patient_name": appointment.patient_name_snapshot or patient.full_name,
            "patient_email": appointment.patient_email_snapshot or patient.email,
            "time": appointment.time,
            "status": appointment.status.value,
            "notes": appointment.notes,
            "medical_files": parse_medical_files(appointment.medical_files),
            "created_at": appointment.created_at,
        }
        for appointment, patient in rows.all()
    ]


@router.patch("/doctors/{doctor_id}/appointments/{appointment_id}", dependencies=[Depends(role_guard(UserRole.CARELEO_ADMIN))])
async def decide_doctor_appointment(doctor_id: int, appointment_id: int, payload: dict, db: AsyncSession = Depends(get_db)):
    requested = str(payload.get("status", "")).strip().lower()
    if requested not in {"approved", "rejected", "pending"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Status must be approved, rejected, or pending")

    appointment = await db.scalar(
        select(Appointment).where(Appointment.id == appointment_id, Appointment.doctor_id == doctor_id)
    )
    if appointment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    appointment.status = AppointmentStatus(requested)
    if "notes" in payload:
        appointment.notes = payload["notes"]

    await db.commit()
    return {"status": "ok"}
