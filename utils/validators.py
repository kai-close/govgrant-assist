"""
Validation utilities for GovGrant Assist
Implements all validation rules from PRD Section 2.2
"""
import re
from typing import Tuple, Optional
import pypdf


class FileValidator:
    """Validates uploaded PDF files"""

    @staticmethod
    def validate_pdf(file_buffer, max_size_bytes: int) -> Tuple[bool, Optional[str]]:
        """
        Validate uploaded PDF file

        Args:
            file_buffer: Streamlit uploaded file buffer
            max_size_bytes: Maximum allowed file size

        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check file extension
        if not file_buffer.name.lower().endswith('.pdf'):
            return False, "Invalid File Format. Only PDF files are supported."

        # Check file size
        file_buffer.seek(0, 2)  # Seek to end
        file_size = file_buffer.tell()
        file_buffer.seek(0)  # Reset to beginning

        if file_size > max_size_bytes:
            max_mb = max_size_bytes / (1024 * 1024)
            return False, f"File size exceeds {max_mb}MB limit."

        if file_size == 0:
            return False, "File is empty."

        # Check if PDF is readable and contains text
        try:
            pdf_reader = pypdf.PdfReader(file_buffer)
            file_buffer.seek(0)  # Reset after reading

            if len(pdf_reader.pages) == 0:
                return False, "PDF contains no pages."

            # Check if PDF contains extractable text
            text_found = False
            for page in pdf_reader.pages[:5]:  # Check first 5 pages
                text = page.extract_text()
                if text and len(text.strip()) > 50:
                    text_found = True
                    break

            if not text_found:
                return False, "OCR not supported. Please upload text-PDF with extractable content."

            return True, None

        except Exception as e:
            return False, f"Invalid or corrupted PDF file: {str(e)}"


class FormValidator:
    """Validates user input forms"""

    @staticmethod
    def validate_company_name(name: str) -> Tuple[bool, Optional[str]]:
        """Validate company name - no special chars allowed"""
        if not name or len(name.strip()) == 0:
            return False, "Company name is required."

        if len(name) > 100:
            return False, "Company name must be 100 characters or less."

        # Check for special characters (allow alphanumeric, spaces, &, -, ')
        if not re.match(r"^[a-zA-Z0-9\s&\-']+$", name):
            return False, "Company name contains invalid characters. Only letters, numbers, spaces, &, -, and ' are allowed."

        return True, None

    @staticmethod
    def validate_project_title(title: str) -> Tuple[bool, Optional[str]]:
        """Validate project title - min 5 chars, max 150"""
        if not title or len(title.strip()) < 5:
            return False, "Project title must be at least 5 characters long."

        if len(title) > 150:
            return False, "Project title must be 150 characters or less."

        return True, None

    @staticmethod
    def validate_core_solution(solution: str) -> Tuple[bool, Optional[str]]:
        """Validate core solution - min 50 chars, max 2000 words"""
        if not solution or len(solution.strip()) < 50:
            return False, "Core solution must be at least 50 characters long."

        word_count = len(solution.split())
        if word_count > 2000:
            return False, f"Core solution exceeds 2000 words limit. Current: {word_count} words."

        return True, None

    @staticmethod
    def validate_budget(budget: Optional[float]) -> Tuple[bool, Optional[str]]:
        """Validate requested budget - must be > 0 if provided"""
        if budget is None:
            return True, None  # Budget is optional

        try:
            budget_float = float(budget)
            if budget_float <= 0:
                return False, "Budget must be greater than 0."
            return True, None
        except (ValueError, TypeError):
            return False, "Budget must be a valid number."
