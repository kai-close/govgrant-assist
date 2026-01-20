# Documents Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the `/dashboard/documents` page with file upload, text extraction, and presentation generation from documents.

**Architecture:** Files upload to MinIO via presigned URLs, metadata stored in PostgreSQL. FastAPI backend extracts text using pypdf/python-docx/python-pptx. Frontend polls for processing status. Existing `generateFromDocument` tRPC mutation handles AI generation.

**Tech Stack:** Next.js 15, tRPC, Drizzle ORM, FastAPI, boto3, pypdf, python-docx, python-pptx, MinIO/S3

---

## Phase 1: Backend Document Processor

### Task 1.1: Create Document Processor Service

**Files:**
- Create: `apps/backend/app/services/document_processor.py`

**Step 1: Create the document processor service**

```python
"""
Document text extraction service.
Supports PDF, DOCX, DOC, PPT, PPTX files.
"""

import io
import tempfile
from typing import Optional, Tuple

import boto3
from botocore.config import Config
import pypdf
from docx import Document as DocxDocument
from pptx import Presentation as PptxPresentation

from app.config import settings


def get_s3_client():
    """Create S3 client for MinIO."""
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        config=Config(signature_version="s3v4"),
    )


def download_from_s3(storage_key: str) -> bytes:
    """Download file from S3/MinIO."""
    s3 = get_s3_client()
    response = s3.get_object(Bucket=settings.s3_bucket, Key=storage_key)
    return response["Body"].read()


def extract_text_from_pdf(file_bytes: bytes) -> Tuple[str, int]:
    """Extract text from PDF file."""
    reader = pypdf.PdfReader(io.BytesIO(file_bytes))
    page_count = len(reader.pages)

    text_parts = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            text_parts.append(text)

    return "\n\n".join(text_parts), page_count


def extract_text_from_docx(file_bytes: bytes) -> Tuple[str, int]:
    """Extract text from DOCX file."""
    doc = DocxDocument(io.BytesIO(file_bytes))

    text_parts = []
    for paragraph in doc.paragraphs:
        if paragraph.text.strip():
            text_parts.append(paragraph.text)

    # Also extract from tables
    for table in doc.tables:
        for row in table.rows:
            row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
            if row_text:
                text_parts.append(row_text)

    # Estimate page count (roughly 500 words per page)
    word_count = sum(len(p.split()) for p in text_parts)
    page_count = max(1, word_count // 500)

    return "\n\n".join(text_parts), page_count


def extract_text_from_pptx(file_bytes: bytes) -> Tuple[str, int]:
    """Extract text from PPTX file."""
    prs = PptxPresentation(io.BytesIO(file_bytes))
    page_count = len(prs.slides)

    text_parts = []
    for i, slide in enumerate(prs.slides, 1):
        slide_texts = [f"--- Slide {i} ---"]
        for shape in slide.shapes:
            if hasattr(shape, "text") and shape.text.strip():
                slide_texts.append(shape.text)
        if len(slide_texts) > 1:  # More than just the header
            text_parts.append("\n".join(slide_texts))

    return "\n\n".join(text_parts), page_count


def process_document(storage_key: str, mime_type: str) -> Tuple[str, int]:
    """
    Process document and extract text.

    Args:
        storage_key: S3 storage key
        mime_type: MIME type of the file

    Returns:
        Tuple of (extracted_text, page_count)

    Raises:
        ValueError: If file type not supported or extraction fails
    """
    # Download file
    file_bytes = download_from_s3(storage_key)

    if not file_bytes:
        raise ValueError("Downloaded file is empty")

    # Extract based on MIME type
    if mime_type == "application/pdf":
        return extract_text_from_pdf(file_bytes)
    elif mime_type in [
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
    ]:
        return extract_text_from_docx(file_bytes)
    elif mime_type in [
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.ms-powerpoint",
    ]:
        return extract_text_from_pptx(file_bytes)
    else:
        raise ValueError(f"Unsupported file type: {mime_type}")
```

**Step 2: Verify syntax**

Run: `cd apps/backend && source venv/bin/activate && python -m py_compile app/services/document_processor.py`
Expected: No output (success)

**Step 3: Commit**

```bash
git add apps/backend/app/services/document_processor.py
git commit -m "feat(backend): add document text extraction service"
```

