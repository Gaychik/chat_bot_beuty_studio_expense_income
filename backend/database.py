from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Получение параметров подключения из переменных окружения
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:keptRfiWlLJgjLeSRRPkOqLncgNZKWsB@caboose.proxy.rlwy.net:17331/railway")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "default-secret-key")

# Создание движка SQLAlchemy с параметрами для более надежного подключения
engine = create_engine(
    DATABASE_URL,
    pool_size=10,          # Размер пула соединений
    max_overflow=20,       # Максимальное количество дополнительных соединений
    pool_recycle=3600,     # Пересоздание соединений каждые 60 минут
    pool_pre_ping=True,    # Проверка соединения перед использованием
    echo=False             # Отключение вывода SQL запросов в консоль
)

# Создание сессии
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Импорт базового класса для моделей
Base = declarative_base()

# Функция для получения сессии базы данных
def get_db():
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        db.rollback()
        raise e
    finally:
        db.close()

# Функция для инициализации базы данных
def init_db():
    from models import Base
    Base.metadata.create_all(bind=engine)