# 🤖 BriefBot — Меньше слов, больше сделок

AI-ассистент для обработки голосовых сообщений клиентов и автоматической генерации PDF-брифов в Telegram.

## 🚀 Быстрый старт

### 1. Подготовка

```bash
# Клонируйте репозиторий
git clone <repo-url> && cd BriefBot

# Скопируйте .env и заполните секреты
cp .env.example .env
```

Заполните `.env`:
- `TELEGRAM_BOT_TOKEN` — токен основного бота (@BotFather)
- `TELEGRAM_ADMIN_BOT_TOKEN` — токен админ-бота
- `ADMIN_CHAT_ID` — ваш Telegram ID
- `OPENAI_API_KEY` — ключ OpenAI API
- `SUPABASE_URL` + `SUPABASE_KEY` — из [supabase.com](https://supabase.com)

### 2. Создайте таблицы в Supabase

Выполните SQL из `app/models/db.py` в Supabase SQL Editor.

### 3. Запуск

```bash
docker compose up -d
```

Готово! Отправьте голосовое сообщение боту.

## 📋 Архитектура

```
4 Docker-контейнера:
├── bot       — Main + Admin Telegram-боты (aiogram 3)
├── worker    — Celery worker (AI pipeline)
├── beat      — Celery beat (периодические задачи)
└── redis     — Брокер + кеш
```

**AI Pipeline (multi-agent):**
```
Voice → Whisper Agent → GPT Agent → PDF Generator → User
         (speech→text)   (text→JSON)   (JSON→PDF)
```

## 🎙 Команды бота

| Команда | Описание |
|---------|----------|
| `/start` | Приветствие и инструкции |
| `/template` | Выбрать шаблон брифа |
| `/history` | Последние 5 брифов |
| `/help` | Подробная справка |

## 🛠 Команды админ-бота

| Команда | Описание |
|---------|----------|
| `/stats` | Статистика: пользователи, брифы, успешность |
| `/health` | Health-check: Redis, Supabase, OpenAI |
| `/users` | Топ-10 активных пользователей |
| `/templates` | Список шаблонов |
| `/reload` | Перезагрузить шаблоны |

## 📄 Шаблоны брифов

- **Универсальный** (default) — для любого проекта
- **Маркетинг** (marketing) — SMM, реклама, PR
- **IT-разработка** (development) — сайты, приложения, боты
- **Дизайн** (design) — логотипы, UI/UX, полиграфия

## 🧪 Тесты

```bash
# Python (бэкенд)
pip install -e ".[dev]"
pytest tests/ -v

# TMA Web (Next.js)
cd app/bot/web
npm test -- --run    # 66 тестов
```

## 📱 TMA Web App

Telegram Mini App для пользователей — выбор шаблонов, настройки бренда, история брифов.

- **Стек:** Next.js 15 + React 19 + TypeScript + Zod v4
- **Деплой:** Vercel (авто при push в main)
- **Архитектура:** Feature-Sliced Design (FSD)
- **Тесты:** 66 (Vitest + React Testing Library)

Подробнее: [docs/TMA.md](docs/TMA.md)

## 🔧 Стек

- **Python 3.12** + aiogram 3 + Celery + Redis
- **Next.js 15** + React 19 + TypeScript (TMA)
- **Zod v4** (API валидация) + **Vitest** (тесты)
- **OpenAI** Whisper (STT) + GPT-4o-mini (анализ)
- **fpdf2** (PDF) + **Supabase** (PostgreSQL)
- **structlog** (логирование) + **tenacity** (retry)
- **Docker Compose** (бэкенд) + **Vercel** (фронтенд)

## 📚 Документация

- [ADR — Architecture Decision Records](docs/ADR.md)
- [TMA Web App](docs/TMA.md)
