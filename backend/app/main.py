from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router
from app.core.bootstrap import bootstrap_arogya_ashram, bootstrap_super_admin
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.middleware.tenant import TenantMiddleware


@asynccontextmanager
async def lifespan(_: FastAPI):
    async with AsyncSessionLocal() as session:
        await bootstrap_super_admin(session)
        await bootstrap_arogya_ashram(session)
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


@app.get("/health")
async def health():
    return {"status": "ok"}


if frontend_index.exists():
    @app.get("/{full_path:path}", include_in_schema=False)
    async def frontend_app(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        requested_path = (frontend_dist_root / full_path).resolve()
        try:
            requested_path.relative_to(frontend_dist_root.resolve())
        except ValueError:
            return FileResponse(frontend_index)
        if full_path and requested_path.is_file():
            return FileResponse(requested_path)
        return FileResponse(frontend_index)
