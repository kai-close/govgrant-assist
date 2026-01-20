"""
Documents API endpoints.
Handles document processing requests from the Next.js frontend.
"""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
import structlog

from app.config import settings
from app.db.session import get_db
from app.db.models import Document, DocumentStatus
from app.services.document_processor import process_document

logger = structlog.get_logger()

router = APIRouter()


class ProcessRequest(BaseModel):
    """Request to process a document."""
    document_id: str
    storage_key: str
    mime_type: str
    user_id: str


class ProcessResponse(BaseModel):
    """Response from document processing."""
    success: bool
    text_content: Optional[str] = None
    page_count: Optional[int] = None
    error: Optional[str] = None


@router.post("/{document_id}/process", response_model=ProcessResponse)
async def process_document_endpoint(
    document_id: str,
    request: ProcessRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Process a document and extract text content.

    This endpoint is called by the Next.js frontend after uploading
    a file to S3. It downloads the file, extracts text, and updates
    the database record.
    """
    logger.info(
        "Processing document",
        document_id=document_id,
        mime_type=request.mime_type,
    )

    try:
        # Update status to processing
        await db.execute(
            update(Document)
            .where(Document.id == document_id)
            .where(Document.userId == request.user_id)
            .values(status=DocumentStatus.PROCESSING.value)
        )
        await db.commit()

        # Extract text
        text_content, page_count = process_document(
            request.storage_key,
            request.mime_type,
        )

        if not text_content or len(text_content.strip()) < 10:
            raise ValueError("No text content could be extracted from the document")

        # Update database with results
        await db.execute(
            update(Document)
            .where(Document.id == document_id)
            .where(Document.userId == request.user_id)
            .values(
                status=DocumentStatus.READY.value,
                textContent=text_content,
                pageCount=page_count,
                processedAt=datetime.now(timezone.utc),
                error=None,
            )
        )
        await db.commit()

        logger.info(
            "Document processed successfully",
            document_id=document_id,
            page_count=page_count,
            text_length=len(text_content),
        )

        return ProcessResponse(
            success=True,
            text_content=text_content[:500] + "..." if len(text_content) > 500 else text_content,
            page_count=page_count,
        )

    except Exception as e:
        error_message = str(e)
        logger.error(
            "Document processing failed",
            document_id=document_id,
            error=error_message,
        )

        # Update database with error
        await db.execute(
            update(Document)
            .where(Document.id == document_id)
            .where(Document.userId == request.user_id)
            .values(
                status=DocumentStatus.ERROR.value,
                error=error_message[:500],
            )
        )
        await db.commit()

        return ProcessResponse(
            success=False,
            error=error_message,
        )


@router.get("/{document_id}/status")
async def get_document_status(
    document_id: str,
    user_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get the processing status of a document."""
    result = await db.execute(
        select(
            Document.status,
            Document.error,
            Document.pageCount,
            Document.processedAt,
        )
        .where(Document.id == document_id)
        .where(Document.userId == user_id)
    )
    row = result.first()

    if not row:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "status": row.status,
        "error": row.error,
        "pageCount": row.pageCount,
        "processedAt": row.processedAt.isoformat() if row.processedAt else None,
    }
