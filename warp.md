# Контекст проекта: WANT beauty studio (бот + web app + backend)
Этот репозиторий — система управления расписанием салона красоты WANT:
- `bot/` — Telegram-бот, который открывает WebApp.
- `web_app/` — Next.js (App Router) WebApp для мастеров/админки.
- `backend/` — FastAPI API + PostgreSQL (SQLAlchemy) + JWT.

## 1) Быстрый запуск (локально)
### Backend (FastAPI)
1. Создать виртуальное окружение и установить зависимости:
   - `pip install -r backend/requirements.txt`
2. Переменные окружения (примерные):
   - `DATABASE_URL` (по умолчанию в коде: `postgresql://postgres:postgres@localhost:5433/want_salon`)
   - `JWT_SECRET_KEY` (по умолчанию: `default-secret-key`)
   - `PORT` (по умолчанию 8000)
3. Запуск:
   - `uvicorn server:app --reload --host 0.0.0.0 --port 8000` (в папке `backend/`)
   - либо `python backend/server.py`
4. Проверка:
   - `GET /api/health`
   - Swagger: `/docs`

### WebApp (Next.js)
1. Установить зависимости:
   - `cd web_app && npm install`
2. Переменные окружения:
   - `NEXT_PUBLIC_API_URL=http://localhost:8000`
3. Запуск разработки:
   - `npm run dev` (в `web_app/`, запускается на 3000)

Важно: `web_app/package.json` содержит `start: next start -p 8000` — это конфликтует с дефолтным портом backend (8000). Для production обычно нужно развести порты или проксировать.

### Telegram bot
1. Установить зависимости:
   - `pip install -r bot/requirements.txt`
2. Переменные окружения:
   - `TELEGRAM_BOT_TOKEN`
   - `WEB_APP_URL` (URL вашего развернутого `web_app`)
   - (в `bot/README.md` упоминается `BACKEND_URL`, но в `bot/bot.py` сейчас не используется)
3. Запуск:
   - `python bot/bot.py`

## 2) Архитектура и поток данных
### Основной сценарий
1. Пользователь пишет боту `/start`.
2. Бот отправляет кнопку **"Открыть приложение"** (Telegram WebApp) -> открывается `WEB_APP_URL`.
3. `web_app` подключает Telegram WebApp JS (`telegram-web-app.js`) и берет данные пользователя из `window.Telegram.WebApp.initDataUnsafe.user`.
4. WebApp отправляет `POST /api/masters/register` на backend (Telegram user id + first_name).
5. Backend:
   - если мастер с таким `telegram_id` уже есть — возвращает JWT + данные мастера
   - если нет — создает запись в `masters` и тоже возвращает JWT + мастера
6. WebApp сохраняет:
   - `auth_token` (JWT) в localStorage
   - `master_id` в localStorage
7. Дальше WebApp работает с расписанием через API.

## 3) Backend (`backend/`)
### Технологии
- FastAPI + Uvicorn
- SQLAlchemy (sync)
- PostgreSQL (по умолчанию)
- Alembic (миграции)
- JWT (PyJWT)

### Важные файлы
- `backend/server.py` — основной FastAPI сервер, endpoints.
- `backend/database.py` — engine/session, `DATABASE_URL`, `JWT_SECRET_KEY`, `init_db()`.
- `backend/models.py` — SQLAlchemy модели (`MasterDB`, `AppointmentDB`) + Pydantic модели для API.
- `backend/middleware.py` — `verify_token` (декодирует JWT и проверяет мастера в БД).
- `backend/alembic/` — миграции Alembic.

### Схема данных (по `backend/models.py`)
**masters**
- `id` int PK
- `name` string
- `color` string
- `telegram_id` int unique nullable
- `role` string (default: `master`) — используется в UI для показа админки

**appointments**
- `id` int PK
- `time` string (например `"10:00"`)
- `duration` int (default 60)
- `client_name` string
- `comment` text nullable
- `date` string (YYYY-MM-DD)
- `status` string (`scheduled|completed|cancelled`)
- `cash_payment` float
- `card_payment` float
- `master_id` FK -> masters.id
- `created_at`, `updated_at`

