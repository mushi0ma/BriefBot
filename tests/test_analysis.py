"""
Tests for the GPT analysis service.
"""

from __future__ import annotations

import json
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.models.brief import BriefData, BriefTemplate, TemplateSection, TemplateStyle
from app.services.analysis import GPTAgent, AnalysisError, _build_system_prompt


@pytest.fixture
def sample_template() -> BriefTemplate:
    return BriefTemplate(
        name="Test Template",
        slug="test",
        sections=[
            TemplateSection(key="service_type", title="Тип услуги", hint="Hint 1"),
            TemplateSection(key="deadline", title="Сроки", hint="Hint 2"),
            TemplateSection(key="budget", title="Бюджет", hint="Hint 3"),
            TemplateSection(key="wishes", title="Пожелания", hint="Hint 4"),
            TemplateSection(key="missing_info", title="Уточнить", hint="Hint 5"),
        ],
    )


@pytest.fixture
def valid_gpt_response() -> str:
    return json.dumps({
        "service_type": "Разработка сайта",
        "deadline": "1 месяц",
        "budget": "200 000 руб.",
        "wishes": "Адаптивный дизайн",
        "missing_info": "Нужен ли хостинг?",
        "summary": "Клиент хочет сайт-визитку.",
    })


class TestSystemPrompt:
    """Tests for system prompt generation."""

    def test_prompt_contains_template_name(self, sample_template):
        prompt = _build_system_prompt(sample_template)
        assert sample_template.name in prompt

    def test_prompt_contains_all_section_keys(self, sample_template):
        prompt = _build_system_prompt(sample_template)
        for section in sample_template.sections:
            assert section.key in prompt

    def test_prompt_contains_hints(self, sample_template):
        prompt = _build_system_prompt(sample_template)
        for section in sample_template.sections:
            assert section.hint in prompt


class TestGPTAgent:
    """Tests for the GPT agent."""

    @pytest.mark.asyncio
    async def test_analyze_empty_text_raises(self, sample_template):
        """Empty text should raise AnalysisError immediately."""
        agent = GPTAgent.__new__(GPTAgent)  # Skip __init__
        with pytest.raises(AnalysisError, match="Empty"):
            await agent.analyze("", sample_template)

    @pytest.mark.asyncio
    async def test_analyze_whitespace_only_raises(self, sample_template):
        """Whitespace-only text should raise AnalysisError."""
        agent = GPTAgent.__new__(GPTAgent)
        with pytest.raises(AnalysisError, match="Empty"):
            await agent.analyze("   \n  \t  ", sample_template)

    def test_parse_valid_response(self, valid_gpt_response):
        """Valid JSON should parse into BriefData."""
        result = GPTAgent._parse_response(valid_gpt_response, "original text")
        assert isinstance(result, BriefData)
        assert result.service_type == "Разработка сайта"
        assert result.budget == "200 000 руб."
        assert result.original_text == "original text"

    def test_parse_missing_fields(self):
        """Missing fields should default to empty strings."""
        minimal_json = json.dumps({"service_type": "Test"})
        result = GPTAgent._parse_response(minimal_json, "text")
        assert result.service_type == "Test"
        assert result.deadline == ""
        assert result.budget == ""

    def test_parse_invalid_json_raises(self):
        """Invalid JSON should raise JSONDecodeError."""
        with pytest.raises(json.JSONDecodeError):
            GPTAgent._parse_response("not valid json {", "text")
