"""add prescriptions

Revision ID: 20260218_0008
Revises: 20260212_0007
Create Date: 2026-02-18
"""

from alembic import op
import sqlalchemy as sa

revision = "20260218_0008"
down_revision = "20260212_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "prescriptions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("doctor_id", sa.Integer(), sa.ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("appointment_id", sa.Integer(), sa.ForeignKey("appointments.id", ondelete="CASCADE"), nullable=False),
        sa.Column("diagnosis", sa.String(length=1000), nullable=False),
        sa.Column("drug_names", sa.Text(), nullable=False),
        sa.Column("instructions", sa.Text(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_prescriptions_doctor_id", "prescriptions", ["doctor_id"], unique=False)
    op.create_index("ix_prescriptions_patient_id", "prescriptions", ["patient_id"], unique=False)
    op.create_index("ix_prescriptions_appointment_id", "prescriptions", ["appointment_id"], unique=False)

    op.execute("ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY prescriptions_hospital_policy ON prescriptions USING (doctor_id IN (SELECT id FROM doctors WHERE hospital_id = current_setting('app.current_hospital_id', true)::int))"
    )


def downgrade() -> None:
    op.drop_table("prescriptions")
