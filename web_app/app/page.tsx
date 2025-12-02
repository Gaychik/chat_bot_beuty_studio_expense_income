'use client'

import { useState, useEffect } from 'react'
import { Calendar, LayoutGrid, Plus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { 
   type Appointment,
    setAuthToken, 
    Master, 
    authenticateViaTelegram,
     getAuthToken, 
     getMasterId,
     setMasterId } from '@/lib/api'

export default function HomePage() {
  // <CHANGE> Добавляем состояния для загрузки данных
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([])
  const [weekAppointments, setWeekAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Добавьте состояние для текущего мастера
      const [currentMaster, setCurrentMaster] = useState<Master | null>(null);
   
   const [isClient, setIsClient] = useState(false);

useEffect(() => {
  setIsClient(true);
}, []);

const authenticateUser = async (telegramId: number, firstName: string) => {
    try {
        
        const data = await authenticateViaTelegram(telegramId, firstName);
        setAuthToken(data.token);
        setCurrentMaster(data.master);
        
        
        setMasterId(data.master.id);
 

    } catch (error) {
        console.error('Authentication error:', error);
        setError('Ошибка аутентификации');
    }
};

  useEffect(() => {
    // Проверяем, есть ли сохраненный токен
    const token = getAuthToken();
    alert(token);
    alert(`"token: ${token}, Мы здесь"`);

        // Проверяем, открыт ли Web App через Telegram
        if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
            const webApp = window.Telegram.WebApp;
            webApp.ready();
            // Получаем данные пользователя из Telegram
            const user = webApp.initDataUnsafe?.user;
            
              alert(user);
            if (user) {
                // Отправляем данные на бэкенд для аутентификации
                authenticateUser(user.id, user.first_name);
            }
        }
}, [isClient]);



  
    return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* Header */}
      <header className="bg-black text-white p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-center">WANT</h1>
        <p className="text-center text-gray-400 text-sm mt-1">Салон красоты</p>
      </header>

    {/* Main Content */}
      <main className="p-6 space-y-6 max-w-md mx-auto">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 bg-white border-pink-200">
            {/* <CHANGE> Загружаем количество записей на сегодня из БД */}
            <div className="text-3xl font-bold text-pink-600">{todayAppointments.length}</div>
            <div className="text-sm text-gray-600 mt-1">Записей сегодня</div>
          </Card>
          <Card className="p-4 bg-white border-pink-200">
            {/* <CHANGE> Загружаем количество записей на неделю из БД */}
            <div className="text-3xl font-bold text-pink-600">{weekAppointments.length}</div>
            <div className="text-sm text-gray-600 mt-1">На этой неделе</div>
          </Card>
        </div>
        {/* Main Actions */}
        <div className="space-y-3">
          <Link href="/schedule" className="block">
            <Button className="w-full h-16 bg-pink-600 hover:bg-pink-700 text-white text-lg font-semibold shadow-lg">
              <Plus className="mr-2 h-6 w-6" />
              Создать новую запись
            </Button>
          </Link>

          <Link href="/overview" className="block">
            <Button
              variant="outline"
              className="w-full h-16 border-2 border-pink-600 text-pink-600 hover:bg-pink-50 text-lg font-semibold bg-transparent"
            >
              <LayoutGrid className="mr-2 h-6 w-6" />
              Обзор расписания
            </Button>
          </Link>

          <Link href="/schedule" className="block">
            <Button
              variant="outline"
              className="w-full h-16 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 text-lg font-semibold bg-transparent"
            >
              <Calendar className="mr-2 h-6 w-6" />
              Мое расписание
            </Button>
          </Link>

          {/* Показываем кнопку админки только если мастер имеет роль администратора */}
          {currentMaster?.role === 'admin' && (
            <Link href="/admin" className="block">
              <Button
                variant="outline"
                className="w-full h-16 border-2 border-black text-black hover:bg-gray-100 text-lg font-semibold bg-transparent"
              >
                <Users className="mr-2 h-6 w-6" />
                Панель администратора
              </Button>
            </Link>
          )}
        </div>

       {/* Today's Appointments Preview */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold mb-4 text-gray-800">Сегодня</h2>
          
          {/* <CHANGE> Обработка загрузки и ошибок */}
          {error && (
            <div className="p-4 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
        
        </div>
      </main>
    </div>
  )
}
