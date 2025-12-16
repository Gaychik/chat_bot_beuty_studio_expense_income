"use client"

import { useState, useEffect } from "react"
import { Check, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

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

interface AppointmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  appointment: Appointment | null
  onSave: (data: { clientName: string; comment?: string; duration: number }) => void
  onComplete: (id: string, payment: { cash: number; card: number }) => void
  onCancel: (id: string) => void
  onDelete: (id: string) => void
  showDelete?: boolean
}

export function AppointmentDialog({
  open,
  onOpenChange,
  appointment,
  onSave,
  onComplete,
  onCancel,
  onDelete,
  showDelete = true,
}: AppointmentDialogProps) {
  const [clientName, setClientName] = useState("")
  const [comment, setComment] = useState("")
  const [duration, setDuration] = useState(60)
  const [showPayment, setShowPayment] = useState(false)
  const [cash, setCash] = useState(0)
  const [card, setCard] = useState(0)

  useEffect(() => {
    if (appointment) {
      setClientName(appointment.clientName)
      setComment(appointment.comment || "")
      setDuration(appointment.duration)
    } else {
      setClientName("")
      setComment("")
      setDuration(60)
    }
    setShowPayment(false)
    setCash(0)
    setCard(0)
  }, [appointment, open])

  const handleSave = () => {
    if (clientName.trim()) {
      onSave({ clientName, comment, duration })
      onOpenChange(false)
    }
  }

  const handleComplete = () => {
    if (appointment) {
      onComplete(appointment.id, { cash, card })
      onOpenChange(false)
    }
  }

  const handleCancel = () => {
    if (appointment) {
      onCancel(appointment.id)
      onOpenChange(false)
    }
  }

  const handleDelete = () => {
    if (appointment) {
      onDelete(appointment.id)
      onOpenChange(false)
    }
  }

  const isEditing = appointment !== null
  const canComplete = isEditing && appointment.status === "scheduled"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Редактировать запись" : "Новая запись"}</DialogTitle>
        </DialogHeader>

        {!showPayment ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clientName">Имя и фамилия клиента</Label>
              <Input
                id="clientName"
                placeholder="Введите имя и фамилию"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Длительность (минуты)</Label>
              <div className="grid grid-cols-4 gap-2">
                {[30, 60, 90, 120].map((min) => (
                  <Button
                    key={min}
                    variant={duration === min ? "default" : "outline"}
                    className={duration === min ? "bg-pink-600 hover:bg-pink-700" : ""}
                    onClick={() => setDuration(min)}
                  >
                    {min}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">Комментарий (необязательно)</Label>
              <Textarea
                id="comment"
                placeholder="Добавьте комментарий"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="text-base resize-none"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="text-center mb-4">
              <div className="text-lg font-semibold text-gray-800">{clientName}</div>
              <div className="text-sm text-gray-600">Проведение записи</div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cash">Наличные (₽)</Label>
              <Input
                id="cash"
                type="number"
                placeholder="0"
                value={cash || ""}
                onChange={(e) => setCash(Number(e.target.value))}
                className="text-base"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="card">Безналичные (₽)</Label>
              <Input
                id="card"
                type="number"
                placeholder="0"
                value={card || ""}
                onChange={(e) => setCard(Number(e.target.value))}
                className="text-base"
              />
            </div>

            <div className="bg-pink-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Итого:</span>
                <span className="text-2xl font-bold text-pink-600">{cash + card} ₽</span>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          {!showPayment ? (
            <>
              <Button
                onClick={handleSave}
                className="w-full bg-pink-600 hover:bg-pink-700 text-white"
                disabled={!clientName.trim()}
              >
                {isEditing ? "Сохранить изменения" : "Создать запись"}
              </Button>

              {canComplete && (
                <Button
                  onClick={() => setShowPayment(true)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Провести запись
                </Button>
              )}

              {isEditing && appointment.status === "scheduled" && (
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  className="w-full border-red-300 text-red-600 hover:bg-red-50 bg-transparent"
                >
                  <X className="mr-2 h-4 w-4" />
                  Отменить запись
                </Button>
              )}

              {isEditing && showDelete && (
                <Button
                  onClick={handleDelete}
                  variant="outline"
                  className="w-full border-gray-300 text-gray-600 hover:bg-gray-50 bg-transparent"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Удалить запись
                </Button>
              )}
            </>
          ) : (
            <>
              <Button onClick={handleComplete} className="w-full bg-green-600 hover:bg-green-700 text-white">
                <Check className="mr-2 h-4 w-4" />
                Подтвердить проведение
              </Button>
              <Button onClick={() => setShowPayment(false)} variant="outline" className="w-full">
                Назад
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
