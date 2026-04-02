import json
from pathlib import Path
from uuid import uuid4
from collections import defaultdict

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, role_guard
from app.core.database import get_db
from app.core.security import hash_password
from app.models.appointment import Appointment
from app.models.doctor import Doctor
from app.models.enums import UserRole
from app.models.patient import Patient
from app.models.patient_inventory import PatientInventory
from app.models.user import User
from app.models.prescription import Prescription
from app.schemas.patient import (
    PatientAppointmentCreate,
    PatientAppointmentOut,
    PatientProfileOut,
    PatientProfileUpdate,
    PatientSignupRequest,
)
from app.schemas.prescription import PrescriptionOut

router = APIRouter(prefix="/patients", tags=["patients"])
UPLOAD_ROOT = Path("/app/uploads/medical")
ALLOWED_UPLOAD_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg"}


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


@router.post("/signup")
async def patient_signup(payload: PatientSignupRequest, db: AsyncSession = Depends(get_db)):
    doctor = await db.scalar(select(Doctor).where(Doctor.id == payload.doctor_id))
    if doctor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    existing_user = await db.scalar(select(User).where(User.email == payload.email))
    if existing_user is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered. Please sign in.")

    try:
        patient = await db.scalar(select(Patient).where(Patient.email == payload.email))
        if patient is not None and patient.doctor_id != payload.doctor_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Patient already registered with another clinic",
            )

        if patient is None:
            patient = Patient(
                doctor_id=payload.doctor_id,
                full_name=payload.full_name,
                email=payload.email,
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
        else:
            patient.full_name = payload.full_name or patient.full_name
            patient.phone = payload.phone or patient.phone
            patient.local_address = payload.local_address or patient.local_address
            patient.pincode = payload.pincode or patient.pincode
            patient.city = payload.city or patient.city
            patient.state = payload.state or patient.state
            patient.gender = payload.gender or patient.gender
            patient.date_of_birth = payload.date_of_birth or patient.date_of_birth
            patient.address = build_patient_address(patient.local_address, patient.city, patient.state, patient.pincode) or patient.address

        inventory = await db.scalar(select(PatientInventory).where(PatientInventory.patient_id == patient.id))
        if inventory is None:
            inventory = PatientInventory(
                doctor_id=payload.doctor_id,
                patient_id=patient.id,
            )
            db.add(inventory)

        user = User(
            full_name=payload.full_name,
            email=payload.email,
            role=UserRole.PATIENT,
            password_hash=hash_password(payload.password),
            hospital_id=doctor.hospital_id,
            doctor_id=doctor.id,
            patient_id=patient.id,
            login_code=None,
        )
        db.add(user)

        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Patient email already registered")

    return {"status": "created", "patient_id": patient.id}


@router.get("/me", response_model=PatientProfileOut, dependencies=[Depends(role_guard(UserRole.PATIENT))])
async def me(user: User = Depends(role_guard(UserRole.PATIENT)), db: AsyncSession = Depends(get_db)):
    patient = await db.scalar(select(Patient).where(Patient.id == user.patient_id))
    if patient is None:
        patient = await db.scalar(select(Patient).where(Patient.email == user.email))
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found")

    return PatientProfileOut(
        id=patient.id,
        doctor_id=patient.doctor_id,
        full_name=patient.full_name,
        email=patient.email,
        phone=patient.phone,
        address=patient.address,
        local_address=patient.local_address,
        pincode=patient.pincode,
        city=patient.city,
        state=patient.state,
        gender=patient.gender,
        date_of_birth=patient.date_of_birth,
    )


@router.patch("/me", dependencies=[Depends(role_guard(UserRole.PATIENT))])
async def update_me(
    payload: PatientProfileUpdate,
    user: User = Depends(role_guard(UserRole.PATIENT)),
    db: AsyncSession = Depends(get_db),
):
    patient = await db.scalar(select(Patient).where(Patient.id == user.patient_id))
    if patient is None:
        patient = await db.scalar(select(Patient).where(Patient.email == user.email))
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(patient, field, value)
    if any(field in updates for field in ("local_address", "city", "state", "pincode")):
        patient.address = build_patient_address(patient.local_address, patient.city, patient.state, patient.pincode)

    if "full_name" in updates and updates["full_name"]:
        user.full_name = updates["full_name"]

    await db.commit()
    return {"status": "ok"}


@router.post("/appointments", dependencies=[Depends(role_guard(UserRole.PATIENT))])
async def create_appointment(
    payload: PatientAppointmentCreate,
    user: User = Depends(role_guard(UserRole.PATIENT)),
    db: AsyncSession = Depends(get_db),
):
    doctor = await db.scalar(select(Doctor).where(Doctor.id == payload.doctor_id))
    if doctor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")

    patient = await db.scalar(select(Patient).where(Patient.id == user.patient_id))
    if patient is None:
        patient = await db.scalar(select(Patient).where(Patient.email == user.email))
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found")
    if patient.doctor_id != payload.doctor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Appointments can only be booked with your assigned clinic doctor",
        )

    appointment = Appointment(
        doctor_id=payload.doctor_id,
        patient_id=patient.id,
        patient_name_snapshot=(payload.patient_name or "").strip() or patient.full_name,
        patient_email_snapshot=patient.email,
        time=payload.time,
        notes=payload.notes,
        medical_files=json.dumps(payload.medical_files or []),
    )
    db.add(appointment)
    inventory = await db.scalar(select(PatientInventory).where(PatientInventory.patient_id == patient.id))
    if inventory is None:
        inventory = PatientInventory(
            doctor_id=payload.doctor_id,
            patient_id=patient.id,
            presenting_complaints=payload.notes,
        )
        db.add(inventory)
    elif payload.notes and not inventory.presenting_complaints:
        inventory.presenting_complaints = payload.notes
    await db.commit()
    await db.refresh(appointment)
    return {"status": "pending", "appointment_id": appointment.id, "message": "Appointment request submitted."}


