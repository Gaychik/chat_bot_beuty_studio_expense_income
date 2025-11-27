"use client"

import { Check, Clock, X } from "lucide-react"
import { Card } from "@/components/ui/card"

type Appointment = {
  id: string
  time: string
  duration: number
  clientName: string
  comment?: string
  status: "scheduled" | "completed" | "cancelled"
  payment?: {
    cash: number
    card: number
  }
}

interface AppointmentCardProps {
  appointment: Appointment
  onClick: () => void
  onDragStart: () => void
}

export function AppointmentCard({ appointment, onClick, onDragStart }: AppointmentCardProps) {
  const getStatusColor = () => {
    switch (appointment.status) {
      case "completed":
        return "border-l-green-500 bg-green-50"
      case "cancelled":
        return "border-l-red-500 bg-red-50"
      default:
        return "border-l-pink-600 bg-white"
    }
  }

  const getStatusBadge = () => {
    switch (appointment.status) {
      case "completed":
        return (
          <div className="flex items-center gap-1 bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-medium">
            <Check className="h-3 w-3" />
            Проведена
          </div>
        )
      case "cancelled":
        return (
          <div className="flex items-center gap-1 bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-medium">
            <X className="h-3 w-3" />
            Отменена
          </div>
        )
      default:
        return (
          <div className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full font-medium">
            <Clock className="h-3 w-3" />
            Запланирована
          </div>
        )
    }
  }

  return (
    <Card
      className={`p-4 cursor-move hover:shadow-md transition-all border-l-4 ${getStatusColor()}`}
      onClick={onClick}
      draggable
      onDragStart={onDragStart}
    >
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="font-semibold text-gray-800">{appointment.clientName}</div>
          <div className="text-sm text-gray-600 mt-1">
            {appointment.time} ({appointment.duration} мин)
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {appointment.comment && <div className="text-sm text-gray-600 mt-2 italic">{appointment.comment}</div>}

      {appointment.status === "completed" && appointment.payment && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-gray-600">Наличные:</div>
              <div className="font-semibold text-green-600">{appointment.payment.cash} ₽</div>
            </div>
            <div>
              <div className="text-gray-600">Безналичные:</div>
              <div className="font-semibold text-blue-600">{appointment.payment.card} ₽</div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className="flex justify-between">
              <span className="text-gray-600">Итого:</span>
              <span className="font-bold text-pink-600">{appointment.payment.cash + appointment.payment.card} ₽</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
