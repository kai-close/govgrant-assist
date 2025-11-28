"""
Configuration management for GovGrant Assist
Handles environment variables and application settings
"""
import os
from dotenv import load_dotenv

load_dotenv()

# Try to import streamlit for secrets support
try:
    import streamlit as st
    HAS_STREAMLIT = True
except ImportError:
    HAS_STREAMLIT = False

def get_secret(key: str, default=None):
    """Get secret from Streamlit secrets or environment variable"""
    # First try Streamlit secrets (for cloud deployment)
    if HAS_STREAMLIT:
        try:
            return st.secrets.get(key, os.getenv(key, default))
        except (AttributeError, FileNotFoundError):
            pass
    # Fall back to environment variable
    return os.getenv(key, default)

class Config:
    """Application configuration"""

    # Authentication
    APP_PASSWORD = get_secret("APP_PASSWORD", "demo123")

    # File Processing
    MAX_FILE_SIZE_MB = int(get_secret("MAX_FILE_SIZE_MB", "10"))
    MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

    # RAG Configuration
    CHUNK_SIZE = int(get_secret("CHUNK_SIZE", "1000"))
    CHUNK_OVERLAP = int(get_secret("CHUNK_OVERLAP", "100"))
    TOP_K_RESULTS = int(get_secret("TOP_K_RESULTS", "3"))

    # LLM Provider
    LLM_PROVIDER = get_secret("LLM_PROVIDER", "openai").lower()

    # OpenAI Configuration
    OPENAI_API_KEY = get_secret("OPENAI_API_KEY")
    OPENAI_MODEL = get_secret("OPENAI_MODEL", "gpt-4o-mini")

    # Google Gemini Configuration
    GOOGLE_API_KEY = get_secret("GOOGLE_API_KEY")
    GOOGLE_MODEL = get_secret("GOOGLE_MODEL", "gemini-1.5-flash")

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
