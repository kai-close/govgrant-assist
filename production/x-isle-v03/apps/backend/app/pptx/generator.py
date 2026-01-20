"""
PPTX Generator

PowerPoint generation using python-pptx.
"""

import io
import re
from typing import List, Optional, Any
from html.parser import HTMLParser

from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
import structlog


logger = structlog.get_logger()


# Standard slide dimensions (16:9)
SLIDE_WIDTH = Inches(13.333)
SLIDE_HEIGHT = Inches(7.5)

# Canvas to PPTX conversion (960x540 → 13.333"x7.5")
SCALE_X = SLIDE_WIDTH / 960
SCALE_Y = SLIDE_HEIGHT / 540


class HTMLTextExtractor(HTMLParser):
    """Simple HTML to text converter."""

    def __init__(self):
        super().__init__()
        self.text = []
        self.current_tag = None

    def handle_starttag(self, tag, attrs):
        self.current_tag = tag
        if tag in ("li", "br"):
            self.text.append("\n• " if tag == "li" else "\n")

    def handle_endtag(self, tag):
        if tag in ("p", "div", "h1", "h2", "h3"):
            self.text.append("\n")
        self.current_tag = None

    def handle_data(self, data):
        self.text.append(data.strip())

    def get_text(self) -> str:
        return " ".join(self.text).strip()


def html_to_text(html: str) -> str:
    """Convert HTML to plain text."""
    if not html:
        return ""

    parser = HTMLTextExtractor()
    parser.feed(html)
    text = parser.get_text()

    # Clean up extra whitespace
    text = re.sub(r"\n\s*\n", "\n\n", text)
    text = re.sub(r" +", " ", text)

    return text.strip()


def hex_to_rgb(hex_color: str) -> RGBColor:
    """Convert hex color to RGBColor."""
    hex_color = hex_color.lstrip("#")
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    return RGBColor(r, g, b)


