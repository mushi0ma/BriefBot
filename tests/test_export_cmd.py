import pytest
from unittest.mock import patch, AsyncMock

from app.admin_bot.admin_bot import cmd_mass_download_keyword

@pytest.mark.asyncio
@patch("app.admin_bot.admin_bot.HistoryRepo.search_briefs")
@patch("app.admin_bot.admin_bot.create_export_zip")
@patch("app.admin_bot.admin_bot.HistoryRepo.mark_as_downloaded")
async def test_cmd_mass_download_keyword(mock_mark, mock_zip, mock_search):
    # Setup Message
    mock_message = AsyncMock()
    mock_message.from_user.id = 123456 # assumed admin
    mock_message.text = "/download_keyword test"
    
    with patch("app.admin_bot.admin_bot._is_admin", return_value=True):
        # 1. No brief found
        mock_search.return_value = []
        await cmd_mass_download_keyword(mock_message)
        mock_message.answer.assert_any_call("📭 Не найдено отчетов по тегу: *test*", parse_mode="Markdown")

        # 2. Briefs found but zip fails
        mock_search.return_value = [{"id": "1", "pdf_url": "url"}]
        mock_zip.return_value = None
        await cmd_mass_download_keyword(mock_message)
        mock_message.answer.assert_any_call("❌ Ошибка при формировании ZIP архива.")

        # 3. Successful download
        from io import BytesIO
        zip_buf = BytesIO(b"dummy")
        mock_zip.return_value = zip_buf
        
        await cmd_mass_download_keyword(mock_message)
        mock_message.answer_document.assert_called_once()
        mock_mark.assert_called_once_with(["1"])
