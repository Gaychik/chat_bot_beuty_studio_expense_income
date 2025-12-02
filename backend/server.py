from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import OperationalError
from typing import Optional, Dict, List,Literal
from datetime import datetime,timedelta
import os
from dotenv import load_dotenv
import jwt
from middleware import verify_token
from database import JWT_SECRET_KEY, get_db, init_db
# Импорт моделей и функций из новых модулей
from models import (
    Appointment, AppointmentCreate, AppointmentUpdate, 
    Master, CompleteAppointmentRequest, Stats, Payment,
    AppointmentDB, MasterDB, MasterRegisterRequest
)


load_dotenv()

# Определение lifespan для управления жизненным циклом приложения

# Инициализация базы данных при запуске
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Код, выполняемый при запуске
    init_db()
    # Добавление начальных данных, если база пуста

    yield  # Здесь приложение работает
    
    # Код, выполняемый при завершении работы
    # Например, закрытие соединений с базой данных

# Создание экземпляра FastAPI с использованием lifespan
app = FastAPI(
    title="WANT Salon API",
    description="API для управления расписанием салона красоты",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В production укажите конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "WANT Salon API is running"}

@app.get("/api/masters", response_model=List[Master])
async def get_masters(db: Session = Depends(get_db)):
    masters = db.query(MasterDB).all()
    return [{"id": str(m.id), "name": m.name, "color": m.color, "role": m.role} for m in masters]


@app.get("/api/masters/{master_id}/appointments")
async def get_appointments(
    master_id: str,
    date: Optional[str] = Query(None, description="Дата в формате YYYY-MM-DD"),
    db: Session = Depends(get_db)
):
    # Проверка существования мастера
    master = db.query(MasterDB).filter(MasterDB.id == int(master_id)).first()
    if not master:
        raise HTTPException(status_code=404, detail="Master not found")
    
    # Получение записей
    query = db.query(AppointmentDB).filter(AppointmentDB.master_id == int(master_id))
    if date:
        query = query.filter(AppointmentDB.date == date)
    
    appointments = query.all()
    
    # Преобразование в формат API
    result = []
    for apt in appointments:
        result.append({
            "id": str(apt.id),
            "time": apt.time,
            "duration": apt.duration,
            "clientName": apt.client_name,
            "comment": apt.comment or "",
            "status": apt.status,
            "date": apt.date,
            "payment": {"cash": apt.cash_payment, "card": apt.card_payment} if apt.status == "completed" else {}
        })
    
    return result

@app.get("/api/appointments")
async def get_appointments(
    date: Optional[str] = Query(None, description="Дата в формате YYYY-MM-DD"),
    master_id: Optional[str] = Query(None, description="ID мастера"),
    db: Session = Depends(get_db)
):
    result = {}
    
    # Получение всех мастеров
    masters = db.query(MasterDB).all()
    #master_id = auth_data.get("master_id") if auth_data else None

    for master in masters:
        if master_id and str(master.id) != master_id:
            continue
        
        # Получение записей для каждого мастера
        query = db.query(AppointmentDB).filter(AppointmentDB.master_id == master.id)
        if date:
            query = query.filter(AppointmentDB.date == date)
        
        appointments = query.all()
        
        # Преобразование в формат API
        master_appointments = []
        for apt in appointments:
            master_appointments.append({
                "id": str(apt.id),
                "time": apt.time,
                "duration": apt.duration,
                "clientName": apt.client_name,
                "comment": apt.comment or "",
                "status": apt.status,
                "date": apt.date,
                "payment": {"cash": apt.cash_payment, "card": apt.card_payment} if apt.status == "completed" else None
            })
        
        result[str(master.id)] = master_appointments
    
    return result


