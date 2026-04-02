"""add medical files metadata to appointments

Revision ID: 20260211_0006
Revises: 20260211_0005
Create Date: 2026-02-11
"""

from alembic import op
import sqlalchemy as sa

revision = "20260211_0006"
down_revision = "20260211_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("appointments", sa.Column("medical_files", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("appointments", "medical_files")
