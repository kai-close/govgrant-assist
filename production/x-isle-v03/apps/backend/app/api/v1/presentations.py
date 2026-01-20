"""
Presentations API

CRUD operations for presentations.
"""

from typing import Optional, List
from datetime import datetime
import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.db.session import get_db
from app.db.models import Presentation, Collaborator, CollaboratorRole
from app.auth.jwt import RequiredUser, CurrentUser
from app.collaboration.room_manager import RoomManager


logger = structlog.get_logger()
router = APIRouter()


# Request/Response models
class ThemeModel(BaseModel):
    """Presentation theme."""

    primaryColor: str = "#3b82f6"
    secondaryColor: Optional[str] = None
    backgroundColor: str = "#ffffff"
    textColor: Optional[str] = "#1f2937"
    fontFamily: str = "Inter"
    headingFont: str = "Inter"
    fontSize: Optional[int] = 16


class PresentationCreate(BaseModel):
    """Create presentation request."""

    title: str = "Untitled Presentation"
    description: Optional[str] = None
    templateId: Optional[str] = None
    theme: Optional[ThemeModel] = None


class PresentationUpdate(BaseModel):
    """Update presentation request."""

    title: Optional[str] = None
    description: Optional[str] = None
    theme: Optional[ThemeModel] = None
    isPublic: Optional[bool] = None


class PresentationResponse(BaseModel):
    """Presentation response."""

    id: str
    title: str
    description: Optional[str]
    ownerId: str
    templateId: Optional[str]
    theme: dict
    crdtRoomId: Optional[str]
    isPublic: bool
    shareToken: Optional[str]
    thumbnailUrl: Optional[str]
    slideCount: int
    wordCount: int
    createdAt: datetime
    updatedAt: datetime
    lastEditedAt: Optional[datetime]

    class Config:
        from_attributes = True


class PresentationListResponse(BaseModel):
    """List of presentations response."""

    presentations: List[PresentationResponse]
    total: int


class CollaboratorResponse(BaseModel):
    """Collaborator info."""

    userId: str
    role: str
    invitedAt: datetime
    acceptedAt: Optional[datetime]


# Endpoints


@router.get("", response_model=PresentationListResponse)
async def list_presentations(
    user: RequiredUser,
    db: AsyncSession = Depends(get_db),
    limit: int = 50,
    offset: int = 0,
    include_shared: bool = True,
):
    """
    List all presentations for the current user.

    Includes owned presentations and shared presentations.
    """
    # Query for owned presentations
    query = select(Presentation).where(
        Presentation.ownerId == user.id,
        Presentation.deletedAt.is_(None),
    )

    if include_shared:
        # Also include presentations where user is a collaborator
        shared_query = (
            select(Presentation)
            .join(Collaborator)
            .where(
                Collaborator.userId == user.id,
                Presentation.deletedAt.is_(None),
            )
        )
        query = query.union(shared_query)

    # Order by last edited
    query = query.order_by(Presentation.lastEditedAt.desc().nullsfirst())

    # Apply pagination
    query = query.offset(offset).limit(limit)

    result = await db.execute(query)
    presentations = result.scalars().all()

    # Get total count
    count_query = select(Presentation).where(
        Presentation.ownerId == user.id,
        Presentation.deletedAt.is_(None),
    )
    count_result = await db.execute(count_query)
    total = len(count_result.scalars().all())

    return PresentationListResponse(
        presentations=[PresentationResponse.model_validate(p) for p in presentations],
        total=total,
    )


@router.post("", response_model=PresentationResponse, status_code=status.HTTP_201_CREATED)
async def create_presentation(
    data: PresentationCreate,
    user: RequiredUser,
    db: AsyncSession = Depends(get_db),
):
    """Create a new presentation."""
    presentation = Presentation(
        title=data.title,
        description=data.description,
        ownerId=user.id,
        templateId=data.templateId,
        theme=data.theme.model_dump() if data.theme else {},
        crdtRoomId=None,  # Will be set when first edited
    )

    db.add(presentation)
    await db.flush()

    # Set CRDT room ID to presentation ID
    presentation.crdtRoomId = presentation.id
    await db.commit()
    await db.refresh(presentation)

    logger.info(
        "Presentation created",
        presentation_id=presentation.id,
        user_id=user.id,
    )

    return PresentationResponse.model_validate(presentation)


@router.get("/{presentation_id}", response_model=PresentationResponse)
async def get_presentation(
    presentation_id: str,
    user: RequiredUser,
    db: AsyncSession = Depends(get_db),
):
    """Get a presentation by ID."""
    presentation = await _get_presentation_with_access(
        presentation_id, user.id, db, require_edit=False
    )
    return PresentationResponse.model_validate(presentation)


