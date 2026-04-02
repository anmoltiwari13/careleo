from fastapi import APIRouter

from app.api.v1.endpoints import admin, auth, dashboards, doctor_tenant, hospitals, patients, public

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(admin.router)
api_router.include_router(hospitals.router)
api_router.include_router(dashboards.router)
api_router.include_router(public.router)
api_router.include_router(doctor_tenant.router)
api_router.include_router(patients.router)
