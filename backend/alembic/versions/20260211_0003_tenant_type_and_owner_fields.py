"""add hospital tenant type and user full_name

Revision ID: 20260211_0003
Revises: 20260211_0002
Create Date: 2026-02-11
"""

from alembic import op
import sqlalchemy as sa

revision = "20260211_0003"
down_revision = "20260211_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("hospitals", sa.Column("is_private_clinic", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.create_index("ix_hospitals_is_private_clinic", "hospitals", ["is_private_clinic"], unique=False)

    op.add_column("users", sa.Column("full_name", sa.String(length=255), nullable=True))

    op.execute(
        """
        UPDATE hospitals h
        SET is_private_clinic = TRUE
        WHERE EXISTS (
            SELECT 1 FROM users u WHERE u.hospital_id = h.id AND u.role = 'DOCTOR'
        )
        AND NOT EXISTS (
            SELECT 1 FROM users u2 WHERE u2.hospital_id = h.id AND u2.role = 'HOSPITAL_ADMIN'
        )
        """
    )


def downgrade() -> None:
    op.drop_column("users", "full_name")
    op.drop_index("ix_hospitals_is_private_clinic", table_name="hospitals")
    op.drop_column("hospitals", "is_private_clinic")
