# ─── Build stage ─────────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /build

# Install build deps
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Copy project manifest and install dependencies into a virtual env
COPY pyproject.toml .
RUN python -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir . && \
    /opt/venv/bin/pip install --no-cache-dir packaging

# ─── Runtime stage ───────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

# System deps for WeasyPrint PDF generation and psycopg2
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    fonts-dejavu-core \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libgdk-pixbuf2.0-0 \
    libffi-dev \
    libcairo2 \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy virtual env with all deps from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY . .

# Copy system DejaVu fonts to assets
RUN mkdir -p assets/fonts && \
    cp /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf assets/fonts/ && \
    cp /usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf assets/fonts/

# Create temp directories
RUN mkdir -p /tmp/briefbot/audio /tmp/briefbot/briefs

# Non-root user
RUN useradd --create-home briefbot && chown -R briefbot:briefbot /app /tmp/briefbot
USER briefbot

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD python -c "import redis; r = redis.from_url('${REDIS_URL:-redis://redis:6379/0}'); r.ping()" || exit 1

# Default command (overridden in docker-compose)
CMD ["python", "run_bot.py"]
