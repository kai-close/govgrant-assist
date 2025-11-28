"""
Configuration management for GovGrant Assist
Handles environment variables and application settings
"""
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Application configuration"""

    # Authentication
    APP_PASSWORD = os.getenv("APP_PASSWORD", "demo123")

    # File Processing
    MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "10"))
    MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

    # RAG Configuration
    CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1000"))
    CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "100"))
    TOP_K_RESULTS = int(os.getenv("TOP_K_RESULTS", "3"))

    # LLM Provider
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openai").lower()

    # OpenAI Configuration
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    # Google Gemini Configuration
    GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
    GOOGLE_MODEL = os.getenv("GOOGLE_MODEL", "gemini-1.5-flash")

    # Validation
    @classmethod
    def validate(cls):
        """Validate required configuration"""
        if cls.LLM_PROVIDER == "openai" and not cls.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is required when using OpenAI provider")
        if cls.LLM_PROVIDER == "google" and not cls.GOOGLE_API_KEY:
            raise ValueError("GOOGLE_API_KEY is required when using Google provider")

    @classmethod
    def get_api_key(cls):
        """Get the appropriate API key based on provider"""
        if cls.LLM_PROVIDER == "openai":
            return cls.OPENAI_API_KEY
        elif cls.LLM_PROVIDER == "google":
            return cls.GOOGLE_API_KEY
        else:
            raise ValueError(f"Unknown LLM provider: {cls.LLM_PROVIDER}")

    @classmethod
    def get_model_name(cls):
        """Get the appropriate model name based on provider"""
        if cls.LLM_PROVIDER == "openai":
            return cls.OPENAI_MODEL
        elif cls.LLM_PROVIDER == "google":
            return cls.GOOGLE_MODEL
        else:
            raise ValueError(f"Unknown LLM provider: {cls.LLM_PROVIDER}")
