"""
Admin Web App — FastAPI server for the Telegram Mini App admin dashboard.
Provides stats, health checks, and live log streaming via WebSocket.
"""

from __future__ import annotations

import asyncio
import json
import time
from datetime import datetime, timezone

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse

from app.config import get_settings
from app.db.history_repo import HistoryRepo
from app.db.user_repo import UserRepo
from app.logger import get_logger

logger = get_logger("admin_web_app")

app = FastAPI(title="BriefBot Admin Dashboard", docs_url=None, redoc_url=None)


# ── Dashboard HTML ──────────────────────────────────────────────────────────
DASHBOARD_HTML = """
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BriefBot Admin</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
            color: #e0e0e0;
            min-height: 100vh;
            padding: 16px;
        }
        .header {
            text-align: center;
            padding: 20px 0;
            border-bottom: 1px solid rgba(255,255,255,0.1);
            margin-bottom: 20px;
        }
        .header h1 {
            font-size: 24px;
            background: linear-gradient(90deg, #00d2ff, #7b2ff7);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .header .time { font-size: 12px; color: #888; margin-top: 4px; }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-bottom: 24px;
        }
        .stat-card {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 16px;
            text-align: center;
            backdrop-filter: blur(10px);
            transition: transform 0.2s;
        }
        .stat-card:hover { transform: translateY(-2px); }
        .stat-card .value {
            font-size: 28px;
            font-weight: 700;
            background: linear-gradient(90deg, #00d2ff, #7b2ff7);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .stat-card .label { font-size: 11px; color: #999; margin-top: 4px; }
        .section {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 16px;
        }
        .section h2 {
            font-size: 14px;
            color: #00d2ff;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .log-container {
            max-height: 300px;
            overflow-y: auto;
            font-family: 'JetBrains Mono', monospace;
            font-size: 11px;
            line-height: 1.6;
        }
        .log-entry { padding: 2px 0; border-bottom: 1px solid rgba(255,255,255,0.03); }
        .log-entry.error { color: #ff6b6b; }
        .log-entry.warning { color: #ffa502; }
        .log-entry.info { color: #7bed9f; }
        .status-dot {
            display: inline-block;
            width: 8px; height: 8px;
            border-radius: 50%;
            margin-right: 6px;
        }
        .status-dot.ok { background: #2ed573; box-shadow: 0 0 6px #2ed573; }
        .status-dot.err { background: #ff4757; box-shadow: 0 0 6px #ff4757; }
        .health-item {
            display: flex;
            align-items: center;
            padding: 8px 0;
            font-size: 13px;
        }
        #chart-container { position: relative; height: 200px; }
        .refresh-btn {
            display: block;
            width: 100%;
            padding: 12px;
            background: linear-gradient(90deg, #00d2ff, #7b2ff7);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            cursor: pointer;
            margin-top: 16px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🛠 BriefBot Admin</h1>
        <div class="time" id="update-time">Loading...</div>
    </div>

    <div class="stats-grid">
        <div class="stat-card">
            <div class="value" id="stat-users">-</div>
            <div class="label">👥 Пользователи</div>
        </div>
        <div class="stat-card">
            <div class="value" id="stat-briefs">-</div>
            <div class="label">📄 Всего брифов</div>
        </div>
        <div class="stat-card">
            <div class="value" id="stat-today">-</div>
            <div class="label">📅 Сегодня</div>
        </div>
        <div class="stat-card">
            <div class="value" id="stat-rate">-</div>
            <div class="label">📈 Успешность</div>
        </div>
    </div>

    <div class="section">
        <h2>📊 Активность</h2>
        <div id="chart-container">
            <canvas id="activityChart"></canvas>
        </div>
    </div>

    <div class="section">
        <h2>🏥 Статус сервисов</h2>
        <div id="health-checks">Loading...</div>
    </div>

    <div class="section">
        <h2>📋 Логи (live)</h2>
        <div class="log-container" id="log-container">
            <div class="log-entry info">Ожидание подключения...</div>
        </div>
    </div>

    <button class="refresh-btn" onclick="loadStats()">🔄 Обновить</button>

    <script>
        let chart = null;

        async function loadStats() {
            try {
                const resp = await fetch('/admin/api/stats');
                const data = await resp.json();

                document.getElementById('stat-users').textContent = data.users.total_users;
                document.getElementById('stat-briefs').textContent = data.briefs.total_briefs;
                document.getElementById('stat-today').textContent = data.briefs.today_briefs;

                const rate = data.briefs.total_briefs > 0
                    ? ((data.briefs.successful / data.briefs.total_briefs) * 100).toFixed(1) + '%'
                    : '—';
                document.getElementById('stat-rate').textContent = rate;
                document.getElementById('update-time').textContent =
                    'Обновлено: ' + new Date().toLocaleTimeString('ru');
            } catch (e) {
                console.error('Stats load failed:', e);
            }
        }

        async function loadHealth() {
            try {
                const resp = await fetch('/admin/api/health');
                const data = await resp.json();
                const container = document.getElementById('health-checks');
                container.innerHTML = data.checks.map(c =>
                    `<div class="health-item">
                        <span class="status-dot ${c.ok ? 'ok' : 'err'}"></span>
                        ${c.name}: ${c.status}
                    </div>`
                ).join('');
            } catch (e) {
                console.error('Health load failed:', e);
            }
        }

        function connectWebSocket() {
            const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
            const ws = new WebSocket(`${protocol}//${location.host}/admin/ws`);
            const container = document.getElementById('log-container');

            ws.onmessage = (event) => {
                const entry = document.createElement('div');
                const data = JSON.parse(event.data);
                entry.className = 'log-entry ' + (data.level || 'info');
                entry.textContent = `[${data.time}] ${data.level.toUpperCase()}: ${data.message}`;
                container.appendChild(entry);
                container.scrollTop = container.scrollHeight;
                // Keep last 100 entries
                while (container.children.length > 100) {
                    container.removeChild(container.firstChild);
                }
            };

            ws.onclose = () => {
                setTimeout(connectWebSocket, 3000);
            };
        }

        loadStats();
        loadHealth();
        connectWebSocket();
        setInterval(loadStats, 30000);
    </script>
</body>
</html>
"""