---

### Task 1.2: Create Documents API Endpoint

**Files:**
- Create: `apps/backend/app/api/v1/documents.py`
- Modify: `apps/backend/app/api/v1/__init__.py`

**Step 1: Create the documents router**

```python
"""
Documents API endpoints.
Handles document processing requests from the Next.js frontend.
"""

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import structlog
import asyncpg

from app.config import settings
from app.services.document_processor import process_document
from app.db.session import get_db_pool

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

    pool = await get_db_pool()

    try:
        # Update status to processing
        async with pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE documents
                SET status = 'processing'
                WHERE id = $1 AND user_id = $2
                """,
                UUID(document_id),
                UUID(request.user_id),
            )

        # Extract text
        text_content, page_count = process_document(
            request.storage_key,
            request.mime_type,
        )

        if not text_content or len(text_content.strip()) < 10:
            raise ValueError("No text content could be extracted from the document")

        # Update database with results
        async with pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE documents
                SET
                    status = 'ready',
                    text_content = $1,
                    page_count = $2,
                    processed_at = $3,
                    error = NULL
                WHERE id = $4 AND user_id = $5
                """,
                text_content,
                page_count,
                datetime.now(timezone.utc),
                UUID(document_id),
                UUID(request.user_id),
            )

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
        async with pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE documents
                SET status = 'error', error = $1
                WHERE id = $2 AND user_id = $3
                """,
                error_message[:500],
                UUID(document_id),
                UUID(request.user_id),
            )

        return ProcessResponse(
            success=False,
            error=error_message,
        )


@router.get("/{document_id}/status")
async def get_document_status(
    document_id: str,
    user_id: str,
):
    """Get the processing status of a document."""
    pool = await get_db_pool()

    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT status, error, page_count, processed_at
            FROM documents
            WHERE id = $1 AND user_id = $2
            """,
            UUID(document_id),
            UUID(user_id),
        )

    if not row:
        raise HTTPException(status_code=404, detail="Document not found")

    return {
        "status": row["status"],
        "error": row["error"],
        "pageCount": row["page_count"],
        "processedAt": row["processed_at"].isoformat() if row["processed_at"] else None,
    }
```

**Step 2: Add router to __init__.py**

Modify `apps/backend/app/api/v1/__init__.py`:

```python
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
```

**Step 3: Verify syntax**

Run: `cd apps/backend && source venv/bin/activate && python -m py_compile app/api/v1/documents.py`
Expected: No output (success)

**Step 4: Commit**

```bash
git add apps/backend/app/api/v1/documents.py apps/backend/app/api/v1/__init__.py
git commit -m "feat(backend): add documents processing API endpoint"
```

---

## Phase 2: tRPC Document Router

### Task 2.1: Create Document tRPC Router

**Files:**
- Create: `apps/web/src/lib/trpc/routers/document.ts`
- Modify: `apps/web/src/lib/trpc/routers/index.ts`

**Step 1: Create the document router**

