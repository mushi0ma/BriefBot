# Architecture Decision Records
## ADR-017: Flexible Brief Schema & pgvector

**Date:** 2026-03-12

### Status
Accepted

### Context
The `brief_history` table used a rigid column structure for brief fields (`title`, `keywords`, etc.). As we introduce custom templates with variable sections, a fixed schema cannot accommodate arbitrary fields without constant migrations. Additionally, we need semantic search capability ("find briefs similar to X") for future discovery features.

### Decision
1. **Flexible `data JSONB` column** — all user-facing brief sections are stored in a single JSONB column. Only metadata columns remain rigid (`id`, `user_id`, `status`, `created_at`, `updated_at`).
2. **`pgvector` extension** — activated with `CREATE EXTENSION IF NOT EXISTS vector`. A `embedding vector(768)` column stores text embeddings (compatible with OpenAI `text-embedding-3-small` and Gemini embedding models).
3. **`client_assessment TEXT`** — the client assessment removed from the user-facing bot is now persisted in DB for internal analytics.
4. **`updated_at TIMESTAMPTZ`** — tracks record modification time.
5. **Indexes** — GIN on `data` for JSONB queries; HNSW on `embedding` for cosine similarity search.

### Consequences
**Positive:**
- Templates with arbitrary sections work without schema changes.
- Semantic search infrastructure is ready for embeddings pipeline.
- Client assessment data preserved for analytics.

**Negative:**
- JSONB queries are slightly slower than native columns (mitigated by GIN index).
- `pgvector` adds a PostgreSQL extension dependency.

---

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
