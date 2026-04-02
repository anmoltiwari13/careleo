from sqlalchemy import or_, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User

ADMIN_EMAIL = "tiwarianmol2003@gmail.com"
ADMIN_PASSWORD = "anmol123"
ADMIN_LOGIN_CODE = "1234"


async def bootstrap_super_admin(session: AsyncSession) -> None:
    # Prevent duplicate bootstrap inserts when multiple gunicorn workers start together.
    await session.execute(text("SELECT pg_advisory_lock(98124731)"))
    try:
        existing = await session.scalar(
            select(User).where(or_(User.role == UserRole.CARELEO_ADMIN, User.email == ADMIN_EMAIL))
        )
        if existing:
            existing.email = ADMIN_EMAIL
            existing.role = UserRole.CARELEO_ADMIN
            existing.password_hash = hash_password(ADMIN_PASSWORD)
            existing.login_code = ADMIN_LOGIN_CODE
        else:
            session.add(
                User(
                    email=ADMIN_EMAIL,
                    role=UserRole.CARELEO_ADMIN,
                    password_hash=hash_password(ADMIN_PASSWORD),
                    login_code=ADMIN_LOGIN_CODE,
                )
            )

        try:
            await session.commit()
        except IntegrityError:
            await session.rollback()
    finally:
        await session.execute(text("SELECT pg_advisory_unlock(98124731)"))
