'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updateMasterName } from '@/lib/api'

export default function ProfilePage() {
  const [name, setName] = useState('')

  const handleNameChange = async () => {
    try {
      await updateMasterName(name)
      alert('Имя успешно обновлено!')
    } catch (error) {
      console.error('Ошибка обновления имени:', error)
      alert('Не удалось обновить имя.')
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Профиль</h1>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Введите новое имя"
        className="mb-4"
      />
      <Button onClick={handleNameChange} className="w-full bg-pink-600 text-white">
        Обновить имя
      </Button>
    </div>
  )
}