import json
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import role_guard
from app.core.database import get_db
from app.models.appointment import Appointment
from app.models.branding import BrandingConfig
from app.models.doctor import Doctor
from app.models.domain import Domain
from app.models.enums import AppointmentStatus, UserRole
from app.models.patient import Patient
from app.models.patient_inventory import PatientInventory
from app.models.prescription import Prescription
from app.models.user import User
from app.schemas.doctor_patient import DoctorPatientCreate
from app.schemas.patient_inventory import PatientInventoryOut, PatientInventoryUpsert
from app.schemas.appointment import AppointmentDecision, AppointmentOut
from app.schemas.prescription import PrescriptionCreate, PrescriptionOut

router = APIRouter(prefix="/doctor-tenant", tags=["doctor-tenant"])


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


def parse_drug_names(raw: str | None) -> list[str]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
        if isinstance(parsed, list):
            return [str(item) for item in parsed]
        return []
    except json.JSONDecodeError:
        return []


def build_patient_address(local_address: str | None, city: str | None, state: str | None, pincode: str | None) -> str | None:
    return ", ".join([part for part in [local_address, city, state, pincode] if part]) or None


@router.get("/me", dependencies=[Depends(role_guard(UserRole.DOCTOR))])
async def my_tenant_profile(user: User = Depends(role_guard(UserRole.DOCTOR)), db: AsyncSession = Depends(get_db)):
    doctor = await db.scalar(select(Doctor).where(Doctor.id == user.doctor_id))
    if doctor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor profile not found")

    branding = await db.scalar(select(BrandingConfig).where(BrandingConfig.hospital_id == doctor.hospital_id))
    domain = await db.scalar(select(Domain).where(Domain.hospital_id == doctor.hospital_id))

    return {
        "doctor": {
            "id": doctor.id,
            "specialization": doctor.specialization,
            "bio": doctor.bio,
            "availability": doctor.availability,
        },
        "branding": {
            "logo": getattr(branding, "logo", None),
            "description": getattr(branding, "description", None),
            "colors": getattr(branding, "colors", None),
        },
        "domain": getattr(domain, "domain_name", None),
    }


@router.patch("/me", dependencies=[Depends(role_guard(UserRole.DOCTOR))])
async def update_my_tenant_profile(payload: dict, user: User = Depends(role_guard(UserRole.DOCTOR)), db: AsyncSession = Depends(get_db)):
    doctor = await db.scalar(select(Doctor).where(Doctor.id == user.doctor_id))
    if doctor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor profile not found")

    branding = await db.scalar(select(BrandingConfig).where(BrandingConfig.hospital_id == doctor.hospital_id))
    if branding is None:
        branding = BrandingConfig(hospital_id=doctor.hospital_id)
        db.add(branding)

    if "specialization" in payload:
        doctor.specialization = payload["specialization"]
    if "bio" in payload:
        doctor.bio = payload["bio"]
    if "availability" in payload:
        doctor.availability = payload["availability"]

    if "logo" in payload:
        branding.logo = payload["logo"]
    if "description" in payload:
        branding.description = payload["description"]
    if "colors" in payload:
        branding.colors = payload["colors"]

    await db.commit()
    return {"status": "ok"}


@router.get("/appointments", response_model=list[AppointmentOut], dependencies=[Depends(role_guard(UserRole.DOCTOR))])
async def my_appointments(user: User = Depends(role_guard(UserRole.DOCTOR)), db: AsyncSession = Depends(get_db)):
    rows = await db.execute(
        select(Appointment, Patient)
        .join(Patient, Patient.id == Appointment.patient_id)
        .where(Appointment.doctor_id == user.doctor_id)
        .order_by(Appointment.time.desc())
    )
    result: list[AppointmentOut] = []
    for appointment, patient in rows.all():
        result.append(
            AppointmentOut(
                id=appointment.id,
                doctor_id=appointment.doctor_id,
                patient_id=appointment.patient_id,
                patient_name=appointment.patient_name_snapshot or patient.full_name,
                patient_email=appointment.patient_email_snapshot or patient.email,
                time=appointment.time,
                status=appointment.status.value,
                notes=appointment.notes,
                medical_files=parse_medical_files(appointment.medical_files),
                created_at=appointment.created_at,
            )
        )
    return result