# ── REST API Endpoints ─────────────────────────────────────────────────────
@app.get("/admin/dashboard", response_class=HTMLResponse)
async def dashboard():
    """Serve the admin dashboard HTML."""
    return DASHBOARD_HTML


@app.get("/admin/api/stats")
async def api_stats():
    """Return aggregated statistics."""
    try:
        user_stats = UserRepo.get_stats()
        brief_stats = HistoryRepo.get_stats()
        return {"users": user_stats, "briefs": brief_stats}
    except Exception as e:
        logger.error("stats_api_error", error=str(e))
        return {"users": {"total_users": 0}, "briefs": {"total_briefs": 0, "today_briefs": 0, "successful": 0, "failed": 0}}


@app.get("/admin/api/health")
async def api_health():
    """Return health check results."""
    import redis
    settings = get_settings()
    checks = []

    # Redis
    try:
        start = time.monotonic()
        r = redis.from_url(settings.redis_url)
        r.ping()
        elapsed = int((time.monotonic() - start) * 1000)
        checks.append({"name": "Redis", "ok": True, "status": f"OK ({elapsed}ms)"})
    except Exception as e:
        checks.append({"name": "Redis", "ok": False, "status": str(e)})

    # Supabase
    try:
        import httpx
        start = time.monotonic()
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.supabase_url}/rest/v1/", headers={
                "apikey": settings.supabase_key,
                "Authorization": f"Bearer {settings.supabase_key}",
            })
        elapsed = int((time.monotonic() - start) * 1000)
        checks.append({"name": "Supabase", "ok": resp.status_code < 400, "status": f"HTTP {resp.status_code} ({elapsed}ms)"})
    except Exception as e:
        checks.append({"name": "Supabase", "ok": False, "status": str(e)})

    return {"checks": checks}


# ── WebSocket for live logs ─────────────────────────────────────────────────
_log_subscribers: list[WebSocket] = []


@app.websocket("/admin/ws")
async def websocket_logs(websocket: WebSocket):
    """WebSocket endpoint for live log streaming."""
    await websocket.accept()
    _log_subscribers.append(websocket)
    try:
        # Send a welcome message
        await websocket.send_json({
            "time": datetime.now(timezone.utc).strftime("%H:%M:%S"),
            "level": "info",
            "message": "Connected to log stream",
        })
        # Keep connection alive
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        _log_subscribers.remove(websocket)


async def broadcast_log(level: str, message: str):
    """Broadcast a log entry to all connected WebSocket clients."""
    entry = {
        "time": datetime.now(timezone.utc).strftime("%H:%M:%S"),
        "level": level,
        "message": message,
    }
    dead = []
    for ws in _log_subscribers:
        try:
            await ws.send_json(entry)
        except Exception:
            dead.append(ws)
    for ws in dead:
        _log_subscribers.remove(ws)


def run_web_app():
    """Start the FastAPI admin web app server."""
    import uvicorn
    settings = get_settings()
    uvicorn.run(app, host="0.0.0.0", port=settings.admin_web_port, log_level="warning")
