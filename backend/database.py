from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Получение параметров подключения из переменных окружения
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost/want_salon")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "default-secret-key")
# Создание движка SQLAlchemy
engine = create_engine(DATABASE_URL)

# Создание сессии
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Импорт базового класса для моделей
Base = declarative_base()

# Функция для получения сессии базы данных
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Функция для инициализации базы данных
def init_db():
    from models import Base
    Base.metadata.create_all(bind=engine)