```typescript
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, desc, and } from "drizzle-orm";
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { nanoid } from "nanoid";
import {
  createTRPCRouter,
  protectedProcedure,
} from "../server";
import { documents } from "@/lib/db/schema";

// S3 client for MinIO
const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
  region: process.env.S3_REGION || "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "minioadmin",
    secretAccessKey: process.env.S3_SECRET_KEY || "minioadmin",
  },
  forcePathStyle: true, // Required for MinIO
});

const BUCKET = process.env.S3_BUCKET || "xisle";
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
];

export const documentRouter = createTRPCRouter({
  /**
   * List user's documents
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.db.query.documents.findMany({
        where: eq(documents.userId, ctx.user.id),
        orderBy: [desc(documents.createdAt)],
        limit: input.limit + 1,
      });

      let nextCursor: string | undefined = undefined;
      if (items.length > input.limit) {
        const nextItem = items.pop();
        nextCursor = nextItem?.id;
      }

      return {
        items,
        nextCursor,
      };
    }),

  /**
   * Get single document by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const document = await ctx.db.query.documents.findFirst({
        where: and(
          eq(documents.id, input.id),
          eq(documents.userId, ctx.user.id)
        ),
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      return document;
    }),

  /**
   * Get upload URL for new document
   */
  getUploadUrl: protectedProcedure
    .input(
      z.object({
        filename: z.string().min(1).max(255),
        mimeType: z.string(),
        size: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Validate file type
      if (!ALLOWED_MIME_TYPES.includes(input.mimeType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "File type not supported. Allowed: PDF, DOCX, DOC, PPT, PPTX",
        });
      }

      // Validate file size
      if (input.size > MAX_FILE_SIZE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "File too large. Maximum size is 50MB",
        });
      }

      // Generate storage key
      const extension = input.filename.split(".").pop() || "bin";
      const storageKey = `documents/${ctx.user.id}/${nanoid()}.${extension}`;

      // Generate presigned URL
      const command = new PutObjectCommand({
        Bucket: BUCKET,
        Key: storageKey,
        ContentType: input.mimeType,
        ContentLength: input.size,
      });

      const uploadUrl = await getSignedUrl(s3Client, command, {
        expiresIn: 300, // 5 minutes
      });

      return {
        uploadUrl,
        storageKey,
      };
    }),

  /**
   * Create document record after upload
   */
  create: protectedProcedure
    .input(
      z.object({
        filename: z.string().min(1).max(255),
        mimeType: z.string(),
        size: z.number().positive(),
        storageKey: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Create database record
      const [document] = await ctx.db
        .insert(documents)
        .values({
          userId: ctx.user.id,
          filename: input.filename,
          mimeType: input.mimeType,
          size: input.size,
          storageKey: input.storageKey,
          status: "pending",
        })
        .returning();

      // Trigger backend processing
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

      try {
        const response = await fetch(`${backendUrl}/documents/${document.id}/process`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            document_id: document.id,
            storage_key: input.storageKey,
            mime_type: input.mimeType,
            user_id: ctx.user.id,
          }),
        });

        if (!response.ok) {
          console.error("Backend processing request failed:", await response.text());
        }
      } catch (error) {
        console.error("Failed to trigger document processing:", error);
        // Don't fail the mutation - document is created, processing can be retried
      }

      return document;
    }),

  /**
   * Get document status (for polling)
   */
  getStatus: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const document = await ctx.db.query.documents.findFirst({
        where: and(
          eq(documents.id, input.id),
          eq(documents.userId, ctx.user.id)
        ),
        columns: {
          id: true,
          status: true,
          error: true,
          pageCount: true,
          processedAt: true,
        },
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      return document;
    }),

  /**
   * Delete document
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Get document first
      const document = await ctx.db.query.documents.findFirst({
        where: and(
          eq(documents.id, input.id),
          eq(documents.userId, ctx.user.id)
        ),
      });

      if (!document) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Document not found",
        });
      }

      // Delete from S3
      try {
        const command = new DeleteObjectCommand({
          Bucket: BUCKET,
          Key: document.storageKey,
        });
        await s3Client.send(command);
      } catch (error) {
        console.error("Failed to delete from S3:", error);
        // Continue with DB deletion even if S3 fails
      }

      // Delete from database
      await ctx.db
        .delete(documents)
        .where(eq(documents.id, input.id));

      return { success: true };
    }),
});
```

**Step 2: Add to index.ts**

Modify `apps/web/src/lib/trpc/routers/index.ts`:

```typescript
import { createTRPCRouter } from "../server";
import { presentationRouter } from "./presentation";
import { templateRouter } from "./template";
import { userRouter } from "./user";
import { aiRouter } from "./ai";
import { exportRouter } from "./export";
import { commentsRouter } from "./comments";
import { documentRouter } from "./document";

/**
 * Main tRPC router
 * Add all sub-routers here
 */
export const appRouter = createTRPCRouter({
  presentation: presentationRouter,
  template: templateRouter,
  user: userRouter,
  ai: aiRouter,
  export: exportRouter,
  comments: commentsRouter,
  document: documentRouter,
});

export type AppRouter = typeof appRouter;
```

**Step 3: Install AWS SDK**

Run: `cd apps/web && pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner`

**Step 4: Verify TypeScript compiles**

Run: `cd apps/web && pnpm typecheck`
Expected: No errors

**Step 5: Commit**

```bash
git add apps/web/src/lib/trpc/routers/document.ts apps/web/src/lib/trpc/routers/index.ts apps/web/package.json apps/web/pnpm-lock.yaml
git commit -m "feat(web): add document tRPC router with S3 upload"
```

