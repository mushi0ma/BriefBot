"""
Tests for Markdown-to-HTML conversion in PDF generator.
"""

from __future__ import annotations

from app.services.pdf_generator import _markdown_to_html


class TestMarkdownToHtml:
    """Test the Markdown-to-HTML conversion for PDF content."""

    def test_empty_string(self):
        assert _markdown_to_html("") == ""

    def test_plain_text(self):
        result = _markdown_to_html("Hello world")
        assert "Hello world" in result

    def test_bullet_list(self):
        md = "- Item 1\n- Item 2\n- Item 3"
        result = _markdown_to_html(md)
        assert "<ul>" in result
        assert "<li>" in result
        assert "Item 1" in result
        assert "Item 2" in result
        assert "Item 3" in result

    def test_numbered_list(self):
        md = "1. First\n2. Second\n3. Third"
        result = _markdown_to_html(md)
        assert "<ol>" in result
        assert "<li>" in result
        assert "First" in result

    def test_bold_text(self):
        md = "This is **bold** text"
        result = _markdown_to_html(md)
        assert "<strong>bold</strong>" in result

    def test_italic_text(self):
        md = "This is *italic* text"
        result = _markdown_to_html(md)
        assert "<em>italic</em>" in result

    def test_mixed_content(self):
        md = "**Задачи:**\n- Дизайн сайта\n- Разработка\n- Тестирование"
        result = _markdown_to_html(md)
        assert "<strong>" in result
        assert "<ul>" in result
        assert "<li>" in result

    def test_cyrillic_text(self):
        md = "Клиент хочет **срочный** проект за *2 недели*"
        result = _markdown_to_html(md)
        assert "Клиент хочет" in result
        assert "<strong>срочный</strong>" in result
        assert "<em>2 недели</em>" in result

    def test_multiline_paragraphs(self):
        md = "Paragraph one.\n\nParagraph two."
        result = _markdown_to_html(md)
        assert "Paragraph one" in result
        assert "Paragraph two" in result
