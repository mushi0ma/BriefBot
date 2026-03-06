"""
Garbage Collector service for cleaning up temporary files.
"""

from __future__ import annotations

import os
import time
from pathlib import Path

from app.config import get_settings
from app.logger import get_logger

logger = get_logger("garbage_collector")


class GarbageCollector:
    """Service to clean up temporary audio and PDF files."""

    @staticmethod
    def cleanup(max_age_sec: int = 3600) -> dict[str, int]:
        """
        Removes files older than max_age_sec from temp directories.
        Returns stats about deleted files.
        """
        settings = get_settings()
        stats = {"deleted": 0, "errors": 0, "space_freed_kb": 0}
        
        temp_dirs = [
            settings.temp_dir / "audio",
            settings.temp_dir / "briefs"
        ]

        now = time.time()

        for d in temp_dirs:
            if not d.exists():
                continue

            for item in d.iterdir():
                if not item.is_file():
                    continue

                try:
                    file_stat = item.stat()
                    age = now - file_stat.st_mtime
                    
                    if age > max_age_sec:
                        size_kb = file_stat.st_size / 1024
                        item.unlink()
                        stats["deleted"] += 1
                        stats["space_freed_kb"] += int(size_kb)
                        logger.debug("gc_file_deleted", path=str(item), age=int(age))
                except Exception as e:
                    logger.error("gc_error", path=str(item), error=str(e))
                    stats["errors"] += 1

        if stats["deleted"] > 0:
            logger.info("gc_completed", **stats)
            
        return stats
