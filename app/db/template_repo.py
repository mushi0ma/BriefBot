"""
Template repository — manages brief templates from JSON files and Supabase.
Templates are loaded from bundled JSON files at startup and optionally synced to DB.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from tenacity import retry, stop_after_attempt, wait_exponential, before_sleep_log

from app.config import get_settings
from app.db.supabase_client import get_supabase
from app.logger import get_logger
from app.models.brief import BriefTemplate

logger = get_logger("template_repo")

_retry = retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=0.5, min=0.5, max=5),
    before_sleep=before_sleep_log(logger, logging.WARNING),  # type: ignore[arg-type]
    reraise=True,
)

# In-memory cache of templates loaded from JSON files
_templates_cache: dict[str, BriefTemplate] = {}


def _load_bundled_templates() -> dict[str, BriefTemplate]:
    """Load templates from JSON files in the templates directory."""
    templates_dir = Path(__file__).resolve().parent.parent / "templates"
    templates: dict[str, BriefTemplate] = {}

    for json_file in templates_dir.glob("*.json"):
        try:
            with open(json_file, "r", encoding="utf-8") as f:
                data = json.load(f)
            tpl = BriefTemplate(**data)
            templates[tpl.slug] = tpl
            logger.debug("template_loaded", slug=tpl.slug, name=tpl.name, file=json_file.name)
        except Exception as e:
            logger.error("template_load_error", file=str(json_file), error=str(e))

    logger.info("templates_loaded_from_files", count=len(templates))
    return templates


def get_all_templates() -> dict[str, BriefTemplate]:
    """Return all available templates (cached)."""
    global _templates_cache
    if not _templates_cache:
        _templates_cache = _load_bundled_templates()
    return _templates_cache


def get_template(slug: str) -> BriefTemplate:
    """Return a template by slug, fallback to 'default'."""
    templates = get_all_templates()
    if slug in templates:
        return templates[slug]
    logger.warning("template_not_found", slug=slug, fallback="default")
    return templates.get("default", list(templates.values())[0])


def reload_templates() -> None:
    """Force reload templates from files (useful after admin adds new ones)."""
    global _templates_cache
    _templates_cache = _load_bundled_templates()
    logger.info("templates_reloaded", count=len(_templates_cache))


class TemplateDBRepo:
    """Optional: sync templates to/from Supabase for admin management."""

    TABLE = "templates"

    @staticmethod
    @_retry
    def sync_to_db() -> None:
        """Push bundled templates to Supabase (upsert by slug)."""
        sb = get_supabase()
        templates = get_all_templates()
        for slug, tpl in templates.items():
            data = {
                "name": tpl.name,
                "slug": tpl.slug,
                "description": tpl.description,
                "sections": [s.model_dump() for s in tpl.sections],
                "style": tpl.style.model_dump(),
            }
            sb.table(TemplateDBRepo.TABLE).upsert(data, on_conflict="slug").execute()
        logger.info("templates_synced_to_db", count=len(templates))

    @staticmethod
    @_retry
    def get_from_db(slug: str) -> dict[str, Any] | None:
        """Fetch a single template from DB."""
        sb = get_supabase()
        result = sb.table(TemplateDBRepo.TABLE).select("*").eq("slug", slug).limit(1).execute()
        return result.data[0] if result.data else None

    @staticmethod
    @_retry
    def save_template(template: BriefTemplate) -> None:
        """Save a single template to Supabase and to local JSON file."""
        sb = get_supabase()
        data = {
            "name": template.name,
            "slug": template.slug,
            "description": template.description,
            "sections": [s.model_dump() for s in template.sections],
            "style": template.style.model_dump(),
        }
        sb.table(TemplateDBRepo.TABLE).upsert(data, on_conflict="slug").execute()

        # Also save to local JSON file for persistence
        templates_dir = Path(__file__).resolve().parent.parent / "templates"
        templates_dir.mkdir(parents=True, exist_ok=True)
        json_path = templates_dir / f"{template.slug}.json"
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(
                {
                    "name": template.name,
                    "slug": template.slug,
                    "description": template.description,
                    "sections": [s.model_dump() for s in template.sections],
                    "style": template.style.model_dump(),
                },
                f,
                ensure_ascii=False,
                indent=2,
            )
        logger.info("template_saved", slug=template.slug)