@router.get("/appointments", response_model=list[PatientAppointmentOut], dependencies=[Depends(role_guard(UserRole.PATIENT))])
async def my_appointments(user: User = Depends(role_guard(UserRole.PATIENT)), db: AsyncSession = Depends(get_db)):
    patient = await db.scalar(select(Patient).where(Patient.id == user.patient_id))
    if patient is None:
        patient = await db.scalar(select(Patient).where(Patient.email == user.email))
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found")

    rows = list(await db.scalars(select(Appointment).where(Appointment.patient_id == patient.id).order_by(Appointment.time.desc())))
    return [
        PatientAppointmentOut(
            id=item.id,
            doctor_id=item.doctor_id,
            time=item.time,
            status=item.status.value,
            notes=item.notes,
            medical_files=parse_medical_files(item.medical_files),
            created_at=item.created_at,
        )
        for item in rows
    ]


@router.get("/doctor/{doctor_id}/records", dependencies=[Depends(role_guard(UserRole.DOCTOR, UserRole.CARELEO_ADMIN))])
async def doctor_patient_records(doctor_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.role == UserRole.DOCTOR and current_user.doctor_id != doctor_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    rows = list(await db.scalars(select(Patient).where(Patient.doctor_id == doctor_id).order_by(Patient.id.desc())))
    appointment_rows = list(
        await db.scalars(select(Appointment).where(Appointment.doctor_id == doctor_id).order_by(Appointment.created_at.desc()))
    )
    prescription_rows = list(
        await db.scalars(select(Prescription).where(Prescription.doctor_id == doctor_id).order_by(Prescription.created_at.desc()))
    )
    inventory_rows = list(
        await db.scalars(select(PatientInventory).where(PatientInventory.doctor_id == doctor_id))
    )
    appointments_by_patient: dict[int, list[dict]] = defaultdict(list)
    for appointment in appointment_rows:
        appointments_by_patient[appointment.patient_id].append(
            {
                "id": appointment.id,
                "time": appointment.time.isoformat() if appointment.time else None,
                "status": appointment.status.value,
                "notes": appointment.notes,
                "medical_files": parse_medical_files(appointment.medical_files),
                "created_at": appointment.created_at.isoformat() if appointment.created_at else None,
            }
        )

    prescriptions_by_patient: dict[int, list[dict]] = defaultdict(list)
    for prescription in prescription_rows:
        prescriptions_by_patient[prescription.patient_id].append(
            {
                "id": prescription.id,
                "appointment_id": prescription.appointment_id,
                "diagnosis": prescription.diagnosis,
                "drug_names": parse_drug_names(prescription.drug_names),
                "instructions": prescription.instructions,
                "start_date": prescription.start_date.isoformat() if prescription.start_date else None,
                "end_date": prescription.end_date.isoformat() if prescription.end_date else None,
                "created_at": prescription.created_at.isoformat() if prescription.created_at else None,
            }
        )

    inventory_by_patient: dict[int, dict] = {}
    for inventory in inventory_rows:
        inventory_by_patient[inventory.patient_id] = {
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
        }

    return [
        {
            "id": p.id,
            "full_name": p.full_name,
            "email": p.email,
            "phone": p.phone,
            "address": p.address,
            "local_address": p.local_address,
            "pincode": p.pincode,
            "city": p.city,
            "state": p.state,
            "gender": p.gender,
            "date_of_birth": p.date_of_birth.isoformat() if p.date_of_birth else None,
            "appointment_history": appointments_by_patient.get(p.id, []),
            "prescriptions": prescriptions_by_patient.get(p.id, []),
            "inventory": inventory_by_patient.get(p.id),
        }
        for p in rows
    ]


@router.get("/prescriptions", response_model=list[PrescriptionOut], dependencies=[Depends(role_guard(UserRole.PATIENT))])
async def my_prescriptions(user: User = Depends(role_guard(UserRole.PATIENT)), db: AsyncSession = Depends(get_db)):
    patient = await db.scalar(select(Patient).where(Patient.id == user.patient_id))
    if patient is None:
        patient = await db.scalar(select(Patient).where(Patient.email == user.email))
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient profile not found")

    rows = list(
        await db.scalars(select(Prescription).where(Prescription.patient_id == patient.id).order_by(Prescription.created_at.desc()))
    )
    return [
        PrescriptionOut(
            id=item.id,
            doctor_id=item.doctor_id,
            patient_id=item.patient_id,
            appointment_id=item.appointment_id,
            diagnosis=item.diagnosis,
            drug_names=parse_drug_names(item.drug_names),
            instructions=item.instructions,
            start_date=item.start_date,
            end_date=item.end_date,
            created_at=item.created_at,
        )
        for item in rows
    ]


@router.post("/uploads", dependencies=[Depends(role_guard(UserRole.PATIENT))])
async def upload_medical_files(
    files: list[UploadFile] = File(...),
    _: User = Depends(role_guard(UserRole.PATIENT)),
):
    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files uploaded")

    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    uploaded: list[dict[str, str]] = []

    for file in files:
        suffix = Path(file.filename or "").suffix.lower()
        if suffix not in ALLOWED_UPLOAD_EXTENSIONS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Only PDF, PNG, JPG, JPEG files are allowed",
            )

        safe_name = f"{uuid4().hex}{suffix}"
        target = UPLOAD_ROOT / safe_name
        data = await file.read()
        target.write_bytes(data)
        uploaded.append({"name": file.filename or safe_name, "url": f"/uploads/medical/{safe_name}"})

    return {"files": uploaded}
