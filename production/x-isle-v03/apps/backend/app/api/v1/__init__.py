"""API v1 routes."""

from fastapi import APIRouter

from app.api.v1.presentations import router as presentations_router
from app.api.v1.templates import router as templates_router
from app.api.v1.users import router as users_router
from app.api.v1.ai import router as ai_router
from app.api.v1.export import router as export_router
from app.api.v1.documents import router as documents_router

router = APIRouter()

# Include all routers
router.include_router(presentations_router, prefix="/presentations", tags=["Presentations"])
router.include_router(templates_router, prefix="/templates", tags=["Templates"])
router.include_router(users_router, prefix="/users", tags=["Users"])
router.include_router(ai_router, prefix="/ai", tags=["AI"])
router.include_router(export_router, prefix="/export", tags=["Export"])
router.include_router(documents_router, prefix="/documents", tags=["Documents"])
