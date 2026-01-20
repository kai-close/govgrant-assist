"""
Document text extraction service.
Supports PDF, DOCX, DOC, PPT, PPTX files.
"""

import io
from typing import Tuple

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