@router.patch("/appointments/{appointment_id}", dependencies=[Depends(role_guard(UserRole.DOCTOR))])
async def decide_appointment(
    appointment_id: int,
    payload: AppointmentDecision,
    user: User = Depends(role_guard(UserRole.DOCTOR)),
    db: AsyncSession = Depends(get_db),
):
    appointment = await db.scalar(select(Appointment).where(Appointment.id == appointment_id, Appointment.doctor_id == user.doctor_id))
    if appointment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    requested = payload.status.strip().lower()
    if requested not in {"approved", "rejected", "pending"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Status must be approved, rejected, or pending")

    appointment.status = AppointmentStatus(requested)
    if payload.notes is not None:
        appointment.notes = payload.notes

    await db.commit()
    return {"status": "ok"}


@router.post("/patients", dependencies=[Depends(role_guard(UserRole.DOCTOR))])
async def create_patient_with_inventory(
    payload: DoctorPatientCreate,
    user: User = Depends(role_guard(UserRole.DOCTOR)),
    db: AsyncSession = Depends(get_db),
):
    generated_email = payload.email or f"inventory-{uuid4().hex[:12]}@careleo.local"
    patient = Patient(
        doctor_id=user.doctor_id,
        full_name=payload.full_name,
        email=generated_email,
        phone=payload.phone,
        local_address=payload.local_address,
        pincode=payload.pincode,
        city=payload.city,
        state=payload.state,
        address=build_patient_address(payload.local_address, payload.city, payload.state, payload.pincode),
        gender=payload.gender,
        date_of_birth=payload.date_of_birth,
    )
    db.add(patient)
    await db.flush()

    inventory = PatientInventory(
        doctor_id=user.doctor_id,
        patient_id=patient.id,
        religion=payload.religion,
        diagnosis=payload.diagnosis,
        investigation=payload.investigation,
        investigation_date=payload.investigation_date,
        finding=payload.finding,
        finding_date=payload.finding_date,
        prescription=payload.prescription,
        special_instruction=payload.special_instruction,
        family_history=payload.family_history,
        past_medication_history=payload.past_medication_history,
        surgical_history=payload.surgical_history,
        presenting_complaints=payload.presenting_complaints,
    )
    db.add(inventory)
    await db.commit()
    await db.refresh(patient)
    await db.refresh(inventory)

    return {
        "patient": {
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
        },
        "inventory": {
            "id": inventory.id,
            "doctor_id": inventory.doctor_id,
            "patient_id": inventory.patient_id,
            "religion": inventory.religion,
            "diagnosis": inventory.diagnosis,
            "investigation": inventory.investigation,
            "investigation_date": inventory.investigation_date.isoformat() if inventory.investigation_date else None,
            "finding": inventory.finding,
            "finding_date": inventory.finding_date.isoformat() if inventory.finding_date else None,
            "prescription": inventory.prescription,
            "special_instruction": inventory.special_instruction,
            "family_history": inventory.family_history,
            "past_medication_history": inventory.past_medication_history,
            "surgical_history": inventory.surgical_history,
            "presenting_complaints": inventory.presenting_complaints,
            "created_at": inventory.created_at.isoformat() if inventory.created_at else None,
            "updated_at": inventory.updated_at.isoformat() if inventory.updated_at else None,
        },
    }


@router.delete("/patients/{patient_id}", dependencies=[Depends(role_guard(UserRole.DOCTOR))])
async def delete_patient(
    patient_id: int,
    user: User = Depends(role_guard(UserRole.DOCTOR)),
    db: AsyncSession = Depends(get_db),
):
    patient = await db.scalar(select(Patient).where(Patient.id == patient_id, Patient.doctor_id == user.doctor_id))
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    await db.execute(delete(User).where(User.patient_id == patient_id))
    await db.execute(delete(PatientInventory).where(PatientInventory.patient_id == patient_id))
    await db.execute(delete(Prescription).where(Prescription.patient_id == patient_id))
    await db.execute(delete(Appointment).where(Appointment.patient_id == patient_id))
    await db.delete(patient)
    await db.commit()

    return {"status": "deleted", "patient_id": patient_id}


@router.post("/appointments/{appointment_id}/prescriptions", response_model=PrescriptionOut, dependencies=[Depends(role_guard(UserRole.DOCTOR))])
async def create_prescription(
    appointment_id: int,
    payload: PrescriptionCreate,
    user: User = Depends(role_guard(UserRole.DOCTOR)),
    db: AsyncSession = Depends(get_db),
):
    appointment = await db.scalar(
        select(Appointment).where(Appointment.id == appointment_id, Appointment.doctor_id == user.doctor_id)
    )
    if appointment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    prescription = Prescription(
        doctor_id=appointment.doctor_id,
        patient_id=appointment.patient_id,
        appointment_id=appointment.id,
        diagnosis=payload.diagnosis,
        drug_names=json.dumps(payload.drug_names or []),
        instructions=payload.instructions,
        start_date=payload.start_date,
        end_date=payload.end_date,
    )
    db.add(prescription)
    await db.commit()
    await db.refresh(prescription)

    return PrescriptionOut(
        id=prescription.id,
        doctor_id=prescription.doctor_id,
        patient_id=prescription.patient_id,
        appointment_id=prescription.appointment_id,
        diagnosis=prescription.diagnosis,
        drug_names=parse_drug_names(prescription.drug_names),
        instructions=prescription.instructions,
        start_date=prescription.start_date,
        end_date=prescription.end_date,
        created_at=prescription.created_at,
    )


@router.put("/patients/{patient_id}/inventory", response_model=PatientInventoryOut, dependencies=[Depends(role_guard(UserRole.DOCTOR))])
async def upsert_patient_inventory(
    patient_id: int,
    payload: PatientInventoryUpsert,
    user: User = Depends(role_guard(UserRole.DOCTOR)),
    db: AsyncSession = Depends(get_db),
):
    patient = await db.scalar(select(Patient).where(Patient.id == patient_id, Patient.doctor_id == user.doctor_id))
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    inventory = await db.scalar(
        select(PatientInventory).where(
            PatientInventory.patient_id == patient_id,
            PatientInventory.doctor_id == user.doctor_id,
        )
    )
    if inventory is None:
        inventory = PatientInventory(patient_id=patient_id, doctor_id=user.doctor_id)
        db.add(inventory)

    updates = payload.model_dump()
    for field, value in updates.items():
        setattr(inventory, field, value)

    await db.commit()
    await db.refresh(inventory)

    return PatientInventoryOut(
        id=inventory.id,
        doctor_id=inventory.doctor_id,
        patient_id=inventory.patient_id,
        religion=inventory.religion,
        diagnosis=inventory.diagnosis,
        investigation=inventory.investigation,
        investigation_date=inventory.investigation_date,
        finding=inventory.finding,
        finding_date=inventory.finding_date,
        prescription=inventory.prescription,
        special_instruction=inventory.special_instruction,
        family_history=inventory.family_history,
        past_medication_history=inventory.past_medication_history,
        surgical_history=inventory.surgical_history,
        presenting_complaints=inventory.presenting_complaints,
        created_at=inventory.created_at,
        updated_at=inventory.updated_at,
    )
