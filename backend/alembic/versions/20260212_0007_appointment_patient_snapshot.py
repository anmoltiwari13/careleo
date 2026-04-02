"""add patient snapshot fields to appointments

Revision ID: 20260212_0007
Revises: 20260211_0006
Create Date: 2026-02-12
"""

from alembic import op
import sqlalchemy as sa

revision = "20260212_0007"
down_revision = "20260211_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("appointments", sa.Column("patient_name_snapshot", sa.String(length=255), nullable=True))
    op.add_column("appointments", sa.Column("patient_email_snapshot", sa.String(length=255), nullable=True))

    # Backfill existing appointments using current patient profile state.
    op.execute(
        """
        UPDATE appointments a
        SET patient_name_snapshot = p.full_name,
            patient_email_snapshot = p.email
        FROM patients p
        WHERE p.id = a.patient_id
          AND (a.patient_name_snapshot IS NULL OR a.patient_email_snapshot IS NULL)
        """
    )


def downgrade() -> None:
    op.drop_column("appointments", "patient_email_snapshot")
    op.drop_column("appointments", "patient_name_snapshot")
