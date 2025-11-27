import os
import logging
from telegram import Update, WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, CallbackQueryHandler, ContextTypes
import requests
import jwt
import datetime

# Загрузка переменных окружения
from dotenv import load_dotenv
load_dotenv()

# Конфигурация
BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
WEB_APP_URL = os.getenv("WEB_APP_URL")
BACKEND_URL = os.getenv("BACKEND_URL")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")

# Настройка логирования
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s', level=logging.INFO)
logger = logging.getLogger(__name__)

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """Обработчик команды /start"""
    user = update.effective_user
    chat_id = update.effective_chat.id
    
    # Отправляем приветственное сообщение
    welcome_message = f"Привет, {user.first_name}! 👋\n\n"
    welcome_message += "Я бот для управления расписанием салона красоты WANT.\n"
    welcome_message += "Нажмите кнопку ниже, чтобы открыть приложение."
    
    # Создаем кнопку для открытия Web App
    keyboard = [[InlineKeyboardButton("Открыть приложение", web_app=WebAppInfo(url=WEB_APP_URL))]]
    reply_markup = InlineKeyboardMarkup(keyboard)
    
    await update.message.reply_text(welcome_message, reply_markup=reply_markup)

def main() -> None:
    """Запуск бота"""
    application = Application.builder().token(BOT_TOKEN).build()
    
    # Регистрация обработчиков
    application.add_handler(CommandHandler("start", start))
    
    # Запуск бота
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()