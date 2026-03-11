# 🤖 BriefBot — Меньше слов, больше сделок

> AI-ассистент для обработки голосовых сообщений клиентов и автоматической генерации PDF-брифов в Telegram.

[![CI — TMA Web](https://github.com/mushi0ma/BriefBot/actions/workflows/ci.yml/badge.svg)](https://github.com/mushi0ma/BriefBot/actions/workflows/ci.yml)

---

## 📋 Архитектура

```
┌──────────────────────────────────────────────────────┐
│  Telegram                                            │
│  ┌──────────┐    ┌──────────────────┐                │
│  │ User Bot │◄──►│  TMA Web App     │ (Vercel)       │
│  └────┬─────┘    │  Next.js 15 + FSD│                │
│       │          └──────────────────┘                │
│  ┌────┴─────┐                                        │
│  │Admin Bot │                                        │
│  └──────────┘                                        │
└──────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────┐
│  Docker Compose (Backend)                            │
│  ┌──────┐  ┌────────┐  ┌──────┐  ┌───────┐          │
│  │ bot  │  │ worker │  │ beat │  │ redis │          │
│  │aio 3 │  │ Celery │  │ cron │  │ cache │          │
│  └──────┘  └────────┘  └──────┘  └───────┘          │
└──────────────────────────────────────────────────────┘
        │
        ▼
   ┌──────────┐       ┌──────────┐
   │ Supabase │       │  OpenAI  │
   │   (DB)   │       │ Whisper+ │
   └──────────┘       │ GPT-4o   │
                      └──────────┘
```

**AI Pipeline:**
```
🎤 Voice → Whisper Agent → GPT Agent → PDF Generator → 📄 User
           (speech→text)   (text→JSON)   (JSON→PDF)
```

---

## 🚀 Быстрый старт

### 1. Подготовка

```bash
git clone https://github.com/mushi0ma/BriefBot.git && cd BriefBot
cp .env.example .env
```

Заполните `.env`:

| Переменная | Описание |
|------------|----------|
| `TELEGRAM_BOT_TOKEN` | Токен основного бота (@BotFather) |
| `TELEGRAM_ADMIN_BOT_TOKEN` | Токен админ-бота |
| `ADMIN_CHAT_ID` | Ваш Telegram ID |
| `OPENAI_API_KEY` | Ключ OpenAI API |
| `SUPABASE_URL` | URL проекта Supabase |
| `SUPABASE_KEY` | Service Role Key из Supabase |

### 2. База данных
```bash
# Выполните SQL из app/models/db.py в Supabase SQL Editor
```

### 3. Запуск бэкенда
```bash
docker compose up -d
```

---

## 📱 TMA Web App

Telegram Mini App — личный кабинет пользователя.

| | |
|---|---|
| **Стек** | Next.js 15 · React 19 · TypeScript · Zod v4 |
| **Архитектура** | Feature-Sliced Design (FSD) |
| **Деплой** | Vercel (авто при push в main) |
| **Тесты** | 68 unit (Vitest) + 7 E2E (Playwright) |

```bash
cd app/bot/web
npm install
npm run dev           # http://localhost:3000
npm test -- --run     # unit тесты
npm run test:e2e      # E2E smoke тесты
```

Подробнее → [docs/TMA.md](docs/TMA.md)

---

## 🔐 Безопасность

| Защита | Реализация |
|--------|------------|
| Auth validation | HMAC-SHA256 + `crypto.timingSafeEqual` |
| Replay attack | `auth_date` freshness (10 мин окно) |
| Clock skew | Reject `auth_date > now + 60s` |
| Input validation | Zod schemas (`safeParse` + `strict()`) |
| XSS prevention | `logo_url` HTTPS-only |
| PII protection | `user_id` убран из API responses |

---

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

---

## 📄 Шаблоны брифов

| Шаблон | Назначение |
|--------|------------|
| **Универсальный** (`default`) | Для любого проекта |
| **Маркетинг** (`marketing`) | SMM, реклама, PR |
| **IT-разработка** (`development`) | Сайты, приложения, боты |
| **Дизайн** (`design`) | Логотипы, UI/UX, полиграфия |

---

## 🧪 Тестирование

```bash
# Python бэкенд
pip install -e ".[dev]"
pytest tests/ -v

# TMA Web — unit тесты
cd app/bot/web
npm test -- --run        # 68 тестов (Vitest)

# TMA Web — E2E smoke тесты
npm run test:e2e         # 7 тестов (Playwright)
```

CI pipeline (GitHub Actions) прогоняет unit → build → E2E перед каждым деплоем.

---

## 🔧 Стек

| Компонент | Технологии |
|-----------|------------|
| **Backend** | Python 3.12 · aiogram 3 · Celery · Redis |
| **Frontend** | Next.js 15 · React 19 · TypeScript · Zod v4 |
| **AI** | OpenAI Whisper (STT) · GPT-4o-mini |
| **PDF** | fpdf2 |
| **Database** | Supabase (PostgreSQL) |
| **Testing** | Vitest · Playwright · React Testing Library |
| **Deploy** | Docker Compose (backend) · Vercel (frontend) |
| **CI/CD** | GitHub Actions |

---

## 📚 Документация

- [TMA Web App — архитектура и API](docs/TMA.md)
- [ADR — Architecture Decision Records](docs/ADR.md)
