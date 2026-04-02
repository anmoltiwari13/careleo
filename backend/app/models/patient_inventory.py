from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class PatientInventory(Base):
    __tablename__ = "patient_inventories"

    id: Mapped[int] = mapped_column(primary_key=True)
    doctor_id: Mapped[int] = mapped_column(ForeignKey("doctors.id", ondelete="CASCADE"), index=True)
    patient_id: Mapped[int] = mapped_column(ForeignKey("patients.id", ondelete="CASCADE"), index=True, unique=True)
    religion: Mapped[str | None] = mapped_column(String(255))
    diagnosis: Mapped[str | None] = mapped_column(Text)
    investigation: Mapped[str | None] = mapped_column(Text)
    investigation_date: Mapped[date | None] = mapped_column(Date)
    finding: Mapped[str | None] = mapped_column(Text)
    finding_date: Mapped[date | None] = mapped_column(Date)
    prescription: Mapped[str | None] = mapped_column(Text)
    special_instruction: Mapped[str | None] = mapped_column(Text)
    family_history: Mapped[str | None] = mapped_column(Text)
    past_medication_history: Mapped[str | None] = mapped_column(Text)
    surgical_history: Mapped[str | None] = mapped_column(Text)
    presenting_complaints: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
