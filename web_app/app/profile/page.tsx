'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { getMasterProfile, updateMasterAvatar, updateMasterName, type Master } from '@/lib/api'

export default function ProfilePage() {
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isSavingName, setIsSavingName] = useState(false)
  const [isSavingAvatar, setIsSavingAvatar] = useState(false)

  useEffect(() => {
    async function loadProfile() {
      try {
        const profile: Master = await getMasterProfile()
        setName(profile.name ?? '')
        setAvatar(profile.avatar ?? null)
      } catch (error) {
        console.error('Ошибка загрузки профиля:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [])

  const handleNameChange = async () => {
    try {
      setIsSavingName(true)
      await updateMasterName(name)
      alert('Имя успешно обновлено!')
    } catch (error) {
      console.error('Ошибка обновления имени:', error)
      alert('Не удалось обновить имя.')
    } finally {
      setIsSavingName(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const maxSize = 200 * 1024 // 200 KB, можно настроить
    if (file.size > maxSize) {
      alert('Пожалуйста, выберите изображение до 200 КБ.')
      return
    }

    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      setAvatarPreview(result)
    }
    reader.readAsDataURL(file)
  }

  const handleAvatarSave = async () => {
    if (!avatarPreview) return

    try {
      setIsSavingAvatar(true)
      const updated = await updateMasterAvatar(avatarPreview)
      setAvatar(updated.avatar ?? avatarPreview)
      setAvatarPreview(null)
      alert('Аватар успешно обновлён!')
    } catch (error) {
      console.error('Ошибка обновления аватара:', error)
      alert('Не удалось обновить аватар.')
    } finally {
      setIsSavingAvatar(false)
    }
  }

  const currentAvatar = avatarPreview || avatar || null

  if (isLoading) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-4">Профиль</h1>
        <p className="text-muted-foreground">Загрузка профиля...</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Профиль</h1>

      <div className="flex flex-col items-center mb-6">
        <Avatar className="size-24 mb-3">
          {currentAvatar ? (
            <AvatarImage src={currentAvatar} alt={name || 'Аватар мастера'} />
          ) : (
            <AvatarFallback className="text-xl font-semibold">
              {name ? name[0] : 'M'}
            </AvatarFallback>
          )}
        </Avatar>

        <div className="w-full space-y-2">
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />

          <label htmlFor="avatar-upload">
            <Button variant="outline" className="w-full">
              Выбрать новое фото
            </Button>
          </label>

          <Button
            onClick={handleAvatarSave}
            className="w-full bg-pink-600 hover:bg-pink-700 text-white"
            disabled={!avatarPreview || isSavingAvatar}
          >
            {isSavingAvatar ? 'Сохраняем...' : 'Сохранить аватар'}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Введите новое имя"
        />
        <Button
          onClick={handleNameChange}
          className="w-full bg-pink-600 hover:bg-pink-700 text-white"
          disabled={!name.trim() || isSavingName}
        >
          {isSavingName ? 'Сохраняем...' : 'Обновить имя'}
        </Button>
      </div>
    </div>
  )
}