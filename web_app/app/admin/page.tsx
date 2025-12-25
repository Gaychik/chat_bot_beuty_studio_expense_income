"use client"

import { useState, useEffect } from "react"
import { Calendar, ChevronLeft, ChevronRight, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { AppointmentCard } from "@/components/appointment-card"
import { AppointmentDialog } from "@/components/appointment-dialog"
import {
  getMasters,
  getAppointmentsRange,
  getStatsForRange,
  updateAppointment,
  completeAppointment,
  cancelAppointment,
  deleteAppointment,
  getMasterBackgroundColor,
  getMasterIndicatorColor,
  getMasterBorderColor,
  type Appointment,
  type Master,
} from "@/lib/api"

type ViewMode = "day" | "week" | "month"

const TIME_SLOTS = Array.from({ length: 13 }, (_, i) => {
  const hour = 9 + i
  return `${hour.toString().padStart(2, "0")}:00`
})

export default function AdminPage() {
  const [masters, setMasters] = useState<Master[]>([])
  const [mastersLoading, setMastersLoading] = useState(true)

  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedMaster, setSelectedMaster] = useState<string | "all">("all")
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [viewMode, setViewMode] = useState<ViewMode>("day")

  const [appointments, setAppointments] = useState<Record<string, Appointment[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalAppointments: 0,
    completedAppointments: 0,
    totalRevenue: 0,
  })

  useEffect(() => {
    const fetchMasters = async () => {
      try {
        setMastersLoading(true)
        const mastersData = await getMasters()
        setMasters(mastersData)
      } catch (err) {
        console.error("Failed to fetch masters:", err)
        setError("Не удалось загрузить список мастеров")
      } finally {
        setMastersLoading(false)
      }
    }

    fetchMasters()
  }, [])

  const getRange = () => {
    let startDate = new Date(selectedDate)
    let endDate = new Date(selectedDate)

    if (viewMode === "week") {
      const dayOfWeek = startDate.getDay()
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      startDate.setDate(startDate.getDate() + diff)
      endDate.setDate(startDate.getDate() + 6)
    } else if (viewMode === "month") {
      startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
      endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
    }

    const startDateStr = startDate.toISOString().split("T")[0]
    const endDateStr = endDate.toISOString().split("T")[0]
    return { startDateStr, endDateStr }
  }

  const reloadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const { startDateStr, endDateStr } = getRange()

      const appointmentsData = await getAppointmentsRange(startDateStr, endDateStr)
      setAppointments(appointmentsData)

      const statsMasterId = selectedMaster === "all" ? undefined : selectedMaster
      const statsData = await getStatsForRange(startDateStr, endDateStr, statsMasterId)
      setStats(statsData)
    } catch (err) {
      console.error("Failed to fetch data:", err)
      setError("Не удалось загрузить данные. Проверь подключение к серверу.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    reloadData()
  }, [selectedDate, viewMode, selectedMaster])

  // ... existing helper functions ...

  const getMonthDays = () => {
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []

    for (let i = 0; i < (startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1); i++) {
      days.push(null)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const getAppointmentsForDate = (date: Date, masterId?: string): Appointment[] => {
    const dateKey = date.toISOString().split("T")[0]
    const all = appointments[dateKey] || []
    if (!masterId) return all
    return all.filter((apt) => String(apt.masterId) === String(masterId))
  }

  const changeMonth = (months: number) => {
    const newDate = new Date(selectedDate)
    newDate.setMonth(newDate.getMonth() + months)
    setSelectedDate(newDate)
  }

  const changeWeek = (weeks: number) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + weeks * 7)
    setSelectedDate(newDate)
  }

  const getWeekDays = () => {
    const days: Date[] = []
    const currentDay = new Date(selectedDate)
    const dayOfWeek = currentDay.getDay()
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek

    currentDay.setDate(currentDay.getDate() + diff)

    for (let i = 0; i < 7; i++) {
      days.push(new Date(currentDay))
      currentDay.setDate(currentDay.getDate() + 1)
    }

    return days
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  const changeDate = (direction: number) => {
    if (viewMode === "day") {
      const newDate = new Date(selectedDate)
      newDate.setDate(newDate.getDate() + direction)
      setSelectedDate(newDate)
    } else if (viewMode === "week") {
      changeWeek(direction)
    } else if (viewMode === "month") {
      changeMonth(direction)
    }
  }

  const getAppointmentForSlot = (timeSlot: string, masterId: string, date?: Date): Appointment | undefined => {
    const targetDate = date || selectedDate
    const dateKey = targetDate.toISOString().split("T")[0]
    const dayAppointments = appointments[dateKey] || []
    return dayAppointments.find((apt) => apt.time === timeSlot && String(apt.masterId) === String(masterId))
  }

  const displayedMasters = selectedMaster === "all" ? masters : masters.filter((m) => m.id === selectedMaster)

  const statsScopeLabel =
    selectedMaster === "all"
      ? "Статистика: все мастера"
      : `Статистика: мастер ${masters.find((m) => m.id === selectedMaster)?.name ?? selectedMaster}`

  if (mastersLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex justify-center items-center">
        <p className="text-gray-600">Загрузка мастеров...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="bg-black text-white p-4 shadow-lg sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-white hover:bg-gray-800">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="text-center">
            <h1 className="text-xl font-bold">Панель администратора</h1>
            <p className="text-gray-400 text-xs mt-1">WANT Салон красоты</p>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="p-4 max-w-7xl mx-auto">
        {/* Error Message */}
        {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg mb-4">{error}</div>}

        {/* Loading State */}
        {loading ? (
          <div className="p-4 text-center text-gray-600">Загрузка данных...</div>
        ) : (
          <>
            {/* Stats Scope */}
            <div className="mb-3 text-sm text-gray-600 font-medium">{statsScopeLabel}</div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <Card className="p-4 bg-white">
                <div className="text-2xl font-bold text-pink-600">{stats.totalAppointments}</div>
                <div className="text-xs text-gray-600 mt-1">Всего записей</div>
              </Card>
              <Card className="p-4 bg-white">
                <div className="text-2xl font-bold text-green-600">{stats.completedAppointments}</div>
                <div className="text-xs text-gray-600 mt-1">Проведено</div>
              </Card>
              <Card className="p-4 bg-white">
                <div className="text-2xl font-bold text-blue-600">{stats.totalRevenue} ₽</div>
                <div className="text-xs text-gray-600 mt-1">Выручка</div>
              </Card>
            </div>

            {/* View Mode Toggle */}
            <Card className="p-4 mb-4 bg-white">
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "day" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("day")}
                  className={viewMode === "day" ? "bg-pink-600 hover:bg-pink-700" : ""}
                >
                  День
                </Button>
                <Button
                  variant={viewMode === "week" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("week")}
                  className={viewMode === "week" ? "bg-pink-600 hover:bg-pink-700" : ""}
                >
                  Неделя
                </Button>
                <Button
                  variant={viewMode === "month" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("month")}
                  className={viewMode === "month" ? "bg-pink-600 hover:bg-pink-700" : ""}
                >
                  Месяц
                </Button>
              </div>
            </Card>

            {/* Date Navigation */}
            <Card className="p-4 mb-4 bg-white">
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => changeDate(-1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-pink-600" />
                  <span className="font-semibold text-gray-800">{formatDate(selectedDate)}</span>
                </div>
                <Button variant="outline" size="sm" onClick={() => changeDate(1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </Card>

            {/* Master Filter */}
            <Card className="p-4 mb-4 bg-white">
              <div className="flex items-center gap-2 mb-3">
                <Users className="h-4 w-4 text-pink-600" />
                <span className="font-semibold text-gray-800">Фильтр по мастеру</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedMaster === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedMaster("all")}
                  className={selectedMaster === "all" ? "bg-pink-600 hover:bg-pink-700" : ""}
                >
                  Все мастера
                </Button>
                {masters.map((master) => (
                  <Button
                    key={master.id}
                    variant={selectedMaster === master.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedMaster(master.id)}
                    className={selectedMaster === master.id ? "bg-pink-600 hover:bg-pink-700" : ""}
                  >
                    {master.name}
                  </Button>
                ))}
              </div>
            </Card>

            {/* Day View */}
            {viewMode === "day" && (
              <div className="space-y-4">
                {displayedMasters.map((master) => {
                  const backgroundColor = getMasterBackgroundColor(master)
                  const borderColor = getMasterBorderColor(master)

                  return (
                    <Card
                      key={master.id}
                      className="p-4 border-l-4"
                      style={{
                        backgroundColor,
                        borderLeftColor: borderColor,
                      }}
                    >
                      <h3 className="font-bold text-lg mb-4 text-gray-800">{master.name}</h3>
                      <div className="space-y-2">
                        {TIME_SLOTS.map((timeSlot) => {
                          const appointment = getAppointmentForSlot(timeSlot, master.id)
                          return (
                            <div key={timeSlot} className="flex gap-3">
                              <div className="w-16 flex-shrink-0 text-sm font-medium text-gray-600 pt-2">
                                {timeSlot}
                              </div>
                              <div className="flex-1">
                                {appointment ? (
                                  <AppointmentCard
                                    appointment={appointment}
                                    onClick={() => {
                                      setSelectedAppointment(appointment)
                                      setIsDialogOpen(true)
                                    }}
                                    onDragStart={() => {}}
                                  />
                                ) : (
                                  <div className="h-12 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50" />
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Week View */}
            {viewMode === "week" && (
              <div className="space-y-4">
                {displayedMasters.map((master) => {
                  const backgroundColor = getMasterBackgroundColor(master)
                  const borderColor = getMasterBorderColor(master)

                  return (
                    <Card
                      key={master.id}
                      className="p-4 border-l-4"
                      style={{
                        backgroundColor,
                        borderLeftColor: borderColor,
                      }}
                    >
                      <h3 className="font-bold text-lg mb-4 text-gray-800">{master.name}</h3>
                      <div className="overflow-x-auto">
                        <div className="grid grid-cols-8 gap-2 min-w-max">
                          <div className="w-16" />
                          {getWeekDays().map((day) => (
                            <div key={day.toISOString()} className="w-32 text-center">
                              <div className="text-xs font-semibold text-gray-600">
                                {day.toLocaleDateString("ru-RU", {
                                  weekday: "short",
                                })}
                              </div>
                              <div className="text-sm text-gray-800">{day.getDate()}</div>
                            </div>
                          ))}
                          {TIME_SLOTS.map((timeSlot) => (
                            <div key={timeSlot} className="contents">
                              <div className="w-16 text-sm font-medium text-gray-600 pt-2">{timeSlot}</div>
                              {getWeekDays().map((day) => {
                                const appointment = getAppointmentForSlot(timeSlot, master.id, day)
                                return (
                                  <div key={day.toISOString()} className="w-32">
                                    {appointment ? (
                                      <div
                                        className="text-xs p-2 bg-pink-100 border border-pink-300 rounded cursor-pointer hover:bg-pink-200"
                                        onClick={() => {
                                          setSelectedAppointment(appointment)
                                          setIsDialogOpen(true)
                                        }}
                                      >
                                        <div className="font-semibold truncate">{appointment.clientName}</div>
                                      </div>
                                    ) : (
                                      <div className="h-10 border border-dashed border-gray-200 rounded bg-gray-50" />
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}

            {/* Month View */}
            {viewMode === "month" && (
              <Card className="p-4 bg-white">
                <div className="grid grid-cols-7 gap-2">
                  {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
                    <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                      {day}
                    </div>
                  ))}
                  {getMonthDays().map((day, index) => {
                    if (!day) {
                      return <div key={`empty-${index}`} className="aspect-square" />
                    }

                    const dayAppointments = getAppointmentsForDate(
                      day,
                      selectedMaster === "all" ? undefined : selectedMaster,
                    )
                    const isToday = day.toDateString() === new Date().toDateString()

                    return (
                      <div
                        key={day.toISOString()}
                        className={`aspect-square border rounded-lg p-2 ${
                          isToday ? "border-pink-500 bg-pink-50" : "border-gray-200 bg-white"
                        } hover:border-pink-300 transition-colors cursor-pointer`}
                        onClick={() => {
                          setSelectedDate(day)
                          setViewMode("day")
                        }}
                      >
                        <div className={`text-sm font-semibold mb-1 ${isToday ? "text-pink-600" : "text-gray-800"}`}>
                          {day.getDate()}
                        </div>
                        <div className="space-y-1">
                          {dayAppointments.slice(0, 2).map((appointment) => {
                            const master = masters.find((m) => String(m.id) === String(appointment.masterId))
                            const indicatorColor = master ? getMasterIndicatorColor(master) : "#999"

                            return (
                              <div key={appointment.id} className="flex items-center gap-1">
                                <div
                                  className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ backgroundColor: indicatorColor }}
                                />
                                <span className="text-xs text-gray-600 truncate">{appointment.clientName}</span>
                              </div>
                            )
                          })}
                          {dayAppointments.length > 2 && (
                            <span className="text-xs text-gray-500">+{dayAppointments.length - 2} ещё</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            )}
          </>
        )}
      </main>

      {/* Appointment Dialog */}
      {selectedAppointment && (
        <AppointmentDialog
          appointment={selectedAppointment}
          open={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) setSelectedAppointment(null)
          }}
          onSave={async (data) => {
            try {
              const masterId = selectedAppointment.masterId
              if (!masterId) {
                setError("Не удалось определить мастера для записи")
                return
              }
              await updateAppointment(masterId, selectedAppointment.id, data)
              await reloadData()
              setIsDialogOpen(false)
              setSelectedAppointment(null)
            } catch (err) {
              console.error("Failed to update appointment:", err)
              setError("Не удалось сохранить изменения")
            }
          }}
          onComplete={async (id, payment) => {
            try {
              const masterId = selectedAppointment.masterId
              if (!masterId) {
                setError("Не удалось определить мастера для записи")
                return
              }
              await completeAppointment(masterId, id, payment)
              await reloadData()
              setIsDialogOpen(false)
              setSelectedAppointment(null)
            } catch (err) {
              console.error("Failed to complete appointment:", err)
              setError("Не удалось провести запись")
            }
          }}
          onCancel={async (id) => {
            try {
              const masterId = selectedAppointment.masterId
              if (!masterId) {
                setError("Не удалось определить мастера для записи")
                return
              }
              await cancelAppointment(masterId, id)
              await reloadData()
              setIsDialogOpen(false)
              setSelectedAppointment(null)
            } catch (err) {
              console.error("Failed to cancel appointment:", err)
              setError("Не удалось отменить запись")
            }
          }}
          onDelete={async (id) => {
            try {
              const masterId = selectedAppointment.masterId
              if (!masterId) {
                setError("Не удалось определить мастера для записи")
                return
              }
              await deleteAppointment(masterId, id)
              await reloadData()
              setIsDialogOpen(false)
              setSelectedAppointment(null)
            } catch (err) {
              console.error("Failed to delete appointment:", err)
              setError("Не удалось удалить запись")
            }
          }}
        />
      )}
    </div>
  )
}
