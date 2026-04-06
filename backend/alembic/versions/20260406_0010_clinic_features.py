"""add clinic feature fields

Revision ID: 20260406_0010
Revises: 20260325_0009
Create Date: 2026-04-06 10:40:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260406_0010"
down_revision = "20260325_0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("patient_inventories", sa.Column("diet_plan", sa.Text(), nullable=True))
    op.add_column("patient_inventories", sa.Column("pathya", sa.Text(), nullable=True))
    op.add_column("patient_inventories", sa.Column("apathya", sa.Text(), nullable=True))
    op.add_column("patient_inventories", sa.Column("lab_reports", sa.Text(), nullable=True))
    op.add_column("patient_inventories", sa.Column("document_vault", sa.Text(), nullable=True))
    op.add_column("patient_inventories", sa.Column("preferred_language", sa.String(length=64), nullable=True))
    op.add_column("patient_inventories", sa.Column("follow_up_notes", sa.Text(), nullable=True))

    op.add_column("appointments", sa.Column("consultation_mode", sa.String(length=64), nullable=True))
    op.add_column("appointments", sa.Column("teleconsultation_link", sa.String(length=1000), nullable=True))
    op.add_column("appointments", sa.Column("follow_up_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("appointments", sa.Column("reminder_channel", sa.String(length=64), nullable=True))
    op.add_column("appointments", sa.Column("fee_amount", sa.String(length=64), nullable=True))
    op.add_column("appointments", sa.Column("receipt_number", sa.String(length=128), nullable=True))
    op.add_column("appointments", sa.Column("payment_status", sa.String(length=64), nullable=True))
    op.add_column("appointments", sa.Column("payment_notes", sa.Text(), nullable=True))

    op.add_column("prescriptions", sa.Column("printable_notes", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("prescriptions", "printable_notes")

    op.drop_column("appointments", "payment_notes")
    op.drop_column("appointments", "payment_status")
    op.drop_column("appointments", "receipt_number")
    op.drop_column("appointments", "fee_amount")
    op.drop_column("appointments", "reminder_channel")
    op.drop_column("appointments", "follow_up_date")
    op.drop_column("appointments", "teleconsultation_link")
    op.drop_column("appointments", "consultation_mode")

    op.drop_column("patient_inventories", "follow_up_notes")
    op.drop_column("patient_inventories", "preferred_language")
    op.drop_column("patient_inventories", "document_vault")
    op.drop_column("patient_inventories", "lab_reports")
    op.drop_column("patient_inventories", "apathya")
    op.drop_column("patient_inventories", "pathya")
    op.drop_column("patient_inventories", "diet_plan")
