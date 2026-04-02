"""add patient profile columns and user patient link

Revision ID: 20260211_0004
Revises: 20260211_0003
Create Date: 2026-02-11
"""

from alembic import op
import sqlalchemy as sa

revision = "20260211_0004"
down_revision = "20260211_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("patients", sa.Column("phone", sa.String(length=30), nullable=True))
    op.add_column("patients", sa.Column("address", sa.String(length=500), nullable=True))
    op.add_column("patients", sa.Column("gender", sa.String(length=20), nullable=True))
    op.add_column("patients", sa.Column("date_of_birth", sa.Date(), nullable=True))

    op.add_column("users", sa.Column("patient_id", sa.Integer(), nullable=True))
    op.create_index("ix_users_patient_id", "users", ["patient_id"], unique=False)
    op.create_foreign_key("fk_users_patient_id", "users", "patients", ["patient_id"], ["id"], ondelete="CASCADE")


def downgrade() -> None:
    op.drop_constraint("fk_users_patient_id", "users", type_="foreignkey")
    op.drop_index("ix_users_patient_id", table_name="users")
    op.drop_column("users", "patient_id")

    op.drop_column("patients", "date_of_birth")
    op.drop_column("patients", "gender")
    op.drop_column("patients", "address")
    op.drop_column("patients", "phone")
