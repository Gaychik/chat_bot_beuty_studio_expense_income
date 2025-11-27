"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { getAppointmentsRange, getMasterId, type Appointment } from "@/lib/api"

type ViewMode = "day" | "week" | "month"

export default function SchedulePage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>("week")
  const [currentDate, setCurrentDate] = useState(new Date())

  const [appointments, setAppointments] = useState<Record<string, Appointment[]>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        setLoading(true)
        setError(null)

        let startDate = new Date(currentDate)
        let endDate = new Date(currentDate)

        if (viewMode === "week") {
          const dayOfWeek = currentDate.getDay()
          const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
          startDate.setDate(currentDate.getDate() + diff)
          endDate.setDate(startDate.getDate() + 6)
        } else if (viewMode === "month") {
          startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
          endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        }

        const startDateStr = startDate.toISOString().split("T")[0]
        const endDateStr = endDate.toISOString().split("T")[0]

      const masterId = getMasterId();
        if (!masterId) {
          setError("Не удалось определить мастера. Пожалуйста, авторизуйтесь заново.");
          setLoading(false);
          return;
        }

        const data = await getAppointmentsRange(startDateStr, endDateStr,masterId  )
        setAppointments(data)
      } catch (err) {
        console.error("Failed to fetch appointments:", err)
        setError("Не удалось загрузить расписание")
      } finally {
        setLoading(false)
      }
    }

    fetchAppointments()
  }, [currentDate, viewMode])

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
  }

  const formatDateSafe = (date: Date) => {
    try {
      return date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
    } catch (error) {
      console.log("[v0] Error formatting date:", error)
      return "Неверная дата"
    }
  }

  const goToPrevious = () => {
    const newDate = new Date(currentDate)
    if (viewMode === "day") {
      newDate.setDate(newDate.getDate() - 1)
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() - 7)
    } else {
      newDate.setMonth(newDate.getMonth() - 1)
    }
    setCurrentDate(newDate)
  }

  const goToNext = () => {
    const newDate = new Date(currentDate)
    if (viewMode === "day") {
      newDate.setDate(newDate.getDate() + 1)
    } else if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + 7)
    } else {
      newDate.setMonth(newDate.getMonth() + 1)
    }
    setCurrentDate(newDate)
  }

  const getWeekDays = () => {
    const days = []
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1)

    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      days.push(day)
    }
    return days
  }

  const weekDays = getWeekDays()

  const getAppointmentsCount = (date: Date): number => {
    const dateKey = date.toISOString().split("T")[0]
    return appointments[dateKey]?.length || 0
  }

  const hasAppointmentsOnDay = (date: Date): boolean => {
    const dateKey = date.toISOString().split("T")[0]
    return (appointments[dateKey]?.length || 0) > 0
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      {/* Header */}
      <header className="bg-black text-white p-4 shadow-lg sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <Link href="/">
            <Button variant="ghost" size="icon" className="text-white hover:bg-gray-800">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Расписание</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-4">
        {/* View Mode Selector */}
        <Card className="p-2 bg-white">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant={viewMode === "day" ? "default" : "ghost"}
              className={viewMode === "day" ? "bg-pink-600 hover:bg-pink-700" : "hover:bg-pink-50"}
              onClick={() => setViewMode("day")}
            >
              День
            </Button>
            <Button
              variant={viewMode === "week" ? "default" : "ghost"}
              className={viewMode === "week" ? "bg-pink-600 hover:bg-pink-700" : "hover:bg-pink-50"}
              onClick={() => setViewMode("week")}
            >
              Неделя
            </Button>
            <Button
              variant={viewMode === "month" ? "default" : "ghost"}
              className={viewMode === "month" ? "bg-pink-600 hover:bg-pink-700" : "hover:bg-pink-50"}
              onClick={() => setViewMode("month")}
            >
              Месяц
            </Button>
          </div>
        </Card>

        {/* Date Navigation */}
        <Card className="p-4 bg-white">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={goToPrevious}>
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <div className="text-center">
              <div className="font-semibold text-gray-800">{formatDateSafe(currentDate)}</div>
            </div>
            <Button variant="ghost" size="icon" onClick={goToNext}>
              <ChevronRight className="h-6 w-6" />
            </Button>
          </div>
        </Card>

        {error && (
          <Card className="p-4 bg-red-50 border border-red-200">
            <p className="text-red-700 text-sm">{error}</p>
          </Card>
        )}

        {loading && (
          <Card className="p-4 bg-blue-50">
            <p className="text-blue-700 text-sm">Загрузка расписания...</p>
          </Card>
        )}

        {/* Week View */}
        {viewMode === "week" && (
          <div className="space-y-2">
            {weekDays.map((day, index) => {
              const isToday = day.toDateString() === new Date().toDateString()
              const dayLink = day.toISOString().split("T")[0]
              const appointmentsCount = getAppointmentsCount(day)

              return (
                <Card
                  key={index}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    isToday ? "bg-pink-50 border-2 border-pink-600" : "bg-white"
                  }`}
                  onClick={() => router.push(`/day/${dayLink}`)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-gray-800 capitalize">
                        {day.toLocaleDateString("ru-RU", { weekday: "long" })}
                      </div>
                      <div className="text-sm text-gray-600">
                        {day.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-pink-600">{appointmentsCount}</div>
                      <div className="text-xs text-gray-600">записей</div>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* Day View */}
        {viewMode === "day" && (
          <Card className="p-4 bg-white">
            <div className="text-center mb-4">
              <Button
                className="w-full bg-pink-600 hover:bg-pink-700 text-white"
                onClick={() => {
                  const dayLink = currentDate.toISOString().split("T")[0]
                  router.push(`/day/${dayLink}`)
                }}
              >
                Открыть детали дня
              </Button>
            </div>
          </Card>
        )}

        {/* Month View */}
        {viewMode === "month" && (
          <Card className="p-4 bg-white">
            <div className="grid grid-cols-7 gap-2">
              {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-gray-600 py-2">
                  {day}
                </div>
              ))}
              {Array.from({ length: 35 }, (_, i) => {
                const dayNum = i - 2
                const handleDayClick = () => {
                  if (dayNum > 0 && dayNum <= 31) {
                    const selectedDate = new Date(currentDate)
                    selectedDate.setDate(dayNum)
                    const dayLink = selectedDate.toISOString().split("T")[0]
                    router.push(`/day/${dayLink}`)
                  }
                }

                let selectedDate: Date | null = null
                if (dayNum > 0 && dayNum <= 31) {
                  selectedDate = new Date(currentDate)
                  selectedDate.setDate(dayNum)
                }
                const hasAppointments = selectedDate ? hasAppointmentsOnDay(selectedDate) : false

                return (
                  <div
                    key={i}
                    className={`aspect-square flex flex-col items-center justify-center rounded-lg transition-all ${
                      dayNum > 0 && dayNum <= 31
                        ? hasAppointments
                          ? "bg-pink-100 hover:bg-pink-200 border border-pink-300 cursor-pointer"
                          : "bg-gray-50 hover:bg-gray-100 cursor-pointer"
                        : "bg-transparent"
                    }`}
                    onClick={handleDayClick}
                  >
                    {dayNum > 0 && dayNum <= 31 && (
                      <>
                        <div className="text-sm font-medium">{dayNum}</div>
                        {hasAppointments && <div className="w-1 h-1 bg-pink-600 rounded-full mt-1"></div>}
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </Card>
        )}
      </main>
    </div>
  )
}
