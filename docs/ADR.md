# Architecture Decision Records
## ADR-016: Interactive Draft Pattern and Celery Task Separation

**Date:** 2026-03-11

### Status
Accepted

### Context
Our processing pipeline originally used a single monolithic Celery task (`process_voice_message`) which managed the entire lifecycle of a request: downloading audio, transcribing, AI analysis, PDF generation, and sending the final document to the user.
While simple, this approach presented several limitations:
1. **Lack of User Interaction:** The AI directly generated the final PDF. If the AI hallucinated or lacked critical inputs, the generated document was flawed, and the user had no opportunity to review or correct the information before generation.
2. **Coupling:** AI extraction and document generation were tightly bound, making it difficult to test or substitute components in isolation.
3. **Error Handling:** Without a "draft" state, failures in document generation required re-running the costly AI analysis phase.

### Decision
We will implement an "Interactive Draft" pattern by introducing strict Separation of Concerns (SoC) in our asynchronous processing pipeline.

Key changes include:
1.  **Pydantic Model Updates (`BriefData`)**: Added `title`, `keywords`, and `missing_fields`.
2.  **Split Celery Pipeline:**
    *   `task_analyze_request`: Handles transcription and AI extraction. Returns a JSON draft representation.
    *   `task_generate_pdf`: Accepts the approved JSON draft and generates the final physical document.
3.  **Prompt Engineering**: Instructing the Model to list `missing_fields` explicitly rather than making assumptions.

### Consequences
**Positive:**
- Better user experience: users can preview and modify the AI's understanding before generating the final document.
- Improved error handling: if PDF generation fails, the analysis does not to be re-run.
- Simplified testing: each phase (analysis, generation) can be tested in isolation with mocked inputs/outputs.
- More robust AI responses: avoiding hallucinations by acknowledging missing context.

**Negative:**
- Increased orchestration complexity: requires storing partial state (the draft) and managing the transition between the two tasks.
- Slightly increased latency if user interaction is required (expected trade-off).
