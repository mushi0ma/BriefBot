"""
Tests for template loading and repository.
Updated: validates emoji-free templates.
"""

from __future__ import annotations

import json
import re
import tempfile
from pathlib import Path
from unittest.mock import patch

import pytest

from app.models.brief import BriefTemplate, TemplateSection

# Regex to detect common emoji ranges
EMOJI_PATTERN = re.compile(
    "[\U0001F600-\U0001F64F"  # Emoticons
    "\U0001F300-\U0001F5FF"   # Misc Symbols and Pictographs
    "\U0001F680-\U0001F6FF"   # Transport and Map
    "\U0001F1E0-\U0001F1FF"   # Flags
    "\U00002702-\U000027B0"   # Dingbats
    "\U0001F900-\U0001F9FF"   # Supplemental Symbols
    "\U00002600-\U000026FF"   # Misc symbols
    "\U0000FE00-\U0000FE0F"   # Variation Selectors
    "\U0000200D"              # Zero Width Joiner
    "\U00002B50"              # Star
    "\U0000203C-\U00003299"   # CJK Symbols
    "]+",
    flags=re.UNICODE,
)


class TestTemplateLoading:
    """Tests for template JSON file loading."""

    def test_default_template_valid(self):
        """Validate the default.json template parses correctly."""
        template_path = Path(__file__).parent.parent / "app" / "templates" / "default.json"
        with open(template_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        tpl = BriefTemplate(**data)
        assert tpl.slug == "default"
        assert len(tpl.sections) >= 5
        assert tpl.name != ""

    def test_marketing_template_valid(self):
        """Validate the marketing.json template."""
        template_path = Path(__file__).parent.parent / "app" / "templates" / "marketing.json"
        with open(template_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        tpl = BriefTemplate(**data)
        assert tpl.slug == "marketing"
        assert any(s.key == "target_audience" for s in tpl.sections)

    def test_development_template_valid(self):
        """Validate the development.json template."""
        template_path = Path(__file__).parent.parent / "app" / "templates" / "development.json"
        with open(template_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        tpl = BriefTemplate(**data)
        assert tpl.slug == "development"
        assert any(s.key == "tech_stack" for s in tpl.sections)

    def test_design_template_valid(self):
        """Validate the design.json template."""
        template_path = Path(__file__).parent.parent / "app" / "templates" / "design.json"
        with open(template_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        tpl = BriefTemplate(**data)
        assert tpl.slug == "design"
        assert any(s.key == "references" for s in tpl.sections)

    def test_all_templates_have_required_keys(self):
        """Each template must have missing_info section."""
        templates_dir = Path(__file__).parent.parent / "app" / "templates"
        for json_file in templates_dir.glob("*.json"):
            with open(json_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            tpl = BriefTemplate(**data)
            keys = {s.key for s in tpl.sections}
            assert "missing_info" in keys, f"{json_file.name} missing 'missing_info' section"

    def test_all_templates_have_valid_colors(self):
        """Style colors should be valid RGB (0-255)."""
        templates_dir = Path(__file__).parent.parent / "app" / "templates"
        for json_file in templates_dir.glob("*.json"):
            with open(json_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            tpl = BriefTemplate(**data)
            for color in [tpl.style.accent_color, tpl.style.header_bg]:
                assert len(color) == 3
                for c in color:
                    assert 0 <= c <= 255, f"Invalid color {c} in {json_file.name}"

    def test_no_emojis_in_template_titles(self):
        """All template section titles should be emoji-free for clean PDF rendering."""
        templates_dir = Path(__file__).parent.parent / "app" / "templates"
        for json_file in templates_dir.glob("*.json"):
            with open(json_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            tpl = BriefTemplate(**data)
            for section in tpl.sections:
                assert not EMOJI_PATTERN.search(section.title), \
                    f"Emoji found in title '{section.title}' in {json_file.name}"
