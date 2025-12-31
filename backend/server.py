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

from notifications import (
    notify_appointment_created,
    notify_appointment_cancelled,
    notify_appointment_edited,
    notify_appointment_moved,
    notify_appointment_completed
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
            "masterId": str(apt.master_id),
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
                "masterId": str(apt.master_id),
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
            "masterId": str(apt.master_id),
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
    notify_appointment_created(new_appointment, master)

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
        "masterId": str(new_appointment.master_id),
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

# Сохранить старые значения перед обновлением
    old_date = apt.date
    old_time = apt.time


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
    # После обновления проверить, была ли перенесена запись
    if ("time" in update_data or "date" in update_data) and (old_date != apt.date or old_time != apt.time):
        notify_appointment_moved(apt, master, old_date, old_time)
    elif update_data:
        notify_appointment_edited(apt, master, update_data)


    
    # Возврат в формате API
    return {
        "id": str(apt.id),
        "time": apt.time,
        "duration": apt.duration,
        "clientName": apt.client_name,
        "comment": apt.comment or "",
        "date": apt.date,
        "status": apt.status,
        "masterId": str(apt.master_id),
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
    notify_appointment_completed(apt, master)
    # Возврат в формате API
    return {
        "id": str(apt.id),
        "time": apt.time,
        "duration": apt.duration,
        "clientName": apt.client_name,
        "comment": apt.comment or "",
        "date": apt.date,
        "status": apt.status,
        "masterId": str(apt.master_id),
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
    notify_appointment_cancelled(apt, master)
    
    # Возврат в формате API
    return {
        "id": str(apt.id),
        "time": apt.time,
        "duration": apt.duration,
        "clientName": apt.client_name,
        "comment": apt.comment or "",
        "date": apt.date,
        "status": apt.status,
        "masterId": str(apt.master_id),
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
    master_id: Optional[str] = Query(None, description="ID мастера (опционально)"),
    db: Session = Depends(get_db)
):
    from sqlalchemy import func

    master_id_int: Optional[int] = None
    if master_id is not None:
        try:
            master_id_int = int(master_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid master_id")

    base_filter = [AppointmentDB.date >= start_date, AppointmentDB.date <= end_date]
    if master_id_int is not None:
        base_filter.append(AppointmentDB.master_id == master_id_int)

    # Подсчет записей в диапазоне дат
    total_appointments = db.query(AppointmentDB).filter(*base_filter).count()

    # Подсчет завершенных записей в диапазоне дат
    completed_appointments = db.query(AppointmentDB).filter(
        *base_filter,
        AppointmentDB.status == "completed"
    ).count()

    # Подсчет общей выручки в диапазоне дат
    total_revenue = (
        db.query(func.sum(AppointmentDB.cash_payment + AppointmentDB.card_payment))
        .filter(*base_filter, AppointmentDB.status == "completed")
        .scalar()
        or 0.0
    )

    return {
        "totalAppointments": total_appointments,
        "completedAppointments": completed_appointments,
        "totalRevenue": float(total_revenue)
    }


def convert_color_to_hex(color_name: str, variant: str = 'background') -> str:
    """
    Конвертирует именованный цвет в HEX значение в зависимости от варианта использования
    """
    color_map = {
        'red': {
            'background': '#FEE2E2',  # light red
            'indicator': '#EF4444',   # standard red
            'border': '#DC2626'       # dark red
        },
        'blue': {
            'background': '#DBEAFE',  # light blue
            'indicator': '#3B82F6',   # standard blue
            'border': '#2563EB'       # dark blue
        },
        'green': {
            'background': '#D1FAE5',  # light green
            'indicator': '#10B981',   # standard green
            'border': '#059669'       # dark green
        },
        'yellow': {
            'background': '#FEF9C3',  # light yellow
            'indicator': '#EAB308',   # standard yellow
            'border': '#CA8A04'       # dark yellow
        },
        'purple': {
            'background': '#FAE8FF',  # light purple
            'indicator': '#A855F7',   # standard purple
            'border': '#9333EA'       # dark purple
        },
        'orange': {
            'background': '#FFEDD5',  # light orange
            'indicator': '#F97316',   # standard orange
            'border': '#EA580C'       # dark orange
        },
        'pink': {
            'background': '#FCE7F3',  # light pink
            'indicator': '#EC4899',   # standard pink
            'border': '#DB2777'       # dark pink
        },
        'indigo': {
            'background': '#E0E7FF',  # light indigo
            'indicator': '#6366F1',   # standard indigo
            'border': '#4F46E5'       # dark indigo
        },
        'teal': {
            'background': '#CCFBF1',  # light teal
            'indicator': '#14B8A6',   # standard teal
            'border': '#0D9488'       # dark teal
        },
        'cyan': {
            'background': '#ECFEFF',  # light cyan
            'indicator': '#06B6D4',   # standard cyan
            'border': '#0E7490'       # dark cyan
        },
        'lime': {
            'background': '#F7FEE7',  # light lime
            'indicator': '#84CC16',   # standard lime
            'border': '#65A30D'       # dark lime
        },
        'amber': {
            'background': '#FFFBEB',  # light amber
            'indicator': '#F59E0B',   # standard amber
            'border': '#D97706'       # dark amber
        },
        'emerald': {
            'background': '#D1FAE5',  # light emerald
            'indicator': '#10B981',   # standard emerald
            'border': '#047857'       # dark emerald
        },
        'violet': {
            'background': '#F3E8FF',  # light violet
            'indicator': '#8B5CF6',   # standard violet
            'border': '#7C3AED'       # dark violet
        },
        'fuchsia': {
            'background': '#FDF4FF',  # light fuchsia
            'indicator': '#D946EF',   # standard fuchsia
            'border': '#C026D2'       # dark fuchsia
        },
        'sky': {
            'background': '#E0F2FE',  # light sky
            'indicator': '#0284C7',   # standard sky
            'border': '#0369A1'       # dark sky
        },
        'rose': {
            'background': '#FFE4E6',  # light rose
            'indicator': '#F43F5E',   # standard rose
            'border': '#E11D48'       # dark rose
        },
        'slate': {
            'background': '#E2E8F0',  # light slate
            'indicator': '#64748B',   # standard slate
            'border': '#475569'       # dark slate
        },
        'gray': {
            'background': '#E5E7EB',  # light gray
            'indicator': '#6B7280',   # standard gray
            'border': '#374151'       # dark gray
        },
        'zinc': {
            'background': '#E5E7EB',  # light zinc
            'indicator': '#71717A',   # standard zinc
            'border': '#3F3F46'       # dark zinc
        },
        'neutral': {
            'background': '#E5E4E2',  # light neutral
            'indicator': '#737373',   # standard neutral
            'border': '#404040'       # dark neutral
        },
        'stone': {
            'background': '#E7E5E4',  # light stone
            'indicator': '#78716C',   # standard stone
            'border': '#57534E'       # dark stone
        }
    }
    
    color_variants = color_map.get(color_name.lower(), {
        'background': '#FEF9C3',  # default to light yellow
        'indicator': '#EAB308',   # default to standard yellow
        'border': '#CA8A04'       # default to dark yellow
    })
    
    return color_variants.get(variant, color_variants['background'])

def get_master_colors(color_name: str) -> dict:
  
    return {
        'background': convert_color_to_hex(color_name, 'background'),
        'indicator': convert_color_to_hex(color_name, 'indicator'),
        'border': convert_color_to_hex(color_name, 'border'),
        'name': color_name  # сохраняем оригинальное имя цвета
    }

def calculate_unique_color_from_id(master_id: int, used_colors: set) -> str:
 
    color_map = [
        "red", "orange", "yellow", "lime", "green", 
        "emerald", "teal", "cyan", "sky", "blue", 
        "indigo", "violet", "purple", "fuchsia", "pink",
        "rose", "slate", "gray", "zinc", "neutral", "stone"
    ]
    
    # Начинаем с вычисления цвета на основе ID
    id_str = str(master_id)
    hash_value = 0
    for char in id_str:
        hash_value = ((hash_value << 5) - hash_value + ord(char)) & 0xFFFFFFFF
    
    start_index = abs(hash_value) % len(color_map)
    
    # Ищем первый неиспользованный цвет, начиная с вычисленного индекса
    for i in range(len(color_map)):
        color_index = (start_index + i) % len(color_map)
        candidate_color = color_map[color_index]
        if candidate_color not in used_colors:
            return candidate_color
    
    # Если все цвета уже используются, возвращаем случайный цвет
    import random
    return random.choice(color_map)

def calculate_color_from_id(master_id: int, db: Session) -> str:
  
    # Получаем все уже используемые цвета
    existing_masters = db.query(MasterDB.color).all()
    used_colors = {master.color for master in existing_masters if master.color}
    
    return calculate_unique_color_from_id(master_id, used_colors)



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

        # Возвращаем цвета в HEX формате
        master_colors = get_master_colors(existing_master.color)

        return {
            "token": token,
            "master": {
                "id": str(existing_master.id),
                "name": existing_master.name,
                "color": existing_master.color,
                "colors": master_colors,  # все HEX варианты цвета
                "role": existing_master.role
            }
        }
 

    # Если мастер новый, создаем его
    new_master = MasterDB(
        name=name,
        color=calculate_color_from_id(new_master.id, db),  
        telegram_id=telegram_id,
        role="master"
    )
    
    new_master.color = calculate_color_from_id(new_master.id, db)

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
    
    master_colors = get_master_colors(new_master.color)
    return {
        "token": token,
        "master": {
            "id": str(new_master.id),
            "name": new_master.name,
            "color": new_master.color,
            "colors": master_colors, 
            "role": new_master.role
        }
    }


@app.get("/api/master/profile")
async def get_master_profile(
    auth_data: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    master_id = auth_data.get("master_id")
    if not master_id:
        raise HTTPException(status_code=401, detail="Мастер не найден в токене")

    master = db.query(MasterDB).filter(MasterDB.id == master_id).first()
    if not master:
        raise HTTPException(status_code=404, detail="Мастер не найден")

    master_colors = get_master_colors(master.color)

    return {
        "id": str(master.id),
        "name": master.name,
        "color": master.color,
        "colors": master_colors,
        "role": master.role,
        "avatar": master.avatar
    }

@app.post("/api/master/avatar")
async def update_master_avatar(
    request: dict,
    auth_data: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    master_id = auth_data.get("master_id")
    if not master_id:
        raise HTTPException(status_code=401, detail="Мастер не найден в токене")

    avatar = request.get("avatar")
    if avatar is None:
        raise HTTPException(status_code=400, detail="Поле avatar не указано")

    master = db.query(MasterDB).filter(MasterDB.id == master_id).first()
    if not master:
        raise HTTPException(status_code=404, detail="Мастер не найден")

    master.avatar = avatar

    try:
        db.commit()
        db.refresh(master)
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Ошибка обновления аватара")

    master_colors = get_master_colors(master.color)

    return {
        "id": str(master.id),
        "name": master.name,
        "color": master.color,
        "colors": master_colors,
        "role": master.role,
        "avatar": master.avatar
    }



@app.post("/api/update-name")
async def update_master_name(
    request: dict,
    auth_data: dict = Depends(verify_token),
    db: Session = Depends(get_db)
):
    """
    Обновляет имя мастера
    """
    master_id = auth_data.get("master_id")
    new_name = request.get("name")
    
    if not new_name:
        raise HTTPException(status_code=400, detail="Имя не указано")
    
    # Находим мастера по ID
    master = db.query(MasterDB).filter(MasterDB.id == master_id).first()
    
    if not master:
        raise HTTPException(status_code=404, detail="Мастер не найден")
    
    # Обновляем имя
    master.name = new_name
    
    try:
        db.commit()
        db.refresh(master)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="Ошибка обновления имени")
    
    # Возвращаем обновленные данные мастера с цветами
    master_colors = get_master_colors(master.color)
    
    return {
        "id": str(master.id),
        "name": master.name,
        "color": master.color,
        "colors": master_colors,
        "role": master.role
    }


@app.get("/api/bot/masters/{master_id}/appointments")
async def get_master_appointments_for_bot(
    master_id: str,
    date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Получение записей мастера для бота с форматированием"""
    master = db.query(MasterDB).filter(MasterDB.id == int(master_id)).first()
    if not master:
        raise HTTPException(status_code=404, detail="Master not found")
    
    query = db.query(AppointmentDB).filter(AppointmentDB.master_id == int(master_id))
    if date:
        query = query.filter(AppointmentDB.date == date)
    else:
        # По умолчанию показываем записи на сегодня и будущее
        from datetime import date as dt_date
        today = dt_date.today().strftime("%Y-%m-%d")
        query = query.filter(AppointmentDB.date >= today)
    
    appointments = query.order_by(AppointmentDB.date, AppointmentDB.time).all()
    
    return {
        "master": {
            "id": str(master.id),
            "name": master.name,
            "color": master.color
        },
        "appointments": [
            {
                "id": str(apt.id),
                "date": apt.date,
                "time": apt.time,
                "duration": apt.duration,
                "clientName": apt.client_name,
                "comment": apt.comment or "",
                "status": apt.status,
                "payment": {
                    "cash": apt.cash_payment,
                    "card": apt.card_payment
                } if apt.status == "completed" else None
            }
            for apt in appointments
        ]
    }



@app.get("/api/bot/cash-register")
async def get_cash_register(
    date: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Получение данных кассы для бота"""
    from sqlalchemy import func
    from datetime import date as dt_date
    
    # Если дата не указана, берем сегодня
    if not date:
        date = dt_date.today().strftime("%Y-%m-%d")
    
    # Получаем завершенные записи за указанную дату
    query = db.query(AppointmentDB).filter(
        AppointmentDB.date == date,
        AppointmentDB.status == "completed"
    )
    
    appointments = query.all()
    
    total_cash = sum(apt.cash_payment for apt in appointments)
    total_card = sum(apt.card_payment for apt in appointments)
    total = total_cash + total_card
    
    # Группировка по мастерам
    masters_stats = {}
    for apt in appointments:
        master_id = str(apt.master_id)
        if master_id not in masters_stats:
            masters_stats[master_id] = {
                "name": apt.master.name,
                "cash": 0,
                "card": 0,
                "total": 0,
                "count": 0
            }
        masters_stats[master_id]["cash"] += apt.cash_payment
        masters_stats[master_id]["card"] += apt.card_payment
        masters_stats[master_id]["total"] += apt.cash_payment + apt.card_payment
        masters_stats[master_id]["count"] += 1
    
    return {
        "date": date,
        "total": {
            "cash": total_cash,
            "card": total_card,
            "total": total
        },
        "masters": masters_stats,
        "appointments_count": len(appointments)
    }


if __name__ == '__main__':
    import uvicorn
    port = int(os.getenv('PORT', 8000))
    uvicorn.run(app, host='0.0.0.0', port=port)
