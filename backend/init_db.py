import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
from models import Base, MasterDB
from database import engine

# Загрузка переменных окружения
load_dotenv()

def init_database():
    """
    Инициализация базы данных: создание таблиц и добавление начальных данных
    """
    print("Создание таблиц в базе данных...")
    Base.metadata.create_all(bind=engine)
    
    # Создание сессии
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()
    
    

if __name__ == "__main__":
    init_database()