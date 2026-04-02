from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    login_code: str | None = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
