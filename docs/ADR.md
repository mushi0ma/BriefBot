# Architecture Decision Records (ADR) — BriefBot

> Этот файл — единственный источник правды по архитектурным решениям проекта.
> Каждое решение зафиксировано с датой и обоснованием.

---

## ADR-001: TMA-приложения следуют Feature-Sliced Design (FSD)

- **Дата**: 2026-03-11
- **Статус**: ПРИНЯТО

### Контекст
Оба Next.js TMA (User Dashboard и Admin Panel) не имеют архитектурной организации — весь код живёт в одном `page.tsx` (200–350 строк), что нарушает Single Responsibility, DRY, и делает невозможным тестирование и масштабирование.

### Решение
Все TMA-приложения реструктурируются по FSD:

```
src/
├── app/          ← Next.js App Router (layout, providers, routing)
├── pages/        ← FSD: полные экраны (re-export в app/ через Next.js)
├── widgets/      ← FSD: составные блоки (TabBar, BriefCard, StatsPanel)
├── features/     ← FSD: пользовательские действия (ChangeTemplate, UpdateSettings)
├── entities/     ← FSD: бизнес-сущности (brief/, user/, template/)
│   └── {entity}/
│       ├── ui/
│       ├── model/
│       ├── api/
│       └── index.ts  ← Public API
└── shared/       ← FSD: утилиты, UI-kit, конфиг
    ├── ui/
    ├── lib/
    ├── api/
    └── config/
```

### Правила импортов
- Слой `app` может импортировать из `pages`, `widgets`, `features`, `entities`, `shared`
- Слой `pages` может импортировать из `widgets`, `features`, `entities`, `shared`
- Слой `widgets` может импортировать из `features`, `entities`, `shared`
- Слой `features` может импортировать из `entities`, `shared`
- Слой `entities` может импортировать только из `shared`
- Слой `shared` не импортирует из вышестоящих слоёв **НИКОГДА**
- **Импорт между слайсами одного слоя запрещён** (например, `entities/brief` не может импортировать из `entities/user`)

### Интеграция с Next.js App Router
Страницы Next.js (`app/page.tsx`) служат тонкими обёртками — re-export из FSD `pages/`:
```tsx
export { DashboardPage as default } from '@/pages/dashboard';
```

---

## ADR-002: Общий код выносится в shared-пакет

- **Дата**: 2026-03-11
- **Статус**: ПРИНЯТО

### Контекст
`TelegramProvider.tsx`, `lib/auth.ts`, `lib/supabase.ts` **полностью дублируются** между `app/bot/web/` и `app/admin_bot/web/`.

### Решение
1. Общий код переносится в `shared/` слой каждого TMA
2. При необходимости, единый `packages/shared-tma/` пакет через npm workspaces

---

## ADR-003: Обязательный Public API (index.ts)

- **Дата**: 2026-03-11
- **Статус**: ПРИНЯТО

### Решение
Каждый слайс (slice) FSD экспортирует **только** через `index.ts`:

```ts
// ✅ Правильно
import { BriefCard } from '@/entities/brief';

// ❌ Запрещено — прямой импорт из глубины слайса
import { BriefCard } from '@/entities/brief/ui/BriefCard';
```

---

## ADR-004: Zod-валидация всех API-ответов

- **Дата**: 2026-03-11
- **Статус**: ПРИНЯТО

### Решение
Все данные с сервера валидируются через Zod-схемы в `entities/{entity}/model/`:

```ts
// entities/brief/model/schema.ts
import { z } from 'zod';

export const BriefSchema = z.object({
  id: z.string().uuid(),
  template_slug: z.string(),
  processing_state: z.enum(['pending', 'done', 'failed']),
  brief_data: z.record(z.string()).nullable(),
  pdf_url: z.string().url().nullable(),
  created_at: z.string().datetime(),
});

export type Brief = z.infer<typeof BriefSchema>;
```

---

## ADR-005: TDD для всех фичей TMA

- **Дата**: 2026-03-11
- **Статус**: ПРИНЯТО

### Решение
Ни один компонент или хук не пишется без предварительного падающего теста.
Стек: **Vitest** + **React Testing Library**.

Цикл: Red → Green → Refactor.

---

## ADR-006: Python Backend сохраняет Layered Architecture

- **Дата**: 2026-03-11
- **Статус**: ПРИНЯТО

### Контекст
FSD — фронтенд-методология. Python-бэкенд уже имеет хорошую слоистую архитектуру.

### Решение
Текущая структура `models → db → services → worker` **сохраняется** без изменений. FSD применяется исключительно к Next.js TMA.

---

## ADR-007: Все запросы к Telegram WebApp API через хук useTelegram()

- **Дата**: 2026-03-11
- **Статус**: ПРИНЯТО

### Решение
Весь доступ к `window.Telegram.WebApp` проходит через единственный провайдер `TelegramProvider` и хук `useTelegram()`. Прямое обращение к глобальному объекту `Telegram` **запрещено**.

---

