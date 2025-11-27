# Инструкция по настройке бэкенда для приложения WANT (FastAPI)

## Этап 1: Подготовка окружения

### 1.1 Установка Python и зависимостей

\`\`\`bash
# Создайте папку для бэкенда в корне проекта
mkdir backend
cd backend

# Создайте виртуальное окружение
python -m venv venv

# Активируйте виртуальное окружение
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install fastapi uvicorn[standard] python-dotenv pydantic
\`\`\`

### 1.2 Структура проекта после настройки

\`\`\`
want-salon-scheduler/
├── app/                    # Next.js фронтенд
├── components/
├── backend/               # Python бэкенд (FastAPI)
│   ├── venv/             # Виртуальное окружение
│   ├── server.py         # Главный файл сервера FastAPI
│   ├── requirements.txt  # Зависимости Python
│   └── .env              # Переменные окружения
├── package.json
└── README.md
\`\`\`

---

## Этап 2: Создание FastAPI сервера

### 2.1 Файл `backend/server.py` уже создан

Сервер использует FastAPI с следующими преимуществами:
- Автоматическая валидация данных через Pydantic
- Автоматическая генерация документации (Swagger UI)
- Асинхронная обработка запросов
- Типизация и автодополнение
- Высокая производительность

### 2.2 Создайте файл `backend/.env`

\`\`\`env
DATABASE_URL=sqlite:///salon.db
SECRET_KEY=your-secret-key-here
PORT=8000
\`\`\`

---

## Этап 3: Запуск бэкенда

### 3.1 Запустите FastAPI сервер

\`\`\`bash
cd backend

uvicorn server:app --reload --host 0.0.0.0 --port 8000
\`\`\`

Или через Python:

\`\`\`bash
python server.py
\`\`\`

Сервер запустится на `http://localhost:8000`

### 3.2 Проверьте работу API

Откройте в браузере:
- Health check: `http://localhost:8000/api/health`
- **Swagger UI документация**: `http://localhost:8000/docs` 
- **ReDoc документация**: `http://localhost:8000/redoc`

Должны увидеть: `{"status": "ok", "message": "WANT Salon API is running"}`

### 3.3 Интерактивная документация API

FastAPI автоматически создает интерактивную документацию:

1. Откройте `http://localhost:8000/docs`
2. Вы увидите все доступные endpoints
3. Можете тестировать API прямо в браузере
4. Видны все параметры, типы данных и примеры

---

## Этап 4: Настройка фронтенда

### 4.1 Установите зависимости Next.js

\`\`\`bash
# В корне проекта (не в папке backend)
npm install
\`\`\`

### 4.2 Создайте файл `.env.local` в корне проекта

\`\`\`env
NEXT_PUBLIC_API_URL=http://localhost:8000
\`\`\`

### 4.3 Запустите Next.js приложение

\`\`\`bash
npm run dev
\`\`\`

Приложение запустится на `http://localhost:3000`

---

## Этап 5: Тестирование интеграции

### 5.1 Проверьте, что оба сервера запущены

- FastAPI: `http://localhost:8000`
- Next.js: `http://localhost:3000`

### 5.2 Откройте приложение в браузере

Перейдите на `http://localhost:3000` и проверьте:

1. Создание новой записи
2. Просмотр расписания
3. Редактирование записи
4. Проведение записи с оплатой
5. Панель администратора

### 5.3 Тестирование через Swagger UI

1. Откройте `http://localhost:8000/docs`
2. Попробуйте выполнить запросы:
   - GET `/api/masters` - получить список мастеров
   - GET `/api/appointments` - получить все записи
   - POST `/api/appointments/{master_id}` - создать запись

---

## Этап 6: Развертывание (Production)

### 6.1 Для бэкенда (FastAPI)

Варианты развертывания:
- **Railway**: Отличная поддержка FastAPI
- **Render**: Бесплатный tier для FastAPI
- **DigitalOcean App Platform**: Простое развертывание
- **AWS Lambda**: Serverless вариант
- **Docker**: Контейнеризация приложения

#### Пример Dockerfile для FastAPI:

\`\`\`dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
\`\`\`

### 6.2 Для фронтенда

Рекомендуется **Vercel** (создатели Next.js):

\`\`\`bash
# Установите Vercel CLI
npm i -g vercel

# Разверните проект
vercel
\`\`\`

### 6.3 Обновите переменные окружения

В production обновите `NEXT_PUBLIC_API_URL` на реальный URL вашего бэкенда.

---

## Этап 7: Преимущества FastAPI над Flask

### Почему FastAPI лучше для этого проекта:

1. **Автоматическая валидация**: Pydantic модели проверяют данные автоматически
2. **Документация из коробки**: Swagger UI и ReDoc генерируются автоматически
3. **Типизация**: Полная поддержка type hints и автодополнение
4. **Производительность**: Один из самых быстрых Python фреймворков
5. **Асинхронность**: Поддержка async/await для высокой нагрузки
6. **Современный стандарт**: Активное сообщество и развитие

---

## Troubleshooting

### Проблема: CORS ошибки

**Решение**: Убедитесь, что в `backend/server.py` настроен CORS:
\`\`\`python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # В production укажите ваш домен
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
\`\`\`

### Проблема: Порт уже занят

**Решение**: Измените порт при запуске:
\`\`\`bash
uvicorn server:app --reload --port 8001
\`\`\`

Или остановите процесс:
\`\`\`bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:8000 | xargs kill -9
\`\`\`

### Проблема: ModuleNotFoundError

**Решение**: Убедитесь, что виртуальное окружение активировано и зависимости установлены:
\`\`\`bash
source venv/bin/activate  # или venv\Scripts\activate на Windows
pip install -r requirements.txt
\`\`\`

---

## Полезные команды FastAPI

\`\`\`bash
# Запуск с автоперезагрузкой (для разработки)
uvicorn server:app --reload

# Запуск на определенном порту
uvicorn server:app --port 8001

# Запуск с несколькими воркерами (для production)
uvicorn server:app --workers 4

# Остановить сервер
Ctrl + C

# Деактивировать виртуальное окружение
deactivate

# Обновить зависимости
pip freeze > requirements.txt

# Установить зависимости из файла
pip install -r requirements.txt

# Проверить версию FastAPI
pip show fastapi
\`\`\`

---

## API Endpoints (краткая справка)

| Метод | Endpoint | Описание |
|-------|----------|----------|
| GET | `/api/health` | Проверка работы API |
| GET | `/api/masters` | Получить всех мастеров |
| GET | `/api/appointments` | Получить все записи |
| GET | `/api/appointments/{master_id}` | Записи конкретного мастера |
| POST | `/api/appointments/{master_id}` | Создать запись |
| PUT | `/api/appointments/{master_id}/{id}` | Обновить запись |
| POST | `/api/appointments/{master_id}/{id}/complete` | Провести запись |
| POST | `/api/appointments/{master_id}/{id}/cancel` | Отменить запись |
| DELETE | `/api/appointments/{master_id}/{id}` | Удалить запись |
| GET | `/api/stats` | Получить статистику |

Полная документация доступна на `http://localhost:8000/docs`
