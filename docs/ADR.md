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