## ADR-008: Инкрементальная миграция на FSD через TDD

- **Дата**: 2026-03-11
- **Статус**: ЗАВЕРШЕНО

### Контекст
Переписывание всего TMA проекта с нуля — высокий риск сломать работающий функционал (Big Bang Rewrite). В то же время нам нужно перевести кодовую базу в состояние FSD (ADR-001).

### Решение
Миграция на FSD производится строго **инкрементально**, по одной сущности/фиче за раз (strangler fig pattern).
1. Выбирается один целевой блок из "God Component".
2. Создается инфраструктура или пустые директории для нового FSD-слоя.
3. Пишутся архитектурные юнит-тесты (Vitest), проверяющие правильность изоляции слоев (падающий тест).
4. Логика переносится во вновь созданную FSD-папку (`entities/`, `features/`).
5. Старый компонент обновляется — теперь он импортирует логику из перенесенного места (тест становится зеленым).

### Результат миграции (Фазы 1–4)
| Слой | Модули |
|------|--------|
| `entities/` | `brief`, `user`, `template` |
| `features/` | `update-settings`, `select-template` |
| `shared/` | `api/`, `ui/`, `lib/telegram/` |

**Метрики:** 34 теста в 10 файлах, 7 архитектурных guards, `next build` без ошибок.

### Последствия
*   **Хорошие:** Уменьшение риска регрессий, кодовая база всегда остается работоспособной на любом этапе миграции.
*   **Плохие:** Какое-то время проект будет жить в "гибридном" состоянии, где часть кода в новом FSD, часть — в legacy (внутри `page.tsx`).
*   **Итог:** God Component `page.tsx` полностью декомпозирован. Файл содержит только оркестрацию (~170 строк).

---

## ADR-009: Апгрейд Next.js 14→15 + React 18→19

- **Дата**: 2026-03-11
- **Статус**: ПРИНЯТО

### Контекст
После завершения FSD-миграции стек отставал на 2 мажорных версии Next.js и 1 версию React.

### Решение
Обновить core-зависимости: `next` 14→15, `react` 18→19, `@testing-library/react` 14→16, `eslint-config-next` 14→15, Vitest JSX `classic`→`automatic`.

### Последствия
*   **Хорошие:** React 19 features (use, Actions), Next.js 15 improvements, актуальные security patches.
*   **Плохие:** Shared JS +17% (87→102 kB). Допустимо для TMA.

## ADR-010: Zod Validation для API Routes (Fail Fast)

### Контекст
PATCH /api/settings использовал ad-hoc regex и typeof проверки — молча игнорировал невалидные поля, возвращал 500 на кривой JSON, принимал произвольные строки в `default_template`.

### Решение
Все мутирующие API роуты валидируют input через Zod-схемы в `lib/schemas/`. Используется `safeParse()` + `strict()`. Ошибки возвращаются как `{ error, details: [{ field, message }] }` с HTTP 400.

### Последствия
*   **Хорошие:** Fail Fast, структурированные ошибки, SQL injection защита через enum whitelist, 13 тестов.
*   **Плохие:** Нет.

## ADR-011: Security Hardening — Auth Validation

### Контекст
`validateInitData()` использовал `!==` для сравнения хэшей (timing attack) и не проверял `auth_date` из будущего (clock skew attack). `/api/history` возвращал `user_id` (PII).

### Решение
`crypto.timingSafeEqual` для хэш-сравнения. Отклоняем `auth_date > now + 60s`. Убрали `user_id` из response. 12 security тестов.

### Последствия
*   **Хорошие:** Zero-trust auth, нет PII leak, timing-safe, TDD coverage.
*   **Плохие:** Нет.

## ADR-012: Playwright E2E Smoke Tests в CI

### Контекст
Юнит-тесты (Vitest) покрывают логику, но не проверяют реальную работу приложения в браузере. Ручные Puppeteer-тесты нашли продакшен стабильным, но не автоматизированы.

### Решение
Playwright E2E тесты в `e2e/smoke.spec.ts` (7 тестов): загрузка страницы, табы, hydration, CORS, 404 ассеты, API auth, навигация. Запускаются в CI после build, перед деплоем.

### Последствия
*   **Хорошие:** Автоматический smoke test перед каждым деплоем, отчёт в GitHub Artifacts.
*   **Плохие:** +~30с к CI pipeline (установка Chromium).

---

## ADR-013: Монорепо — корневой `package.json` и тестовая инфраструктура

- **Дата**: 2026-03-11
- **Статус**: ПРИНЯТО

### Контекст
В корневом `package.json` случайно появились `devDependencies` (vitest, jsdom, @testing-library, @vitejs/plugin-react) с **другими версиями**, чем в `app/bot/web/package.json`. Запуск `npx vitest run` из корня проекта использовал корневой vitest **без `vitest.config.ts`** — среда `jsdom` не загружалась, и все 17 React-компонентных тестов падали с `ReferenceError: document is not defined`. Дополнительно, все `.tsx` тест-файлы содержали директиву `"use client"` — это Next.js директива, не имеющая отношения к тестам.

