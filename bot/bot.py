import os
import logging
from telegram import Update, WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
import requests
# Загрузка переменных окружения
from dotenv import load_dotenv
load_dotenv()

# Конфигурация
BOT_TOKEN = os.getenv("BOT_TOKEN")
WEB_APP_URL = os.getenv("WEB_APP_URL")
ADMIN_IDS = [int(id) for id in os.getenv("ADMIN_IDS").split(",")] if os.getenv("ADMIN_IDS") else []
BACKEND_APP_URL = os.getenv("BACKEND_APP_URL")


async def admin_menu(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Главное меню админа"""
    keyboard = [
        [InlineKeyboardButton("📋 Записи мастеров", callback_data="view_masters")],
        [InlineKeyboardButton("💰 Касса", callback_data="view_cash")],
        [InlineKeyboardButton("🌐 Открыть приложение", web_app=WebAppInfo(url=WEB_APP_URL))]
    ]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    message = "🎯 Админ-панель\n\nВыберите действие:"
    
    if update.callback_query:
        await update.callback_query.edit_message_text(message, reply_markup=reply_markup)
    else:
        await update.message.reply_text(message, reply_markup=reply_markup)

async def view_masters(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Показать список мастеров"""
    query = update.callback_query
    await query.answer()
    
  
    response = requests.get(f"{BACKEND_APP_URL}/api/masters")
    
    masters = response.json()
    
    keyboard = []
    for master in masters:
        keyboard.append([
            InlineKeyboardButton(
                f"👤 {master['name']}", 
                callback_data=f"master_{master['id']}"
            )
        ])
    keyboard.append([InlineKeyboardButton("◀️ Назад", callback_data="admin_menu")])
    
    reply_markup = InlineKeyboardMarkup(keyboard)
    await query.edit_message_text(
        "👥 Выберите мастера для просмотра записей:",
        reply_markup=reply_markup
    )
 

async def view_master_appointments(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Показать записи конкретного мастера"""
    query = update.callback_query
    await query.answer()
    
    master_id = query.data.split("_")[1]
    
    try:
        response = requests.get(f"{BACKEND_APP_URL}/api/bot/masters/{master_id}/appointments")
        data = response.json()
        
        master = data["master"]
        appointments = data["appointments"]
        
        if not appointments:
            message = f"👤 {master['name']}\n\n📭 Нет активных записей"
        else:
            message = f"👤 {master['name']}\n\n📋 Записи:\n\n"
            
            current_date = None
            for apt in appointments:
                if apt["date"] != current_date:
                    current_date = apt["date"]
                    message += f"\n📅 {format_date(apt['date'])}\n"
                
                status_emoji = {
                    "scheduled": "🕐",
                    "completed": "✅",
                    "cancelled": "❌"
                }
                
                message += f"{status_emoji.get(apt['status'], '•')} {apt['time']} - {apt['clientName']}"
                if apt['comment']:
                    message += f"\n   💬 {apt['comment']}"
                if apt['payment']:
                    total = apt['payment']['cash'] + apt['payment']['card']
                    message += f"\n   💰 {total}₽ (нал: {apt['payment']['cash']}₽, безнал: {apt['payment']['card']}₽)"
                message += "\n"
        
        keyboard = [[InlineKeyboardButton("◀️ К списку мастеров", callback_data="view_masters")]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(message, reply_markup=reply_markup)
    except Exception as e:
        await query.edit_message_text(f"❌ Ошибка: {str(e)}")

def format_date(date_str: str) -> str:
    """Форматирование даты для отображения"""
    from datetime import datetime
    date_obj = datetime.strptime(date_str, "%Y-%m-%d")
    months = ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]
    return f"{date_obj.day} {months[date_obj.month - 1]}"


async def view_cash(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Показать данные кассы"""
    query = update.callback_query
    await query.answer()
    
    try:
        response = requests.get(f"{BACKEND_APP_URL}/api/bot/cash-register")
        data = response.json()
        print(data)
        
        message = f"💰 Касса на {format_date(data['date'])}\n\n"
        message += f"📊 Общая выручка: {data['total']['total']:.2f}₽\n"
        message += f"💵 Наличные: {data['total']['cash']:.2f}₽\n"
        message += f"💳 Безнал: {data['total']['card']:.2f}₽\n"
        message += f"📋 Записей проведено: {data['appointments_count']}\n"
        
        if data['masters']:
            message += "\n👥 По мастерам:\n"
            for master_data in data['masters'].values():
                message += f"\n• {master_data['name']}\n"
                message += f"  💰 {master_data['total']:.2f}₽ ({master_data['count']} зап.)\n"
                message += f"  💵 {master_data['cash']:.2f}₽ | 💳 {master_data['card']:.2f}₽\n"
        
        keyboard = [[InlineKeyboardButton("◀️ Назад", callback_data="admin_menu")]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await query.edit_message_text(message, reply_markup=reply_markup)
    except Exception as e:
        await query.edit_message_text(f"❌ Ошибка: {str(e)}")


# Настройка логирования
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
     """Обработчик команды /start"""
     user = update.effective_user
     chat_id = update.effective_chat.id
     print(user)
    # Проверяем, является ли пользователь админом
     if chat_id in ADMIN_IDS:
        await admin_menu(update, context)
     else:
        # Обычное приветствие для мастеров
        welcome_message = f"Привет, {user.first_name}! 👋\n\n"
        welcome_message += "Я бот для управления расписанием салона красоты WANT.\n"
        welcome_message += "Нажмите кнопку ниже, чтобы открыть приложение."
        
        keyboard = [[InlineKeyboardButton("Открыть приложение", web_app=WebAppInfo(url=WEB_APP_URL))]]
        reply_markup = InlineKeyboardMarkup(keyboard)
        
        await update.message.reply_text(welcome_message, reply_markup=reply_markup)

def main() -> None:
    """Запуск бота"""
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Регистрация обработчиков
    application.add_handler(CommandHandler("start", start))
    # Регистрация обработчиков
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(admin_menu, pattern="^admin_menu$"))
    application.add_handler(CallbackQueryHandler(view_masters, pattern="^view_masters$"))
    application.add_handler(CallbackQueryHandler(view_master_appointments, pattern="^master_"))
    application.add_handler(CallbackQueryHandler(view_cash, pattern="^view_cash$"))
    
    # Запуск бота
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()