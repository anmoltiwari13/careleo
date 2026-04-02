from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.bootstrap import bootstrap_super_admin
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.middleware.tenant import TenantMiddleware


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with AsyncSessionLocal() as session:
        await bootstrap_super_admin(session)
    yield


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(TenantMiddleware)

app.include_router(api_router, prefix=settings.api_v1_prefix)

uploads_root = Path("/app/uploads")
uploads_root.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_root)), name="uploads")

frontend_dist_root = Path(settings.frontend_dist_dir)
frontend_index = frontend_dist_root / "index.html"

if frontend_index.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist_root), html=True), name="frontend")


@app.get("/health")
async def health():
    return {"status": "ok"}


if frontend_index.exists():
    @app.get("/{full_path:path}", include_in_schema=False)
    async def frontend_app(full_path: str):
        requested_path = frontend_dist_root / full_path
        if full_path and requested_path.is_file():
            return FileResponse(requested_path)
        return FileResponse(frontend_index)
