"use client"

import { useState , useEffect} from "react"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {  getAppointmentsRange } from '@/lib/api'
type Appointment = {
  id: string
  time: string
  clientName: string
  status: "scheduled" | "completed" | "cancelled"
}

export default function OverviewPage() {
  const router = useRouter()
  const [startDate, setStartDate] = useState(new Date())

// <CHANGE> Добавляем состояния для загрузки данных
  const [appointments, setAppointments] = useState<Record<string, Appointment[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // <CHANGE> Загружаем данные за 4 недели одним запросом
useEffect(() => {
  const fetchAppointmentsForWeeks = async () => {
    try {
      setLoading(true)
      setError(null)

      // Вычисляем дату окончания (4 недели = 28 дней)
      const endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 28)

      const startDateStr = startDate.toISOString().split('T')[0]
      const endDateStr = endDate.toISOString().split('T')[0]

      // <CHANGE> Один запрос вместо 28!
      const allAppointments = await getAppointmentsRange(startDateStr, endDateStr)

      setAppointments(allAppointments)
    } catch (err) {
      console.error('Failed to fetch appointments:', err)
      setError('Не удалось загрузить расписание')
    } finally {
      setLoading(false)
    }
  }

  fetchAppointmentsForWeeks()
}, [startDate])

  // <CHANGE> Удаляем mockAppointments и используем загруженные данные
  const getAppointmentsForDate = (date: Date): Appointment[] => {
    const dateKey = date.toISOString().split('T')[0]
    return appointments[dateKey] || []
  }

  // <CHANGE> Обработка ошибок при загрузке
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white p-4">
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          <p>{error}</p>
        </div>
      </div>
    )
  }

  // <CHANGE> Показываем индикатор загрузки
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex justify-center items-center">
        <p className="text-gray-600">Загрузка расписания...</p>
      </div>
    )
  }

  const getWeeks = (start: Date, count: number) => {
    const weeks = []
    for (let i = 0; i < count; i++) {
      const weekStart = new Date(start)
      weekStart.setDate(start.getDate() + i * 7)
      const days = []
      for (let j = 0; j < 7; j++) {
        const day = new Date(weekStart)
        day.setDate(weekStart.getDate() + j)
        days.push(day)
      }
      weeks.push(days)
    }
    return weeks
  }

  const weeks = getWeeks(startDate, 4)

  const goToPrevious = () => {
    const newDate = new Date(startDate)
    newDate.setDate(newDate.getDate() - 28)
    setStartDate(newDate)
  }

  const goToNext = () => {
    const newDate = new Date(startDate)
    newDate.setDate(newDate.getDate() + 28)
    setStartDate(newDate)
  }

 

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* Header */}
      <header className="bg-black text-white p-4 shadow-lg sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-white hover:bg-gray-800">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Обзор расписания</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="p-4 max-w-4xl mx-auto space-y-4">
        {/* Navigation */}
        <Card className="p-4 bg-white">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={goToPrevious}>
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <div className="text-center">
              <div className="font-semibold text-gray-800">
                {startDate.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })}
              </div>
              <div className="text-sm text-gray-600">4 недели</div>
            </div>
            <Button variant="ghost" size="icon" onClick={goToNext}>
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
        </Card>

        {/* Weeks Overview */}
        <div className="space-y-4">
          {weeks.map((week, weekIndex) => (
            <Card key={weekIndex} className="p-4 bg-white">
              <div className="mb-3">
                <div className="font-semibold text-gray-800">Неделя {weekIndex + 1}</div>
                <div className="text-sm text-gray-600">
                  {week[0].toLocaleDateString("ru-RU", { day: "numeric", month: "short" })} -{" "}
                  {week[6].toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                </div>
              </div>

              <div className="space-y-2">
                {week.map((day, dayIndex) => {
                  const appointments = getAppointmentsForDate(day)
                  const isToday = day.toDateString() === new Date().toDateString()
                  const dayName = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"][dayIndex]

                  return (
                    <div
                      key={dayIndex}
                      className={`p-3 rounded-lg cursor-pointer transition-all hover:shadow-md ${
                        isToday
                          ? "bg-pink-600 text-white"
                          : appointments.length > 0
                            ? "bg-pink-50 border border-pink-200 hover:bg-pink-100"
                            : "bg-gray-50 hover:bg-gray-100"
                      }`}
                      onClick={() => router.push(`/day/${day.toISOString().split("T")[0]}`)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className={`font-semibold ${isToday ? "text-white" : "text-gray-800"}`}>
                            {dayName}, {day.getDate()} {day.toLocaleDateString("ru-RU", { month: "short" })}
                          </div>
                        </div>
                        <div className={`text-sm font-semibold ${isToday ? "text-white" : "text-pink-600"}`}>
                          {appointments.length > 0 ? `${appointments.length} записей` : "Свободно"}
                        </div>
                      </div>

                      {/* Список записей */}
                      {appointments.length > 0 && (
                        <div className="space-y-1 mt-2">
                          {appointments.map((apt) => (
                            <div
                              key={apt.id}
                              className={`flex items-center justify-between text-sm p-2 rounded ${
                                isToday ? "bg-pink-700" : "bg-white"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className={`font-medium ${isToday ? "text-white" : "text-gray-700"}`}>
                                  {apt.time}
                                </span>
                                <span className={isToday ? "text-pink-100" : "text-gray-600"}>{apt.clientName}</span>
                              </div>
                              <div
                                className={`text-xs px-2 py-1 rounded-full ${
                                  apt.status === "completed"
                                    ? isToday
                                      ? "bg-green-400 text-green-900"
                                      : "bg-green-100 text-green-700"
                                    : isToday
                                      ? "bg-blue-400 text-blue-900"
                                      : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {apt.status === "completed" ? "✓" : "○"}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Week Summary */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Всего записей за неделю:</span>
                  <span className="font-semibold text-pink-600">
                    {week.reduce((sum, day) => sum + getAppointmentsForDate(day).length, 0)}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Legend */}
        <Card className="p-4 bg-white">
          <div className="text-sm font-semibold text-gray-800 mb-3">Обозначения:</div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-pink-600 rounded"></div>
              <span className="text-gray-600">Сегодня</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-pink-50 border border-pink-200 rounded"></div>
              <span className="text-gray-600">Есть записи</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-50 rounded"></div>
              <span className="text-gray-600">Свободный день</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs">
                ✓
              </div>
              <span className="text-gray-600">Проведена</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-xs">
                ○
              </div>
              <span className="text-gray-600">Запланирована</span>
            </div>
          </div>
        </Card>
      </main>
    </div>
  )
}
