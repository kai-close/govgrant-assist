"""
Test Configuration and Fixtures

Shared fixtures for backend tests.
"""

import pytest
import sys
import os

# Add the app directory to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))


@pytest.fixture
def mock_user():
    """Mock authenticated user data."""
    return {
        "id": "test-user-id-12345",
        "email": "test@example.com",
        "name": "Test User",
        "image": None,
    }


@pytest.fixture
def mock_presentation():
    """Mock presentation data."""
    return {
        "id": "test-presentation-id",
        "title": "Test Presentation",
        "description": "A test presentation",
        "ownerId": "test-user-id-12345",
        "theme": {
            "primaryColor": "#3b82f6",
            "backgroundColor": "#ffffff",
            "fontFamily": "Inter",
            "headingFont": "Inter",
        },
        "slideCount": 1,
        "wordCount": 0,
    }


@pytest.fixture
def mock_slide():
    """Mock slide data."""
    return {
        "id": "test-slide-id",
        "order": 0,
        "layout": "blank",
        "cards": [],
    }


@pytest.fixture
def mock_card():
    """Mock card data."""
    return {
        "id": "test-card-id",
        "type": "text",
        "x": 100,
        "y": 100,
        "width": 400,
        "height": 200,
        "content": {"text": "Test content"},
        "style": {},
    }