class PPTXGenerator:
    """
    Generate PowerPoint presentations from slide data.
    """

    def __init__(self):
        self.prs: Optional[Presentation] = None

    async def generate(
        self,
        title: str,
        slides: List[dict],
        theme: dict,
    ) -> bytes:
        """
        Generate a PPTX file from slide data.

        Args:
            title: Presentation title
            slides: List of slide data dictionaries
            theme: Theme settings

        Returns:
            PPTX file as bytes
        """
        logger.info(
            "Generating PPTX",
            title=title,
            slide_count=len(slides),
        )

        # Create presentation
        self.prs = Presentation()
        self.prs.slide_width = SLIDE_WIDTH
        self.prs.slide_height = SLIDE_HEIGHT

        # Apply theme
        self._apply_theme(theme)

        # Add title slide
        self._add_title_slide(title, theme)

        # Add content slides
        for slide_data in slides:
            self._add_content_slide(slide_data, theme)

        # Save to bytes
        output = io.BytesIO()
        self.prs.save(output)
        output.seek(0)

        logger.info("PPTX generated", bytes=output.getbuffer().nbytes)

        return output.getvalue()

    def _apply_theme(self, theme: dict):
        """Apply theme colors to presentation."""
        # Note: python-pptx has limited theme support
        # Colors are applied per-shape instead
        pass

    def _add_title_slide(self, title: str, theme: dict):
        """Add a title slide."""
        blank_layout = self.prs.slide_layouts[6]  # Blank layout
        slide = self.prs.slides.add_slide(blank_layout)

        # Background color
        bg_color = theme.get("backgroundColor", "#ffffff")
        self._set_slide_background(slide, bg_color)

        # Title text box
        left = Inches(0.5)
        top = Inches(2.5)
        width = SLIDE_WIDTH - Inches(1)
        height = Inches(2)

        txBox = slide.shapes.add_textbox(left, top, width, height)
        tf = txBox.text_frame
        tf.word_wrap = True

        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(48)
        p.font.bold = True
        p.font.color.rgb = hex_to_rgb(theme.get("textColor", "#1f2937"))
        p.alignment = PP_ALIGN.CENTER

        # Font family
        font_family = theme.get("fontFamily", "Arial")
        p.font.name = font_family

    def _add_content_slide(self, slide_data: dict, theme: dict):
        """Add a content slide."""
        blank_layout = self.prs.slide_layouts[6]  # Blank layout
        slide = self.prs.slides.add_slide(blank_layout)

        # Background
        bg_color = theme.get("backgroundColor", "#ffffff")
        self._set_slide_background(slide, bg_color)

        # Add cards
        cards = slide_data.get("cards", [])
        for card in cards:
            self._add_card(slide, card, theme)

    def _add_card(self, slide, card: dict, theme: dict):
        """Add a card to the slide."""
        card_type = card.get("type", "text")
        position = card.get("position", {})
        content = card.get("content", {})
        style = card.get("style", {})

        # Convert position to PPTX units
        left = int(position.get("x", 0) * SCALE_X)
        top = int(position.get("y", 0) * SCALE_Y)
        width = int(position.get("width", 400) * SCALE_X)
        height = int(position.get("height", 200) * SCALE_Y)

        if card_type == "text":
            self._add_text_card(slide, left, top, width, height, content, style, theme)
        elif card_type == "image":
            self._add_image_card(slide, left, top, width, height, content)
        elif card_type == "shape":
            self._add_shape_card(slide, left, top, width, height, content, style)
        elif card_type == "table":
            self._add_table_card(slide, left, top, width, height, content)

    def _add_text_card(
        self,
        slide,
        left: int,
        top: int,
        width: int,
        height: int,
        content: dict,
        style: dict,
        theme: dict,
    ):
        """Add a text card."""
        txBox = slide.shapes.add_textbox(left, top, width, height)
        tf = txBox.text_frame
        tf.word_wrap = True

        # Vertical alignment
        tf.anchor = MSO_ANCHOR.TOP

        # Get text content
        html = content.get("html", "") or content.get("text", "")
        text = html_to_text(html)

        if not text:
            return

        # Parse text into paragraphs
        paragraphs = text.split("\n")

        for i, para_text in enumerate(paragraphs):
            if not para_text.strip():
                continue

            if i == 0:
                p = tf.paragraphs[0]
            else:
                p = tf.add_paragraph()

            p.text = para_text.strip()

            # Font settings
            font_size = style.get("fontSize", 16)
            if isinstance(font_size, str):
                font_size = int(font_size.replace("px", ""))
            p.font.size = Pt(font_size)

            p.font.color.rgb = hex_to_rgb(
                style.get("color", theme.get("textColor", "#1f2937"))
            )

            font_family = style.get("fontFamily", theme.get("fontFamily", "Arial"))
            p.font.name = font_family

            # Alignment
            align = style.get("textAlign", "left")
            if align == "center":
                p.alignment = PP_ALIGN.CENTER
            elif align == "right":
                p.alignment = PP_ALIGN.RIGHT
            else:
                p.alignment = PP_ALIGN.LEFT

        # Background color if specified
        bg_color = style.get("backgroundColor")
        if bg_color:
            txBox.fill.solid()
            txBox.fill.fore_color.rgb = hex_to_rgb(bg_color)

    def _add_image_card(
        self,
        slide,
        left: int,
        top: int,
        width: int,
        height: int,
        content: dict,
    ):
        """Add an image card (placeholder if URL)."""
        # TODO: Download and embed image from URL
        # For now, add a placeholder shape
        image_url = content.get("src") or content.get("imageUrl")

        if not image_url:
            return

        # Add placeholder rectangle
        shape = slide.shapes.add_shape(
            MSO_SHAPE.RECTANGLE, left, top, width, height
        )
        shape.fill.solid()
        shape.fill.fore_color.rgb = RGBColor(229, 231, 235)  # Gray-200

        # Add placeholder text
        tf = shape.text_frame
        tf.paragraphs[0].text = "[Image]"
        tf.paragraphs[0].font.size = Pt(12)
        tf.paragraphs[0].font.color.rgb = RGBColor(107, 114, 128)
        tf.paragraphs[0].alignment = PP_ALIGN.CENTER

        logger.debug("Added image placeholder", url=image_url)

    def _add_shape_card(
        self,
        slide,
        left: int,
        top: int,
        width: int,
        height: int,
        content: dict,
        style: dict,
    ):
        """Add a shape card."""
        shape_type = content.get("shapeType", "rectangle")

        # Map shape types
        shape_map = {
            "rectangle": MSO_SHAPE.RECTANGLE,
            "rounded-rectangle": MSO_SHAPE.ROUNDED_RECTANGLE,
            "circle": MSO_SHAPE.OVAL,
            "oval": MSO_SHAPE.OVAL,
            "triangle": MSO_SHAPE.ISOSCELES_TRIANGLE,
            "arrow": MSO_SHAPE.RIGHT_ARROW,
        }

        mso_shape = shape_map.get(shape_type, MSO_SHAPE.RECTANGLE)
        shape = slide.shapes.add_shape(mso_shape, left, top, width, height)

        # Fill color
        fill_color = style.get("backgroundColor", "#3b82f6")
        shape.fill.solid()
        shape.fill.fore_color.rgb = hex_to_rgb(fill_color)

        # Border
        border_color = style.get("borderColor")
        if border_color:
            shape.line.color.rgb = hex_to_rgb(border_color)
            shape.line.width = Pt(style.get("borderWidth", 1))

    def _add_table_card(
        self,
        slide,
        left: int,
        top: int,
        width: int,
        height: int,
        content: dict,
    ):
        """Add a table card."""
        table_data = content.get("tableData", [])
        if not table_data:
            return

        rows = len(table_data)
        cols = len(table_data[0]) if table_data else 1

        table = slide.shapes.add_table(rows, cols, left, top, width, height).table

        for i, row in enumerate(table_data):
            for j, cell_text in enumerate(row):
                cell = table.cell(i, j)
                cell.text = str(cell_text)
                cell.text_frame.paragraphs[0].font.size = Pt(12)

    def _set_slide_background(self, slide, color: str):
        """Set slide background color."""
        background = slide.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = hex_to_rgb(color)
