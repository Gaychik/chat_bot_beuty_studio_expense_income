'use client'

import type { Master } from '@/lib/api'
import { Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'

type MasterGreetingProps = {
  master: Master | null
  loading: boolean
}

export function MasterGreeting({ master, loading }: MasterGreetingProps) {
  const [isReturning, setIsReturning] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const KEY = 'has_seen_greeting'
      const alreadySeen = window.localStorage.getItem(KEY)

      if (alreadySeen) {
        setIsReturning(true)
      } else {
        window.localStorage.setItem(KEY, '1')
      }
    } catch {
      console.warn('Не удалось обратиться к localStorage для приветствия:', error)
    }
  }, [])

  if (loading || !master) return null

  const name = master.name?.trim() || 'мастер'
  const initial = name[0]?.toUpperCase() ?? 'М'

  const animationClasses = isReturning
    ? 'animate-in fade-in-0 slide-in-from-top-2 duration-500 ease-out delay-150'
    : 'animate-in fade-in-0 slide-in-from-top-6 zoom-in-95 duration-700 ease-out'

  return (
    <div
      className={`
        relative flex items-center gap-3
        overflow-hidden rounded-2xl
        bg-gradient-to-r from-pink-500 via-rose-500 to-amber-400
        px-4 py-4 text-white shadow-lg
        ${animationClasses}
        transition-transform transition-shadow
        hover:shadow-xl hover:scale-[1.01]
      `}
    >
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="h-full w-full bg-[radial-gradient(circle_at_top,_#ffffff,_transparent_60%)]" />
      </div>

      <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-white/40 bg-white/20 backdrop-blur-sm">
        <span className="text-xl font-semibold">{initial}</span>
      </div>

      <div className="relative flex-1">
        <div className="mb-0.5 flex items-center gap-1.5 text-xs text-white/80">
          <Sparkles className="h-4 w-4" />
          <span>Рада видеть вас в WANT</span>
        </div>
        <div className="text-lg font-semibold leading-tight">
          Добро пожаловать,&nbsp;{name}
        </div>
      </div>
    </div>
  )
}