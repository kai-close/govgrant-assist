"""
Database Models

SQLAlchemy models for X-Isle backend.
Compatible with existing Drizzle schema from Next.js.
"""

from datetime import datetime
from typing import Optional, List
from enum import Enum

from sqlalchemy import (
    Column,
    String,
    Text,
    Boolean,
    Integer,
    DateTime,
    ForeignKey,
    LargeBinary,
    Index,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import DeclarativeBase, relationship, Mapped, mapped_column
import uuid


class Base(DeclarativeBase):
    """Base class for all models."""

    pass


# Enums
class CollaboratorRole(str, Enum):
    VIEWER = "viewer"
    EDITOR = "editor"
    OWNER = "owner"


class LLMProvider(str, Enum):
    AZURE = "azure"
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"


class TemplateSourceType(str, Enum):
    SYSTEM = "system"
    USER = "user"
    AGENCY = "agency"


class DocumentStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    ERROR = "error"


# Models


class User(Base):
    """User model - synced with NextAuth.js users table."""

    __tablename__ = "users"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    emailVerified: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    image: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationships
    presentations: Mapped[List["Presentation"]] = relationship(back_populates="owner")
    settings: Mapped[Optional["UserSettings"]] = relationship(back_populates="user", uselist=False)


class Presentation(Base):
    """Presentation model."""

    __tablename__ = "presentations"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(500), default="Untitled Presentation")
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ownerId: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"))
    templateId: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("templates.id"), nullable=True)
    theme: Mapped[dict] = mapped_column(JSONB, default=dict)

    # CRDT room reference (slides are now in CRDT, not JSONB)
    crdtRoomId: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Sharing
    isPublic: Mapped[bool] = mapped_column(Boolean, default=False)
    shareToken: Mapped[Optional[str]] = mapped_column(String(255), nullable=True, unique=True)

    # Metadata
    thumbnailUrl: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    slideCount: Mapped[int] = mapped_column(Integer, default=0)
    wordCount: Mapped[int] = mapped_column(Integer, default=0)

    # Timestamps
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    lastEditedAt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    deletedAt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    owner: Mapped["User"] = relationship(back_populates="presentations")
    template: Mapped[Optional["Template"]] = relationship()
    collaborators: Mapped[List["Collaborator"]] = relationship(back_populates="presentation")

    __table_args__ = (
        Index("idx_presentations_owner", "ownerId"),
        Index("idx_presentations_created", "createdAt"),
    )


class Template(Base):
    """Presentation template model."""

    __tablename__ = "templates"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sourceType: Mapped[str] = mapped_column(String(50), default=TemplateSourceType.SYSTEM.value)
    sourceUserId: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id"), nullable=True)
    thumbnailUrl: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    layouts: Mapped[dict] = mapped_column(JSONB, default=list)
    theme: Mapped[dict] = mapped_column(JSONB, default=dict)
    isOfficial: Mapped[bool] = mapped_column(Boolean, default=False)
    agencyCode: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    usageCount: Mapped[int] = mapped_column(Integer, default=0)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Collaborator(Base):
    """Presentation collaborator model."""

    __tablename__ = "collaborators"

    presentationId: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("presentations.id", ondelete="CASCADE"), primary_key=True)
    userId: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    role: Mapped[str] = mapped_column(String(50), default=CollaboratorRole.VIEWER.value)
    invitedAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    acceptedAt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    # Relationships
    presentation: Mapped["Presentation"] = relationship(back_populates="collaborators")
    user: Mapped["User"] = relationship()


class CRDTUpdate(Base):
    """
    CRDT binary updates storage.

    Stores Yjs/pycrdt binary updates for each room (presentation).
    Updates are batched and written periodically.
    """

    __tablename__ = "crdt_updates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    roomId: Mapped[str] = mapped_column(String(255), nullable=False)
    updateData: Mapped[bytes] = mapped_column(LargeBinary, nullable=False)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_crdt_room_id", "roomId"),
        Index("idx_crdt_created_at", "createdAt"),
    )


class Comment(Base):
    """Slide/card comments."""

    __tablename__ = "comments"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    presentationId: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("presentations.id", ondelete="CASCADE"))
    slideId: Mapped[str] = mapped_column(String(255), nullable=False)
    cardId: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    userId: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"))
    content: Mapped[str] = mapped_column(Text, nullable=False)
    position: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)  # {x, y}
    resolved: Mapped[bool] = mapped_column(Boolean, default=False)
    parentId: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("comments.id"), nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship()
    replies: Mapped[List["Comment"]] = relationship()

    __table_args__ = (
        Index("idx_comments_presentation", "presentationId"),
        Index("idx_comments_slide", "slideId"),
    )


class UserSettings(Base):
    """User settings and preferences."""

    __tablename__ = "user_settings"

    userId: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    llmProvider: Mapped[str] = mapped_column(String(50), default=LLMProvider.AZURE.value)
    openaiApiKey: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Encrypted
    anthropicApiKey: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Encrypted
    googleApiKey: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # Encrypted
    theme: Mapped[str] = mapped_column(String(50), default="system")
    editorLayout: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    emailNotifications: Mapped[bool] = mapped_column(Boolean, default=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updatedAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="settings")


class Asset(Base):
    """Uploaded assets (images, files)."""

    __tablename__ = "assets"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    userId: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"))
    presentationId: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("presentations.id", ondelete="SET NULL"), nullable=True)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mimeType: Mapped[str] = mapped_column(String(100), nullable=False)
    size: Mapped[int] = mapped_column(Integer, nullable=False)
    storageKey: Mapped[str] = mapped_column(String(500), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    width: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    height: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    altText: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_assets_user", "userId"),
        Index("idx_assets_presentation", "presentationId"),
    )


class Document(Base):
    """Uploaded documents for RAG processing."""

    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    userId: Mapped[str] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="CASCADE"))
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    mimeType: Mapped[str] = mapped_column(String(100), nullable=False)
    size: Mapped[int] = mapped_column(Integer, nullable=False)
    storageKey: Mapped[str] = mapped_column(String(500), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default=DocumentStatus.PENDING.value)
    error: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    textContent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    pageCount: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    processedAt: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        Index("idx_documents_user", "userId"),
        Index("idx_documents_status", "status"),
    )


class AuditLog(Base):
    """Audit logging for government compliance."""

    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(UUID(as_uuid=False), primary_key=True, default=lambda: str(uuid.uuid4()))
    userId: Mapped[Optional[str]] = mapped_column(UUID(as_uuid=False), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    resourceType: Mapped[str] = mapped_column(String(100), nullable=False)
    resourceId: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    audit_metadata: Mapped[Optional[dict]] = mapped_column("metadata", JSONB, nullable=True)
    ipAddress: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    userAgent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    createdAt: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_audit_user", "userId"),
        Index("idx_audit_action", "action"),
        Index("idx_audit_created", "createdAt"),
    )
