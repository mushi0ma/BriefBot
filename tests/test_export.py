import io
import zipfile
from unittest.mock import AsyncMock, patch

import pytest

from app.services.export import create_export_zip

@pytest.mark.asyncio
@patch("app.services.export.aiohttp.ClientSession.get")
async def test_create_export_zip_success(mock_get):
    """Test generating a zip file from records."""
    records = [
        {"id": "doc12345", "title": "First Brief", "pdf_url": "http://test.com/1.pdf"},
        {"id": "doc67890", "title": "Second Brief", "pdf_url": "http://test.com/2.pdf"},
    ]

    # Mock response object 
    mock_response = AsyncMock()
    mock_response.status = 200
    mock_response.read.side_effect = [b"PDFCONTENT1", b"PDFCONTENT2"]

    # The context manager __aenter__ returns our mock_response
    mock_get.return_value.__aenter__.return_value = mock_response

    zip_buffer = await create_export_zip(records)
    assert zip_buffer is not None
    assert isinstance(zip_buffer, io.BytesIO)

    # Verify contents
    with zipfile.ZipFile(zip_buffer, "r") as zf:
        names = zf.namelist()
        assert len(names) == 2
        assert "First Brief_doc12345.pdf" in names
        assert "Second Brief_doc67890.pdf" in names
        assert zf.read("First Brief_doc12345.pdf") == b"PDFCONTENT1"
        assert zf.read("Second Brief_doc67890.pdf") == b"PDFCONTENT2"

@pytest.mark.asyncio
async def test_create_export_zip_no_records():
    """Test behavior with empty records list."""
    assert await create_export_zip([]) is None

@pytest.mark.asyncio
async def test_create_export_zip_no_pdf_urls():
    """Test behavior with records lacking pdf_urls."""
    records = [
        {"id": "doc12345", "title": "First Brief"},
        {"id": "doc67890"},
    ]
    assert await create_export_zip(records) is None

@pytest.mark.asyncio
@patch("app.services.export.aiohttp.ClientSession.get")
async def test_create_export_zip_partial_failure(mock_get):
    """Test when one download fails but others succeed."""
    records = [
        {"id": "doc1", "title": "Success", "pdf_url": "http://test.com/1.pdf"},
        {"id": "doc2", "title": "Fail", "pdf_url": "http://test.com/2.pdf"},
    ]

    mock_resp_success = AsyncMock()
    mock_resp_success.status = 200
    mock_resp_success.read.return_value = b"OK_CONTENT"

    mock_resp_fail = AsyncMock()
    mock_resp_fail.status = 404

    # We patch the context manager to return different things per call
    # But for aiohttp session.get, the side_effect must return context managers.
    class MockContextManager:
        def __init__(self, obj):
            self.obj = obj
        async def __aenter__(self):
            return self.obj
        async def __aexit__(self, exc_type, exc, tb):
            pass

    mock_get.side_effect = [
        MockContextManager(mock_resp_success), 
        MockContextManager(mock_resp_fail)
    ]

    zip_buffer = await create_export_zip(records)
    
    assert zip_buffer is not None
    with zipfile.ZipFile(zip_buffer, "r") as zf:
        names = zf.namelist()
        assert len(names) == 1
        assert "Success_doc1.pdf" in names
        assert zf.read("Success_doc1.pdf") == b"OK_CONTENT"
