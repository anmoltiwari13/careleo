from sqlalchemy import JSON, Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Hospital(Base):
    __tablename__ = "hospitals"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    domain: Mapped[str | None] = mapped_column(String(255), unique=True)
    branding: Mapped[dict | None] = mapped_column(JSON, default={})
    is_private_clinic: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    doctors = relationship("Doctor", back_populates="hospital", cascade="all, delete")
    domains = relationship("Domain", back_populates="hospital", cascade="all, delete")
    branding_config = relationship("BrandingConfig", back_populates="hospital", uselist=False, cascade="all, delete")
