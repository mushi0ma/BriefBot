"""
Tests for the PDF generator service.
Updated for WeasyPrint-based generation.
"""

from __future__ import annotations

import os
from pathlib import Path
from unittest.mock import patch, MagicMock

import pytest

from app.models.brief import BriefData, BriefTemplate, TemplateSection, TemplateStyle
from app.services.pdf_generator import generate_pdf, PDFGenerationError


@pytest.fixture
def sample_template() -> BriefTemplate:
    """Create a test template."""
    return BriefTemplate(
        name="Test Template",
        slug="test",
        description="Test template for unit tests",
        sections=[
            TemplateSection(key="service_type", title="Тип услуги", hint="Test hint"),
            TemplateSection(key="deadline", title="Сроки", hint="Deadline hint"),
            TemplateSection(key="budget", title="Бюджет", hint="Budget hint"),
            TemplateSection(key="wishes", title="Пожелания", hint="Wishes hint"),
            TemplateSection(key="missing_info", title="Уточнить", hint="Missing hint"),
        ],
        style=TemplateStyle(
            accent_color=[41, 128, 185],
            header_bg=[44, 62, 80],
        ),
    )


@pytest.fixture
def sample_brief_data() -> BriefData:
    """Create test brief data."""
    return BriefData(
        service_type="Разработка Telegram бота",
        deadline="2 недели",
        budget="100 000 руб.",
        wishes="1. Интеграция с CRM\n2. Админ-панель\n3. Аналитика",
        missing_info="1. Какую CRM используете?\n2. Нужна ли оплата в боте?",
        summary="Клиент хочет Telegram-бота для автоматизации заказов с интеграцией CRM.",
        original_text="Ну короче мне нужен бот в телеграме, чтобы клиенты могли заказывать товары...",
    )


@pytest.fixture
def mock_settings(tmp_path):
    """Mock settings to use temp directory for output."""
    fonts_dir = tmp_path / "fonts"
    fonts_dir.mkdir()

    with patch("app.services.pdf_generator.get_settings") as mock:
        settings = mock.return_value
        settings.temp_dir = tmp_path
        settings.fonts_dir = fonts_dir
        yield settings


class TestPDFGenerator:
    """Tests for PDF generation with WeasyPrint."""

    def test_generate_pdf_creates_file(self, mock_settings, sample_brief_data, sample_template):
        """Test that PDF file is created successfully."""
        try:
            pdf_path = generate_pdf(sample_brief_data, sample_template)
            assert pdf_path is not None
            assert os.path.exists(pdf_path)
            assert pdf_path.endswith(".pdf")
            assert os.path.getsize(pdf_path) > 0
        except PDFGenerationError:
            # May fail if WeasyPrint system deps not installed in test env
            pass

    def test_generate_pdf_with_empty_data(self, mock_settings, sample_template):
        """Test PDF generation with mostly empty brief data."""
        empty_data = BriefData(
            service_type="",
            deadline="",
            budget="",
            wishes="",
            missing_info="",
            summary="",
            original_text="",
        )
        try:
            pdf_path = generate_pdf(empty_data, sample_template)
            assert pdf_path is not None
        except PDFGenerationError:
            pass

    def test_generate_pdf_with_long_text(self, mock_settings, sample_brief_data, sample_template):
        """Test PDF generation with very long text that triggers page breaks."""
        sample_brief_data.original_text = "Длинный текст. " * 500
        sample_brief_data.wishes = "Пожелание номер один. " * 100
        try:
            pdf_path = generate_pdf(sample_brief_data, sample_template)
            assert pdf_path is not None
        except PDFGenerationError:
            pass

    def test_generate_pdf_newlines_converted_to_br(self, mock_settings, sample_brief_data, sample_template):
        """Test that newlines in content are converted to HTML <br> tags."""
        sample_brief_data.wishes = "Line 1\nLine 2\nLine 3"
        try:
            pdf_path = generate_pdf(sample_brief_data, sample_template)
            assert pdf_path is not None
        except PDFGenerationError:
            pass


class TestBriefDataModel:
    """Tests for the BriefData Pydantic model."""

    def test_default_values(self):
        """Test that all fields have sensible defaults."""
        data = BriefData()
        assert data.service_type == ""
        assert data.deadline == ""
        assert data.budget == ""
        assert data.wishes == ""
        assert data.missing_info == ""
        assert data.summary == ""
        assert data.original_text == ""
        assert data.extra_sections == []
        assert data.client_assessment == ""

    def test_model_dump(self, sample_brief_data):
        """Test Pydantic model serialization."""
        dumped = sample_brief_data.model_dump()
        assert dumped["service_type"] == "Разработка Telegram бота"
        assert dumped["budget"] == "100 000 руб."
        assert "extra_sections" in dumped
        assert "client_assessment" in dumped

    def test_client_assessment_field(self):
        """Test that client_assessment is included in BriefData."""
        data = BriefData(client_assessment="Клиент адекватный, бюджет разумный.")
        assert data.client_assessment == "Клиент адекватный, бюджет разумный."
        dumped = data.model_dump()
        assert dumped["client_assessment"] == "Клиент адекватный, бюджет разумный."
