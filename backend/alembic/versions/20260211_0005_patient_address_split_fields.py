"""add structured patient address fields

Revision ID: 20260211_0005
Revises: 20260211_0004
Create Date: 2026-02-11
"""

from alembic import op
import sqlalchemy as sa

revision = "20260211_0005"
down_revision = "20260211_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("patients", sa.Column("local_address", sa.String(length=500), nullable=True))
    op.add_column("patients", sa.Column("pincode", sa.String(length=12), nullable=True))
    op.add_column("patients", sa.Column("city", sa.String(length=120), nullable=True))
    op.add_column("patients", sa.Column("state", sa.String(length=120), nullable=True))
    op.create_index("ix_patients_pincode", "patients", ["pincode"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_patients_pincode", table_name="patients")
    op.drop_column("patients", "state")
    op.drop_column("patients", "city")
    op.drop_column("patients", "pincode")
    op.drop_column("patients", "local_address")