### Решение
1. **Корневой `package.json`** очищен от `devDependencies`. Все скрипты (`test`, `build`, `dev`, `lint`) делегируют через `cd app/bot/web && ...` — тесты выполняются в контексте веб-воркспейса с правильным `vitest.config.ts` (jsdom, path aliases, setupFiles).
2. **`"use client"` удалён** из всех 7 тест-файлов — директива применяется только к React-компонентам в Next.js, не к тестам.
3. **Тесты всегда запускаются внутри `app/bot/web/`** — это гарантирует корректное разрешение зависимостей (react, testing-library) из правильного `node_modules`.

### Правила
- ❌ **Запрещено** добавлять `vitest`, `@testing-library/*`, `react` и другие web-зависимости в корневой `package.json`
- ❌ **Запрещено** использовать `"use client"` в тест-файлах
- ✅ **Обязательно** запускать тесты через `npm test` из корня (делегирует в `app/bot/web/`) или из `app/bot/web/` напрямую

### Последствия
*   **Хорошие:** 68/68 тестов проходят, единая точка входа `npm test` из корня, нет конфликтов версий.
*   **Плохие:** Нет.

---

## ADR-014: Resilience Pattern — ретраи и таймауты для сетевых вызовов

- **Дата**: 2026-03-11
- **Статус**: ПРИНЯТО

### Контекст
Два слабых места отказоустойчивости:
1. **`scripts/migrate.py`** — при запуске Docker Compose сеть может подняться на 1-5с позже Python-скрипта. Без ретраев контейнер падает с `sys.exit(1)` и Docker перезапускает его целиком.
2. **`apiFetch.ts`** — обёртка над `fetch()` без таймаута (запрос может висеть бесконечно в TMA) и без автоматического выброса ошибок на HTTP 4xx/5xx.

### Решение

**Python (миграции):**
- Exponential backoff: до 5 попыток с задержкой 1→2→4→8с
- Ретрай **только** для `psycopg2.OperationalError` (сетевые ошибки)
- Программные ошибки (SQL syntax, etc.) → немедленный `sys.exit(1)` без ретрая
- Каждая попытка логируется: `migration_retry(attempt=N, backoff_s=M)`

**TypeScript (API-вызовы в TMA):**
- `AbortController` с таймаутом 10 секунд
- `ApiError` class: выбрасывается на любой `!response.ok` (fail fast)
- Пользовательский `signal` от вызывающего кода не перезаписывается

### Правила
- ❌ **Запрещено** делать `fetch()` без таймаута в TMA
- ❌ **Запрещено** игнорировать HTTP-статусы ответов (`.catch(console.error)`)
- ✅ **Обязательно** использовать `createApiFetch()` для всех API-вызовов
- ✅ **Обязательно** ловить `ApiError` и показывать пользователю осмысленное сообщение

### Последствия
*   **Хорошие:** Контейнер не падает при медленном старте сети; TMA не зависает на бесконечных запросах; ошибки API видны в коде через typed `ApiError`.
*   **Плохие:** +16с максимальная задержка старта миграции (сумма всех backoff).

## ADR-015: Атомарный Upsert вместо Select+Insert (Race Conditions Prevention)

- **Дата**: 2026-03-11
- **Статус**: ПРИНЯТО

### Контекст
Метод `UserRepo.get_or_create` (и потенциально другие места) использовал паттерн Read-Modify-Write (`SELECT` -> если пусто -> `INSERT`). При большом количестве параллельных запросов от одного пользователя (например, при быстром клике или при пакетной обработке сообщений) этот паттерн приводит к состояниям гонки (Race Condition). Два параллельных запроса могут сделать `SELECT` одновременно, увидеть, что пользователя нет, и оба попытаться сделать `INSERT`, что приведет к ошибке уникальности ключа или дублированию данных.

### Решение
Вместо пары `SELECT`+`INSERT` использовать атомарную операцию базы данных `UPSERT` (в Supabase API это метод `.upsert()`) с указанием поля `on_conflict` (`telegram_id`).

```python
sb.table(UserRepo.TABLE).upsert(
    user_data, 
    on_conflict="telegram_id"
).execute()
```

### Правила
- ❌ **Запрещено** использовать проверку существования записи (`SELECT`) перед её созданием (`INSERT`), если логика подразумевает создание при отсутствии.
- ✅ **Обязательно** использовать метод `.upsert()` с корректным аргументом `on_conflict` для всех операций "получить или создать".

### Последствия
*   **Хорошие:** Защита от состояний гонки на уровне СУБД (PostgreSQL), сокращение количества сетевых запросов (1 вместо 2 в худшем случае), упрощение кода.
*   **Плохие:** Метод `upsert` всегда возвращает обновленную стpoку, поэтому невозможно по одному запросу понять, была ли строка создана с нуля или просто обновлена (для метрик "новых пользователей" потребуется отдельная логика, например, сравнение `created_at` и `updated_at`, если они ведутся).
