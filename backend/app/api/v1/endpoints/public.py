from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.appointment import Appointment
from app.models.branding import BrandingConfig
from app.models.doctor import Doctor
from app.models.hospital import Hospital
from app.models.patient import Patient
from app.schemas.appointment import AppointmentCreate

router = APIRouter(prefix="/public", tags=["public"])


async def build_hospital_public_payload(hospital_id: int, db: AsyncSession):
    hospital = await db.scalar(select(Hospital).where(Hospital.id == hospital_id))
    if hospital is None:
        return {"hospital": None, "doctors": []}

    doctors = list(await db.scalars(select(Doctor).where(Doctor.hospital_id == hospital_id)))
    branding = await db.scalar(select(BrandingConfig).where(BrandingConfig.hospital_id == hospital_id))

    return {
        "hospital": {"id": hospital.id, "name": hospital.name, "domain": hospital.domain},
        "branding": {
            "logo": getattr(branding, "logo", None),
            "colors": getattr(branding, "colors", None),
            "description": getattr(branding, "description", None),
        },
        "doctors": [
            {
                "id": d.id,
                "specialization": d.specialization,
                "bio": d.bio,
                "availability": d.availability,
            }
            for d in doctors
        ],
    }


@router.get("/hospital")
async def hospital_public(request: Request, db: AsyncSession = Depends(get_db)):
    hospital_id = getattr(request.state, "tenant_hospital_id", None)
    if not hospital_id:
        return {"hospital": None, "doctors": []}
    return await build_hospital_public_payload(hospital_id, db)


@router.get("/hospitals/{hospital_id}")
async def hospital_public_by_id(hospital_id: int, db: AsyncSession = Depends(get_db)):
    payload = await build_hospital_public_payload(hospital_id, db)
    if payload.get("hospital") is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Hospital not found")
    return payload


@router.get("/hospitals-directory")
async def hospitals_directory(db: AsyncSession = Depends(get_db)):
    hospitals = list(await db.scalars(select(Hospital).where(Hospital.is_private_clinic.is_(False)).order_by(Hospital.id.desc())))
    result = []
    for hospital in hospitals:
        branding = await db.scalar(select(BrandingConfig).where(BrandingConfig.hospital_id == hospital.id))
        result.append(
            {
                "id": hospital.id,
                "name": hospital.name,
                "domain": hospital.domain,
                "logo": getattr(branding, "logo", None),
                "description": getattr(branding, "description", None),
            }
        )
    return result


@router.get("/private-clinic-doctors")
async def private_clinic_doctors(db: AsyncSession = Depends(get_db)):
    rows = await db.execute(
        select(Doctor, Hospital, BrandingConfig)
        .join(Hospital, Hospital.id == Doctor.hospital_id)
        .outerjoin(BrandingConfig, BrandingConfig.hospital_id == Hospital.id)
        .where(Hospital.is_private_clinic.is_(True))
        .order_by(Doctor.id.desc())
    )
    return [
        {
            "doctor_id": doctor.id,
            "hospital_id": hospital.id,
            "clinic_name": hospital.name,
            "specialization": doctor.specialization,
            "bio": doctor.bio,
            "availability": doctor.availability,
            "logo": getattr(branding, "logo", None),
            "description": getattr(branding, "description", None),
        }
        for doctor, hospital, branding in rows.all()
    ]


@router.get("/doctor/{doctor_id}")
async def doctor_public(doctor_id: int, db: AsyncSession = Depends(get_db)):
    doctor = await db.scalar(select(Doctor).where(Doctor.id == doctor_id))
    if doctor is None:
        return {"doctor": None}

    hospital = await db.scalar(select(Hospital).where(Hospital.id == doctor.hospital_id))
    branding = await db.scalar(select(BrandingConfig).where(BrandingConfig.hospital_id == doctor.hospital_id))

    return {
        "doctor": {
            "id": doctor.id,
            "hospital_id": doctor.hospital_id,
            "specialization": doctor.specialization,
            "bio": doctor.bio,
            "availability": doctor.availability,
        },
        "hospital": {
            "id": hospital.id if hospital else None,
            "name": hospital.name if hospital else None,
            "domain": hospital.domain if hospital else None,
        },
        "branding": {
            "logo": getattr(branding, "logo", None),
            "colors": getattr(branding, "colors", None),
            "description": getattr(branding, "description", None),
        },
    }


@router.post("/doctor/{doctor_id}/appointments")
async def book_appointment(doctor_id: int, payload: AppointmentCreate, db: AsyncSession = Depends(get_db)):
    doctor = await db.scalar(select(Doctor).where(Doctor.id == doctor_id))
    if doctor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    patient = await db.scalar(select(Patient).where(Patient.email == payload.patient_email))
    if patient is None:
        patient = Patient(doctor_id=doctor_id, full_name=payload.patient_name, email=payload.patient_email)
        db.add(patient)
        await db.flush()
    else:
        if patient.doctor_id != doctor_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Patient already registered with another clinic")

    if payload.patient_name and not patient.full_name:
        patient.full_name = payload.patient_name
    if payload.patient_phone and not patient.phone:
        patient.phone = payload.patient_phone
    if payload.patient_gender and not patient.gender:
        patient.gender = payload.patient_gender
    if payload.patient_date_of_birth and not patient.date_of_birth:
        patient.date_of_birth = payload.patient_date_of_birth
    if payload.patient_local_address and not patient.local_address:
        patient.local_address = payload.patient_local_address
    if payload.patient_pincode and not patient.pincode:
        patient.pincode = payload.patient_pincode
    if payload.patient_city and not patient.city:
        patient.city = payload.patient_city
    if payload.patient_state and not patient.state:
        patient.state = payload.patient_state
    if any([patient.local_address, patient.city, patient.state, patient.pincode]):
        patient.address = ", ".join(
            [part for part in [patient.local_address, patient.city, patient.state, patient.pincode] if part]
        ) or patient.address

    appointment = Appointment(
        doctor_id=doctor_id,
        patient_id=patient.id,
        patient_name_snapshot=(payload.patient_name or "").strip() or patient.full_name,
        patient_email_snapshot=patient.email,
        time=payload.time,
        notes=payload.notes,
    )
    db.add(appointment)
    await db.commit()
    await db.refresh(appointment)

    return {
        "status": "pending",
        "appointment_id": appointment.id,
        "message": "Appointment request submitted. The doctor will approve it soon.",
    }
