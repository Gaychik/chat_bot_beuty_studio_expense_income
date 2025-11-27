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
    
    try:
        # Проверка наличия мастеров в базе
        masters_count = db.query(MasterDB).count()
        
        if masters_count == 0:
            print("Добавление начальных данных...")
            # Добавление начальных мастеров
            initial_masters = [
                MasterDB(id=1, name="Анна", specialization="Парикмахер"),
                MasterDB(id=2, name="Мария", specialization="Маникюр"),
                MasterDB(id=3, name="Елена", specialization="Визажист"),
            ]
            
            db.add_all(initial_masters)
            db.commit()
            print(f"Добавлено {len(initial_masters)} мастеров")
        else:
            print(f"В базе уже есть {masters_count} мастеров, пропускаем добавление начальных данных")
            
        print("Инициализация базы данных завершена успешно!")
    except Exception as e:
        db.rollback()
        print(f"Ошибка при инициализации базы данных: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    init_database()