@app.get("/api/appointments/range")
async def get_appointments_range(
    start_date: str = Query(..., description="Начальная дата в формате YYYY-MM-DD"),
    end_date: str = Query(..., description="Конечная дата в формате YYYY-MM-DD"),
    master_id: Optional[str] = Query(None, description="ID мастера (опционально)"),
    db: Session = Depends(get_db)
):
    result = {}
    
    try:
        # Проверяем формат дат
        datetime.strptime(start_date, "%Y-%m-%d")
        datetime.strptime(end_date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    
    # Формируем запрос с учетом master_id если он передан
    query = db.query(AppointmentDB)
    
    if master_id:
        query = query.filter(AppointmentDB.master_id == int(master_id))
    
    # Фильтруем по диапазону дат (сравниваем строки, а не datetime)
    query = query.filter(
        AppointmentDB.date >= start_date,
        AppointmentDB.date <= end_date
    )
    
    appointments = query.all()
    
    for apt in appointments:
        date_key = apt.date
        if date_key not in result:
            result[date_key] = []
        
        result[date_key].append({
            "id": str(apt.id),
            "time": apt.time,
            "duration": apt.duration,
            "clientName": apt.client_name,
            "comment": apt.comment or "",
            "status": apt.status,
            "date": apt.date,
            "payment": {"cash": apt.cash_payment, "card": apt.card_payment} if apt.status == "completed" else None
        })
    
    return result

@app.post("/api/appointments/{master_id}", response_model=Appointment, status_code=201)
async def create_appointment(
    master_id: str, 
    appointment: AppointmentCreate,
    db: Session = Depends(get_db)
):
    # Проверка существования мастера
    master = db.query(MasterDB).filter(MasterDB.id == int(master_id)).first()
    if not master:
        raise HTTPException(status_code=404, detail="Master not found")
    
    # Создание новой записи
    new_appointment = AppointmentDB(
        time=appointment.time,
        duration=appointment.duration,
        client_name=appointment.clientName,
        comment=appointment.comment,
        date=appointment.date,
        status="scheduled",
        master_id=int(master_id)
    )
    
    db.add(new_appointment)
    db.commit()
    db.refresh(new_appointment)
    
    # Возврат в формате API
    return {
        "id": str(new_appointment.id),
        "time": new_appointment.time,
        "duration": new_appointment.duration,
        "clientName": new_appointment.client_name,
        "comment": new_appointment.comment or "",
        "date": new_appointment.date,
        "status": new_appointment.status,
        "payment": None
    }

@app.put("/api/appointments/{master_id}/{appointment_id}", response_model=Appointment)
async def update_appointment(
    master_id: str,
    appointment_id: str,
    appointment: AppointmentUpdate,
    db: Session = Depends(get_db)
):
    # Проверка существования мастера
    master = db.query(MasterDB).filter(MasterDB.id == int(master_id)).first()
    if not master:
        raise HTTPException(status_code=404, detail="Master not found")
    
    # Поиск записи
    apt = db.query(AppointmentDB).filter(
        AppointmentDB.id == int(appointment_id),
        AppointmentDB.master_id == int(master_id)
    ).first()
    
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Обновление полей
    update_data = appointment.model_dump(exclude_unset=True)
    # Маппинг полей API на поля модели базы данных
    field_mapping = {
        "clientName": "client_name",
        "comment": "comment",
        "duration": "duration",
        "time": "time",
        "status": "status"
    }

    for key, value in update_data.items():
        if key in ["clientName", "comment", "duration", "time", "status"]:
            setattr(apt, field_mapping[key], value)
    if "payment" in update_data and update_data["payment"]:
        apt.cash_payment = update_data["payment"].cash
        apt.card_payment = update_data["payment"].card
    
    db.commit()
    db.refresh(apt)
    
    # Возврат в формате API
    return {
        "id": str(apt.id),
        "time": apt.time,
        "duration": apt.duration,
        "clientName": apt.client_name,
        "comment": apt.comment or "",
        "date": apt.date,
        "status": apt.status,
        "payment": {"cash": apt.cash_payment, "card": apt.card_payment} if apt.status == "completed" else None
    }

@app.post("/api/appointments/{master_id}/{appointment_id}/complete", response_model=Appointment)
async def complete_appointment(
    master_id: str,
    appointment_id: str,
    request: CompleteAppointmentRequest,
    db: Session = Depends(get_db)
):
    # Проверка существования мастера
    master = db.query(MasterDB).filter(MasterDB.id == int(master_id)).first()
    if not master:
        raise HTTPException(status_code=404, detail="Master not found")
    
    # Поиск записи
    apt = db.query(AppointmentDB).filter(
        AppointmentDB.id == int(appointment_id),
        AppointmentDB.master_id == int(master_id)
    ).first()
    
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Обновление статуса и платежа
    apt.status = "completed"  # type: ignore
    apt.cash_payment = request.payment.cash  # type: ignore
    apt.card_payment = request.payment.card  # type: ignore
    
    db.commit()
    db.refresh(apt)
    
    # Возврат в формате API
    return {
        "id": str(apt.id),
        "time": apt.time,
        "duration": apt.duration,
        "clientName": apt.client_name,
        "comment": apt.comment or "",
        "date": apt.date,
        "status": apt.status,
        "payment": {"cash": apt.cash_payment, "card": apt.card_payment}
    }

@app.post("/api/appointments/{master_id}/{appointment_id}/cancel", response_model=Appointment)
async def cancel_appointment(
    master_id: str, 
    appointment_id: str,
    db: Session = Depends(get_db)
):
    # Проверка существования мастера
    master = db.query(MasterDB).filter(MasterDB.id == int(master_id)).first()
    if not master:
        raise HTTPException(status_code=404, detail="Master not found")
    
    # Поиск записи
    apt = db.query(AppointmentDB).filter(
        AppointmentDB.id == int(appointment_id),
        AppointmentDB.master_id == int(master_id)
    ).first()
    
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    # Обновление статуса
    apt.status = "cancelled"  # type: ignore
    
    db.commit()
    db.refresh(apt)
    
    # Возврат в формате API
    return {
        "id": str(apt.id),
        "time": apt.time,
        "duration": apt.duration,
        "clientName": apt.client_name,
        "comment": apt.comment or "",
        "date": apt.date,
        "status": apt.status,
        "payment": {"cash": apt.cash_payment, "card": apt.card_payment} if apt.status == "completed" else None  # type: ignore
    }

@app.delete("/api/appointments/{master_id}/{appointment_id}")
async def delete_appointment(
    master_id: str, 
    appointment_id: str,
    db: Session = Depends(get_db)
):
    # Проверка существования мастера
    master = db.query(MasterDB).filter(MasterDB.id == int(master_id)).first()
    if not master:
        raise HTTPException(status_code=404, detail="Master not found")
    
    # Поиск и удаление записи
    apt = db.query(AppointmentDB).filter(
        AppointmentDB.id == int(appointment_id),
        AppointmentDB.master_id == int(master_id)
    ).first()
    
    if not apt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    db.delete(apt)
    db.commit()
    
    return {"message": "Appointment deleted"}

@app.get("/api/stats", response_model=Stats)
async def get_stats(db: Session = Depends(get_db)):
    # Подсчет общего количества записей
    total_appointments = db.query(AppointmentDB).count()
    
    # Подсчет завершенных записей
    completed_appointments = db.query(AppointmentDB).filter(
        AppointmentDB.status == "completed"
    ).count()
    from sqlalchemy import func
    # Подсчет общей выручки
    total_revenue = db.query(
        func.sum(AppointmentDB.cash_payment + AppointmentDB.card_payment)
    ).filter(AppointmentDB.status == "completed").scalar() or 0.0
    
    return {
        "totalAppointments": total_appointments,
        "completedAppointments": completed_appointments,
        "totalRevenue": float(total_revenue)
    }


@app.get("/api/stats/range", response_model=Stats)
async def get_stats_range(
    start_date: str = Query(..., description="Начальная дата в формате YYYY-MM-DD"),
    end_date: str = Query(..., description="Конечная дата в формате YYYY-MM-DD"),
    db: Session = Depends(get_db)
):
    from sqlalchemy import func
    # Подсчет записей в диапазоне дат
    total_appointments = db.query(AppointmentDB).filter(
        AppointmentDB.date >= start_date,
        AppointmentDB.date <= end_date
    ).count()
    
    # Подсчет завершенных записей в диапазоне дат
    completed_appointments = db.query(AppointmentDB).filter(
        AppointmentDB.date >= start_date,
        AppointmentDB.date <= end_date,
        AppointmentDB.status == "completed"
    ).count()
    
    # Подсчет общей выручки в диапазоне дат
    total_revenue = db.query(
        func.sum(AppointmentDB.cash_payment + AppointmentDB.card_payment)
    ).filter(
        AppointmentDB.date >= start_date,
        AppointmentDB.date <= end_date,
        AppointmentDB.status == "completed"
    ).scalar() or 0.0
    
    return {
        "totalAppointments": total_appointments,
        "completedAppointments": completed_appointments,
        "totalRevenue": float(total_revenue)
    }


# @app.post("/api/auth/telegram")
# async def telegram_auth(
#     telegram_id: int,
#     db: Session = Depends(get_db)
# ):
#     try:
#         # Ищем мастера по telegram_id
#         master = db.query(MasterDB).filter(MasterDB.telegram_id == telegram_id).first()
#     except OperationalError as e:
#         raise HTTPException(status_code=503, detail="Database connection error. Please try again.")
    
#     if not master:
#         raise HTTPException(status_code=404, detail="Master not found")
    
#     # Генерируем JWT токен
#     payload = {
#         "master_id": master.id,
#         "telegram_id": telegram_id,
#         "exp": datetime.now() + timedelta(hours=24),
#         "iat": datetime.now()
#     }
    
#     token = jwt.encode(payload, JWT_SECRET_KEY, algorithm="HS256")
    
#     return {
#         "token": token,
#         "master": {
#             "id": str(master.id),
#             "name": master.name,
#             "color": master.color,
#             "role": master.role
#         }
#     }


@app.post("/api/masters/register")
async def register_master(
    request: MasterRegisterRequest,
    db: Session = Depends(get_db)
):
    telegram_id = request.telegram_id
    name = request.name
    
    try:
        # Проверяем, существует ли уже мастер с таким telegram_id
        existing_master = db.query(MasterDB).filter(MasterDB.telegram_id == telegram_id).first()
    except OperationalError as e:
        raise HTTPException(status_code=503, detail="Database connection error. Please try again.")
    
    if existing_master:
        # Если мастер уже существует, возвращаем его данные
        payload = {
            "master_id": existing_master.id,
            "telegram_id": telegram_id,
            "exp": datetime.now() + timedelta(hours=24),
            "iat": datetime.now()
        }
        token = jwt.encode(payload, JWT_SECRET_KEY, algorithm="HS256")
        
        return {
            "token": token,
            "master": {
                "id": str(existing_master.id),
                "name": existing_master.name,
                "color": existing_master.color,
                "role": existing_master.role
            }
        }
    
    # Если мастер новый, создаем его
    new_master = MasterDB(
        name=name,
        color="blue",  # Можно сделать выбор цвета позже
        telegram_id=telegram_id,
        role="master"
    )
    
    try:
        db.add(new_master)
        db.commit()
        db.refresh(new_master)
    except OperationalError as e:
        db.rollback()
        raise HTTPException(status_code=503, detail="Database connection error. Please try again.")
    
    # Генерируем токен
    payload = {
        "master_id": new_master.id,
        "telegram_id": telegram_id,
        "exp": datetime.now() + timedelta(hours=24),
        "iat": datetime.now()
    }
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm="HS256")
    
    return {
        "token": token,
        "master": {
            "id": str(new_master.id),
            "name": new_master.name,
            "color": new_master.color,
            "role": new_master.role
        }
    }

if __name__ == '__main__':
    import uvicorn
    port = int(os.getenv('PORT', 8000))
    uvicorn.run(app, host='0.0.0.0', port=port)
