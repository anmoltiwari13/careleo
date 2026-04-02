from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class BrandingConfig(Base):
    __tablename__ = "branding_configs"

    id: Mapped[int] = mapped_column(primary_key=True)
    hospital_id: Mapped[int] = mapped_column(ForeignKey("hospitals.id", ondelete="CASCADE"), unique=True)
    logo: Mapped[str | None] = mapped_column(String(500))
    colors: Mapped[str | None] = mapped_column(String(1000))
    description: Mapped[str | None] = mapped_column(String(2000))

    hospital = relationship("Hospital", back_populates="branding_config")
