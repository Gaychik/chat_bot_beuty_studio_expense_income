'use client'

import { useEffect, useMemo, useState } from 'react'
import { Calendar, LayoutGrid, Plus, Users } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { MasterGreeting } from '@/components/master-greeting'
import {
  type Appointment,
  type Master,
  authenticateViaTelegram,
  getAuthToken,
  getMasterId,
  getMasterRole,
  getTodayAppointments,
  getWeekAppointments,
  setAuthToken,
  setMasterId,
  setMasterRole,
} from '@/lib/api'

export default function HomePage() {
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([])
  const [weekAppointments, setWeekAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [currentMaster, setCurrentMaster] = useState<Master | null>(null)
  const [masterRole, setMasterRoleState] = useState<string | null>(null)

  const authenticateUser = async (telegramId: number, firstName: string) => {
    const data = await authenticateViaTelegram(telegramId, firstName)

    setAuthToken(data.token)
    setCurrentMaster(data.master)

    setMasterId(data.master.id)
    setMasterRole(data.master.role ?? 'master')
    setMasterRoleState(data.master.role ?? 'master')
  }

  const loadHomeData = async () => {
    const [today, week] = await Promise.all([getTodayAppointments(), getWeekAppointments()])
    setTodayAppointments(today)
    setWeekAppointments(week)
  }

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true)
        setError(null)

        // Telegram WebApp
        if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
          const webApp = (window as any).Telegram.WebApp
          webApp.ready()

          const user = webApp.initDataUnsafe?.user
          if (user) {
            await authenticateUser(user.id, user.first_name)
          }
        }

        // роль — на случай перезагрузки страницы
        try {
          setMasterRoleState(getMasterRole())
        } catch {
          setMasterRoleState(null)
        }

        // если токен/мастер уже есть — просто грузим данные
        const token = getAuthToken()
        const masterId = getMasterId()
        if (token && masterId) {
          await loadHomeData()
        }
      } catch (e) {
        console.error('Home init error:', e)
        setError('Не удалось загрузить данные главной страницы')
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  const isAdmin = (currentMaster?.role ?? masterRole) === 'admin'

  const todayPreview = useMemo(() => {
    return todayAppointments
      .slice()
      .sort((a, b) => a.time.localeCompare(b.time))
      .slice(0, 3)
  }, [todayAppointments])

  const statusLabel = (status: Appointment['status']) => {
    switch (status) {
      case 'completed':
        return 'Проведена'
      case 'cancelled':
        return 'Отменена'
      default:
        return 'Запланирована'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* Header */}
      <header className="bg-black text-white p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-center">WANT</h1>
        <p className="text-center text-gray-400 text-sm mt-1">Салон красоты</p>
      </header>

      {/* Main Content */}
      <main className="p-6 space-y-6 max-w-md mx-auto">
         <MasterGreeting master={currentMaster} loading={loading} />
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4 bg-white border-pink-200">
            <div className="text-3xl font-bold text-pink-600">{loading ? '—' : todayAppointments.length}</div>
            <div className="text-sm text-gray-600 mt-1">Записей сегодня</div>
          </Card>
          <Card className="p-4 bg-white border-pink-200">
            <div className="text-3xl font-bold text-pink-600">{loading ? '—' : weekAppointments.length}</div>
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
          

          {/* Существующие кнопки */}
          <Link href="/profile" className="block">
            <Button
              variant="outline"
              className="w-full h-16 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 text-lg font-semibold bg-transparent"
            >
              <Avatar className="mr-2 h-6 w-6">
                <AvatarImage src="/path/to/avatar.jpg" alt="Мастер" />
                <AvatarFallback>М</AvatarFallback>
              </Avatar>
              Профиль
            </Button>
          </Link>

          {isAdmin && (
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

          {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

          {loading ? (
            <div className="p-4 text-center text-gray-600">Загрузка...</div>
          ) : todayAppointments.length === 0 ? (
            <Card className="p-4 bg-white border-pink-200">
              <div className="text-gray-600 text-sm">Сегодня нет записей</div>
            </Card>
          ) : (
            <div className="space-y-3">
              {todayPreview.map((apt) => (
                <Card key={apt.id} className="p-4 bg-white border-pink-200">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-semibold text-gray-800">{apt.clientName}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        {apt.time} • {apt.duration} мин
                      </div>
                      {apt.comment && <div className="text-sm text-gray-500 mt-2 italic">{apt.comment}</div>}
                    </div>
                    <div className="text-xs text-pink-600 font-semibold whitespace-nowrap">{statusLabel(apt.status)}</div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
