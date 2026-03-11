import asyncio
import io
import zipfile
import aiohttp
from typing import Any

from app.logger import get_logger

logger = get_logger("exporter")

async def _download_file(session: aiohttp.ClientSession, url: str) -> bytes | None:
    try:
        async with session.get(url) as response:
            if response.status == 200:
                return await response.read()
            logger.warning("export_download_failed", url=url, status=response.status)
    except Exception as e:
        logger.error("export_download_exception", url=url, error=str(e))
    return None

async def create_export_zip(records: list[dict[str, Any]]) -> io.BytesIO | None:
    """
    Given a list of brief_history records, downloads their PDFs asynchronously
    and packages them into an in-memory ZIP archive.
    """
    if not records:
        return None

    zip_buffer = io.BytesIO()
    
    async with aiohttp.ClientSession() as session:
        tasks = []
        # Filter records that actually have a pdf_url
        valid_records = [r for r in records if r.get("pdf_url")]
        
        for record in valid_records:
            tasks.append(_download_file(session, record["pdf_url"]))
            
        pdf_bytes_list = await asyncio.gather(*tasks)
        
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            added_count = 0
            for record, pdf_bytes in zip(valid_records, pdf_bytes_list):
                if pdf_bytes:
                    title = record.get("title") or record.get("id", "untitled")
                    # ensure safe filename
                    safe_title = "".join([c for c in title if c.isalpha() or c.isdigit() or c==' ']).rstrip()
                    filename = f"{safe_title}_{record['id'][:8]}.pdf"
                    zip_file.writestr(filename, pdf_bytes)
                    added_count += 1
            
            if added_count == 0:
                return None

    zip_buffer.seek(0)
    return zip_buffer