### Миграции (Alembic)
- `fe98800ea76c` — initial: создает `masters` и `appointments`
- `a3848c6575e2` — добавляет `masters.telegram_id` + unique
- `bd0f87ae06f1` — добавляет `masters.role`

### API endpoints (основные)
- `GET /api/health`
- `GET /api/masters`
- `POST /api/masters/register` — вход/регистрация мастера по `telegram_id` -> возвращает `{ token, master }`
- `GET /api/appointments?date=YYYY-MM-DD&master_id=...`
- `GET /api/appointments/range?start_date=...&end_date=...&master_id=...`
- `POST /api/appointments/{master_id}`
- `PUT /api/appointments/{master_id}/{appointment_id}`
- `POST /api/appointments/{master_id}/{appointment_id}/complete`
- `POST /api/appointments/{master_id}/{appointment_id}/cancel`
- `DELETE /api/appointments/{master_id}/{appointment_id}`
- `GET /api/stats`
- `GET /api/stats/range?start_date=...&end_date=...`

### Замечания по безопасности/аутентификации
- В `web_app/lib/api.ts` все запросы идут через `authenticatedFetch()` с `Authorization: Bearer <token>`.
- В backend есть `verify_token` (как dependency), но большинство endpoint’ов в `backend/server.py` сейчас не защищены этим dependency (то есть токен может не проверяться на стороне API).

### Замечания по структуре Base
- `backend/database.py` объявляет `Base = declarative_base()`, но реальные модели используют `Base` из `backend/models.py`.
- `database.init_db()` импортирует `Base` из `models` и делает `Base.metadata.create_all()`. Это работает, но может путать, потому что Base фактически один — из `models.py`.

## 4) WebApp (`web_app/`)
### Технологии
- Next.js (App Router), TypeScript
- Tailwind + Radix UI компоненты
- Telegram WebApp интеграция через подключение `telegram-web-app.js`

### Важные файлы
- `web_app/lib/api.ts` — клиент для backend API + localStorage (auth_token, master_id).
- `web_app/app/layout.tsx` — добавляет скрипт Telegram WebApp.
- `web_app/app/page.tsx` — домашняя страница, выполняет Telegram-аутентификацию (сейчас есть `alert()` отладка).
- `web_app/app/schedule/page.tsx`, `web_app/app/day/[date]/page.tsx`, `web_app/app/overview/page.tsx` — страницы расписания.
- `web_app/app/admin/page.tsx` — админ-панель (видна, если `currentMaster.role === 'admin'`).
- `web_app/components/appointment-*.tsx` — UI карточки/диалоги записи.

### Переменные окружения
- `NEXT_PUBLIC_API_URL` — базовый URL backend (используется в `web_app/lib/api.ts`).

### Особенности
- `next.config.mjs` включает `typescript.ignoreBuildErrors = true` — сборка может пройти даже при ошибках TS.
- На главной странице (`app/page.tsx`) пока не реализована загрузка `todayAppointments/weekAppointments` (состояния есть, но данных нет); есть `alert()`-ы для отладки Telegram и токена.

## 5) Bot (`bot/`)
### Технологии
- `python-telegram-bot` (polling)
- env через `python-dotenv`

### Поведение
- Команда `/start` отправляет кнопку с `WebAppInfo(url=WEB_APP_URL)`.
- Дальше пользователь работает уже в WebApp.

### Deploy
- Есть `bot/railway.toml` и `bot/Procfile` (ориентация на Railway).

## 6) Что полезно знать перед изменениями
- Порты: в текущих скриптах потенциальный конфликт `web_app start -p 8000` vs backend `:8000`.
- Авторизация: UI ожидает JWT, но API не везде реально проверяет токен.
- Alembic и `create_all`: одновременно присутствуют миграции и `Base.metadata.create_all()` при старте приложения.

## 7) Карта директорий (кратко)
- `backend/` — FastAPI + SQLAlchemy + Alembic
- `bot/` — Telegram bot + Railway deploy
- `web_app/` — Next.js WebApp (мастер/админка)