@router.patch("/{presentation_id}", response_model=PresentationResponse)
async def update_presentation(
    presentation_id: str,
    data: PresentationUpdate,
    user: RequiredUser,
    db: AsyncSession = Depends(get_db),
):
    """Update a presentation."""
    presentation = await _get_presentation_with_access(
        presentation_id, user.id, db, require_edit=True
    )

    # Update fields
    if data.title is not None:
        presentation.title = data.title
    if data.description is not None:
        presentation.description = data.description
    if data.theme is not None:
        presentation.theme = data.theme.model_dump()
    if data.isPublic is not None:
        presentation.isPublic = data.isPublic

    presentation.lastEditedAt = datetime.utcnow()
    await db.commit()
    await db.refresh(presentation)

    logger.info(
        "Presentation updated",
        presentation_id=presentation_id,
        user_id=user.id,
    )

    return PresentationResponse.model_validate(presentation)


@router.delete("/{presentation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_presentation(
    presentation_id: str,
    user: RequiredUser,
    db: AsyncSession = Depends(get_db),
):
    """Soft delete a presentation."""
    presentation = await _get_presentation_with_access(
        presentation_id, user.id, db, require_owner=True
    )

    presentation.deletedAt = datetime.utcnow()
    await db.commit()

    logger.info(
        "Presentation deleted",
        presentation_id=presentation_id,
        user_id=user.id,
    )


@router.post("/{presentation_id}/duplicate", response_model=PresentationResponse)
async def duplicate_presentation(
    presentation_id: str,
    user: RequiredUser,
    db: AsyncSession = Depends(get_db),
):
    """Duplicate a presentation."""
    original = await _get_presentation_with_access(
        presentation_id, user.id, db, require_edit=False
    )

    # Create duplicate
    duplicate = Presentation(
        title=f"{original.title} (Copy)",
        description=original.description,
        ownerId=user.id,
        templateId=original.templateId,
        theme=original.theme.copy() if original.theme else {},
        thumbnailUrl=original.thumbnailUrl,
        slideCount=original.slideCount,
        wordCount=original.wordCount,
    )

    db.add(duplicate)
    await db.flush()

    # Set CRDT room ID
    duplicate.crdtRoomId = duplicate.id

    # Copy CRDT content from original room to new room
    room_manager = RoomManager()
    try:
        # Get or create the original room to access its CRDT document
        original_room = await room_manager.get_or_create_room(original.crdtRoomId or original.id)

        # Get the full state from the original document
        original_state = original_room.doc.get_update()

        if original_state:
            # Create the new room and apply the copied state
            new_room = await room_manager.get_or_create_room(duplicate.id)
            new_room.doc.apply_update(original_state)

            # Persist the update to the new room's store
            await new_room.store.write(original_state)

            logger.info(
                "CRDT content copied",
                original_room_id=original.crdtRoomId or original.id,
                new_room_id=duplicate.id,
            )
    except Exception as e:
        logger.warning(
            "Failed to copy CRDT content, presentation duplicated without slides",
            error=str(e),
            original_id=presentation_id,
            duplicate_id=duplicate.id,
        )

    await db.commit()
    await db.refresh(duplicate)

    logger.info(
        "Presentation duplicated",
        original_id=presentation_id,
        duplicate_id=duplicate.id,
        user_id=user.id,
    )

    return PresentationResponse.model_validate(duplicate)


@router.post("/{presentation_id}/share", response_model=dict)
async def generate_share_token(
    presentation_id: str,
    user: RequiredUser,
    db: AsyncSession = Depends(get_db),
):
    """Generate a share token for public access."""
    presentation = await _get_presentation_with_access(
        presentation_id, user.id, db, require_owner=True
    )

    # Generate new share token
    presentation.shareToken = secrets.token_urlsafe(32)
    presentation.isPublic = True
    await db.commit()

    return {
        "shareToken": presentation.shareToken,
        "shareUrl": f"/share/{presentation.shareToken}",
    }


@router.get("/{presentation_id}/collaborators", response_model=List[CollaboratorResponse])
async def list_collaborators(
    presentation_id: str,
    user: RequiredUser,
    db: AsyncSession = Depends(get_db),
):
    """List collaborators for a presentation."""
    await _get_presentation_with_access(
        presentation_id, user.id, db, require_edit=False
    )

    result = await db.execute(
        select(Collaborator).where(Collaborator.presentationId == presentation_id)
    )
    collaborators = result.scalars().all()

    return [
        CollaboratorResponse(
            userId=c.userId,
            role=c.role,
            invitedAt=c.invitedAt,
            acceptedAt=c.acceptedAt,
        )
        for c in collaborators
    ]


# Helper functions


async def _get_presentation_with_access(
    presentation_id: str,
    user_id: str,
    db: AsyncSession,
    require_edit: bool = False,
    require_owner: bool = False,
) -> Presentation:
    """
    Get a presentation and verify user has access.

    Raises 404 if not found, 403 if no access.
    """
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

    # Check ownership
    is_owner = presentation.ownerId == user_id

    if require_owner and not is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can perform this action",
        )

    if is_owner:
        return presentation

    # Check collaboration
    collab_result = await db.execute(
        select(Collaborator).where(
            Collaborator.presentationId == presentation_id,
            Collaborator.userId == user_id,
        )
    )
    collaborator = collab_result.scalar_one_or_none()

    if not collaborator:
        # Check if public
        if presentation.isPublic and not require_edit:
            return presentation

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this presentation",
        )

    if require_edit and collaborator.role == CollaboratorRole.VIEWER.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have edit access to this presentation",
        )

    return presentation
