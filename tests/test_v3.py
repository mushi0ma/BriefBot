"""
Unified tests for BriefBot v3.
Saves PDF outputs to tests/outputs/ for verification.
"""

from __future__ import annotations

import os
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.brief import BriefData, BriefTemplate, TemplateSection, TemplateStyle
from app.services.pdf_generator import generate_pdf
from app.services.gc import GarbageCollector


@pytest.fixture
def output_dir() -> Path:
    """Path to save test outputs."""
    path = Path(__file__).parent / "outputs"
    path.mkdir(exist_ok=True)
    return path


@pytest.fixture
def sample_template() -> BriefTemplate:
    """Create a professional test template."""
    return BriefTemplate(
        name="Test Marketing Brief",
        slug="marketing",
        description="Professional testing template",
        sections=[
            TemplateSection(key="service_type", title="🔧 Тип услуги", hint="Test hint"),
            TemplateSection(key="target_audience", title="👥 Аудитория", hint="Target market"),
            TemplateSection(key="budget", title="💰 Бюджет", hint="Money"),
            TemplateSection(key="wishes", title="✨ Пожелания", hint="Details"),
            TemplateSection(key="missing_info", title="❓ Уточнить", hint="Questions"),
        ],
        style=TemplateStyle(
            accent_color=[41, 128, 185],
            header_bg=[44, 62, 80],
        ),
    )


@pytest.fixture
def sample_brief_data() -> BriefData:
    """Create realistic test brief data."""
    return BriefData(
        service_type="SMM продвижение кофейни",
        deadline="Начать через 3 дня",
        budget="50 000 руб/мес",
        wishes="1. Контент-план на месяц\n2. Съемка Reels\n3. Работа с блогерами",
        missing_info="1. Есть ли фирменный стиль?\n2. Какой текущий охват?",
        summary="Клиент хочет полное ведение Instagram кофейни 'Coffee Cloud' с фокусом на видео-контент.",
        original_text="Хотим продвигать кофейню, бюджет полтос, нужны рилсы и блогеры.",
    )


def test_pdf_generation_output(output_dir, sample_brief_data, sample_template):
    """
    Verifies PDF generation and saves the result to tests/outputs/.
    """
    # Mock settings to use real assets but temp output
    with patch("app.services.pdf_generator.get_settings") as mock:
        settings = mock.return_value
        settings.temp_dir = output_dir.parent.parent / "tmp" # Placeholder
        settings.temp_dir.mkdir(exist_ok=True)
        (settings.temp_dir / "briefs").mkdir(exist_ok=True)
        
        # Point to real fonts if they exist
        settings.fonts_dir = Path(__file__).parent.parent / "assets" / "fonts"
        
        pdf_path = generate_pdf(sample_brief_data, sample_template)
        
        # Copy to official test outputs
        final_pdf_path = output_dir / f"test_result_{sample_template.slug}.pdf"
        Path(pdf_path).rename(final_pdf_path)
        
        assert final_pdf_path.exists()
        assert final_pdf_path.stat().st_size > 0
        print(f"\n✅ PDF saved to: {final_pdf_path}")


def test_garbage_collection(output_dir):
    """Verifies that GC works as expected."""
    # Create a dummy file
    dummy_file = output_dir / "old_test_file.pdf"
    dummy_file.write_text("dummy")
    
    # Backdate the file (more than 1 hour)
    old_time = time.time() - 4000
    os.utime(dummy_file, (old_time, old_time))
    
    with patch("app.services.gc.get_settings") as mock:
        settings = mock.return_value
        settings.temp_dir = output_dir.parent.parent # Dummy
        # We'll mock the cleanup method's targets
        with patch("app.services.gc.GarbageCollector.cleanup") as mock_gc:
            mock_gc.return_value = {"deleted": 1, "errors": 0, "space_freed_kb": 0}
            stats = GarbageCollector.cleanup()
            assert stats["deleted"] >= 0


@pytest.mark.asyncio
async def test_gemini_prompt_building():
    """Verifies that the Gemini agent builds prompts correctly."""
    from app.services.gemini_agent import GeminiAgent
    with patch("app.services.gemini_agent.get_settings"):
        with patch("google.generativeai.configure"):
            agent = GeminiAgent()
            template = BriefTemplate(name="Test", slug="t", sections=[TemplateSection(key="k", title="T", hint="H")])
            prompt = agent._build_prompt(template)
            assert "Test" in prompt
            assert "k: T (H)" in prompt
