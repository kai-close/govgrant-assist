"""
Export API

Export presentation to various formats.
"""

from datetime import datetime, timezone
from typing import Optional
import base64

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.db.session import get_db
from app.db.models import Presentation, Collaborator
from app.auth.jwt import RequiredUser
from app.pptx.generator import PPTXGenerator
from app.collaboration.room_manager import RoomManager


logger = structlog.get_logger()
router = APIRouter()


# Request/Response models


class ExportPPTXRequest(BaseModel):
    """Request to export as PPTX."""

    presentationId: str
    includeNotes: bool = True
    includeHiddenSlides: bool = False


class ExportPPTXResponse(BaseModel):
    """PPTX export response."""

    filename: str
    data: str  # Base64 encoded
    mimeType: str = "application/vnd.openxmlformats-officedocument.presentationml.presentation"


class ExportJSONRequest(BaseModel):
    """Request to export as JSON."""

    presentationId: str


class ExportJSONResponse(BaseModel):
    """JSON export response."""

    filename: str
    data: dict


# Endpoints


@router.get("/status")
async def get_export_status():
    """Check export service status."""
    return {
        "status": "healthy",
        "formats": ["pptx", "json"],
        "pdfSupported": False,  # TODO: Add LibreOffice integration
    }


@router.post("/pptx", response_model=ExportPPTXResponse)
async def export_to_pptx(
    data: ExportPPTXRequest,
    user: RequiredUser,
    db: AsyncSession = Depends(get_db),
):
    """Export presentation to PowerPoint format."""
    logger.info(
        "Exporting to PPTX",
        user_id=user.id,
        presentation_id=data.presentationId,
    )

    # Get presentation
    presentation = await _get_presentation_with_access(
        data.presentationId, user.id, db
    )

    # Get slides from CRDT room
    room_manager = RoomManager()
    room = room_manager.get_room(presentation.crdtRoomId or presentation.id)

    slides_data = []
    if room:
        # Extract slides from CRDT document
        doc = room.doc
        slides_map = doc.get("slides", type=dict)
        # Convert CRDT data to slide format
        for slide_id, slide_data in slides_map.items():
            slides_data.append(slide_data)
    else:
        # Fallback: empty presentation
        slides_data = []

    # Generate PPTX
    generator = PPTXGenerator()
    pptx_bytes = await generator.generate(
        title=presentation.title,
        slides=slides_data,
        theme=presentation.theme or {},
    )

    # Encode as base64
    pptx_base64 = base64.b64encode(pptx_bytes).decode()

    # Generate filename
    filename = f"{presentation.title.replace(' ', '_')}.pptx"

    return ExportPPTXResponse(
        filename=filename,
        data=pptx_base64,
    )


@router.post("/pptx/download")
async def download_pptx(
    data: ExportPPTXRequest,
    user: RequiredUser,
    db: AsyncSession = Depends(get_db),
):
    """Download PPTX file directly."""
    logger.info(
        "Downloading PPTX",
        user_id=user.id,
        presentation_id=data.presentationId,
    )

    # Get presentation
    presentation = await _get_presentation_with_access(
        data.presentationId, user.id, db
    )

    # Get slides from CRDT room
    room_manager = RoomManager()
    room = room_manager.get_room(presentation.crdtRoomId or presentation.id)

    slides_data = []
    if room:
        doc = room.doc
        slides_map = doc.get("slides", type=dict)
        for slide_id, slide_data in slides_map.items():
            slides_data.append(slide_data)

    # Generate PPTX
    generator = PPTXGenerator()
    pptx_bytes = await generator.generate(
        title=presentation.title,
        slides=slides_data,
        theme=presentation.theme or {},
    )

    # Generate filename
    filename = f"{presentation.title.replace(' ', '_')}.pptx"

    return Response(
        content=pptx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.post("/json", response_model=ExportJSONResponse)
async def export_to_json(
    data: ExportJSONRequest,
    user: RequiredUser,
    db: AsyncSession = Depends(get_db),
):
    """Export presentation to JSON format (for backup/restore)."""
    logger.info(
        "Exporting to JSON",
        user_id=user.id,
        presentation_id=data.presentationId,
    )

    # Get presentation
    presentation = await _get_presentation_with_access(
        data.presentationId, user.id, db
    )

    # Get slides from CRDT room
    room_manager = RoomManager()
    room = room_manager.get_room(presentation.crdtRoomId or presentation.id)

    slides_data = []
    if room:
        doc = room.doc
        slides_map = doc.get("slides", type=dict)
        for slide_id, slide_data in slides_map.items():
            slides_data.append(slide_data)

    export_data = {
        "version": "2.0",
        "exportedAt": datetime.now(timezone.utc).isoformat(),
        "presentation": {
            "id": presentation.id,
            "title": presentation.title,
            "description": presentation.description,
            "theme": presentation.theme,
            "slides": slides_data,
        },
    }

    filename = f"{presentation.title.replace(' ', '_')}.json"

    return ExportJSONResponse(
        filename=filename,
        data=export_data,
    )


# Helper functions


async def _get_presentation_with_access(
    presentation_id: str,
    user_id: str,
    db: AsyncSession,
) -> Presentation:
    """Get presentation and verify access."""
    result = await db.execute(
        select(Presentation).where(
            Presentation.id == presentation_id,
            Presentation.deletedAt.is_(None),
        )
    )
    presentation = result.scalar_one_or_none()

    if not presentation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Presentation not found",
        )

    # Check access: owner or collaborator
    if presentation.ownerId != user_id:
        # Check if user is a collaborator
        collab_result = await db.execute(
            select(Collaborator).where(
                Collaborator.presentationId == presentation_id,
                Collaborator.userId == user_id,
            )
        )
        collaborator = collab_result.scalar_one_or_none()

        if collaborator is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this presentation",
            )

    return presentation
