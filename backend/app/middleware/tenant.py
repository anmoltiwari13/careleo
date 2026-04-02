from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.services.tenant import resolve_tenant


class TenantMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        async with AsyncSessionLocal() as db:
            tenant = await resolve_tenant(db, request.headers.get("host", settings.base_domain), settings.base_domain)
            request.state.tenant_hospital_id = tenant.hospital_id
            request.state.tenant_domain = tenant.domain

        response = await call_next(request)
        return response
