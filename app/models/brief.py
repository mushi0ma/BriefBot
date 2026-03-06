"""
Pydantic models for the brief data pipeline.
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum

from pydantic import BaseModel, Field


class ProcessingState(StrEnum):
    """Pipeline state machine states."""

    RECEIVED = "received"
    TRANSCRIBING = "transcribing"
    ANALYZING = "analyzing"
    GENERATING_PDF = "generating_pdf"
    DONE = "done"
    FAILED = "failed"


class BriefSection(BaseModel):
    """A single section extracted by GPT."""

    key: str
    title: str
    value: str = ""
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)


class BriefData(BaseModel):
    """Structured data extracted from the voice message by GPT agent."""

    service_type: str = Field(default="", description="Type of service requested")
    deadline: str = Field(default="", description="Project deadline")
    budget: str = Field(default="", description="Budget range or exact amount")
    wishes: str = Field(default="", description="Additional requirements and wishes")
    missing_info: str = Field(default="", description="Information that needs clarification")
    extra_sections: list[BriefSection] = Field(
        default_factory=list,
        description="Additional template-specific sections",
    )
    summary: str = Field(default="", description="Short summary of the entire request")
    original_text: str = Field(default="", description="Full transcription text")


class TemplateSection(BaseModel):
    """Section definition inside a template."""

    key: str
    title: str
    hint: str = ""
    required: bool = True


class TemplateStyle(BaseModel):
    """Visual style for PDF rendering."""

    accent_color: list[int] = Field(default=[41, 128, 185])  # RGB
    header_bg: list[int] = Field(default=[44, 62, 80])  # RGB
    font_size_title: int = 22
    font_size_section: int = 14
    font_size_body: int = 11


class BriefTemplate(BaseModel):
    """Template for brief generation — defines sections and visual style."""

    name: str
    slug: str
    description: str = ""
    sections: list[TemplateSection]
    style: TemplateStyle = Field(default_factory=TemplateStyle)


class ProcessingResult(BaseModel):
    """Result of the full voice→PDF pipeline."""

    state: ProcessingState
    chat_id: int = 0
    brief_data: BriefData | None = None
    pdf_path: str | None = None
    error_message: str | None = None
    processing_time_ms: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
