import enum


class UserRole(str, enum.Enum):
    CARELEO_ADMIN = "careleo_admin"
    HOSPITAL_ADMIN = "hospital_admin"
    DOCTOR = "doctor"
    PATIENT = "patient"


class AppointmentStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
