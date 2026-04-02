from pydantic import BaseModel


class BrandingConfigUpdate(BaseModel):
    logo: str | None = None
    colors: str | None = None
    description: str | None = None


class BrandingConfigOut(BaseModel):
    logo: str | None
    colors: str | None
    description: str | None
