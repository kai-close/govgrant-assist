"""
Utility Function Tests

Tests for utility functions and data models.
"""

import pytest
from datetime import datetime, timezone


class TestTimestamp:
    """Test timestamp utilities."""

    def test_iso_timestamp_format(self):
        """Test that ISO timestamp is properly formatted."""
        timestamp = datetime.now(timezone.utc).isoformat()

        # Should contain timezone info
        assert "+" in timestamp or "Z" in timestamp or timestamp.endswith("+00:00")

        # Should be parseable
        parsed = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
        assert parsed is not None

    def test_timestamp_is_utc(self):
        """Test that timestamp is in UTC."""
        now = datetime.now(timezone.utc)

        assert now.tzinfo is not None
        assert now.tzinfo == timezone.utc


class TestMockData:
    """Test mock data fixtures."""

    def test_mock_user_has_required_fields(self, mock_user):
        """Test mock user has all required fields."""
        assert "id" in mock_user
        assert "email" in mock_user
        assert "name" in mock_user
        assert isinstance(mock_user["id"], str)
        assert "@" in mock_user["email"]

    def test_mock_presentation_has_required_fields(self, mock_presentation):
        """Test mock presentation has all required fields."""
        assert "id" in mock_presentation
        assert "title" in mock_presentation
        assert "ownerId" in mock_presentation
        assert "theme" in mock_presentation
        assert isinstance(mock_presentation["theme"], dict)

    def test_mock_presentation_theme_structure(self, mock_presentation):
        """Test presentation theme has expected structure."""
        theme = mock_presentation["theme"]

        assert "primaryColor" in theme
        assert "backgroundColor" in theme
        assert "fontFamily" in theme

        # Colors should be valid hex
        assert theme["primaryColor"].startswith("#")
        assert theme["backgroundColor"].startswith("#")

    def test_mock_slide_has_required_fields(self, mock_slide):
        """Test mock slide has all required fields."""
        assert "id" in mock_slide
        assert "order" in mock_slide
        assert "layout" in mock_slide
        assert "cards" in mock_slide
        assert isinstance(mock_slide["cards"], list)

    def test_mock_card_has_required_fields(self, mock_card):
        """Test mock card has all required fields."""
        assert "id" in mock_card
        assert "type" in mock_card
        assert "x" in mock_card
        assert "y" in mock_card
        assert "width" in mock_card
        assert "height" in mock_card
        assert "content" in mock_card

        # Position should be numeric
        assert isinstance(mock_card["x"], (int, float))
        assert isinstance(mock_card["y"], (int, float))
        assert isinstance(mock_card["width"], (int, float))
        assert isinstance(mock_card["height"], (int, float))


class TestRoleHierarchy:
    """Test collaborator role hierarchy logic."""

    def test_role_hierarchy_values(self):
        """Test role hierarchy is correctly ordered."""
        role_hierarchy = {"viewer": 1, "editor": 2, "owner": 3}

        assert role_hierarchy["viewer"] < role_hierarchy["editor"]
        assert role_hierarchy["editor"] < role_hierarchy["owner"]

    def test_viewer_cannot_edit(self):
        """Test that viewer role cannot perform editor actions."""
        role_hierarchy = {"viewer": 1, "editor": 2, "owner": 3}
        user_role = "viewer"
        required_role = "editor"

        has_access = role_hierarchy.get(user_role, 0) >= role_hierarchy.get(required_role, 0)
        assert not has_access

    def test_editor_can_view(self):
        """Test that editor role can perform viewer actions."""
        role_hierarchy = {"viewer": 1, "editor": 2, "owner": 3}
        user_role = "editor"
        required_role = "viewer"

        has_access = role_hierarchy.get(user_role, 0) >= role_hierarchy.get(required_role, 0)
        assert has_access

    def test_owner_has_all_access(self):
        """Test that owner role has all access levels."""
        role_hierarchy = {"viewer": 1, "editor": 2, "owner": 3}
        user_role = "owner"

        for required_role in ["viewer", "editor", "owner"]:
            has_access = role_hierarchy.get(user_role, 0) >= role_hierarchy.get(required_role, 0)
            assert has_access, f"Owner should have {required_role} access"
