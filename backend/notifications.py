import os
import requests
from typing import Optional, Dict, Any
from models import AppointmentDB, MasterDB

BOT_TOKEN = os.getenv("BOT_TOKEN")
ADMIN_CHAT_IDS = os.getenv("ADMIN_CHAT_IDS", "").split(",")  # Список ID админов через запятую

def send_telegram_notification(chat_id: str, message: str):
    """Отправка уведомления в Telegram"""
    url = f"https://api.telegram.org/bot{BOT_TOKEN}/sendMessage"
    data = {
        "chat_id": chat_id,
        "text": message,
        "parse_mode": "HTML"
    }
    try:
        requests.post(url, json=data)
    except Exception as e:
        print(f"Error sending notification: {e}")

def format_appointment_info(appointment: AppointmentDB, master: MasterDB) -> str:
    """Форматирование информации о записи"""
    info = f"👤 <b>Мастер:</b> {master.name}\n"
    info += f"📅 <b>Дата:</b> {appointment.date}\n"
    info += f"🕐 <b>Время:</b> {appointment.time}\n"
    info += f"⏱ <b>Длительность:</b> {appointment.duration} мин\n"
    info += f"👥 <b>Клиент:</b> {appointment.client_name}\n"
    if appointment.comment:
        info += f"💬 <b>Комментарий:</b> {appointment.comment}\n"
    return info

def notify_appointment_created(appointment: AppointmentDB, master: MasterDB):
    """Уведомление о создании записи"""
    message = "✨ <b>Новая запись</b>\n\n"
    message += format_appointment_info(appointment, master)
    
    for chat_id in ADMIN_CHAT_IDS:
        if chat_id:
            send_telegram_notification(chat_id, message)

def notify_appointment_cancelled(appointment: AppointmentDB, master: MasterDB):
    """Уведомление об отмене записи"""
    message = "❌ <b>Запись отменена</b>\n\n"
    message += format_appointment_info(appointment, master)
    
    for chat_id in ADMIN_CHAT_IDS:
        if chat_id:
            send_telegram_notification(chat_id, message)

def notify_appointment_edited(
    appointment: AppointmentDB, 
    master: MasterDB, 
    changes: Dict[str, Any]
):
    """Уведомление о редактировании записи"""
    message = "✏️ <b>Запись отредактирована</b>\n\n"
    message += format_appointment_info(appointment, master)
    message += "\n<b>Изменения:</b>\n"
    
    field_names = {
        "time": "Время",
        "date": "Дата",
        "clientName": "Клиент",
        "comment": "Комментарий",
        "duration": "Длительность"
    }
    
    for field, value in changes.items():
        if field in field_names:
            message += f"• {field_names[field]}: {value}\n"
    
    for chat_id in ADMIN_CHAT_IDS:
        if chat_id:
            send_telegram_notification(chat_id, message)

def notify_appointment_moved(
    appointment: AppointmentDB, 
    master: MasterDB,
    old_date: str,
    old_time: str
):
    """Уведомление о переносе записи"""
    message = "🔄 <b>Запись перенесена</b>\n\n"
    message += f"<b>Было:</b> {old_date} в {old_time}\n"
    message += f"<b>Стало:</b> {appointment.date} в {appointment.time}\n\n"
    message += format_appointment_info(appointment, master)
    
    for chat_id in ADMIN_CHAT_IDS:
        if chat_id:
            send_telegram_notification(chat_id, message)

def notify_appointment_completed(appointment: AppointmentDB, master: MasterDB):
    """Уведомление о проведении записи"""
    total = appointment.cash_payment + appointment.card_payment
    message = "✅ <b>Запись проведена</b>\n\n"
    message += format_appointment_info(appointment, master)
    message += f"\n💰 <b>Оплата:</b> {total}₽\n"
    message += f"💵 Наличные: {appointment.cash_payment}₽\n"
    message += f"💳 Безнал: {appointment.card_payment}₽\n"
    
    for chat_id in ADMIN_CHAT_IDS:
        if chat_id:
            send_telegram_notification(chat_id, message)
