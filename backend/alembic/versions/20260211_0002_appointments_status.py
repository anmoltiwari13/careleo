"""add appointment status fields

Revision ID: 20260211_0002
Revises: 20260211_0001
Create Date: 2026-02-11
"""

from alembic import op
import sqlalchemy as sa

revision = "20260211_0002"
down_revision = "20260211_0001"
branch_labels = None
depends_on = None


appointment_status = sa.Enum("PENDING", "APPROVED", "REJECTED", name="appointmentstatus")


def upgrade() -> None:
    appointment_status.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "appointments",
        sa.Column("status", appointment_status, nullable=False, server_default="PENDING"),
    )
    op.add_column("appointments", sa.Column("notes", sa.String(length=1000), nullable=True))
    op.add_column(
        "appointments",
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_appointments_status", "appointments", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_appointments_status", table_name="appointments")
    op.drop_column("appointments", "created_at")
    op.drop_column("appointments", "notes")
    op.drop_column("appointments", "status")
    appointment_status.drop(op.get_bind(), checkfirst=True)
