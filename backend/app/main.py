from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager

from backend.app.config import settings, DATA_DIR, IMAGES_DIR, HEATMAPS_DIR
from backend.app.database import init_db_async
from backend.app.api import cases, detail, actions, transparency, audit, ingest


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite database schema
    await init_db_async()
    yield


app = FastAPI(
    title="Meridian CDS API",
    description="Clinical Decision-Support & Diagnostic Triage Prioritization System",
    version=settings.APP_VERSION,
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static file endpoints for radiological images and transparent Grad-CAM overlays
app.mount("/data/images", StaticFiles(directory=str(IMAGES_DIR)), name="images")
app.mount("/data/artifacts/heatmaps", StaticFiles(directory=str(HEATMAPS_DIR)), name="heatmaps")

# Include Routers
app.include_router(cases.router, prefix="/api")
app.include_router(detail.router, prefix="/api")
app.include_router(actions.router, prefix="/api")
app.include_router(transparency.router, prefix="/api")
app.include_router(audit.router, prefix="/api")
app.include_router(ingest.router, prefix="/api")


@app.get("/api/health")
async def health_check():
    return {
        "status": "operational",
        "system": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "mode": "mock" if settings.FORCE_MOCK_MODEL else "live_inference",
        "doctrine": "assistive_prioritization_only_not_a_diagnostic_device"
    }
