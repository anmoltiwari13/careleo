from sqlalchemy import or_, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.branding import BrandingConfig
from app.models.doctor import Doctor
from app.models.enums import UserRole
from app.models.hospital import Hospital
from app.models.user import User

ADMIN_EMAIL = "tiwarianmol2003@gmail.com"
ADMIN_PASSWORD = "anmol123"
ADMIN_LOGIN_CODE = "1234"

AROGYA_ASHRAM_NAME = "Arogya Ashram"
AROGYA_ASHRAM_DESCRIPTION = (
    "Arogya Ashram offers personalized Ayurvedic care with Nadi Pariksha, detox protocols, "
    "and rejuvenation plans."
)
AROGYA_ASHRAM_LOGO = "/arogya-ashram-logo-v2.png"

AROGYA_DOCTORS = [
    {
        "full_name": "YP Tiwari",
        "email": "dr.yptiwari@arogyaashram.com",
        "password": "drt123",
        "specialization": "Senior Ayurvedic Practitioner",
        "bio": (
            "Dr. YP Tiwari is a senior Ayurvedic practitioner with over 40 years of clinical "
            "healing experience in chronic and lifestyle disorders."
        ),
        "availability": "Mon-Sat 10:00 AM - 6:00 PM",
        "login_code": "DOC-NW5SHAZR07",
    },
    {
        "full_name": "Aviral Tiwari",
        "email": "aviral.tiwari@careleo.com",
        "password": "avi",
        "specialization": "Ayurvedic Practitioner",
        "bio": "Aviral Tiwari at Arogya Ashram.",
        "availability": "By appointment",
        "login_code": None,
    },
]


async def bootstrap_super_admin(session: AsyncSession) -> None:
    # Prevent duplicate bootstrap inserts when multiple gunicorn workers start together.
    await session.execute(text("SELECT pg_advisory_lock(98124731)"))
    try:
        existing = await session.scalar(
            select(User).where(or_(User.role == UserRole.CARELEO_ADMIN, User.email == ADMIN_EMAIL))
        )
        if existing:
            existing.email = ADMIN_EMAIL
            existing.role = UserRole.CARELEO_ADMIN
            existing.password_hash = hash_password(ADMIN_PASSWORD)
            existing.login_code = ADMIN_LOGIN_CODE
        else:
            session.add(
                User(
                    email=ADMIN_EMAIL,
                    role=UserRole.CARELEO_ADMIN,
                    password_hash=hash_password(ADMIN_PASSWORD),
                    login_code=ADMIN_LOGIN_CODE,
                )
            )

        try:
            await session.commit()
        except IntegrityError:
            await session.rollback()
    finally:
        await session.execute(text("SELECT pg_advisory_unlock(98124731)"))


async def bootstrap_arogya_ashram(session: AsyncSession) -> None:
    await session.execute(text("SELECT pg_advisory_lock(98124732)"))
    try:
        hospital = await session.scalar(select(Hospital).where(Hospital.name == AROGYA_ASHRAM_NAME))
        if hospital is None:
            hospital = Hospital(name=AROGYA_ASHRAM_NAME, domain=None, is_private_clinic=True)
            session.add(hospital)
            await session.flush()

        branding = await session.scalar(select(BrandingConfig).where(BrandingConfig.hospital_id == hospital.id))
        if branding is None:
            branding = BrandingConfig(hospital_id=hospital.id)
            session.add(branding)
        branding.logo = AROGYA_ASHRAM_LOGO
        branding.description = AROGYA_ASHRAM_DESCRIPTION

        for doctor_seed in AROGYA_DOCTORS:
            user = await session.scalar(select(User).where(User.email == doctor_seed["email"]))
            doctor = None
            if user and user.doctor_id:
                doctor = await session.scalar(select(Doctor).where(Doctor.id == user.doctor_id))

            if doctor is None:
                doctor = Doctor(
                    hospital_id=hospital.id,
                    specialization=doctor_seed["specialization"],
                    bio=doctor_seed["bio"],
                    availability=doctor_seed["availability"],
                )
                session.add(doctor)
                await session.flush()
            else:
                doctor.hospital_id = hospital.id
                doctor.specialization = doctor_seed["specialization"]
                doctor.bio = doctor_seed["bio"]
                doctor.availability = doctor_seed["availability"]

            if user is None:
                user = User(
                    full_name=doctor_seed["full_name"],
                    email=doctor_seed["email"],
                    role=UserRole.DOCTOR,
                    password_hash=hash_password(doctor_seed["password"]),
                    hospital_id=hospital.id,
                    doctor_id=doctor.id,
                    login_code=doctor_seed["login_code"],
                )
                session.add(user)
            else:
                user.full_name = doctor_seed["full_name"]
                user.role = UserRole.DOCTOR
                user.password_hash = hash_password(doctor_seed["password"])
                user.hospital_id = hospital.id
                user.doctor_id = doctor.id
                user.login_code = doctor_seed["login_code"]

        try:
            await session.commit()
        except IntegrityError:
            await session.rollback()
    finally:
        await session.execute(text("SELECT pg_advisory_unlock(98124732)"))