---

## Phase 3: Frontend Components

### Task 3.1: Create Upload Modal Component

**Files:**
- Create: `apps/web/src/components/documents/upload-modal.tsx`

**Step 1: Create the upload modal**

```typescript
"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";

interface UploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-powerpoint",
];

const MAX_SIZE = 50 * 1024 * 1024; // 50MB

export function UploadModal({ open, onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const getUploadUrl = trpc.document.getUploadUrl.useMutation();
  const createDocument = trpc.document.create.useMutation();

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return "File type not supported. Please upload PDF, Word, or PowerPoint files.";
    }
    if (file.size > MAX_SIZE) {
      return "File too large. Maximum size is 50MB.";
    }
    return null;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const validationError = validateFile(droppedFile);
      if (validationError) {
        setError(validationError);
        return;
      }
      setFile(droppedFile);
      setError(null);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const validationError = validateFile(selectedFile);
      if (validationError) {
        setError(validationError);
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      // Step 1: Get presigned URL
      setProgress(10);
      const { uploadUrl, storageKey } = await getUploadUrl.mutateAsync({
        filename: file.name,
        mimeType: file.type,
        size: file.size,
      });

      // Step 2: Upload to S3
      setProgress(30);
      const uploadResponse = await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      // Step 3: Create document record
      setProgress(70);
      await createDocument.mutateAsync({
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        storageKey,
      });

      setProgress(100);

      // Success!
      setTimeout(() => {
        setFile(null);
        setUploading(false);
        setProgress(0);
        onSuccess();
        onClose();
      }, 500);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setError(null);
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Upload Document</h2>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${file ? "border-primary-500 bg-primary-50" : "border-border hover:border-primary-300"}
            ${uploading ? "pointer-events-none opacity-50" : ""}
          `}
        >
          {file ? (
            <div>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100">
                <svg className="h-6 w-6 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="font-medium">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              {!uploading && (
                <button
                  onClick={() => setFile(null)}
                  className="mt-2 text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          ) : (
            <div>
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <svg className="h-6 w-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              <p className="text-muted-foreground mb-2">
                Drag and drop your document here, or
              </p>
              <label className="cursor-pointer text-primary-600 hover:underline">
                browse files
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
              <p className="mt-2 text-xs text-muted-foreground">
                PDF, Word, PowerPoint (max 50MB)
              </p>
            </div>
          )}
        </div>

        {uploading && (
          <div className="mt-4">
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-2 text-center text-sm text-muted-foreground">
              {progress < 30 ? "Preparing upload..." :
               progress < 70 ? "Uploading..." :
               progress < 100 ? "Processing..." : "Complete!"}
            </p>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={uploading}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd apps/web && pnpm typecheck`

**Step 3: Commit**

```bash
git add apps/web/src/components/documents/upload-modal.tsx
git commit -m "feat(web): add document upload modal component"
```

---

### Task 3.2: Create Document Card Component

**Files:**
- Create: `apps/web/src/components/documents/document-card.tsx`

**Step 1: Create the document card**

```typescript
"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import type { InferSelectModel } from "drizzle-orm";
import type { documents } from "@/lib/db/schema";

type Document = InferSelectModel<typeof documents>;

interface DocumentCardProps {
  document: Document;
  onGeneratePresentation: (document: Document) => void;
  onDelete: (id: string) => void;
}

const FILE_ICONS: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
  "application/msword": "DOC",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "PPTX",
  "application/vnd.ms-powerpoint": "PPT",
};

export function DocumentCard({ document, onGeneratePresentation, onDelete }: DocumentCardProps) {
  const [status, setStatus] = useState(document.status);
  const [error, setError] = useState(document.error);
  const [showMenu, setShowMenu] = useState(false);

  const { data: statusData } = trpc.document.getStatus.useQuery(
    { id: document.id },
    {
      enabled: status === "pending" || status === "processing",
      refetchInterval: status === "pending" || status === "processing" ? 2000 : false,
    }
  );

  const deleteMutation = trpc.document.delete.useMutation({
    onSuccess: () => onDelete(document.id),
  });

  useEffect(() => {
    if (statusData) {
      setStatus(statusData.status);
      setError(statusData.error);
    }
  }, [statusData]);

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  const fileType = FILE_ICONS[document.mimeType] || "FILE";
  const isReady = status === "ready";
  const isProcessing = status === "pending" || status === "processing";
  const isError = status === "error";

  return (
    <div
      className={`
        relative rounded-lg border bg-card p-4 transition-shadow hover:shadow-md
        ${isError ? "border-red-300 bg-red-50/50" : "border-border"}
        ${isProcessing ? "opacity-70" : ""}
      `}
    >
      {/* File type badge */}
      <div className="mb-3 flex items-start justify-between">
        <div
          className={`
            inline-flex items-center rounded px-2 py-1 text-xs font-medium
            ${fileType === "PDF" ? "bg-red-100 text-red-700" : ""}
            ${fileType === "DOCX" || fileType === "DOC" ? "bg-blue-100 text-blue-700" : ""}
            ${fileType === "PPTX" || fileType === "PPT" ? "bg-orange-100 text-orange-700" : ""}
          `}
        >
          {fileType}
        </div>

        {/* Status badge */}
        {isProcessing && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Processing...
          </div>
        )}
        {isReady && (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Ready
          </div>
        )}
        {isError && (
          <div className="flex items-center gap-1 text-xs text-red-600">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            Error
          </div>
        )}
      </div>

      {/* Filename */}
      <h3 className="font-medium truncate" title={document.filename}>
        {document.filename}
      </h3>

      {/* Error message */}
      {isError && error && (
        <p className="mt-1 text-xs text-red-600 line-clamp-2">{error}</p>
      )}

      {/* Metadata */}
      <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
        <span>{formatSize(document.size)}</span>
        <span>•</span>
        <span>{formatDate(document.createdAt)}</span>
        {document.pageCount && (
          <>
            <span>•</span>
            <span>{document.pageCount} pages</span>
          </>
        )}
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => onGeneratePresentation(document)}
          disabled={!isReady}
          className="flex-1 rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Generate Presentation
        </button>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="rounded-lg border border-border p-2 hover:bg-accent"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
            </svg>
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border border-border bg-card py-1 shadow-lg">
                <button
                  onClick={() => {
                    deleteMutation.mutate({ id: document.id });
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/documents/document-card.tsx
git commit -m "feat(web): add document card component with status polling"
```

---

### Task 3.3: Create Generate Modal Component

**Files:**
- Create: `apps/web/src/components/documents/generate-modal.tsx`

**Step 1: Create the generate modal**

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import type { InferSelectModel } from "drizzle-orm";
import type { documents } from "@/lib/db/schema";

type Document = InferSelectModel<typeof documents>;

interface GenerateModalProps {
  document: Document | null;
  onClose: () => void;
}

export function GenerateModal({ document, onClose }: GenerateModalProps) {
  const router = useRouter();
  const [slideCount, setSlideCount] = useState(8);
  const [focusAreas, setFocusAreas] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateMutation = trpc.ai.generateFromDocument.useMutation({
    onSuccess: (data) => {
      router.push(`/editor/${data.presentationId}`);
    },
    onError: (err) => {
      setError(err.message);
      setGenerating(false);
    },
  });

  const handleGenerate = () => {
    if (!document) return;

    setGenerating(true);
    setError(null);

    generateMutation.mutate({
      documentId: document.id,
      slideCount,
      focusAreas: focusAreas.trim()
        ? focusAreas.split(",").map((s) => s.trim()).filter(Boolean)
        : undefined,
    });
  };

  if (!document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Generate Presentation</h2>
          <button
            onClick={onClose}
            disabled={generating}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4 rounded-lg bg-muted/50 p-3">
          <p className="text-sm font-medium">{document.filename}</p>
          <p className="text-xs text-muted-foreground">
            {document.pageCount ? `${document.pageCount} pages` : "Document ready"}
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Number of Slides
            </label>
            <input
              type="range"
              min={3}
              max={30}
              value={slideCount}
              onChange={(e) => setSlideCount(parseInt(e.target.value))}
              className="w-full"
              disabled={generating}
            />
            <div className="flex justify-between text-xs text-muted-foreground mt-1">
              <span>3</span>
              <span className="font-medium text-foreground">{slideCount} slides</span>
              <span>30</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Focus Areas <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={focusAreas}
              onChange={(e) => setFocusAreas(e.target.value)}
              placeholder="e.g., key findings, recommendations, data analysis"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              disabled={generating}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Comma-separated topics to emphasize
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={generating}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {generating && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            {generating ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/documents/generate-modal.tsx
git commit -m "feat(web): add presentation generation modal"
```

---

### Task 3.4: Create Empty State Component

**Files:**
- Create: `apps/web/src/components/documents/empty-state.tsx`

**Step 1: Create the empty state**

```typescript
interface EmptyStateProps {
  onUpload: () => void;
}

export function EmptyState({ onUpload }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <svg
          className="h-8 w-8 text-muted-foreground"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium">No documents yet</h3>
      <p className="mt-1 text-sm text-muted-foreground max-w-sm">
        Upload PDF, Word, or PowerPoint files to generate AI-powered presentations from your content.
      </p>
      <button
        onClick={onUpload}
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Upload Document
      </button>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/src/components/documents/empty-state.tsx
git commit -m "feat(web): add documents empty state component"
```

---

## Phase 4: Documents Page

### Task 4.1: Create Documents Page

**Files:**
- Create: `apps/web/src/app/(dashboard)/dashboard/documents/page.tsx`

**Step 1: Create the page**

```typescript
"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { UploadModal } from "@/components/documents/upload-modal";
import { DocumentCard } from "@/components/documents/document-card";
import { GenerateModal } from "@/components/documents/generate-modal";
import { EmptyState } from "@/components/documents/empty-state";
import type { InferSelectModel } from "drizzle-orm";
import type { documents } from "@/lib/db/schema";

type Document = InferSelectModel<typeof documents>;

export default function DocumentsPage() {
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const { data, isLoading, refetch } = trpc.document.list.useQuery({
    limit: 50,
  });

  const handleUploadSuccess = () => {
    refetch();
  };

  const handleDelete = () => {
    refetch();
  };

  const documents = data?.items || [];

  return (
    <div className="container mx-auto max-w-6xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-sm text-muted-foreground">
            Upload documents to generate AI-powered presentations
          </p>
        </div>
        <button
          onClick={() => setUploadModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Upload
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-40 animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <EmptyState onUpload={() => setUploadModalOpen(true)} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              onGeneratePresentation={setSelectedDocument}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <UploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        onSuccess={handleUploadSuccess}
      />

      <GenerateModal
        document={selectedDocument}
        onClose={() => setSelectedDocument(null)}
      />
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd apps/web && pnpm typecheck`
Expected: No errors

**Step 3: Test in browser**

Run: Open `http://localhost:3000/dashboard/documents`
Expected: Page loads with empty state or document grid

**Step 4: Commit**

```bash
git add apps/web/src/app/\(dashboard\)/dashboard/documents/page.tsx
git commit -m "feat(web): add documents page with upload and generation"
```

---

## Phase 5: Final Integration & Testing

### Task 5.1: Restart Backend & Test Processing

**Step 1: Restart backend**

Run: `cd apps/backend && source venv/bin/activate && pkill -f uvicorn; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &`

**Step 2: Verify backend endpoint**

Run: `curl -s http://localhost:8000/docs | grep -o "documents"`
Expected: Shows "documents" (endpoint registered)

**Step 3: Commit any remaining changes**

```bash
git add -A
git commit -m "feat: complete documents page implementation"
```

---

### Task 5.2: Create Index Export for Components

**Files:**
- Create: `apps/web/src/components/documents/index.ts`

**Step 1: Create barrel export**

```typescript
export { UploadModal } from "./upload-modal";
export { DocumentCard } from "./document-card";
export { GenerateModal } from "./generate-modal";
export { EmptyState } from "./empty-state";
```

**Step 2: Commit**

```bash
git add apps/web/src/components/documents/index.ts
git commit -m "chore: add barrel export for document components"
```

---

## Summary

| Phase | Tasks | Description |
|-------|-------|-------------|
| 1 | 1.1-1.2 | Backend document processor + API |
| 2 | 2.1 | tRPC document router with S3 |
| 3 | 3.1-3.4 | Frontend components |
| 4 | 4.1 | Documents page |
| 5 | 5.1-5.2 | Integration & cleanup |

**Total: 8 tasks, ~12 commits**
