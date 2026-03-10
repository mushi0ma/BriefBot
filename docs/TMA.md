# 📱 TMA Web App (Telegram Mini App)

Пользовательский интерфейс BriefBot — Telegram Mini App на Next.js.

## Стек

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Zod v4** — валидация API input
- **Vitest** + **React Testing Library** — тестирование
- **Vercel** — деплой
- **Supabase** — база данных (через API routes)

## Архитектура: Feature-Sliced Design (FSD)

```
src/
├── entities/          # Доменные модели
│   ├── template/      # Шаблоны брифов (Zod-схемы, константы)
│   ├── brief/         # Бриф (схема, helpers)
│   └── user/          # Пользователь (схема)
├── features/          # Бизнес-фичи
│   ├── select-template/   # Выбор шаблона (TemplatePicker)
│   └── update-settings/   # Настройки бренда (BrandColorPicker, LogoInput)
├── shared/            # Общий код
│   ├── api/           # createApiFetch (auth wrapper)
│   ├── lib/telegram/  # TelegramProvider, useTelegram()
│   └── ui/            # TabIcon
└── widgets/           # Композитные блоки UI
    ├── history-tab/   # Вкладка истории брифов
    ├── settings-tab/  # Вкладка настроек
    └── templates-tab/ # Вкладка шаблонов

app/                   # Next.js App Router
├── page.tsx           # Оркестрация (только layout + tabs)
├── api/settings/      # GET/PATCH настроек (Zod валидация)
└── api/history/       # GET истории

lib/                   # Серверные утилиты
├── auth.ts            # validateInitData (HMAC-SHA256, timingSafeEqual)
├── supabase.ts        # Supabase admin client
└── schemas/
    └── settings.ts    # SettingsPatchSchema (Zod)
```

## Локальная разработка

```bash
cd app/bot/web
npm install
npm run dev       # http://localhost:3000
npm test          # 66 тестов
npm run build     # production build
```

## API Routes

### `GET /api/settings`
Возвращает `brand_color`, `logo_url`, `default_template` пользователя.

### `PATCH /api/settings`
Обновляет настройки. Валидация через Zod:
```json
{
  "brand_color": "#FF5500",
  "logo_url": "https://example.com/logo.png",
  "default_template": "minimal"
}
```
Допустимые шаблоны: `default`, `minimal`, `detailed`, `creative`.

Ошибки валидации (400):
```json
{
  "error": "Validation failed",
  "details": [{ "field": "brand_color", "message": "Must be a valid hex color" }]
}
```

### `GET /api/history`
Возвращает последние 50 брифов пользователя.

## Аутентификация

Все API роуты проверяют Telegram `initData` через HMAC-SHA256:
1. Клиент отправляет `initData` в заголовке `Authorization`
2. Сервер валидирует хэш через `validateInitData()` (`lib/auth.ts`)
3. Окно валидности: 10 минут (auth_date не старше 600с, не из будущего > 60с)
4. Сравнение хэшей через `crypto.timingSafeEqual`

## Тестирование

```bash
npm test -- --run                    # все тесты
npm test -- --run lib/__tests__/     # серверные тесты
npm test -- --run src/__tests__/     # FSD guard тесты
```

| Категория | Тестов |
|-----------|--------|
| Auth security | 12 |
| Settings schema | 13 |
| FSD imports | 6 |
| Entity schemas | 9 |
| Feature components | 12 |
| Widget components | 5 |
| Shared | 5 |
| **Всего** | **66** |

## Деплой

TMA деплоится на **Vercel** автоматически при push в `main`.
CI pipeline (GitHub Actions) прогоняет тесты и билд перед деплоем.
