"""add patient inventories

Revision ID: 20260325_0009
Revises: 20260218_0008
Create Date: 2026-03-25 10:45:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260325_0009"
down_revision = "20260218_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "patient_inventories",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("doctor_id", sa.Integer(), nullable=False),
        sa.Column("patient_id", sa.Integer(), nullable=False),
        sa.Column("religion", sa.String(length=255), nullable=True),
        sa.Column("diagnosis", sa.Text(), nullable=True),
        sa.Column("investigation", sa.Text(), nullable=True),
        sa.Column("investigation_date", sa.Date(), nullable=True),
        sa.Column("finding", sa.Text(), nullable=True),
        sa.Column("finding_date", sa.Date(), nullable=True),
        sa.Column("prescription", sa.Text(), nullable=True),
        sa.Column("special_instruction", sa.Text(), nullable=True),
        sa.Column("family_history", sa.Text(), nullable=True),
        sa.Column("past_medication_history", sa.Text(), nullable=True),
        sa.Column("surgical_history", sa.Text(), nullable=True),
        sa.Column("presenting_complaints", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["doctor_id"], ["doctors.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["patient_id"], ["patients.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("patient_id"),
    )
    op.create_index("ix_patient_inventories_doctor_id", "patient_inventories", ["doctor_id"], unique=False)
    op.create_index("ix_patient_inventories_patient_id", "patient_inventories", ["patient_id"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_patient_inventories_patient_id", table_name="patient_inventories")
    op.drop_index("ix_patient_inventories_doctor_id", table_name="patient_inventories")
    op.drop_table("patient_inventories")
