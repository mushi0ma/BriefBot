import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from app.worker.tasks import task_analyze_request, task_generate_pdf
from app.models.brief import ProcessingState, ProcessingResult, BriefData

@pytest.fixture
def mock_orchestrator():
    with patch("app.worker.tasks.OrchestratorAgent") as mock_agent:
        yield mock_agent.return_value

@pytest.fixture
def sample_brief_data():
    return BriefData(
        title="Тестовый проект",
        keywords=["тест", "проект"],
        missing_fields=[],
        service_type="Разработка сайта",
        deadline="1 месяц",
        budget="100 000 руб.",
        wishes="Без пожеланий",
        missing_info="",
        summary="Тестовый запрос",
        original_text="Хочу сайт за 100к"
    )

def test_task_analyze_request_success(mock_orchestrator, sample_brief_data):
    # Setup mock
    processing_result = ProcessingResult(
        state=ProcessingState.DONE,
        brief_data=sample_brief_data,
        processing_time_ms=1000
    )
    
    # We mock asyncio loop handling to run our sync task
    # We patch run_until_complete explicitly for this test
    with patch("asyncio.BaseEventLoop.run_until_complete", side_effect=[processing_result, None]):
        with patch("app.worker.tasks._send_draft_to_user"):
            # The self argument is passed as a magic mock
            mock_self = MagicMock()
            mock_self.request.id = "test-task-123"
            mock_self.request.retries = 0

        # Execute
        # Since celery task is bound, calling it directly via .run unpacks 'self'
        # .run needs keyword arguments to be passed as `kwargs` or explicit positional
        result = task_analyze_request.run(
            chat_id=123,
            telegram_id=456,
            audio_path="/tmp/audio.ogg",
            template_slug="default",
            processing_msg_id=777
        )
        
        # Verify
        assert result == sample_brief_data.model_dump()

def test_task_analyze_request_failure(mock_orchestrator):
    # Setup mock for failure
    processing_result = ProcessingResult(
        state=ProcessingState.FAILED,
        error_message="Test error"
    )
    
    with patch("asyncio.BaseEventLoop.run_until_complete", side_effect=[processing_result, None]):
        with patch("app.worker.tasks._send_draft_to_user"):
            mock_self = MagicMock()
            mock_self.request.id = "test-task-123"
            mock_self.request.retries = 0

        # Execute & Verify exception
        with pytest.raises(Exception, match="Test error"):
            task_analyze_request.run(
                chat_id=123,
                telegram_id=456,
                audio_path="/tmp/audio.ogg",
                template_slug="default",
                processing_msg_id=777
            )

def test_task_generate_pdf_success(mock_orchestrator, sample_brief_data):
    draft_data = sample_brief_data.model_dump()
    mock_pdf_path = "/tmp/test.pdf"
    
    processing_result = ProcessingResult(
        state=ProcessingState.DONE,
        brief_data=sample_brief_data,
        pdf_path=mock_pdf_path,
        processing_time_ms=1000
    )
    
    with patch("asyncio.BaseEventLoop.run_until_complete", side_effect=[processing_result, None]):
        with patch("app.worker.tasks._send_result_to_user"):
            # Execute
            task_generate_pdf.run(
            draft_data=draft_data,
            chat_id=123,
            telegram_id=456,
            template_slug="default"
        )
        
        # Verify Orchestrator was called
        mock_orchestrator.process_with_brief_data.assert_called_once()
        args, kwargs = mock_orchestrator.process_with_brief_data.call_args
        assert kwargs["chat_id"] == 123
        assert kwargs["telegram_id"] == 456
        assert kwargs["brief_data"].title == "Тестовый проект"
        assert kwargs["cleanup_pdf"] is False
        
        # Verify cleanup
        mock_orchestrator._cleanup_file.assert_called_once_with(mock_pdf_path)
