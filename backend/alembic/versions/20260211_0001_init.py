"""initial schema

Revision ID: 20260211_0001
Revises:
Create Date: 2026-02-11
"""

from alembic import op
import sqlalchemy as sa

revision = "20260211_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "hospitals",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False, unique=True),
        sa.Column("domain", sa.String(length=255), nullable=True, unique=True),
        sa.Column("branding", sa.JSON(), nullable=True),
    )

    op.create_table(
        "doctors",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("hospital_id", sa.Integer(), sa.ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False),
        sa.Column("specialization", sa.String(length=255), nullable=False),
        sa.Column("bio", sa.String(length=1000), nullable=True),
        sa.Column("availability", sa.String(length=255), nullable=True),
    )

    op.create_table(
        "patients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("doctor_id", sa.Integer(), sa.ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
    )

    op.create_table(
        "appointments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("doctor_id", sa.Integer(), sa.ForeignKey("doctors.id", ondelete="CASCADE"), nullable=False),
        sa.Column("patient_id", sa.Integer(), sa.ForeignKey("patients.id", ondelete="CASCADE"), nullable=False),
        sa.Column("time", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "domains",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("hospital_id", sa.Integer(), sa.ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False),
        sa.Column("domain_name", sa.String(length=255), nullable=False, unique=True),
    )

    op.create_table(
        "branding_configs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("hospital_id", sa.Integer(), sa.ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("logo", sa.String(length=500), nullable=True),
        sa.Column("colors", sa.String(length=1000), nullable=True),
        sa.Column("description", sa.String(length=2000), nullable=True),
    )

    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("role", sa.Enum("CARELEO_ADMIN", "HOSPITAL_ADMIN", "DOCTOR", "PATIENT", name="userrole"), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("login_code", sa.String(length=32), nullable=True, unique=True),
        sa.Column("hospital_id", sa.Integer(), sa.ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=True),
        sa.Column("doctor_id", sa.Integer(), sa.ForeignKey("doctors.id", ondelete="CASCADE"), nullable=True),
    )

    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_index("ix_doctors_hospital_id", "doctors", ["hospital_id"], unique=False)
    op.create_index("ix_patients_doctor_id", "patients", ["doctor_id"], unique=False)

    op.execute("ALTER TABLE doctors ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE patients ENABLE ROW LEVEL SECURITY")
    op.execute("ALTER TABLE appointments ENABLE ROW LEVEL SECURITY")
    op.execute(
        "CREATE POLICY doctors_hospital_policy ON doctors USING (hospital_id = current_setting('app.current_hospital_id', true)::int)"
    )
    op.execute(
        "CREATE POLICY patients_hospital_policy ON patients USING (doctor_id IN (SELECT id FROM doctors WHERE hospital_id = current_setting('app.current_hospital_id', true)::int))"
    )
    op.execute(
        "CREATE POLICY appointments_hospital_policy ON appointments USING (doctor_id IN (SELECT id FROM doctors WHERE hospital_id = current_setting('app.current_hospital_id', true)::int))"
    )


def downgrade() -> None:
    op.drop_table("users")
    op.drop_table("branding_configs")
    op.drop_table("domains")
    op.drop_table("appointments")
    op.drop_table("patients")
    op.drop_table("doctors")
    op.drop_table("hospitals")
    op.execute("DROP TYPE IF EXISTS userrole")
