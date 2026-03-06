"""
PDF generator using Jinja2 HTML templates + WeasyPrint.
v2: Adds Markdown-to-HTML conversion for rich PDF content (lists, bold, etc.)
    and optional user branding (accent color, logo).
"""

from __future__ import annotations

import datetime
from pathlib import Path

import mistune
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML

from app.config import get_settings
from app.logger import get_logger
from app.models.brief import BriefData, BriefTemplate

logger = get_logger("pdf_generator")

# Load Jinja2 environment once
_templates_dir = Path(__file__).resolve().parent.parent / "templates"
_jinja_env = Environment(loader=FileSystemLoader(str(_templates_dir)), autoescape=True)

# Markdown renderer for section content
_markdown = mistune.create_markdown(escape=False)


class PDFGenerationError(Exception):
    """Custom error for PDF generation issues."""
    pass


def _markdown_to_html(text: str) -> str:
    """
    Convert Markdown text to HTML for PDF rendering.
    Handles lists (- item), numbered lists (1. item), bold, italic.
    Falls back to <br> replacement if no Markdown detected.
    """
    if not text:
        return text

    # Run through mistune Markdown parser
    html = _markdown(text)

    # mistune wraps simple text in <p> tags — strip if it's just a single paragraph
    # But keep if there are lists or multiple paragraphs
    return html.strip()


def generate_pdf(
    data: BriefData,
    template: BriefTemplate,
    brand_color: str | None = None,
    logo_url: str | None = None,
) -> str:
    """
    Generate a PDF brief using Jinja2 HTML template + WeasyPrint.

    Args:
        data: Structured brief data from AI processing.
        template: Template definition with sections and style.
        brand_color: Optional HEX color override from user settings.
        logo_url: Optional logo URL from user settings.

    Returns:
        Absolute path to the generated PDF file.
    """
    settings = get_settings()
    filename = f"brief_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}_{template.slug}.pdf"
    output_path = settings.temp_dir / "briefs" / filename

    # Ensure output directory exists
    output_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        # Prepare section data for the template with Markdown rendering
        data_dict = data.model_dump()
        sections = []
        for section in template.sections:
            content = data_dict.get(section.key, "")
            if content:
                # Convert Markdown to HTML for rich rendering
                content = _markdown_to_html(content)
            sections.append({
                "title": section.title,
                "content": content,
            })

        # Build effective style (with optional brand color override)
        effective_style = template.style
        style_dict = effective_style.model_dump()

        # Override accent color if user has custom branding
        if brand_color and brand_color.startswith("#") and len(brand_color) == 7:
            try:
                r = int(brand_color[1:3], 16)
                g = int(brand_color[3:5], 16)
                b = int(brand_color[5:7], 16)
                style_dict["accent_color"] = [r, g, b]
            except ValueError:
                pass  # Keep default if invalid

        # Render HTML from Jinja2 template
        html_template = _jinja_env.get_template("brief_template.html")
        html_content = html_template.render(
            template_name=template.name.upper(),
            summary=data.summary or "Краткое резюме проекта",
            sections=sections,
            original_text=data.original_text,
            generated_date=datetime.datetime.now().strftime("%d.%m.%Y %H:%M"),
            style=type(effective_style)(**style_dict),
            logo_url=logo_url or "",
        )

        # Generate PDF with WeasyPrint
        font_config_css = ""
        fonts_dir = settings.fonts_dir
        if fonts_dir.exists():
            dejavu_path = fonts_dir / "DejaVuSans.ttf"
            dejavu_bold_path = fonts_dir / "DejaVuSans-Bold.ttf"
            if dejavu_path.exists():
                font_config_css = f"""
                @font-face {{
                    font-family: 'DejaVu Sans';
                    src: url('file://{dejavu_path}');
                    font-weight: normal;
                }}
                """
                if dejavu_bold_path.exists():
                    font_config_css += f"""
                    @font-face {{
                        font-family: 'DejaVu Sans';
                        src: url('file://{dejavu_bold_path}');
                        font-weight: bold;
                    }}
                    """

        if font_config_css:
            html_content = html_content.replace(
                "</style>",
                font_config_css + "\n</style>",
            )

        HTML(string=html_content).write_pdf(str(output_path))

        logger.info("pdf_generated", path=str(output_path))
        return str(output_path)

    except Exception as e:
        logger.error("pdf_generation_failed", error=str(e), exc_info=True)
        raise PDFGenerationError(f"Failed to generate PDF: {str(e)}")
