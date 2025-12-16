
 "use client"

import type React from "react"

import { use, useState, useEffect } from "react"
import { ArrowLeft, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import Link from "next/link"
import { AppointmentCard } from "@/components/appointment-card"
import { AppointmentDialog } from "@/components/appointment-dialog"
import {
  getAppointments,
  createAppointment,
  updateAppointment,
  completeAppointment,
  cancelAppointment,
  deleteAppointment,
  type Appointment,
  getMasterId,
  getMasterRole,
} from "@/lib/api"

export default function DayDetailPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = use(params)

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [draggedAppointment, setDraggedAppointment] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showDelete, setShowDelete] = useState(false)

  const parsedDate = new Date(date + "T00:00:00")
  const isValidDate = !isNaN(parsedDate.getTime())

  useEffect(() => {
    // Удаление доступно только администратору
    try {
      setShowDelete(getMasterRole() === "admin")
    } catch {
      setShowDelete(false)
    }
  }, [])

  useEffect(() => {
    if (!isValidDate) return

    const fetchAppointments = async () => {
      try {
        setLoading(true)
        setError(null)

        const data = await getAppointments(date)

        // Объединяем все записи в один массив
        const allAppointments = Object.values(data).flat()
        setAppointments(allAppointments)
      } catch (err) {
        console.error("Failed to fetch appointments:", err)
        setError("Не удалось загрузить записи. Проверь подключение к серверу.")
      } finally {
        setLoading(false)
      }
    }

    fetchAppointments()
  }, [date, isValidDate])

  if (!isValidDate) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white flex items-center justify-center">
        <Card className="p-6 max-w-md mx-4">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Ошибка</h2>
          <p className="text-gray-600 mb-4">Неверный формат даты</p>
          <Link href="/schedule">
            <Button className="w-full bg-pink-600 hover:bg-pink-700">Вернуться к расписанию</Button>
          </Link>
        </Card>
      </div>
    )
  }

  const timeSlots = Array.from({ length: 13 }, (_, i) => {
    const hour = i + 9
    return `${hour.toString().padStart(2, "0")}:00`
  })

  const formatDate = (dateString: string) => {
    const d = new Date(dateString + "T00:00:00")
    return d.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" })
  }

  const handleSlotClick = (time: string) => {
    const hasAppointment = appointments.some((apt) => apt.time === time)
    if (!hasAppointment) {
      setSelectedSlot(time)
    }
  }

  const handleAppointmentClick = (appointment: Appointment) => {
    setEditingAppointment(appointment)
  }

  const handleSaveAppointment = async (data: {
    clientName: string
    comment?: string
    duration: number
  }) => {
    try {
      // Получаем ID текущего мастера (временно используем "1")
      const masterId = getMasterId()
      if (!masterId) {
        setError("Не удалось определить мастера. Пожалуйста, авторизуйтесь заново.");
        return;
      }

      if (selectedSlot) {
        await createAppointment(masterId, {
          time: selectedSlot,
          duration: data.duration,
          clientName: data.clientName,
          comment: data.comment,
          date: date,
        })

        // Перезагружаем список записей
        const updatedData = await getAppointments(date)
        setAppointments(Object.values(updatedData).flat())
        setSelectedSlot(null)
      } else if (editingAppointment) {
        await updateAppointment(masterId, editingAppointment.id, {
          clientName: data.clientName,
          comment: data.comment,
          duration: data.duration,
        })

        // Перезагружаем список записей
        const updatedData = await getAppointments(date)
        setAppointments(Object.values(updatedData).flat())
        setEditingAppointment(null)
      }
    } catch (err) {
      console.error("Error saving appointment:", err)
      setError("Ошибка при сохранении записи")
    }
  }

  const handleCompleteAppointment = async (id: string, payment: { cash: number; card: number }) => {
    try {
    
         const masterId = getMasterId()
      if (!masterId) {
        setError("Не удалось определить мастера. Пожалуйста, авторизуйтесь заново.");
        return;
      }

      await completeAppointment(masterId, id, payment)

      // Перезагружаем список записей
      const updatedData = await getAppointments(date)
      setAppointments(Object.values(updatedData).flat())
      setEditingAppointment(null)
    } catch (err) {
      console.error("Error completing appointment:", err)
      setError("Ошибка при проведении записи")
    }
  }

  const handleCancelAppointment = async (id: string) => {
    try {
      // Получаем ID текущего мастера (временно используем "1")
         const masterId = getMasterId()
      if (!masterId) {
        setError("Не удалось определить мастера. Пожалуйста, авторизуйтесь заново.");
        return;
      }

      await cancelAppointment(masterId, id)

      // Перезагружаем список записей
      const updatedData = await getAppointments(date)
      setAppointments(Object.values(updatedData).flat())
      setEditingAppointment(null)
    } catch (err) {
      console.error("Error cancelling appointment:", err)
      setError("Ошибка при отмене записи")
    }
  }

  const handleDeleteAppointment = async (id: string) => {
    try {
      // Получаем ID текущего мастера (временно используем "1")
       const masterId = getMasterId()
      if (!masterId) {
        setError("Не удалось определить мастера. Пожалуйста, авторизуйтесь заново.");
        return;
      }

      await deleteAppointment(masterId, id)

      // Перезагружаем список записей
      const updatedData = await getAppointments(date)
      setAppointments(Object.values(updatedData).flat())
      setEditingAppointment(null)
    } catch (err) {
      console.error("Error deleting appointment:", err)
      setError("Ошибка при удалении записи")
    }
  }

  const handleDragStart = (id: string) => {
    setDraggedAppointment(id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = async (time: string) => {
    if (draggedAppointment) {
      const appointment = appointments.find((apt) => apt.id === draggedAppointment)
      if (appointment) {
        try {
          // Получаем ID текущего мастера (временно используем "1")
            const masterId = getMasterId()
      if (!masterId) {
        setError("Не удалось определить мастера. Пожалуйста, авторизуйтесь заново.");
        setDraggedAppointment(null);
        return;
      }

          await updateAppointment(masterId, draggedAppointment, { time })

          // Перезагружаем список записей
          const updatedData = await getAppointments(date)
          setAppointments(Object.values(updatedData).flat())
        } catch (err) {
          console.error("Error moving appointment:", err)
          setError("Ошибка при перемещении записи")
        }
      }
      setDraggedAppointment(null)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white pb-20">
      {/* Header */}
      <header className="bg-black text-white p-4 shadow-lg sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <Link href="/schedule">
            <Button variant="ghost" size="icon" className="text-white hover:bg-gray-800">
              <ArrowLeft className="h-6 w-6" />
            </Button>
          </Link>
          <div className="text-center">
            <h1 className="text-lg font-bold capitalize">{formatDate(date)}</h1>
          </div>
          <div className="w-10" />
        </div>
      </header>

      <main className="p-4 max-w-md mx-auto space-y-3">
        {/* Error Message */}
        {error && <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>}

        {/* Loading State */}
        {loading ? (
          <div className="p-4 text-center text-gray-600">Загрузка записей...</div>
        ) : (
          <>
            {/* Time Slots */}
            {timeSlots.map((time) => {
              const appointment = appointments.find((apt) => apt.time === time)
              const isEmpty = !appointment

              return (
                <div key={time} className="relative" onDragOver={handleDragOver} onDrop={() => handleDrop(time)}>
                  {isEmpty ? (
                    <Card
                      className="p-4 cursor-pointer hover:bg-pink-50 transition-all border-2 border-dashed border-gray-300 hover:border-pink-400"
                      onClick={() => handleSlotClick(time)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-semibold text-gray-600">{time}</div>
                        <Plus className="h-5 w-5 text-gray-400" />
                      </div>
                    </Card>
                  ) : (
                    <AppointmentCard
                      appointment={appointment}
                      onClick={() => handleAppointmentClick(appointment)}
                      onDragStart={() => handleDragStart(appointment.id)}
                    />
                  )}
                </div>
              )
            })}
          </>
        )}
      </main>

      {/* Appointment Dialog */}
      <AppointmentDialog
        open={selectedSlot !== null || editingAppointment !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSlot(null)
            setEditingAppointment(null)
          }
        }}
        appointment={editingAppointment}
        onSave={handleSaveAppointment}
        onComplete={handleCompleteAppointment}
        onCancel={handleCancelAppointment}
        onDelete={handleDeleteAppointment}
        showDelete={showDelete}
      />
    </div>
  )
}

 
