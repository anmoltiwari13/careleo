from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import create_access_token, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    query = select(User).where(User.email == payload.email)
    if payload.login_code:
        query = query.where(User.login_code == payload.login_code)

    user = await db.scalar(query)
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect credentials")

    token = create_access_token(
        str(user.id),
        extra={"role": user.role.value, "hospital_id": user.hospital_id, "doctor_id": user.doctor_id, "patient_id": user.patient_id},
    )
    return TokenResponse(access_token=token)
